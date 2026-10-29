import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ReservaModal from "../components/ReservaModal";
import { TarjetaTorneo } from "../components/Torneo";
import { obtenerComplejo } from "../service/publicoService";
import { mensajeDeError } from "../service/api";
import { DEPORTE, DURACION_TURNO, capitalizar, duracionTexto, pesos } from "../utils/formato";

const DIAS = [
  ["lunes", "Lunes"], ["martes", "Martes"], ["miercoles", "Miércoles"], ["jueves", "Jueves"],
  ["viernes", "Viernes"], ["sabado", "Sábado"], ["domingo", "Domingo"]
];

// Ficha pública de un complejo: canchas para reservar, horarios y torneos
export default function ComplejoDetalle() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [complejo, setComplejo] = useState(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    obtenerComplejo(id)
      .then(({ data }) => setComplejo(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar el complejo")));
  }, [id]);

  if (error) {
    return (
      <main className="contenedor panel">
        <p className="alerta">{error}</p>
        <Link to="/complejos">← Volver a los complejos</Link>
      </main>
    );
  }
  if (!complejo) return <main className="contenedor panel"><p className="texto-suave">Cargando...</p></main>;

  // La cancha a reservar va en la URL (?cancha=4) para poder compartir el link;
  // desde el inicio también llegan el día y la hora tocados (&fecha=2026-10-15&hora=21:30)
  const canchaElegida = complejo.canchas.find((c) => String(c.id_cancha) === params.get("cancha"));
  const abrirReserva = (cancha) => setParams({ cancha: cancha.id_cancha });
  const cerrarReserva = () => setParams({});

  const deportes = [...new Set(complejo.canchas.map((c) => c.deporte))];
  const visibles = filtro ? complejo.canchas.filter((c) => c.deporte === filtro) : complejo.canchas;
  const { perfil } = complejo;

  return (
    <main className="contenedor panel">
      <Link to="/complejos" className="volver">← Todos los complejos</Link>
      <div className="panel-cabecera">
        <span className="etiqueta">Complejo</span>
        <h1>{complejo.nombre}</h1>
        <p className="texto-suave">
          {[complejo.direccion, complejo.telefono].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="detalle-grilla">
        <section>
          <div className="barra">
            <h2 className="seccion-titulo sin-margen">Canchas</h2>
            {deportes.length > 1 && (
              <div className="segmentado">
                {[["", "Todas"], ...deportes.map((d) => [d, DEPORTE[d]])].map(([valor, nombre]) => (
                  <button key={valor} className={filtro === valor ? "activo" : ""} onClick={() => setFiltro(valor)}>
                    {nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          {complejo.canchas.length === 0 && <p className="tarjeta vacio">Este complejo todavía no tiene canchas disponibles.</p>}
          <div className="grilla-canchas">
            {visibles.map((cancha) => (
              <article key={cancha.id_cancha} className={`tarjeta cancha cancha-${cancha.deporte}`}>
                <div className="cancha-franja" aria-hidden="true" />
                <div className="cancha-cuerpo">
                  <div className="cancha-titulo">
                    <h3>{cancha.nombre}</h3>
                    <span className={`insignia insignia-${cancha.deporte}`}>
                      {cancha.deporte === "padel" ? "Pádel" : `Fútbol ${cancha.jugadores ?? ""}`}
                    </span>
                  </div>
                  <ul className="cancha-datos">
                    <li>{cancha.superficie ? capitalizar(cancha.superficie) : "Sin superficie"}</li>
                    <li>{cancha.techada ? "Techada" : "Al aire libre"}</li>
                  </ul>
                  <div className="cancha-pie">
                    <span className="precios-cancha">
                      <span className="precio">{pesos(cancha.precio_hora)}<small>/hora</small></span>
                      {cancha.precio_hora_noche != null && Number(cancha.precio_hora_noche) !== Number(cancha.precio_hora) && (
                        <small className="texto-suave">
                          {pesos(cancha.precio_hora_noche)}/hora desde las {perfil.reglas?.hora_noche ?? "19:00"}
                        </small>
                      )}
                      <small className="texto-suave">Turnos de {duracionTexto(DURACION_TURNO[cancha.deporte])}</small>
                    </span>
                    <button className="boton" onClick={() => abrirReserva(cancha)}>Reservar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {complejo.torneos.length > 0 && (
            <>
              <h2 className="seccion-titulo con-margen">Torneos y campeonatos</h2>
              <div className="grilla-torneos">
                {complejo.torneos.map((t) => (
                  <TarjetaTorneo key={t.id_torneo} torneo={t} enlace={`/torneos/${t.id_torneo}`} />
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="tarjeta lateral">
          {perfil.descripcion && <p>{perfil.descripcion}</p>}
          {perfil.servicios.length > 0 && (
            <>
              <span className="campo-titulo">Servicios</span>
              <div className="chips chips-chicos">
                {perfil.servicios.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </>
          )}
          <span className="campo-titulo">Horarios</span>
          <ul className="lista-horarios">
            {DIAS.map(([dia, nombre]) => {
              const h = perfil.horarios[dia];
              return (
                <li key={dia}>
                  <span>{nombre}</span>
                  <span className={h.abierto ? "" : "texto-suave"}>{h.abierto ? `${h.abre} a ${h.cierra}` : "Cerrado"}</span>
                </li>
              );
            })}
          </ul>
          {perfil.reglas && (
            <>
              <span className="campo-titulo">Condiciones de reserva</span>
              <ul className="lista-condiciones">
                {perfil.reglas.porcentaje_sena > 0 && (
                  <li>Seña del {perfil.reglas.porcentaje_sena} % por transferencia para confirmar el turno.</li>
                )}
                <li>El resto se paga en el complejo, en efectivo o por transferencia.</li>
                <li>Si cancelás con menos de {perfil.reglas.horas_cancelacion} horas de anticipación, perdés la seña.</li>
                <li>Fútbol: turnos de 1 hora. Pádel: turnos de 1 h 30.</li>
              </ul>
            </>
          )}
          {(perfil.redes.instagram || perfil.redes.whatsapp) && (
            <>
              <span className="campo-titulo">Contacto</span>
              {perfil.redes.instagram && <p className="sin-margen">Instagram: {perfil.redes.instagram}</p>}
              {perfil.redes.whatsapp && <p className="sin-margen">WhatsApp: {perfil.redes.whatsapp}</p>}
            </>
          )}
        </aside>
      </div>

      {canchaElegida && (
        <ReservaModal
          key={`${canchaElegida.id_cancha}-${params.get("fecha")}-${params.get("hora")}`}
          cancha={canchaElegida}
          complejo={complejo.nombre}
          fechaInicial={params.get("fecha")}
          horaInicial={params.get("hora")}
          onCerrar={cerrarReserva}
        />
      )}
    </main>
  );
}
