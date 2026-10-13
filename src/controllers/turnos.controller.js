import pool from "../data/db.js";
import { CONSULTA_TURNOS, crearTurno } from "../data/turnos.js";
import { ErrorHttp, ahora, fechaValida, idValido, responderError } from "../utils/comun.js";

const ESTADOS = ["reservada", "confirmada", "cancelada", "jugada"];

// ---------- Cliente: sus reservas ----------

export const reservar = async (req, res) => {
  const { id_cancha, fecha, hora_inicio, duracion } = req.body ?? {};
  try {
    const turno = await crearTurno(pool, {
      idCancha: id_cancha,
      fecha,
      horaInicio: hora_inicio,
      duracion,
      idCliente: req.usuario.id
    });
    res.status(201).json(turno);
  } catch (error) {
    responderError(res, error, "Error al reservar el turno");
  }
};

export const misReservas = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${CONSULTA_TURNOS} WHERE r.id_cliente = $1 ORDER BY r.fecha DESC, r.hora_inicio DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener tus reservas");
  }
};

// El cliente puede cancelar un turno suyo que todavía no empezó
export const cancelarMiReserva = async (req, res) => {
  const { id } = req.params;
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Reserva no encontrada");
    const hoy = ahora();
    const { rows } = await pool.query(
      `UPDATE reservas SET estado = 'cancelada'
        WHERE id_reserva = $1 AND id_cliente = $2 AND estado IN ('reservada', 'confirmada')
          AND (fecha > $3 OR (fecha = $3 AND hora_inicio > $4))
        RETURNING id_reserva`,
      [id, req.usuario.id, hoy.fecha, hoy.hora]
    );
    if (rows.length === 0) throw new ErrorHttp(400, "Esa reserva ya no se puede cancelar");
    const { rows: turno } = await pool.query(`${CONSULTA_TURNOS} WHERE r.id_reserva = $1`, [id]);
    res.json(turno[0]);
  } catch (error) {
    responderError(res, error, "Error al cancelar la reserva");
  }
};

// ---------- Complejo: administración de turnos ----------

// Turnos de un día (por defecto, hoy) de todas las canchas del complejo
export const turnosDelDia = async (req, res) => {
  const fecha = req.query.fecha || ahora().fecha;
  try {
    if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");
    const { rows } = await pool.query(
      `${CONSULTA_TURNOS} WHERE r.id_empresa = $1 AND r.fecha = $2 ORDER BY r.hora_inicio, c.nombre`,
      [req.empresa.id_empresa, fecha]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los turnos");
  }
};

// Turno cargado a mano por el complejo (cliente que llama por teléfono, mostrador...)
export const crearTurnoManual = async (req, res) => {
  const { id_cancha, fecha, hora_inicio, duracion, contacto_nombre, contacto_telefono, sena } = req.body ?? {};
  try {
    if (!contacto_nombre?.trim()) throw new ErrorHttp(400, "Indicá a nombre de quién es el turno");
    const turno = await crearTurno(pool, {
      idCancha: id_cancha,
      fecha,
      horaInicio: hora_inicio,
      duracion,
      sena,
      contactoNombre: contacto_nombre.trim().slice(0, 100),
      contactoTelefono: contacto_telefono?.trim().slice(0, 30),
      idEmpresa: req.empresa.id_empresa
    });
    res.status(201).json(turno);
  } catch (error) {
    responderError(res, error, "Error al cargar el turno");
  }
};

// Cambiar el estado (confirmar, marcar como jugado, cancelar) o la seña
export const actualizarTurno = async (req, res) => {
  const { id } = req.params;
  const { estado, sena } = req.body ?? {};
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Turno no encontrado");
    if (estado !== undefined && !ESTADOS.includes(estado)) throw new ErrorHttp(400, "Estado inválido");
    if (sena !== undefined && !(Number(sena) >= 0)) throw new ErrorHttp(400, "La seña no puede ser negativa");

    const { rows } = await pool.query(
      `UPDATE reservas SET estado = COALESCE($1, estado), sena = COALESCE($2, sena)
        WHERE id_reserva = $3 AND id_empresa = $4 AND id_partido IS NULL
        RETURNING id_reserva`,
      [estado ?? null, sena ?? null, id, req.empresa.id_empresa]
    );
    if (rows.length === 0) {
      throw new ErrorHttp(404, "Turno no encontrado (los partidos de torneos se manejan desde el torneo)");
    }
    const { rows: turno } = await pool.query(`${CONSULTA_TURNOS} WHERE r.id_reserva = $1`, [id]);
    res.json(turno[0]);
  } catch (error) {
    responderError(res, error, "Error al actualizar el turno");
  }
};
