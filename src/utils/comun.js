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
const ZONA = process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires";

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
