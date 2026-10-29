import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import { Cargando, ConError } from "../components/Estados";
import { Campeon, EstadoTorneo, FaseDeGrupos, Fixture, InfoTorneo, TablaPosiciones } from "../components/Torneo";
import { obtenerTorneoPublico } from "../service/publicoService";
import { inscribirEquipo } from "../service/clienteService";
import { mensajeDeError } from "../service/api";
import { fechaLarga, pesos } from "../utils/formato";

// Página pública de un torneo: info, equipos, fixture, tabla e inscripción
export default function TorneoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [torneo, setTorneo] = useState(null);
  const [error, setError] = useState("");
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    let vigente = true;
    obtenerTorneoPublico(id)
      .then(({ data }) => vigente && setTorneo(data))
      .catch((err) => vigente && setError(mensajeDeError(err, "No pudimos cargar el torneo.")));
    return () => {
      vigente = false;
    };
  }, [id, recargas]);

  const reintentar = () => {
    setError("");
    setRecargas((n) => n + 1);
  };

  if (!torneo) {
    return (
      <main className="contenedor panel">
        <Link to="/torneos" className="volver">← Todos los torneos</Link>
        {error ? <ConError mensaje={error} onReintentar={reintentar} /> : <Cargando filas={3} etiqueta="Cargando el torneo" />}
      </main>
    );
  }

  const yaInscripto = usuario?.rol === "cliente" && torneo.equipos.some((e) => e.id_cliente === usuario.id_cliente);
  const hayCupo = torneo.inscriptos < torneo.cupo;
  const quien = torneo.deporte === "padel" ? "pareja" : "equipo";
  // Para ingresar o crear la cuenta sin perder el torneo: después se vuelve acá
  const volver = encodeURIComponent(`/torneos/${torneo.id_torneo}`);
  const conGrupos = torneo.tipo === "grupos" && torneo.partidos.length > 0;
  const llave = torneo.partidos.filter((p) => p.grupo === null);

  return (
    <main className="contenedor panel">
      <Link to="/torneos" className="volver">← Todos los torneos</Link>
      <div className="panel-cabecera">
        <div className="titulo-con-estado">
          <h1>{torneo.nombre}</h1>
          <EstadoTorneo estado={torneo.estado} />
        </div>
        <p className="torneo-organiza">
          Organiza <Link to={`/complejos/${torneo.id_empresa}`}>{torneo.complejo}</Link>
        </p>
        {torneo.descripcion && <p className="texto-suave">{torneo.descripcion}</p>}
      </div>

      <div className="detalle-intro">
      <InfoTorneo torneo={torneo} />
      <Campeon campeon={torneo.campeon} />

      {torneo.estado === "inscripcion" && (
        <section className="tarjeta inscripcion">
          {yaInscripto ? (
            <p className="ok-texto">✓ Ya inscribiste a tu {quien}. Lo ves en <Link to="/mis-reservas">Mis reservas</Link>.</p>
          ) : !hayCupo ? (
            <p>Cupo completo: ya se anotaron {torneo.cupo} {quien === "pareja" ? "parejas" : "equipos"}.</p>
          ) : usuario?.rol === "cliente" ? (
            <FormInscripcion torneo={torneo} onInscripto={() => setRecargas((n) => n + 1)} />
          ) : usuario ? (
            <p className="texto-suave">Solo los jugadores pueden inscribirse.</p>
          ) : (
            <div className="inscripcion-anonimo">
              <p>Para inscribir a tu {quien} necesitás una cuenta de jugador; crearla te lleva un minuto.</p>
              <div className="acciones-vacio">
                <Link className="boton boton-grande" to={`/ingresar?volver=${volver}`}>Ingresá para inscribirte</Link>
                <Link className="boton boton-grande boton-fantasma" to={`/registro-cliente?volver=${volver}`}>Creá tu cuenta</Link>
              </div>
            </div>
          )}
        </section>
      )}
      </div>

      <div className="detalle-grilla">
        <section>
          {conGrupos ? (
            <>
              {llave.length > 0 && (
                <>
                  <h2 className="seccion-titulo con-margen">Llave</h2>
                  <Fixture torneo={torneo} partidos={llave} />
                </>
              )}
              <h2 className="seccion-titulo con-margen">Fase de grupos</h2>
              <FaseDeGrupos torneo={torneo} />
            </>
          ) : (
            <>
              <h2 className="seccion-titulo con-margen">{{ campeonato: "Fixture", grupos: "Fase de grupos" }[torneo.tipo] ?? "Llave"}</h2>
              <Fixture torneo={torneo} />
            </>
          )}
          {torneo.tabla && torneo.partidos.length > 0 && (
            <>
              <h2 className="seccion-titulo con-margen">Tabla de posiciones</h2>
              <TablaPosiciones tabla={torneo.tabla} />
            </>
          )}
        </section>
        <aside className="tarjeta lateral">
          <h2 className="lateral-titulo">
            {torneo.deporte === "padel" ? "Parejas inscriptas" : "Equipos inscriptos"} <span className="grupo-cantidad">{torneo.inscriptos}</span>
          </h2>
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
          Teléfono de contacto
          <input
            name="contacto_telefono"
            value={datos.contacto_telefono}
            onChange={cambiar}
            maxLength={30}
            aria-describedby="ayuda-telefono"
          />
          <small id="ayuda-telefono">Si lo dejás vacío, usamos el de tu cuenta.</small>
        </label>
      </div>
      <label className="campo">
        Integrantes
        <input name="integrantes" value={datos.integrantes} onChange={cambiar} maxLength={500} placeholder="Nombres separados por coma" />
      </label>
      <div className="modal-acciones inscripcion-pie">
        <p className="inscripcion-resumen">
          Empieza el {fechaLarga(torneo.fecha_inicio.slice(0, 10))} ·{" "}
          {Number(torneo.precio_inscripcion) > 0
            ? `${pesos(torneo.precio_inscripcion)} por ${pareja ? "pareja" : "equipo"}. Consultá con el complejo cómo se paga.`
            : "Inscripción gratis."}
        </p>
        <button className="boton" disabled={enviando}>{enviando ? "Inscribiendo..." : "Inscribirme"}</button>
      </div>
    </form>
  );
}
