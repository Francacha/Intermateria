import { Link } from "react-router-dom";
import {
  DEPORTE,
  ESTADO_TORNEO,
  FORMATO,
  capitalizar,
  detalleFormato,
  cuandoEmpieza,
  diasHasta,
  fechaCorta,
  fechaLarga,
  hora,
  nombreRonda,
  pesos,
  rondasDelTorneo
} from "../utils/formato";

// Piezas para mostrar torneos y campeonatos (las usan las páginas públicas y el panel)

export function EstadoTorneo({ estado }) {
  return <span className={`insignia estado-${estado}`}>{ESTADO_TORNEO[estado]}</span>;
}

// Renglón de un torneo para las listas (inicio y página de torneos).
// detallado suma dirección, fechas, premio y precio por pareja/equipo.
export function FilaTorneo({ torneo, detallado = false }) {
  const inicio = new Date(`${torneo.fecha_inicio.slice(0, 10)}T12:00:00`);
  const parte = (opcion) => inicio.toLocaleDateString("es-AR", opcion).replace(".", "");
  const pareja = torneo.deporte === "padel";
  const quienes = pareja ? "parejas" : "equipos";
  const lugares = torneo.cupo - torneo.inscriptos;
  const abierto = torneo.estado === "inscripcion";
  const cobra = Number(torneo.precio_inscripcion) > 0;
  const precio = cobra ? pesos(torneo.precio_inscripcion) : "Gratis";
  const pocos = abierto && lugares > 0 && lugares <= 2;
  // La cuenta regresiva solo sirve si todavía hay lugar; a 3 días o menos se resalta
  const empieza = abierto && lugares > 0 ? cuandoEmpieza(torneo.fecha_inicio) : "";
  const pronto = empieza && diasHasta(torneo.fecha_inicio) <= 3;
  const textoCupo = lugares <= 0
    ? "Cupo completo"
    : pocos
      ? lugares === 1 ? "Queda 1 lugar" : "Quedan 2 lugares"
      : `Quedan ${lugares} de ${torneo.cupo} ${quienes}`;
  // El lector de pantalla escucha una frase completa en vez de "vie16oct..."
  const descripcion = [
    torneo.nombre,
    `${DEPORTE[torneo.deporte]}, ${FORMATO[torneo.tipo].toLowerCase()}${torneo.categoria ? `, ${torneo.categoria}` : ""}`,
    `Empieza el ${fechaLarga(torneo.fecha_inicio.slice(0, 10))}`,
    torneo.complejo,
    abierto ? textoCupo : ESTADO_TORNEO[torneo.estado],
    abierto && `Inscripción ${precio === "Gratis" ? "gratis" : `${precio} por ${pareja ? "pareja" : "equipo"}`}`
  ]
    .filter(Boolean)
    .join(". ");
  const hasta = torneo.fecha_fin
    ? new Date(`${torneo.fecha_fin.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "")
    : "";

  return (
    <li>
      <Link
        to={`/torneos/${torneo.id_torneo}`}
        className={`renglon renglon-enlace renglon-${torneo.deporte}`}
        aria-label={descripcion}
      >
        <span className="fecha-torneo">
          <span>{parte({ weekday: "short" })}</span>
          <strong>{parte({ day: "numeric" })}</strong>
          <span>{parte({ month: "short" })}</span>
        </span>
        <div className="renglon-info">
          <strong className="renglon-nombre">{torneo.nombre}</strong>
          <span className="texto-suave">
            {DEPORTE[torneo.deporte]} · {FORMATO[torneo.tipo]}
            {torneo.categoria && ` · ${torneo.categoria}`}
            {!detallado && ` · ${torneo.complejo}`}
          </span>
          {detallado && (
            <span className="texto-suave">
              {torneo.complejo}
              {torneo.direccion && <span className="renglon-direccion"> · {torneo.direccion}</span>}
              {hasta && ` · hasta el ${hasta}`}
            </span>
          )}
          {empieza && <span className={`renglon-cuando ${pronto ? "pronto" : ""}`}>{empieza}</span>}
          {detallado && torneo.premio && <span className="renglon-premio">Premio: {torneo.premio}</span>}
        </div>
        <div className="cupo">
          {abierto ? (
            <>
              {/* Un casillero por equipo; con cupos grandes, una barra proporcional */}
              {torneo.cupo <= 16 ? (
                <span className="cupo-lugares" aria-hidden="true">
                  {Array.from({ length: torneo.cupo }, (_, i) => (
                    <span key={i} className={i < torneo.inscriptos ? "ocupado" : ""} />
                  ))}
                </span>
              ) : (
                <span className="cupo-barra" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (torneo.inscriptos / torneo.cupo) * 100)}%` }} />
                </span>
              )}
              <span className={`cupo-texto ${lugares > 0 ? "" : "cupo-lleno"} ${pocos ? "cupo-pocos" : ""}`}>
                {textoCupo}
                {!detallado && ` · ${precio}`}
              </span>
            </>
          ) : (
            <>
              <EstadoTorneo estado={torneo.estado} />
              <span className="cupo-texto">{torneo.inscriptos} {quienes}</span>
            </>
          )}
          {detallado && abierto && (
            <span className="cupo-precio">
              {precio}
              {cobra && <small> por {pareja ? "pareja" : "equipo"}</small>}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

export function TarjetaTorneo({ torneo, enlace, mostrarComplejo = false }) {
  const lleno = torneo.inscriptos >= torneo.cupo;
  return (
    <Link to={enlace} className={`tarjeta torneo-tarjeta torneo-${torneo.deporte}`}>
      <div className="torneo-tarjeta-cabecera">
        <span className={`insignia insignia-${torneo.deporte}`}>
          {FORMATO[torneo.tipo]} · {DEPORTE[torneo.deporte]}
        </span>
        <EstadoTorneo estado={torneo.estado} />
      </div>
      <h3>{torneo.nombre}</h3>
      {mostrarComplejo && torneo.complejo && <p className="texto-suave sin-margen">{torneo.complejo}</p>}
      <ul className="cancha-datos">
        <li>Desde {fechaCorta(torneo.fecha_inicio)}</li>
        {torneo.categoria && <li>{torneo.categoria}</li>}
      </ul>
      <div className="cancha-pie">
        <span className={lleno && torneo.estado === "inscripcion" ? "alerta-texto" : "texto-suave"}>
          {torneo.inscriptos}/{torneo.cupo} {torneo.deporte === "padel" ? "parejas" : "equipos"}
        </span>
        <strong>{Number(torneo.precio_inscripcion) > 0 ? pesos(torneo.precio_inscripcion) : "Gratis"}</strong>
      </div>
    </Link>
  );
}

export function Campeon({ campeon }) {
  if (!campeon) return null;
  return (
    <div className="campeon">
      <span aria-hidden="true">🏆</span>
      <div>
        <small>Campeón</small>
        <strong>{campeon.nombre}</strong>
      </div>
    </div>
  );
}

// clasifican: en un grupo, cuántos de arriba pasan a la llave (se marcan)
export function TablaPosiciones({ tabla, clasifican = 0 }) {
  if (!tabla?.length) return null;
  return (
    <div className="tarjeta tabla-contenedor">
      <table className="tabla tabla-posiciones">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th title="Puntos">Pts</th>
            <th title="Partidos jugados">PJ</th>
            <th title="Ganados">G</th>
            <th title="Empatados">E</th>
            <th title="Perdidos">P</th>
            <th title="A favor">GF</th>
            <th title="En contra">GC</th>
            <th title="Diferencia">DG</th>
          </tr>
        </thead>
        <tbody>
          {tabla.map((fila, i) => (
            <tr key={fila.id_equipo} className={i < clasifican ? "clasifica" : undefined}>
              <td>{i + 1}{i < clasifican && <span className="solo-lectores"> (pasa a la llave)</span>}</td>
              <td><strong>{fila.nombre}</strong></td>
              <td><strong>{fila.pts}</strong></td>
              <td>{fila.pj}</td>
              <td>{fila.pg}</td>
              <td>{fila.pe}</td>
              <td>{fila.pp}</td>
              <td>{fila.gf}</td>
              <td>{fila.gc}</td>
              <td>{fila.dg > 0 ? `+${fila.dg}` : fila.dg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Partido de solo lectura
export function Partido({ partido }) {
  if (partido.id_visitante === null) {
    return (
      <div className="partido partido-libre">
        <span className="partido-equipo">{partido.local}</span>
        <span className="texto-suave">pasa libre</span>
      </div>
    );
  }
  const jugado = partido.estado === "jugado";
  const gana = (lado) =>
    jugado &&
    (lado === "local"
      ? partido.resultado_local > partido.resultado_visitante
      : partido.resultado_visitante > partido.resultado_local);
  return (
    <div className="partido">
      <span className={`partido-equipo ${gana("local") ? "ganador" : ""}`}>{partido.local}</span>
      <span className="partido-resultado">
        {jugado ? `${partido.resultado_local} - ${partido.resultado_visitante}` : "vs"}
      </span>
      <span className={`partido-equipo derecha ${gana("visitante") ? "ganador" : ""}`}>{partido.visitante}</span>
      <span className="partido-programa">
        {partido.fecha ? `${capitalizar(fechaCorta(partido.fecha))} ${hora(partido.hora)} · ${partido.cancha ?? ""}` : "A programar"}
      </span>
    </div>
  );
}

// Los equipos que no juegan en una fecha de todos contra todos (con cantidad impar, uno por fecha)
const libresDeLaFecha = (equipos, partidos) =>
  equipos ? equipos.filter((e) => !partidos.some((p) => p.id_local === e.id_equipo || p.id_visitante === e.id_equipo)) : [];

const SIN_FIXTURE = {
  torneo: "La llave se sortea cuando se cierra la inscripción.",
  campeonato: "El fixture se arma cuando se cierra la inscripción.",
  grupos: "Los grupos y sus partidos se arman cuando se cierra la inscripción."
};

// Partidos agrupados por fecha (todos contra todos) o ronda (llave).
// liga: los partidos son de todos contra todos (un campeonato o un grupo) y
// equipos son los que juegan, para mostrar quién queda libre en cada fecha.
export function Fixture({
  torneo,
  partidos = torneo.partidos,
  liga = torneo.tipo === "campeonato",
  equipos = torneo.equipos,
  renderPartido = (p) => <Partido partido={p} />
}) {
  if (!partidos.length) return <p className="tablero tablero-estado">{SIN_FIXTURE[torneo.tipo]}</p>;
  const rondas = [...new Set(partidos.map((p) => p.ronda))];
  const total = rondasDelTorneo(torneo);
  return (
    <div className="fixture">
      {rondas.map((ronda) => (
        <section key={ronda} className="tarjeta ronda">
          <h3>{nombreRonda(ronda, total, liga ? "campeonato" : "torneo")}</h3>
          {partidos
            .filter((p) => p.ronda === ronda)
            .map((p) => (
              <div key={p.id_partido}>{renderPartido(p)}</div>
            ))}
          {libresDeLaFecha(liga && equipos, partidos.filter((p) => p.ronda === ronda)).map((e) => (
            <div key={e.id_equipo} className="partido partido-libre">
              <span className="partido-equipo">{e.nombre}</span>
              <span className="texto-suave">libre esta fecha</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// Fase de grupos: por cada grupo, su tabla (marcando los que pasan) y sus partidos
export function FaseDeGrupos({ torneo, renderPartido }) {
  return (
    <div className="fase-grupos">
      {torneo.grupos.map(({ grupo, tabla }) => (
        <section key={grupo} className="grupo" aria-labelledby={`grupo-${grupo}`}>
          <h3 className="grupo-titulo" id={`grupo-${grupo}`}>Grupo {grupo}</h3>
          <TablaPosiciones tabla={tabla} clasifican={torneo.clasifican_por_grupo} />
          <Fixture
            torneo={torneo}
            partidos={torneo.partidos.filter((p) => p.grupo === grupo)}
            liga
            equipos={torneo.equipos.filter((e) => e.grupo === grupo)}
            renderPartido={renderPartido}
          />
        </section>
      ))}
    </div>
  );
}

// Datos generales del torneo
export function InfoTorneo({ torneo }) {
  return (
    <ul className="info-torneo">
      <li><small>Formato</small>{detalleFormato(torneo)}</li>
      {(torneo.direccion || torneo.telefono) && (
        <li className="info-donde">
          <small>Dónde</small>
          {torneo.direccion && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(torneo.direccion)}`}
              target="_blank"
              rel="noreferrer"
            >
              {torneo.direccion}
            </a>
          )}
          {torneo.telefono && (
            <a href={`tel:${torneo.telefono.replace(/[^\d+]/g, "")}`}>{torneo.telefono}</a>
          )}
        </li>
      )}
      <li><small>Deporte</small>{DEPORTE[torneo.deporte]}{torneo.categoria ? ` · ${torneo.categoria}` : ""}</li>
      <li>
        <small>{torneo.fecha_fin ? "Fechas" : "Empieza"}</small>
        {capitalizar(fechaLarga(torneo.fecha_inicio.slice(0, 10)))}
        {torneo.fecha_fin ? ` al ${fechaLarga(torneo.fecha_fin.slice(0, 10))}` : ""}
      </li>
      <li>
        <small>Inscriptos</small>
        {torneo.inscriptos} de {torneo.cupo} {torneo.deporte === "padel" ? "parejas" : "equipos"}
      </li>
      <li>
        <small>Inscripción</small>
        {Number(torneo.precio_inscripcion) > 0
          ? `${pesos(torneo.precio_inscripcion)} por ${torneo.deporte === "padel" ? "pareja" : "equipo"}`
          : "Gratis"}
      </li>
      {torneo.premio && <li><small>Premio</small>{torneo.premio}</li>}
    </ul>
  );
}
