import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerComplejos } from "../service/publicoService";
import { mensajeDeError } from "../service/api";
import { DEPORTE, capitalizar, pesos } from "../utils/formato";

const FILTROS = [
  ["", "Todos"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

// Catálogo: todas las canchas agrupadas por complejo
export default function Complejos() {
  const [complejos, setComplejos] = useState([]);
  const [deporte, setDeporte] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Pequeña espera para no consultar con cada tecla
    const espera = setTimeout(() => {
      obtenerComplejos({ deporte: deporte || undefined, q: busqueda.trim() || undefined })
        .then(({ data }) => {
          setComplejos(data);
          setError("");
        })
        .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar los complejos")))
        .finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(espera);
  }, [deporte, busqueda]);

  const totalCanchas = complejos.reduce((suma, c) => suma + c.canchas.length, 0);

  return (
    <main className="contenedor panel">
      <span className="etiqueta">Complejos</span>
      <h1>Encontrá dónde jugar</h1>
      <p className="texto-suave">
        {cargando ? "Buscando..." : `${complejos.length} complejos · ${totalCanchas} canchas`}
      </p>

      <div className="barra barra-filtros">
        <div className="segmentado">
          {FILTROS.map(([id, nombre]) => (
            <button key={id} className={deporte === id ? "activo" : ""} onClick={() => setDeporte(id)}>
              {nombre}
            </button>
          ))}
        </div>
        <input
          className="buscador"
          type="search"
          placeholder="Buscar por nombre o dirección..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <p className="alerta">{error}</p>}
      {!cargando && complejos.length === 0 && (
        <p className="tarjeta vacio">No hay complejos con canchas {deporte && `de ${DEPORTE[deporte].toLowerCase()}`} que coincidan.</p>
      )}

      <div className="lista-complejos">
        {complejos.map((complejo) => (
          <article key={complejo.id_empresa} className="tarjeta complejo">
            <div className="complejo-cabecera">
              <div>
                <h2>{complejo.nombre}</h2>
                {complejo.direccion && <p className="texto-suave">{complejo.direccion}</p>}
              </div>
              <div className="acciones">
                {complejo.torneos_activos > 0 && (
                  <span className="insignia insignia-torneo">
                    {complejo.torneos_activos} torneo{complejo.torneos_activos > 1 ? "s" : ""}
                  </span>
                )}
                <Link className="boton" to={`/complejos/${complejo.id_empresa}`}>Ver y reservar</Link>
              </div>
            </div>
            {complejo.descripcion && <p className="complejo-descripcion">{complejo.descripcion}</p>}
            {complejo.servicios.length > 0 && (
              <div className="chips chips-chicos">
                {complejo.servicios.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            )}
            <ul className="complejo-canchas">
              {complejo.canchas.map((cancha) => (
                <li key={cancha.id_cancha}>
                  <Link to={`/complejos/${complejo.id_empresa}?cancha=${cancha.id_cancha}`} className="mini-cancha">
                    <span className={`punto punto-${cancha.deporte}`} />
                    <strong>{cancha.nombre}</strong>
                    <span className="texto-suave">
                      {cancha.deporte === "futbol" ? `F${cancha.jugadores ?? ""}` : DEPORTE.padel}
                      {cancha.superficie && ` · ${capitalizar(cancha.superficie)}`}
                      {cancha.techada && " · Techada"}
                    </span>
                    <span className="mini-precio">{pesos(cancha.precio_hora)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
