import pool from "../data/db.js";
import { DIAS, buscarPerfil, horarioDeFecha } from "../data/perfiles.js";
import { ErrorHttp, ZONA, aMinutos, ahora, cierreEnMinutos, fechaValida, responderError } from "../utils/comun.js";

// Actividad del complejo para el dueño (entrevista, preguntas 7 y 32): qué
// canchas se ocupan más, qué horarios tienen más demanda y cuáles quedan
// vacíos, cuántos turnos se concretan, se cancelan o terminan en inasistencia.

const MAX_DIAS = 180;

const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const diasEntre = (desde, hasta) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000);

// Minutos en común entre [a1, a2) y [b1, b2)
const solapan = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);

export const obtenerReportes = async (req, res) => {
  const hoy = ahora().fecha;
  const hasta = req.query.hasta || hoy;
  const desde = req.query.desde || sumarDias(hasta, -29);
  const idEmpresa = req.empresa.id_empresa;
  try {
    if (!fechaValida(desde) || !fechaValida(hasta)) throw new ErrorHttp(400, "Las fechas no son válidas");
    if (hasta < desde) throw new ErrorHttp(400, "La fecha final tiene que ser posterior a la inicial");
    const dias = diasEntre(desde, hasta) + 1;
    if (dias > MAX_DIAS) throw new ErrorHttp(400, `El período puede ser de hasta ${MAX_DIAS} días`);

    const [perfil, canchas, turnos, cobros] = await Promise.all([
      buscarPerfil(idEmpresa),
      pool.query("SELECT id_cancha, nombre, deporte, activa FROM canchas WHERE id_empresa = $1 ORDER BY deporte, nombre", [
        idEmpresa
      ]),
      pool.query(
        `SELECT r.id_cancha, r.fecha, to_char(r.hora_inicio, 'HH24:MI') AS desde,
                CASE WHEN r.hora_fin = '24:00' THEN '24:00' ELSE to_char(r.hora_fin, 'HH24:MI') END AS hasta,
                r.estado, r.resultado_sena, r.id_partido, r.id_turno_fijo,
                (SELECT COALESCE(SUM(monto), 0) FROM pagos p WHERE p.id_reserva = r.id_reserva AND p.tipo = 'sena') AS sena_pagada
           FROM reservas r
          WHERE r.id_empresa = $1 AND r.fecha BETWEEN $2 AND $3`,
        [idEmpresa, desde, hasta]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto), 0) AS cobrado FROM pagos
          WHERE id_empresa = $1 AND (fecha_hora AT TIME ZONE $4)::date BETWEEN $2 AND $3`,
        [idEmpresa, desde, hasta, ZONA]
      )
    ]);

    const activas = canchas.rows.filter((c) => c.activa);
    // Ocupan la cancha: todo lo que no se canceló (el que no vino también la ocupó)
    const ocupan = turnos.rows.filter((t) => t.estado !== "cancelada");
    const reservas = turnos.rows.filter((t) => !t.id_partido);

    // Minutos abiertos de cada día del período, según los horarios del perfil
    const horarioDelDia = new Map();
    for (let i = 0; i < dias; i++) {
      const fecha = sumarDias(desde, i);
      const h = horarioDeFecha(perfil.horarios, fecha);
      horarioDelDia.set(fecha, h.abierto ? [aMinutos(h.abre), cierreEnMinutos(h.abre, h.cierra)] : null);
    }
    const minutosAbiertos = [...horarioDelDia.values()].reduce((t, h) => t + (h ? h[1] - h[0] : 0), 0);
    const duracion = (t) => aMinutos(t.hasta) - aMinutos(t.desde);

    // Por cancha
    const porCancha = canchas.rows.map((c) => {
      const deLaCancha = ocupan.filter((t) => t.id_cancha === c.id_cancha);
      const minutos = deLaCancha.reduce((total, t) => total + duracion(t), 0);
      return {
        id_cancha: c.id_cancha,
        nombre: c.nombre,
        deporte: c.deporte,
        activa: c.activa,
        turnos: deLaCancha.length,
        horas: Math.round((minutos / 60) * 10) / 10,
        ocupacion: porcentaje(minutos, minutosAbiertos)
      };
    });

    // Por hora del día: qué parte de las canchas activas estuvo ocupada en cada franja de una hora
    const porHora = [];
    for (let h = 0; h < 24; h++) {
      let disponibles = 0;
      let ocupados = 0;
      for (const [fecha, horario] of horarioDelDia) {
        if (!horario) continue;
        const abierto = solapan(h * 60, h * 60 + 60, horario[0], horario[1]);
        if (!abierto) continue;
        disponibles += abierto * activas.length;
        for (const t of ocupan) {
          if (t.fecha === fecha) ocupados += solapan(h * 60, h * 60 + 60, aMinutos(t.desde), aMinutos(t.hasta));
        }
      }
      if (disponibles > 0) {
        porHora.push({
          hora: `${String(h).padStart(2, "0")}:00`,
          turnos: reservas.filter((t) => t.estado !== "cancelada" && Number(t.desde.slice(0, 2)) === h).length,
          ocupacion: porcentaje(ocupados, disponibles)
        });
      }
    }

    // Por día de la semana
    const porDia = DIAS.map((dia, i) => {
      const fechas = [...horarioDelDia.keys()].filter((f) => (new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7 === i);
      const abiertos = fechas.reduce((t, f) => t + (horarioDelDia.get(f) ? horarioDelDia.get(f)[1] - horarioDelDia.get(f)[0] : 0), 0);
      const delDia = ocupan.filter((t) => fechas.includes(t.fecha));
      return {
        dia,
        turnos: delDia.filter((t) => !t.id_partido).length,
        ocupacion: porcentaje(delDia.reduce((total, t) => total + duracion(t), 0), abiertos * activas.length)
      };
    });

    const cuenta = (condicion) => reservas.filter(condicion).length;
    const minutosOcupados = ocupan.reduce((total, t) => total + duracion(t), 0);

    res.json({
      desde,
      hasta,
      dias,
      resumen: {
        turnos: cuenta((t) => t.estado !== "cancelada"),
        jugados: cuenta((t) => t.estado === "jugada"),
        ausentes: cuenta((t) => t.estado === "ausente"),
        cancelados: cuenta((t) => t.estado === "cancelada"),
        cancelaciones_tardias: cuenta((t) => t.estado === "cancelada" && t.resultado_sena === "perdida"),
        de_turnos_fijos: cuenta((t) => t.id_turno_fijo && t.estado !== "cancelada"),
        partidos_de_torneo: ocupan.filter((t) => t.id_partido).length,
        ocupacion: porcentaje(minutosOcupados, minutosAbiertos * activas.length),
        cobrado: Number(cobros.rows[0].cobrado),
        senas_perdidas: reservas
          .filter((t) => t.resultado_sena === "perdida")
          .reduce((total, t) => total + Number(t.sena_pagada), 0)
      },
      por_cancha: porCancha,
      por_hora: porHora,
      por_dia: porDia
    });
  } catch (error) {
    responderError(res, error, "Error al obtener los reportes");
  }
};
