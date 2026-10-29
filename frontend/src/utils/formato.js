// Formatos y cálculos que usan varias páginas

export const pesos = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export const DEPORTE = { futbol: "Fútbol", padel: "Pádel" };
export const SUPERFICIE = { sintetico: "Sintético", cemento: "Cemento", cesped: "Césped natural", blindex: "Blindex" };

// "Fútbol 5" o "Pádel"
export const tipoDeCancha = (cancha) =>
  cancha.deporte === "futbol" && cancha.jugadores ? `Fútbol ${cancha.jugadores}` : DEPORTE[cancha.deporte];

// "Sintético · Techada" / "Cemento · Al aire libre"
export const detalleDeCancha = (cancha) =>
  [cancha.superficie && (SUPERFICIE[cancha.superficie] ?? capitalizar(cancha.superficie)), cancha.techada ? "Techada" : "Al aire libre"]
    .filter(Boolean)
    .join(" · ");

export const TIPO_TORNEO = { torneo: "Torneo", campeonato: "Campeonato" };
// Un solo nombre para cada formato, en filtros, listas y detalle
export const FORMATO = { torneo: "Eliminación directa", campeonato: "Todos contra todos" };
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
  ausente: "No vino",
  cancelada: "Cancelada"
};

// Qué pasó con la seña de un turno cancelado o en el que no vinieron
export const RESULTADO_SENA = {
  sin_sena: "Sin seña",
  perdida: "Seña perdida",
  a_resolver: "Seña a resolver",
  devuelta: "Seña devuelta",
  a_favor: "Seña a favor"
};

export const MEDIO_PAGO = { transferencia: "Transferencia", efectivo: "Efectivo" };

// Duración de cada turno según el deporte (regla del complejo)
export const DURACION_TURNO = { futbol: 60, padel: 90 };

// Mismo cálculo que la API: de día rige precio_hora y desde la hora de noche
// rige precio_hora_noche. Si el turno cruza ese horario, cada parte paga su tarifa.
export const precioTurno = (cancha, inicio, horaNoche = "19:00") => {
  const desde = aMinutos(inicio);
  const hasta = desde + DURACION_TURNO[cancha.deporte];
  const dia = Number(cancha.precio_hora);
  const noche = cancha.precio_hora_noche == null ? dia : Number(cancha.precio_hora_noche);
  const minutosNoche = Math.max(0, hasta - Math.max(desde, aMinutos(horaNoche)));
  return Math.round((dia * (hasta - desde - minutosNoche) + noche * minutosNoche) / 60);
};

// "$30.000 la hora" o "$30.000 la hora · $36.000 de noche"
export const textoPrecio = (cancha) =>
  cancha.precio_hora_noche != null && Number(cancha.precio_hora_noche) !== Number(cancha.precio_hora)
    ? `${pesos(cancha.precio_hora)} la hora · ${pesos(cancha.precio_hora_noche)} de noche`
    : `${pesos(cancha.precio_hora)} la hora`;

// Días de la semana como los guarda la API (1 = lunes)
export const DIA_SEMANA = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo" };

// "2026-10-14" → 3 (miércoles)
export const diaDeLaSemana = (fecha) => ((new Date(`${fecha}T12:00:00`).getDay() + 6) % 7) + 1;

// Horas que faltan para un turno (negativo si ya empezó)
export const horasHasta = (fecha, hora) => (new Date(`${fecha}T${hora.slice(0, 5)}:00`) - new Date()) / 3600000;

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

// Los próximos n días desde hoy, en formato ISO
export const proximosDias = (n) => Array.from({ length: n }, (_, i) => sumarDias(hoyISO(), i));

// Días que faltan desde hoy hasta una fecha (negativo si ya pasó)
export const diasHasta = (fecha) =>
  Math.round((Date.parse(`${fecha.slice(0, 10)}T12:00:00`) - Date.parse(`${hoyISO()}T12:00:00`)) / 86400000);

// "Empieza hoy", "Empieza mañana", "Empieza en 4 días" (solo las próximas dos semanas)
export const cuandoEmpieza = (fecha) => {
  const dias = diasHasta(fecha);
  if (dias < 0 || dias > 13) return "";
  if (dias === 0) return "Empieza hoy";
  if (dias === 1) return "Empieza mañana";
  return `Empieza en ${dias} días`;
};

