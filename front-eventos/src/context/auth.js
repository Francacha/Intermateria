import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// { empresa, token, entrar(datos), salir() }
export const useAuth = () => useContext(AuthContext);
