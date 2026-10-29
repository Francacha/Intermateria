import { useEffect, useRef, useState } from "react";
import FormPassword from "../components/FormPassword";
import { Cargando, ConError } from "../components/Estados";
import { mensajeDeError } from "../service/api";
import { cambiarPasswordJugador, obtenerJugadores } from "../service/empresasService";
// "15/10/2026"
const fechaConAnio = (fecha) => new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR");

// Administrador: buscar jugadores y ponerles una contraseña nueva cuando la olvidan
export default function Jugadores() {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState(null); // { clave, jugadores, error }
  const [recargas, setRecargas] = useState(0);
  const [editando, setEditando] = useState(null); // id del jugador con el formulario abierto
  const [listo, setListo] = useState(""); // mensaje después de cambiar una contraseña
  const mensajeListo = useRef(null);

  // Después de cambiar una contraseña el formulario desaparece: el foco pasa al mensaje
  useEffect(() => {
    if (listo) mensajeListo.current?.focus();
  }, [listo]);

  const clave = `${busqueda.trim()}|${recargas}`;

  // La búsqueda se manda un rato después de dejar de tipear
  useEffect(() => {
    let vigente = true;
    const espera = setTimeout(() => {
      obtenerJugadores(busqueda.trim())
        .then(({ data }) => vigente && setEstado({ clave, jugadores: data, error: "" }))
        .catch((err) => vigente && setEstado({ clave, jugadores: null, error: mensajeDeError(err, "No pudimos traer los jugadores.") }));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [clave, busqueda]);

  const jugadores = estado?.jugadores;

  return (
    <main className="contenedor panel">
      <h1>Jugadores</h1>
      <p className="texto-suave">
        Si un jugador olvidó su contraseña, buscalo y poné una nueva. Después pasásela por un medio seguro
        (en persona o por teléfono) y pedile que la cambie desde "Mis reservas" por una que sepa solo él o ella.
      </p>

      <input
        className="buscador buscador-ancho"
        type="search"
        aria-label="Buscar jugador por email o nombre"
        placeholder="Buscar por email o nombre"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {listo && <p className="aviso-ok" role="status" tabIndex={-1} ref={mensajeListo}>{listo}</p>}

      {!estado ? (
        <Cargando filas={3} etiqueta="Cargando jugadores" />
      ) : estado.error ? (
        <ConError mensaje={estado.error} onReintentar={() => setRecargas((n) => n + 1)} />
      ) : jugadores.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>{busqueda.trim() ? `No hay jugadores que coincidan con «${busqueda.trim()}».` : "Todavía no hay jugadores registrados."}</p>
        </div>
      ) : (
        <ul className="tablero">
          {jugadores.map((j) => (
            <li key={j.id_cliente} className="renglon renglon-jugador">
              <div className="renglon-info">
                <strong>{j.nombre} {j.apellido}</strong>
                <span className="texto-suave">
                  {j.email}
                  {j.telefono && ` · ${j.telefono}`}
                  {j.fecha_alta && ` · alta ${fechaConAnio(j.fecha_alta)}`}
                </span>
              </div>
              {editando === j.id_cliente ? (
                <FormPassword
                  id={`password-${j.id_cliente}`}
                  nombre={j.nombre}
                  onGuardar={(password) => cambiarPasswordJugador(j.id_cliente, password)}
                  onCancelar={() => setEditando(null)}
                  onListo={() => {
                    setEditando(null);
                    setListo(`Listo: ${j.nombre} ${j.apellido} ya puede ingresar con la contraseña nueva.`);
                  }}
                />
              ) : (
                <button
                  className="boton boton-fantasma"
                  onClick={() => {
                    setListo("");
                    setEditando(j.id_cliente);
                  }}
                >
                  Nueva contraseña
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