// "Hoy", "Mañana" o "vie 16"
export const etiquetaDia = (fecha) => {
  if (fecha === hoyISO()) return "Hoy";
  if (fecha === sumarDias(hoyISO(), 1)) return "Mañana";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }).replace(",", "");
};

// "hoy", "mañana" o "el domingo 18", para usar dentro de una frase
export const cuandoEs = (fecha) => {
  if (fecha === hoyISO()) return "hoy";
  if (fecha === sumarDias(hoyISO(), 1)) return "mañana";
  return `el ${new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric" }).replace(",", "")}`;
};

// Franjas del día para filtrar horarios (en minutos desde las 00:00)
export const FRANJAS = [
  { id: "manana", nombre: "De mañana", desde: 0, hasta: 13 * 60 },
  { id: "tarde", nombre: "De tarde", desde: 13 * 60, hasta: 19 * 60 },
  { id: "noche", nombre: "De noche", desde: 19 * 60, hasta: 24 * 60 }
];

// Hoy: la franja en curso. Otro día: la tarde.
export const franjaPorDefecto = (fecha) => {
  if (fecha !== hoyISO()) return "tarde";
  const ahora = new Date().getHours() * 60 + new Date().getMinutes();
  return FRANJAS.find((f) => ahora < f.hasta)?.id ?? "noche";
};

export const enFranja = (horaTexto, franja) => {
  const f = FRANJAS.find((x) => x.id === franja);
  const m = aMinutos(horaTexto);
  return !f || (m >= f.desde && m < f.hasta);
};

// 90 → "1 h 30"
export const duracionTexto = (minutos) =>
  minutos % 60 === 0 ? `${minutos / 60} h` : `${Math.floor(minutos / 60)} h ${minutos % 60}`;

export const hora = (h) => (h ? h.slice(0, 5) : "");

export const aMinutos = (h) => {
  const [hh, mm] = h.slice(0, 5).split(":").map(Number);
  return hh * 60 + mm;
};

export const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Duración del turno que se ofrece por defecto según el deporte
export const duracionPorDefecto = (deporte) => (deporte === "padel" ? 90 : 60);

// Horarios posibles de un día (cada media hora entre la apertura y el cierre),
// marcando libres los que no pasaron y no chocan con otro turno.
// disponibilidad: { horario: { abierto, abre, cierra }, ocupados: [{ desde, hasta }] }
export const horariosDelDia = (disponibilidad, fecha, duracion) => {
  const horarios = [];
  if (!disponibilidad?.horario.abierto) return horarios;
  const { abre, cierra } = disponibilidad.horario;
  const inicio = aMinutos(abre);
  let fin = aMinutos(cierra);
  if (fin <= inicio) fin = 1440;
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const ocupados = disponibilidad.ocupados.map((o) => [aMinutos(o.desde), aMinutos(o.hasta)]);
  for (let m = Math.ceil(inicio / 30) * 30; m + duracion <= fin; m += 30) {
    const pasado = fecha === hoyISO() && m <= minutosAhora;
    const choca = ocupados.some(([desde, hasta]) => m < hasta && m + duracion > desde);
    horarios.push({ hora: aHora(m), libre: !pasado && !choca });
  }
  return horarios;
};

export const capitalizar = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// Nombre de cada ronda de una llave de eliminación ("Final", "Semifinal"...)
export const nombreRonda = (ronda, totalRondas, tipo) => {
  if (tipo === "campeonato") return `Fecha ${ronda}`;
  const faltan = totalRondas - ronda;
  return ["Final", "Semifinal", "Cuartos de final", "Octavos de final"][faltan] ?? `Ronda ${ronda}`;
};

// Cantidad de rondas de una llave para n equipos
export const rondasDeLlave = (equipos) => Math.max(1, Math.ceil(Math.log2(Math.max(2, equipos))));

// CUIT: va poniendo los guiones mientras se escribe ("30123" → "30-123", hasta "30-12345678-1")
export const formatearCuit = (texto) => {
  const d = String(texto ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
};

// CUIT válido: 11 dígitos y dígito verificador correcto (módulo 11, igual que el backend)
export const cuitValido = (texto) => {
  const d = String(texto ?? "").replace(/\D/g, "");
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const resto = 11 - (pesos.reduce((total, peso, i) => total + peso * Number(d[i]), 0) % 11);
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(d[10]);
};
