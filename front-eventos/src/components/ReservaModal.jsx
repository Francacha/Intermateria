import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth";
import { obtenerDisponibilidad } from "../service/publicoService";
import { reservar } from "../service/clienteService";
import { mensajeDeError } from "../service/api";
import { DEPORTE, aHora, aMinutos, fechaCorta, fechaLarga, hoyISO, pesos, sumarDias } from "../utils/formato";

const DURACIONES = [60, 90, 120];
const DIAS_VISIBLES = 14;

// Grilla de horarios libres de una cancha para sacar un turno
export default function ReservaModal({ cancha, complejo, onCerrar }) {
  const { usuario } = useAuth();
  const [fecha, setFecha] = useState(hoyISO);
  const [duracion, setDuracion] = useState(cancha.deporte === "padel" ? 90 : 60);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reservado, setReservado] = useState(null);
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    let vigente = true;
    obtenerDisponibilidad(cancha.id_cancha, fecha)
      .then(({ data }) => vigente && setDisponibilidad(data))
      .catch((err) => vigente && setError(mensajeDeError(err, "No se pudo consultar la disponibilidad")));
    return () => {
      vigente = false;
    };
  }, [cancha.id_cancha, fecha, recargas]);

  const cambiarFecha = (nueva) => {
    setFecha(nueva);
    setElegido("");
    setDisponibilidad(null);
    setError("");
  };

  // Horarios posibles: cada media hora, entre la apertura y el cierre
  const horarios = [];
  if (disponibilidad?.horario.abierto) {
    const { abre, cierra } = disponibilidad.horario;
    const inicio = aMinutos(abre);
    let fin = aMinutos(cierra);
    if (fin <= inicio) fin = 1440;
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const ocupados = disponibilidad.ocupados.map((o) => [aMinutos(o.desde), aMinutos(o.hasta)]);
    for (let m = Math.ceil(inicio / 30) * 30; m + duracion <= fin; m += 30) {
      const pasado = fecha === hoyISO() && m <= minutosAhora;
      const choca = ocupados.some(([desde, hasta]) => m < hasta && m + duracion > desde);
      horarios.push({ hora: aHora(m), libre: !pasado && !choca });
    }
  }

  const precio = (Number(cancha.precio_hora) * duracion) / 60;

  const confirmar = async () => {
    setEnviando(true);
    setError("");
    try {
      const { data } = await reservar({ id_cancha: cancha.id_cancha, fecha, hora_inicio: elegido, duracion });
      setReservado(data);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo reservar"));
      setElegido("");
      setRecargas((n) => n + 1); // alguien pudo haber reservado ese horario recién
    } finally {
      setEnviando(false);
    }
  };

  if (reservado) {
    return (
      <div className="modal-fondo" onClick={onCerrar}>
        <div className="tarjeta modal centrado" onClick={(e) => e.stopPropagation()}>
          <span className="exito-icono" aria-hidden="true">✓</span>
          <h2>¡Turno reservado!</h2>
          <p>
            <strong>{cancha.nombre}</strong> en {complejo}
            <br />
            {fechaLarga(reservado.fecha)}, de {reservado.hora_inicio.slice(0, 5)} a {reservado.hora_fin.slice(0, 5)}
            <br />
            Total: <strong>{pesos(reservado.precio_total)}</strong>
          </p>
          <div className="modal-acciones centrado-flex">
            <button className="boton boton-fantasma" onClick={onCerrar}>Cerrar</button>
            <Link className="boton" to="/mis-reservas">Ver mis reservas</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal modal-ancho" onClick={(e) => e.stopPropagation()}>
        <div>
          <span className="etiqueta">{complejo}</span>
          <h2>Reservar {cancha.nombre}</h2>
          <p className="texto-suave">
            {DEPORTE[cancha.deporte]} · {pesos(cancha.precio_hora)} la hora
          </p>
        </div>

        <div className="dias">
          {Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoyISO(), i)).map((dia) => (
            <button key={dia} className={`dia ${dia === fecha ? "activo" : ""}`} onClick={() => cambiarFecha(dia)}>
              {fechaCorta(dia)}
            </button>
          ))}
        </div>

        <div className="segmentado">
          {DURACIONES.map((d) => (
            <button
              key={d}
              className={duracion === d ? "activo" : ""}
              onClick={() => {
                setDuracion(d);
                setElegido("");
              }}
            >
              {d === 60 ? "1 hora" : d === 90 ? "1 h 30" : "2 horas"}
            </button>
          ))}
        </div>

        {error && <p className="alerta">{error}</p>}

        {!disponibilidad ? (
          <p className="texto-suave">Cargando horarios...</p>
        ) : !disponibilidad.horario.abierto ? (
          <p className="tarjeta vacio">El complejo está cerrado ese día.</p>
        ) : (
          <>
            <p className="texto-suave">
              {fechaLarga(fecha)} · abre de {disponibilidad.horario.abre} a {disponibilidad.horario.cierra}
            </p>
            <div className="horarios-grilla">
              {horarios.map((h) => (
                <button
                  key={h.hora}
                  className={`horario-boton ${elegido === h.hora ? "activo" : ""}`}
                  disabled={!h.libre}
                  onClick={() => setElegido(h.hora)}
                >
                  {h.hora}
                </button>
              ))}
            </div>
            {horarios.every((h) => !h.libre) && <p className="texto-suave">No quedan horarios libres ese día.</p>}
          </>
        )}

        <div className="modal-acciones reserva-pie">
          {elegido && (
            <span>
              {elegido} a {aHora(aMinutos(elegido) + duracion)} · <strong>{pesos(precio)}</strong>
            </span>
          )}
          <button className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          {usuario?.rol === "cliente" ? (
            <button className="boton" disabled={!elegido || enviando} onClick={confirmar}>
              {enviando ? "Reservando..." : "Confirmar reserva"}
            </button>
          ) : usuario ? (
            <span className="texto-suave">Solo los jugadores pueden reservar</span>
          ) : (
            <Link className="boton" to="/ingresar">Ingresá para reservar</Link>
          )}
        </div>
      </div>
    </div>
  );
}
