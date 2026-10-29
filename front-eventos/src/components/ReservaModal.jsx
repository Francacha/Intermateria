import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import { obtenerDisponibilidad } from "../service/publicoService";
import { reservar } from "../service/clienteService";
import { mensajeDeError } from "../service/api";
import {
  DEPORTE,
  DURACION_TURNO,
  aHora,
  aMinutos,
  duracionTexto,
  etiquetaDia,
  fechaLarga,
  horariosDelDia,
  hoyISO,
  pesos,
  precioTurno,
  sumarDias,
  textoPrecio
} from "../utils/formato";

const DIAS_VISIBLES = 14;

// Días que se pueden reservar, desde hoy
const diasVisibles = () => Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoyISO(), i));

// Grilla de horarios libres de una cancha para sacar un turno.
// fechaInicial y horaInicial llegan cuando se toca un horario desde la página de inicio.
export default function ReservaModal({ cancha, complejo, onCerrar, fechaInicial, horaInicial }) {
  const { usuario } = useAuth();
  const [fecha, setFecha] = useState(() => (diasVisibles().includes(fechaInicial) ? fechaInicial : hoyISO()));
  // La duración la fija el complejo según el deporte: fútbol 1 hora, pádel 1 h 30
  const duracion = DURACION_TURNO[cancha.deporte];
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [elegido, setElegido] = useState(horaInicial ?? "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reservado, setReservado] = useState(null);
  const [recargas, setRecargas] = useState(0);
  const { pathname } = useLocation();
  const ventana = useRef(null);
  // onCerrar cambia en cada render del padre; el ref evita reiniciar el diálogo por eso
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  // Diálogo: al abrir, el foco entra; Tab no se escapa; Escape cierra; al cerrar, el foco vuelve
  useEffect(() => {
    const anterior = document.activeElement;
    ventana.current?.focus();
    const teclas = (e) => {
      if (e.key === "Escape") return cerrar.current();
      if (e.key !== "Tab" || !ventana.current) return;
      const enfocables = [...ventana.current.querySelectorAll("button:not(:disabled), a[href]")];
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === ventana.current)) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero?.focus();
      }
    };
    document.addEventListener("keydown", teclas);
    return () => {
      document.removeEventListener("keydown", teclas);
      anterior?.focus?.();
    };
  }, []);

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
  const horarios = horariosDelDia(disponibilidad, fecha, duracion);
  // Si el horario elegido ya no está libre (lo reservó otro, o pasó), no queda elegido
  const seleccion = horarios.some((h) => h.hora === elegido && h.libre) ? elegido : "";

  // Con un horario ya elegido, la grilla se desplaza hasta mostrarlo
  useEffect(() => {
    if (disponibilidad) document.querySelector(".horario-boton.activo")?.scrollIntoView({ block: "nearest" });
  }, [disponibilidad]);

  // Tarifas y reglas del complejo (llegan con la disponibilidad); el precio depende de la franja
  const tarifa = disponibilidad?.cancha ?? cancha;
  const reglas = disponibilidad?.reglas;
  const precio = seleccion ? precioTurno({ ...tarifa, deporte: cancha.deporte }, seleccion, reglas?.hora_noche) : 0;
  const sena = reglas ? Math.round((precio * reglas.porcentaje_sena) / 100) : 0;
  // Para ingresar sin perder lo elegido: después del login se vuelve a esta misma reserva
  const volver = `${pathname}?cancha=${cancha.id_cancha}&fecha=${fecha}${seleccion ? `&hora=${seleccion}` : ""}`;

  const confirmar = async () => {
    setEnviando(true);
    setError("");
    try {
      const { data } = await reservar({ id_cancha: cancha.id_cancha, fecha, hora_inicio: seleccion, duracion });
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
        <div
          ref={ventana}
          className="tarjeta modal centrado"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-reserva"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="exito-icono" aria-hidden="true">✓</span>
          <h2 id="titulo-reserva">¡Turno reservado!</h2>
          <p>
            <strong>{cancha.nombre}</strong> en {complejo}
            <br />
            {fechaLarga(reservado.fecha)}, de {reservado.hora_inicio.slice(0, 5)} a {reservado.hora_fin.slice(0, 5)}
            <br />
            Total: <strong>{pesos(reservado.precio_total)}</strong>
          </p>
          {Number(reservado.sena_requerida) > 0 && (
            <div className="pasos-sena">
              <p>
                Para confirmarlo, transferí la seña de <strong>{pesos(reservado.sena_requerida)}</strong>
                {reservado.datos_transferencia ? <> a <strong>{reservado.datos_transferencia}</strong></> : " al complejo"}.
                El resto ({pesos(Number(reservado.precio_total) - Number(reservado.sena_requerida))}) lo pagás cuando vas a jugar.
              </p>
              <p className="texto-suave">
                Si cancelás con menos de {reservado.horas_cancelacion} horas de anticipación, perdés la seña.
              </p>
            </div>
          )}
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
      <div
        ref={ventana}
        className="tarjeta modal modal-ancho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-reserva"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <span className="etiqueta">{complejo}</span>
          <h2 id="titulo-reserva">Reservar {cancha.nombre}</h2>
          <p className="texto-suave">
            {DEPORTE[cancha.deporte]} · turnos de {duracionTexto(duracion)} · {textoPrecio(tarifa)}
            {reglas && tarifa.precio_hora_noche != null && Number(tarifa.precio_hora_noche) !== Number(tarifa.precio_hora) && ` (desde las ${reglas.hora_noche})`}
          </p>
        </div>

        <div className="dias" role="group" aria-label="Día">
          {diasVisibles().map((dia) => (
            <button
              key={dia}
              className={`dia ${dia === fecha ? "activo" : ""}`}
              aria-pressed={dia === fecha}
              onClick={() => cambiarFecha(dia)}
            >
              {etiquetaDia(dia)}
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
                  className={`horario-boton ${seleccion === h.hora ? "activo" : ""}`}
                  aria-pressed={seleccion === h.hora}
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

        {reglas && (
          <p className="condiciones-reserva">
            {reglas.porcentaje_sena > 0
              ? `Para confirmar se pide una seña del ${reglas.porcentaje_sena} % por transferencia; el resto se paga en el complejo. `
              : "El turno se paga en el complejo. "}
            Si cancelás con menos de {reglas.horas_cancelacion} horas de anticipación, perdés la seña.
          </p>
        )}

        <div className="modal-acciones reserva-pie">
          {seleccion && (
            <span>
              {seleccion} a {aHora(aMinutos(seleccion) + duracion)} · <strong>{pesos(precio)}</strong>
              {sena > 0 && ` · seña ${pesos(sena)}`}
            </span>
          )}
          <button className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          {usuario?.rol === "cliente" ? (
            <button className="boton" disabled={!seleccion || enviando} onClick={confirmar}>
              {enviando ? "Reservando..." : "Confirmar reserva"}
            </button>
          ) : usuario ? (
            <span className="texto-suave">Solo los jugadores pueden reservar</span>
          ) : (
            <Link className="boton" to={`/ingresar?volver=${encodeURIComponent(volver)}`}>Ingresá para reservar</Link>
          )}
        </div>
      </div>
    </div>
  );
}
