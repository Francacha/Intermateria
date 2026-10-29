import { useEffect, useRef, useState } from "react";
import {
  actualizarTurno,
  anularPago,
  cancelarTurno,
  crearCierre,
  crearTurno,
  obtenerCierres,
  obtenerTurnos,
  reabrirCancha,
  registrarPago,
  resolverSena
} from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import useDialogo from "../service/useDialogo";
import {
  DURACION_TURNO,
  ESTADO_TURNO,
  MEDIO_PAGO,
  RESULTADO_SENA,
  aHora,
  aMinutos,
  duracionTexto,
  fechaLarga,
  hora,
  horasHasta,
  hoyISO,
  pesos,
  precioTurno,
  sumarDias
} from "../utils/formato";

const MOTIVO_CIERRE = { lluvia: "Lluvia", mantenimiento: "Mantenimiento", otro: "Otro motivo" };

// "2026-10-28T18:00" → "mié 28/10 18:00" (o solo la hora si es el día que se está viendo)
const momento = (valor, fecha) => {
  const [dia, h] = valor.split("T");
  if (dia === fecha) return h;
  // Un cierre hasta la medianoche se guarda como las 00:00 del día siguiente
  if (h === "00:00" && dia === sumarDias(fecha, 1)) return "24:00";
  return `${new Date(`${dia}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })} ${h}`;
};

// Agenda de turnos del complejo, día por día: estado, señas y saldos, cancelaciones,
// inasistencias y canchas cerradas
export default function TurnosPanel({ canchas, reglas, dueno }) {
  const [fecha, setFecha] = useState(hoyISO);
  const [turnos, setTurnos] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [filtroCancha, setFiltroCancha] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [recargas, setRecargas] = useState(0);
  // Diálogo abierto: { tipo: "cargar" | "cobrar" | "cancelar" | "cerrar", turno? }
  const [dialogo, setDialogo] = useState(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerTurnos(fecha), obtenerCierres(fecha)])
      .then(([t, c]) => {
        if (!vigente) return;
        setTurnos(t.data);
        setCierres(c.data);
        setError("");
      })
      .catch((err) => vigente && setError(mensajeDeError(err, "No se pudieron cargar los turnos")));
    return () => {
      vigente = false;
    };
  }, [fecha, recargas]);

  const cambiarFecha = (nueva) => {
    if (!nueva) return;
    setTurnos(null);
    setAviso("");
    setFecha(nueva);
  };

  const recargar = () => setRecargas((n) => n + 1);

  // Reemplaza un turno actualizado en la lista
  const reemplazar = (turno) => setTurnos((lista) => lista.map((t) => (t.id_reserva === turno.id_reserva ? turno : t)));

  const accion = async (promesa, mensajeError) => {
    try {
      const { data } = await promesa;
      reemplazar(data);
      setError("");
      return data;
    } catch (err) {
      setError(mensajeDeError(err, mensajeError));
    }
  };

  const lista = (turnos ?? []).filter((t) => !filtroCancha || String(t.id_cancha) === filtroCancha);
  const reservas = lista.filter((t) => !t.id_partido);
  const activas = reservas.filter((t) => ["reservada", "confirmada", "jugada"].includes(t.estado));
  const porCobrar = activas.reduce((s, t) => s + Number(t.saldo), 0);
  // Lo cobrado de los turnos del día, sin las señas que se devolvieron
  const cobrado = reservas.filter((t) => t.resultado_sena !== "devuelta").reduce((s, t) => s + Number(t.pagado), 0);
  const sinSena = activas.filter((t) => t.estado !== "jugada" && Number(t.sena_pagada) < Number(t.sena_requerida)).length;
  const cierresVisibles = cierres.filter((c) => !filtroCancha || String(c.id_cancha) === filtroCancha);

  return (
    <section>
      <div className="barra">
        <div className="navegador-fecha">
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, -1))} title="Día anterior">‹</button>
          <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} aria-label="Día" />
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, 1))} title="Día siguiente">›</button>
          {fecha !== hoyISO() && (
            <button className="boton boton-fantasma" onClick={() => cambiarFecha(hoyISO())}>Hoy</button>
          )}
        </div>
        <div className="acciones">
          <select className="selector" value={filtroCancha} onChange={(e) => setFiltroCancha(e.target.value)} aria-label="Cancha">
            <option value="">Todas las canchas</option>
            {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
          </select>
          <button className="boton boton-fantasma" onClick={() => setDialogo({ tipo: "cerrar" })} disabled={!canchas.length}>
            Cerrar cancha
          </button>
          <button className="boton" onClick={() => setDialogo({ tipo: "cargar" })} disabled={!canchas.length}>+ Cargar turno</button>
        </div>
      </div>

      <h2 className="subtitulo-dia">{fechaLarga(fecha)}</h2>
      <div className="estadisticas estadisticas-chicas">
        <div className="tarjeta estadistica"><span>Turnos</span><strong>{activas.length}</strong></div>
        <div className="tarjeta estadistica"><span>Cobrado</span><strong>{pesos(cobrado)}</strong></div>
        <div className="tarjeta estadistica"><span>Por cobrar</span><strong>{pesos(porCobrar)}</strong></div>
        <div className="tarjeta estadistica"><span>Sin seña completa</span><strong>{sinSena}</strong></div>
      </div>

      {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
      {error && <p className="alerta" role="alert">{error}</p>}

      {cierresVisibles.length > 0 && (
        <ul className="lista-cierres" aria-label="Canchas cerradas este día">
          {cierresVisibles.map((c) => (
            <li key={c.id_cierre} className="tarjeta cierre">
              <span>
                <strong>{c.cancha}</strong> cerrada por {MOTIVO_CIERRE[c.motivo].toLowerCase()} de {momento(c.desde, fecha)} a{" "}
                {momento(c.hasta, fecha)}
                {c.detalle && <span className="texto-suave"> · {c.detalle}</span>}
                {c.registrado_por && <span className="texto-suave"> · registró {c.registrado_por}</span>}
              </span>
              <button
                className="boton boton-fantasma"
                onClick={async () => {
                  try {
                    await reabrirCancha(c.id_cierre);
                    setAviso(`${c.cancha} volvió a estar disponible.`);
                    recargar();
                  } catch (err) {
                    setError(mensajeDeError(err, "No se pudo reabrir la cancha"));
                  }
                }}
              >
                Reabrir
              </button>
            </li>
          ))}
        </ul>
      )}

      {!turnos ? (
        <p className="texto-suave">Cargando turnos...</p>
      ) : lista.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No hay turnos para este día.</p>
        </div>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla tabla-agenda">
            <thead>
              <tr>
                <th>Horario</th>
                <th>Cancha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Estado</th>
                <th><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <FilaTurno
                  key={t.id_reserva}
                  turno={t}
                  onEstado={(estado) => accion(actualizarTurno(t.id_reserva, { estado }), "No se pudo actualizar el turno")}
                  onResolver={(resultado) => accion(resolverSena(t.id_reserva, resultado), "No se pudo guardar")}
                  onCobrar={() => setDialogo({ tipo: "cobrar", turno: t })}
                  onCancelar={() => setDialogo({ tipo: "cancelar", turno: t })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogo?.tipo === "cargar" && (
        <TurnoModal
          canchas={canchas.filter((c) => c.activa !== false)}
          fecha={fecha < hoyISO() ? hoyISO() : fecha}
          reglas={reglas}
          onGuardar={async (datos) => {
            await crearTurno(datos);
            setDialogo(null);
            setAviso("Turno cargado.");
            if (datos.fecha === fecha) recargar();
            else cambiarFecha(datos.fecha);
          }}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "cobrar" && (
        <CobroModal
          turno={turnos.find((t) => t.id_reserva === dialogo.turno.id_reserva) ?? dialogo.turno}
          dueno={dueno}
          onPagar={async (pago) => reemplazar((await registrarPago(dialogo.turno.id_reserva, pago)).data)}
          onAnular={async (idPago) => reemplazar((await anularPago(dialogo.turno.id_reserva, idPago)).data)}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "cancelar" && (
        <CancelarModal
          turno={dialogo.turno}
          reglas={reglas}
          onConfirmar={async (datos) => {
            const { data } = await cancelarTurno(dialogo.turno.id_reserva, datos);
            reemplazar(data);
            setDialogo(null);
            setAviso(
              `${data.id_turno_fijo ? "Semana liberada" : "Turno cancelado"}: ${RESULTADO_SENA[data.resultado_sena].toLowerCase()}.`
            );
          }}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "cerrar" && (
        <CierreModal
          canchas={canchas.filter((c) => c.activa !== false)}
          fecha={fecha < hoyISO() ? hoyISO() : fecha}
          onCerrar={() => setDialogo(null)}
          onListo={() => recargar()}
        />
      )}
    </section>
  );
}

function FilaTurno({ turno: t, onEstado, onResolver, onCobrar, onCancelar }) {
  const cancelada = t.estado === "cancelada";
  const empezo = horasHasta(t.fecha, t.hora_inicio) <= 0;
  const senaCompleta = Number(t.sena_pagada) >= Number(t.sena_requerida);
  const cerrado = ["cancelada", "ausente"].includes(t.estado);

  return (
    <tr className={cancelada ? "fila-cancelada" : t.estado === "ausente" ? "fila-ausente" : ""}>
      <td><strong>{hora(t.hora_inicio)}</strong> a {hora(t.hora_fin)}</td>
      <td>
        <span className={`punto punto-${t.deporte}`} /> {t.cancha}
      </td>
      <td>
        <div className="celda-cliente">
          <span>
            {t.id_partido && <span className="insignia insignia-torneo">Torneo</span>}
            {t.id_turno_fijo && <span className="insignia insignia-fijo">Turno fijo</span>} {t.cliente ?? "-"}
          </span>
          <small className="texto-suave">
            {t.telefono ?? (t.id_partido ? "" : "Sin teléfono")}
            {!t.id_partido && !t.id_cliente && !t.id_turno_fijo && " · cargado a mano"}
            {t.id_cliente && " · reservó por la web"}
          </small>
          {t.inasistencias > 0 && (
            <small className="aviso-faltas">
              Ya faltó {t.inasistencias} {t.inasistencias === 1 ? "vez" : "veces"} sin avisar
            </small>
          )}
          {cancelada && t.motivo_cancelacion && <small className="texto-suave">{t.motivo_cancelacion}</small>}
        </div>
      </td>
      <td>
        {t.id_partido ? (
          "-"
        ) : (
          <div className="celda-pago">
            <span>{pesos(t.precio_total)}</span>
            {Number(t.sena_pagada) > 0 ? (
              <small className={senaCompleta ? "texto-ok" : "texto-aviso"}>
                Seña {pesos(t.sena_pagada)}{!senaCompleta && ` de ${pesos(t.sena_requerida)}`}
              </small>
            ) : (
              !cerrado && <small className="texto-aviso">Sin seña ({pesos(t.sena_requerida)})</small>
            )}
            {!cerrado && (
              <small className={Number(t.saldo) > 0 ? "texto-suave" : "texto-ok"}>
                {Number(t.saldo) > 0 ? `Saldo ${pesos(t.saldo)}` : "Pagado"}
              </small>
            )}
          </div>
        )}
      </td>
      <td>
        {t.id_partido ? (
          <span className={`insignia turno-${t.estado}`}>{ESTADO_TURNO[t.estado]}</span>
        ) : cancelada ? (
          <div className="celda-estado">
            <span className="insignia turno-cancelada">Cancelada</span>
            <ResultadoSena turno={t} onResolver={onResolver} />
          </div>
        ) : (
          <div className="celda-estado">
            <select
              className={`selector selector-estado turno-${t.estado}`}
              value={t.estado}
              onChange={(e) => onEstado(e.target.value)}
              aria-label={`Estado del turno de las ${hora(t.hora_inicio)}`}
            >
              <option value="reservada">Reservada</option>
              <option value="confirmada">Confirmada</option>
              {/* Jugado y "no vino" recién cuando el turno empezó */}
              <option value="jugada" disabled={!empezo}>Jugada</option>
              <option value="ausente" disabled={!empezo}>No vino</option>
            </select>
            {t.estado === "ausente" && <ResultadoSena turno={t} onResolver={onResolver} />}
          </div>
        )}
      </td>
      <td>
        {!t.id_partido && !cerrado && (
          <div className="acciones-turno">
            <button className="boton boton-chico" onClick={onCobrar}>Cobrar</button>
            {!empezo && (
              <button className="boton boton-chico boton-fantasma" onClick={onCancelar}>
                {t.id_turno_fijo ? "Liberar semana" : "Cancelar"}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// Qué pasó con la seña. Si quedó "a resolver", se elige qué se hizo con ella.
function ResultadoSena({ turno, onResolver }) {
  if (!turno.resultado_sena) return null;
  if (turno.resultado_sena !== "a_resolver") {
    return (
      <small className={turno.resultado_sena === "perdida" ? "texto-aviso" : "texto-suave"}>
        {RESULTADO_SENA[turno.resultado_sena]}
        {turno.resultado_sena !== "sin_sena" && ` (${pesos(turno.sena_pagada)})`}
      </small>
    );
  }
  return (
    <div className="resolver-sena">
      <small className="texto-aviso">Seña de {pesos(turno.sena_pagada)} a resolver:</small>
      <div className="acciones">
        <button className="accion-texto" onClick={() => onResolver("devuelta")}>Se devolvió</button>
        <button className="accion-texto" onClick={() => onResolver("a_favor")}>Queda a favor</button>
        <button className="accion-texto peligro" onClick={() => onResolver("perdida")}>Se pierde</button>
      </div>
    </div>
  );
}

// Envoltorio común de los diálogos de la agenda
function Dialogo({ titulo, children, onCerrar, onSubmit, ancho = false }) {
  const ventana = useRef(null);
  useDialogo(ventana, onCerrar);
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form
        ref={ventana}
        className={`tarjeta modal ${ancho ? "modal-ancho" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        noValidate
      >
        <h2>{titulo}</h2>
        {children}
      </form>
    </div>
  );
}

