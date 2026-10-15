import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Confirmar from "../components/Confirmar";
import { Cargando, ConError } from "../components/Estados";
import TorneoModal from "../components/TorneoModal";
import { Campeon, EstadoTorneo, Fixture, Partido, TablaPosiciones } from "../components/Torneo";
import { mensajeDeError } from "../service/api";
import {
  actualizarPartido,
  actualizarTorneo,
  agregarEquipo,
  eliminarTorneo,
  generarFixture,
  obtenerCanchas,
  obtenerTorneo,
  quitarEquipo
} from "../service/complejoService";
import useCarga from "../service/useCarga";
import {
  DEPORTE,
  FORMATO,
  capitalizar,
  fechaCorta,
  hora,
  nombreRonda,
  pesos,
  rondasDeLlave
} from "../utils/formato";

// Palabras según el deporte: en pádel se anotan parejas, en fútbol equipos
const palabras = (torneo) =>
  torneo.deporte === "padel"
    ? { uno: "pareja", varios: "parejas", una: "una pareja", lasDos: "las dos parejas", inscripta: "inscripta", nombre: "Nombre de la pareja", cargada: "Cargada por vos" }
    : { uno: "equipo", varios: "equipos", una: "un equipo", lasDos: "los dos equipos", inscripta: "inscripto", nombre: "Nombre del equipo", cargada: "Cargado por vos" };

const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// "la semifinal", "los cuartos de final"
const conArticulo = (ronda) => `${/^(Cuartos|Octavos)/.test(ronda) ? "los" : "la"} ${ronda.toLowerCase()}`;

// Partidos que se juegan de verdad (los que pasan libre no cuentan)
const reales = (partidos) => partidos.filter((p) => p.id_visitante !== null);

// "Sáb 18/10 11:30 · Pádel 2"
const cuandoYDonde = (p) => `${capitalizar(fechaCorta(p.fecha))} ${hora(p.hora)}${p.cancha ? ` · ${p.cancha}` : ""}`;

// Administración de un torneo del complejo: inscriptos, fixture, programación y resultados
export default function GestionTorneo() {
  const { id } = useParams();
  const consultar = useCallback(
    () =>
      Promise.all([obtenerTorneo(id), obtenerCanchas()]).then(([t, c]) => ({ data: { torneo: t.data, canchas: c.data } })),
    [id]
  );
  const { datos, error, reintentar } = useCarga(consultar, "No pudimos traer el torneo.");

  if (error) {
    return (
      <main className="contenedor panel">
        <Link to="/panel?tab=torneos" className="volver">← Mis torneos</Link>
        <h1>Torneo</h1>
        {/no encontrado/i.test(error) ? (
          <div className="tablero tablero-estado" role="alert">
            <p>No encontramos ese torneo. Puede que lo hayan eliminado.</p>
            <Link className="boton boton-fantasma" to="/panel?tab=torneos">Volver a mis torneos</Link>
          </div>
        ) : (
          <ConError mensaje={error} onReintentar={reintentar} />
        )}
      </main>
    );
  }
  if (!datos) {
    return (
      <main className="contenedor panel">
        <Link to="/panel?tab=torneos" className="volver">← Mis torneos</Link>
        <Cargando filas={4} etiqueta="Cargando el torneo" />
      </main>
    );
  }
  // key: si cambia el torneo, la gestión arranca de nuevo con esos datos
  return <Gestion key={id} inicial={datos.torneo} canchas={datos.canchas} />;
}

