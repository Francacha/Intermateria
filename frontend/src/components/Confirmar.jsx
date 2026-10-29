import { useEffect, useRef, useState } from "react";
import { mensajeDeError } from "../service/api";

// Para comparar lo escrito con el nombre: sin tildes, mayúsculas, puntuación (comillas, rayas) ni espacios de más
const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();

// Diálogo para confirmar una acción importante (dar de baja, eliminar).
// Si se pasa confirmarCon, hay que escribir ese texto (por ejemplo, el nombre) para habilitar el botón.
export default function Confirmar({ titulo, children, textoBoton, textoCancelar = "Cancelar", peligro = false, confirmarCon, onConfirmar, onCerrar }) {
  const [escrito, setEscrito] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ventana = useRef(null);
  const botonCancelar = useRef(null);
  const campo = useRef(null);

  // onCerrar cambia en cada render del padre; el ref evita reiniciar el diálogo por eso
  const cerrar = useRef(onCerrar);
  const ocupado = useRef(false);
  useEffect(() => {
    cerrar.current = onCerrar;
    ocupado.current = enviando;
  });

  // Al abrir, el foco va a Cancelar (o al campo a escribir); Tab no se escapa; Escape cierra; al cerrar, vuelve
  useEffect(() => {
    const anterior = document.activeElement;
    (campo.current ?? botonCancelar.current)?.focus();
    const teclas = (e) => {
      if (e.key === "Escape" && !ocupado.current) return cerrar.current();
      if (e.key !== "Tab" || !ventana.current) return;
      const enfocables = [...ventana.current.querySelectorAll("button, input")];
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero?.focus();
      }
    };
    document.addEventListener("keydown", teclas);
    return () => {
      document.removeEventListener("keydown", teclas);
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  const coincide = !confirmarCon || normalizar(escrito) === normalizar(confirmarCon);

  const confirmar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!coincide) {
      setError("El nombre no coincide. No hace falta respetar tildes, mayúsculas ni signos.");
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await onConfirmar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo completar. Probá de nuevo."));
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={() => !enviando && onCerrar()}>
      <form
        ref={ventana}
        className="tarjeta modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-texto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={confirmar}
        noValidate
      >
        <h2 id="confirmar-titulo">{titulo}</h2>
        <div id="confirmar-texto" className="confirmar-texto">{children}</div>
        {confirmarCon && (
          <div className="campo">
            <label htmlFor="confirmar-campo">
              Para confirmar, escribí el nombre: <strong>{confirmarCon}</strong>
            </label>
            <input
              id="confirmar-campo"
              ref={campo}
              value={escrito}
              readOnly={enviando}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setEscrito(e.target.value);
                setError("");
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby="confirmar-ayuda"
            />
            <small id="confirmar-ayuda">No hace falta respetar tildes, mayúsculas ni signos.</small>
          </div>
        )}
        {error && <p className="alerta" role="alert">{error}</p>}
        <div className="modal-acciones">
          <button type="button" ref={botonCancelar} className="boton boton-fantasma" onClick={() => !enviando && onCerrar()} aria-disabled={enviando}>
            {textoCancelar}
          </button>
          <button
            type="submit"
            className={`boton ${peligro ? "boton-peligro" : ""}`}
            aria-disabled={enviando || !coincide}
            aria-busy={enviando}
          >
            {enviando ? "Un momento…" : textoBoton}
          </button>
        </div>
      </form>
    </div>
  );
}
