import pool from "./db.js";

// Perfil de cada complejo (tabla perfiles): descripción, servicios, horarios y redes.
export const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export const horariosPorDefecto = () =>
  Object.fromEntries(DIAS.map((dia) => [dia, { abierto: true, abre: "09:00", cierra: "23:00" }]));

const perfilVacio = (idEmpresa) => ({
  id_empresa: idEmpresa,
  descripcion: "",
  servicios: [],
  horarios: horariosPorDefecto(),
  redes: { instagram: "", whatsapp: "" },
  actualizado: null
});

// La fila de la tabla se devuelve con la misma forma que usa el front
const aPerfil = (fila) => ({
  id_empresa: fila.id_empresa,
  descripcion: fila.descripcion,
  servicios: fila.servicios,
  horarios: fila.horarios,
  redes: { instagram: fila.instagram, whatsapp: fila.whatsapp },
  actualizado: fila.actualizado
});

// Si el complejo todavía no cargó su perfil se devuelve uno con valores por defecto
export const buscarPerfil = async (idEmpresa) => {
  const { rows } = await pool.query("SELECT * FROM perfiles WHERE id_empresa = $1", [idEmpresa]);
  return rows[0] ? aPerfil(rows[0]) : perfilVacio(idEmpresa);
};

export const guardarPerfil = async (idEmpresa, datos) => {
  const { rows } = await pool.query(
    `INSERT INTO perfiles (id_empresa, descripcion, servicios, horarios, instagram, whatsapp, actualizado)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id_empresa) DO UPDATE SET
       descripcion = EXCLUDED.descripcion,
       servicios = EXCLUDED.servicios,
       horarios = EXCLUDED.horarios,
       instagram = EXCLUDED.instagram,
       whatsapp = EXCLUDED.whatsapp,
       actualizado = NOW()
     RETURNING *`,
    [
      idEmpresa,
      datos.descripcion,
      datos.servicios,
      JSON.stringify(datos.horarios),
      datos.redes.instagram,
      datos.redes.whatsapp
    ]
  );
  return aPerfil(rows[0]);
};

// Horario de un día concreto ("2026-10-14") según el perfil
export const horarioDeFecha = (horarios, fecha) => {
  const indice = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
  return horarios?.[DIAS[indice]] ?? { abierto: true, abre: "09:00", cierra: "23:00" };
};
