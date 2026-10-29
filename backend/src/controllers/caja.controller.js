import pool from "../data/db.js";
import { CONSULTA_TURNOS } from "../data/turnos.js";
import { ErrorHttp, ZONA, ahora, fechaValida, responderError } from "../utils/comun.js";

// Caja de un día (entrevista, pregunta 18): cuánto se cobró, separando las
// señas de turnos nuevos de los saldos de los turnos que se jugaron, qué saldos
// quedan por cobrar, qué señas faltan y quiénes vinieron o faltaron.
// No controla la cuenta bancaria: muestra lo que registraron los encargados.
export const obtenerCaja = async (req, res) => {
  const fecha = req.query.fecha || ahora().fecha;
  const idEmpresa = req.empresa.id_empresa;
  try {
    if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");

    const [pagos, delDia, senasPendientes, aResolver] = await Promise.all([
      pool.query(
        `SELECT p.id_pago, p.tipo, p.medio, p.monto, p.registrado_por,
                to_char(p.fecha_hora AT TIME ZONE $3, 'HH24:MI') AS hora,
                r.id_reserva, r.fecha, r.hora_inicio, c.nombre AS cancha, c.deporte,
                COALESCE(cl.nombre || ' ' || cl.apellido, r.contacto_nombre) AS cliente
           FROM pagos p
           JOIN reservas r ON r.id_reserva = p.id_reserva
           JOIN canchas c ON c.id_cancha = r.id_cancha
           LEFT JOIN clientes cl ON cl.id_cliente = r.id_cliente
          WHERE p.id_empresa = $1 AND (p.fecha_hora AT TIME ZONE $3)::date = $2
          ORDER BY p.fecha_hora`,
        [idEmpresa, fecha, ZONA]
      ),
      // Turnos de ese día (sin los partidos de torneos)
      pool.query(
        `${CONSULTA_TURNOS} WHERE r.id_empresa = $1 AND r.fecha = $2 AND r.id_partido IS NULL
          ORDER BY r.hora_inicio, c.nombre`,
        [idEmpresa, fecha]
      ),
      // Turnos de los próximos 7 días que todavía no tienen la seña completa
      pool.query(
        `SELECT * FROM (${CONSULTA_TURNOS} WHERE r.id_empresa = $1 AND r.fecha BETWEEN $2 AND $2::date + 7
                          AND r.id_partido IS NULL AND r.estado IN ('reservada', 'confirmada')) t
          WHERE t.sena_pagada < t.sena_requerida
          ORDER BY t.fecha, t.hora_inicio LIMIT 50`,
        [idEmpresa, fecha]
      ),
      // Señas de turnos cancelados a tiempo que hay que devolver o dejar a favor
      pool.query(
        `${CONSULTA_TURNOS} WHERE r.id_empresa = $1 AND r.resultado_sena = 'a_resolver'
          ORDER BY r.fecha DESC, r.hora_inicio LIMIT 50`,
        [idEmpresa]
      )
    ]);

    const suma = (lista) => lista.reduce((total, p) => total + Number(p.monto), 0);
    const filtro = (campo, valor) => pagos.rows.filter((p) => p[campo] === valor);
    const turnos = delDia.rows;
    const cuenta = (estado) => turnos.filter((t) => t.estado === estado).length;

    res.json({
      fecha,
      totales: {
        cobrado: suma(pagos.rows),
        efectivo: suma(filtro("medio", "efectivo")),
        transferencia: suma(filtro("medio", "transferencia")),
        senas: suma(filtro("tipo", "sena")),
        saldos: suma(filtro("tipo", "saldo")),
        // Señas que el complejo se queda porque cancelaron tarde o no vinieron
        senas_perdidas: turnos
          .filter((t) => t.resultado_sena === "perdida")
          .reduce((total, t) => total + Number(t.sena_pagada), 0),
        por_cobrar: turnos
          .filter((t) => ["reservada", "confirmada", "jugada"].includes(t.estado))
          .reduce((total, t) => total + Number(t.saldo), 0)
      },
      asistencia: {
        turnos: turnos.filter((t) => t.estado !== "cancelada").length,
        jugados: cuenta("jugada"),
        ausentes: cuenta("ausente"),
        cancelados: cuenta("cancelada"),
        sin_marcar: cuenta("reservada") + cuenta("confirmada")
      },
      pagos: pagos.rows,
      saldos_pendientes: turnos.filter(
        (t) => ["reservada", "confirmada", "jugada"].includes(t.estado) && Number(t.saldo) > 0
      ),
      ausentes: turnos.filter((t) => t.estado === "ausente"),
      senas_pendientes: senasPendientes.rows,
      senas_a_resolver: aResolver.rows
    });
  } catch (error) {
    responderError(res, error, "Error al obtener la caja");
  }
};
