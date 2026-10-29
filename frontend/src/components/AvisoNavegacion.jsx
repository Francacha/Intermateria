import { startTransition, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import Icono from "./Icono";

// Aviso que queda después de ingresar (por ejemplo: "Ingresaste con la cuenta de un complejo…").
// Se muestra en la página de destino y desaparece al cerrarlo o al ir a otra página.
// La región role="status" está siempre montada y se llena después: así el lector de pantalla la anuncia.
export default function AvisoNavegacion() {
  const { aviso, limpiarAviso, salir } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [ruta, setRuta] = useState(null);
  // El aviso se guarda todavía en el login, justo antes de navegar: ahí no se muestra ni se cuenta
  const enLogin = /^\/(ingresar|registro)/.test(pathname);
  const visible = Boolean(aviso) && !enLogin;

  // Se recuerda en qué página apareció; al cambiar de página, se borra
  if (aviso && ruta === null && !enLogin) setRuta(pathname);
  if (!aviso && ruta !== null) setRuta(null);

  useEffect(() => {
    if (aviso && ruta !== null && pathname !== ruta) limpiarAviso();
  }, [aviso, ruta, pathname, limpiarAviso]);

  const otraCuenta = () => {
    const volver = aviso?.volver;
    // Salir y navegar en la misma transición: si no, la ruta protegida actual redirige primero al login
    // con su propia ruta de vuelta y se pierde la de la reserva
    startTransition(() => {
      salir();
      navigate(volver ? `/ingresar?volver=${encodeURIComponent(volver)}` : "/ingresar");
    });
  };

  return (
    <div className={visible ? "contenedor aviso-navegacion" : undefined} role="status">
      {visible && (
        <div className="aviso">
          <span>{aviso.texto}</span>
          <span className="aviso-acciones">
            <button className="boton boton-chico boton-fantasma" onClick={otraCuenta}>
              Salir e ingresar con otra cuenta
            </button>
            <button className="aviso-cerrar" onClick={limpiarAviso} aria-label="Cerrar aviso">
              <Icono nombre="cerrar" tamano={16} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
