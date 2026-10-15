import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { avisoDeRol, destinoTrasIngresar, inicioDe, pideSesion, rutaInterna, tipoDeVuelta, useAuth } from "../context/auth";
import { iniciarSesion } from "../service/complejoService";
import { obtenerComplejo, obtenerTorneoPublico } from "../service/publicoService";
import { fechaCorta } from "../utils/formato";

// Qué estaba haciendo la persona antes de venir a ingresar, según ?volver=...
const leerVuelta = (volver) => {
  if (!volver) return { tipo: "" };
  const url = new URL(volver, window.location.origin);
  const complejo = url.pathname.match(/^\/complejos\/(\d+)$/);
  if (complejo && url.searchParams.get("cancha")) {
    return {
      tipo: "reserva",
      idComplejo: complejo[1],
      idCancha: url.searchParams.get("cancha"),
      fecha: url.searchParams.get("fecha"),
      hora: url.searchParams.get("hora")
    };
  }
  const torneo = url.pathname.match(/^\/torneos\/(\d+)$/);
  if (torneo) return { tipo: "torneo", idTorneo: torneo[1] };
  if (url.pathname.startsWith("/mis-reservas")) return { tipo: "mis-reservas" };
  if (url.pathname.startsWith("/panel")) return { tipo: "panel" };
  return { tipo: "otra" };
};

const TEXTOS = {
  reserva: ["Ingresá para terminar tu reserva", "Cuando ingreses volvés a este turno, si sigue libre."],
  torneo: ["Ingresá para inscribirte", "Cuando ingreses volvés al torneo para anotar a tu pareja o equipo."],
  "mis-reservas": ["Ingresá para ver tus reservas", "Tus turnos y torneos te esperan del otro lado."],
  panel: ["Ingresá a tu complejo", "Con el email y la contraseña con los que registraste el complejo."],
  "": ["Ingresá", "Con el email y la contraseña de tu cuenta, seas jugador o tengas un complejo."]
};

// Un mensaje claro para cada forma en que puede fallar el ingreso
const mensajeDeIngreso = (err) => {
  const estado = err.response?.status;
  if (!err.response) return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
  if (estado === 401) return "El email o la contraseña no coinciden. Revisalos y probá de nuevo.";
  if (estado === 403) return "Tu complejo está dado de baja. Pedile al administrador del sitio que lo reactive.";
  if (estado === 400) return err.response.data?.mensaje ?? "Completá el email y la contraseña.";
  return "Hubo un problema de nuestro lado. Probá de nuevo en un rato.";
};

