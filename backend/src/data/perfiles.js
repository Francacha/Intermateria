import pool from "./db.js";

// Perfil de cada complejo (tabla perfiles): descripción, servicios, horarios y redes.
export const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export const horariosPorDefecto = () =>
  Object.fromEntries(DIAS.map((dia) => [dia, { abierto: true, abre: "09:00", cierra: "23:00" }]));

// Reglas de reserva que decide el dueño (valores de la entrevista: seña del 50 %,
// 24 horas para cancelar sin perderla y precio nocturno desde las 19)
export const reglasPorDefecto = () => ({
  porcentaje_sena: 50,
  horas_cancelacion: 24,
  hora_noche: "19:00",
  datos_transferencia: ""
});

const perfilVacio = (idEmpresa) => ({
  id_empresa: idEmpresa,
  descripcion: "",
  servicios: [],
  horarios: horariosPorDefecto(),
  redes: { instagram: "", whatsapp: "" },
  reglas: reglasPorDefecto(),
  actualizado: null
});

// La fila de la tabla se devuelve con la misma forma que usa el front
const aPerfil = (fila) => ({
  id_empresa: fila.id_empresa,
  descripcion: fila.descripcion,
  servicios: fila.servicios,
  horarios: fila.horarios,
  redes: { instagram: fila.instagram, whatsapp: fila.whatsapp },
  reglas: {
    porcentaje_sena: fila.porcentaje_sena ?? 50,
    horas_cancelacion: fila.horas_cancelacion ?? 24,
    hora_noche: String(fila.hora_noche ?? "19:00").slice(0, 5),
    datos_transferencia: fila.datos_transferencia ?? ""
  },
  actualizado: fila.actualizado
});

// Si el complejo todavía no cargó su perfil se devuelve uno con valores por defecto
export const buscarPerfil = async (idEmpresa) => {
  const { rows } = await pool.query("SELECT * FROM perfiles WHERE id_empresa = $1", [idEmpresa]);
  return rows[0] ? aPerfil(rows[0]) : perfilVacio(idEmpresa);
};

export const guardarPerfil = async (idEmpresa, datos) => {
  const { rows } = await pool.query(
    `INSERT INTO perfiles (id_empresa, descripcion, servicios, horarios, instagram, whatsapp,
                           porcentaje_sena, horas_cancelacion, hora_noche, datos_transferencia, actualizado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (id_empresa) DO UPDATE SET
       descripcion = EXCLUDED.descripcion,
       servicios = EXCLUDED.servicios,
       horarios = EXCLUDED.horarios,
       instagram = EXCLUDED.instagram,
       whatsapp = EXCLUDED.whatsapp,
       porcentaje_sena = EXCLUDED.porcentaje_sena,
       horas_cancelacion = EXCLUDED.horas_cancelacion,
       hora_noche = EXCLUDED.hora_noche,
       datos_transferencia = EXCLUDED.datos_transferencia,
       actualizado = NOW()
     RETURNING *`,
    [
      idEmpresa,
      datos.descripcion,
      datos.servicios,
      JSON.stringify(datos.horarios),
      datos.redes.instagram,
      datos.redes.whatsapp,
      datos.reglas.porcentaje_sena,
      datos.reglas.horas_cancelacion,
      datos.reglas.hora_noche,
      datos.reglas.datos_transferencia
    ]
  );
  return aPerfil(rows[0]);
};

// Horario de un día concreto ("2026-10-14") según el perfil
export const horarioDeFecha = (horarios, fecha) => {
  const indice = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
  return horarios?.[DIAS[indice]] ?? { abierto: true, abre: "09:00", cierra: "23:00" };
};
