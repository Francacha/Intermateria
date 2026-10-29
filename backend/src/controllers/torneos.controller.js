import pool from "../data/db.js";
import {
  LETRAS,
  actualizarAvance,
  agregarEquipo,
  armarLlave,
  asignarGrupo,
  detalleTorneo,
  generarFixture,
  programarPartido,
  sortearGrupos
} from "../data/torneos.js";
import { DEPORTES, ErrorHttp, fechaValida, horaValida, idValido, responderError } from "../utils/comun.js";

// Torneos y campeonatos del complejo logueado (rol empresa).
// Todas las consultas filtran por req.empresa.id_empresa.

const TIPOS = ["torneo", "campeonato", "grupos"];

const texto = (valor, max) => {
  const limpio = String(valor ?? "").trim().slice(0, max);
  return limpio || null;
};

// Ejecuta "trabajo" dentro de una transacción
const enTransaccion = async (trabajo) => {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
};

// Trae el torneo bloqueado para modificarlo, solo si es del complejo
const torneoPropio = async (db, req) => {
  const { id } = req.params;
  if (!idValido(id)) throw new ErrorHttp(404, "Torneo no encontrado");
  const { rows } = await db.query(
    "SELECT * FROM torneos WHERE id_torneo = $1 AND id_empresa = $2 FOR UPDATE",
    [id, req.empresa.id_empresa]
  );
  if (rows.length === 0) throw new ErrorHttp(404, "Torneo no encontrado");
  return rows[0];
};

const validarDatos = (body, actual = null) => {
  const datos = {
    nombre: body.nombre !== undefined ? texto(body.nombre, 120) : actual?.nombre,
    tipo: body.tipo ?? actual?.tipo,
    deporte: body.deporte ?? actual?.deporte,
    categoria: body.categoria !== undefined ? texto(body.categoria, 60) : actual?.categoria ?? null,
    descripcion: body.descripcion !== undefined ? texto(body.descripcion, 500) : actual?.descripcion ?? null,
    fecha_inicio: body.fecha_inicio ?? actual?.fecha_inicio,
    fecha_fin: body.fecha_fin !== undefined ? body.fecha_fin || null : actual?.fecha_fin ?? null,
    cupo: Number(body.cupo ?? actual?.cupo),
    precio_inscripcion: Number(body.precio_inscripcion ?? actual?.precio_inscripcion ?? 0),
    premio: body.premio !== undefined ? texto(body.premio, 150) : actual?.premio ?? null,
    cantidad_grupos: Number(body.cantidad_grupos ?? actual?.cantidad_grupos),
    clasifican_por_grupo: Number(body.clasifican_por_grupo ?? actual?.clasifican_por_grupo),
    ida_vuelta: Boolean(body.ida_vuelta ?? actual?.ida_vuelta ?? false)
  };

  if (!datos.nombre) throw new ErrorHttp(400, "El nombre es obligatorio");
  if (!TIPOS.includes(datos.tipo)) throw new ErrorHttp(400, "Elegí si es un torneo o un campeonato");
  if (!DEPORTES.includes(datos.deporte)) throw new ErrorHttp(400, "El deporte debe ser fútbol o pádel");
  if (!fechaValida(datos.fecha_inicio)) throw new ErrorHttp(400, "La fecha de inicio no es válida");
  if (datos.fecha_fin && (!fechaValida(datos.fecha_fin) || datos.fecha_fin < datos.fecha_inicio)) {
    throw new ErrorHttp(400, "La fecha de fin tiene que ser posterior a la de inicio");
  }
  if (!Number.isInteger(datos.cupo) || datos.cupo < 2 || datos.cupo > 64) {
    throw new ErrorHttp(400, "El cupo tiene que ser entre 2 y 64 equipos");
  }
  if (!(datos.precio_inscripcion >= 0)) throw new ErrorHttp(400, "El precio de inscripción no puede ser negativo");

  // Fase de grupos: con el cupo lleno, cada grupo tiene que tener al menos 2 equipos
  // y tiene que quedar alguno afuera (si pasan todos, los grupos no definen nada)
  if (datos.tipo === "grupos") {
    const { cantidad_grupos: grupos, clasifican_por_grupo: pasan } = datos;
    if (!Number.isInteger(grupos) || grupos < 2 || grupos > LETRAS.length) {
      throw new ErrorHttp(400, `La cantidad de grupos tiene que ser entre 2 y ${LETRAS.length}`);
    }
    const porGrupo = Math.floor(datos.cupo / grupos);
    if (porGrupo < 2) throw new ErrorHttp(400, `Con un cupo de ${datos.cupo} no alcanza para ${grupos} grupos`);
    if (!Number.isInteger(pasan) || pasan < 1 || pasan >= porGrupo) {
      throw new ErrorHttp(
        400,
        porGrupo === 2
          ? "Con grupos de 2, pasa solo 1 por grupo"
          : `Con grupos de ${porGrupo}, pueden pasar entre 1 y ${porGrupo - 1} por grupo`
      );
    }
  } else {
    datos.cantidad_grupos = null;
    datos.clasifican_por_grupo = null;
  }
  // La eliminación directa no tiene ida y vuelta
  if (datos.tipo === "torneo") datos.ida_vuelta = false;
  return datos;
};

