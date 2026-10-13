import { Link } from "react-router-dom";
import {
  DEPORTE,
  ESTADO_TORNEO,
  TIPO_TORNEO,
  fechaCorta,
  hora,
  nombreRonda,
  pesos,
  rondasDeLlave
} from "../utils/formato";

// Piezas para mostrar torneos y campeonatos (las usan las páginas públicas y el panel)

export function EstadoTorneo({ estado }) {
  return <span className={`insignia estado-${estado}`}>{ESTADO_TORNEO[estado]}</span>;
}

export function TarjetaTorneo({ torneo, enlace, mostrarComplejo = false }) {
  const lleno = torneo.inscriptos >= torneo.cupo;
  return (
    <Link to={enlace} className={`tarjeta torneo-tarjeta torneo-${torneo.deporte}`}>
      <div className="torneo-tarjeta-cabecera">
        <span className={`insignia insignia-${torneo.deporte}`}>
          {TIPO_TORNEO[torneo.tipo]} · {DEPORTE[torneo.deporte]}
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

export function TablaPosiciones({ tabla }) {
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
            <tr key={fila.id_equipo}>
              <td>{i + 1}</td>
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
        {partido.fecha ? `${fechaCorta(partido.fecha)} ${hora(partido.hora)} · ${partido.cancha ?? ""}` : "A programar"}
      </span>
    </div>
  );
}

// Partidos agrupados por fecha (campeonato) o ronda (torneo)
export function Fixture({ torneo, renderPartido = (p) => <Partido partido={p} /> }) {
  if (!torneo.partidos.length) {
    return <p className="tarjeta vacio">El fixture se arma cuando se cierra la inscripción.</p>;
  }
  const rondas = [...new Set(torneo.partidos.map((p) => p.ronda))];
  const total = rondasDeLlave(torneo.equipos.length);
  return (
    <div className="fixture">
      {rondas.map((ronda) => (
        <section key={ronda} className="tarjeta ronda">
          <h3>{nombreRonda(ronda, total, torneo.tipo)}</h3>
          {torneo.partidos
            .filter((p) => p.ronda === ronda)
            .map((p) => (
              <div key={p.id_partido}>{renderPartido(p)}</div>
            ))}
        </section>
      ))}
    </div>
  );
}

// Datos generales del torneo
export function InfoTorneo({ torneo }) {
  return (
    <ul className="info-torneo">
      <li><small>Formato</small>{torneo.tipo === "torneo" ? "Eliminación directa" : "Todos contra todos"}</li>
      <li><small>Deporte</small>{DEPORTE[torneo.deporte]}{torneo.categoria ? ` · ${torneo.categoria}` : ""}</li>
      <li>
        <small>Fechas</small>
        {fechaCorta(torneo.fecha_inicio)}
        {torneo.fecha_fin ? ` al ${fechaCorta(torneo.fecha_fin)}` : ""}
      </li>
      <li><small>Inscriptos</small>{torneo.inscriptos} de {torneo.cupo}</li>
      <li><small>Inscripción</small>{Number(torneo.precio_inscripcion) > 0 ? pesos(torneo.precio_inscripcion) : "Gratis"}</li>
      {torneo.premio && <li><small>Premio</small>{torneo.premio}</li>}
    </ul>
  );
}
