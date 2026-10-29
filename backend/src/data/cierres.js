// Cierres de canchas (lluvia, mantenimiento). Un cierre va de "desde" a "hasta"
// (fecha y hora, puede durar varios días) y mientras dure la cancha no se puede reservar.

// Datos de un cierre listos para el front: fechas y horas como texto
export const COLUMNAS_CIERRE = `
  ci.id_cierre, ci.id_cancha, ci.motivo, ci.detalle, ci.registrado_por, ci.creado_en,
  to_char(ci.desde, 'YYYY-MM-DD"T"HH24:MI') AS desde,
  to_char(ci.hasta, 'YYYY-MM-DD"T"HH24:MI') AS hasta`;

// ¿Hay un cierre que se superpone con ese horario de esa cancha?
export const cierreQueSuperpone = async (db, idCancha, fecha, horaInicio, horaFin) => {
  const { rows } = await db.query(
    `SELECT id_cierre FROM cierres
      WHERE id_cancha = $1
        AND tsrange(desde, hasta) && tsrange($2::date + $3::time, $2::date + $4::time)
      LIMIT 1`,
    [idCancha, fecha, horaInicio, horaFin]
  );
  return rows[0] ?? null;
};

// Parte de cada cierre que cae en un día, como horarios ocupados { id_cancha, desde, hasta } ("24:00" = medianoche).
// Se suman a los turnos para armar la grilla de horarios libres.
export const ocupadosPorCierres = async (db, fecha, idCancha = null) => {
  const { rows } = await db.query(
    `SELECT id_cancha,
            CASE WHEN desde <= $1::date THEN '00:00' ELSE to_char(desde, 'HH24:MI') END AS desde,
            CASE WHEN hasta >= $1::date + 1 THEN '24:00' ELSE to_char(hasta, 'HH24:MI') END AS hasta
       FROM cierres
      WHERE tsrange(desde, hasta) && tsrange($1::date, $1::date + 1)
        AND ($2::int IS NULL OR id_cancha = $2)`,
    [fecha, idCancha]
  );
  return rows;
};
