import { ErrorHttp, aHora, aMinutos } from "../utils/comun.js";
import { cierreQueSuperpone } from "./cierres.js";

// Lógica de torneos (eliminación directa) y campeonatos (todos contra todos).
// Todas las funciones reciben "db": el pool o un cliente dentro de una transacción.

// Cuánto ocupa la cancha un partido programado
export const DURACION_PARTIDO = { futbol: 60, padel: 90 };

const mezclar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

// Ganador de un partido jugado (o del que pasa libre). null si no se jugó o empataron.
// Si un equipo no se presentó, gana el otro (regla del dueño: pierde por incomparecencia).
export const ganador = (p) => {
  if (p.id_visitante === null) return p.id_local;
  if (p.incomparecencia) return p.incomparecencia === p.id_local ? p.id_visitante : p.id_local;
  if (p.estado !== "jugado" || p.resultado_local === p.resultado_visitante) return null;
  return p.resultado_local > p.resultado_visitante ? p.id_local : p.id_visitante;
};

// Tabla de posiciones de un campeonato: 3 puntos por partido ganado, 1 por empate
export const calcularTabla = (equipos, partidos) => {
  const filas = new Map(
    equipos.map((e) => [e.id_equipo, { id_equipo: e.id_equipo, nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }])
  );
  for (const p of partidos) {
    if (p.estado !== "jugado" || p.id_visitante === null) continue;
    const local = filas.get(p.id_local);
    const visitante = filas.get(p.id_visitante);
    if (!local || !visitante) continue;
    // Incomparecencia: el que vino gana los 3 puntos; no se suman goles
    if (p.incomparecencia) {
      const [gana, pierde] = p.incomparecencia === p.id_local ? [visitante, local] : [local, visitante];
      gana.pj++; gana.pg++; gana.pts += 3;
      pierde.pj++; pierde.pp++;
      continue;
    }
    const lados = [
      [local, p.resultado_local, p.resultado_visitante],
      [visitante, p.resultado_visitante, p.resultado_local]
    ];
    for (const [fila, a_favor, en_contra] of lados) {
      fila.pj++;
      fila.gf += a_favor;
      fila.gc += en_contra;
      if (a_favor > en_contra) { fila.pg++; fila.pts += 3; }
      else if (a_favor === en_contra) { fila.pe++; fila.pts += 1; }
      else fila.pp++;
    }
  }
  return [...filas.values()]
    .map((f) => ({ ...f, dg: f.gf - f.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.nombre.localeCompare(b.nombre));
};

// Campeonato: método del círculo. Con n equipos salen n-1 fechas (n par) y en
// cada una juegan todos. Si n es impar, en cada fecha un equipo queda libre.
const fixtureLiga = (ids) => {
  const lista = ids.length % 2 ? [...ids, null] : [...ids];
  const n = lista.length;
  const partidos = [];
  for (let ronda = 1; ronda < n; ronda++) {
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === null || b === null) continue; // fecha libre
      // Se alterna quién es local para que no sea siempre el mismo
      partidos.push(ronda % 2 ? { ronda, local: a, visitante: b } : { ronda, local: b, visitante: a });
    }
    // Rota todos menos el primero
    lista.splice(1, 0, lista.pop());
  }
  return partidos;
};

// Torneo: primera ronda de la llave. Si los equipos no son potencia de 2,
// algunos pasan libres (partido sin visitante) para que la llave cierre.
const primeraRonda = (ids) => {
  let tamano = 1;
  while (tamano < ids.length) tamano *= 2;
  const cantidadLibres = tamano - ids.length;
  const libres = ids.slice(0, cantidadLibres).map((id) => ({ ronda: 1, local: id, visitante: null }));
  const reales = [];
  for (let i = cantidadLibres; i < ids.length; i += 2) {
    reales.push({ ronda: 1, local: ids[i], visitante: ids[i + 1] });
  }
  // Se intercalan para que, en la ronda 2, los que pasaron libres crucen con ganadores
  const partidos = [];
  while (libres.length || reales.length) {
    if (libres.length) partidos.push(libres.shift());
    if (reales.length) partidos.push(reales.shift());
  }
  return partidos;
};

const insertarPartidos = async (db, idTorneo, partidos) => {
  for (const p of partidos) {
    const libre = p.visitante === null;
    await db.query(
      `INSERT INTO partidos (id_torneo, ronda, id_local, id_visitante, estado)
       VALUES ($1, $2, $3, $4, $5)`,
      [idTorneo, p.ronda, p.local, p.visitante, libre ? "jugado" : "pendiente"]
    );
  }
};

