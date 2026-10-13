import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { inicioDe, useAuth } from "../context/auth";
import { iniciarSesion } from "../service/complejoService";
import { mensajeDeError } from "../service/api";

export default function Ingresar() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const { data } = await iniciarSesion(email, password);
      entrar(data);
      navigate(inicioDe(data.usuario));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo iniciar sesión"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="contenedor pagina-auth">
      <form className="tarjeta formulario-auth" onSubmit={enviar}>
        <h1>Ingresar</h1>
        <p className="texto-suave">Jugadores, complejos y administradores entran desde acá.</p>
        {error && <p className="alerta">{error}</p>}

        <label className="campo">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="campo">
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button className="boton boton-grande boton-ancho" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
        <p className="texto-suave centrado">
          ¿No tenés cuenta? <Link to="/registro-cliente">Creá tu cuenta de jugador</Link>
          {" "}o <Link to="/registro">registrá tu complejo</Link>
        </p>
      </form>
    </main>
  );
}
