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
  // true cuando la sesión se cerró sola porque el token venció (para avisarlo en el login)
  const [vencida, setVencida] = useState(false);
  // Aviso para mostrar después de ingresar (por ejemplo, si no se pudo volver a donde estaba)
  const [aviso, setAviso] = useState(null); // { texto, volver }

  const entrar = (datos, avisoAlEntrar = null) => {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
    } catch {
      // sin almacenamiento: la sesión dura hasta recargar
    }
    setSesion(datos);
    setVencida(false);
    setAviso(avisoAlEntrar);
  };

  const salir = () => {
    borrarSesion();
    setSesion(null);
    setVencida(false);
    setAviso(null);
  };

  // api.js avisa cuando el token venció
  useEffect(() => {
    const alExpirar = () => {
      borrarSesion();
      setSesion(null);
      setVencida(true);
    };
    window.addEventListener("sesion-expirada", alExpirar);
    return () => window.removeEventListener("sesion-expirada", alExpirar);
  }, []);

  const usuario = sesion?.usuario ?? null;
  const empresa = usuario?.rol === "empresa" ? usuario : null;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        empresa,
        token: sesion?.token,
        vencida,
        aviso,
        avisar: setAviso,
        limpiarAviso: () => setAviso(null),
        entrar,
        salir
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
