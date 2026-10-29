import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { esDueno, useAuth } from "../context/auth";
import CanchaModal from "../components/CanchaModal";
import PerfilComplejo from "../components/PerfilComplejo";
import CambiarPassword from "../components/CambiarPassword";
import TurnosPanel from "../components/TurnosPanel";
import TurnosFijosPanel from "../components/TurnosFijosPanel";
import CajaPanel from "../components/CajaPanel";
import ReportesPanel from "../components/ReportesPanel";
import EquipoPanel from "../components/EquipoPanel";
import TorneosPanel from "../components/TorneosPanel";
import {
  actualizarCancha,
  crearCancha,
  eliminarCancha,
  obtenerCanchas,
  obtenerPerfil
} from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import { detalleDeCancha, pesos, tipoDeCancha } from "../utils/formato";
import PrimerosPasos from "../components/PrimerosPasos";

// Pestañas del panel. "dueno": solo las ve el dueño (precios, reglas, reportes y equipo)
const PESTANAS = [
  { id: "turnos", nombre: "Turnos" },
  { id: "fijos", nombre: "Turnos fijos" },
  { id: "caja", nombre: "Caja" },
  { id: "canchas", nombre: "Canchas" },
  { id: "torneos", nombre: "Torneos" },
  { id: "reportes", nombre: "Reportes", dueno: true },
  { id: "equipo", nombre: "Equipo", dueno: true },
  { id: "perfil", nombre: "Perfil y reglas", dueno: true },
  { id: "cuenta", nombre: "Mi cuenta", encargado: true }
];

