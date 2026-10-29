import { useEffect, useRef, useState } from "react";
import { mensajeDeError } from "../service/api";
import { cambiarMiPassword } from "../service/complejoService";

// Formulario para que la persona logueada cambie su contraseña (pide la actual)
export default function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(null); // { mensaje, campo: "actual" | "nueva" }
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const campoActual = useRef(null);
  const campoNueva = useRef(null);
  const mensajeListo = useRef(null);

  // Al terminar, el foco pasa al mensaje de confirmación
  useEffect(() => {
    if (listo) mensajeListo.current?.focus();
  }, [listo]);

  const fallar = (mensaje, campo) => {
    setError({ mensaje, campo });
    (campo === "actual" ? campoActual : campoNueva).current?.focus();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setListo(false);
    if (!actual) return fallar("Escribí tu contraseña actual.", "actual");
    if (nueva.length < 8) return fallar("La contraseña nueva tiene que tener al menos 8 caracteres.", "nueva");
    if (nueva === actual) return fallar("La contraseña nueva tiene que ser distinta de la actual.", "nueva");
    setEnviando(true);
    setError(null);
    try {
      await cambiarMiPassword(actual, nueva);
      setActual("");
      setNueva("");
      setListo(true);
    } catch (err) {
      const mensaje = mensajeDeError(err, "No se pudo cambiar la contraseña.");
      fallar(mensaje, /actual/i.test(mensaje) ? "actual" : "nueva");
    } finally {
      setEnviando(false);
    }
  };

  const invalido = (campo) => (error?.campo === campo ? { "aria-invalid": true, "aria-describedby": "error-password" } : {});

  return (
    <form className="tarjeta form-cambio-password" onSubmit={enviar} noValidate>
      <p className="texto-suave sin-margen">
        Si el administrador te puso una contraseña nueva, cambiala acá por una que sepas solo vos.
      </p>
      {error && <p className="alerta" role="alert" id="error-password">{error.mensaje}</p>}
      {listo && (
        <p className="aviso-ok" role="status" tabIndex={-1} ref={mensajeListo}>
          Listo: tu contraseña cambió. La próxima vez ingresá con la nueva.
        </p>
      )}
      <div className="grilla-campos">
        <div className="campo">
          <label htmlFor="password-actual">Contraseña actual</label>
          <input
            id="password-actual"
            ref={campoActual}
            type={ver ? "text" : "password"}
            autoComplete="current-password"
            value={actual}
            onChange={(e) => {
              setActual(e.target.value);
              setError(null);
            }}
            {...invalido("actual")}
          />
        </div>
        <div className="campo">
          <label htmlFor="password-nueva">Contraseña nueva</label>
          <input
            id="password-nueva"
            ref={campoNueva}
            type={ver ? "text" : "password"}
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => {
              setNueva(e.target.value);
              setError(null);
            }}
            {...invalido("nueva")}
          />
          <small>Mínimo 8 caracteres.</small>
        </div>
      </div>
      <div className="acciones form-cambio-acciones">
        <button type="button" className="boton boton-fantasma" onClick={() => setVer(!ver)} aria-pressed={ver}>
          {ver ? "Ocultar contraseñas" : "Mostrar contraseñas"}
        </button>
        <button type="submit" className="boton" aria-disabled={enviando} aria-busy={enviando}>
          {enviando ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
