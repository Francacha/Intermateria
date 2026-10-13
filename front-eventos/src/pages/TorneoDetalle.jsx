import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import { Campeon, EstadoTorneo, Fixture, InfoTorneo, TablaPosiciones } from "../components/Torneo";
import { obtenerTorneoPublico } from "../service/publicoService";
import { inscribirEquipo } from "../service/clienteService";
import { mensajeDeError } from "../service/api";

// Página pública de un torneo: info, equipos, fixture, tabla e inscripción
export default function TorneoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [torneo, setTorneo] = useState(null);
  const [error, setError] = useState("");
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    obtenerTorneoPublico(id)
      .then(({ data }) => setTorneo(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar el torneo")));
  }, [id, recargas]);

  if (error && !torneo) {
    return (
      <main className="contenedor panel">
        <p className="alerta">{error}</p>
        <Link to="/torneos">← Volver a los torneos</Link>
      </main>
    );
  }
  if (!torneo) return <main className="contenedor panel"><p className="texto-suave">Cargando...</p></main>;

  const yaInscripto = usuario?.rol === "cliente" && torneo.equipos.some((e) => e.id_cliente === usuario.id_cliente);
  const hayCupo = torneo.inscriptos < torneo.cupo;

  return (
    <main className="contenedor panel">
      <Link to="/torneos" className="volver">← Todos los torneos</Link>
      <div className="panel-cabecera">
        <span className="etiqueta">
          <Link to={`/complejos/${torneo.id_empresa}`}>{torneo.complejo}</Link>
        </span>
        <div className="titulo-con-estado">
          <h1>{torneo.nombre}</h1>
          <EstadoTorneo estado={torneo.estado} />
        </div>
        {torneo.descripcion && <p className="texto-suave">{torneo.descripcion}</p>}
      </div>

      <InfoTorneo torneo={torneo} />
      <Campeon campeon={torneo.campeon} />

      {torneo.estado === "inscripcion" && (
        <section className="tarjeta inscripcion">
          {yaInscripto ? (
            <p className="ok-texto">✓ Ya inscribiste a tu equipo. Lo ves en <Link to="/mis-reservas">Mis reservas</Link>.</p>
          ) : !hayCupo ? (
            <p>No quedan cupos.</p>
          ) : usuario?.rol === "cliente" ? (
            <FormInscripcion torneo={torneo} onInscripto={() => setRecargas((n) => n + 1)} />
          ) : usuario ? (
            <p className="texto-suave">Solo los jugadores pueden inscribirse.</p>
          ) : (
            <p>
              <Link to="/ingresar">Ingresá</Link> o <Link to="/registro-cliente">creá tu cuenta</Link> para inscribir a tu equipo.
            </p>
          )}
        </section>
      )}

      <div className="detalle-grilla">
        <section>
          <h2 className="seccion-titulo con-margen">{torneo.tipo === "campeonato" ? "Fixture" : "Llave"}</h2>
          <Fixture torneo={torneo} />
          {torneo.tabla && torneo.partidos.length > 0 && (
            <>
              <h2 className="seccion-titulo con-margen">Tabla de posiciones</h2>
              <TablaPosiciones tabla={torneo.tabla} />
            </>
          )}
        </section>
        <aside className="tarjeta lateral">
          <span className="campo-titulo">{torneo.deporte === "padel" ? "Parejas" : "Equipos"} ({torneo.inscriptos})</span>
          {torneo.equipos.length === 0 ? (
            <p className="texto-suave">Todavía no hay inscriptos.</p>
          ) : (
            <ol className="lista-equipos">
              {torneo.equipos.map((e) => (
                <li key={e.id_equipo}>
                  <strong>{e.nombre}</strong>
                  {e.integrantes && <small className="texto-suave">{e.integrantes}</small>}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}

function FormInscripcion({ torneo, onInscripto }) {
  const [datos, setDatos] = useState({ nombre: "", integrantes: "", contacto_telefono: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      await inscribirEquipo({ id_torneo: torneo.id_torneo, ...datos });
      onInscripto();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo inscribir el equipo"));
      setEnviando(false);
    }
  };

  const pareja = torneo.deporte === "padel";
  return (
    <form onSubmit={enviar} className="form-inscripcion">
      <h2>Inscribí a tu {pareja ? "pareja" : "equipo"}</h2>
      {error && <p className="alerta">{error}</p>}
      <div className="grilla-campos">
        <label className="campo">
          Nombre {pareja ? "de la pareja" : "del equipo"} *
          <input name="nombre" value={datos.nombre} onChange={cambiar} required maxLength={80} placeholder={pareja ? "Gómez / Pérez" : "Los Pibes FC"} />
        </label>
        <label className="campo">
          Teléfono de contacto <small>(si no, el de tu cuenta)</small>
          <input name="contacto_telefono" value={datos.contacto_telefono} onChange={cambiar} maxLength={30} />
        </label>
      </div>
      <label className="campo">
        Integrantes
        <input name="integrantes" value={datos.integrantes} onChange={cambiar} maxLength={500} placeholder="Nombres separados por coma" />
      </label>
      <div className="modal-acciones">
        <button className="boton" disabled={enviando}>{enviando ? "Inscribiendo..." : "Inscribirme"}</button>
      </div>
    </form>
  );
}
