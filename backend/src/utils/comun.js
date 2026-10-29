// Utilidades compartidas por los controladores

// Error con código HTTP: los controladores lo lanzan y responderError lo traduce
export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export const responderError = (res, error, porDefecto) => {
  if (error instanceof ErrorHttp) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  // Violación del EXCLUDE de reservas: dos turnos superpuestos en la misma cancha
  if (error.code === "23P01") {
    return res.status(409).json({ mensaje: "La cancha ya está ocupada en ese horario" });
  }
  if (error.code === "23505") {
    return res.status(400).json({ mensaje: "Ese registro ya existe" });
  }
  console.error(error);
  res.status(500).json({ mensaje: porDefecto });
};

// Un id que no es un número entero no puede existir en ninguna tabla
export const idValido = (id) => /^\d+$/.test(String(id ?? ""));

export const DEPORTES = ["futbol", "padel"];

// Los droplets corren en UTC; "hoy" y "ahora" se calculan en la hora de Argentina
export const ZONA = process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires";

export const ahora = () => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
};

export const fechaValida = (fecha) =>
  /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "") && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`));

export const horaValida = (hora) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? "");

// "18:30" ⇄ 1110 minutos. 1440 se escribe "24:00" (PostgreSQL lo acepta como medianoche)
export const aMinutos = (hora) => {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

export const aHora = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

// Horario de cierre en minutos: "00:00" o un cierre anterior a la apertura = medianoche
export const cierreEnMinutos = (abre, cierra) => {
  const fin = aMinutos(cierra);
  return fin <= aMinutos(abre) ? 1440 : fin;
};

// CUIT argentino: 11 dígitos con dígito verificador (módulo 11). Devuelve "30-12345678-1" o null si no es válido.
export const normalizarCuit = (valor) => {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  if (digitos.length !== 11) return null;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, i) => total + peso * Number(digitos[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;
  if (verificador === 10 || verificador !== Number(digitos[10])) return null;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos[10]}`;
};

// Duración de cada turno según el deporte (regla del complejo: fútbol 1 hora, pádel 1 hora y media)
export const DURACION_TURNO = { futbol: 60, padel: 90 };

// Importe de un turno: de día rige precio_hora y desde la hora de "noche" del
// complejo rige precio_hora_noche. Un turno que cruza ese horario paga cada
// parte a su tarifa. inicio y fin en minutos.
export const precioTurno = (cancha, inicio, fin, horaNoche = "19:00") => {
  const dia = Number(cancha.precio_hora);
  const noche = cancha.precio_hora_noche == null ? dia : Number(cancha.precio_hora_noche);
  const minutosNoche = Math.max(0, fin - Math.max(inicio, aMinutos(horaNoche)));
  const minutosDia = fin - inicio - minutosNoche;
  return Math.round((dia * minutosDia + noche * minutosNoche) / 60);
};

// Minutos que faltan para que empiece un turno (negativo si ya empezó), en hora de Argentina
export const minutosHasta = (fecha, hora) => {
  const hoy = ahora();
  const dias = (Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoy.fecha}T00:00:00Z`)) / 86400000;
  return dias * 1440 + aMinutos(hora) - aMinutos(hoy.hora);
};

// Qué pasa con la seña cuando se cancela un turno (regla del dueño):
//   - sin seña pagada: no hay nada que resolver
//   - cancela el complejo (lluvia, cierre): el jugador no la pierde, se resuelve con él
//   - cancela el jugador con menos de "horas" de anticipación: la pierde
//   - cancela con tiempo: se coordina con el encargado
export const resultadoDeSena = ({ senaPagada, porElComplejo, minutosAntes, horas }) => {
  if (!(Number(senaPagada) > 0)) return "sin_sena";
  if (porElComplejo) return "a_resolver";
  return minutosAntes < horas * 60 ? "perdida" : "a_resolver";
};