const FILTROS = [
  ["todas", "Todas"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

// Reglas que usa la agenda hasta que llega el perfil
const REGLAS_INICIALES = { porcentaje_sena: 50, horas_cancelacion: 24, hora_noche: "19:00", datos_transferencia: "" };

export default function Panel() {
  const { empresa } = useAuth();
  const dueno = esDueno(empresa);
  const [canchas, setCanchas] = useState([]);
  const [reglas, setReglas] = useState(REGLAS_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const pestanas = PESTANAS.filter((p) => (dueno ? !p.encargado : !p.dueno));
  // La pestaña va en la URL (?tab=torneos) para volver a ella desde un torneo
  const [params, setParams] = useSearchParams();
  const pestana = pestanas.some((p) => p.id === params.get("tab")) ? params.get("tab") : "turnos";
  const setPestana = (tab) => setParams({ tab }, { replace: true });
  // undefined = modal cerrado, null = nueva cancha, objeto = editar esa cancha
  const [editando, setEditando] = useState(undefined);

  useEffect(() => {
    document.title = "Mi complejo · Reservas de Canchas";
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, []);

  useEffect(() => {
    obtenerCanchas()
      .then(({ data }) => setCanchas(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar las canchas")))
      .finally(() => setCargando(false));
    obtenerPerfil()
      .then(({ data }) => data.reglas && setReglas(data.reglas))
      .catch(() => {});
  }, []);

  const guardar = async (datos) => {
    try {
      if (editando) {
        const { data } = await actualizarCancha(editando.id_cancha, datos);
        setCanchas(canchas.map((c) => (c.id_cancha === data.id_cancha ? data : c)));
      } else {
        const { data } = await crearCancha(datos);
        setCanchas([...canchas, data]);
      }
      setEditando(undefined);
    } catch (err) {
      throw mensajeDeError(err, "No se pudo guardar la cancha");
    }
  };

  const eliminar = async (cancha) => {
    if (!confirm(`¿Eliminar "${cancha.nombre}"?`)) return;
    try {
      await eliminarCancha(cancha.id_cancha);
      setCanchas(canchas.filter((c) => c.id_cancha !== cancha.id_cancha));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar la cancha"));
    }
  };

  const futbol = canchas.filter((c) => c.deporte === "futbol");
  const padel = canchas.filter((c) => c.deporte === "padel");
  const visibles = filtro === "todas" ? canchas : canchas.filter((c) => c.deporte === filtro);
  const techadas = canchas.filter((c) => c.techada).length;

  return (
    <main className="contenedor panel">
      <div className="panel-cabecera">
        <div>
          <span className="etiqueta">{dueno ? "Mi complejo" : `Encargado · ${empresa.persona}`}</span>
          <h1 tabIndex={-1}>{empresa.nombre}</h1>
          {empresa.direccion && <p className="texto-suave">{empresa.direccion}</p>}
        </div>
      </div>

      {!cargando && dueno && <PrimerosPasos idEmpresa={empresa.id_empresa} canchas={canchas} onIr={setPestana} />}

      <div className="estadisticas">
        <div className="tarjeta estadistica">
          <span>Canchas</span>
          <strong>{canchas.length}</strong>
        </div>
        <div className="tarjeta estadistica estadistica-futbol">
          <span>Fútbol</span>
          <strong>{futbol.length}</strong>
        </div>
        <div className="tarjeta estadistica estadistica-padel">
          <span>Pádel</span>
          <strong>{padel.length}</strong>
        </div>
        <div className="tarjeta estadistica">
          <span>Techadas</span>
          <strong>{techadas}</strong>
        </div>
      </div>

      <div className="pestanas" role="tablist">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            className={pestana === p.id ? "activo" : ""}
            onClick={() => setPestana(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {pestana === "turnos" && <TurnosPanel canchas={canchas} reglas={reglas} dueno={dueno} />}
      {pestana === "fijos" && <TurnosFijosPanel canchas={canchas} reglas={reglas} />}
      {pestana === "caja" && <CajaPanel />}
      {pestana === "torneos" && <TorneosPanel />}
      {pestana === "reportes" && <ReportesPanel />}
      {pestana === "equipo" && <EquipoPanel />}
      {pestana === "perfil" && (
        <>
          <section className="tarjeta">
            <PerfilComplejo onReglas={setReglas} />
          </section>
          <h2 className="seccion-titulo con-margen">Tu cuenta</h2>
          <CambiarPassword />
        </>
      )}
      {pestana === "cuenta" && (
        <>
          <p className="texto-suave">
            Ingresás como <strong>{empresa.persona}</strong> ({empresa.email_encargado}). Lo que registres en la agenda y en la
            caja queda con tu nombre.
          </p>
          <CambiarPassword />
        </>
      )}
      {pestana === "canchas" && (
        <section>
          <div className="barra">
            <div className="segmentado">
              {FILTROS.map(([id, nombre]) => (
                <button key={id} className={filtro === id ? "activo" : ""} onClick={() => setFiltro(id)}>
                  {nombre}
                </button>
              ))}
            </div>
            {dueno ? (
              <button className="boton" onClick={() => setEditando(null)}>+ Nueva cancha</button>
            ) : (
              <span className="texto-suave">Las canchas y los precios los define el dueño.</span>
            )}
          </div>
          <p className="texto-suave">
            Turnos de 1 hora en fútbol y de 1 h 30 en pádel. El precio de noche rige desde las {reglas.hora_noche}.
          </p>

          {error && <p className="alerta">{error}</p>}
          {cargando ? (
            <p className="texto-suave">Cargando canchas...</p>
          ) : visibles.length === 0 ? (
            <div className="tarjeta vacio">
              <p>No hay canchas {filtro !== "todas" && `de ${filtro === "padel" ? "pádel" : "fútbol"}`} todavía.</p>
              {dueno && <button className="boton" onClick={() => setEditando(null)}>Agregar una cancha</button>}
            </div>
          ) : (
            <div className="grilla-canchas">
              {visibles.map((cancha) => (
                <article key={cancha.id_cancha} className={`tarjeta cancha cancha-${cancha.deporte}`}>
                  <div className="cancha-franja" aria-hidden="true" />
                  <div className="cancha-cuerpo">
                    <div className="cancha-titulo">
                      <h3>{cancha.nombre}</h3>
                      <span className={`insignia insignia-${cancha.deporte}`}>{tipoDeCancha(cancha)}</span>
                    </div>
                    <ul className="cancha-datos">
                      <li>{detalleDeCancha(cancha)}</li>
                      {!cancha.activa && <li>Inactiva</li>}
                    </ul>
                    <div className="cancha-pie">
                      <span className="precios-cancha">
                        <span className="precio">{pesos(cancha.precio_hora)}<small>/hora de día</small></span>
                        {cancha.precio_hora_noche != null && Number(cancha.precio_hora_noche) !== Number(cancha.precio_hora) && (
                          <span className="precio precio-noche">{pesos(cancha.precio_hora_noche)}<small>/hora de noche</small></span>
                        )}
                      </span>
                      {dueno && (
                        <span className="cancha-acciones">
                          <button className="boton-icono" onClick={() => setEditando(cancha)} title="Editar">✎</button>
                          <button className="boton-icono peligro" onClick={() => eliminar(cancha)} title="Eliminar">✕</button>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {editando !== undefined && (
        <CanchaModal cancha={editando} horaNoche={reglas.hora_noche} onGuardar={guardar} onCerrar={() => setEditando(undefined)} />
      )}
    </main>
  );
}
