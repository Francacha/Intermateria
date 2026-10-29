import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Confirmar from "../components/Confirmar";
import { Cargando, ConError } from "../components/Estados";
import { crearEmpresa, actualizarEmpresa, eliminarEmpresa, obtenerEmpresa } from "../service/empresasService";
import useCarga from "../service/useCarga";
import { cuitValido, formatearCuit } from "../utils/formato";

const vacio = { nombre: "", cuit: "", email: "", telefono: "", direccion: "", password: "", activo: true };
const ORDEN = ["nombre", "cuit", "telefono", "direccion", "email", "password"];

// El mensaje del servidor dice qué campo falló: se muestra al lado de ese campo
const campoDelError = (mensaje) => {
  if (/obligatorios/i.test(mensaje)) return "";
  if (/CUIT/i.test(mensaje)) return "cuit";
  if (/email/i.test(mensaje)) return "email";
  if (/contraseña/i.test(mensaje)) return "password";
  return "";
};

const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// "6 canchas, 142 turnos y 2 torneos" (solo lo que tiene); null si no tiene nada
const actividad = (c) => {
  const partes = [
    [c.canchas, "cancha", "canchas"],
    [c.turnos, "turno", "turnos"],
    [c.torneos, "torneo", "torneos"]
  ]
    .filter(([n]) => n > 0)
    .map(([n, uno, varios]) => cuenta(n, uno, varios));
  if (partes.length === 0) return null;
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
};