export const obtenerTorneos = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM equipos q WHERE q.id_torneo = t.id_torneo)::int AS inscriptos,
              (SELECT COUNT(*) FROM partidos p WHERE p.id_torneo = t.id_torneo AND p.estado = 'pendiente')::int AS pendientes
         FROM torneos t WHERE t.id_empresa = $1
        ORDER BY (t.estado IN ('finalizado', 'cancelado')), t.fecha_inicio DESC`,
      [req.empresa.id_empresa]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los torneos");
  }
};

export const obtenerTorneo = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw new ErrorHttp(404, "Torneo no encontrado");
    const torneo = await detalleTorneo(pool, req.params.id, { privado: true });
    if (!torneo || torneo.id_empresa !== req.empresa.id_empresa) throw new ErrorHttp(404, "Torneo no encontrado");
    res.json(torneo);
  } catch (error) {
    responderError(res, error, "Error al obtener el torneo");
  }
};

export const crearTorneo = async (req, res) => {
  try {
    const d = validarDatos(req.body ?? {});
    const { rows } = await pool.query(
      `INSERT INTO torneos (id_empresa, nombre, tipo, deporte, categoria, descripcion, fecha_inicio,
                            fecha_fin, cupo, precio_inscripcion, premio, cantidad_grupos, clasifican_por_grupo, ida_vuelta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id_torneo`,
      [
        req.empresa.id_empresa, d.nombre, d.tipo, d.deporte, d.categoria, d.descripcion,
        d.fecha_inicio, d.fecha_fin, d.cupo, d.precio_inscripcion, d.premio,
        d.cantidad_grupos, d.clasifican_por_grupo, d.ida_vuelta
      ]
    );
    res.status(201).json(await detalleTorneo(pool, rows[0].id_torneo, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al crear el torneo");
  }
};

export const actualizarTorneo = async (req, res) => {
  const body = req.body ?? {};
  try {
    await enTransaccion(async (db) => {
      const actual = await torneoPropio(db, req);

      // Cancelar: los partidos pendientes liberan las canchas
      if (body.estado === "cancelado") {
        await db.query(
          `DELETE FROM reservas WHERE id_partido IN
             (SELECT id_partido FROM partidos WHERE id_torneo = $1 AND estado = 'pendiente')`,
          [actual.id_torneo]
        );
        await db.query("UPDATE torneos SET estado = 'cancelado' WHERE id_torneo = $1", [actual.id_torneo]);
        return;
      }
      if (body.estado !== undefined) throw new ErrorHttp(400, "El estado cambia solo al generar el fixture y cargar resultados");

      const d = validarDatos(body, actual);
      const cambiaFormato =
        d.tipo !== actual.tipo ||
        d.deporte !== actual.deporte ||
        d.cantidad_grupos !== actual.cantidad_grupos ||
        d.clasifican_por_grupo !== actual.clasifican_por_grupo ||
        d.ida_vuelta !== actual.ida_vuelta;
      if (actual.estado !== "inscripcion" && cambiaFormato) {
        throw new ErrorHttp(400, "El formato y el deporte solo se pueden cambiar mientras está abierta la inscripción");
      }
      const { rows: [{ total }] } = await db.query(
        "SELECT COUNT(*)::int AS total FROM equipos WHERE id_torneo = $1",
        [actual.id_torneo]
      );
      if (d.cupo < total) {
        throw new ErrorHttp(400, `Ya hay ${total} ${d.deporte === "padel" ? "parejas inscriptas" : "equipos inscriptos"}: el cupo no puede ser menor`);
      }

      await db.query(
        `UPDATE torneos SET nombre = $1, tipo = $2, deporte = $3, categoria = $4, descripcion = $5,
                fecha_inicio = $6, fecha_fin = $7, cupo = $8, precio_inscripcion = $9, premio = $10,
                cantidad_grupos = $11, clasifican_por_grupo = $12, ida_vuelta = $13
          WHERE id_torneo = $14`,
        [
          d.nombre, d.tipo, d.deporte, d.categoria, d.descripcion, d.fecha_inicio,
          d.fecha_fin, d.cupo, d.precio_inscripcion, d.premio,
          d.cantidad_grupos, d.clasifican_por_grupo, d.ida_vuelta, actual.id_torneo
        ]
      );
      // Si hay menos grupos (o ya no hay fase de grupos), los equipos de los grupos que no existen quedan sin grupo
      await db.query(
        "UPDATE equipos SET grupo = NULL WHERE id_torneo = $1 AND grupo IS NOT NULL AND ($2::text IS NULL OR grupo > $2)",
        [actual.id_torneo, d.cantidad_grupos ? LETRAS[d.cantidad_grupos - 1] : null]
      );
    });
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al actualizar el torneo");
  }
};

export const eliminarTorneo = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw new ErrorHttp(404, "Torneo no encontrado");
    const resultado = await pool.query("DELETE FROM torneos WHERE id_torneo = $1 AND id_empresa = $2", [
      req.params.id,
      req.empresa.id_empresa
    ]);
    if (resultado.rowCount === 0) throw new ErrorHttp(404, "Torneo no encontrado");
    res.status(204).send();
  } catch (error) {
    responderError(res, error, "Error al eliminar el torneo");
  }
};

export const inscribirEquipo = async (req, res) => {
  try {
    await enTransaccion(async (db) => {
      await torneoPropio(db, req);
      await agregarEquipo(db, req.params.id, req.body ?? {});
    });
    res.status(201).json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al inscribir el equipo");
  }
};

export const quitarEquipo = async (req, res) => {
  try {
    await enTransaccion(async (db) => {
      const torneo = await torneoPropio(db, req);
      if (torneo.estado !== "inscripcion") {
        throw new ErrorHttp(400, `Con el fixture armado ya no se pueden quitar ${torneo.deporte === "padel" ? "parejas" : "equipos"}`);
      }
      if (!idValido(req.params.idEquipo)) throw new ErrorHttp(404, "Equipo no encontrado");
      const resultado = await db.query("DELETE FROM equipos WHERE id_equipo = $1 AND id_torneo = $2", [
        req.params.idEquipo,
        torneo.id_torneo
      ]);
      if (resultado.rowCount === 0) throw new ErrorHttp(404, "Equipo no encontrado");
    });
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al quitar el equipo");
  }
};

// Sortea los grupos al azar (después se pueden mover equipos a mano)
export const sortearLosGrupos = async (req, res) => {
  try {
    await enTransaccion(async (db) => sortearGrupos(db, await torneoPropio(db, req)));
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al sortear los grupos");
  }
};

// Mueve un equipo a otro grupo ({ grupo: "B" }) o lo deja sin grupo ({ grupo: null })
export const cambiarGrupo = async (req, res) => {
  try {
    await enTransaccion(async (db) => {
      const torneo = await torneoPropio(db, req);
      if (!idValido(req.params.idEquipo)) throw new ErrorHttp(404, "Equipo no encontrado");
      await asignarGrupo(db, torneo, req.params.idEquipo, req.body?.grupo || null);
    });
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al cambiar el grupo");
  }
};

// Cierra la fase de grupos y arma la llave con los clasificados
export const armarLaLlave = async (req, res) => {
  try {
    await enTransaccion(async (db) => armarLlave(db, await torneoPropio(db, req)));
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al armar la llave");
  }
};

export const armarFixture = async (req, res) => {
  try {
    await enTransaccion(async (db) => generarFixture(db, await torneoPropio(db, req)));
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al generar el fixture");
  }
};

// Carga el resultado y/o programa día, hora y cancha de un partido
export const actualizarPartido = async (req, res) => {
  const body = req.body ?? {};
  try {
    await enTransaccion(async (db) => {
      const torneo = await torneoPropio(db, req);
      if (torneo.estado === "cancelado") throw new ErrorHttp(400, "El torneo está cancelado");
      if (!idValido(req.params.idPartido)) throw new ErrorHttp(404, "Partido no encontrado");

      const { rows: [partido] } = await db.query(
        "SELECT * FROM partidos WHERE id_partido = $1 AND id_torneo = $2",
        [req.params.idPartido, torneo.id_torneo]
      );
      if (!partido) throw new ErrorHttp(404, "Partido no encontrado");
      if (partido.id_visitante === null) throw new ErrorHttp(400, "Ese equipo pasa libre: no hay partido que jugar");

      // Programación (cancha, día y hora)
      if (body.id_cancha !== undefined || body.fecha !== undefined || body.hora !== undefined) {
        const programa = { id_cancha: body.id_cancha || null, fecha: body.fecha || null, hora: body.hora || null };
        if (programa.id_cancha || programa.fecha || programa.hora) {
          if (!idValido(programa.id_cancha) || !fechaValida(programa.fecha) || !horaValida(programa.hora)) {
            throw new ErrorHttp(400, "Para programar el partido indicá cancha, día y hora");
          }
        }
        await programarPartido(db, torneo, partido, programa);
      }

      // Resultado (o incomparecencia: { incomparecencia: "local" | "visitante" | null })
      if (body.resultado_local !== undefined || body.resultado_visitante !== undefined || body.incomparecencia !== undefined) {
        // Partido de la fase de grupos: se puede corregir hasta que se arma la llave.
        // Partido de llave: solo los de la última ronda (las anteriores ya armaron la siguiente).
        const deGrupos = partido.grupo !== null;
        const { rows: [{ ultima }] } = await db.query(
          "SELECT MAX(ronda) AS ultima FROM partidos WHERE id_torneo = $1 AND grupo IS NULL",
          [torneo.id_torneo]
        );
        if (torneo.tipo !== "campeonato") {
          if (deGrupos && ultima !== null) {
            throw new ErrorHttp(400, "La fase de grupos ya está cerrada: no se puede cambiar el resultado");
          }
          if (!deGrupos && partido.ronda !== ultima) {
            throw new ErrorHttp(400, "Esa ronda ya está cerrada: no se puede cambiar el resultado");
          }
        }

        const vacio = (v) => v === null || v === undefined || v === "";
        let local = null;
        let visitante = null;
        if (body.incomparecencia && !["local", "visitante"].includes(body.incomparecencia)) {
          throw new ErrorHttp(400, "Indicá qué equipo no se presentó");
        }
        const ausente = body.incomparecencia
          ? body.incomparecencia === "local" ? partido.id_local : partido.id_visitante
          : null;
        // Un solo lado cargado no es un resultado (antes se tomaba el vacío como 0 y cerraba la ronda)
        if (!ausente && vacio(body.resultado_local) !== vacio(body.resultado_visitante)) {
          throw new ErrorHttp(400, `Cargá el resultado de ${torneo.deporte === "padel" ? "las dos parejas" : "los dos equipos"}`);
        }
        if (!ausente && !vacio(body.resultado_local)) {
          local = Number(body.resultado_local);
          visitante = Number(body.resultado_visitante);
          if (![local, visitante].every((n) => Number.isInteger(n) && n >= 0 && n <= 99)) {
            throw new ErrorHttp(400, "El resultado tiene que ser un número entre 0 y 99");
          }
          const conEmpate = torneo.tipo === "campeonato" || deGrupos;
          if (local === visitante && (!conEmpate || torneo.deporte === "padel")) {
            throw new ErrorHttp(400, torneo.tipo === "grupos" && !deGrupos ? "En la llave no puede haber empate" : "En este torneo no puede haber empate");
          }
        }

        const estado = local === null && !ausente ? "pendiente" : "jugado";
        await db.query(
          `UPDATE partidos SET resultado_local = $1, resultado_visitante = $2, estado = $3, incomparecencia = $4
            WHERE id_partido = $5`,
          [local, visitante, estado, ausente, partido.id_partido]
        );
        await db.query("UPDATE reservas SET estado = $1 WHERE id_partido = $2", [
          estado === "jugado" ? "jugada" : "confirmada",
          partido.id_partido
        ]);
        await actualizarAvance(db, torneo.id_torneo);
      }
    });
    res.json(await detalleTorneo(pool, req.params.id, { privado: true }));
  } catch (error) {
    responderError(res, error, "Error al actualizar el partido");
  }
};
