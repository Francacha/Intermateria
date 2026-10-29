import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// { usuario, empresa, token, vencida, aviso: { texto, volver } | null, avisar(aviso), limpiarAviso(),
//   entrar(datos, aviso?), salir() }
// usuario.rol: "admin" | "empresa" | "cliente"
export const useAuth = () => useContext(AuthContext);

// En un complejo trabajan el dueño y sus encargados: precios, horarios, reglas,
// torneos, reportes y equipo los maneja solo el dueño
export const esDueno = (usuario) => usuario?.rol === "empresa" && usuario?.puesto !== "encargado";

// Página principal de cada tipo de usuario
export const inicioDe = (usuario) =>
  ({ admin: "/admin", empresa: "/panel", cliente: "/complejos" })[usuario?.rol] ?? "/";

// Una ruta interna del sitio ("/torneos/2"): empieza con una sola "/", sin "//", sin barras invertidas
// (el navegador las toma como "/" y saldría a otro sitio), sin esquemas ni caracteres de control.
// Devuelve la ruta si es segura, o "" si no lo es.
export const rutaInterna = (valor) => {
  const ruta = String(valor ?? "");
  if (!ruta.startsWith("/") || ruta.startsWith("//")) return "";
  const control = [...ruta].some((c) => c.charCodeAt(0) < 32);
  if (control || ruta.includes("\\") || /^\/+[a-z][a-z0-9+.-]*:/i.test(ruta)) return "";
  return ruta;
};

// Rutas a las que cada rol puede volver después de ingresar
const PUEDE_VOLVER = {
  cliente: (ruta) => !/^\/(panel|admin)/.test(ruta),
  empresa: (ruta) => /^\/panel/.test(ruta),
  admin: (ruta) => /^\/admin/.test(ruta)
};

// A dónde ir después de ingresar o registrarse: si se venía de algún lado (?volver=/complejos/1?...),
// se vuelve ahí, siempre que sea una ruta interna del sitio que ese rol puede ver.
export const destinoTrasIngresar = (usuario, search) => {
  const volver = rutaInterna(new URLSearchParams(search).get("volver"));
  return volver && PUEDE_VOLVER[usuario?.rol]?.(volver) ? volver : inicioDe(usuario);
};

// Qué tipo de página es una ruta de vuelta: "reserva", "torneo", "mis-reservas", "panel", "admin" u "otra"
export const tipoDeVuelta = (volver) => {
  if (!volver) return "";
  const url = new URL(volver, window.location.origin);
  if (/^\/complejos\/\d+$/.test(url.pathname) && url.searchParams.get("cancha")) return "reserva";
  if (/^\/torneos\/\d+$/.test(url.pathname)) return "torneo";
  if (url.pathname.startsWith("/mis-reservas")) return "mis-reservas";
  if (url.pathname.startsWith("/panel")) return "panel";
  if (url.pathname.startsWith("/admin")) return "admin";
  return "otra";
};

// Las páginas que piden sesión: "volver sin ingresar" a ellas devolvería al login
export const pideSesion = (tipo) => ["mis-reservas", "panel", "admin"].includes(tipo);

// Si la cuenta con la que se ingresó no puede ver la página de la que venía, qué decirle
export const avisoDeRol = (usuario, volver) => {
  const tipo = tipoDeVuelta(volver);
  if (usuario.rol !== "cliente" && ["reserva", "torneo", "mis-reservas"].includes(tipo)) {
    return `Ingresaste con la cuenta de ${usuario.nombre}. Para reservar o inscribirte, ingresá con tu cuenta de jugador.`;
  }
  if (usuario.rol !== "empresa" && tipo === "panel") {
    return `Ingresaste con la cuenta de ${usuario.nombre}. El panel es para los complejos.`;
  }
  return `Ingresaste con la cuenta de ${usuario.nombre}, que no puede ver la página de la que venías.`;
};

// "/ingresar?volver=..." para volver a la página actual después de ingresar
export const conVuelta = (destino, pathname, search = "") => {
  if (/^\/(ingresar|registro)/.test(pathname)) {
    const volver = rutaInterna(new URLSearchParams(search).get("volver"));
    return volver ? `${destino}?volver=${encodeURIComponent(volver)}` : destino;
  }
  return pathname === "/" ? destino : `${destino}?volver=${encodeURIComponent(pathname + search)}`;
};

// Clave del navegador para que el panel muestre "primeros pasos" solo a un complejo recién registrado
export const clavePrimerosPasos = (idEmpresa) => `primeros-pasos-${idEmpresa}`;
