import { useEffect, useState } from "react";
import { mensajeDeError } from "./api";

// Si no hubo respuesta o el servidor falló, se muestra el mensaje propio (el del servidor es técnico);
// si el servidor explica el problema (por ejemplo, "no encontrado"), se muestra ese.
const errorDeCarga = (err, mensaje) =>
  !err.response || err.response.status >= 500 ? `${mensaje} Probá de nuevo en un rato.` : mensajeDeError(err, mensaje);

// Trae datos de la API con estado de carga, error y reintento.
// consultar tiene que ser una función fija (definida fuera del componente).
export default function useCarga(consultar, mensaje, activa = true) {
  const [estado, setEstado] = useState({ datos: null, error: "" });
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    consultar()
      .then(({ data }) => vigente && setEstado({ datos: data, error: "" }))
      .catch((err) => vigente && setEstado({ datos: null, error: errorDeCarga(err, mensaje) }));
    return () => {
      vigente = false;
    };
  }, [consultar, mensaje, activa, recargas]);

  const reintentar = () => {
    setEstado({ datos: null, error: "" });
    setRecargas((n) => n + 1);
  };

  return { ...estado, reintentar };
}
