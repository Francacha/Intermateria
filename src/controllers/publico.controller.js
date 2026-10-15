import pool from "../data/db.js";
import { buscarPerfil, horarioDeFecha } from "../data/perfiles.js";
import { detalleTorneo } from "../data/torneos.js";
import { DEPORTES, ErrorHttp, fechaValida, idValido, responderError } from "../utils/comun.js";

// Rutas públicas (sin login): lo que ve cualquiera que entra al sitio.
// Solo se muestran complejos activos y canchas activas.

// Todos los complejos con sus canchas, opcionalmente filtrados por deporte o nombre
export const listarComplejos = async (req, res) => {
  const deporte = DEPORTES.includes(req.query.deporte) ? req.query.deporte : null;
  const busqueda = String(req.query.q ?? "").trim();
  try {
    const { rows } = await pool.query(
      `SELECT e.id_empresa, e.nombre, e.direccion, e.telefono,
              COALESCE(p.descripcion, '') AS descripcion,
              COALESCE(p.servicios, '{}') AS servicios,
              json_agg(json_build_object(
                'id_cancha', c.id_cancha, 'nombre', c.nombre, 'deporte', c.deporte,
                'jugadores', c.jugadores, 'superficie', c.superficie, 'techada', c.techada,
                'precio_hora', c.precio_hora
              ) ORDER BY c.deporte, c.nombre) AS canchas,
              (SELECT COUNT(*) FROM torneos t
                WHERE t.id_empresa = e.id_empresa AND t.estado IN ('inscripcion', 'en_curso'))::int AS torneos_activos
         FROM empresas e
         JOIN canchas c ON c.id_empresa = e.id_empresa AND c.activa
                       AND ($1::text IS NULL OR c.deporte = $1)
         LEFT JOIN perfiles p ON p.id_empresa = e.id_empresa
        WHERE e.activo AND ($2 = '' OR e.nombre ILIKE '%' || $2 || '%' OR e.direccion ILIKE '%' || $2 || '%')
        GROUP BY e.id_empresa, p.id_empresa
        ORDER BY e.nombre`,
      [deporte, busqueda]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los complejos");
  }
};

// Ficha de un complejo: datos, perfil, canchas y torneos
export const obtenerComplejo = async (req, res) => {
  const { id } = req.params;
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Complejo no encontrado");
    const { rows: [empresa] } = await pool.query(
      "SELECT id_empresa, nombre, direccion, telefono, email FROM empresas WHERE id_empresa = $1 AND activo",
      [id]
    );
    if (!empresa) throw new ErrorHttp(404, "Complejo no encontrado");

    const [perfil, canchas, torneos] = await Promise.all([
      buscarPerfil(empresa.id_empresa),
      pool.query(
        `SELECT id_cancha, nombre, deporte, jugadores, superficie, techada, precio_hora
           FROM canchas WHERE id_empresa = $1 AND activa ORDER BY deporte, nombre`,
        [id]
      ),
      pool.query(
        `SELECT t.*, (SELECT COUNT(*) FROM equipos q WHERE q.id_torneo = t.id_torneo)::int AS inscriptos
           FROM torneos t WHERE t.id_empresa = $1 AND t.estado <> 'cancelado'
          ORDER BY (t.estado = 'finalizado'), t.fecha_inicio`,
        [id]
      )
    ]);

    res.json({ ...empresa, perfil, canchas: canchas.rows, torneos: torneos.rows });
  } catch (error) {
    responderError(res, error, "Error al obtener el complejo");
  }
};

