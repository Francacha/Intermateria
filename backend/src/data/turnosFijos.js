import { buscarPerfil } from "./perfiles.js";
import { DIAS_ANTICIPACION, cancelarTurno } from "./turnos.js";
import {
  DURACION_TURNO,
  ErrorHttp,
  aHora,
  aMinutos,
  ahora,
  fechaValida,
  horaValida,
  idValido,
  precioTurno
} from "../utils/comun.js";

// Turnos fijos: un grupo juega siempre el mismo día y horario. Cada semana se
// guarda como un turno más (reservas.id_turno_fijo) para que nadie pueda
// reservar encima. Se generan una semana más allá de lo que puede reservar un
// jugador, así el turno fijo siempre llega primero.
export const DIAS_GENERADOS = DIAS_ANTICIPACION + 7;

const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// Genera las semanas que faltan de los turnos fijos activos (de uno o de todos).
// ON CONFLICT DO NOTHING: si esa semana ya existe (aunque se haya liberado) o la
// cancha está ocupada, no se crea. Así pueden correrlo los 3 droplets a la vez.
export const extenderTurnosFijos = async (db, idTurnoFijo = null) => {
  const hoy = ahora().fecha;
  const { rowCount } = await db.query(
    `INSERT INTO reservas (id_empresa, id_cancha, id_turno_fijo, contacto_nombre, contacto_telefono,
                           fecha, hora_inicio, hora_fin, precio_total, estado)
     SELECT tf.id_empresa, tf.id_cancha, tf.id_turno_fijo, tf.contacto_nombre, tf.contacto_telefono,
            d::date, tf.hora_inicio, tf.hora_fin, tf.precio, 'confirmada'
       FROM turnos_fijos tf
       CROSS JOIN LATERAL generate_series(
         GREATEST(tf.desde, $1::date)::timestamp,
         LEAST(COALESCE(tf.hasta, $2::date), $2::date)::timestamp,
         INTERVAL '1 day') AS d
      WHERE tf.activo
        AND ($3::int IS NULL OR tf.id_turno_fijo = $3)
        AND EXTRACT(ISODOW FROM d) = tf.dia_semana
        AND NOT EXISTS (
          SELECT 1 FROM cierres ci
           WHERE ci.id_cancha = tf.id_cancha
             AND tsrange(ci.desde, ci.hasta) && tsrange(d::date + tf.hora_inicio, d::date + tf.hora_fin))
     ON CONFLICT DO NOTHING`,
    [hoy, sumarDias(hoy, DIAS_GENERADOS), idTurnoFijo]
  );
  return rowCount;
};

// Turnos fijos del complejo, con la próxima fecha y las semanas liberadas que vienen
export const listarTurnosFijos = async (db, idEmpresa) => {
  const hoy = ahora().fecha;
  const { rows } = await db.query(
    `SELECT tf.*, c.nombre AS cancha, c.deporte,
            (SELECT MIN(r.fecha) FROM reservas r
              WHERE r.id_turno_fijo = tf.id_turno_fijo AND r.fecha >= $2 AND r.estado <> 'cancelada') AS proxima,
            COALESCE((SELECT json_agg(r.fecha ORDER BY r.fecha) FROM reservas r
              WHERE r.id_turno_fijo = tf.id_turno_fijo AND r.fecha >= $2 AND r.estado = 'cancelada'), '[]') AS liberadas,
            (SELECT COUNT(*) FROM reservas r
              WHERE r.id_turno_fijo = tf.id_turno_fijo AND r.estado = 'ausente')::int AS inasistencias
       FROM turnos_fijos tf JOIN canchas c ON c.id_cancha = tf.id_cancha
      WHERE tf.id_empresa = $1
      ORDER BY tf.activo DESC, tf.dia_semana, tf.hora_inicio, c.nombre`,
    [idEmpresa, hoy]
  );
  return rows;
};

