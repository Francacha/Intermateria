import { ErrorHttp, aHora, aMinutos } from "../utils/comun.js";
import { cierreQueSuperpone } from "./cierres.js";

// Lógica de torneos (eliminación directa), campeonatos (todos contra todos) y
// torneos con fase de grupos (todos contra todos en cada grupo y después llave).
// Todas las funciones reciben "db": el pool o un cliente dentro de una transacción.

// Cuánto ocupa la cancha un partido programado
export const DURACION_PARTIDO = { futbol: 60, padel: 90 };

// Nombres de los grupos (hasta 8)
export const LETRAS = "ABCDEFGH";

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

// Ordena dos filas de tabla de grupos distintos: primero el de más puntos
const mejorFila = (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;

// Tabla de cada grupo (solo los grupos que tienen equipos)
export const tablasDeGrupos = (torneo, equipos, partidos) =>
  [...LETRAS.slice(0, torneo.cantidad_grupos)]
    .map((grupo) => ({
      grupo,
      tabla: calcularTabla(
        equipos.filter((e) => e.grupo === grupo),
        partidos.filter((p) => p.grupo === grupo)
      )
    }))
    .filter((g) => g.tabla.length > 0);

// Campeonato o grupo: método del círculo. Con n equipos salen n-1 fechas (n par) y en
// cada una juegan todos. Si n es impar, en cada fecha un equipo queda libre.
// Ida y vuelta: se repiten las fechas con la localía invertida.
const fixtureLiga = (ids, { idaVuelta = false, grupo = null } = {}) => {
  const lista = ids.length % 2 ? [...ids, null] : [...ids];
  const n = lista.length;
  const partidos = [];
  for (let ronda = 1; ronda < n; ronda++) {
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === null || b === null) continue; // fecha libre
      // Se alterna quién es local para que no sea siempre el mismo
      partidos.push(ronda % 2 ? { ronda, grupo, local: a, visitante: b } : { ronda, grupo, local: b, visitante: a });
    }
    // Rota todos menos el primero
    lista.splice(1, 0, lista.pop());
  }
  if (!idaVuelta) return partidos;
  const vuelta = partidos.map((p) => ({ ronda: p.ronda + n - 1, grupo, local: p.visitante, visitante: p.local }));
  return [...partidos, ...vuelta];
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

// Llave armada con los clasificados de los grupos, ya ordenados del mejor al peor.
// Cruce clásico: el 1° contra el último, el 2° contra el anteúltimo... y en el orden
// de la llave el 1° y el 2° quedan en mitades distintas (solo se cruzan en la final).
// Si no son potencia de 2, los mejores pasan libres a la ronda siguiente.
const llaveDeClasificados = (clasificados) => {
  let orden = [1];
  while (orden.length < clasificados.length) orden = orden.flatMap((s) => [s, orden.length * 2 + 1 - s]);
  const partidos = [];
  for (let i = 0; i < orden.length; i += 2) {
    partidos.push({ ronda: 1, local: clasificados[orden[i] - 1], visitante: clasificados[orden[i + 1] - 1] ?? null });
  }
  // Dos del mismo grupo no se cruzan en la primera ronda: se intercambian rivales
  const grupo = (c) => c?.grupo;
  for (const p of partidos) {
    if (!p.visitante || grupo(p.local) !== grupo(p.visitante)) continue;
    const otro = partidos.find(
      (q) => q !== p && q.visitante && grupo(q.local) !== grupo(p.visitante) && grupo(p.local) !== grupo(q.visitante)
    );
    if (otro) [p.visitante, otro.visitante] = [otro.visitante, p.visitante];
  }
  return partidos.map((p) => ({ ...p, local: p.local.id_equipo, visitante: p.visitante?.id_equipo ?? null }));
};

