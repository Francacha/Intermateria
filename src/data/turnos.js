import { buscarPerfil, horarioDeFecha } from "./perfiles.js";
import { cierreQueSuperpone } from "./cierres.js";
import {
  DURACION_TURNO,
  ErrorHttp,
  aHora,
  aMinutos,
  ahora,
  cierreEnMinutos,
  fechaValida,
  horaValida,
  idValido,
  minutosHasta,
  precioTurno,
  resultadoDeSena
} from "../utils/comun.js";

// Un jugador puede reservar con hasta 60 días de anticipación
export const DIAS_ANTICIPACION = 60;

export const MEDIOS_DE_PAGO = ["transferencia", "efectivo"];

// Turnos con los datos de la cancha, de quién reservó (cliente registrado o
// contacto cargado a mano) y de los pagos: seña pedida, seña pagada y saldo.
// "inasistencias": cuántas veces esa misma persona reservó y no vino en el complejo.
export const CONSULTA_TURNOS = `
  SELECT r.id_reserva, r.id_empresa, r.id_cancha, r.id_cliente, r.id_partido, r.id_turno_fijo, r.fecha,
         r.hora_inicio, r.hora_fin, r.estado, r.precio_total, r.fecha_creacion,
         r.cancelada_en, r.cancelada_por, r.motivo_cancelacion, r.resultado_sena,
         c.nombre AS cancha, c.deporte, e.nombre AS complejo, e.direccion,
         COALESCE(cl.nombre || ' ' || cl.apellido, r.contacto_nombre) AS cliente,
         COALESCE(cl.telefono, r.contacto_telefono) AS telefono,
         cl.email,
         COALESCE(pf.porcentaje_sena, 50) AS porcentaje_sena,
         COALESCE(pf.horas_cancelacion, 24) AS horas_cancelacion,
         COALESCE(pf.datos_transferencia, '') AS datos_transferencia,
         ROUND(r.precio_total * COALESCE(pf.porcentaje_sena, 50) / 100) AS sena_requerida,
         COALESCE(pg.sena_pagada, 0) AS sena_pagada,
         COALESCE(pg.pagado, 0) AS pagado,
         r.precio_total - COALESCE(pg.pagado, 0) AS saldo,
         COALESCE(pg.pagos, '[]') AS pagos,
         (SELECT COUNT(*) FROM reservas a
           WHERE a.id_empresa = r.id_empresa AND a.estado = 'ausente' AND a.id_reserva <> r.id_reserva
             AND ((r.id_cliente IS NOT NULL AND a.id_cliente = r.id_cliente)
               OR (r.contacto_telefono IS NOT NULL AND a.contacto_telefono = r.contacto_telefono)))::int AS inasistencias
    FROM reservas r
    JOIN canchas c ON c.id_cancha = r.id_cancha
    JOIN empresas e ON e.id_empresa = r.id_empresa
    LEFT JOIN clientes cl ON cl.id_cliente = r.id_cliente
    LEFT JOIN perfiles pf ON pf.id_empresa = r.id_empresa
    LEFT JOIN LATERAL (
      SELECT SUM(p.monto) AS pagado,
             SUM(p.monto) FILTER (WHERE p.tipo = 'sena') AS sena_pagada,
             json_agg(json_build_object(
               'id_pago', p.id_pago, 'tipo', p.tipo, 'medio', p.medio, 'monto', p.monto,
               'registrado_por', p.registrado_por, 'fecha_hora', p.fecha_hora
             ) ORDER BY p.fecha_hora) AS pagos
        FROM pagos p WHERE p.id_reserva = r.id_reserva
    ) pg ON TRUE`;

export const buscarTurno = async (db, idReserva) => {
  const { rows } = await db.query(`${CONSULTA_TURNOS} WHERE r.id_reserva = $1`, [idReserva]);
  return rows[0] ?? null;
};

