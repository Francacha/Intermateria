import pool from "../data/db.js";
import { agregarEquipo } from "../data/torneos.js";
import { ErrorHttp, idValido, responderError } from "../utils/comun.js";

// Equipos que el cliente logueado inscribió en torneos y campeonatos

export const misInscripciones = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, t.nombre AS torneo, t.tipo, t.deporte, t.estado, t.fecha_inicio,
              t.precio_inscripcion, e.nombre AS complejo, e.direccion
         FROM equipos q
         JOIN torneos t ON t.id_torneo = q.id_torneo
         JOIN empresas e ON e.id_empresa = t.id_empresa
        WHERE q.id_cliente = $1
        ORDER BY t.fecha_inicio DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener tus inscripciones");
  }
};

export const inscribirse = async (req, res) => {
  const { id_torneo, nombre, integrantes, contacto_telefono } = req.body ?? {};
  const cliente = await pool.connect();
  try {
    if (!idValido(id_torneo)) throw new ErrorHttp(404, "Torneo no encontrado");
    await cliente.query("BEGIN");

    const { rows: [torneo] } = await cliente.query(
      `SELECT e.activo FROM torneos t JOIN empresas e ON e.id_empresa = t.id_empresa WHERE t.id_torneo = $1`,
      [id_torneo]
    );
    if (!torneo?.activo) throw new ErrorHttp(404, "Torneo no encontrado");

    const { rows: yaInscripto } = await cliente.query(
      "SELECT 1 FROM equipos WHERE id_torneo = $1 AND id_cliente = $2",
      [id_torneo, req.usuario.id]
    );
    if (yaInscripto.length) throw new ErrorHttp(400, "Ya inscribiste un equipo en este torneo");

    const { rows: [yo] } = await cliente.query(
      "SELECT nombre, apellido, telefono FROM clientes WHERE id_cliente = $1",
      [req.usuario.id]
    );
    const equipo = await agregarEquipo(cliente, id_torneo, {
      nombre,
      integrantes,
      contacto_nombre: `${yo.nombre} ${yo.apellido}`,
      contacto_telefono: contacto_telefono || yo.telefono,
      id_cliente: req.usuario.id
    });

    await cliente.query("COMMIT");
    res.status(201).json(equipo);
  } catch (error) {
    await cliente.query("ROLLBACK");
    responderError(res, error, "Error al inscribirte");
  } finally {
    cliente.release();
  }
};

// Darse de baja mientras la inscripción sigue abierta
export const darseDeBaja = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw new ErrorHttp(404, "Inscripción no encontrada");
    const resultado = await pool.query(
      `DELETE FROM equipos q USING torneos t
        WHERE q.id_equipo = $1 AND q.id_cliente = $2 AND t.id_torneo = q.id_torneo AND t.estado = 'inscripcion'`,
      [req.params.id, req.usuario.id]
    );
    if (resultado.rowCount === 0) throw new ErrorHttp(400, "Esa inscripción ya no se puede dar de baja");
    res.status(204).send();
  } catch (error) {
    responderError(res, error, "Error al darte de baja");
  }
};