// Cierra la inscripción y arma el fixture (sorteado)
export const generarFixture = async (db, torneo) => {
  if (torneo.estado !== "inscripcion") throw new ErrorHttp(400, "El fixture ya fue generado");
  const { rows } = await db.query("SELECT id_equipo FROM equipos WHERE id_torneo = $1", [torneo.id_torneo]);
  if (rows.length < 2) {
    throw new ErrorHttp(400, `Se necesitan al menos 2 ${torneo.deporte === "padel" ? "parejas inscriptas" : "equipos inscriptos"}`);
  }

  const ids = mezclar(rows.map((r) => r.id_equipo));
  const partidos = torneo.tipo === "campeonato" ? fixtureLiga(ids) : primeraRonda(ids);
  await insertarPartidos(db, torneo.id_torneo, partidos);
  await db.query("UPDATE torneos SET estado = 'en_curso' WHERE id_torneo = $1", [torneo.id_torneo]);
  await actualizarAvance(db, torneo.id_torneo);
};

// Después de cargar un resultado:
//   campeonato → si se jugaron todos los partidos, termina
//   torneo     → si se jugó toda la ronda, arma la siguiente con los ganadores (o termina si fue la final)
export const actualizarAvance = async (db, idTorneo) => {
  const { rows: [torneo] } = await db.query("SELECT * FROM torneos WHERE id_torneo = $1", [idTorneo]);
  if (!torneo || torneo.estado === "cancelado" || torneo.estado === "inscripcion") return;

  const { rows: partidos } = await db.query(
    "SELECT * FROM partidos WHERE id_torneo = $1 ORDER BY ronda, id_partido",
    [idTorneo]
  );

  let terminado;
  if (torneo.tipo === "campeonato") {
    terminado = partidos.every((p) => p.estado === "jugado");
  } else {
    const ultima = Math.max(...partidos.map((p) => p.ronda));
    const ronda = partidos.filter((p) => p.ronda === ultima);
    const ganadores = ronda.map(ganador);
    if (ganadores.some((g) => g === null)) {
      terminado = false;
    } else if (ganadores.length === 1) {
      terminado = true;
    } else {
      const siguiente = [];
      for (let i = 0; i < ganadores.length; i += 2) {
        siguiente.push({ ronda: ultima + 1, local: ganadores[i], visitante: ganadores[i + 1] });
      }
      await insertarPartidos(db, idTorneo, siguiente);
      terminado = false;
    }
  }

  await db.query("UPDATE torneos SET estado = $1 WHERE id_torneo = $2", [
    terminado ? "finalizado" : "en_curso",
    idTorneo
  ]);
};

