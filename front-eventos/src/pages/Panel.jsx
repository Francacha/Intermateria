import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import CanchaModal from "../components/CanchaModal";
import PerfilComplejo from "../components/PerfilComplejo";
import {
  actualizarCancha,
  crearCancha,
  eliminarCancha,
  obtenerCanchas
} from "../service/complejoService";
import { mensajeDeError } from "../service/api";

const pesos = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const FILTROS = [
  ["todas", "Todas"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

export default function Panel() {
  const { empresa } = useAuth();
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [pestana, setPestana] = useState("canchas");
  // undefined = modal cerrado, null = nueva cancha, objeto = editar esa cancha
  const [editando, setEditando] = useState(undefined);

  useEffect(() => {
    obtenerCanchas()
      .then(({ data }) => setCanchas(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar las canchas")))
      .finally(() => setCargando(false));
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
  const promedio = canchas.length
    ? canchas.reduce((suma, c) => suma + Number(c.precio_hora), 0) / canchas.length
    : 0;

  return (
    <main className="contenedor panel">
      <div className="panel-cabecera">
        <div>
          <span className="etiqueta">Mi complejo</span>
          <h1>{empresa.nombre}</h1>
          {empresa.direccion && <p className="texto-suave">{empresa.direccion}</p>}
        </div>
      </div>

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
          <span>Precio promedio / hora</span>
          <strong>{pesos(promedio)}</strong>
        </div>
      </div>

      <div className="pestanas">
        <button className={pestana === "canchas" ? "activo" : ""} onClick={() => setPestana("canchas")}>
          Canchas <small>PostgreSQL</small>
        </button>
        <button className={pestana === "perfil" ? "activo" : ""} onClick={() => setPestana("perfil")}>
          Perfil del complejo <small>MongoDB</small>
        </button>
      </div>

      {pestana === "perfil" ? (
        <section className="tarjeta">
          <PerfilComplejo />
        </section>
      ) : (
        <section>
          <div className="barra">
            <div className="segmentado">
              {FILTROS.map(([id, nombre]) => (
                <button key={id} className={filtro === id ? "activo" : ""} onClick={() => setFiltro(id)}>
                  {nombre}
                </button>
              ))}
            </div>
            <button className="boton" onClick={() => setEditando(null)}>+ Nueva cancha</button>
          </div>

          {error && <p className="alerta">{error}</p>}
          {cargando ? (
            <p className="texto-suave">Cargando canchas...</p>
          ) : visibles.length === 0 ? (
            <div className="tarjeta vacio">
              <p>No hay canchas {filtro !== "todas" && `de ${filtro === "padel" ? "pádel" : "fútbol"}`} todavía.</p>
              <button className="boton" onClick={() => setEditando(null)}>Agregar una cancha</button>
            </div>
          ) : (
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
                      <li>{cancha.superficie ? cancha.superficie[0].toUpperCase() + cancha.superficie.slice(1) : "Sin superficie"}</li>
                      <li>{cancha.techada ? "Techada" : "Al aire libre"}</li>
                    </ul>
                    <div className="cancha-pie">
                      <span className="precio">{pesos(cancha.precio_hora)}<small>/hora</small></span>
                      <span className="cancha-acciones">
                        <button className="boton-icono" onClick={() => setEditando(cancha)} title="Editar">✎</button>
                        <button className="boton-icono peligro" onClick={() => eliminar(cancha)} title="Eliminar">✕</button>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {editando !== undefined && (
        <CanchaModal cancha={editando} onGuardar={guardar} onCerrar={() => setEditando(undefined)} />
      )}
    </main>
  );
}