// Alta y edición de un complejo (administrador)
export default function EmpresasForm() {
  const { id } = useParams();
  const consultar = useCallback(() => obtenerEmpresa(id), [id]);
  const { datos, error, reintentar } = useCarga(consultar, "No pudimos traer el complejo.", Boolean(id));

  useEffect(() => {
    document.title = `${id ? "Editar complejo" : "Nuevo complejo"} · Reservas de Canchas`;
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, [id]);

  if (!id) return <Formulario />;
  if (error) {
    const noExiste = /no encontrado/i.test(error);
    return (
      <main className="contenedor pagina-auth">
        <div className="tarjeta formulario-registro">
          <h1>Editar complejo</h1>
          {noExiste ? (
            <>
              <p role="alert">No encontramos ese complejo. Puede que lo hayan eliminado.</p>
              <Link className="boton boton-fantasma alinear-inicio" to="/admin">Volver a complejos</Link>
            </>
          ) : (
            <ConError mensaje={error} onReintentar={reintentar} />
          )}
        </div>
      </main>
    );
  }
  if (!datos) {
    return (
      <main className="contenedor pagina-auth">
        <div className="tarjeta formulario-registro">
          <h1>Editar complejo</h1>
          <Cargando filas={3} etiqueta="Cargando el complejo" />
        </div>
      </main>
    );
  }
  // key: si cambia el id, el formulario arranca de nuevo con esos datos
  return <Formulario key={datos.id_empresa} original={datos} />;
}

function Formulario({ original }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const volverA = `/admin${state?.desde ?? ""}`;
  const editando = Boolean(original);
  const [inicial] = useState(() =>
    original
      ? {
          ...vacio,
          nombre: original.nombre,
          cuit: formatearCuit(original.cuit),
          email: original.email ?? "",
          telefono: original.telefono ?? "",
          direccion: original.direccion ?? ""
        }
      : vacio
  );
  const [datos, setDatos] = useState(inicial);
  const [saliendo, setSaliendo] = useState(false); // diálogo de cambios sin guardar
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const avisoGeneral = useRef(null);

  useEffect(() => {
    if (error) avisoGeneral.current?.focus();
  }, [error]);

  const sinGuardar = !enviando && JSON.stringify(datos) !== JSON.stringify(inicial);

  // Recargar o cerrar la pestaña con cambios sin guardar: el navegador pregunta
  useEffect(() => {
    if (!sinGuardar) return;
    const avisar = (e) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sinGuardar]);

  // Cancelar o Volver con cambios sin guardar: se pregunta antes de descartarlos
  const salir = (e) => {
    if (!sinGuardar) return;
    e.preventDefault();
    setSaliendo(true);
  };

  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos({ ...datos, [name]: name === "cuit" ? formatearCuit(value) : value });
    if (errores[name]) setErrores({ ...errores, [name]: "" });
    if (error) setError("");
  };

  const validar = () => {
    const nuevos = {};
    if (!datos.nombre.trim()) nuevos.nombre = "Escribí el nombre del complejo.";
    if (!datos.cuit.trim()) nuevos.cuit = "Escribí el CUIT del complejo.";
    else if (!cuitValido(datos.cuit)) nuevos.cuit = "El CUIT no es válido: revisá los 11 números.";
    const email = datos.email.trim();
    if (editando && original.email && !email) nuevos.email = "Si lo dejás vacío, el complejo no puede ingresar. Escribí un email.";
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nuevos.email = "El email no es válido: revisá que tenga @ y el dominio.";
    if (!editando && datos.password) {
      if (datos.password.length < 8) nuevos.password = "La contraseña tiene que tener al menos 8 caracteres.";
      else if (!email) nuevos.email = "Para ingresar con esa contraseña, el complejo necesita un email.";
    }
    return nuevos;
  };

  const enfocar = (campo) => document.getElementById(`complejo-${campo}`)?.focus();

  const guardar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    const nuevos = validar();
    setErrores(nuevos);
    const primero = ORDEN.find((c) => nuevos[c]);
    if (primero) return enfocar(primero);

    const { password, activo, ...resto } = datos;
    const cuerpo = { ...resto, email: datos.email.trim() };
    setEnviando(true);
    try {
      if (editando) await actualizarEmpresa(original.id_empresa, cuerpo);
      else await crearEmpresa({ ...cuerpo, activo, ...(password ? { password } : {}) });
      navigate(volverA, {
        state: { listo: editando ? `Listo: guardaste los cambios de «${datos.nombre.trim()}».` : `Listo: «${datos.nombre.trim()}» ya está cargado.` }
      });
    } catch (err) {
      setEnviando(false);
      if (!err.response) return setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      if (err.response.status >= 500) return setError("Hubo un problema de nuestro lado. Probá de nuevo en un rato.");
      const mensaje = err.response.data?.mensaje ?? "No se pudo guardar el complejo.";
      const campo = campoDelError(mensaje);
      if (!campo) return setError(mensaje);
      setErrores({ [campo]: `${mensaje}.` });
      enfocar(campo);
    }
  };

  const conError = (campo, ayuda) => {
    const ids = [ayuda, errores[campo] && `error-${campo}`].filter(Boolean).join(" ");
    return { "aria-invalid": Boolean(errores[campo]) || undefined, "aria-describedby": ids || undefined };
  };

  const mensajeError = (campo) =>
    errores[campo] ? <small className="campo-error" id={`error-${campo}`}>{errores[campo]}</small> : null;

  const campo = (nombre, etiqueta, props = {}, ayuda) => (
    <div className="campo">
      <label htmlFor={`complejo-${nombre}`}>{etiqueta}</label>
      <input
        id={`complejo-${nombre}`}
        name={nombre}
        value={datos[nombre]}
        onChange={cambiar}
        readOnly={enviando}
        {...props}
        {...conError(nombre, ayuda && `ayuda-${nombre}`)}
      />
      {ayuda && <small id={`ayuda-${nombre}`}>{ayuda}</small>}
      {mensajeError(nombre)}
    </div>
  );

  return (
    <main className="contenedor pagina-auth">
      <div className="formulario-columna">
        <form onSubmit={guardar} className="tarjeta formulario-registro" noValidate>
          <Link className="auth-volver" to={volverA} onClick={salir}>← Volver a complejos</Link>
          <h1>{editando ? `Editar ${original.nombre}` : "Nuevo complejo"}</h1>

          <h2 className="subtitulo">Datos del complejo</h2>
          <div className="grilla-campos">
            {campo("nombre", "Nombre *", { maxLength: 150, autoComplete: "organization" })}
            {campo(
              "cuit",
              "CUIT *",
              { inputMode: "numeric", autoComplete: "off", maxLength: 13, placeholder: "Ej: 30-12345678-1" },
              "Los 11 números; los guiones se ponen solos."
            )}
            {campo("telefono", "Teléfono", { type: "tel", maxLength: 30, autoComplete: "tel" })}
            {campo("direccion", "Dirección", { maxLength: 200, autoComplete: "street-address" })}
          </div>

          <h2 className="subtitulo">Acceso al panel</h2>
          <div className="grilla-campos">
            {campo(
              "email",
              "Email",
              { type: "email", maxLength: 150, autoComplete: "email", autoCapitalize: "none", spellCheck: false },
              "Es el usuario con el que el complejo ingresa. Sin email no puede ingresar."
            )}
            {editando ? (
              <p className="texto-suave sin-margen nota-password">
                La contraseña se cambia desde la lista, con “Nueva contraseña”.
              </p>
            ) : (
              <div className="campo">
                <label htmlFor="complejo-password">Contraseña</label>
                <input
                  id="complejo-password"
                  name="password"
                  type="text"
                  value={datos.password}
                  onChange={cambiar}
                  readOnly={enviando}
                  autoComplete="new-password"
                  spellCheck={false}
                  autoCapitalize="none"
                  {...conError("password", "ayuda-password")}
                />
                <small id="ayuda-password">
                  Opcional. Mínimo 8 caracteres. Se ve mientras la escribís para que puedas dictarla en persona o por teléfono.
                </small>
                {mensajeError("password")}
              </div>
            )}
          </div>
          {!editando && (
            <label className="campo-check">
              <input
                type="checkbox"
                checked={datos.activo}
                disabled={enviando}
                onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
              />
              Activo: puede ingresar y aparece en el sitio
            </label>
          )}
          <p className="texto-suave campos-obligatorios">* Obligatorio</p>

          {error && <p className="alerta" role="alert" tabIndex={-1} ref={avisoGeneral}>{error}</p>}
          <p className="solo-lectores" role="alert">
            {Object.values(errores).some(Boolean) ? "Revisá los campos marcados." : ""}
          </p>

          <div className="modal-acciones">
            <Link className="boton boton-fantasma" to={volverA} onClick={salir}>Cancelar</Link>
            <button className="boton" type="submit" aria-disabled={enviando} aria-busy={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Cargar complejo"}
            </button>
          </div>
        </form>

        {editando && (
          <section className="tarjeta zona-peligro" aria-labelledby="titulo-eliminar">
            <div>
              <h2 id="titulo-eliminar">Eliminar complejo</h2>
              <p className="texto-suave sin-margen">
                {actividad(original)
                  ? `Se borra para siempre, junto con ${actividad(original)}.`
                  : "Se borra para siempre. No tiene canchas, turnos ni torneos."}{" "}
                Si solo querés que deje de aparecer, dalo de baja desde la lista.
              </p>
            </div>
            <button type="button" className="boton boton-peligro" onClick={() => setEliminando(true)}>
              Eliminar complejo…
            </button>
          </section>
        )}
      </div>

      {eliminando && (
        <Confirmar
          titulo="¿Eliminar este complejo para siempre?"
          textoBoton="Eliminar para siempre"
          peligro
          confirmarCon={actividad(original) ? original.nombre : undefined}
          onCerrar={() => setEliminando(false)}
          onConfirmar={async () => {
            await eliminarEmpresa(original.id_empresa);
            navigate(volverA, { state: { listo: `Listo: eliminaste «${original.nombre}».` } });
          }}
        >
          <p>
            <strong>{original.nombre}</strong>:{" "}
            {actividad(original) ? `se borran ${actividad(original)}.` : "no tiene canchas, turnos ni torneos."} No se puede
            deshacer.
          </p>
        </Confirmar>
      )}

      {saliendo && (
        <Confirmar
          titulo="¿Salir sin guardar?"
          textoBoton="Salir sin guardar"
          onCerrar={() => setSaliendo(false)}
          onConfirmar={async () => navigate(volverA)}
        >
          <p>Tenés cambios que todavía no guardaste. Si salís, se pierden.</p>
        </Confirmar>
      )}
    </main>
  );
}
