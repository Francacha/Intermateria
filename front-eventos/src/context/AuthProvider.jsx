import { useEffect, useState } from "react";
import { AuthContext } from "./auth";
import { CLAVE_SESION } from "../service/api";

const leerSesion = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION));
  } catch {
    return null;
  }
};

export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const entrar = (datos) => {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
    } catch {
      // sin almacenamiento: la sesión dura hasta recargar
    }
    setSesion(datos);
  };

  const salir = () => {
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      // nada que borrar
    }
    setSesion(null);
  };

  // api.js avisa cuando el token venció
  useEffect(() => {
    const alExpirar = () => {
      try {
        localStorage.removeItem(CLAVE_SESION);
      } catch {
        // nada que borrar
      }
      setSesion(null);
    };
    window.addEventListener("sesion-expirada", alExpirar);
    return () => window.removeEventListener("sesion-expirada", alExpirar);
  }, []);

  return (
    <AuthContext.Provider value={{ empresa: sesion?.empresa, token: sesion?.token, entrar, salir }}>
      {children}
    </AuthContext.Provider>
  );
}
