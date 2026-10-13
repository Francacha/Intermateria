import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// { usuario, empresa, token, entrar(datos), salir() }
// usuario.rol: "admin" | "empresa" | "cliente"
export const useAuth = () => useContext(AuthContext);

// Página principal de cada tipo de usuario
export const inicioDe = (usuario) =>
  ({ admin: "/admin", empresa: "/panel", cliente: "/complejos" })[usuario?.rol] ?? "/";
