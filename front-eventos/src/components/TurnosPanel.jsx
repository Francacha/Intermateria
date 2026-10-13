import { useEffect, useState } from "react";
import { actualizarTurno, crearTurno, obtenerTurnos } from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import { ESTADO_TURNO, fechaLarga, hora, hoyISO, pesos, sumarDias } from "../utils/formato";

// Agenda de turnos del complejo, día por día
export default function TurnosPanel({ canchas }) {
  const [fecha, setFecha] = useState(hoyISO);
  const [turnos, setTurnos] = useState(null);
  const [filtroCancha, setFiltroCancha] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [recargas, setRecargas] = useState(0);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerTurnos(fecha)
      .then(({ data }) => {
        if (!vigente) return;
        setTurnos(data);
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
    setFecha(nueva);
  };

  const cambiar = async (turno, datos) => {
    try {
      const { data } = await actualizarTurno(turno.id_reserva, datos);
      setTurnos(turnos.map((t) => (t.id_reserva === data.id_reserva ? data : t)));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo actualizar el turno"));
    }
  };

  const cargar = async (datos) => {
    setCargando(true);
    try {
      await crearTurno(datos);
      setCargando(false);
      if (datos.fecha === fecha) setRecargas((n) => n + 1);
      else cambiarFecha(datos.fecha);
    } catch (err) {
      setCargando(false);
      throw mensajeDeError(err, "No se pudo cargar el turno");
    }
  };

  const lista = (turnos ?? []).filter((t) => !filtroCancha || String(t.id_cancha) === filtroCancha);
  const vigentes = lista.filter((t) => t.estado !== "cancelada");
  const reservas = vigentes.filter((t) => !t.id_partido);
  const total = reservas.reduce((s, t) => s + Number(t.precio_total), 0);
  const senas = reservas.reduce((s, t) => s + Number(t.sena), 0);

  return (
    <section>
      <div className="barra">
        <div className="navegador-fecha">
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, -1))} title="Día anterior">‹</button>
          <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} />
          <button className="boton-icono" onClick={() => cambiarFecha(sumarDias(fecha, 1))} title="Día siguiente">›</button>
          {fecha !== hoyISO() && (
            <button className="boton boton-fantasma" onClick={() => cambiarFecha(hoyISO())}>Hoy</button>
          )}
        </div>
        <div className="acciones">
          <select className="selector" value={filtroCancha} onChange={(e) => setFiltroCancha(e.target.value)}>
            <option value="">Todas las canchas</option>
            {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
          </select>
          <button className="boton" onClick={() => setModal(true)} disabled={!canchas.length}>+ Cargar turno</button>
        </div>
      </div>

      <h2 className="subtitulo-dia">{fechaLarga(fecha)}</h2>
      <div className="estadisticas estadisticas-chicas">
        <div className="tarjeta estadistica"><span>Turnos</span><strong>{reservas.length}</strong></div>
        <div className="tarjeta estadistica"><span>Partidos de torneo</span><strong>{vigentes.length - reservas.length}</strong></div>
        <div className="tarjeta estadistica"><span>A cobrar</span><strong>{pesos(total)}</strong></div>
        <div className="tarjeta estadistica"><span>Señas</span><strong>{pesos(senas)}</strong></div>
      </div>

      {error && <p className="alerta">{error}</p>}
      {!turnos ? (
        <p className="texto-suave">Cargando turnos...</p>
      ) : lista.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No hay turnos para este día.</p>
        </div>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Horario</th>
                <th>Cancha</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Precio</th>
                <th>Seña</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id_reserva} className={t.estado === "cancelada" ? "fila-cancelada" : ""}>
                  <td><strong>{hora(t.hora_inicio)}</strong> a {hora(t.hora_fin)}</td>
                  <td>
                    <span className={`punto punto-${t.deporte}`} /> {t.cancha}
                  </td>
                  <td>
                    {t.id_partido && <span className="insignia insignia-torneo">Torneo</span>} {t.cliente ?? "-"}
                    {!t.id_partido && !t.id_cliente && <small className="texto-suave"> (cargado a mano)</small>}
                  </td>
                  <td>{t.telefono ?? "-"}</td>
                  <td>{t.id_partido ? "-" : pesos(t.precio_total)}</td>
                  <td>
                    {t.id_partido ? "-" : (
                      <CampoSena turno={t} onGuardar={(sena) => cambiar(t, { sena })} />
                    )}
                  </td>
                  <td>
                    {t.id_partido ? (
                      <span className={`insignia turno-${t.estado}`}>{ESTADO_TURNO[t.estado]}</span>
                    ) : (
                      <select
                        className={`selector selector-estado turno-${t.estado}`}
                        value={t.estado}
                        onChange={(e) => cambiar(t, { estado: e.target.value })}
                      >
                        {Object.entries(ESTADO_TURNO).map(([valor, nombre]) => (
                          <option key={valor} value={valor}>{nombre}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TurnoModal
          canchas={canchas.filter((c) => c.activa !== false)}
          fecha={fecha < hoyISO() ? hoyISO() : fecha}
          cargando={cargando}
          onGuardar={async (datos) => {
            await cargar(datos);
            setModal(false);
          }}
          onCerrar={() => setModal(false)}
        />
      )}
    </section>
  );
}

// La seña se edita en la misma tabla y se guarda al salir del campo
function CampoSena({ turno, onGuardar }) {
  const [valor, setValor] = useState(String(Number(turno.sena)));
  const guardar = () => {
    if (Number(valor) !== Number(turno.sena) && Number(valor) >= 0) onGuardar(Number(valor));
  };
  return (
    <input
      className="campo-sena"
      type="number"
      min="0"
      step="500"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function TurnoModal({ canchas, fecha, cargando, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState({
    id_cancha: canchas[0]?.id_cancha ?? "",
    fecha,
    hora_inicio: "20:00",
    duracion: canchas[0]?.deporte === "padel" ? 90 : 60,
    contacto_nombre: "",
    contacto_telefono: "",
    sena: ""
  });
  const [error, setError] = useState("");

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onGuardar({ ...datos, id_cancha: Number(datos.id_cancha), duracion: Number(datos.duracion), sena: Number(datos.sena) || 0 });
    } catch (mensaje) {
      setError(mensaje);
    }
  };

  const cancha = canchas.find((c) => String(c.id_cancha) === String(datos.id_cancha));

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal" onSubmit={enviar} onClick={(e) => e.stopPropagation()}>
        <h2>Cargar turno</h2>
        <p className="texto-suave sin-margen">Para clientes que reservan por teléfono o en el mostrador.</p>
        {error && <p className="alerta">{error}</p>}
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
            Duración
            <select value={datos.duracion} onChange={(e) => cambiar("duracion", e.target.value)}>
              <option value={60}>1 hora</option>
              <option value={90}>1 h 30</option>
              <option value={120}>2 horas</option>
            </select>
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
            Seña ($)
            <input type="number" min="0" step="500" value={datos.sena} onChange={(e) => cambiar("sena", e.target.value)} />
          </label>
          {cancha && (
            <p className="texto-suave">
              Total: <strong>{pesos((Number(cancha.precio_hora) * Number(datos.duracion)) / 60)}</strong>
            </p>
          )}
        </div>
        <div className="modal-acciones">
          <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="boton" disabled={cargando}>{cargando ? "Guardando..." : "Guardar turno"}</button>
        </div>
      </form>
    </div>
  );
}