function TurnoModal({ canchas, fecha, reglas, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState({
    id_cancha: canchas[0]?.id_cancha ?? "",
    fecha,
    hora_inicio: "20:00",
    contacto_nombre: "",
    contacto_telefono: "",
    sena: "",
    medio_sena: "transferencia"
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });
  const cancha = canchas.find((c) => String(c.id_cancha) === String(datos.id_cancha));
  const valida = /^\d{2}:\d{2}$/.test(datos.hora_inicio);
  const precio = cancha && valida ? precioTurno(cancha, datos.hora_inicio, reglas.hora_noche) : 0;
  const senaSugerida = Math.round((precio * reglas.porcentaje_sena) / 100);

  const enviar = async (e) => {
    e.preventDefault();
    if (!datos.contacto_nombre.trim()) return setError("Indicá a nombre de quién es el turno.");
    setError("");
    setEnviando(true);
    try {
      await onGuardar({ ...datos, id_cancha: Number(datos.id_cancha), sena: Number(datos.sena) || 0 });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cargar el turno"));
      setEnviando(false);
    }
  };

  return (
    <Dialogo titulo="Cargar turno" onCerrar={onCerrar} onSubmit={enviar}>
      <p className="texto-suave sin-margen">Para clientes que reservan por teléfono, WhatsApp o en el mostrador.</p>
      {error && <p className="alerta" role="alert">{error}</p>}
      <div className="grilla-campos">
        <label className="campo">
          Cancha
          <select value={datos.id_cancha} onChange={(e) => cambiar("id_cancha", e.target.value)}>
            {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          Día
          <input type="date" value={datos.fecha} min={hoyISO()} onChange={(e) => cambiar("fecha", e.target.value)} required />
        </label>
        <label className="campo">
          Hora
          <input type="time" step="1800" value={datos.hora_inicio} onChange={(e) => cambiar("hora_inicio", e.target.value)} required />
        </label>
        <label className="campo">
          A nombre de *
          <input value={datos.contacto_nombre} onChange={(e) => cambiar("contacto_nombre", e.target.value)} required maxLength={100} autoFocus />
        </label>
        <label className="campo">
          Teléfono
          <input value={datos.contacto_telefono} onChange={(e) => cambiar("contacto_telefono", e.target.value)} maxLength={30} />
        </label>
        <label className="campo">
          Seña recibida ($)
          <input
            type="number"
            min="0"
            step="500"
            value={datos.sena}
            placeholder={senaSugerida ? String(senaSugerida) : ""}
            onChange={(e) => cambiar("sena", e.target.value)}
          />
        </label>
        {Number(datos.sena) > 0 && (
          <label className="campo">
            Medio de la seña
            <select value={datos.medio_sena} onChange={(e) => cambiar("medio_sena", e.target.value)}>
              {Object.entries(MEDIO_PAGO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
            </select>
          </label>
        )}
      </div>
      {cancha && valida && (
        <p className="resumen-turno">
          Turno de {duracionTexto(DURACION_TURNO[cancha.deporte])}, de {datos.hora_inicio} a{" "}
          {aHora(Math.min(1440, aMinutos(datos.hora_inicio) + DURACION_TURNO[cancha.deporte]))} ·
          Total <strong>{pesos(precio)}</strong> · Seña del {reglas.porcentaje_sena} %: <strong>{pesos(senaSugerida)}</strong>
        </p>
      )}
      <div className="modal-acciones">
        <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
        <button className="boton" disabled={enviando}>{enviando ? "Guardando..." : "Guardar turno"}</button>
      </div>
    </Dialogo>
  );
}

// Registrar la seña o el saldo de un turno. El sistema no cobra: el encargado carga lo que recibió.
function CobroModal({ turno, dueno, onPagar, onAnular, onCerrar }) {
  const faltaSena = Math.max(0, Number(turno.sena_requerida) - Number(turno.sena_pagada));
  const empezo = horasHasta(turno.fecha, turno.hora_inicio) <= 0;
  // Antes del turno lo normal es la seña; cuando vienen a jugar, el saldo
  const tipoSugerido = faltaSena > 0 && !empezo ? "sena" : "saldo";
  const montoSugerido = (tipo) => (tipo === "sena" ? Math.min(faltaSena, Number(turno.saldo)) : Number(turno.saldo));
  const [pago, setPago] = useState({
    tipo: tipoSugerido,
    medio: tipoSugerido === "sena" ? "transferencia" : "efectivo",
    monto: String(montoSugerido(tipoSugerido) || "")
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!(Number(pago.monto) > 0)) return setError("Escribí el monto recibido.");
    setError("");
    setEnviando(true);
    try {
      await onPagar({ ...pago, monto: Number(pago.monto) });
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo registrar el pago"));
      setEnviando(false);
    }
  };

  return (
    <Dialogo titulo={`Cobrar · ${turno.cliente ?? "Turno"}`} onCerrar={onCerrar} onSubmit={enviar}>
      <p className="texto-suave sin-margen">
        {turno.cancha} · {fechaLarga(turno.fecha)} · {hora(turno.hora_inicio)} a {hora(turno.hora_fin)}
      </p>
      <dl className="resumen-pago">
        <div><dt>Precio</dt><dd>{pesos(turno.precio_total)}</dd></div>
        <div><dt>Seña ({turno.porcentaje_sena} %)</dt><dd>{pesos(turno.sena_pagada)} de {pesos(turno.sena_requerida)}</dd></div>
        <div><dt>Falta pagar</dt><dd><strong>{pesos(turno.saldo)}</strong></dd></div>
      </dl>

      {turno.pagos.length > 0 && (
        <ul className="lista-pagos" aria-label="Pagos registrados">
          {turno.pagos.map((p) => (
            <li key={p.id_pago}>
              <span>
                {p.tipo === "sena" ? "Seña" : "Saldo"} · {MEDIO_PAGO[p.medio]} · <strong>{pesos(p.monto)}</strong>
              </span>
              <small className="texto-suave">
                {new Date(p.fecha_hora).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {p.registrado_por && ` · ${p.registrado_por}`}
              </small>
              {dueno && (
                <button
                  type="button"
                  className="accion-texto peligro"
                  onClick={async () => {
                    try {
                      await onAnular(p.id_pago);
                    } catch (err) {
                      setError(mensajeDeError(err, "No se pudo anular el pago"));
                    }
                  }}
                >
                  Anular
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="alerta" role="alert">{error}</p>}
      {Number(turno.saldo) > 0 ? (
        <>
          <div className="segmentado" role="group" aria-label="Qué se cobra">
            {[["sena", "Seña"], ["saldo", "Saldo"]].map(([tipo, nombre]) => (
              <button
                type="button"
                key={tipo}
                className={pago.tipo === tipo ? "activo" : ""}
                aria-pressed={pago.tipo === tipo}
                onClick={() => setPago({ ...pago, tipo, monto: String(montoSugerido(tipo) || "") })}
              >
                {nombre}
              </button>
            ))}
          </div>
          <div className="grilla-campos">
            <label className="campo">
              Medio de pago
              <select value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value })}>
                {Object.entries(MEDIO_PAGO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
              </select>
            </label>
            <label className="campo">
              Monto recibido ($)
              <input type="number" min="1" step="500" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} autoFocus />
            </label>
          </div>
          <div className="modal-acciones">
            <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cerrar</button>
            <button className="boton" disabled={enviando}>{enviando ? "Guardando..." : "Registrar pago"}</button>
          </div>
        </>
      ) : (
        <>
          <p className="aviso-ok">Este turno ya está pagado.</p>
          <div className="modal-acciones">
            <button type="button" className="boton" onClick={onCerrar}>Cerrar</button>
          </div>
        </>
      )}
    </Dialogo>
  );
}

// Cancelar (o liberar una semana de un turno fijo) mostrando antes qué pasa con la seña
function CancelarModal({ turno, reglas, onConfirmar, onCerrar }) {
  const [porElComplejo, setPorElComplejo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const horas = horasHasta(turno.fecha, turno.hora_inicio);
  const sena = Number(turno.sena_pagada);

  const consecuencia =
    sena === 0
      ? "No dejó seña: no hay nada que devolver."
      : porElComplejo
        ? `Cancela el complejo: el jugador no pierde la seña de ${pesos(sena)}. Queda a resolver (devolverla o dejarla a favor).`
        : horas < reglas.horas_cancelacion
          ? `Avisó con menos de ${reglas.horas_cancelacion} horas: pierde la seña de ${pesos(sena)}.`
          : `Avisó con más de ${reglas.horas_cancelacion} horas: la seña de ${pesos(sena)} queda a resolver con el encargado.`;

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await onConfirmar({ motivo: motivo.trim(), por_el_complejo: porElComplejo });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cancelar"));
      setEnviando(false);
    }
  };

  return (
    <Dialogo titulo={turno.id_turno_fijo ? "Liberar esta semana" : "Cancelar turno"} onCerrar={onCerrar} onSubmit={enviar}>
      <p className="texto-suave sin-margen">
        {turno.cliente} · {turno.cancha} · {fechaLarga(turno.fecha)} a las {hora(turno.hora_inicio)}
      </p>
      {turno.id_turno_fijo && (
        <p className="sin-margen">Se libera solo esta fecha: el grupo conserva su turno fijo las semanas siguientes.</p>
      )}
      <fieldset className="opciones">
        <legend>¿Quién cancela?</legend>
        <label className="campo-check">
          <input type="radio" name="quien" checked={!porElComplejo} onChange={() => setPorElComplejo(false)} />
          Avisó el jugador
        </label>
        <label className="campo-check">
          <input type="radio" name="quien" checked={porElComplejo} onChange={() => setPorElComplejo(true)} />
          El complejo (lluvia, cancha cerrada u otro motivo nuestro)
        </label>
      </fieldset>
      <label className="campo">
        Motivo (opcional)
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={150} placeholder="Ej: avisó por WhatsApp" />
      </label>
      <p className={`consecuencia ${!porElComplejo && sena > 0 && horas < reglas.horas_cancelacion ? "consecuencia-perdida" : ""}`}>
        {consecuencia}
      </p>
      {error && <p className="alerta" role="alert">{error}</p>}
      <div className="modal-acciones">
        <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Volver</button>
        <button className="boton boton-peligro" disabled={enviando}>
          {enviando ? "Cancelando..." : turno.id_turno_fijo ? "Liberar semana" : "Cancelar turno"}
        </button>
      </div>
    </Dialogo>
  );
}

// Cerrar una o varias canchas por lluvia o mantenimiento. Muestra a quién hay que avisar.
function CierreModal({ canchas, fecha, onCerrar, onListo }) {
  const [elegidas, setElegidas] = useState([]);
  const [datos, setDatos] = useState({
    desdeFecha: fecha,
    desdeHora: fecha === hoyISO() ? aHora(Math.min(23 * 60, Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30)) : "18:00",
    hastaFecha: fecha,
    hastaHora: "",
    motivo: "lluvia",
    detalle: "",
    cancelar: true
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });
  const alternar = (id) => setElegidas(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);
  const descubiertas = canchas.filter((c) => !c.techada).map((c) => c.id_cancha);

  const enviar = async (e) => {
    e.preventDefault();
    if (elegidas.length === 0) return setError("Elegí al menos una cancha.");
    setError("");
    setEnviando(true);
    try {
      const { data } = await crearCierre({
        canchas: elegidas,
        desde: `${datos.desdeFecha}T${datos.desdeHora}`,
        // Sin hora de fin: hasta el final de ese día
        hasta: `${datos.hastaFecha}T${datos.hastaHora || "24:00"}`,
        motivo: datos.motivo,
        detalle: datos.detalle,
        cancelar_afectados: datos.cancelar
      });
      setResultado(data);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cerrar la cancha"));
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <Dialogo titulo="Cancha cerrada" onCerrar={onCerrar} onSubmit={(e) => { e.preventDefault(); onCerrar(); }} ancho>
        <p className="aviso-ok">
          {resultado.cierres.map((c) => c.cancha).join(", ")} {resultado.cierres.length === 1 ? "quedó cerrada" : "quedaron cerradas"}: ya no se
          {resultado.cierres.length === 1 ? " ofrece" : " ofrecen"} en ese horario.
        </p>
        {resultado.afectados.length === 0 ? (
          <p>No había turnos reservados en ese horario.</p>
        ) : (
          <>
            <p>
              Avisales a estos jugadores
              {resultado.cancelados > 0 && ": sus turnos se cancelaron por el complejo y no pierden la seña"}.
            </p>
            <ul className="lista-afectados">
              {resultado.afectados.map((t) => (
                <li key={t.id_reserva}>
                  <strong>{hora(t.hora_inicio)}</strong> {t.cancha} · {t.cliente ?? "-"} · {t.telefono ?? "sin teléfono"}
                  {t.id_partido && <span className="texto-aviso"> · partido de torneo: reprogramalo desde el torneo</span>}
                  {Number(t.sena_pagada) > 0 && <span className="texto-suave"> · seña {pesos(t.sena_pagada)} a resolver</span>}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="modal-acciones">
          <button className="boton">Listo</button>
        </div>
      </Dialogo>
    );
  }

  return (
    <Dialogo titulo="Cerrar cancha" onCerrar={onCerrar} onSubmit={enviar} ancho>
      <p className="texto-suave sin-margen">Mientras dure el cierre, la cancha no se puede reservar.</p>
      {error && <p className="alerta" role="alert">{error}</p>}
      <fieldset className="opciones">
        <legend>Canchas</legend>
        <div className="acciones">
          <button type="button" className="accion-texto" onClick={() => setElegidas(canchas.map((c) => c.id_cancha))}>Todas</button>
          {descubiertas.length > 0 && (
            <button type="button" className="accion-texto" onClick={() => setElegidas(descubiertas)}>Las descubiertas</button>
          )}
        </div>
        <div className="chips">
          {canchas.map((c) => (
            <label key={c.id_cancha} className={`chip ${elegidas.includes(c.id_cancha) ? "activo" : ""}`}>
              <input type="checkbox" className="solo-lectores" checked={elegidas.includes(c.id_cancha)} onChange={() => alternar(c.id_cancha)} />
              {c.nombre}{c.techada ? "" : " (descubierta)"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grilla-campos">
        <label className="campo">
          Motivo
          <select value={datos.motivo} onChange={(e) => cambiar("motivo", e.target.value)}>
            {Object.entries(MOTIVO_CIERRE).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          Detalle (opcional)
          <input value={datos.detalle} onChange={(e) => cambiar("detalle", e.target.value)} maxLength={200} />
        </label>
        <label className="campo">
          Desde el día
          <input type="date" value={datos.desdeFecha} onChange={(e) => cambiar("desdeFecha", e.target.value)} />
        </label>
        <label className="campo">
          a las
          <input type="time" step="1800" value={datos.desdeHora} onChange={(e) => cambiar("desdeHora", e.target.value)} />
        </label>
        <label className="campo">
          Hasta el día
          <input type="date" value={datos.hastaFecha} min={datos.desdeFecha} onChange={(e) => cambiar("hastaFecha", e.target.value)} />
        </label>
        <label className="campo">
          a las <small>(vacío = hasta el cierre del día)</small>
          <input type="time" step="1800" value={datos.hastaHora} onChange={(e) => cambiar("hastaHora", e.target.value)} />
        </label>
      </div>
      <label className="campo-check">
        <input type="checkbox" checked={datos.cancelar} onChange={(e) => cambiar("cancelar", e.target.checked)} />
        Cancelar los turnos reservados en ese horario (el jugador no pierde la seña)
      </label>
      <div className="modal-acciones">
        <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Volver</button>
        <button className="boton boton-peligro" disabled={enviando}>{enviando ? "Cerrando..." : "Cerrar cancha"}</button>
      </div>
    </Dialogo>
  );
}
