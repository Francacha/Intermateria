import { useEffect, useState } from "react";
import Confirmar from "./Confirmar";
import { actualizarTurnoFijo, crearTurnoFijo, obtenerTurnosFijos } from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import {
  DIA_SEMANA,
  DURACION_TURNO,
  aHora,
  aMinutos,
  diaDeLaSemana,
  fechaCorta,
  hora,
  hoyISO,
  pesos,
  precioTurno
} from "../utils/formato";

// Turnos fijos: grupos que juegan siempre el mismo día y horario. Cada semana
// aparece en la agenda como un turno más; si el grupo avisa que una semana no
// viene, se libera esa fecha desde la agenda y conserva su horario.
export default function TurnosFijosPanel({ canchas, reglas }) {
  const [fijos, setFijos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [formulario, setFormulario] = useState(false);
  const [baja, setBaja] = useState(null);

  useEffect(() => {
    obtenerTurnosFijos()
      .then(({ data }) => setFijos(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar los turnos fijos")));
  }, []);

  const activos = (fijos ?? []).filter((f) => f.activo);
  const anteriores = (fijos ?? []).filter((f) => !f.activo);

  return (
    <section>
      <div className="barra">
        <p className="texto-suave sin-margen">
          Cada semana del turno fijo ocupa la cancha en la agenda. Si un grupo avisa que no viene, liberá esa fecha
          desde la agenda con <strong>Liberar semana</strong>: el resto de las semanas sigue igual.
        </p>
        <button className="boton" onClick={() => setFormulario(true)} disabled={!canchas.length}>+ Nuevo turno fijo</button>
      </div>

      {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
      {error && <p className="alerta" role="alert">{error}</p>}

      {formulario && (
        <FormTurnoFijo
          canchas={canchas.filter((c) => c.activa !== false)}
          reglas={reglas}
          onGuardar={async (datos) => {
            const { data } = await crearTurnoFijo(datos);
            setFijos(data);
            setFormulario(false);
            setAviso(`Turno fijo creado: ${datos.contacto_nombre}, los ${DIA_SEMANA[datos.dia_semana].toLowerCase()} a las ${datos.hora_inicio}.`);
          }}
          onCancelar={() => setFormulario(false)}
        />
      )}

      {!fijos ? (
        <p className="texto-suave">Cargando turnos fijos...</p>
      ) : activos.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No hay turnos fijos. Cargá los grupos que juegan todas las semanas para que nadie reserve su horario.</p>
        </div>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Día y horario</th>
                <th>Cancha</th>
                <th>Grupo</th>
                <th>Precio</th>
                <th>Próxima vez</th>
                <th><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {activos.map((f) => (
                <tr key={f.id_turno_fijo}>
                  <td>
                    <strong>{DIA_SEMANA[f.dia_semana]}</strong> {hora(f.hora_inicio)} a {hora(f.hora_fin)}
                  </td>
                  <td><span className={`punto punto-${f.deporte}`} /> {f.cancha}</td>
                  <td>
                    <div className="celda-cliente">
                      <span>{f.contacto_nombre}</span>
                      <small className="texto-suave">{f.contacto_telefono ?? "Sin teléfono"} · desde {fechaCorta(f.desde)}</small>
                      {f.inasistencias > 0 && (
                        <small className="aviso-faltas">Faltó sin avisar {f.inasistencias} {f.inasistencias === 1 ? "vez" : "veces"}</small>
                      )}
                    </div>
                  </td>
                  <td>{pesos(f.precio)}</td>
                  <td>
                    <div className="celda-cliente">
                      <span>{f.proxima ? fechaCorta(f.proxima) : "-"}</span>
                      {f.liberadas.length > 0 && (
                        <small className="texto-suave">
                          Liberadas: {f.liberadas.map((d) => fechaCorta(d)).join(", ")}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <button className="accion-texto peligro" onClick={() => setBaja(f)}>Dar de baja</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {anteriores.length > 0 && (
        <details className="anteriores">
          <summary>Turnos fijos dados de baja ({anteriores.length})</summary>
          <ul>
            {anteriores.map((f) => (
              <li key={f.id_turno_fijo} className="texto-suave">
                {DIA_SEMANA[f.dia_semana]} {hora(f.hora_inicio)} · {f.cancha} · {f.contacto_nombre}
                {f.hasta && ` · hasta ${fechaCorta(f.hasta)}`}
              </li>
            ))}
          </ul>
        </details>
      )}

      {baja && (
        <Confirmar
          titulo="Dar de baja el turno fijo"
          textoBoton="Dar de baja"
          peligro
          onConfirmar={async () => {
            const { data } = await actualizarTurnoFijo(baja.id_turno_fijo, { activo: false });
            setFijos(data.turnos_fijos);
            setBaja(null);
            setAviso(
              `${baja.contacto_nombre} ya no tiene turno fijo. ${data.canceladas} ${data.canceladas === 1 ? "fecha liberada" : "fechas liberadas"} en la agenda.`
            );
          }}
          onCerrar={() => setBaja(null)}
        >
          <p>
            {baja.contacto_nombre} deja de jugar los {DIA_SEMANA[baja.dia_semana].toLowerCase()} a las {hora(baja.hora_inicio)} en {baja.cancha}.
            Las próximas fechas se liberan para que las reserve otra gente.
          </p>
        </Confirmar>
      )}
    </section>
  );
}

function FormTurnoFijo({ canchas, reglas, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState({
    id_cancha: canchas[0]?.id_cancha ?? "",
    dia_semana: diaDeLaSemana(hoyISO()),
    hora_inicio: "20:00",
    contacto_nombre: "",
    contacto_telefono: "",
    desde: hoyISO()
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });
  const cancha = canchas.find((c) => String(c.id_cancha) === String(datos.id_cancha));
  const valida = /^\d{2}:\d{2}$/.test(datos.hora_inicio);

  const enviar = async (e) => {
    e.preventDefault();
    if (!datos.contacto_nombre.trim()) return setError("Indicá el nombre del grupo o de quién reserva.");
    setError("");
    setEnviando(true);
    try {
      await onGuardar({ ...datos, id_cancha: Number(datos.id_cancha), dia_semana: Number(datos.dia_semana) });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear el turno fijo"));
      setEnviando(false);
    }
  };

  return (
    <form className="tarjeta formulario-inline" onSubmit={enviar} noValidate>
      <h3>Nuevo turno fijo</h3>
      {error && <p className="alerta" role="alert">{error}</p>}
      <div className="grilla-campos grilla-tres">
        <label className="campo">
          Cancha
          <select value={datos.id_cancha} onChange={(e) => cambiar("id_cancha", e.target.value)}>
            {canchas.map((c) => <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          Todos los
          <select value={datos.dia_semana} onChange={(e) => cambiar("dia_semana", e.target.value)}>
            {Object.entries(DIA_SEMANA).map(([n, nombre]) => <option key={n} value={n}>{nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          A las
          <input type="time" step="1800" value={datos.hora_inicio} onChange={(e) => cambiar("hora_inicio", e.target.value)} />
        </label>
        <label className="campo">
          Grupo o responsable *
          <input value={datos.contacto_nombre} onChange={(e) => cambiar("contacto_nombre", e.target.value)} maxLength={100} placeholder="Ej: Los del miércoles (Diego)" autoFocus />
        </label>
        <label className="campo">
          Teléfono
          <input value={datos.contacto_telefono} onChange={(e) => cambiar("contacto_telefono", e.target.value)} maxLength={30} />
        </label>
        <label className="campo">
          Desde
          <input type="date" value={datos.desde} min={hoyISO()} onChange={(e) => cambiar("desde", e.target.value)} />
        </label>
      </div>
      {cancha && valida && (
        <p className="resumen-turno">
          Todas las semanas de {datos.hora_inicio} a {aHora(Math.min(1440, aMinutos(datos.hora_inicio) + DURACION_TURNO[cancha.deporte]))} ·{" "}
          <strong>{pesos(precioTurno(cancha, datos.hora_inicio, reglas.hora_noche))}</strong> por turno
        </p>
      )}
      <div className="modal-acciones">
        <button type="button" className="boton boton-fantasma" onClick={onCancelar}>Cancelar</button>
        <button className="boton" disabled={enviando}>{enviando ? "Guardando..." : "Crear turno fijo"}</button>
      </div>
    </form>
  );
}
