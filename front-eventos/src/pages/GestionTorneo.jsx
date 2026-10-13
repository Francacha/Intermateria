import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TorneoModal from "../components/TorneoModal";
import { Campeon, EstadoTorneo, Fixture, InfoTorneo, Partido, TablaPosiciones } from "../components/Torneo";
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
import { mensajeDeError } from "../service/api";
import { TIPO_TORNEO, hora } from "../utils/formato";

// Administración de un torneo del complejo: equipos, fixture, programación y resultados
export default function GestionTorneo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [torneo, setTorneo] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    Promise.all([obtenerTorneo(id), obtenerCanchas()])
      .then(([t, c]) => {
        setTorneo(t.data);
        setCanchas(c.data);
      })
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar el torneo")));
  }, [id]);

  // Todas las acciones devuelven el torneo actualizado
  const ejecutar = async (accion, porDefecto) => {
    setOcupado(true);
    setError("");
    try {
      const { data } = await accion();
      setTorneo(data);
      return true;
    } catch (err) {
      setError(mensajeDeError(err, porDefecto));
      return false;
    } finally {
      setOcupado(false);
    }
  };

  if (!torneo) {
    return (
      <main className="contenedor panel">
        {error ? <p className="alerta">{error}</p> : <p className="texto-suave">Cargando...</p>}
        <Link to="/panel?tab=torneos">← Mis torneos</Link>
      </main>
    );
  }

  const guardarEdicion = async (datos) => {
    try {
      const { data } = await actualizarTorneo(torneo.id_torneo, datos);
      setTorneo(data);
      setEditando(false);
    } catch (err) {
      throw mensajeDeError(err, "No se pudo guardar");
    }
  };

  const armarFixture = () => {
    const formato = torneo.tipo === "torneo" ? "la llave (sorteada)" : "el fixture de todos contra todos";
    if (!confirm(`Se cierra la inscripción y se arma ${formato} con ${torneo.inscriptos} equipos. ¿Seguir?`)) return;
    ejecutar(() => generarFixture(torneo.id_torneo), "No se pudo armar el fixture");
  };

  const cancelar = () => {
    if (!confirm("¿Cancelar el torneo? Los partidos sin jugar liberan las canchas.")) return;
    ejecutar(() => actualizarTorneo(torneo.id_torneo, { estado: "cancelado" }), "No se pudo cancelar");
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar "${torneo.nombre}" con sus equipos y partidos? No se puede deshacer.`)) return;
    try {
      await eliminarTorneo(torneo.id_torneo);
      navigate("/panel?tab=torneos");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar"));
    }
  };

  const abierto = torneo.estado === "inscripcion";
  const ultimaRonda = Math.max(0, ...torneo.partidos.map((p) => p.ronda));
  const canchasDelDeporte = canchas.filter((c) => c.deporte === torneo.deporte);
  const equipo = torneo.deporte === "padel" ? "pareja" : "equipo";

  return (
    <main className="contenedor panel">
      <Link to="/panel?tab=torneos" className="volver">← Mis torneos</Link>
      <div className="barra">
        <div>
          <span className="etiqueta">{TIPO_TORNEO[torneo.tipo]}</span>
          <div className="titulo-con-estado">
            <h1>{torneo.nombre}</h1>
            <EstadoTorneo estado={torneo.estado} />
          </div>
          {torneo.descripcion && <p className="texto-suave">{torneo.descripcion}</p>}
        </div>
        <div className="acciones">
          <Link className="boton boton-fantasma" to={`/torneos/${torneo.id_torneo}`}>Ver página pública</Link>
          {torneo.estado !== "cancelado" && (
            <button className="boton boton-fantasma" onClick={() => setEditando(true)}>Editar</button>
          )}
          {["inscripcion", "en_curso"].includes(torneo.estado) && (
            <button className="boton boton-fantasma" onClick={cancelar} disabled={ocupado}>Cancelar torneo</button>
          )}
          <button className="boton-icono peligro" title="Eliminar" onClick={eliminar}>✕</button>
        </div>
      </div>

      <InfoTorneo torneo={torneo} />
      <Campeon campeon={torneo.campeon} />
      {error && <p className="alerta">{error}</p>}

      {abierto ? (
        <>
          <div className="barra con-margen">
            <h2 className="seccion-titulo sin-margen">Inscriptos</h2>
            <button className="boton" onClick={armarFixture} disabled={ocupado || torneo.inscriptos < 2}>
              Cerrar inscripción y armar {torneo.tipo === "torneo" ? "llave" : "fixture"}
            </button>
          </div>
          {torneo.inscriptos < torneo.cupo && (
            <FormEquipo
              equipo={equipo}
              onAgregar={(datos) => ejecutar(() => agregarEquipo(torneo.id_torneo, datos), `No se pudo agregar la ${equipo}`)}
            />
          )}
          <ListaEquipos
            torneo={torneo}
            onQuitar={(e) => {
              if (confirm(`¿Quitar a "${e.nombre}"?`)) {
                ejecutar(() => quitarEquipo(torneo.id_torneo, e.id_equipo), "No se pudo quitar");
              }
            }}
          />
        </>
      ) : (
        <div className="detalle-grilla">
          <section>
            <h2 className="seccion-titulo con-margen">{torneo.tipo === "campeonato" ? "Fixture" : "Llave"}</h2>
            {torneo.partidos.length > 0 && torneo.estado !== "cancelado" && (
              <p className="texto-suave">
                Cargá el resultado de cada partido y programalo en una cancha: el horario queda bloqueado en tu agenda de turnos.
                {torneo.tipo === "torneo" && " Cuando se juega toda la ronda, se arma la siguiente con los ganadores."}
              </p>
            )}
            <Fixture
              torneo={torneo}
              renderPartido={(p) =>
                p.id_visitante === null || torneo.estado === "cancelado" ? (
                  <Partido partido={p} />
                ) : (
                  <PartidoEditable
                    partido={p}
                    canchas={canchasDelDeporte}
                    resultadoEditable={torneo.tipo === "campeonato" || p.ronda === ultimaRonda}
                    permiteEmpate={torneo.tipo === "campeonato" && torneo.deporte === "futbol"}
                    onGuardar={(datos) =>
                      ejecutar(() => actualizarPartido(torneo.id_torneo, p.id_partido, datos), "No se pudo guardar el partido")
                    }
                  />
                )
              }
            />
            {torneo.tabla && (
              <>
                <h2 className="seccion-titulo con-margen">Tabla de posiciones</h2>
                <TablaPosiciones tabla={torneo.tabla} />
              </>
            )}
          </section>
          <aside className="tarjeta lateral">
            <ListaEquipos torneo={torneo} compacta />
          </aside>
        </div>
      )}

      {editando && <TorneoModal torneo={torneo} onGuardar={guardarEdicion} onCerrar={() => setEditando(false)} />}
    </main>
  );
}

function FormEquipo({ equipo, onAgregar }) {
  const vacio = { nombre: "", contacto_nombre: "", contacto_telefono: "", integrantes: "" };
  const [datos, setDatos] = useState(vacio);
  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (await onAgregar(datos)) setDatos(vacio);
  };

  return (
    <form className="tarjeta form-equipo" onSubmit={enviar}>
      <input name="nombre" value={datos.nombre} onChange={cambiar} placeholder={`Nombre de la ${equipo} *`} required maxLength={80} />
      <input name="contacto_nombre" value={datos.contacto_nombre} onChange={cambiar} placeholder="Responsable" maxLength={100} />
      <input name="contacto_telefono" value={datos.contacto_telefono} onChange={cambiar} placeholder="Teléfono" maxLength={30} />
      <input name="integrantes" value={datos.integrantes} onChange={cambiar} placeholder="Integrantes" maxLength={500} />
      <button className="boton">+ Agregar</button>
    </form>
  );
}

function ListaEquipos({ torneo, onQuitar, compacta = false }) {
  if (torneo.equipos.length === 0) {
    return <p className="tarjeta vacio">Todavía no hay inscriptos. Los jugadores se anotan desde la página pública o los cargás vos.</p>;
  }
  if (compacta) {
    return (
      <>
        <span className="campo-titulo">Inscriptos ({torneo.inscriptos})</span>
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
    <div className="tarjeta tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>{torneo.deporte === "padel" ? "Pareja" : "Equipo"}</th>
            <th>Responsable</th>
            <th>Teléfono</th>
            <th>Integrantes</th>
            <th>Origen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {torneo.equipos.map((e, i) => (
            <tr key={e.id_equipo}>
              <td>{i + 1}</td>
              <td><strong>{e.nombre}</strong></td>
              <td>{e.contacto_nombre ?? "-"}</td>
              <td>{e.contacto_telefono ?? "-"}</td>
              <td>{e.integrantes ?? "-"}</td>
              <td>{e.id_cliente ? <span className="insignia insignia-futbol">Online</span> : <span className="texto-suave">Complejo</span>}</td>
              <td>
                <button className="boton-icono peligro" title="Quitar" onClick={() => onQuitar(e)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Un partido con su resultado y su programación (cancha, día y hora)
function PartidoEditable({ partido, canchas, resultadoEditable, permiteEmpate, onGuardar }) {
  const inicial = {
    resultado_local: partido.resultado_local ?? "",
    resultado_visitante: partido.resultado_visitante ?? "",
    id_cancha: partido.id_cancha ?? "",
    fecha: partido.fecha ?? "",
    hora: hora(partido.hora)
  };
  const [datos, setDatos] = useState(inicial);
  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });

  const cambioResultado =
    String(datos.resultado_local) !== String(inicial.resultado_local) ||
    String(datos.resultado_visitante) !== String(inicial.resultado_visitante);
  const cambioPrograma =
    String(datos.id_cancha) !== String(inicial.id_cancha) || datos.fecha !== inicial.fecha || datos.hora !== inicial.hora;
  const empate =
    datos.resultado_local !== "" && datos.resultado_local === datos.resultado_visitante && !permiteEmpate;

  const guardar = (e) => {
    e.preventDefault();
    const envio = {};
    if (cambioResultado) {
      envio.resultado_local = datos.resultado_local === "" ? null : Number(datos.resultado_local);
      envio.resultado_visitante = datos.resultado_visitante === "" ? null : Number(datos.resultado_visitante);
    }
    if (cambioPrograma) {
      envio.id_cancha = datos.id_cancha ? Number(datos.id_cancha) : null;
      envio.fecha = datos.fecha || null;
      envio.hora = datos.hora || null;
    }
    onGuardar(envio);
  };

  const jugado = partido.estado === "jugado";

  return (
    <form className={`partido partido-editable ${jugado ? "jugado" : ""}`} onSubmit={guardar}>
      <span className="partido-equipo">{partido.local}</span>
      <span className="partido-marcador">
        <input
          type="number" min="0" max="99" aria-label="Resultado local" disabled={!resultadoEditable}
          value={datos.resultado_local} onChange={(e) => cambiar("resultado_local", e.target.value)}
        />
        -
        <input
          type="number" min="0" max="99" aria-label="Resultado visitante" disabled={!resultadoEditable}
          value={datos.resultado_visitante} onChange={(e) => cambiar("resultado_visitante", e.target.value)}
        />
      </span>
      <span className="partido-equipo derecha">{partido.visitante}</span>
      <span className="partido-programa">
        <select value={datos.id_cancha} onChange={(e) => cambiar("id_cancha", e.target.value)} aria-label="Cancha">
          <option value="">Sin cancha</option>
          {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
        </select>
        <input type="date" value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} aria-label="Día" />
        <input type="time" step="1800" value={datos.hora} onChange={(e) => cambiar("hora", e.target.value)} aria-label="Hora" />
        <button className="boton boton-chico" disabled={(!cambioResultado && !cambioPrograma) || empate} title={empate ? "No puede haber empate" : ""}>
          Guardar
        </button>
      </span>
    </form>
  );
}
