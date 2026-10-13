import { useState } from "react";
import { hoyISO } from "../utils/formato";

const TIPOS = [
  { id: "torneo", nombre: "Torneo", detalle: "Eliminación directa: el que pierde queda afuera" },
  { id: "campeonato", nombre: "Campeonato", detalle: "Todos contra todos, con tabla de posiciones" }
];

// Formulario para crear o editar un torneo / campeonato (torneo = null → nuevo)
export default function TorneoModal({ torneo, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState({
    nombre: torneo?.nombre ?? "",
    tipo: torneo?.tipo ?? "torneo",
    deporte: torneo?.deporte ?? "futbol",
    categoria: torneo?.categoria ?? "",
    descripcion: torneo?.descripcion ?? "",
    fecha_inicio: torneo?.fecha_inicio ?? hoyISO(),
    fecha_fin: torneo?.fecha_fin ?? "",
    cupo: torneo?.cupo ?? 8,
    precio_inscripcion: torneo ? Number(torneo.precio_inscripcion) : "",
    premio: torneo?.premio ?? ""
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Con el fixture armado ya no se puede cambiar el formato ni el deporte
  const bloqueado = torneo && torneo.estado !== "inscripcion";

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await onGuardar({
        ...datos,
        cupo: Number(datos.cupo),
        precio_inscripcion: Number(datos.precio_inscripcion) || 0,
        fecha_fin: datos.fecha_fin || null
      });
    } catch (mensaje) {
      setError(mensaje);
      setGuardando(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal modal-ancho" onSubmit={enviar} onClick={(e) => e.stopPropagation()}>
        <h2>{torneo ? "Editar" : "Nuevo torneo o campeonato"}</h2>
        {error && <p className="alerta">{error}</p>}

        <div className="deportes">
          {TIPOS.map((tipo) => (
            <button
              type="button"
              key={tipo.id}
              disabled={bloqueado}
              className={`opcion ${datos.tipo === tipo.id ? "elegida" : ""}`}
              onClick={() => cambiar("tipo", tipo.id)}
            >
              <strong>{tipo.nombre}</strong>
              <small>{tipo.detalle}</small>
            </button>
          ))}
        </div>

        <div className="segmentado">
          {[["futbol", "Fútbol"], ["padel", "Pádel"]].map(([id, nombre]) => (
            <button type="button" key={id} disabled={bloqueado} className={datos.deporte === id ? "activo" : ""} onClick={() => cambiar("deporte", id)}>
              {nombre}
            </button>
          ))}
        </div>

        <div className="grilla-campos">
          <label className="campo">
            Nombre *
            <input value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} required maxLength={120} autoFocus placeholder="Copa de Verano" />
          </label>
          <label className="campo">
            Categoría
            <input value={datos.categoria} onChange={(e) => cambiar("categoria", e.target.value)} maxLength={60} placeholder="Libre, +35, 4ta..." />
          </label>
          <label className="campo">
            Empieza *
            <input type="date" value={datos.fecha_inicio} onChange={(e) => cambiar("fecha_inicio", e.target.value)} required />
          </label>
          <label className="campo">
            Termina
            <input type="date" value={datos.fecha_fin} min={datos.fecha_inicio} onChange={(e) => cambiar("fecha_fin", e.target.value)} />
          </label>
          <label className="campo">
            Cupo de {datos.deporte === "padel" ? "parejas" : "equipos"} *
            <input type="number" min="2" max="64" value={datos.cupo} onChange={(e) => cambiar("cupo", e.target.value)} required />
          </label>
          <label className="campo">
            Inscripción ($)
            <input type="number" min="0" step="500" value={datos.precio_inscripcion} onChange={(e) => cambiar("precio_inscripcion", e.target.value)} placeholder="0 = gratis" />
          </label>
        </div>
        <label className="campo">
          Premio
          <input value={datos.premio} onChange={(e) => cambiar("premio", e.target.value)} maxLength={150} />
        </label>
        <label className="campo">
          Descripción
          <textarea rows={3} value={datos.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} maxLength={500} placeholder="Días de juego, reglamento, etc." />
        </label>

        <div className="modal-acciones">
          <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="boton" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}
