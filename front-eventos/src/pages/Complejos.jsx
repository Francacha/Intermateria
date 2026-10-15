import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Cargando, ConError } from "../components/Estados";
import HorariosLibres from "../components/HorariosLibres";
import Icono from "../components/Icono";
import { mensajeDeError } from "../service/api";
import { obtenerComplejos, obtenerHorariosLibres } from "../service/publicoService";
import {
  DEPORTE,
  FRANJAS,
  cuandoEs,
  detalleDeCancha,
  duracionPorDefecto,
  duracionTexto,
  enFranja,
  etiquetaDia,
  franjaPorDefecto,
  hoyISO,
  pesos,
  proximosDias,
  sumarDias,
  tipoDeCancha
} from "../utils/formato";

const DIAS_A_MOSTRAR = 7;

const FILTROS = [
  ["", "Todos"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

const plural = (n, singular, varios) => `${n} ${n === 1 ? singular : varios}`;

// Catálogo: los complejos con sus canchas y los horarios libres del día y la franja elegidos.
// Día, franja, deporte y búsqueda van en la URL (?dia=2026-10-15&franja=noche&deporte=padel&q=norte)
// para poder volver con Atrás o compartir el link.
export default function Complejos() {
  const [params, setParams] = useSearchParams();
  const dias = proximosDias(DIAS_A_MOSTRAR);
  const fecha = dias.includes(params.get("dia")) ? params.get("dia") : dias[0];
  const franja = FRANJAS.some((f) => f.id === params.get("franja")) ? params.get("franja") : franjaPorDefecto(fecha);
  const deporte = DEPORTE[params.get("deporte")] ? params.get("deporte") : "";
  const consulta = params.get("q") ?? "";

  const [busqueda, setBusqueda] = useState(consulta);
  const [estado, setEstado] = useState(null); // última consulta terminada: { clave, complejos, manana, error }
  const [recargas, setRecargas] = useState(0);
  const espera = useRef(null);

  // Si la búsqueda de la URL cambia por otro lado (por ejemplo, con Atrás), el input la sigue
  const [consultaVista, setConsultaVista] = useState(consulta);
  if (consulta !== consultaVista) {
    setConsultaVista(consulta);
    if (consulta !== busqueda.trim()) setBusqueda(consulta);
  }

  // Día, franja y deporte suman una entrada al historial (Atrás los deshace);
  // lo que se tipea en la búsqueda la reemplaza, para no llenar el historial de letras
  const cambiar = (cambios, reemplazar = false) =>
    setParams(
      (previos) => {
        const nuevos = new URLSearchParams(previos);
        Object.entries(cambios).forEach(([clave, valor]) => (valor ? nuevos.set(clave, valor) : nuevos.delete(clave)));
        return nuevos;
      },
      { replace: reemplazar }
    );

  const tipear = (texto) => {
    setBusqueda(texto);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => cambiar({ q: texto.trim() }, true), 250);
  };

  const limpiarBusqueda = () => {
    clearTimeout(espera.current);
    setBusqueda("");
    cambiar({ q: "" });
  };

  const elegirDia = (dia) => cambiar({ dia: dia === dias[0] ? "" : dia });

  const clave = `${fecha}|${deporte}|${consulta}|${recargas}`;

  useEffect(() => {
    let vigente = true; // si cambia el filtro antes de que responda, esta respuesta se descarta
    const manana = sumarDias(hoyISO(), 1);
    (async () => {
      try {
        const { data } = await obtenerComplejos({ deporte: deporte || undefined, q: consulta || undefined });
        const canchas = data.flatMap((c) => c.canchas);
        // Si se mira hoy, también se trae mañana para sugerirlo cuando hoy ya no queda nada
        const [delDia, deManana] = await Promise.all([
          obtenerHorariosLibres(canchas, fecha, deporte),
          fecha === hoyISO() ? obtenerHorariosLibres(canchas, manana, deporte) : null
        ]);
        const conHorarios = (horarios) =>
          data.map((complejo) => ({
            ...complejo,
            canchas: complejo.canchas.map((cancha) => ({ ...cancha, ...horarios.get(cancha.id_cancha) }))
          }));
        if (vigente) {
          setEstado({ clave, complejos: conHorarios(delDia), manana: deManana && conHorarios(deManana), error: "" });
        }
      } catch (err) {
        if (vigente) setEstado({ clave, complejos: null, manana: null, error: mensajeDeError(err, "No pudimos cargar los complejos.") });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [clave, fecha, deporte, consulta]);

  const actualizando = estado && estado.clave !== clave;
  const complejos = estado?.complejos;
  const nombreFranja = FRANJAS.find((f) => f.id === franja).nombre.toLowerCase();

  // Cuántos horarios libres hay en una franja, sumando todas las canchas
  const libresEn = (lista, idFranja) =>
    (lista ?? []).reduce(
      (suma, c) => suma + c.canchas.reduce((s, k) => s + (k.libres ?? []).filter((h) => enFranja(h, idFranja)).length, 0),
      0
    );
  const totalFranja = libresEn(complejos, franja);
  const otrasFranjas = FRANJAS.filter((f) => f.id !== franja)
    .map((f) => ({ ...f, libres: libresEn(complejos, f.id) }))
    .filter((f) => f.libres > 0);
  const libresManana = libresEn(estado?.manana, franja);

  let resumen = "Buscando complejos…";
  if (estado && !actualizando && complejos?.length) {
    resumen = `${plural(complejos.length, "complejo", "complejos")} · ${plural(totalFranja, "horario libre", "horarios libres")} ${nombreFranja} ${cuandoEs(fecha)}`;
  } else if (estado && !actualizando && complejos) {
    resumen = "Sin resultados";
  }

  return (
    <main className="contenedor panel catalogo">
      <h1>Encontrá dónde jugar</h1>
      <p className="texto-suave catalogo-resumen" aria-live="polite">{resumen}</p>

      <div className="catalogo-filtros">
        <div className="dias" role="group" aria-label="Día">
          {dias.map((dia) => (
            <button key={dia} className={`dia ${dia === fecha ? "activo" : ""}`} aria-pressed={dia === fecha} onClick={() => elegirDia(dia)}>
              {etiquetaDia(dia)}
            </button>
          ))}
        </div>
        <div className="catalogo-fila">
          <div className="segmentado" role="group" aria-label="Franja horaria">
            {FRANJAS.map((f) => (
              <button key={f.id} className={franja === f.id ? "activo" : ""} aria-pressed={franja === f.id} onClick={() => cambiar({ franja: f.id })}>
                {f.nombre}
              </button>
            ))}
          </div>
          <div className="segmentado" role="group" aria-label="Deporte">
            {FILTROS.map(([id, nombre]) => (
              <button key={id} className={deporte === id ? "activo" : ""} aria-pressed={deporte === id} onClick={() => cambiar({ deporte: id })}>
                {nombre}
              </button>
            ))}
          </div>
          <input
            className="buscador"
            type="search"
            aria-label="Buscar complejo por nombre o dirección"
            placeholder="Buscar por nombre o dirección"
            value={busqueda}
            onChange={(e) => tipear(e.target.value)}
          />
        </div>
      </div>

      {!estado ? (
        <Cargando filas={4} etiqueta="Cargando complejos" conHorarios />
      ) : estado.error && !actualizando ? (
        <ConError mensaje={estado.error} onReintentar={() => setRecargas((n) => n + 1)} />
      ) : complejos?.length === 0 && !actualizando ? (
        <div className="tablero tablero-estado">
          <p>
            No encontramos complejos
            {deporte && ` con canchas de ${DEPORTE[deporte].toLowerCase()}`}
            {consulta && ` que coincidan con «${consulta}»`}.
          </p>
          <div className="acciones-vacio">
            {consulta && <button className="boton boton-fantasma" onClick={limpiarBusqueda}>Limpiar búsqueda</button>}
            {deporte && <button className="boton boton-fantasma" onClick={() => cambiar({ deporte: "" })}>Ver todos los deportes</button>}
          </div>
        </div>
      ) : (
        <>
          {/* Sin horarios en esta franja: se sugiere otra franja o mañana */}
          {!actualizando && totalFranja === 0 && (otrasFranjas.length > 0 || libresManana > 0) && (
            <div className="tablero tablero-estado sugerencia" role="status">
              <p>
                No quedan horarios libres {nombreFranja} {cuandoEs(fecha)}.
              </p>
              <div className="acciones-vacio">
                {libresManana > 0 && (
                  <button className="boton" onClick={() => elegirDia(sumarDias(hoyISO(), 1))}>
                    Ver mañana · {plural(libresManana, "horario", "horarios")} {nombreFranja}
                  </button>
                )}
                {otrasFranjas.map((f) => (
                  <button key={f.id} className="boton boton-fantasma" onClick={() => cambiar({ franja: f.id })}>
                    {f.nombre} · {f.libres}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={`catalogo-lista ${actualizando ? "actualizando" : ""}`} aria-busy={actualizando || undefined}>
            {(complejos ?? []).map((complejo) => (
              <BloqueComplejo key={complejo.id_empresa} complejo={complejo} fecha={fecha} franja={franja} nombreFranja={nombreFranja} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function BloqueComplejo({ complejo, fecha, franja, nombreFranja }) {
  const cerrado = complejo.canchas.every((c) => c.cerrado);

  return (
    <article className="tablero bloque-complejo" aria-labelledby={`complejo-${complejo.id_empresa}`}>
      <header className="bloque-cabecera">
        <div className="bloque-titulo">
          <h2 id={`complejo-${complejo.id_empresa}`}>
            <Link to={`/complejos/${complejo.id_empresa}`}>
              {complejo.nombre} <Icono nombre="flecha" tamano={18} />
            </Link>
          </h2>
          {complejo.direccion && <p className="texto-suave">{complejo.direccion}</p>}
          {complejo.servicios.length > 0 && <p className="bloque-servicios">{complejo.servicios.join(" · ")}</p>}
        </div>
        {complejo.torneos_activos > 0 && (
          <span className="insignia insignia-torneo">
            {plural(complejo.torneos_activos, "torneo activo", "torneos activos")}
          </span>
        )}
      </header>

      {cerrado ? (
        <p className="renglon bloque-cerrado">El complejo no abre {cuandoEs(fecha)}. Probá con otro día.</p>
      ) : (
        <ul>
          {complejo.canchas.map((cancha) => {
            const enLaFranja = cancha.libres.filter((h) => enFranja(h, franja));
            return (
              <li key={cancha.id_cancha} className={`renglon renglon-${cancha.deporte}`}>
                <span className={`mini-dibujo mini-${cancha.deporte}`} aria-hidden="true" />
                <div className="renglon-info">
                  <strong>{cancha.nombre}</strong>
                  <span className="texto-suave">
                    {tipoDeCancha(cancha)} · {detalleDeCancha(cancha)} · {pesos(cancha.precio_hora)} la hora
                  </span>
                  <span className="renglon-duracion">Turnos de {duracionTexto(duracionPorDefecto(cancha.deporte))}</span>
                </div>
                <HorariosLibres
                  cancha={cancha}
                  idEmpresa={complejo.id_empresa}
                  fecha={fecha}
                  libres={enLaFranja}
                  cerrado={cancha.cerrado}
                  sinHorarios={
                    <span className="renglon-sin-horarios">
                      {cancha.libres.length > 0 ? `Sin horarios libres ${nombreFranja}` : "Sin horarios libres este día"}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
