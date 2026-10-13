import { useEffect, useState } from "react";
import { AuthContext } from "./auth";
import { CLAVE_SESION } from "../service/api";

const leerSesion = () => {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
    // Las sesiones viejas (sin rol) no sirven: hay que volver a ingresar
    return sesion?.usuario?.rol ? sesion : null;
  } catch {
    return null;
  }
};

const borrarSesion = () => {
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch {
    // nada que borrar
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
    borrarSesion();
    setSesion(null);
  };

  // api.js avisa cuando el token venció
  useEffect(() => {
    const alExpirar = () => {
      borrarSesion();
      setSesion(null);
    };
    window.addEventListener("sesion-expirada", alExpirar);
    return () => window.removeEventListener("sesion-expirada", alExpirar);
  }, []);

  const usuario = sesion?.usuario ?? null;
  const empresa = usuario?.rol === "empresa" ? usuario : null;

  return (
    <AuthContext.Provider value={{ usuario, empresa, token: sesion?.token, entrar, salir }}>
      {children}
    </AuthContext.Provider>
  );
}
