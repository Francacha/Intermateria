import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

export default function Navbar() {
  const { empresa, salir } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = () => {
    salir();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="contenedor navbar-interno">
        <Link to="/" className="marca">
          <span className="marca-logo" aria-hidden="true" />
          Reservas de Canchas
        </Link>
        <nav className="navbar-links">
          {empresa ? (
            <>
              <NavLink to="/panel">Mi complejo</NavLink>
              <span className="navbar-empresa">{empresa.nombre}</span>
              <button className="boton boton-fantasma" onClick={cerrarSesion}>Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/empresas">Empresas</NavLink>
              <NavLink to="/ingresar">Ingresar</NavLink>
              <Link to="/registro" className="boton">Registrar complejo</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