const diasEntre = (desde, hasta) =>
  (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;

// Crea un turno validando todo lo que la base no puede validar sola.
// La superposición con otros turnos la controla el EXCLUDE de la tabla reservas.
//   - idEmpresa: lo carga el complejo (solo sus canchas, sin límite de horario)
//   - idCliente: lo saca un cliente (canchas activas, dentro del horario del complejo)
// La duración la fija el deporte (fútbol 1 hora, pádel 1 hora y media) y el
// precio sale de la tarifa de día o de noche de la cancha.
export const crearTurno = async (db, datos) => {
  const { idCancha, fecha, horaInicio, idEmpresa = null, idCliente = null } = datos;

  if (!idValido(idCancha)) throw new ErrorHttp(400, "Elegí una cancha");
  if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");
  if (!horaValida(horaInicio) || aMinutos(horaInicio) % 30 !== 0) {
    throw new ErrorHttp(400, "El turno tiene que empezar en punto o y media");
  }

  const { rows: canchas } = await db.query(
    `SELECT c.*, e.activo AS empresa_activa
       FROM canchas c JOIN empresas e ON e.id_empresa = c.id_empresa
      WHERE c.id_cancha = $1 AND ($2::int IS NULL OR c.id_empresa = $2)`,
    [idCancha, idEmpresa]
  );
  const cancha = canchas[0];
  if (!cancha || (!idEmpresa && (!cancha.activa || !cancha.empresa_activa))) {
    throw new ErrorHttp(404, "Cancha no encontrada");
  }

  const duracion = DURACION_TURNO[cancha.deporte];
  const inicio = aMinutos(horaInicio);
  const fin = inicio + duracion;
  if (fin > 1440) throw new ErrorHttp(400, "El turno no puede pasar de la medianoche");

  const hoy = ahora();
  if (fecha < hoy.fecha || (fecha === hoy.fecha && horaInicio <= hoy.hora)) {
    throw new ErrorHttp(400, "Ese horario ya pasó");
  }

  const perfil = await buscarPerfil(cancha.id_empresa);
  if (!idEmpresa) {
    if (diasEntre(hoy.fecha, fecha) > DIAS_ANTICIPACION) {
      throw new ErrorHttp(400, `Se puede reservar con hasta ${DIAS_ANTICIPACION} días de anticipación`);
    }
    const horario = horarioDeFecha(perfil.horarios, fecha);
    if (!horario.abierto) throw new ErrorHttp(400, "El complejo está cerrado ese día");
    if (inicio < aMinutos(horario.abre) || fin > cierreEnMinutos(horario.abre, horario.cierra)) {
      throw new ErrorHttp(400, `El complejo atiende de ${horario.abre} a ${horario.cierra}`);
    }
  }

  if (await cierreQueSuperpone(db, cancha.id_cancha, fecha, horaInicio, aHora(fin))) {
    throw new ErrorHttp(409, "La cancha está cerrada en ese horario");
  }

  const precio = precioTurno(cancha, inicio, fin, perfil.reglas.hora_noche);
  const sena = Number(datos.sena ?? 0);
  if (!(sena >= 0)) throw new ErrorHttp(400, "La seña no puede ser negativa");
  if (sena > precio) throw new ErrorHttp(400, "La seña no puede ser mayor que el precio del turno");
  const medioSena = datos.medioSena ?? "transferencia";
  if (sena > 0 && !MEDIOS_DE_PAGO.includes(medioSena)) throw new ErrorHttp(400, "Medio de pago inválido");

  const { rows } = await db.query(
    `INSERT INTO reservas (id_empresa, id_cancha, id_cliente, contacto_nombre, contacto_telefono,
                           fecha, hora_inicio, hora_fin, precio_total, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_reserva`,
    [
      cancha.id_empresa,
      cancha.id_cancha,
      idCliente,
      datos.contactoNombre || null,
      datos.contactoTelefono || null,
      fecha,
      horaInicio,
      aHora(fin),
      precio,
      // Los turnos que carga el propio complejo ya están confirmados
      idEmpresa ? "confirmada" : "reservada"
    ]
  );

  // El complejo puede cargar la seña en el mismo momento (ya la transfirió)
  if (sena > 0) {
    await db.query(
      `INSERT INTO pagos (id_reserva, id_empresa, tipo, medio, monto, registrado_por)
       VALUES ($1, $2, 'sena', $3, $4, $5)`,
      [rows[0].id_reserva, cancha.id_empresa, medioSena, sena, datos.quien ?? null]
    );
  }

  return buscarTurno(db, rows[0].id_reserva);
};

// Trae y bloquea un turno para modificarlo. "idEmpresa" o "idCliente" limitan a los propios.
const turnoParaModificar = async (db, idReserva, { idEmpresa = null, idCliente = null } = {}) => {
  if (!idValido(idReserva)) throw new ErrorHttp(404, "Turno no encontrado");
  const { rows } = await db.query(
    `SELECT * FROM reservas
      WHERE id_reserva = $1 AND ($2::int IS NULL OR id_empresa = $2) AND ($3::int IS NULL OR id_cliente = $3)
      FOR UPDATE`,
    [idReserva, idEmpresa, idCliente]
  );
  const turno = rows[0];
  if (!turno) throw new ErrorHttp(404, "Turno no encontrado");
  if (turno.id_partido) throw new ErrorHttp(400, "Los partidos de torneos se manejan desde el torneo");
  const { rows: [pagos] } = await db.query(
    `SELECT COALESCE(SUM(monto), 0) AS pagado,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'sena'), 0) AS sena_pagada
       FROM pagos WHERE id_reserva = $1`,
    [idReserva]
  );
  return { ...turno, pagado: Number(pagos.pagado), sena_pagada: Number(pagos.sena_pagada) };
};

const horasDeCancelacion = async (db, idEmpresa) => {
  const { rows } = await db.query("SELECT horas_cancelacion FROM perfiles WHERE id_empresa = $1", [idEmpresa]);
  return rows[0]?.horas_cancelacion ?? 24;
};

// Cancela un turno y deja registrado cuándo, quién lo causó, por qué y qué pasó con la seña.
//   porElComplejo: true si cancela el complejo (lluvia, cierre, baja de un turno fijo)
//   idCliente: si cancela el propio jugador desde la web (solo antes de que empiece)
export const cancelarTurno = async (db, idReserva, { idEmpresa = null, idCliente = null, porElComplejo = false, motivo = null } = {}) => {
  const turno = await turnoParaModificar(db, idReserva, { idEmpresa, idCliente });
  if (!["reservada", "confirmada"].includes(turno.estado)) {
    throw new ErrorHttp(400, "Ese turno ya no se puede cancelar");
  }
  const minutosAntes = minutosHasta(turno.fecha, turno.hora_inicio.slice(0, 5));
  if (idCliente && minutosAntes <= 0) throw new ErrorHttp(400, "El turno ya empezó: no se puede cancelar");

  const resultado = resultadoDeSena({
    senaPagada: turno.sena_pagada,
    porElComplejo,
    minutosAntes,
    horas: await horasDeCancelacion(db, turno.id_empresa)
  });
  await db.query(
    `UPDATE reservas SET estado = 'cancelada', cancelada_en = NOW(), cancelada_por = $1,
            motivo_cancelacion = $2, resultado_sena = $3
      WHERE id_reserva = $4`,
    [porElComplejo ? "complejo" : "cliente", String(motivo ?? "").trim().slice(0, 200) || null, resultado, idReserva]
  );
  return buscarTurno(db, idReserva);
};

// El complejo cambia el estado de un turno: confirmado, jugado o "no vino".
// Jugado y "no vino" solo cuando el turno ya empezó. Si no vino y había dejado
// seña, la pierde (regla del dueño).
export const marcarTurno = async (db, idReserva, idEmpresa, estado) => {
  if (!["reservada", "confirmada", "jugada", "ausente"].includes(estado)) {
    throw new ErrorHttp(400, "Estado inválido (para cancelar usá la opción Cancelar)");
  }
  const turno = await turnoParaModificar(db, idReserva, { idEmpresa });
  if (turno.estado === "cancelada") throw new ErrorHttp(400, "El turno está cancelado");
  if (["jugada", "ausente"].includes(estado) && minutosHasta(turno.fecha, turno.hora_inicio.slice(0, 5)) > 0) {
    throw new ErrorHttp(400, "El turno todavía no empezó");
  }
  const resultado = estado === "ausente" ? (turno.sena_pagada > 0 ? "perdida" : "sin_sena") : null;
  await db.query("UPDATE reservas SET estado = $1, resultado_sena = $2 WHERE id_reserva = $3", [
    estado,
    resultado,
    idReserva
  ]);
  return buscarTurno(db, idReserva);
};

// Seña de un turno cancelado a tiempo (o cancelado por el complejo): se devolvió,
// queda a favor del jugador para otro turno, o se pierde
export const resolverSena = async (db, idReserva, idEmpresa, resultado) => {
  if (!["devuelta", "a_favor", "perdida"].includes(resultado)) throw new ErrorHttp(400, "Opción inválida");
  const turno = await turnoParaModificar(db, idReserva, { idEmpresa });
  if (!["cancelada", "ausente"].includes(turno.estado) || !turno.resultado_sena || turno.resultado_sena === "sin_sena") {
    throw new ErrorHttp(400, "Ese turno no tiene una seña para resolver");
  }
  await db.query("UPDATE reservas SET resultado_sena = $1 WHERE id_reserva = $2", [resultado, idReserva]);
  return buscarTurno(db, idReserva);
};

// Registra un pago (seña o saldo). El sistema no cobra ni verifica transferencias:
// el encargado carga lo que recibió.
export const registrarPago = async (db, idReserva, idEmpresa, { tipo, medio, monto, quien }) => {
  if (!["sena", "saldo"].includes(tipo)) throw new ErrorHttp(400, "Indicá si es seña o saldo");
  if (!MEDIOS_DE_PAGO.includes(medio)) throw new ErrorHttp(400, "Indicá si fue en efectivo o por transferencia");
  const importe = Math.round(Number(monto) * 100) / 100;
  if (!(importe > 0)) throw new ErrorHttp(400, "El monto tiene que ser mayor a cero");

  const turno = await turnoParaModificar(db, idReserva, { idEmpresa });
  if (!["reservada", "confirmada", "jugada"].includes(turno.estado)) {
    throw new ErrorHttp(400, "No se pueden registrar pagos de un turno cancelado o en el que no vino");
  }
  const saldo = Number(turno.precio_total) - turno.pagado;
  if (importe > saldo) throw new ErrorHttp(400, `El monto supera lo que falta pagar (${saldo})`);

  await db.query(
    `INSERT INTO pagos (id_reserva, id_empresa, tipo, medio, monto, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [idReserva, turno.id_empresa, tipo, medio, importe, quien ?? null]
  );
  return buscarTurno(db, idReserva);
};

// Un pago cargado por error se anula (solo el dueño)
export const anularPago = async (db, idReserva, idPago, idEmpresa) => {
  if (!idValido(idPago)) throw new ErrorHttp(404, "Pago no encontrado");
  await turnoParaModificar(db, idReserva, { idEmpresa });
  const resultado = await db.query("DELETE FROM pagos WHERE id_pago = $1 AND id_reserva = $2", [idPago, idReserva]);
  if (resultado.rowCount === 0) throw new ErrorHttp(404, "Pago no encontrado");
  return buscarTurno(db, idReserva);
};
