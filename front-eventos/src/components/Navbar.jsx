import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { conVuelta, useAuth } from "../context/auth";
import Icono from "./Icono";

export default function Navbar() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // En el celular los links van en un menú desplegable
  const [abierto, setAbierto] = useState(false);
  const [rutaDelMenu, setRutaDelMenu] = useState(pathname);

  // Al cambiar de página se cierra el menú
  if (rutaDelMenu !== pathname) {
    setRutaDelMenu(pathname);
    setAbierto(false);
  }

  const botonMenu = useRef(null);
  const navegacion = useRef(null);

  // Al abrir, el foco pasa al primer link; con Escape se cierra y vuelve al botón
  useEffect(() => {
    if (!abierto) return;
    navegacion.current?.querySelector("a, button")?.focus();
    const conEscape = (e) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      botonMenu.current?.focus();
    };
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [abierto]);

  const cerrarSesion = () => {
    salir();
    navigate("/");
  };

  const rol = usuario?.rol;

  return (
    <header className="navbar">
      <div className="contenedor navbar-interno">
        <Link to="/" className="marca">
          <span className="marca-logo" aria-hidden="true" />
          Reservas de Canchas
        </Link>
        <button
          ref={botonMenu}
          className="navbar-menu"
          aria-expanded={abierto}
          aria-controls="navegacion"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setAbierto(!abierto)}
        >
          <Icono nombre={abierto ? "cerrar" : "menu"} tamano={22} />
        </button>
        <nav id="navegacion" ref={navegacion} className={`navbar-links ${abierto ? "abierto" : ""}`}>
          {rol !== "empresa" && rol !== "admin" && (
            <>
              <NavLink to="/complejos">Complejos</NavLink>
              <NavLink to="/torneos">Torneos</NavLink>
            </>
          )}
          {rol === "cliente" && <NavLink to="/mis-reservas">Mis reservas</NavLink>}
          {rol === "empresa" && <NavLink to="/panel" end>Mi complejo</NavLink>}
          {rol === "admin" && (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => (isActive || pathname.startsWith("/admin/empresas") ? "active" : "")}
              >
                Complejos
              </NavLink>
              <NavLink to="/admin/jugadores">Jugadores</NavLink>
            </>
          )}

          {usuario ? (
            <>
              <span className="navbar-empresa">
                {rol === "cliente" ? `${usuario.nombre} ${usuario.apellido}` : usuario.nombre}
              </span>
              <button className="boton boton-fantasma" onClick={cerrarSesion}>Salir</button>
            </>
          ) : (
            <>
              {/* Llevan la página actual, para volver a ella después de ingresar o crear la cuenta */}
              <NavLink to={conVuelta("/ingresar", pathname, search)}>Ingresar</NavLink>
              <Link to={conVuelta("/registro-cliente", pathname, search)} className="boton">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
      {/* Fondo del menú del celular: tocar afuera lo cierra */}
      {abierto && <div className="navbar-fondo" aria-hidden="true" onClick={() => setAbierto(false)} />}
    </header>
  );
}