export default function Ingresar() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const volver = rutaInterna(params.get("volver"));
  const vuelta = leerVuelta(volver);
  const [titulo, texto] = TEXTOS[vuelta.tipo] ?? TEXTOS[""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null); // { mensaje, campos: true si el problema es el email o la contraseña }
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [detalle, setDetalle] = useState(null); // datos del turno o del torneo, para mostrarlos
  const campoEmail = useRef(null);
  const campoPassword = useRef(null);

  useEffect(() => {
    document.title = "Ingresar · Reservas de Canchas";
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, []);

  // Nombre del complejo, la cancha o el torneo (son datos públicos); si falla, se muestra lo que hay en la URL
  const { tipo, idComplejo, idCancha, idTorneo } = vuelta;
  useEffect(() => {
    let vigente = true;
    if (tipo === "reserva") {
      obtenerComplejo(idComplejo)
        .then(({ data }) => {
          const cancha = data.canchas.find((c) => String(c.id_cancha) === idCancha);
          if (vigente) setDetalle({ complejo: data.nombre, cancha: cancha?.nombre });
        })
        .catch(() => {});
    }
    if (tipo === "torneo") {
      obtenerTorneoPublico(idTorneo)
        .then(({ data }) => vigente && setDetalle({ torneo: data.nombre, complejo: data.complejo }))
        .catch(() => {});
    }
    return () => {
      vigente = false;
    };
  }, [tipo, idComplejo, idCancha, idTorneo]);

  // Al corregir un campo, el error anterior ya no aplica
  const editar = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError(null);
  };

  // Las mismas reglas que el navegador, pero con el mensaje en español y anunciado igual que los demás
  const validar = () => {
    const limpio = email.trim();
    if (!limpio) return { campo: "email", mensaje: "Escribí tu email." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return { campo: "email", mensaje: "Ese email no parece válido: revisá que tenga @ y un dominio." };
    if (!password) return { campo: "password", mensaje: "Escribí tu contraseña." };
    return null;
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    setIntento(true);
    const falta = validar();
    if (falta) {
      setError({ mensaje: falta.mensaje, campos: false, campo: falta.campo });
      (falta.campo === "email" ? campoEmail : campoPassword).current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const { data } = await iniciarSesion(email.trim(), password);
      const destino = destinoTrasIngresar(data.usuario, search);
      const aviso =
        volver && destino !== volver && destino === inicioDe(data.usuario)
          ? { texto: avisoDeRol(data.usuario, volver), volver }
          : null;
      // El aviso viaja en la sesión: RutaPublica también redirige al ver la sesión nueva
      entrar(data, aviso);
      navigate(destino, { replace: true });
    } catch (err) {
      const deCampos = err.response?.status === 401;
      setError({ mensaje: mensajeDeIngreso(err), campos: deCampos });
      setEnviando(false);
      // Si el problema es el email o la contraseña, el foco va a la contraseña (lo más común) con el texto
      // seleccionado para reescribirla; si no, queda en el botón
      if (deCampos) {
        campoPassword.current?.focus();
        campoPassword.current?.select();
      }
    }
  };

  const conVolver = (ruta) => (volver ? `${ruta}?volver=${encodeURIComponent(volver)}` : ruta);

  // "Eventos del Centro · Fútbol 1 · vie 16/10 · 21:00"
  const resumenTurno = vuelta.tipo === "reserva"
    ? [detalle?.complejo, detalle?.cancha, vuelta.fecha && fechaCorta(vuelta.fecha).replace("-", "/"), vuelta.hora].filter(Boolean).join(" · ")
    : "";
  const resumenTorneo = vuelta.tipo === "torneo" && detalle ? [detalle.torneo, detalle.complejo].filter(Boolean).join(" · ") : "";

  return (
    <main className="contenedor pagina-auth">
      {/* noValidate: los errores se muestran con el mismo aviso que los del servidor, en español */}
      <form className="tarjeta formulario-auth" onSubmit={enviar} noValidate>
        {params.get("vencida") === "1" && !intento && (
          <p className="aviso" role="status">Tu sesión venció. Ingresá de nuevo para seguir donde estabas.</p>
        )}
        <span className="auth-marca" aria-hidden="true">
          <span className="mini-dibujo mini-futbol" />
          <span className="mini-dibujo mini-padel" />
        </span>
        <h1>{titulo}</h1>
        {(resumenTurno || resumenTorneo) && (
          <p className="auth-turno">
            <span className="solo-lectores">{resumenTurno ? "Tu turno: " : "Torneo: "}</span>
            {resumenTurno || resumenTorneo}
          </p>
        )}
        <p className="texto-suave">{texto}</p>
        {/* Solo si esa página se puede ver sin cuenta: si pide sesión, volver traería de nuevo acá */}
        {volver && !pideSesion(tipoDeVuelta(volver)) && (
          <Link to={volver} className="volver auth-volver">← Volver sin ingresar</Link>
        )}

        {error && (
          <p className="alerta" role="alert" id="error-ingreso">{error.mensaje}</p>
        )}

        <label className="campo" htmlFor="ingreso-email">
          Email
          <input
            id="ingreso-email"
            ref={campoEmail}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={editar(setEmail)}
            readOnly={enviando}
            aria-invalid={error?.campos || error?.campo === "email" || undefined}
            aria-describedby={error?.campos || error?.campo === "email" ? "error-ingreso" : undefined}
            required
            autoFocus
          />
        </label>
        {/* El botón "Mostrar" queda fuera del label: si no, se sumaría al nombre del campo
            ("Contraseña Mostrar contraseña") */}
        <div className="campo">
          <label htmlFor="ingreso-password">Contraseña</label>
          <span className="campo-con-boton">
            <input
              id="ingreso-password"
              ref={campoPassword}
              type={verPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              value={password}
              onChange={editar(setPassword)}
              readOnly={enviando}
              aria-invalid={error?.campos || error?.campo === "password" || undefined}
              aria-describedby={error?.campos || error?.campo === "password" ? "error-ingreso" : undefined}
              required
            />
            <button
              type="button"
              className="campo-boton"
              aria-controls="ingreso-password"
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setVerPassword(!verPassword)}
            >
              {verPassword ? "Ocultar" : "Mostrar"}
            </button>
          </span>
        </div>

        <details className="olvido">
          <summary>¿Olvidaste tu contraseña?</summary>
          <p>
            Pedile al administrador del sitio que te ponga una contraseña nueva; puede hacerlo tanto para
            jugadores como para complejos. Después la podés usar para ingresar acá.
          </p>
        </details>

        {/* aria-disabled en lugar de disabled: así el botón no pierde el foco si el ingreso falla */}
        <button type="submit" className="boton boton-grande boton-ancho" aria-disabled={enviando} aria-busy={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>

        <div className="auth-registro">
          <p>
            ¿Jugás y no tenés cuenta? <Link to={conVolver("/registro-cliente")}>Creá tu cuenta</Link>
          </p>
          <p>
            ¿Tenés un complejo? <Link to={conVolver("/registro")}>Registralo</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