// Horarios ocupados de una cancha en un día, para armar la grilla de turnos
export const disponibilidad = async (req, res) => {
  const { id } = req.params;
  const { fecha } = req.query;
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Cancha no encontrada");
    if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");

    const { rows: [cancha] } = await pool.query(
      `SELECT c.id_cancha, c.id_empresa FROM canchas c JOIN empresas e ON e.id_empresa = c.id_empresa
        WHERE c.id_cancha = $1 AND c.activa AND e.activo`,
      [id]
    );
    if (!cancha) throw new ErrorHttp(404, "Cancha no encontrada");

    const perfil = await buscarPerfil(cancha.id_empresa);
    const { rows: ocupados } = await pool.query(
      `SELECT to_char(hora_inicio, 'HH24:MI') AS desde,
              CASE WHEN hora_fin = '24:00' THEN '24:00' ELSE to_char(hora_fin, 'HH24:MI') END AS hasta
         FROM reservas WHERE id_cancha = $1 AND fecha = $2 AND estado <> 'cancelada'
        ORDER BY hora_inicio`,
      [id, fecha]
    );
    res.json({ fecha, horario: horarioDeFecha(perfil.horarios, fecha), ocupados });
  } catch (error) {
    responderError(res, error, "Error al consultar la disponibilidad");
  }
};

// Horarios ocupados de todas las canchas activas en un día, en una sola consulta.
// La usan el inicio y el catálogo para no pedir la disponibilidad cancha por cancha.
export const disponibilidadDelDia = async (req, res) => {
  const { fecha } = req.query;
  const deporte = DEPORTES.includes(req.query.deporte) ? req.query.deporte : null;
  try {
    if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");
    const { rows } = await pool.query(
      `SELECT c.id_cancha, p.horarios,
              COALESCE(
                json_agg(json_build_object(
                  'desde', to_char(r.hora_inicio, 'HH24:MI'),
                  'hasta', CASE WHEN r.hora_fin = '24:00' THEN '24:00' ELSE to_char(r.hora_fin, 'HH24:MI') END
                ) ORDER BY r.hora_inicio) FILTER (WHERE r.id_reserva IS NOT NULL),
                '[]'
              ) AS ocupados
         FROM canchas c
         JOIN empresas e ON e.id_empresa = c.id_empresa AND e.activo
         LEFT JOIN perfiles p ON p.id_empresa = c.id_empresa
         LEFT JOIN reservas r ON r.id_cancha = c.id_cancha AND r.fecha = $1 AND r.estado <> 'cancelada'
        WHERE c.activa AND ($2::text IS NULL OR c.deporte = $2)
        GROUP BY c.id_cancha, p.horarios`,
      [fecha, deporte]
    );
    res.json(
      rows.map((fila) => ({
        id_cancha: fila.id_cancha,
        horario: horarioDeFecha(fila.horarios, fecha),
        ocupados: fila.ocupados
      }))
    );
  } catch (error) {
    responderError(res, error, "Error al consultar la disponibilidad");
  }
};

// Torneos y campeonatos de todos los complejos activos
export const listarTorneos = async (req, res) => {
  const deporte = DEPORTES.includes(req.query.deporte) ? req.query.deporte : null;
  try {
    const { rows } = await pool.query(
      `SELECT t.*, e.nombre AS complejo, e.direccion,
              (SELECT COUNT(*) FROM equipos q WHERE q.id_torneo = t.id_torneo)::int AS inscriptos
         FROM torneos t JOIN empresas e ON e.id_empresa = t.id_empresa
        WHERE e.activo AND t.estado <> 'cancelado' AND ($1::text IS NULL OR t.deporte = $1)
        ORDER BY CASE t.estado WHEN 'inscripcion' THEN 0 WHEN 'en_curso' THEN 1 ELSE 2 END, t.fecha_inicio`,
      [deporte]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los torneos");
  }
};

export const obtenerTorneoPublico = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw new ErrorHttp(404, "Torneo no encontrado");
    const torneo = await detalleTorneo(pool, req.params.id);
    if (!torneo || !torneo.empresa_activa) throw new ErrorHttp(404, "Torneo no encontrado");
    res.json(torneo);
  } catch (error) {
    responderError(res, error, "Error al obtener el torneo");
  }
};
