import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { conVuelta, destinoTrasIngresar, useAuth } from "../context/auth";
import { registrarCliente } from "../service/clienteService";

const CAMPOS = ["nombre", "apellido", "telefono", "email", "password"];

// El mensaje del servidor dice qué campo falló: se muestra al lado de ese campo
const campoDelError = (mensaje) => {
  if (/obligatorios/i.test(mensaje)) return "";
  if (/email/i.test(mensaje)) return "email";
  if (/contraseña/i.test(mensaje)) return "password";
  return "";
};

// Registro de jugadores: con la cuenta pueden reservar turnos e inscribir equipos
export default function RegistroCliente() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [datos, setDatos] = useState({ nombre: "", apellido: "", telefono: "", email: "", password: "" });
  const [errores, setErrores] = useState({}); // { campo: mensaje } para los errores de cada campo
  const [error, setError] = useState(""); // error general, junto al botón
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const avisoGeneral = useRef(null);

  useEffect(() => {
    document.title = "Creá tu cuenta · Reservas de Canchas";
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, []);

  // Si el error es general, se lo lleva a la vista (en el celular puede quedar fuera de pantalla)
  useEffect(() => {
    if (error) avisoGeneral.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
    if (errores[e.target.name]) setErrores({ ...errores, [e.target.name]: "" });
    if (error) setError("");
  };

  const validar = () => {
    const nuevos = {};
    if (!datos.nombre.trim()) nuevos.nombre = "Escribí tu nombre.";
    if (!datos.apellido.trim()) nuevos.apellido = "Escribí tu apellido.";
    if (!datos.telefono.trim()) nuevos.telefono = "Escribí un teléfono: el complejo lo usa si tiene que avisarte algo del turno.";
    if (!datos.email.trim()) nuevos.email = "Escribí tu email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) nuevos.email = "El email no es válido: revisá que tenga @ y el dominio.";
    if (datos.password.length < 8) nuevos.password = "La contraseña tiene que tener al menos 8 caracteres.";
    return nuevos;
  };

  const enfocar = (campo) => document.getElementById(`registro-${campo}`)?.focus();

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    const nuevos = validar();
    setErrores(nuevos);
    const primero = CAMPOS.find((c) => nuevos[c]);
    if (primero) {
      enfocar(primero);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await registrarCliente({ ...datos, email: datos.email.trim() });
      entrar(data);
      navigate(destinoTrasIngresar(data.usuario, search), { replace: true });
    } catch (err) {
      setEnviando(false);
      if (!err.response) return setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      if (err.response.status >= 500) return setError("Hubo un problema de nuestro lado. Probá de nuevo en un rato.");
      const mensaje = err.response.data?.mensaje ?? "No se pudo crear la cuenta.";
      const campo = campoDelError(mensaje);
      if (!campo) return setError(mensaje);
      // Email duplicado: la salida es ingresar con esa cuenta
      const texto = /ya está registrado/i.test(mensaje)
        ? { texto: "Ese email ya tiene una cuenta. Si es tuya:", enlace: { to: conVuelta("/ingresar", pathname, search), texto: "Ingresá" } }
        : mensaje;
      setErrores({ [campo]: texto });
      enfocar(campo);
    }
  };

  // aria-invalid y la descripción (ayuda + error) de cada campo
  const conError = (campo, ayuda) => {
    const ids = [ayuda, errores[campo] && `error-${campo}`].filter(Boolean).join(" ");
    return { "aria-invalid": Boolean(errores[campo]) || undefined, "aria-describedby": ids || undefined };
  };

  // El error puede ser un texto o { texto, enlace: { to, texto } }
  const mensajeError = (campo) => {
    const e = errores[campo];
    if (!e) return null;
    return (
      <small className="campo-error" id={`error-${campo}`}>
        {typeof e === "string" ? e : (
          <>
            {e.texto} <Link to={e.enlace.to}>{e.enlace.texto}</Link>.
          </>
        )}
      </small>
    );
  };

  return (
    <main className="contenedor pagina-auth">
      {/* noValidate: los errores se muestran al lado de cada campo, en español */}
      <form className="tarjeta formulario-registro formulario-mediano" onSubmit={enviar} noValidate>
        <span className="auth-marca" aria-hidden="true">
          <span className="mini-dibujo mini-futbol" />
          <span className="mini-dibujo mini-padel" />
        </span>
        <h1>Creá tu cuenta</h1>
        <p className="texto-suave">Reservá canchas de fútbol y pádel en todos los complejos y anotate en torneos.</p>

        <div className="grilla-campos">
          <div className="campo">
            <label htmlFor="registro-nombre">Nombre *</label>
            <input
              id="registro-nombre"
              name="nombre"
              value={datos.nombre}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={100}
              autoComplete="given-name"
              autoFocus
              {...conError("nombre")}
            />
            {mensajeError("nombre")}
          </div>
          <div className="campo">
            <label htmlFor="registro-apellido">Apellido *</label>
            <input
              id="registro-apellido"
              name="apellido"
              value={datos.apellido}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={100}
              autoComplete="family-name"
              {...conError("apellido")}
            />
            {mensajeError("apellido")}
          </div>
          <div className="campo">
            <label htmlFor="registro-telefono">Teléfono *</label>
            <input
              id="registro-telefono"
              name="telefono"
              type="tel"
              value={datos.telefono}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={30}
              autoComplete="tel"
              placeholder="Ej: 351 555-1234"
              {...conError("telefono")}
            />
            {mensajeError("telefono")}
          </div>
          <div className="campo">
            <label htmlFor="registro-email">Email *</label>
            <input
              id="registro-email"
              name="email"
              type="email"
              value={datos.email}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={150}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              {...conError("email", "ayuda-email")}
            />
            <small id="ayuda-email">Con este email ingresás para reservar.</small>
            {mensajeError("email")}
          </div>
          <div className="campo">
            <label htmlFor="registro-password">Contraseña *</label>
            <span className="campo-con-boton">
              <input
                id="registro-password"
                name="password"
                type={verPassword ? "text" : "password"}
                value={datos.password}
                onChange={cambiar}
                readOnly={enviando}
                autoComplete="new-password"
                {...conError("password", "ayuda-password")}
              />
              <button
                type="button"
                className="campo-boton"
                aria-controls="registro-password"
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVerPassword(!verPassword)}
              >
                {verPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            <small id="ayuda-password">Mínimo 8 caracteres.</small>
            {mensajeError("password")}
          </div>
        </div>
        <p className="texto-suave campos-obligatorios">* Obligatorio</p>

        {error && <p className="alerta" role="alert" ref={avisoGeneral}>{error}</p>}
        {/* Errores de campo: además de marcarlos, se anuncia que hay que revisarlos */}
        <p className="solo-lectores" role="alert">
          {Object.values(errores).some(Boolean) ? "Revisá los campos marcados." : ""}
        </p>

        {/* aria-disabled en lugar de disabled: así el botón no pierde el foco si el registro falla */}
        <button type="submit" className="boton boton-grande boton-ancho" aria-disabled={enviando} aria-busy={enviando}>
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </button>

        <div className="auth-registro">
          <p>
            ¿Ya tenés cuenta? <Link to={conVuelta("/ingresar", pathname, search)}>Ingresá</Link>
          </p>
          <p>
            ¿Tenés un complejo? <Link to={conVuelta("/registro", pathname, search)}>Registralo acá</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