function Gestion({ inicial, canchas }) {
  const navigate = useNavigate();
  const [torneo, setTorneo] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // { tipo, ...datos } del diálogo abierto
  const [listo, setListo] = useState(""); // mensaje después de una acción
  const [guardado, setGuardado] = useState(null); // id del último partido guardado
  const mensajeListo = useRef(null);

  const p = palabras(torneo);
  const esLlave = torneo.tipo === "torneo";
  const abierto = torneo.estado === "inscripcion";
  const lugares = torneo.cupo - torneo.inscriptos;
  const ultimaRonda = Math.max(0, ...torneo.partidos.map((x) => x.ronda));
  const totalRondas = rondasDeLlave(torneo.equipos.length);
  const canchasDelDeporte = canchas.filter((c) => c.deporte === torneo.deporte);
  const armar = esLlave ? "la llave" : "el fixture";

  useEffect(() => {
    document.title = `${torneo.nombre} · Mis torneos`;
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, [torneo.nombre]);

  useEffect(() => {
    if (listo) mensajeListo.current?.focus();
  }, [listo]);

  const avisar = (texto) => {
    setListo("");
    // En el próximo render, para que el lector de pantalla lo anuncie aunque el texto se repita
    requestAnimationFrame(() => setListo(texto));
  };

  // Qué pasa al cerrar la inscripción: cómo queda la llave o el fixture
  const vistaPrevia = () => {
    const n = torneo.inscriptos;
    const despues = ` Después ya no se pueden sumar ni quitar ${p.varios}.`;
    const vacios = lugares > 0 ? ` Quedan ${cuenta(lugares, "lugar", "lugares")} sin ocupar.` : "";
    if (esLlave) {
      let tamano = 1;
      while (tamano < n) tamano *= 2;
      const libres = tamano - n;
      const rondas = rondasDeLlave(n);
      const pasan =
        libres > 0
          ? ` ${libres === 1 ? `1 ${p.uno} pasa` : `${libres} ${p.varios} pasan`} libre a ${nombreRonda(2, rondas, "torneo")}.`
          : "";
      const partidos = (n - libres) / 2;
      return `Se sortea una llave de ${tamano} lugares con ${cuenta(n, p.uno, p.varios)}.${pasan} Arranca en ${nombreRonda(1, rondas, "torneo")} con ${cuenta(partidos, "partido", "partidos")}.${vacios}${despues}`;
    }
    const fechas = n % 2 ? n : n - 1;
    const libre = n % 2 ? `, y en cada fecha ${p.una} queda libre` : "";
    return `Todos contra todos: ${cuenta(fechas, "fecha", "fechas")} de ${cuenta(Math.floor(n / 2), "partido", "partidos")}${libre}.${vacios}${despues}`;
  };

  // Antes de guardar un resultado: ¿cierra la ronda (o termina el torneo)?
  const avisoDeCierre = (partido, envio) => {
    if (!esLlave || envio.resultado_local == null) return null;
    const ronda = torneo.partidos.filter((x) => x.ronda === partido.ronda);
    const otros = reales(ronda).filter((x) => x.id_partido !== partido.id_partido);
    if (!otros.every((x) => x.estado === "jugado")) return null;
    const actual = nombreRonda(partido.ronda, totalRondas, "torneo");
    if (ronda.length === 1) {
      if (torneo.estado === "finalizado") return "Este torneo ya tiene campeón: si cambiás el resultado de la final, el campeón puede cambiar.";
      const gana = envio.resultado_local > envio.resultado_visitante ? partido.local : partido.visitante;
      return `Con este resultado termina el torneo y ${gana} queda campeón.`;
    }
    const siguiente = nombreRonda(partido.ronda + 1, totalRondas, "torneo");
    return `Con este resultado se completa la ronda de ${actual.toLowerCase()} y se arma ${conArticulo(siguiente)}. Después no vas a poder cambiar los resultados de ${conArticulo(actual)}.`;
  };

  const enviarPartido = async (partido, envio) => {
    const { data } = await actualizarPartido(torneo.id_torneo, partido.id_partido, envio);
    setTorneo(data);
    setGuardado(partido.id_partido);
    return data;
  };

  const guardarPartido = async (partido, envio) => {
    const aviso = avisoDeCierre(partido, envio);
    if (aviso) {
      setConfirmar({ tipo: "partido", partido, envio, aviso });
      return { pendiente: true };
    }
    try {
      await enviarPartido(partido, envio);
      return { ok: true };
    } catch (err) {
      return { error: mensajeDeError(err, "No se pudo guardar el partido.") };
    }
  };

  const resumen = [
    DEPORTE[torneo.deporte],
    FORMATO[torneo.tipo],
    torneo.categoria,
    `${capitalizar(fechaCorta(torneo.fecha_inicio.slice(0, 10)))}${torneo.fecha_fin ? ` al ${fechaCorta(torneo.fecha_fin.slice(0, 10))}` : ""}`,
    Number(torneo.precio_inscripcion) > 0 ? `${pesos(torneo.precio_inscripcion)} por ${p.uno}` : "Inscripción gratis",
    torneo.premio && `Premio: ${torneo.premio}`
  ]
    .filter(Boolean)
    .join(" · ");

  const botonArmar = (principal) => (
    <button
      className={`boton ${principal ? "" : "boton-fantasma"}`}
      onClick={() => setConfirmar({ tipo: "fixture" })}
    >
      Cerrar inscripción y armar {esLlave ? "llave" : "fixture"}
    </button>
  );

  return (
    <main className="contenedor panel">
      <Link to="/panel?tab=torneos" className="volver">← Mis torneos</Link>
      <div className="barra cabecera-torneo">
        <div>
          <div className="titulo-con-estado">
            <h1>{torneo.nombre}</h1>
            <EstadoTorneo estado={torneo.estado} />
          </div>
          <p className="texto-suave sin-margen">{resumen}</p>
        </div>
        <div className="acciones acciones-torneo">
          <Link className="boton boton-fantasma" to={`/torneos/${torneo.id_torneo}`}>Ver página pública</Link>
          {torneo.estado !== "cancelado" && (
            <button className="boton boton-fantasma" onClick={() => setEditando(true)}>Editar</button>
          )}
          {["inscripcion", "en_curso"].includes(torneo.estado) && (
            <button className="accion-texto peligro" onClick={() => setConfirmar({ tipo: "cancelar" })}>Cancelar torneo</button>
          )}
          <button className="accion-texto peligro" onClick={() => setConfirmar({ tipo: "eliminar" })}>Eliminar torneo</button>
        </div>
      </div>

      <ProximoPaso torneo={torneo} lugares={lugares} armar={armar} palabras={p} totalRondas={totalRondas}>
        {abierto && lugares <= 0 && torneo.inscriptos >= 2 && botonArmar(true)}
      </ProximoPaso>

      {listo && <p className="aviso-ok" role="status" tabIndex={-1} ref={mensajeListo}>{listo}</p>}

      {abierto ? (
        <section aria-labelledby="titulo-inscriptos">
          <h2 className="seccion-titulo con-margen" id="titulo-inscriptos">
            Inscriptos <span className="texto-suave">({torneo.inscriptos} de {torneo.cupo})</span>
          </h2>
          {lugares > 0 && (
            <FormEquipo
              palabras={p}
              onAgregar={async (datos) => {
                try {
                  const { data } = await agregarEquipo(torneo.id_torneo, datos);
                  setTorneo(data);
                  return { ok: true };
                } catch (err) {
                  return { error: mensajeDeError(err, `No se pudo inscribir ${p.una}.`) };
                }
              }}
            />
          )}
          <ListaEquipos torneo={torneo} palabras={p} onQuitar={(equipo) => setConfirmar({ tipo: "quitar", equipo })} />
          {torneo.inscriptos >= 2 && lugares > 0 && (
            <div className="cierre-inscripcion">
              <p className="texto-suave sin-margen">
                ¿No esperás más {p.varios}? Podés cerrar la inscripción con {cuenta(torneo.inscriptos, p.uno, p.varios)}.
              </p>
              {botonArmar(false)}
            </div>
          )}
        </section>
      ) : (
        <div className={`detalle-grilla ${torneo.tabla ? "grilla-campeonato" : ""}`}>
          <section>
            <h2 className="seccion-titulo con-margen">{esLlave ? "Llave" : "Fixture"}</h2>
            {torneo.partidos.length > 0 && torneo.estado !== "cancelado" && (
              <p className="texto-suave ayuda-fixture">
                Cargá el resultado de cada partido y programalo en una cancha: el horario queda bloqueado en tu agenda de turnos.
                {esLlave && " Cuando se juega toda la ronda, se arma la siguiente con los ganadores."}
              </p>
            )}
            <Fixture
              torneo={torneo}
              renderPartido={(x) =>
                x.id_visitante === null || torneo.estado === "cancelado" ? (
                  <Partido partido={x} />
                ) : (
                  <PartidoEditable
                    partido={x}
                    canchas={canchasDelDeporte}
                    palabras={p}
                    resultadoEditable={!esLlave || x.ronda === ultimaRonda}
                    permiteEmpate={!esLlave && torneo.deporte === "futbol"}
                    guardado={guardado === x.id_partido}
                    onGuardar={(envio) => guardarPartido(x, envio)}
                  />
                )
              }
            />
          </section>
          {torneo.tabla ? (
            <aside className="lateral-columna">
              <h2 className="seccion-titulo con-margen">Tabla de posiciones</h2>
              <TablaPosiciones tabla={torneo.tabla} />
              <div className="tarjeta lateral-tarjeta">
                <ListaEquipos torneo={torneo} palabras={p} compacta />
              </div>
            </aside>
          ) : (
            <aside className="tarjeta lateral">
              <ListaEquipos torneo={torneo} palabras={p} compacta />
            </aside>
          )}
        </div>
      )}

      {editando && (
        <TorneoModal
          torneo={torneo}
          onCerrar={() => setEditando(false)}
          onGuardar={async (datos) => {
            try {
              const { data } = await actualizarTorneo(torneo.id_torneo, datos);
              setTorneo(data);
              setEditando(false);
              avisar("Listo: guardaste los cambios del torneo.");
            } catch (err) {
              throw mensajeDeError(err, "No se pudo guardar.");
            }
          }}
        />
      )}

      {confirmar?.tipo === "fixture" && (
        <Confirmar
          titulo={`¿Cerrar la inscripción y armar ${armar}?`}
          textoBoton={`Armar ${esLlave ? "llave" : "fixture"}`}
          onCerrar={() => setConfirmar(null)}
          onConfirmar={async () => {
            const { data } = await generarFixture(torneo.id_torneo);
            setTorneo(data);
            setConfirmar(null);
            avisar(`Listo: se armó ${armar}. Ahora programá cada partido en una cancha.`);
          }}
        >
          <p>{vistaPrevia()}</p>
        </Confirmar>
      )}

      {confirmar?.tipo === "cancelar" && (
        <Confirmar
          titulo="¿Cancelar el torneo?"
          textoBoton="Cancelar torneo"
          textoCancelar="Volver"
          peligro
          onCerrar={() => setConfirmar(null)}
          onConfirmar={async () => {
            const { data } = await actualizarTorneo(torneo.id_torneo, { estado: "cancelado" });
            setTorneo(data);
            setConfirmar(null);
            avisar("Listo: el torneo quedó cancelado y sus partidos sin jugar salieron de tu agenda.");
          }}
        >
          <p>
            Los partidos sin jugar se sacan de tu agenda y esas canchas quedan libres. Lo que ya se jugó queda guardado. Un
            torneo cancelado no se puede volver a abrir.
          </p>
        </Confirmar>
      )}

      {confirmar?.tipo === "eliminar" && (
        <Confirmar
          titulo="¿Eliminar este torneo para siempre?"
          textoBoton="Eliminar para siempre"
          peligro
          confirmarCon={torneo.inscriptos > 0 || torneo.partidos.length > 0 ? torneo.nombre : undefined}
          onCerrar={() => setConfirmar(null)}
          onConfirmar={async () => {
            await eliminarTorneo(torneo.id_torneo);
            navigate("/panel?tab=torneos");
          }}
        >
          <p>
            <strong>{torneo.nombre}</strong>:{" "}
            {torneo.inscriptos > 0 || torneo.partidos.length > 0
              ? `se borran ${[
                  torneo.inscriptos > 0 && cuenta(torneo.inscriptos, `${p.uno} ${p.inscripta}`, `${p.varios} ${p.inscripta}s`),
                  reales(torneo.partidos).length > 0 && `${cuenta(reales(torneo.partidos).length, "partido", "partidos")} con sus resultados`
                ]
                  .filter(Boolean)
                  .join(" y ")}.`
              : "todavía no tiene inscriptos ni partidos."}{" "}
            Si solo querés que no se juegue, cancelalo. No se puede deshacer.
          </p>
        </Confirmar>
      )}

      {confirmar?.tipo === "quitar" && (
        <Confirmar
          titulo={`¿Quitar a ${confirmar.equipo.nombre}?`}
          textoBoton="Quitar"
          peligro
          onCerrar={() => setConfirmar(null)}
          onConfirmar={async () => {
            const { data } = await quitarEquipo(torneo.id_torneo, confirmar.equipo.id_equipo);
            setTorneo(data);
            setConfirmar(null);
            avisar(`Listo: quitaste a ${confirmar.equipo.nombre} y se liberó su lugar.`);
          }}
        >
          <p>
            Deja de estar {p.inscripta} y se libera su lugar.
            {confirmar.equipo.id_cliente && " Se había anotado online: avisale vos por teléfono."}
          </p>
        </Confirmar>
      )}

      {confirmar?.tipo === "partido" && (
        <Confirmar
          titulo={`${confirmar.partido.local} ${confirmar.envio.resultado_local} - ${confirmar.envio.resultado_visitante} ${confirmar.partido.visitante}`}
          textoBoton="Guardar resultado"
          onCerrar={() => setConfirmar(null)}
          onConfirmar={async () => {
            const anterior = torneo.estado;
            const data = await enviarPartido(confirmar.partido, confirmar.envio);
            setConfirmar(null);
            if (data.estado === "finalizado" && anterior !== "finalizado") avisar(`Listo: ${data.campeon?.nombre ?? "ya hay"} campeón.`);
            else if (data.estado === "finalizado") avisar("Listo: guardaste el resultado de la final.");
            else avisar(`Listo: se armó ${conArticulo(nombreRonda(confirmar.partido.ronda + 1, totalRondas, "torneo"))}. Programá sus partidos.`);
          }}
        >
          <p>{confirmar.aviso}</p>
        </Confirmar>
      )}
    </main>
  );
}

// Franja con lo que conviene hacer según el estado del torneo
function ProximoPaso({ torneo, lugares, armar, palabras: p, totalRondas, children }) {
  let titulo;
  let detalle;
  if (torneo.estado === "finalizado") return <Campeon campeon={torneo.campeon} />;
  if (torneo.estado === "cancelado") {
    titulo = "Torneo cancelado";
    detalle = "Los partidos sin jugar salieron de tu agenda. Queda para consultar lo que se jugó.";
  } else if (torneo.estado === "inscripcion") {
    const n = torneo.inscriptos;
    if (n < 2) {
      titulo = `Inscripción abierta: ${n} de ${torneo.cupo} ${p.varios}`;
      detalle = `Necesitás al menos 2 para armar ${armar}. Se anotan desde la página pública o los cargás vos acá abajo.`;
    } else if (lugares > 0) {
      titulo = `Faltan ${cuenta(lugares, p.uno, p.varios)} para llenar el cupo (${n} de ${torneo.cupo})`;
      detalle = `Cuando quieras, cerrá la inscripción y armá ${armar} con ${p.varios === "parejas" ? "las" : "los"} que haya.`;
    } else {
      titulo = `Cupo completo: ${n} de ${torneo.cupo} ${p.varios}`;
      detalle = `Ya podés cerrar la inscripción y armar ${armar}.`;
    }
  } else {
    const partidos = reales(torneo.partidos);
    const pendientes = partidos.filter((x) => x.estado !== "jugado");
    if (torneo.tipo === "torneo") {
      const ronda = Math.max(...torneo.partidos.map((x) => x.ronda));
      const deLaRonda = partidos.filter((x) => x.ronda === ronda);
      titulo = `${nombreRonda(ronda, totalRondas, "torneo")}: ${deLaRonda.filter((x) => x.estado === "jugado").length} de ${cuenta(deLaRonda.length, "partido jugado", "partidos jugados")}`;
    } else {
      const fecha = Math.min(...pendientes.map((x) => x.ronda));
      titulo = `${partidos.length - pendientes.length} de ${cuenta(partidos.length, "partido jugado", "partidos jugados")}${Number.isFinite(fecha) ? ` · vamos por la fecha ${fecha}` : ""}`;
    }
    const programados = pendientes
      .filter((x) => x.fecha && x.hora)
      .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
    const sinProgramar = pendientes.length - programados.length;
    const proximo = programados[0];
    detalle = [
      proximo
        ? `Próximo: ${proximo.local} vs ${proximo.visitante}, ${cuandoYDonde(proximo)}`
        : pendientes.length > 0 && "Ningún partido pendiente está programado todavía",
      sinProgramar > 0 && proximo && `${cuenta(sinProgramar, "partido", "partidos")} sin programar`
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return (
    <div className="paso-torneo">
      <div>
        <strong>{titulo}</strong>
        {detalle && <p className="texto-suave sin-margen">{detalle}</p>}
      </div>
      {children}
    </div>
  );
}

function FormEquipo({ palabras: p, onAgregar }) {
  const vacio = { nombre: "", contacto_nombre: "", contacto_telefono: "", integrantes: "" };
  const [datos, setDatos] = useState(vacio);
  const [error, setError] = useState(null); // { campo, mensaje }
  const [listo, setListo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campoNombre = useRef(null);

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
    setError(null);
    setListo("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!datos.nombre.trim()) {
      setError({ campo: "nombre", mensaje: `Escribí el ${p.nombre.toLowerCase()}.` });
      campoNombre.current?.focus();
      return;
    }
    setEnviando(true);
    const r = await onAgregar(datos);
    setEnviando(false);
    if (r.ok) {
      setListo(`Listo: ${datos.nombre.trim()} quedó ${p.inscripta}.`);
      setDatos(vacio);
    } else {
      setError({ campo: /nombre/i.test(r.error) ? "nombre" : "", mensaje: r.error });
    }
    // Para cargar varias seguidas, el foco vuelve al nombre
    campoNombre.current?.focus();
  };

  const errorNombre = error?.campo === "nombre";

  return (
    <form className="tarjeta form-equipo" onSubmit={enviar} noValidate aria-label={`Inscribir ${p.una}`}>
      <div className="campo">
        <label htmlFor="equipo-nombre">{p.nombre} *</label>
        <input
          id="equipo-nombre"
          ref={campoNombre}
          name="nombre"
          value={datos.nombre}
          onChange={cambiar}
          readOnly={enviando}
          maxLength={80}
          placeholder={p.uno === "pareja" ? "Ej: García / López" : "Ej: Los Pibes FC"}
          aria-invalid={errorNombre || undefined}
          aria-describedby={errorNombre ? "equipo-error" : undefined}
        />
      </div>
      <div className="campo">
        <label htmlFor="equipo-contacto">Responsable</label>
        <input id="equipo-contacto" name="contacto_nombre" value={datos.contacto_nombre} onChange={cambiar} readOnly={enviando} maxLength={100} />
      </div>
      <div className="campo">
        <label htmlFor="equipo-telefono">Teléfono</label>
        <input
          id="equipo-telefono"
          name="contacto_telefono"
          type="tel"
          value={datos.contacto_telefono}
          onChange={cambiar}
          readOnly={enviando}
          maxLength={30}
        />
      </div>
      <div className="campo">
        <label htmlFor="equipo-integrantes">Integrantes</label>
        <input id="equipo-integrantes" name="integrantes" value={datos.integrantes} onChange={cambiar} readOnly={enviando} maxLength={500} />
      </div>
      <button className="boton" aria-disabled={enviando} aria-busy={enviando}>
        {enviando ? "Agregando…" : `Agregar ${p.uno}`}
      </button>
      <p className="form-equipo-estado" role={error ? "alert" : "status"}>
        {error ? <span className="campo-error" id="equipo-error">{error.mensaje}</span> : listo && <span className="ok-texto">{listo}</span>}
      </p>
    </form>
  );
}

function ListaEquipos({ torneo, palabras: p, onQuitar, compacta = false }) {
  if (torneo.equipos.length === 0) {
    return compacta ? null : (
      <p className="tablero tablero-estado">
        Todavía no hay {p.varios} {p.inscripta}s. Se anotan desde la página pública del torneo o los cargás vos arriba.
      </p>
    );
  }
  if (compacta) {
    return (
      <>
        <h2 className="campo-titulo">{capitalizar(p.varios)} ({torneo.inscriptos})</h2>
        <ol className="lista-equipos">
          {torneo.equipos.map((e) => (
            <li key={e.id_equipo}>
              <strong>{e.nombre}</strong>
              <small className="texto-suave">{[e.contacto_nombre, e.contacto_telefono].filter(Boolean).join(" · ")}</small>
            </li>
          ))}
        </ol>
      </>
    );
  }
  return (
    <ol className="tablero lista-inscriptos">
      {torneo.equipos.map((e, i) => (
        <li key={e.id_equipo} className="renglon renglon-equipo">
          <span className="renglon-numero">{i + 1}</span>
          <div className="renglon-info">
            <strong>{e.nombre}</strong>
            {(e.contacto_nombre || e.contacto_telefono) && (
              <span className="texto-suave">{[e.contacto_nombre, e.contacto_telefono].filter(Boolean).join(" · ")}</span>
            )}
            {e.integrantes && <span className="texto-suave">{e.integrantes}</span>}
          </div>
          <span className="pastilla-origen">{e.id_cliente ? "Se anotó online" : p.cargada}</span>
          <button className="accion-texto peligro" onClick={() => onQuitar(e)}>
            Quitar<span className="solo-lectores"> a {e.nombre}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// Valores del partido que vienen del servidor; si cambian, la fila se actualiza
const valoresDe = (partido) => ({
  resultado_local: partido.resultado_local ?? "",
  resultado_visitante: partido.resultado_visitante ?? "",
  id_cancha: partido.id_cancha ?? "",
  fecha: partido.fecha ?? "",
  hora: hora(partido.hora)
});

// Un partido con su resultado y su programación (cancha, día y hora)
function PartidoEditable({ partido, canchas, palabras: p, resultadoEditable, permiteEmpate, guardado, onGuardar }) {
  const inicial = valoresDe(partido);
  const firma = JSON.stringify(inicial);
  const [base, setBase] = useState(firma);
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campoLocal = useRef(null);
  const campoVisitante = useRef(null);

  // El servidor cambió este partido (se guardó): la fila muestra lo que quedó guardado
  if (base !== firma) {
    setBase(firma);
    setDatos(inicial);
    setError("");
  }

  const cambiar = (campo, valor) => {
    setDatos({ ...datos, [campo]: valor });
    setError("");
  };

  const cambioResultado =
    String(datos.resultado_local) !== String(inicial.resultado_local) ||
    String(datos.resultado_visitante) !== String(inicial.resultado_visitante);
  const cambioPrograma =
    String(datos.id_cancha) !== String(inicial.id_cancha) || datos.fecha !== inicial.fecha || datos.hora !== inicial.hora;
  const hayCambios = cambioResultado || cambioPrograma;

  const guardar = async (e) => {
    e.preventDefault();
    if (enviando || !hayCambios) return;
    const local = String(datos.resultado_local);
    const visitante = String(datos.resultado_visitante);
    if (cambioResultado) {
      if ((local === "") !== (visitante === "")) {
        setError(`Cargá el resultado de ${p.lasDos}.`);
        (local === "" ? campoLocal : campoVisitante).current?.focus();
        return;
      }
      if (local !== "" && local === visitante && !permiteEmpate) {
        setError("En este torneo no puede haber empate: tiene que haber un ganador.");
        campoLocal.current?.focus();
        return;
      }
    }
    const envio = {};
    if (cambioResultado) {
      envio.resultado_local = local === "" ? null : Number(local);
      envio.resultado_visitante = visitante === "" ? null : Number(visitante);
    }
    if (cambioPrograma) {
      envio.id_cancha = datos.id_cancha ? Number(datos.id_cancha) : null;
      envio.fecha = datos.fecha || null;
      envio.hora = datos.hora || null;
    }
    setEnviando(true);
    const r = await onGuardar(envio);
    setEnviando(false);
    if (r.error) setError(r.error);
  };

  const jugado = partido.estado === "jugado";
  const gana = (lado) =>
    jugado &&
    (lado === "local"
      ? partido.resultado_local > partido.resultado_visitante
      : partido.resultado_visitante > partido.resultado_local);
  const quien = `${partido.local} contra ${partido.visitante}`;

  return (
    <form className={`partido partido-editable ${jugado ? "jugado" : ""}`} onSubmit={guardar} aria-label={quien} noValidate>
      <span className={`partido-equipo ${gana("local") ? "ganador" : ""}`}>{partido.local}</span>
      <span className="partido-marcador">
        <input
          ref={campoLocal}
          type="number"
          inputMode="numeric"
          min="0"
          max="99"
          aria-label={`Resultado de ${partido.local}`}
          disabled={!resultadoEditable}
          readOnly={enviando}
          value={datos.resultado_local}
          onChange={(e) => cambiar("resultado_local", e.target.value)}
          aria-invalid={Boolean(error) || undefined}
        />
        <span aria-hidden="true">-</span>
        <input
          ref={campoVisitante}
          type="number"
          inputMode="numeric"
          min="0"
          max="99"
          aria-label={`Resultado de ${partido.visitante}`}
          disabled={!resultadoEditable}
          readOnly={enviando}
          value={datos.resultado_visitante}
          onChange={(e) => cambiar("resultado_visitante", e.target.value)}
          aria-invalid={Boolean(error) || undefined}
        />
      </span>
      <span className={`partido-equipo derecha ${gana("visitante") ? "ganador" : ""}`}>{partido.visitante}</span>
      <span className="partido-programa">
        <select value={datos.id_cancha} onChange={(e) => cambiar("id_cancha", e.target.value)} aria-label="Cancha" disabled={enviando}>
          <option value="">Sin cancha</option>
          {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
        </select>
        <input type="date" value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} aria-label="Día" readOnly={enviando} />
        <input type="time" step="1800" value={datos.hora} onChange={(e) => cambiar("hora", e.target.value)} aria-label="Hora" readOnly={enviando} />
        <button className="boton boton-chico" aria-disabled={!hayCambios || enviando} aria-busy={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </span>
      <span className="partido-estado" role={error ? "alert" : "status"}>
        {error ? <span className="campo-error">{error}</span> : guardado && !hayCambios && <span className="ok-texto">Guardado</span>}
      </span>
    </form>
  );
}
