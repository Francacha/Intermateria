import { useEffect, useState } from "react";
import { TarjetaTorneo } from "../components/Torneo";
import { obtenerTorneosPublicos } from "../service/publicoService";
import { mensajeDeError } from "../service/api";

const FILTROS = [
  ["", "Todos"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

// Torneos y campeonatos de todos los complejos
export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [deporte, setDeporte] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerTorneosPublicos({ deporte: deporte || undefined })
      .then(({ data }) => {
        setTorneos(data);
        setError("");
      })
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar los torneos")))
      .finally(() => setCargando(false));
  }, [deporte]);

  const abiertos = torneos.filter((t) => t.estado === "inscripcion");
  const resto = torneos.filter((t) => t.estado !== "inscripcion");

  return (
    <main className="contenedor panel">
      <span className="etiqueta">Torneos y campeonatos</span>
      <h1>Competí con tu equipo</h1>
      <p className="texto-suave">Inscribí a tu equipo o pareja y seguí el fixture y la tabla.</p>

      <div className="barra barra-filtros">
        <div className="segmentado">
          {FILTROS.map(([id, nombre]) => (
            <button key={id} className={deporte === id ? "activo" : ""} onClick={() => setDeporte(id)}>
              {nombre}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alerta">{error}</p>}
      {cargando ? (
        <p className="texto-suave">Cargando...</p>
      ) : torneos.length === 0 ? (
        <p className="tarjeta vacio">Todavía no hay torneos publicados.</p>
      ) : (
        <>
          {abiertos.length > 0 && (
            <>
              <h2 className="seccion-titulo con-margen">Con inscripción abierta</h2>
              <div className="grilla-torneos">
                {abiertos.map((t) => (
                  <TarjetaTorneo key={t.id_torneo} torneo={t} enlace={`/torneos/${t.id_torneo}`} mostrarComplejo />
                ))}
              </div>
            </>
          )}
          {resto.length > 0 && (
            <>
              <h2 className="seccion-titulo con-margen">En juego y terminados</h2>
              <div className="grilla-torneos">
                {resto.map((t) => (
                  <TarjetaTorneo key={t.id_torneo} torneo={t} enlace={`/torneos/${t.id_torneo}`} mostrarComplejo />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