export const crearTurnoFijo = async (db, idEmpresa, body) => {
  const diaSemana = Number(body.dia_semana);
  const horaInicio = body.hora_inicio;
  const desde = body.desde || ahora().fecha;
  const nombre = String(body.contacto_nombre ?? "").trim().slice(0, 100);

  if (!idValido(body.id_cancha)) throw new ErrorHttp(400, "Elegí una cancha");
  if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 7) throw new ErrorHttp(400, "Elegí el día de la semana");
  if (!horaValida(horaInicio) || aMinutos(horaInicio) % 30 !== 0) {
    throw new ErrorHttp(400, "El turno tiene que empezar en punto o y media");
  }
  if (!fechaValida(desde)) throw new ErrorHttp(400, "La fecha de inicio no es válida");
  if (desde < ahora().fecha) throw new ErrorHttp(400, "El turno fijo no puede empezar en una fecha que ya pasó");
  if (!nombre) throw new ErrorHttp(400, "Indicá a nombre de quién es el turno fijo");

  const { rows: [cancha] } = await db.query(
    "SELECT * FROM canchas WHERE id_cancha = $1 AND id_empresa = $2",
    [body.id_cancha, idEmpresa]
  );
  if (!cancha) throw new ErrorHttp(404, "Cancha no encontrada");
  if (!cancha.activa) throw new ErrorHttp(400, "La cancha no está activa");

  const inicio = aMinutos(horaInicio);
  const fin = inicio + DURACION_TURNO[cancha.deporte];
  if (fin > 1440) throw new ErrorHttp(400, "El turno no puede pasar de la medianoche");

  // Antes de comprometer el horario, se revisa que ninguna de las próximas
  // semanas choque con un turno ya reservado o con un cierre de la cancha
  const { rows: choques } = await db.query(
    `SELECT d::date AS fecha
       FROM generate_series($1::date::timestamp, $2::date::timestamp, INTERVAL '1 day') AS d
      WHERE EXTRACT(ISODOW FROM d) = $3
        AND (EXISTS (SELECT 1 FROM reservas r
                      WHERE r.id_cancha = $4 AND r.fecha = d::date AND r.estado <> 'cancelada'
                        AND tsrange(r.fecha + r.hora_inicio, r.fecha + r.hora_fin)
                            && tsrange(d::date + $5::time, d::date + $6::time))
          OR EXISTS (SELECT 1 FROM cierres ci
                      WHERE ci.id_cancha = $4
                        AND tsrange(ci.desde, ci.hasta) && tsrange(d::date + $5::time, d::date + $6::time)))
      ORDER BY 1`,
    [desde, sumarDias(ahora().fecha, DIAS_GENERADOS), diaSemana, cancha.id_cancha, horaInicio, aHora(fin)]
  );
  if (choques.length > 0) {
    const fechas = choques.slice(0, 4).map((c) => c.fecha.split("-").reverse().slice(0, 2).join("/"));
    throw new ErrorHttp(
      409,
      `${cancha.nombre} ya está ocupada en ese horario ${choques.length === 1 ? "el" : "los días"} ${fechas.join(", ")}` +
        `${choques.length > 4 ? ` y ${choques.length - 4} más` : ""}. Elegí otro horario o liberá esos turnos primero.`
    );
  }

  const perfil = await buscarPerfil(idEmpresa);
  const { rows: [nuevo] } = await db.query(
    `INSERT INTO turnos_fijos (id_empresa, id_cancha, dia_semana, hora_inicio, hora_fin, precio,
                               contacto_nombre, contacto_telefono, desde)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_turno_fijo`,
    [
      idEmpresa,
      cancha.id_cancha,
      diaSemana,
      horaInicio,
      aHora(fin),
      precioTurno(cancha, inicio, fin, perfil.reglas.hora_noche),
      nombre,
      String(body.contacto_telefono ?? "").trim().slice(0, 30) || null,
      desde
    ]
  );
  await extenderTurnosFijos(db, nuevo.id_turno_fijo);
  return nuevo.id_turno_fijo;
};

const turnoFijoPropio = async (db, id, idEmpresa) => {
  if (!idValido(id)) throw new ErrorHttp(404, "Turno fijo no encontrado");
  const { rows } = await db.query(
    "SELECT * FROM turnos_fijos WHERE id_turno_fijo = $1 AND id_empresa = $2 FOR UPDATE",
    [id, idEmpresa]
  );
  if (!rows[0]) throw new ErrorHttp(404, "Turno fijo no encontrado");
  return rows[0];
};

// Cambia el contacto (también en las semanas que vienen)
export const editarContacto = async (db, id, idEmpresa, body) => {
  const tf = await turnoFijoPropio(db, id, idEmpresa);
  const nombre = body.contacto_nombre !== undefined ? String(body.contacto_nombre).trim().slice(0, 100) : tf.contacto_nombre;
  if (!nombre) throw new ErrorHttp(400, "El nombre no puede quedar vacío");
  const telefono =
    body.contacto_telefono !== undefined ? String(body.contacto_telefono).trim().slice(0, 30) || null : tf.contacto_telefono;
  await db.query("UPDATE turnos_fijos SET contacto_nombre = $1, contacto_telefono = $2 WHERE id_turno_fijo = $3", [
    nombre,
    telefono,
    tf.id_turno_fijo
  ]);
  await db.query(
    `UPDATE reservas SET contacto_nombre = $1, contacto_telefono = $2
      WHERE id_turno_fijo = $3 AND fecha >= $4`,
    [nombre, telefono, tf.id_turno_fijo, ahora().fecha]
  );
};

// El grupo deja de jugar: el turno fijo termina hoy y las semanas que venían
// se cancelan (por acuerdo con el complejo: si habían dejado seña, se resuelve con ellos)
export const darDeBaja = async (db, id, idEmpresa) => {
  const tf = await turnoFijoPropio(db, id, idEmpresa);
  if (!tf.activo) throw new ErrorHttp(400, "Ese turno fijo ya está dado de baja");
  const hoy = ahora();
  await db.query("UPDATE turnos_fijos SET activo = FALSE, hasta = $1 WHERE id_turno_fijo = $2", [
    hoy.fecha,
    tf.id_turno_fijo
  ]);
  const { rows: futuras } = await db.query(
    `SELECT id_reserva FROM reservas
      WHERE id_turno_fijo = $1 AND estado IN ('reservada', 'confirmada')
        AND (fecha > $2 OR (fecha = $2 AND hora_inicio > $3))`,
    [tf.id_turno_fijo, hoy.fecha, hoy.hora]
  );
  for (const { id_reserva } of futuras) {
    await cancelarTurno(db, id_reserva, { idEmpresa, porElComplejo: true, motivo: "Baja del turno fijo" });
  }
  return futuras.length;
};
