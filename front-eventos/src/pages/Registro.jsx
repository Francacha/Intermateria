import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { registrarEmpresa } from "../service/complejoService";
import { mensajeDeError } from "../service/api";

const DEPORTES = [
  { id: "futbol", nombre: "Fútbol", detalle: "Fútbol 5, 7 u 11" },
  { id: "padel", nombre: "Pádel", detalle: "Canchas de 4 jugadores" }
];

export default function Registro() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    nombre: "", cuit: "", email: "", password: "", telefono: "", direccion: ""
  });
  // Cantidad y precio por hora de cada deporte; cantidad 0 = no lo maneja
  const [canchas, setCanchas] = useState({
    futbol: { cantidad: 0, precio: "" },
    padel: { cantidad: 0, precio: "" }
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const alternarDeporte = (id) =>
    setCanchas({ ...canchas, [id]: { ...canchas[id], cantidad: canchas[id].cantidad > 0 ? 0 : 1 } });

  const cambiarCancha = (id, campo, valor) =>
    setCanchas({ ...canchas, [id]: { ...canchas[id], [campo]: valor } });

  const total = canchas.futbol.cantidad + canchas.padel.cantidad;

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (total === 0) {
      setError("Elegí al menos un deporte: pádel, fútbol o los dos");
      return;
    }
    if (datos.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setEnviando(true);
    try {
      const { data } = await registrarEmpresa({
        ...datos,
        canchas: {
          futbol: canchas.futbol.cantidad,
          padel: canchas.padel.cantidad,
          precio_futbol: Number(canchas.futbol.precio) || 0,
          precio_padel: Number(canchas.padel.precio) || 0
        }
      });
      entrar(data);
      navigate("/panel");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo registrar el complejo"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="contenedor pagina-auth">
      <form className="tarjeta formulario-registro" onSubmit={enviar}>
        <h1>Registrá tu complejo</h1>
        <p className="texto-suave">En un minuto tenés tu panel listo.</p>
        {error && <p className="alerta">{error}</p>}

        <h2 className="subtitulo">1. ¿Qué canchas manejás?</h2>
        <div className="deportes">
          {DEPORTES.map((deporte) => {
            const elegido = canchas[deporte.id].cantidad > 0;
            return (
              <div key={deporte.id} className={`deporte deporte-${deporte.id} ${elegido ? "elegido" : ""}`}>
                <button type="button" className="deporte-cabecera" onClick={() => alternarDeporte(deporte.id)}>
                  <span className={`icono-deporte icono-${deporte.id}`} aria-hidden="true" />
                  <span>
                    <strong>{deporte.nombre}</strong>
                    <small>{deporte.detalle}</small>
                  </span>
                  <span className="check" aria-hidden="true">{elegido ? "✓" : ""}</span>
                </button>
                {elegido && (
                  <div className="deporte-detalle">
                    <label className="campo">
                      Cantidad de canchas
                      <div className="contador">
                        <button type="button" onClick={() => cambiarCancha(deporte.id, "cantidad", Math.max(1, canchas[deporte.id].cantidad - 1))}>−</button>
                        <span>{canchas[deporte.id].cantidad}</span>
                        <button type="button" onClick={() => cambiarCancha(deporte.id, "cantidad", Math.min(30, canchas[deporte.id].cantidad + 1))}>+</button>
                      </div>
                    </label>
                    <label className="campo">
                      Precio por hora ($)
                      <input
                        type="number"
                        min="0"
                        step="500"
                        placeholder="Ej: 25000"
                        value={canchas[deporte.id].precio}
                        onChange={(e) => cambiarCancha(deporte.id, "precio", e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="subtitulo">2. Datos del complejo</h2>
        <div className="grilla-campos">
          <label className="campo">
            Nombre del complejo *
            <input name="nombre" value={datos.nombre} onChange={cambiar} required maxLength={150} />
          </label>
          <label className="campo">
            CUIT *
            <input name="cuit" value={datos.cuit} onChange={cambiar} required maxLength={13} placeholder="30-12345678-9" />
          </label>
          <label className="campo">
            Teléfono
            <input name="telefono" value={datos.telefono} onChange={cambiar} maxLength={30} />
          </label>
          <label className="campo">
            Dirección
            <input name="direccion" value={datos.direccion} onChange={cambiar} maxLength={200} />
          </label>
        </div>

        <h2 className="subtitulo">3. Tu cuenta</h2>
        <div className="grilla-campos">
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
          {enviando
            ? "Registrando..."
            : `Registrar complejo${total ? ` con ${total} cancha${total > 1 ? "s" : ""}` : ""}`}
        </button>
        <p className="texto-suave centrado">
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link>
        </p>
      </form>
    </main>
  );
}
