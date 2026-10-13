import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

export default function Navbar() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();

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
        <nav className="navbar-links">
          {rol !== "empresa" && rol !== "admin" && (
            <>
              <NavLink to="/complejos">Complejos</NavLink>
              <NavLink to="/torneos">Torneos</NavLink>
            </>
          )}
          {rol === "cliente" && <NavLink to="/mis-reservas">Mis reservas</NavLink>}
          {rol === "empresa" && <NavLink to="/panel" end>Mi complejo</NavLink>}
          {rol === "admin" && <NavLink to="/admin">Empresas</NavLink>}

          {usuario ? (
            <>
              <span className="navbar-empresa">
                {rol === "cliente" ? `${usuario.nombre} ${usuario.apellido}` : usuario.nombre}
              </span>
              <button className="boton boton-fantasma" onClick={cerrarSesion}>Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/ingresar">Ingresar</NavLink>
              <Link to="/registro-cliente" className="boton">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
