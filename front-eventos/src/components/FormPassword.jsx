import { useRef, useState } from "react";
import { mensajeDeError } from "../service/api";

// Contraseña nueva que pone el administrador (para un jugador o un complejo).
// Se ve mientras se escribe para poder dictarla.
export default function FormPassword({ id, nombre, onGuardar, onCancelar, onListo, children }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campo = useRef(null);

  const guardar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await onGuardar(password);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cambiar la contraseña."));
      setEnviando(false);
      campo.current?.focus();
    }
  };

  return (
    <form
      className="form-password"
      onSubmit={guardar}
      noValidate
      onKeyDown={(e) => {
        if (e.key === "Escape" && !enviando) onCancelar();
      }}
    >
      <label className="campo" htmlFor={id}>
        Contraseña nueva para {nombre}
        <input
          id={id}
          ref={campo}
          type="text"
          autoComplete="new-password"
          spellCheck={false}
          autoCapitalize="none"
          value={password}
          readOnly={enviando}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-ayuda`}
          autoFocus
        />
        <small id={`${id}-ayuda`} className={error ? "campo-error" : ""} role={error ? "alert" : undefined}>
          {error || "Mínimo 8 caracteres. Se ve mientras la escribís para que puedas dictarla."}
        </small>
      </label>
      {children}
      <div className="acciones">
        <button type="button" className="boton boton-fantasma" onClick={() => !enviando && onCancelar()}>Cancelar</button>
        <button type="submit" className="boton" aria-disabled={enviando} aria-busy={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
