import { useEffect, useState } from "react";
import { obtenerCaja } from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import { MEDIO_PAGO, fechaCorta, fechaLarga, hora, hoyISO, pesos, sumarDias } from "../utils/formato";

// Caja de un día: lo que registraron los encargados. Separa las señas de
// turnos nuevos de los saldos de los que vinieron a jugar.
export default function CajaPanel() {
  const [fecha, setFecha] = useState(hoyISO);
  const [caja, setCaja] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    obtenerCaja(fecha)
      .then(({ data }) => {
        if (!vigente) return;
        setCaja(data);
        setError("");
      })
      .catch((err) => vigente && setError(mensajeDeError(err, "No se pudo cargar la caja")));
    return () => {
      vigente = false;
    };
  }, [fecha]);

  const cambiarFecha = (nueva) => {
    if (!nueva) return;
    setCaja(null);
    setFecha(nueva);
  };

  return (
    <section>
      <div className="barra">
        <div className="navegador-fecha">
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, -1))} title="Día anterior">‹</button>
          <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} aria-label="Día" />
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, 1))} title="Día siguiente">›</button>
          {fecha !== hoyISO() && <button className="boton boton-fantasma" onClick={() => cambiarFecha(hoyISO())}>Hoy</button>}
        </div>
      </div>
      <h2 className="subtitulo-dia">{fechaLarga(fecha)}</h2>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!caja ? (
        !error && <p className="texto-suave">Cargando caja...</p>
      ) : (
        <>
          <div className="estadisticas">
            <div className="tarjeta estadistica"><span>Cobrado</span><strong>{pesos(caja.totales.cobrado)}</strong></div>
            <div className="tarjeta estadistica"><span>En efectivo</span><strong>{pesos(caja.totales.efectivo)}</strong></div>
            <div className="tarjeta estadistica"><span>Por transferencia</span><strong>{pesos(caja.totales.transferencia)}</strong></div>
            <div className="tarjeta estadistica"><span>Queda por cobrar</span><strong>{pesos(caja.totales.por_cobrar)}</strong></div>
          </div>
          <p className="desglose">
            <span>Señas de turnos nuevos: <strong>{pesos(caja.totales.senas)}</strong></span>
            <span>Saldos de turnos jugados: <strong>{pesos(caja.totales.saldos)}</strong></span>
            {caja.totales.senas_perdidas > 0 && (
              <span>Señas perdidas (cancelaron tarde o no vinieron): <strong>{pesos(caja.totales.senas_perdidas)}</strong></span>
            )}
          </p>
          <p className="desglose">
            <span>Turnos del día: <strong>{caja.asistencia.turnos}</strong></span>
            <span>Jugados: <strong>{caja.asistencia.jugados}</strong></span>
            <span>No vinieron: <strong>{caja.asistencia.ausentes}</strong></span>
            <span>Cancelados: <strong>{caja.asistencia.cancelados}</strong></span>
            {caja.asistencia.sin_marcar > 0 && <span>Sin marcar: <strong>{caja.asistencia.sin_marcar}</strong></span>}
          </p>

          <h3 className="seccion-titulo con-margen">Pagos registrados</h3>
          {caja.pagos.length === 0 ? (
            <p className="tarjeta vacio">No se registraron pagos este día.</p>
          ) : (
            <div className="tarjeta tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Concepto</th>
                    <th>Turno</th>
                    <th>Medio</th>
                    <th className="numero">Monto</th>
                    <th>Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {caja.pagos.map((p) => (
                    <tr key={p.id_pago}>
                      <td>{p.hora}</td>
                      <td>
                        <span className={`insignia ${p.tipo === "sena" ? "insignia-sena" : "insignia-saldo"}`}>
                          {p.tipo === "sena" ? "Seña" : "Saldo"}
                        </span>
                      </td>
                      <td>
                        {p.cliente ?? "-"} · {p.cancha} · {p.fecha === fecha ? "" : `${fechaCorta(p.fecha)} `}{hora(p.hora_inicio)}
                      </td>
                      <td>{MEDIO_PAGO[p.medio]}</td>
                      <td className="numero"><strong>{pesos(p.monto)}</strong></td>
                      <td className="texto-suave">{p.registrado_por ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="columnas-caja">
            <ListaTurnos
              titulo="Saldos por cobrar hoy"
              vacio="No quedan saldos por cobrar en los turnos del día."
              turnos={caja.saldos_pendientes}
              detalle={(t) => `falta ${pesos(t.saldo)}`}
            />
            <ListaTurnos
              titulo="No vinieron"
              vacio="Nadie faltó este día."
              turnos={caja.ausentes}
              detalle={(t) => (Number(t.sena_pagada) > 0 ? `perdió la seña de ${pesos(t.sena_pagada)}` : "no había dejado seña")}
            />
            <ListaTurnos
              titulo="Señas pendientes (próximos 7 días)"
              vacio="Todos los turnos que vienen tienen la seña completa."
              turnos={caja.senas_pendientes}
              conFecha
              detalle={(t) => `pagó ${pesos(t.sena_pagada)} de ${pesos(t.sena_requerida)}`}
            />
            <ListaTurnos
              titulo="Señas a resolver"
              vacio="No hay señas de turnos cancelados para resolver."
              turnos={caja.senas_a_resolver}
              conFecha
              detalle={(t) => `${pesos(t.sena_pagada)} · ${t.cancelada_por === "complejo" ? "canceló el complejo" : "avisó con tiempo"} (resolvelo en la agenda de ese día)`}
            />
          </div>
        </>
      )}
    </section>
  );
}

function ListaTurnos({ titulo, vacio, turnos, detalle, conFecha = false }) {
  return (
    <div className="tarjeta lista-caja">
      <h3>{titulo} {turnos.length > 0 && <span className="contador-insignia">{turnos.length}</span>}</h3>
      {turnos.length === 0 ? (
        <p className="texto-suave">{vacio}</p>
      ) : (
        <ul>
          {turnos.map((t) => (
            <li key={t.id_reserva}>
              <span>
                <strong>{conFecha ? `${fechaCorta(t.fecha)} ` : ""}{hora(t.hora_inicio)}</strong> {t.cancha} · {t.cliente ?? "-"}
                {t.telefono && <span className="texto-suave"> · {t.telefono}</span>}
              </span>
              <small className="texto-suave">{detalle(t)}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