const insertarPartidos = async (db, idTorneo, partidos) => {
  for (const p of partidos) {
    const libre = p.visitante === null;
    await db.query(
      `INSERT INTO partidos (id_torneo, ronda, grupo, id_local, id_visitante, estado)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [idTorneo, p.ronda, p.grupo ?? null, p.local, p.visitante, libre ? "jugado" : "pendiente"]
    );
  }
};

const palabraEquipos = (torneo) => (torneo.deporte === "padel" ? "parejas" : "equipos");

// Sortea todos los inscriptos en los grupos, parejos (los grupos quedan de igual
// tamaño o con uno de diferencia). Pisa lo que se haya asignado a mano.
export const sortearGrupos = async (db, torneo) => {
  if (torneo.tipo !== "grupos") throw new ErrorHttp(400, "Este torneo no tiene fase de grupos");
  if (torneo.estado !== "inscripcion") throw new ErrorHttp(400, "Los grupos ya están armados");
  const { rows } = await db.query("SELECT id_equipo FROM equipos WHERE id_torneo = $1", [torneo.id_torneo]);
  const ids = mezclar(rows.map((r) => r.id_equipo));
  for (const [i, id] of ids.entries()) {
    await db.query("UPDATE equipos SET grupo = $1 WHERE id_equipo = $2", [LETRAS[i % torneo.cantidad_grupos], id]);
  }
};

// Pone a mano un equipo en un grupo (null = sin grupo, se sortea al armar el fixture)
export const asignarGrupo = async (db, torneo, idEquipo, grupo) => {
  if (torneo.tipo !== "grupos") throw new ErrorHttp(400, "Este torneo no tiene fase de grupos");
  if (torneo.estado !== "inscripcion") throw new ErrorHttp(400, "Con el fixture armado ya no se pueden cambiar los grupos");
  if (grupo !== null && !LETRAS.slice(0, torneo.cantidad_grupos).includes(grupo)) {
    throw new ErrorHttp(400, "Ese grupo no existe en este torneo");
  }
  const resultado = await db.query("UPDATE equipos SET grupo = $1 WHERE id_equipo = $2 AND id_torneo = $3", [
    grupo,
    idEquipo,
    torneo.id_torneo
  ]);
  if (resultado.rowCount === 0) throw new ErrorHttp(404, "Equipo no encontrado");
};

// Fase de grupos: completa los grupos con los que quedaron sin asignar (cada uno
// va al grupo con menos equipos), controla que alcancen y arma un fixture por grupo
const fixtureGrupos = async (db, torneo, equipos) => {
  const letras = [...LETRAS.slice(0, torneo.cantidad_grupos)];
  const grupos = new Map(letras.map((l) => [l, []]));
  const sinGrupo = [];
  for (const e of equipos) {
    if (grupos.has(e.grupo)) grupos.get(e.grupo).push(e.id_equipo);
    else sinGrupo.push(e.id_equipo);
  }
  for (const id of mezclar(sinGrupo)) {
    const menor = letras.reduce((a, b) => (grupos.get(b).length < grupos.get(a).length ? b : a));
    grupos.get(menor).push(id);
    await db.query("UPDATE equipos SET grupo = $1 WHERE id_equipo = $2", [menor, id]);
  }

  const pasan = torneo.clasifican_por_grupo;
  for (const [letra, ids] of grupos) {
    if (ids.length <= pasan) {
      throw new ErrorHttp(
        400,
        `El grupo ${letra} tiene ${ids.length} ${ids.length === 1 ? palabraEquipos(torneo).slice(0, -1) : palabraEquipos(torneo)}: ` +
          `si pasan ${pasan} por grupo, cada grupo necesita al menos ${pasan + 1}. Mové ${palabraEquipos(torneo)} de grupo o editá el formato.`
      );
    }
  }
  return letras.flatMap((letra) => fixtureLiga(mezclar(grupos.get(letra)), { idaVuelta: torneo.ida_vuelta, grupo: letra }));
};

// Cierra la inscripción y arma el fixture (sorteado)
export const generarFixture = async (db, torneo) => {
  if (torneo.estado !== "inscripcion") throw new ErrorHttp(400, "El fixture ya fue generado");
  const { rows } = await db.query("SELECT id_equipo, grupo FROM equipos WHERE id_torneo = $1", [torneo.id_torneo]);
  if (rows.length < 2) {
    throw new ErrorHttp(400, `Se necesitan al menos 2 ${torneo.deporte === "padel" ? "parejas inscriptas" : "equipos inscriptos"}`);
  }

  const ids = mezclar(rows.map((r) => r.id_equipo));
  let partidos;
  if (torneo.tipo === "grupos") partidos = await fixtureGrupos(db, torneo, rows);
  else if (torneo.tipo === "campeonato") partidos = fixtureLiga(ids, { idaVuelta: torneo.ida_vuelta });
  else partidos = primeraRonda(ids);
  await insertarPartidos(db, torneo.id_torneo, partidos);
  await db.query("UPDATE torneos SET estado = 'en_curso' WHERE id_torneo = $1", [torneo.id_torneo]);
  await actualizarAvance(db, torneo.id_torneo);
};

// Fase de grupos terminada: pasan los mejores de cada grupo a la llave. Lo pide el
// complejo (no se arma solo con el último resultado) para que pueda revisar y
// corregir los resultados de los grupos antes de cerrarlos.
export const armarLlave = async (db, torneo) => {
  if (torneo.tipo !== "grupos") throw new ErrorHttp(400, "Este torneo no tiene fase de grupos");
  if (torneo.estado !== "en_curso") throw new ErrorHttp(400, "El torneo no está en curso");

  const { rows: partidos } = await db.query("SELECT * FROM partidos WHERE id_torneo = $1", [torneo.id_torneo]);
  if (partidos.some((p) => p.grupo === null)) throw new ErrorHttp(400, "La llave ya está armada");
  const faltan = partidos.filter((p) => p.estado !== "jugado").length;
  if (faltan > 0) {
    throw new ErrorHttp(400, `Faltan ${faltan} ${faltan === 1 ? "partido" : "partidos"} de la fase de grupos`);
  }

  const { rows: equipos } = await db.query("SELECT id_equipo, nombre, grupo FROM equipos WHERE id_torneo = $1", [
    torneo.id_torneo
  ]);
  const grupos = tablasDeGrupos(torneo, equipos, partidos);
  // Primero todos los 1°, después los 2°...; entre los del mismo puesto, el de mejor campaña
  const clasificados = [];
  for (let puesto = 0; puesto < torneo.clasifican_por_grupo; puesto++) {
    const delPuesto = grupos.map((g) => g.tabla[puesto] && { ...g.tabla[puesto], grupo: g.grupo }).filter(Boolean);
    clasificados.push(...delPuesto.sort(mejorFila));
  }
  await insertarPartidos(db, torneo.id_torneo, llaveDeClasificados(clasificados));
  await actualizarAvance(db, torneo.id_torneo);
};

// Llave: si se jugó toda la ronda, arma la siguiente con los ganadores.
// Devuelve true si la ronda jugada era la final.
const avanzarLlave = async (db, idTorneo, partidos) => {
  const ultima = Math.max(...partidos.map((p) => p.ronda));
  const ronda = partidos.filter((p) => p.ronda === ultima);
  const ganadores = ronda.map(ganador);
  if (ganadores.some((g) => g === null)) return false;
  if (ganadores.length === 1) return true;
  const siguiente = [];
  for (let i = 0; i < ganadores.length; i += 2) {
    siguiente.push({ ronda: ultima + 1, local: ganadores[i], visitante: ganadores[i + 1] });
  }
  await insertarPartidos(db, idTorneo, siguiente);
  return false;
};

// Después de cargar un resultado:
//   campeonato → si se jugaron todos los partidos, termina
//   torneo     → si se jugó toda la ronda, arma la siguiente con los ganadores (o termina si fue la final)
//   grupos     → durante los grupos no avanza solo (ver armarLlave); con la llave armada, igual que torneo
export const actualizarAvance = async (db, idTorneo) => {
  const { rows: [torneo] } = await db.query("SELECT * FROM torneos WHERE id_torneo = $1", [idTorneo]);
  if (!torneo || torneo.estado === "cancelado" || torneo.estado === "inscripcion") return;

  const { rows: partidos } = await db.query(
    "SELECT * FROM partidos WHERE id_torneo = $1 ORDER BY ronda, id_partido",
    [idTorneo]
  );
  const llave = partidos.filter((p) => p.grupo === null);

  let terminado;
  if (torneo.tipo === "campeonato") {
    terminado = partidos.every((p) => p.estado === "jugado");
  } else if (llave.length === 0) {
    terminado = false;
  } else {
    terminado = await avanzarLlave(db, idTorneo, llave);
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
    `SELECT ${privado ? "*" : "id_equipo, nombre, integrantes, id_cliente, grupo"}
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
      ORDER BY p.grupo IS NULL, p.ronda, p.grupo, p.id_partido`,
    [idTorneo]
  );
  // Partidos de eliminación directa (en un torneo con grupos, los que vienen después)
  const llave = partidos.filter((p) => p.grupo === null);

  const tabla = torneo.tipo === "campeonato" ? calcularTabla(equipos, partidos) : null;
  const grupos = torneo.tipo === "grupos" ? tablasDeGrupos(torneo, equipos, partidos) : null;

  let campeon = null;
  if (torneo.estado === "finalizado") {
    if (tabla) {
      campeon = tabla[0] ? { id_equipo: tabla[0].id_equipo, nombre: tabla[0].nombre } : null;
    } else if (llave.length) {
      const final = llave[llave.length - 1];
      const id = ganador(final);
      campeon = equipos.find((e) => e.id_equipo === id) ?? null;
      if (campeon) campeon = { id_equipo: campeon.id_equipo, nombre: campeon.nombre };
    }
  }

  return { ...torneo, inscriptos: equipos.length, equipos, partidos, tabla, grupos, campeon };
};