// Inscribe un equipo controlando estado y cupo. El torneo se bloquea (FOR UPDATE)
// para que dos inscripciones simultáneas en distintos droplets no superen el cupo.
export const agregarEquipo = async (db, idTorneo, datos) => {
  const { rows: [torneo] } = await db.query("SELECT * FROM torneos WHERE id_torneo = $1 FOR UPDATE", [idTorneo]);
  if (!torneo) throw new ErrorHttp(404, "Torneo no encontrado");
  if (torneo.estado !== "inscripcion") throw new ErrorHttp(400, "La inscripción está cerrada");

  const { rows: [{ total }] } = await db.query(
    "SELECT COUNT(*)::int AS total FROM equipos WHERE id_torneo = $1",
    [idTorneo]
  );
  if (total >= torneo.cupo) throw new ErrorHttp(400, "No quedan cupos en este torneo");

  const pareja = torneo.deporte === "padel";
  const nombre = String(datos.nombre ?? "").trim().slice(0, 80);
  if (!nombre) throw new ErrorHttp(400, `El nombre de${pareja ? " la pareja" : "l equipo"} es obligatorio`);

  try {
    const { rows } = await db.query(
      `INSERT INTO equipos (id_torneo, nombre, contacto_nombre, contacto_telefono, integrantes, id_cliente)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        idTorneo,
        nombre,
        String(datos.contacto_nombre ?? "").trim().slice(0, 100) || null,
        String(datos.contacto_telefono ?? "").trim().slice(0, 30) || null,
        String(datos.integrantes ?? "").trim().slice(0, 500) || null,
        datos.id_cliente ?? null
      ]
    );
    return rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new ErrorHttp(400, `Ya hay ${pareja ? "una pareja" : "un equipo"} con ese nombre en el torneo`);
    }
    throw error;
  }
};

// Programa (o desprograma) un partido en una cancha del complejo. El partido
// queda guardado también como turno, así nadie puede reservar ese horario.
export const programarPartido = async (db, torneo, partido, { id_cancha, fecha, hora }) => {
  await db.query("DELETE FROM reservas WHERE id_partido = $1", [partido.id_partido]);

  if (!id_cancha || !fecha || !hora) {
    await db.query("UPDATE partidos SET id_cancha = NULL, fecha = NULL, hora = NULL WHERE id_partido = $1", [
      partido.id_partido
    ]);
    return;
  }

  const { rows: [cancha] } = await db.query(
    "SELECT * FROM canchas WHERE id_cancha = $1 AND id_empresa = $2",
    [id_cancha, torneo.id_empresa]
  );
  if (!cancha) throw new ErrorHttp(400, "Cancha no encontrada");
  if (cancha.deporte !== torneo.deporte) {
    throw new ErrorHttp(400, `El partido es de ${torneo.deporte === "padel" ? "pádel" : "fútbol"}: elegí una cancha de ese deporte`);
  }

  const fin = aMinutos(hora) + DURACION_PARTIDO[torneo.deporte];
  if (fin > 1440) throw new ErrorHttp(400, "El partido no puede terminar después de la medianoche");
  if (await cierreQueSuperpone(db, cancha.id_cancha, fecha, hora, aHora(fin))) {
    throw new ErrorHttp(409, "La cancha está cerrada en ese horario (lluvia o mantenimiento)");
  }

  await db.query("UPDATE partidos SET id_cancha = $1, fecha = $2, hora = $3 WHERE id_partido = $4", [
    cancha.id_cancha,
    fecha,
    hora,
    partido.id_partido
  ]);

  const { rows: nombres } = await db.query(
    "SELECT id_equipo, nombre FROM equipos WHERE id_equipo IN ($1, $2)",
    [partido.id_local, partido.id_visitante]
  );
  const nombre = (id) => nombres.find((e) => e.id_equipo === id)?.nombre ?? "?";

  await db.query(
    `INSERT INTO reservas (id_empresa, id_cancha, id_partido, contacto_nombre, fecha, hora_inicio, hora_fin,
                           precio_total, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)`,
    [
      torneo.id_empresa,
      cancha.id_cancha,
      partido.id_partido,
      `${torneo.nombre}: ${nombre(partido.id_local)} vs ${nombre(partido.id_visitante)}`.slice(0, 100),
      fecha,
      hora,
      aHora(fin),
      partido.estado === "jugado" ? "jugada" : "confirmada"
    ]
  );
};

// Todo lo que se muestra de un torneo. "privado" agrega los datos de contacto
// de los equipos (solo para el complejo organizador).
export const detalleTorneo = async (db, idTorneo, { privado = false } = {}) => {
  const { rows: [torneo] } = await db.query(
    `SELECT t.*, e.nombre AS complejo, e.direccion, e.telefono, e.activo AS empresa_activa
       FROM torneos t JOIN empresas e ON e.id_empresa = t.id_empresa
      WHERE t.id_torneo = $1`,
    [idTorneo]
  );
  if (!torneo) return null;

  const { rows: equipos } = await db.query(
    `SELECT ${privado ? "*" : "id_equipo, nombre, integrantes, id_cliente"}
       FROM equipos WHERE id_torneo = $1 ORDER BY fecha_inscripcion, id_equipo`,
    [idTorneo]
  );
  const { rows: partidos } = await db.query(
    `SELECT p.*, l.nombre AS local, v.nombre AS visitante, c.nombre AS cancha
       FROM partidos p
       JOIN equipos l ON l.id_equipo = p.id_local
       LEFT JOIN equipos v ON v.id_equipo = p.id_visitante
       LEFT JOIN canchas c ON c.id_cancha = p.id_cancha
      WHERE p.id_torneo = $1
      ORDER BY p.ronda, p.id_partido`,
    [idTorneo]
  );

  const tabla = torneo.tipo === "campeonato" ? calcularTabla(equipos, partidos) : null;

  let campeon = null;
  if (torneo.estado === "finalizado") {
    if (tabla) {
      campeon = tabla[0] ? { id_equipo: tabla[0].id_equipo, nombre: tabla[0].nombre } : null;
    } else if (partidos.length) {
      const final = partidos[partidos.length - 1];
      const id = ganador(final);
      campeon = equipos.find((e) => e.id_equipo === id) ?? null;
      if (campeon) campeon = { id_equipo: campeon.id_equipo, nombre: campeon.nombre };
    }
  }

  return { ...torneo, inscriptos: equipos.length, equipos, partidos, tabla, campeon };
};
