// Formatos y cálculos que usan varias páginas

export const pesos = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export const DEPORTE = { futbol: "Fútbol", padel: "Pádel" };
export const TIPO_TORNEO = { torneo: "Torneo", campeonato: "Campeonato" };
export const ESTADO_TORNEO = {
  inscripcion: "Inscripción abierta",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado"
};
export const ESTADO_TURNO = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  jugada: "Jugada",
  cancelada: "Cancelada"
};

// "2026-10-14" de hoy en la hora local del navegador
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "mié 14/10"
export const fechaCorta = (fecha) =>
  fecha
    ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : "";

// "miércoles 14 de octubre"
export const fechaLarga = (fecha) =>
  fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "";

export const hora = (h) => (h ? h.slice(0, 5) : "");

export const aMinutos = (h) => {
  const [hh, mm] = h.slice(0, 5).split(":").map(Number);
  return hh * 60 + mm;
};

export const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const capitalizar = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// Nombre de cada ronda de una llave de eliminación ("Final", "Semifinal"...)
export const nombreRonda = (ronda, totalRondas, tipo) => {
  if (tipo === "campeonato") return `Fecha ${ronda}`;
  const faltan = totalRondas - ronda;
  return ["Final", "Semifinal", "Cuartos de final", "Octavos de final"][faltan] ?? `Ronda ${ronda}`;
};

// Cantidad de rondas de una llave para n equipos
export const rondasDeLlave = (equipos) => Math.max(1, Math.ceil(Math.log2(Math.max(2, equipos))));
