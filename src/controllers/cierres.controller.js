import pool, { enTransaccion } from "../data/db.js";
import { COLUMNAS_CIERRE } from "../data/cierres.js";
import { CONSULTA_TURNOS, cancelarTurno } from "../data/turnos.js";
import { ErrorHttp, ahora, fechaValida, idValido, responderError } from "../utils/comun.js";

// Cierres de canchas por lluvia o mantenimiento. Mientras dura un cierre la
// cancha no se ofrece. Los turnos que ya estaban reservados en ese horario se
// devuelven como "afectados" para avisarles; si se pide, se cancelan por el
// complejo (el jugador no pierde la seña).

const MOTIVOS = ["lluvia", "mantenimiento", "otro"];
const NOMBRE_MOTIVO = { lluvia: "lluvia", mantenimiento: "mantenimiento", otro: "cierre de la cancha" };
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

const fechaHoraValida = (valor) => FECHA_HORA.test(valor ?? "") && fechaValida(valor.slice(0, 10));

// Cierres de un día (?fecha=) o, sin fecha, los que todavía no terminaron
export const listarCierres = async (req, res) => {
  const { fecha } = req.query;
  try {
    if (fecha !== undefined && !fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");
    const hoy = ahora();
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS_CIERRE}, c.nombre AS cancha, c.deporte
         FROM cierres ci JOIN canchas c ON c.id_cancha = ci.id_cancha
        WHERE ci.id_empresa = $1
          AND CASE WHEN $2::date IS NULL THEN ci.hasta > $3::timestamp
                   ELSE tsrange(ci.desde, ci.hasta) && tsrange($2::date, $2::date + 1) END
        ORDER BY ci.desde, c.nombre`,
      [req.empresa.id_empresa, fecha ?? null, `${hoy.fecha} ${hoy.hora}`]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los cierres");
  }
};

// { canchas: [ids], desde: "2026-10-28T18:00", hasta: "2026-10-28T24:00"?, motivo, detalle, cancelar_afectados }
export const crearCierre = async (req, res) => {
  const { canchas, desde, motivo, detalle, cancelar_afectados } = req.body ?? {};
  // "24:00" no es una hora válida para datetime-local: se acepta como fin del día
  const hasta = /T24:00$/.test(req.body?.hasta ?? "") ? null : req.body?.hasta;
  const hastaFinDelDia = /T24:00$/.test(req.body?.hasta ?? "") ? req.body.hasta.slice(0, 10) : null;
  try {
    const ids = [...new Set((Array.isArray(canchas) ? canchas : []).map(String))];
    if (ids.length === 0 || !ids.every(idValido)) throw new ErrorHttp(400, "Elegí al menos una cancha");
    if (!MOTIVOS.includes(motivo)) throw new ErrorHttp(400, "Elegí el motivo del cierre");
    if (!fechaHoraValida(desde)) throw new ErrorHttp(400, "Indicá desde qué día y hora se cierra");
    if (!hastaFinDelDia && !fechaHoraValida(hasta)) throw new ErrorHttp(400, "Indicá hasta qué día y hora se cierra");
    const hastaTexto = hastaFinDelDia ? `${hastaFinDelDia}T24:00` : hasta;
    if (hastaTexto <= desde) throw new ErrorHttp(400, "El cierre tiene que terminar después de empezar");

    const resultado = await enTransaccion(async (db) => {
      const { rows: propias } = await db.query(
        "SELECT id_cancha, nombre FROM canchas WHERE id_empresa = $1 AND id_cancha = ANY($2::int[])",
        [req.empresa.id_empresa, ids]
      );
      if (propias.length !== ids.length) throw new ErrorHttp(404, "Cancha no encontrada");

      const creados = [];
      for (const cancha of propias) {
        try {
          const { rows } = await db.query(
            `INSERT INTO cierres (id_empresa, id_cancha, desde, hasta, motivo, detalle, registrado_por)
             VALUES ($1, $2, $3::timestamp,
                     CASE WHEN $4::date IS NOT NULL THEN $4::date + 1 ELSE $5::timestamp END,
                     $6, $7, $8)
             RETURNING id_cierre`,
            [
              req.empresa.id_empresa,
              cancha.id_cancha,
              desde.replace("T", " "),
              hastaFinDelDia,
              hasta ? hasta.replace("T", " ") : null,
              motivo,
              String(detalle ?? "").trim().slice(0, 200) || null,
              req.empresa.quien
            ]
          );
          creados.push(rows[0].id_cierre);
        } catch (error) {
          if (error.code === "23P01") throw new ErrorHttp(409, `${cancha.nombre} ya tiene un cierre en ese horario`);
          throw error;
        }
      }

      // Turnos reservados que caen dentro del cierre
      const { rows: afectados } = await db.query(
        `SELECT r.id_reserva FROM reservas r
           JOIN cierres ci ON ci.id_cierre = ANY($1::int[]) AND ci.id_cancha = r.id_cancha
          WHERE r.estado IN ('reservada', 'confirmada')
            AND tsrange(r.fecha + r.hora_inicio, r.fecha + r.hora_fin) && tsrange(ci.desde, ci.hasta)`,
        [creados]
      );
      let cancelados = 0;
      if (cancelar_afectados === true) {
        const { rows: reservas } = await db.query(
          "SELECT id_reserva FROM reservas WHERE id_reserva = ANY($1::int[]) AND id_partido IS NULL",
          [afectados.map((a) => a.id_reserva)]
        );
        for (const { id_reserva } of reservas) {
          await cancelarTurno(db, id_reserva, {
            idEmpresa: req.empresa.id_empresa,
            porElComplejo: true,
            motivo: `Cancha cerrada por ${NOMBRE_MOTIVO[motivo]} (registró ${req.empresa.quien})`
          });
          cancelados++;
        }
      }
      return { creados, afectados: afectados.map((a) => a.id_reserva), cancelados };
    });

    const [{ rows: cierres }, { rows: afectados }] = await Promise.all([
      pool.query(
        `SELECT ${COLUMNAS_CIERRE}, c.nombre AS cancha FROM cierres ci JOIN canchas c ON c.id_cancha = ci.id_cancha
          WHERE ci.id_cierre = ANY($1::int[]) ORDER BY c.nombre`,
        [resultado.creados]
      ),
      pool.query(`${CONSULTA_TURNOS} WHERE r.id_reserva = ANY($1::int[]) ORDER BY r.fecha, r.hora_inicio`, [
        resultado.afectados
      ])
    ]);
    res.status(201).json({ cierres, afectados, cancelados: resultado.cancelados });
  } catch (error) {
    responderError(res, error, "Error al cerrar la cancha");
  }
};

// Reabrir: se borra el cierre y la cancha vuelve a estar disponible
export const eliminarCierre = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw new ErrorHttp(404, "Cierre no encontrado");
    const resultado = await pool.query("DELETE FROM cierres WHERE id_cierre = $1 AND id_empresa = $2", [
      req.params.id,
      req.empresa.id_empresa
    ]);
    if (resultado.rowCount === 0) throw new ErrorHttp(404, "Cierre no encontrado");
    res.status(204).send();
  } catch (error) {
    responderError(res, error, "Error al reabrir la cancha");
  }
};
