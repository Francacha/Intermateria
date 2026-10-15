import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clavePrimerosPasos, conVuelta, useAuth } from "../context/auth";
import { registrarEmpresa } from "../service/complejoService";
import { cuitValido, formatearCuit } from "../utils/formato";

const DEPORTES = [
  { id: "futbol", nombre: "Fútbol", detalle: "5, 7 u 11 jugadores" },
  { id: "padel", nombre: "Pádel", detalle: "Canchas de 4 jugadores" }
];
const TAMANOS_FUTBOL = [5, 7, 11];
const MAX_CANCHAS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El mensaje del servidor dice qué campo falló: se muestra al lado de ese campo
const campoDelError = (mensaje) => {
  if (/obligatorios/i.test(mensaje)) return "";
  if (/CUIT/i.test(mensaje)) return "cuit";
  if (/email/i.test(mensaje)) return "email";
  if (/contraseña/i.test(mensaje)) return "password";
  if (/canchas|fútbol|pádel/i.test(mensaje)) return "deportes";
  return "";
};

export default function Registro() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [datos, setDatos] = useState({ nombre: "", cuit: "", email: "", password: "", telefono: "", direccion: "" });
  // Por deporte: si lo maneja, cuántas canchas, a qué precio y (fútbol) de cuántos jugadores.
  // Al destildar un deporte se recuerda lo cargado, por si lo vuelve a tildar.
  const [canchas, setCanchas] = useState({
    futbol: { activo: false, cantidad: 1, precio: "", jugadores: 5 },
    padel: { activo: false, cantidad: 1, precio: "" }
  });
  const [errores, setErrores] = useState({}); // { campo: mensaje } para los errores de cada campo
  const [error, setError] = useState(""); // error general, junto al botón
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(false); // después del primer envío, los avisos se marcan
  const avisoGeneral = useRef(null);

  useEffect(() => {
    document.title = "Registrá tu complejo · Reservas de Canchas";
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, []);

  // Si el error es general, se lo lleva a la vista (en el celular puede quedar fuera de pantalla)
  useEffect(() => {
    if (error) avisoGeneral.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);

  const limpiarError = (campo) => {
    if (errores[campo]) setErrores({ ...errores, [campo]: "" });
    if (error) setError("");
  };

  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos({ ...datos, [name]: name === "cuit" ? formatearCuit(value) : value });
    limpiarError(name);
  };

  const cambiarCancha = (id, campo, valor) => {
    setCanchas({ ...canchas, [id]: { ...canchas[id], [campo]: valor } });
    if (campo === "activo") {
      // Al tildar o destildar un deporte, sus errores anteriores ya no aplican
      setErrores({ ...errores, deportes: "", [`cantidad-${id}`]: "", [`precio-${id}`]: "" });
      if (error) setError("");
    } else {
      limpiarError(campo === "cantidad" ? `cantidad-${id}` : campo === "precio" ? `precio-${id}` : "deportes");
    }
  };

  const cantidadDe = (id) => (canchas[id].activo ? Number(canchas[id].cantidad) || 0 : 0);
  // El botón muestra un total posible (entre 1 y 30 por deporte), aunque se esté escribiendo un número raro
  const enRango = (id) =>
    canchas[id].activo ? Math.min(MAX_CANCHAS, Math.max(1, Math.floor(Number(canchas[id].cantidad) || 1))) : 0;
  const total = enRango("futbol") + enRango("padel");

  // Las mismas reglas que el servidor, con el mensaje al lado de cada campo
  const validar = () => {
    const nuevos = {};
    if (!canchas.futbol.activo && !canchas.padel.activo) nuevos.deportes = "Elegí al menos un deporte: fútbol, pádel o los dos.";
    for (const { id } of DEPORTES) {
      const n = Number(canchas[id].cantidad);
      if (canchas[id].activo && !(Number.isInteger(n) && n >= 1 && n <= MAX_CANCHAS)) {
        nuevos[`cantidad-${id}`] = `Entre 1 y ${MAX_CANCHAS} canchas.`;
      }
      if (canchas[id].activo && canchas[id].precio !== "" && !(Number(canchas[id].precio) >= 0)) {
        nuevos[`precio-${id}`] = "El precio no puede ser negativo.";
      }
    }
    if (!datos.nombre.trim()) nuevos.nombre = "Escribí el nombre del complejo.";
    if (!datos.cuit) nuevos.cuit = "Escribí el CUIT del complejo.";
    else if (!cuitValido(datos.cuit)) nuevos.cuit = "El CUIT no es válido: revisá los 11 números.";
    if (!datos.email.trim()) nuevos.email = "Escribí el email con el que vas a ingresar.";
    else if (!EMAIL.test(datos.email.trim())) nuevos.email = "Ese email no parece válido: revisá que tenga @ y un dominio.";
    if (datos.password.length < 8) nuevos.password = "La contraseña tiene que tener al menos 8 caracteres.";
    return nuevos;
  };

  // El foco va al primer campo con error, para corregirlo directamente
  const enfocar = (campo) => {
    const id = campo === "deportes" ? "deporte-futbol" : /^(cantidad|precio)-/.test(campo) ? campo : `registro-${campo}`;
    document.getElementById(id)?.focus();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setIntento(true);
    const nuevos = validar();
    const primero = Object.keys(nuevos)[0];
    setErrores(nuevos);
    if (primero) {
      enfocar(primero);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await registrarEmpresa({
        ...datos,
        email: datos.email.trim(),
        canchas: {
          futbol: cantidadDe("futbol"),
          padel: cantidadDe("padel"),
          precio_futbol: Number(canchas.futbol.precio) || 0,
          precio_padel: Number(canchas.padel.precio) || 0,
          jugadores_futbol: canchas.futbol.jugadores
        }
      });
      try {
        localStorage.setItem(clavePrimerosPasos(data.usuario.id_empresa), "pendiente");
      } catch {
        // sin almacenamiento: el panel no muestra los primeros pasos
      }
      entrar(data);
      navigate("/panel", { replace: true });
    } catch (err) {
      setEnviando(false);
      if (!err.response) return setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      if (err.response.status >= 500) return setError("Hubo un problema de nuestro lado. Probá de nuevo en un rato.");
      const mensaje = err.response.data?.mensaje ?? "No se pudo registrar el complejo.";
      const campo = campoDelError(mensaje);
      if (!campo) return setError(mensaje);
      // Los duplicados ofrecen una salida: ingresar con esa cuenta
      const ingresar = { to: conVuelta("/ingresar", pathname, search), texto: "Ingresá" };
      const texto = /email ya está registrado/i.test(mensaje)
        ? { texto: "Ese email ya está registrado. Si es tu cuenta de jugador, usá otro email para el complejo. Si ya registraste el complejo:", enlace: ingresar }
        : /CUIT/i.test(mensaje) && /registrado/i.test(mensaje)
          ? { texto: "Ya hay un complejo registrado con ese CUIT. Si es el tuyo:", enlace: ingresar, despues: "Si no, pedile al administrador del sitio que lo revise." }
          : mensaje;
      setErrores({ [campo]: texto });
      enfocar(campo);
    }
  };

  // Propiedades de un campo con su posible error (marcado y descripto para el lector de pantalla)
  const conError = (campo, ayuda) => {
    const describe = [errores[campo] && `error-${campo}`, ayuda].filter(Boolean).join(" ");
    return { "aria-invalid": Boolean(errores[campo]) || undefined, "aria-describedby": describe || undefined };
  };
  // El error puede ser un texto o { texto, enlace: { to, texto }, despues }
  const mensajeError = (campo) => {
    const e = errores[campo];
    if (!e) return null;
    return (
      <small className="campo-error" id={`error-${campo}`}>
        {typeof e === "string" ? e : (
          <>
            {e.texto} <Link to={e.enlace.to}>{e.enlace.texto}</Link>.{e.despues && ` ${e.despues}`}
          </>
        )}
      </small>
    );
  };

  return (
    <main className="contenedor pagina-auth">
      {/* noValidate: los errores se muestran al lado de cada campo, en español */}
      <form className="tarjeta formulario-registro" onSubmit={enviar} noValidate>
        <span className="auth-marca" aria-hidden="true">
          <span className="mini-dibujo mini-futbol" />
          <span className="mini-dibujo mini-padel" />
        </span>
        <h1>Registrá tu complejo</h1>
        <p className="texto-suave">
          En un minuto tenés tu panel listo. Después podés ajustar cada cancha, los horarios y los precios.
        </p>

        <h2 className="subtitulo" id="titulo-deportes">1. ¿Qué canchas manejás?</h2>
        <div
          className={`deportes ${errores.deportes ? "con-error" : ""}`}
          role="group"
          aria-labelledby="titulo-deportes"
          aria-describedby={errores.deportes ? "error-deportes" : undefined}
        >
          {DEPORTES.map((deporte) => {
            const actual = canchas[deporte.id];
            const elegido = actual.activo;
            return (
              <div key={deporte.id} className={`deporte deporte-${deporte.id} ${elegido ? "elegido" : ""}`}>
                <button
                  type="button"
                  id={`deporte-${deporte.id}`}
                  className="deporte-cabecera"
                  aria-pressed={elegido}
                  autoFocus={deporte.id === "futbol"}
                  onClick={() => cambiarCancha(deporte.id, "activo", !elegido)}
                >
                  <span className={`icono-deporte icono-${deporte.id}`} aria-hidden="true" />
                  <span>
                    <strong>{deporte.nombre}</strong>
                    <small>{deporte.detalle}</small>
                  </span>
                  <span className="check" aria-hidden="true">{elegido ? "✓" : ""}</span>
                </button>
                {elegido && (
                  <div className="deporte-detalle">
                    {/* Contador: botones y un número que también se puede escribir */}
                    <div className="campo">
                      <span id={`titulo-cantidad-${deporte.id}`}>Cantidad de canchas</span>
                      <div className="contador" role="group" aria-labelledby={`titulo-cantidad-${deporte.id}`}>
                        <button
                          type="button"
                          aria-label={`Quitar una cancha de ${deporte.nombre.toLowerCase()}`}
                          onClick={() => cambiarCancha(deporte.id, "cantidad", Math.max(1, (Number(actual.cantidad) || 1) - 1))}
                        >
                          −
                        </button>
                        <input
                          id={`cantidad-${deporte.id}`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={MAX_CANCHAS}
                          value={actual.cantidad}
                          aria-labelledby={`titulo-cantidad-${deporte.id}`}
                          readOnly={enviando}
                          onChange={(e) => cambiarCancha(deporte.id, "cantidad", e.target.value === "" ? "" : Number(e.target.value))}
                          {...conError(`cantidad-${deporte.id}`, `ayuda-cantidad-${deporte.id}`)}
                        />
                        <button
                          type="button"
                          aria-label={`Agregar una cancha de ${deporte.nombre.toLowerCase()}`}
                          onClick={() => cambiarCancha(deporte.id, "cantidad", Math.min(MAX_CANCHAS, (Number(actual.cantidad) || 0) + 1))}
                        >
                          +
                        </button>
                      </div>
                      <small id={`ayuda-cantidad-${deporte.id}`}>Hasta {MAX_CANCHAS} canchas por deporte.</small>
                      {mensajeError(`cantidad-${deporte.id}`)}
                    </div>

                    {deporte.id === "futbol" && (
                      <div className="campo">
                        <span id="titulo-tamano">Tamaño</span>
                        <div className="segmentado tamano-futbol" role="group" aria-labelledby="titulo-tamano">
                          {TAMANOS_FUTBOL.map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={actual.jugadores === n ? "activo" : ""}
                              aria-pressed={actual.jugadores === n}
                              onClick={() => cambiarCancha("futbol", "jugadores", n)}
                            >
                              Fútbol {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="campo">
                      <label htmlFor={`precio-${deporte.id}`}>Precio por hora ($)</label>
                      <input
                        id={`precio-${deporte.id}`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        placeholder="Ej: 25000"
                        value={actual.precio}
                        readOnly={enviando}
                        onChange={(e) => cambiarCancha(deporte.id, "precio", e.target.value)}
                        {...conError(`precio-${deporte.id}`, `ayuda-precio-${deporte.id}`)}
                      />
                      <small id={`ayuda-precio-${deporte.id}`} className={intento && actual.precio === "" ? "campo-aviso" : ""}>
                        {actual.precio === ""
                          ? "Opcional: si lo dejás vacío, los jugadores verán $0 hasta que lo cargues."
                          : "Es el mismo para todas; después podés cambiarlo cancha por cancha."}
                      </small>
                      {mensajeError(`precio-${deporte.id}`)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {mensajeError("deportes")}

        <h2 className="subtitulo">2. Datos del complejo</h2>
        <div className="grilla-campos">
          <div className="campo">
            <label htmlFor="registro-nombre">Nombre del complejo *</label>
            <input
              id="registro-nombre"
              name="nombre"
              value={datos.nombre}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={150}
              autoComplete="organization"
              {...conError("nombre")}
            />
            {mensajeError("nombre")}
          </div>
          <div className="campo">
            <label htmlFor="registro-cuit">CUIT *</label>
            <input
              id="registro-cuit"
              name="cuit"
              value={datos.cuit}
              onChange={cambiar}
              readOnly={enviando}
              inputMode="numeric"
              autoComplete="off"
              maxLength={13}
              placeholder="Ej: 30-12345678-1"
              {...conError("cuit", "ayuda-cuit")}
            />
            <small id="ayuda-cuit">Los 11 números; está en tu constancia de AFIP/ARCA.</small>
            {mensajeError("cuit")}
          </div>
          <div className="campo">
            <label htmlFor="registro-telefono">Teléfono</label>
            <input
              id="registro-telefono"
              name="telefono"
              type="tel"
              value={datos.telefono}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={30}
              autoComplete="tel"
            />
          </div>
          <div className="campo">
            <label htmlFor="registro-direccion">Dirección</label>
            <input
              id="registro-direccion"
              name="direccion"
              value={datos.direccion}
              onChange={cambiar}
              readOnly={enviando}
              maxLength={200}
              autoComplete="street-address"
            />
          </div>
        </div>

        <h2 className="subtitulo">3. Tu cuenta</h2>
        <div className="grilla-campos">
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
            <small id="ayuda-email">Con este email ingresás al panel del complejo.</small>
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
          {enviando
            ? "Registrando…"
            : `Registrar complejo${total ? ` con ${total} cancha${total > 1 ? "s" : ""}` : ""}`}
        </button>

        <div className="auth-registro">
          <p>
            ¿Ya registraste el complejo? <Link to={conVuelta("/ingresar", pathname, search)}>Ingresá</Link>
          </p>
          <p>
            ¿Sos jugador? <Link to={conVuelta("/registro-cliente", pathname, search)}>Creá tu cuenta de jugador</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
