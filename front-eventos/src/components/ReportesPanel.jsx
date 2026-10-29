import { useEffect, useState } from "react";
import { obtenerReportes } from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import { DEPORTE, capitalizar, fechaCorta, hoyISO, pesos, sumarDias } from "../utils/formato";

const PERIODOS = [
  [7, "Últimos 7 días"],
  [30, "Últimos 30 días"],
  [90, "Últimos 90 días"]
];

const NOMBRE_DIA = { miercoles: "Miércoles", sabado: "Sábado" };

// Actividad del complejo para el dueño: qué canchas y qué horarios se ocupan más,
// cuáles quedan vacíos y cómo terminan los turnos (jugados, cancelados, no vinieron)
export default function ReportesPanel() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    const hasta = hoyISO();
    obtenerReportes(sumarDias(hasta, -(dias - 1)), hasta)
      .then(({ data }) => {
        if (!vigente) return;
        setDatos(data);
        setError("");
      })
      .catch((err) => vigente && setError(mensajeDeError(err, "No se pudieron cargar los reportes")));
    return () => {
      vigente = false;
    };
  }, [dias]);

  const r = datos?.resumen;
  const horas = datos?.por_hora ?? [];
  const ordenadas = [...horas].sort((a, b) => b.ocupacion - a.ocupacion).filter((h) => h.ocupacion > 0);
  // Si hay horarios sin ningún turno se nombran todos (elegir 3 entre varios en 0 % sería arbitrario)
  const vacias = horas.filter((h) => h.ocupacion === 0).map((h) => h.hora);
  const menosPedidas = vacias.length > 0 ? vacias : [...ordenadas].reverse().slice(0, 3).map((h) => h.hora);

  return (
    <section>
      <div className="barra">
        <div className="segmentado" role="group" aria-label="Período">
          {PERIODOS.map(([n, nombre]) => (
            <button
              key={n}
              className={dias === n ? "activo" : ""}
              aria-pressed={dias === n}
              onClick={() => {
                setDatos(null);
                setDias(n);
              }}
            >
              {nombre}
            </button>
          ))}
        </div>
        {datos && <span className="texto-suave">Del {fechaCorta(datos.desde)} al {fechaCorta(datos.hasta)}</span>}
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}
      {!datos ? (
        !error && <p className="texto-suave">Cargando reportes...</p>
      ) : (
        <>
          <div className="estadisticas">
            <div className="tarjeta estadistica"><span>Ocupación de las canchas</span><strong>{r.ocupacion} %</strong></div>
            <div className="tarjeta estadistica"><span>Turnos</span><strong>{r.turnos}</strong></div>
            <div className="tarjeta estadistica"><span>Cobrado</span><strong>{pesos(r.cobrado)}</strong></div>
            <div className="tarjeta estadistica"><span>Señas perdidas</span><strong>{pesos(r.senas_perdidas)}</strong></div>
          </div>
          <p className="desglose">
            <span>Jugados: <strong>{r.jugados}</strong></span>
            <span>No vinieron: <strong>{r.ausentes}</strong></span>
            <span>Cancelados: <strong>{r.cancelados}</strong> ({r.cancelaciones_tardias} con menos de las horas de aviso)</span>
            <span>De turnos fijos: <strong>{r.de_turnos_fijos}</strong></span>
            <span>Partidos de torneo: <strong>{r.partidos_de_torneo}</strong></span>
          </p>

          {horas.length > 0 && (
            <p className="lectura-reporte">
              {ordenadas.length > 0 && (
                <>Horarios con más demanda: <strong>{ordenadas.slice(0, 3).map((h) => h.hora).join(", ")}</strong>. </>
              )}
              {vacias.length > 0 ? "Sin ningún turno en el período" : "Los que más quedan vacíos"}:{" "}
              <strong>{menosPedidas.join(", ")}</strong>.
            </p>
          )}

          <div className="columnas-reportes">
            <TablaBarras
              titulo="Ocupación por cancha"
              columna="Cancha"
              filas={datos.por_cancha.map((c) => ({
                clave: c.id_cancha,
                etiqueta: `${c.nombre}${c.activa ? "" : " (inactiva)"}`,
                detalle: `${DEPORTE[c.deporte]} · ${c.turnos} turnos · ${c.horas} h`,
                valor: c.ocupacion
              }))}
            />
            <TablaBarras
              titulo="Ocupación por día de la semana"
              columna="Día"
              filas={datos.por_dia.map((d) => ({
                clave: d.dia,
                etiqueta: NOMBRE_DIA[d.dia] ?? capitalizar(d.dia),
                detalle: `${d.turnos} turnos`,
                valor: d.ocupacion
              }))}
            />
          </div>
          <TablaBarras
            titulo="Ocupación por horario"
            columna="Hora"
            filas={horas.map((h) => ({ clave: h.hora, etiqueta: h.hora, detalle: `${h.turnos} turnos empiezan a esta hora`, valor: h.ocupacion }))}
          />
          <p className="texto-suave nota-reporte">
            Ocupación: qué parte del horario de apertura estuvieron ocupadas las canchas (turnos, turnos fijos y partidos; no
            cuenta los cancelados). Se calcula con los horarios de atención del perfil.
          </p>
        </>
      )}
    </section>
  );
}

// Tabla con una barra de ocupación por fila. Es una sola serie: el título dice
// qué se mide y el porcentaje va escrito al lado de cada barra.
function TablaBarras({ titulo, columna, filas }) {
  return (
    <div className="tarjeta reporte">
      <h3>{titulo}</h3>
      {filas.length === 0 ? (
        <p className="texto-suave">Sin datos en este período.</p>
      ) : (
        <table className="tabla tabla-barras">
          <thead>
            <tr>
              <th>{columna}</th>
              <th className="numero">Ocupación</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} title={`${f.etiqueta}: ${f.valor} % de ocupación · ${f.detalle}`}>
                <td>
                  <span className="barra-etiqueta">{f.etiqueta}</span>
                  <small className="texto-suave">{f.detalle}</small>
                </td>
                <td className="celda-barra">
                  <span className="pista" aria-hidden="true">
                    <span className="relleno" style={{ width: `${Math.min(100, f.valor)}%` }} />
                  </span>
                  <span className="numero">{f.valor} %</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
