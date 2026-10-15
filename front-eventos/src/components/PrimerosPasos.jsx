import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clavePrimerosPasos } from "../context/auth";

const leer = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

// Bienvenida para un complejo recién registrado: qué conviene revisar antes de recibir reservas.
// Solo aparece si el registro dejó la marca "pendiente"; al cerrarla no vuelve a aparecer.
export default function PrimerosPasos({ idEmpresa, canchas, onIr }) {
  const clave = clavePrimerosPasos(idEmpresa);
  const [visible, setVisible] = useState(() => leer(clave) === "pendiente");
  const titulo = useRef(null);

  // Recién registrado: el foco arranca en la bienvenida, no en la barra de navegación
  useEffect(() => {
    if (visible) titulo.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const cerrar = () => {
    try {
      localStorage.setItem(clave, "cerrado");
    } catch {
      // sin almacenamiento: se oculta hasta recargar
    }
    setVisible(false);
    // La sección desaparece: el foco pasa al título del panel
    document.querySelector("main h1")?.focus();
  };

  // Cambia de pestaña y la deja a la vista
  const ir = (pestana) => {
    onIr(pestana);
    document.querySelector(".pestanas")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  };

  const sinPrecio = canchas.filter((c) => Number(c.precio_hora) === 0).length;

  return (
    <section className="tablero primeros-pasos" aria-labelledby="titulo-primeros-pasos">
      <div className="primeros-pasos-cabecera">
        <div>
          <h2 id="titulo-primeros-pasos" tabIndex={-1} ref={titulo}>Tu complejo ya está creado</h2>
          <p className="texto-suave">Antes de recibir reservas, revisá estas tres cosas.</p>
        </div>
        <button className="boton boton-fantasma boton-chico" onClick={cerrar}>Listo, ocultar</button>
      </div>
      <ol>
        <li className="renglon">
          <div className="renglon-info">
            <strong>Horarios</strong>
            <span className="texto-suave">Por defecto abrís todos los días de 9 a 23. Así se arma la grilla de turnos.</span>
          </div>
          <button className="boton boton-fantasma" onClick={() => ir("perfil")}>Revisar horarios</button>
        </li>
        <li className="renglon">
          <div className="renglon-info">
            <strong>Canchas y precios</strong>
            <span className={sinPrecio ? "campo-aviso" : "texto-suave"}>
              {sinPrecio
                ? `${sinPrecio === 1 ? "Hay 1 cancha" : `Hay ${sinPrecio} canchas`} sin precio: los jugadores ven $0.`
                : "Nombre, superficie y si es techada, cancha por cancha."}
            </span>
          </div>
          <button className="boton boton-fantasma" onClick={() => ir("canchas")}>Revisar canchas</button>
        </li>
        <li className="renglon">
          <div className="renglon-info">
            <strong>Tu página pública</strong>
            <span className="texto-suave">Así ven tu complejo los jugadores cuando buscan dónde jugar.</span>
          </div>
          <Link className="boton boton-fantasma" to={`/complejos/${idEmpresa}`}>Ver mi página</Link>
        </li>
      </ol>
    </section>
  );
}
