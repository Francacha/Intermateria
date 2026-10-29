import pool, { enTransaccion } from "../data/db.js";
import { crearTurnoFijo, darDeBaja, editarContacto, listarTurnosFijos } from "../data/turnosFijos.js";
import { responderError } from "../utils/comun.js";

// Turnos fijos del complejo: los grupos que juegan siempre el mismo día y horario.
// Para liberar una sola semana se cancela ese turno desde la agenda.

export const obtenerTurnosFijos = async (req, res) => {
  try {
    res.json(await listarTurnosFijos(pool, req.empresa.id_empresa));
  } catch (error) {
    responderError(res, error, "Error al obtener los turnos fijos");
  }
};

export const nuevoTurnoFijo = async (req, res) => {
  try {
    await enTransaccion((db) => crearTurnoFijo(db, req.empresa.id_empresa, req.body ?? {}));
    res.status(201).json(await listarTurnosFijos(pool, req.empresa.id_empresa));
  } catch (error) {
    responderError(res, error, "Error al crear el turno fijo");
  }
};

// { contacto_nombre, contacto_telefono } para editar, o { activo: false } para darlo de baja
export const actualizarTurnoFijo = async (req, res) => {
  const body = req.body ?? {};
  try {
    const canceladas = await enTransaccion(async (db) => {
      if (body.activo === false) return darDeBaja(db, req.params.id, req.empresa.id_empresa);
      await editarContacto(db, req.params.id, req.empresa.id_empresa, body);
      return 0;
    });
    res.json({ canceladas, turnos_fijos: await listarTurnosFijos(pool, req.empresa.id_empresa) });
  } catch (error) {
    responderError(res, error, "Error al actualizar el turno fijo");
  }
};
