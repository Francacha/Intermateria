import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CambiarPassword from "../components/CambiarPassword";
import { EstadoTorneo } from "../components/Torneo";
import {
  cancelarReserva,
  darseDeBaja,
  obtenerMisInscripciones,
  obtenerMisReservas
} from "../service/clienteService";
import { mensajeDeError } from "../service/api";
import { DEPORTE, ESTADO_TURNO, RESULTADO_SENA, TIPO_TORNEO, fechaCorta, fechaLarga, hora, horasHasta, hoyISO, pesos } from "../utils/formato";

// Turnos e inscripciones del jugador logueado
export default function MisReservas() {
  const [reservas, setReservas] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([obtenerMisReservas(), obtenerMisInscripciones()])
      .then(([r, i]) => {
        setReservas(r.data);
        setInscripciones(i.data);
      })
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar tus reservas")));
  }, []);

  const cancelar = async (reserva) => {
    // Antes de cancelar se avisa qué pasa con la seña (regla del complejo)
    const sena = Number(reserva.sena_pagada);
    const tarde = horasHasta(reserva.fecha, reserva.hora_inicio) < reserva.horas_cancelacion;
    const aviso =
      sena === 0
        ? ""
        : tarde
          ? `

Faltan menos de ${reserva.horas_cancelacion} horas: perdés la seña de ${pesos(sena)}.`
          : `

Avisás con tiempo: el complejo se comunica con vos para devolverte la seña de ${pesos(sena)} o dejarla a favor.`;
    if (!confirm(`¿Cancelar el turno del ${fechaLarga(reserva.fecha)} a las ${hora(reserva.hora_inicio)}?${aviso}`)) return;
    try {
      const { data } = await cancelarReserva(reserva.id_reserva);
      setReservas(reservas.map((r) => (r.id_reserva === data.id_reserva ? data : r)));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cancelar"));
    }
  };

  const bajarse = async (inscripcion) => {
    if (!confirm(`¿Dar de baja a "${inscripcion.nombre}" de ${inscripcion.torneo}?`)) return;
    try {
      await darseDeBaja(inscripcion.id_equipo);
      setInscripciones(inscripciones.filter((i) => i.id_equipo !== inscripcion.id_equipo));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo dar de baja"));
    }
  };

  if (!reservas && !error) return <main className="contenedor panel"><p className="texto-suave">Cargando...</p></main>;

  const hoy = hoyISO();
  const activas = (reservas ?? []).filter((r) => r.fecha >= hoy && ["reservada", "confirmada"].includes(r.estado));
  const historial = (reservas ?? []).filter((r) => !activas.includes(r));

  return (
    <main className="contenedor panel">
      <span className="etiqueta">Mi cuenta</span>
      <h1>Mis reservas</h1>
      {error && <p className="alerta">{error}</p>}

      <h2 className="seccion-titulo con-margen">Próximos turnos</h2>
      {activas.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No tenés turnos reservados.</p>
          <Link className="boton" to="/complejos">Buscar cancha</Link>
        </div>
      ) : (
        <div className="lista-reservas">
          {activas
            .slice()
            .reverse()
            .map((r) => (
              <article key={r.id_reserva} className={`tarjeta reserva reserva-${r.deporte}`}>
                <div className="reserva-fecha">
                  <strong>{hora(r.hora_inicio)}</strong>
                  <span>{fechaCorta(r.fecha)}</span>
                </div>
                <div className="reserva-cuerpo">
                  <h3>{r.cancha} · {DEPORTE[r.deporte]}</h3>
                  <p className="texto-suave sin-margen">
                    {r.complejo}{r.direccion ? ` · ${r.direccion}` : ""}
                  </p>
                  <p className="sin-margen">
                    {hora(r.hora_inicio)} a {hora(r.hora_fin)} · <strong>{pesos(r.precio_total)}</strong>
                  </p>
                  <EstadoSena reserva={r} />
                </div>
                <div className="reserva-acciones">
                  <span className={`insignia turno-${r.estado}`}>{ESTADO_TURNO[r.estado]}</span>
                  <button className="boton boton-fantasma" onClick={() => cancelar(r)}>Cancelar</button>
                </div>
              </article>
            ))}
        </div>
      )}

      <h2 className="seccion-titulo con-margen">Mis torneos</h2>
      {inscripciones.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No inscribiste equipos en torneos.</p>
          <Link className="boton boton-fantasma" to="/torneos">Ver torneos</Link>
        </div>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Torneo</th>
                <th>Complejo</th>
                <th>Inicio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((i) => (
                <tr key={i.id_equipo}>
                  <td><strong>{i.nombre}</strong></td>
                  <td>
                    <Link to={`/torneos/${i.id_torneo}`}>{i.torneo}</Link>
                    <br />
                    <small className="texto-suave">{TIPO_TORNEO[i.tipo]} de {DEPORTE[i.deporte].toLowerCase()}</small>
                  </td>
                  <td>{i.complejo}</td>
                  <td>{fechaCorta(i.fecha_inicio)}</td>
                  <td><EstadoTorneo estado={i.estado} /></td>
                  <td>
                    {i.estado === "inscripcion" && (
                      <button className="boton-icono peligro" title="Dar de baja" onClick={() => bajarse(i)}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historial.length > 0 && (
        <>
          <h2 className="seccion-titulo con-margen">Historial</h2>
          <div className="tarjeta tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cancha</th>
                  <th>Complejo</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Seña</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((r) => (
                  <tr key={r.id_reserva}>
                    <td>{fechaCorta(r.fecha)} {hora(r.hora_inicio)}</td>
                    <td>{r.cancha}</td>
                    <td>{r.complejo}</td>
                    <td>{pesos(r.precio_total)}</td>
                    <td><span className={`insignia turno-${r.estado}`}>{ESTADO_TURNO[r.estado]}</span></td>
                    <td className="texto-suave">
                      {r.resultado_sena
                        ? RESULTADO_SENA[r.resultado_sena]
                        : Number(r.sena_pagada) > 0 ? `Pagaste ${pesos(r.sena_pagada)}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="seccion-titulo con-margen">Tu cuenta</h2>
      <CambiarPassword />
    </main>
  );
}

// Cómo está el pago de un turno que viene: seña pendiente (y a dónde transferir), pagada o saldo
function EstadoSena({ reserva: r }) {
  const requerida = Number(r.sena_requerida);
  const pagada = Number(r.sena_pagada);
  if (requerida === 0) return null;
  if (pagada >= requerida) {
    return (
      <p className="sin-margen texto-ok">
        Seña pagada ({pesos(pagada)}). Saldo a pagar en el complejo: {pesos(r.saldo)}
      </p>
    );
  }
  return (
    <p className="sin-margen texto-aviso">
      Seña pendiente: {pesos(requerida - pagada)}
      {r.datos_transferencia ? ` · transferí a ${r.datos_transferencia}` : " · consultá al complejo cómo transferirla"}
    </p>
  );
}
