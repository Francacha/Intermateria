import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cargando, ConError } from "../components/Estados";
import { FilaTorneo } from "../components/Torneo";
import HorariosLibres from "../components/HorariosLibres";
import Icono from "../components/Icono";
import { useAuth } from "../context/auth";
import { mensajeDeError } from "../service/api";
import { obtenerMisReservas } from "../service/clienteService";
import { obtenerTurnos } from "../service/complejoService";
import { obtenerComplejos, obtenerHorariosLibres, obtenerTorneosPublicos } from "../service/publicoService";
import useCarga from "../service/useCarga";
import { DEPORTE, fechaCorta, fechaLarga, hora, hoyISO, pesos, sumarDias, textoPrecio, tipoDeCancha } from "../utils/formato";

const CANCHAS_EN_TABLERO = 6;

const turnosDeHoy = () => obtenerTurnos(hoyISO());

// Página de inicio. Jugadores y visitantes: lo que hay para jugar y los torneos abiertos.
// Empresa: su día primero. Visitantes: además, la propuesta para complejos.
export default function Inicio() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const complejos = useCarga(obtenerComplejos, "No pudimos consultar los complejos.");
  const reservas = useCarga(obtenerMisReservas, "No pudimos traer tus turnos.", rol === "cliente");

  return (
    <main className="inicio">
      {rol === "empresa" ? (
        <HoyEnTuComplejo empresa={usuario} />
      ) : (
        <Hero rol={rol} complejos={complejos.datos} />
      )}
      {rol === "cliente" && <MisProximosTurnos reservas={reservas} />}
      <TurnosLibres complejos={complejos} rol={rol} />
      <TorneosAbiertos />
      {rol === "cliente" && <VolverAJugar reservas={reservas.datos} />}
      {!usuario && <BandaComplejos />}
    </main>
  );
}

