import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { registrarCliente } from "../service/clienteService";
import { mensajeDeError } from "../service/api";

// Registro de jugadores: con la cuenta pueden reservar turnos e inscribir equipos
export default function RegistroCliente() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState({ nombre: "", apellido: "", telefono: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (datos.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await registrarCliente(datos);
      entrar(data);
      navigate("/complejos");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la cuenta"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="contenedor pagina-auth">
      <form className="tarjeta formulario-registro formulario-mediano" onSubmit={enviar}>
        <span className="etiqueta">Para jugadores</span>
        <h1>Creá tu cuenta</h1>
        <p className="texto-suave">Reservá canchas de fútbol y pádel en todos los complejos y anotate en torneos.</p>
        {error && <p className="alerta">{error}</p>}

        <div className="grilla-campos">
          <label className="campo">
            Nombre *
            <input name="nombre" value={datos.nombre} onChange={cambiar} required maxLength={100} autoFocus />
          </label>
          <label className="campo">
            Apellido *
            <input name="apellido" value={datos.apellido} onChange={cambiar} required maxLength={100} />
          </label>
          <label className="campo">
            Teléfono *
            <input name="telefono" value={datos.telefono} onChange={cambiar} required maxLength={30} placeholder="351-..." />
          </label>
          <label className="campo">
            Email *
            <input name="email" type="email" value={datos.email} onChange={cambiar} required maxLength={150} />
          </label>
          <label className="campo">
            Contraseña * <small>(mínimo 8 caracteres)</small>
            <input name="password" type="password" value={datos.password} onChange={cambiar} required minLength={8} />
          </label>
        </div>

        <button className="boton boton-grande boton-ancho" disabled={enviando}>
          {enviando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p className="texto-suave centrado">
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link> · ¿Tenés un complejo?{" "}
          <Link to="/registro">Registralo acá</Link>
        </p>
      </form>
    </main>
  );
}
