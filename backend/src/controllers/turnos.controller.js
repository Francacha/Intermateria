import pool, { enTransaccion } from "../data/db.js";
import {
  CONSULTA_TURNOS,
  anularPago,
  cancelarTurno,
  crearTurno,
  marcarTurno,
  registrarPago,
  resolverSena
} from "../data/turnos.js";
import { ErrorHttp, ahora, fechaValida, responderError } from "../utils/comun.js";

// ---------- Cliente: sus reservas ----------

export const reservar = async (req, res) => {
  const { id_cancha, fecha, hora_inicio } = req.body ?? {};
  try {
    const turno = await crearTurno(pool, {
      idCancha: id_cancha,
      fecha,
      horaInicio: hora_inicio,
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

// El cliente puede cancelar un turno suyo que todavía no empezó. Si avisa con
// menos horas de las que fija el complejo y dejó seña, la pierde.
export const cancelarMiReserva = async (req, res) => {
  try {
    const turno = await enTransaccion((db) =>
      cancelarTurno(db, req.params.id, { idCliente: req.usuario.id, motivo: "Cancelado por el jugador desde la web" })
    );
    res.json(turno);
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
  const { id_cancha, fecha, hora_inicio, contacto_nombre, contacto_telefono, sena, medio_sena } = req.body ?? {};
  try {
    if (!contacto_nombre?.trim()) throw new ErrorHttp(400, "Indicá a nombre de quién es el turno");
    const turno = await enTransaccion((db) =>
      crearTurno(db, {
        idCancha: id_cancha,
        fecha,
        horaInicio: hora_inicio,
        sena,
        medioSena: medio_sena,
        quien: req.empresa.quien,
        contactoNombre: contacto_nombre.trim().slice(0, 100),
        contactoTelefono: contacto_telefono?.trim().slice(0, 30),
        idEmpresa: req.empresa.id_empresa
      })
    );
    res.status(201).json(turno);
  } catch (error) {
    responderError(res, error, "Error al cargar el turno");
  }
};

// Cambiar el estado: reservado, confirmado, jugado o "no vino"
export const actualizarTurno = async (req, res) => {
  try {
    const turno = await enTransaccion((db) =>
      marcarTurno(db, req.params.id, req.empresa.id_empresa, (req.body ?? {}).estado)
    );
    res.json(turno);
  } catch (error) {
    responderError(res, error, "Error al actualizar el turno");
  }
};

// Cancelar desde el mostrador. por_el_complejo: lluvia, cierre u otro motivo
// del complejo (el jugador no pierde la seña). Si no, avisó el jugador y rige
// la regla de las horas de anticipación. Un turno fijo cancelado = esa semana liberada.
export const cancelarTurnoComplejo = async (req, res) => {
  const { motivo, por_el_complejo } = req.body ?? {};
  try {
    const turno = await enTransaccion((db) =>
      cancelarTurno(db, req.params.id, {
        idEmpresa: req.empresa.id_empresa,
        porElComplejo: por_el_complejo === true,
        motivo: [motivo, `(registró ${req.empresa.quien})`].filter(Boolean).join(" ")
      })
    );
    res.json(turno);
  } catch (error) {
    responderError(res, error, "Error al cancelar el turno");
  }
};

export const resolverSenaTurno = async (req, res) => {
  try {
    const turno = await enTransaccion((db) =>
      resolverSena(db, req.params.id, req.empresa.id_empresa, (req.body ?? {}).resultado)
    );
    res.json(turno);
  } catch (error) {
    responderError(res, error, "Error al resolver la seña");
  }
};

export const registrarPagoTurno = async (req, res) => {
  const { tipo, medio, monto } = req.body ?? {};
  try {
    const turno = await enTransaccion((db) =>
      registrarPago(db, req.params.id, req.empresa.id_empresa, { tipo, medio, monto, quien: req.empresa.quien })
    );
    res.status(201).json(turno);
  } catch (error) {
    responderError(res, error, "Error al registrar el pago");
  }
};

export const anularPagoTurno = async (req, res) => {
  try {
    const turno = await enTransaccion((db) =>
      anularPago(db, req.params.id, req.params.idPago, req.empresa.id_empresa)
    );
    res.json(turno);
  } catch (error) {
    responderError(res, error, "Error al anular el pago");
  }
};