function Hero({ rol, complejos }) {
  const canchas = (complejos ?? []).flatMap((c) => c.canchas);
  const deFutbol = canchas.filter((c) => c.deporte === "futbol").length;
  const dePadel = canchas.length - deFutbol;
  const canchasDe = (n) => `${n} ${n === 1 ? "cancha" : "canchas"}`;

  return (
    <section className="hero">
      <div className="contenedor hero-interno">
        <div className="hero-texto">
          <h1>
            Reservá tu cancha de <span className="resaltado-padel">pádel</span> y{" "}
            <span className="resaltado-futbol">fútbol</span>, en un solo lugar
          </h1>
          <p className="hero-bajada">
            Todos los complejos, sus turnos libres y sus torneos. Y si tenés un
            complejo, administrá todo desde tu panel.
          </p>
          <div className="hero-acciones">
            {rol === "admin" && <Link to="/admin" className="boton boton-grande">Gestionar empresas</Link>}
            {rol !== "admin" && (
              <>
                <Link to="/complejos" className="boton boton-grande">Buscar cancha</Link>
                {rol === "cliente" ? (
                  <Link to="/mis-reservas" className="boton boton-grande boton-secundario">Mis reservas</Link>
                ) : (
                  <Link to="/torneos" className="boton boton-grande boton-secundario">Ver torneos</Link>
                )}
              </>
            )}
          </div>
          {/* Lugar reservado para que el hero no salte de alto cuando llegan los datos */}
          <p className="hero-oferta">
            {canchas.length > 0 && (
              <>
                <span>{complejos.length} {complejos.length === 1 ? "complejo" : "complejos"}</span>
                <span className="hero-oferta-deporte">
                  <span className="mini-dibujo mini-futbol" aria-hidden="true" /> {canchasDe(deFutbol)} de fútbol
                </span>
                <span className="hero-oferta-deporte">
                  <span className="mini-dibujo mini-padel" aria-hidden="true" /> {canchasDe(dePadel)} de pádel
                </span>
              </>
            )}
          </p>
        </div>

        {/* Dos canchas vistas desde arriba, del mismo tamaño: los dos deportes pesan igual */}
        <div className="hero-canchas" aria-hidden="true">
          <div className="dibujo dibujo-futbol">
            <span className="linea-media" />
            <span className="circulo-central" />
            <span className="area area-izq" />
            <span className="area area-der" />
          </div>
          <div className="dibujo dibujo-padel">
            <span className="red" />
            <span className="servicio servicio-izq" />
            <span className="servicio servicio-der" />
            <span className="linea-central" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CabeceraSeccion({ id, titulo, bajada, enlace, textoEnlace, nivel = 2 }) {
  const Titulo = `h${nivel}`;
  return (
    <div className="seccion-cabecera">
      <div>
        <Titulo id={id} className="seccion-titulo">{titulo}</Titulo>
        {bajada && <p className="texto-suave">{bajada}</p>}
      </div>
      {enlace && (
        <Link to={enlace} className="enlace-flecha">
          {textoEnlace} <Icono nombre="flecha" tamano={18} />
        </Link>
      )}
    </div>
  );
}

// Toma canchas de los dos deportes alternadas, para que el tablero no quede todo de uno
function elegirCanchas(complejos, cantidad) {
  const porDeporte = { futbol: [], padel: [] };
  complejos.forEach((complejo) =>
    complejo.canchas.forEach((cancha) =>
      porDeporte[cancha.deporte]?.push({ ...cancha, id_empresa: complejo.id_empresa, complejo: complejo.nombre })
    )
  );
  const elegidas = [];
  for (let i = 0; elegidas.length < cantidad && i < Math.max(porDeporte.futbol.length, porDeporte.padel.length); i++) {
    if (porDeporte.futbol[i]) elegidas.push(porDeporte.futbol[i]);
    if (porDeporte.padel[i] && elegidas.length < cantidad) elegidas.push(porDeporte.padel[i]);
  }
  return elegidas;
}

function TurnosLibres({ complejos, rol }) {
  const [tablero, setTablero] = useState(null);
  const [errorTablero, setErrorTablero] = useState("");
  const lista = complejos.datos;

  useEffect(() => {
    if (!lista) return;
    let vigente = true;
    const canchas = elegirCanchas(lista, CANCHAS_EN_TABLERO);
    // Una sola consulta trae la disponibilidad de todas las canchas del día
    const consultar = async (fecha) => {
      const horarios = await obtenerHorariosLibres(canchas, fecha);
      return canchas.map((cancha) => ({ ...cancha, ...horarios.get(cancha.id_cancha) }));
    };
    const sinLibres = (filas) => filas.every((f) => f.libres.length === 0);

    (async () => {
      try {
        let fecha = hoyISO();
        let filas = await consultar(fecha);
        // Si hoy ya no queda nada (por ejemplo, de noche), se muestra mañana
        if (filas.length > 0 && sinLibres(filas)) {
          fecha = sumarDias(fecha, 1);
          filas = await consultar(fecha);
        }
        if (vigente) setTablero({ fecha, filas, completo: filas.length > 0 && sinLibres(filas) });
      } catch (err) {
        if (vigente) setErrorTablero(mensajeDeError(err, "No pudimos consultar los turnos libres."));
      }
    })();
    return () => {
      vigente = false;
    };
  }, [lista]);

  const reintentar = () => {
    setErrorTablero("");
    setTablero(null);
    complejos.reintentar();
  };

  const paraEmpresa = rol === "empresa";
  const cuando = tablero && tablero.fecha !== hoyISO() ? "mañana" : "hoy";
  const titulo = paraEmpresa ? "Así ven los jugadores los turnos libres" : `Turnos libres ${cuando}`;
  const bajada = !tablero
    ? "Lo que queda para jugar en cada cancha."
    : paraEmpresa
      ? `${capitalizarFecha(tablero.fecha)}. Los horarios de los complejos tal como aparecen en el sitio.`
      : `${capitalizarFecha(tablero.fecha)}. Tocá un horario para reservarlo.`;
  const falla = complejos.error || errorTablero;

  return (
    <section className="contenedor seccion" aria-labelledby="titulo-turnos">
      <CabeceraSeccion
        id="titulo-turnos"
        titulo={titulo}
        bajada={bajada}
        enlace="/complejos"
        textoEnlace="Ver todos los complejos"
      />

      {falla ? (
        <ConError mensaje={falla} onReintentar={reintentar} />
      ) : !tablero ? (
        <Cargando filas={4} etiqueta="Cargando turnos libres" conHorarios />
      ) : tablero.filas.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>Todavía no hay complejos con canchas para reservar.</p>
        </div>
      ) : tablero.completo ? (
        <div className="tablero tablero-estado">
          <p>Estas canchas ya no tienen horarios libres hoy ni mañana. Probá otro día o mirá el resto de los complejos.</p>
          <Link className="boton boton-fantasma" to="/complejos">Ver todos los complejos</Link>
        </div>
      ) : (
        <ul className="tablero">
          {tablero.filas.map((cancha) => (
            <FilaCancha key={cancha.id_cancha} cancha={cancha} fecha={tablero.fecha} />
          ))}
        </ul>
      )}

      {!rol && (
        <p className="nota-cuenta">
          Para reservar necesitás una cuenta de jugador. <Link to="/registro-cliente">Crear cuenta</Link> o{" "}
          <Link to="/ingresar">ingresar</Link>.
        </p>
      )}
    </section>
  );
}

const capitalizarFecha = (fecha) => {
  const texto = fechaLarga(fecha);
  return texto ? texto[0].toUpperCase() + texto.slice(1) : "";
};

function FilaCancha({ cancha, fecha }) {
  return (
    <li className={`renglon renglon-${cancha.deporte}`}>
      <span className={`mini-dibujo mini-${cancha.deporte}`} aria-hidden="true" />
      <div className="renglon-info">
        <strong>{cancha.nombre}</strong>
        <span className="texto-suave">
          {cancha.complejo} · {tipoDeCancha(cancha)} · {textoPrecio(cancha)}
        </span>
      </div>
      <HorariosLibres cancha={cancha} idEmpresa={cancha.id_empresa} fecha={fecha} libres={cancha.libres} cerrado={cancha.cerrado} />
    </li>
  );
}

function TorneosAbiertos() {
  const { datos, error, reintentar } = useCarga(obtenerTorneosPublicos, "No pudimos consultar los torneos.");
  // Los que todavía tienen lugar, del más próximo al más lejano
  const torneos = datos
    ?.filter((t) => t.estado === "inscripcion" && t.inscriptos < t.cupo)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .slice(0, 3);

  return (
    <section className="contenedor seccion" aria-labelledby="titulo-torneos">
      <CabeceraSeccion
        id="titulo-torneos"
        titulo="Torneos con inscripción abierta"
        bajada="Anotá a tu equipo de fútbol o a tu pareja de pádel."
        enlace="/torneos"
        textoEnlace="Ver todos los torneos"
      />

      {error ? (
        <ConError mensaje={error} onReintentar={reintentar} />
      ) : !torneos ? (
        <Cargando filas={2} etiqueta="Cargando torneos" />
      ) : torneos.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>Ningún complejo tiene inscripciones abiertas ahora. Los torneos en curso se pueden seguir igual.</p>
          <Link className="boton boton-fantasma" to="/torneos">Ver torneos en curso</Link>
        </div>
      ) : (
        <ul className="tablero">
          {torneos.map((t) => (
            <FilaTorneo key={t.id_torneo} torneo={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

// "Fútbol 1" ya dice el deporte; "Cancha central" no
const nombreConDeporte = (cancha, deporte) =>
  cancha.toLowerCase().includes(DEPORTE[deporte].toLowerCase()) ? cancha : `${cancha} · ${DEPORTE[deporte]}`;

// Cliente: sus próximos turnos arriba de todo
function MisProximosTurnos({ reservas }) {
  const hoy = hoyISO();
  const turnos = reservas.datos
    ?.filter((r) => r.fecha.slice(0, 10) >= hoy && ["reservada", "confirmada"].includes(r.estado))
    .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
    .slice(0, 3);

  return (
    <section className="contenedor seccion" aria-labelledby="titulo-mis-turnos">
      <CabeceraSeccion
        id="titulo-mis-turnos"
        titulo="Tus próximos turnos"
        enlace="/mis-reservas"
        textoEnlace="Ver mis reservas"
      />
      {reservas.error ? (
        <ConError mensaje={reservas.error} onReintentar={reservas.reintentar} />
      ) : !turnos ? (
        <Cargando filas={1} etiqueta="Cargando tus turnos" />
      ) : turnos.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>No tenés turnos reservados. Elegí un horario libre acá abajo.</p>
        </div>
      ) : (
        <ul className="tablero">
          {turnos.map((r) => (
            <li key={r.id_reserva} className={`renglon renglon-${r.deporte}`}>
              <span className="fecha-turno">
                <strong>{hora(r.hora_inicio)}</strong>
                <span>{fechaCorta(r.fecha.slice(0, 10))}</span>
              </span>
              <div className="renglon-info">
                <strong>{nombreConDeporte(r.cancha, r.deporte)}</strong>
                <span className="texto-suave">{r.complejo}{r.direccion ? ` · ${r.direccion}` : ""}</span>
              </div>
              <span className={`insignia turno-${r.estado}`}>{r.estado === "confirmada" ? "Confirmado" : "Reservado"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Cliente: cierre de la página con el último complejo donde jugó
function VolverAJugar({ reservas }) {
  const ultima = reservas
    ?.slice()
    .sort((a, b) => (b.fecha + b.hora_inicio).localeCompare(a.fecha + a.hora_inicio))[0];
  if (!ultima) return null;

  return (
    <section className="contenedor seccion">
      <Link to={`/complejos/${ultima.id_empresa}`} className={`volver-a-jugar renglon-${ultima.deporte}`}>
        <span className={`mini-dibujo mini-${ultima.deporte}`} aria-hidden="true" />
        <span>
          <strong>Volvé a jugar en {ultima.complejo}</strong>
          <span className="texto-suave">Mirá sus horarios libres de esta semana.</span>
        </span>
        <Icono nombre="flecha" />
      </Link>
    </section>
  );
}

// Empresa: su día, en lugar del hero para jugadores
function HoyEnTuComplejo({ empresa }) {
  const { datos: turnos, error, reintentar } = useCarga(turnosDeHoy, "No pudimos traer los turnos de hoy.");

  const activos = (turnos ?? []).filter((t) => t.estado !== "cancelada");
  const porConfirmar = activos.filter((t) => t.estado === "reservada").length;
  const jugados = activos.filter((t) => t.estado === "jugada").length;
  const ahora = new Date().toTimeString().slice(0, 5);
  const proximos = activos
    .filter((t) => t.estado !== "jugada" && hora(t.hora_fin) > ahora)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    .slice(0, 4);

  return (
    <section className="contenedor seccion seccion-primera" aria-labelledby="titulo-hoy">
      <CabeceraSeccion
        id="titulo-hoy"
        nivel={1}
        titulo={`Hoy en ${empresa.nombre}`}
        bajada={capitalizarFecha(hoyISO())}
        enlace="/panel"
        textoEnlace="Abrir la agenda"
      />
      {error ? (
        <ConError mensaje={error} onReintentar={reintentar} />
      ) : !turnos ? (
        <Cargando filas={3} etiqueta="Cargando la agenda de hoy" />
      ) : activos.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>
            No hay turnos cargados para hoy. Si te reservan por teléfono, cargalos en la agenda;
            los que saquen los jugadores aparecen solos.
          </p>
          <div className="acciones-vacio">
            <Link className="boton" to="/panel">Cargar un turno</Link>
            <Link className="boton boton-fantasma" to="/panel?tab=perfil">Revisar horarios</Link>
            <Link className="boton boton-fantasma" to={`/complejos/${empresa.id_empresa}`}>Ver mi ficha pública</Link>
          </div>
        </div>
      ) : (
        <div className="tablero">
          <p className="resumen-dia">
            <span><strong>{activos.length}</strong> {activos.length === 1 ? "turno" : "turnos"}</span>
            <span><strong>{porConfirmar}</strong> por confirmar</span>
            <span><strong>{jugados}</strong> {jugados === 1 ? "jugado" : "jugados"}</span>
          </p>
          {proximos.length === 0 ? (
            <p className="renglon texto-suave">No quedan turnos por jugar hoy.</p>
          ) : (
            <ul>
              {proximos.map((t) => (
                <li key={t.id_reserva} className={`renglon renglon-${t.deporte}`}>
                  <span className="fecha-turno">
                    <strong>{hora(t.hora_inicio)}</strong>
                    <span>a {hora(t.hora_fin)}</span>
                  </span>
                  <div className="renglon-info">
                    <strong>{t.cancha}</strong>
                    <span className="texto-suave">
                      {t.id_partido ? "Partido de torneo" : t.cliente || "Sin nombre"}
                      {Number(t.sena_pagada) > 0 ? ` · seña ${pesos(t.sena_pagada)}` : !t.id_partido && " · sin seña"}
                    </span>
                  </div>
                  <span className={`insignia turno-${t.estado}`}>
                    {t.estado === "confirmada" ? "Confirmado" : "Por confirmar"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// Ejemplo de agenda para mostrarle a un complejo cómo se ve su día
const AGENDA_EJEMPLO = [
  { hora: "18:00", cancha: "Pádel 1", deporte: "padel", detalle: "Reservado desde la web", estado: "Confirmado" },
  { hora: "19:00", cancha: "Fútbol 2", deporte: "futbol", detalle: "Cargado por teléfono · seña cobrada", estado: "Por confirmar" },
  { hora: "19:00", cancha: "Fútbol 2", deporte: "futbol", detalle: "Otra reserva para el mismo horario", rechazado: true },
  { hora: "20:30", cancha: "Fútbol 1", deporte: "futbol", detalle: "Partido de campeonato · fecha 3", estado: "Torneo" }
];

function BandaComplejos() {
  return (
    <section className="banda-complejos" aria-labelledby="titulo-complejos">
      <div className="contenedor banda-interno">
        <div className="banda-texto">
          <h2 id="titulo-complejos">Tu agenda, sin turnos pisados</h2>
          <p className="banda-bajada">
            Dejá el cuaderno y el WhatsApp. Los turnos que sacan los jugadores y los que
            cargás por teléfono van a la misma agenda, y el sistema no deja que dos turnos
            ocupen la misma cancha a la misma hora.
          </p>
          <ul className="banda-lista">
            <li><strong>Agenda del día.</strong> Confirmá, marcá como jugado o cancelá cada turno.</li>
            <li><strong>Seña en cada turno.</strong> Sabés quién pagó y cuánto, sin anotarlo aparte.</li>
            <li><strong>Torneos y campeonatos.</strong> Llave por eliminación o todos contra todos, con fixture y tabla.</li>
            <li><strong>Partidos que reservan solos.</strong> Al programar un partido, esa cancha queda ocupada.</li>
          </ul>
          <div className="banda-acciones">
            <Link to="/registro" className="boton boton-grande boton-acento">Registrar mi complejo</Link>
            <p>¿Ya tenés cuenta? <Link to="/ingresar">Ingresá a tu complejo</Link></p>
          </div>
        </div>

        <figure className="agenda-ejemplo">
          <figcaption>Así se ve una tarde en la agenda</figcaption>
          <ol>
            {AGENDA_EJEMPLO.map((t, i) => (
              <li key={i} className={`agenda-turno agenda-${t.deporte} ${t.rechazado ? "agenda-rechazado" : ""}`}>
                <span className="agenda-hora">{t.hora}</span>
                <span className="agenda-cuerpo">
                  <strong>{t.cancha}</strong>
                  <span>{t.detalle}</span>
                </span>
                <span className="agenda-estado">{t.rechazado ? "Horario ocupado" : t.estado}</span>
              </li>
            ))}
          </ol>
        </figure>
      </div>
    </section>
  );
}
