import { useState } from "react";

const SUPERFICIES = {
  futbol: ["sintetico", "cesped", "cemento"],
  padel: ["blindex", "cemento", "sintetico"]
};
const JUGADORES = { futbol: [5, 7, 11], padel: [4] };

// Formulario para crear o editar una cancha (cancha = null → nueva)
export default function CanchaModal({ cancha, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState({
    nombre: cancha?.nombre ?? "",
    deporte: cancha?.deporte ?? "futbol",
    jugadores: cancha?.jugadores ?? 5,
    superficie: cancha?.superficie ?? "sintetico",
    techada: cancha?.techada ?? false,
    precio_hora: cancha ? Number(cancha.precio_hora) : ""
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });

  const cambiarDeporte = (deporte) =>
    setDatos({ ...datos, deporte, jugadores: JUGADORES[deporte][0], superficie: SUPERFICIES[deporte][0] });

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ ...datos, jugadores: Number(datos.jugadores), precio_hora: Number(datos.precio_hora) || 0 });
    } catch (mensaje) {
      setError(mensaje);
      setGuardando(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal" onSubmit={enviar} onClick={(e) => e.stopPropagation()}>
        <h2>{cancha ? "Editar cancha" : "Nueva cancha"}</h2>
        {error && <p className="alerta">{error}</p>}

        <div className="segmentado">
          {["futbol", "padel"].map((d) => (
            <button
              type="button"
              key={d}
              className={datos.deporte === d ? "activo" : ""}
              onClick={() => cambiarDeporte(d)}
            >
              {d === "futbol" ? "Fútbol" : "Pádel"}
            </button>
          ))}
        </div>

        <label className="campo">
          Nombre
          <input value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} required maxLength={100} autoFocus />
        </label>
        <div className="grilla-campos">
          <label className="campo">
            Jugadores
            <select value={datos.jugadores} onChange={(e) => cambiar("jugadores", e.target.value)}>
              {JUGADORES[datos.deporte].map((j) => (
                <option key={j} value={j}>{datos.deporte === "padel" ? "4 (dobles)" : `Fútbol ${j}`}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Superficie
            <select value={datos.superficie} onChange={(e) => cambiar("superficie", e.target.value)}>
              {SUPERFICIES[datos.deporte].map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Precio por hora ($)
            <input type="number" min="0" step="500" value={datos.precio_hora} onChange={(e) => cambiar("precio_hora", e.target.value)} required />
          </label>
          <label className="campo campo-check">
            <input type="checkbox" checked={datos.techada} onChange={(e) => cambiar("techada", e.target.checked)} />
            Techada
          </label>
        </div>

        <div className="modal-acciones">
          <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="boton" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}
