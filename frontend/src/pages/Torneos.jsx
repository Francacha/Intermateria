import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cargando, ConError } from "../components/Estados";
import Icono from "../components/Icono";
import { FilaTorneo } from "../components/Torneo";
import { obtenerTorneosPublicos } from "../service/publicoService";
import useCarga from "../service/useCarga";
import { DEPORTE, FORMATO, hoyISO } from "../utils/formato";

const DEPORTES = [
  ["", "Todos"],
  ["futbol", "Fútbol"],
  ["padel", "Pádel"]
];

const FORMATOS = [
  ["", "Cualquier formato"],
  ["torneo", FORMATO.torneo],
  ["campeonato", FORMATO.campeonato]
];

const CUANDO = [
  ["", "Cualquier fecha"],
  ["este-mes", "Este mes"],
  ["mas-adelante", "Más adelante"]
];

const plural = (n, singular, varios) => `${n} ${n === 1 ? singular : varios}`;
const conLugares = (t) => t.estado === "inscripcion" && t.inscriptos < t.cupo;
const porFecha = (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio);
// "4ta categoría" ya dice "categoría"; "Libre" no
const nombreCategoria = (c) => (c.toLowerCase().includes("categor") ? c : `categoría ${c}`);

// Si no hay resultados, se prueba sacando un filtro a la vez para sugerir lo más cercano
const RELAJAR = [
  ["cuando", "en cualquier fecha"],
  ["lugares", "incluyendo los que ya están llenos"],
  ["formato", "de cualquier formato"],
  ["categoria", "de cualquier categoría"],
  ["deporte", "de los dos deportes"]
];

// Todos los torneos se piden una vez; los filtros se aplican acá y quedan en la URL
// (?deporte=padel&formato=torneo&cuando=este-mes&categoria=4ta&lugares=1) para volver con Atrás o compartir.
export default function Torneos() {
  const { datos, error, reintentar } = useCarga(obtenerTorneosPublicos, "No pudimos cargar los torneos.");
  const [params, setParams] = useSearchParams();
  const [masFiltros, setMasFiltros] = useState(false);

  const todos = (datos ?? []).filter((t) => t.estado !== "cancelado");
  const mesActual = hoyISO().slice(0, 7);

  const filtros = {
    deporte: DEPORTE[params.get("deporte")] ? params.get("deporte") : "",
    formato: FORMATO[params.get("formato")] ? params.get("formato") : "",
    cuando: CUANDO.some(([id]) => id && id === params.get("cuando")) ? params.get("cuando") : "",
    categoria: params.get("categoria") ?? "",
    lugares: params.get("lugares") === "1" ? "1" : ""
  };
  // Las categorías salen de los torneos del deporte elegido; una que no existe ahí no filtra
  const categorias = [
    ...new Set(todos.filter((t) => !filtros.deporte || t.deporte === filtros.deporte).map((t) => t.categoria).filter(Boolean))
  ].sort();
  if (!categorias.includes(filtros.categoria)) filtros.categoria = "";
  const { deporte, formato, cuando, categoria, lugares } = filtros;
  const hayFiltros = Object.values(filtros).some(Boolean);
  const extrasActivos = [formato, cuando].filter(Boolean).length;

  const coincide = (t, f) =>
    (!f.deporte || t.deporte === f.deporte) &&
    (!f.formato || t.tipo === f.formato) &&
    (!f.categoria || t.categoria === f.categoria) &&
    (f.cuando !== "este-mes" || t.fecha_inicio.slice(0, 7) === mesActual) &&
    (f.cuando !== "mas-adelante" || t.fecha_inicio.slice(0, 7) > mesActual) &&
    (!f.lugares || conLugares(t));
  const visibles = todos.filter((t) => coincide(t, filtros));

  // Cada filtro suma una entrada al historial: Atrás lo deshace
  const cambiar = (cambios) =>
    setParams((previos) => {
      const nuevos = new URLSearchParams(previos);
      Object.entries(cambios).forEach(([clave, valor]) => (valor ? nuevos.set(clave, valor) : nuevos.delete(clave)));
      return nuevos;
    });
  const quitarFiltros = () => setParams({});
  const elegirDeporte = (id) => {
    const pedida = params.get("categoria");
    const sigue = !pedida || todos.some((t) => t.categoria === pedida && (!id || t.deporte === id));
    cambiar({ deporte: id, categoria: sigue ? pedida : "" });
  };

  // Abiertos con lugar (por fecha), y aparte los que ya completaron el cupo
  const abiertos = visibles.filter((t) => t.estado === "inscripcion");
  const conLugar = abiertos.filter(conLugares).sort(porFecha);
  const llenos = abiertos.filter((t) => !conLugares(t)).sort(porFecha);
  const enJuego = visibles.filter((t) => t.estado === "en_curso").sort(porFecha);
  const terminados = visibles.filter((t) => t.estado === "finalizado").sort((a, b) => porFecha(b, a));

  const resumen = error
    ? ""
    : !datos
      ? "Buscando torneos…"
    : visibles.length
        ? `${plural(visibles.length, "torneo", "torneos")} · ${visibles.filter(conLugares).length} con lugares`
        : "Sin resultados";

  // "No encontramos torneos de pádel, por eliminación directa, que empiecen este mes, con lugares libres."
  const descripcionFiltros = [
    deporte && `de ${DEPORTE[deporte].toLowerCase()}`,
    formato && (formato === "torneo" ? "por eliminación directa" : "todos contra todos"),
    categoria && `de ${nombreCategoria(categoria)}`,
    cuando === "este-mes" && "que empiecen este mes",
    cuando === "mas-adelante" && "que empiecen más adelante",
    lugares && "con lugares libres"
  ]
    .filter(Boolean)
    .join(", ");
  const sugerencias = RELAJAR.filter(([clave]) => filtros[clave])
    .map(([clave, texto]) => ({ clave, texto, cantidad: todos.filter((t) => coincide(t, { ...filtros, [clave]: "" })).length }))
    .filter((s) => s.cantidad > 0)
    .slice(0, 2);

  const segmentado = (etiqueta, clave, opciones, valor, alElegir = (id) => cambiar({ [clave]: id }), clase = "") => (
    <div className={`segmentado ${clase}`} role="group" aria-label={etiqueta}>
      {opciones.map(([id, nombre]) => (
        <button key={id} className={valor === id ? "activo" : ""} aria-pressed={valor === id} onClick={() => alElegir(id)}>
          {nombre}
        </button>
      ))}
    </div>
  );
  // En el celular, formato y cuándo son selects compactos
  const desplegable = (etiqueta, clave, opciones, valor) => (
    <select className="selector solo-celular" aria-label={etiqueta} value={valor} onChange={(e) => cambiar({ [clave]: e.target.value })}>
      {opciones.map(([id, nombre]) => (
        <option key={id} value={id}>{nombre}</option>
      ))}
    </select>
  );
  // Con "Más filtros" cerrado, los que están activos se ven como chips para sacarlos de a uno
  const activos = [
    formato && ["formato", FORMATO[formato]],
    cuando && ["cuando", CUANDO.find(([id]) => id === cuando)[1]],
    categoria && ["categoria", categoria],
    lugares && ["lugares", "Solo con lugares"]
  ].filter(Boolean);

  return (
    <main className="contenedor panel pagina-torneos">
      <h1>Competí con tu equipo o pareja</h1>
      <p className="texto-suave">Inscribí a tu equipo o pareja y seguí el fixture y la tabla.</p>
      <p className="texto-suave catalogo-resumen" aria-live="polite">{resumen}</p>

      {/* Mientras hay un error los filtros quedan deshabilitados: no tendrían sobre qué filtrar */}
      <fieldset className="filtros-torneo" disabled={Boolean(error)}>
        <legend className="solo-lectores">Filtros</legend>
        <div className="filtros-fila">
          {segmentado("Deporte", "deporte", DEPORTES, deporte, elegirDeporte)}
          <div id="filtros-extra" className={`filtros-extra ${masFiltros ? "abierto" : ""}`}>
            {segmentado("Formato", "formato", FORMATOS, formato, undefined, "solo-escritorio")}
            {segmentado("Cuándo empieza", "cuando", CUANDO, cuando, undefined, "solo-escritorio")}
            {desplegable("Formato", "formato", FORMATOS, formato)}
            {desplegable("Cuándo empieza", "cuando", CUANDO, cuando)}
          </div>
        </div>
        <div className="filtros-fila">
          {/* Mientras carga se muestra deshabilitado, para que la barra no salte al llegar los datos */}
          {(!datos || categorias.length > 0) && (
            <select
              className="selector"
              aria-label="Categoría"
              value={categoria}
              disabled={!datos}
              onChange={(e) => cambiar({ categoria: e.target.value })}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            className={`filtro-interruptor ${lugares ? "activo" : ""}`}
            aria-pressed={Boolean(lugares)}
            onClick={() => cambiar({ lugares: lugares ? "" : "1" })}
          >
            Solo con lugares
          </button>
          <button
            className="filtro-interruptor filtro-mas"
            aria-expanded={masFiltros}
            aria-controls="filtros-extra"
            onClick={() => setMasFiltros(!masFiltros)}
          >
            {masFiltros ? "Menos filtros" : "Más filtros"}
            {extrasActivos > 0 && !masFiltros && <span className="grupo-cantidad">{extrasActivos}</span>}
          </button>
        </div>
      </fieldset>

      {!masFiltros && activos.length > 0 && (
        <div className="filtros-activos" aria-label="Filtros activos">
          {activos.map(([clave, nombre]) => (
            <button key={clave} className="chip-filtro" onClick={() => cambiar({ [clave]: "" })} aria-label={`Quitar filtro: ${nombre}`}>
              {nombre} <Icono nombre="cerrar" tamano={14} />
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ConError mensaje={error} onReintentar={reintentar} />
      ) : !datos ? (
        <Cargando filas={3} etiqueta="Cargando torneos" />
      ) : todos.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>Todavía no hay torneos publicados. Los complejos los arman desde su panel y aparecen acá.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>No encontramos torneos {descripcionFiltros}.</p>
          <div className="acciones-vacio">
            {sugerencias.map((s, i) => (
              <button key={s.clave} className={`boton ${i > 0 ? "boton-fantasma" : ""}`} onClick={() => cambiar({ [s.clave]: "" })}>
                Ver {plural(s.cantidad, "torneo", "torneos")} {s.texto}
              </button>
            ))}
            {hayFiltros && <button className="boton boton-fantasma" onClick={quitarFiltros}>Quitar filtros</button>}
          </div>
        </div>
      ) : (
        <>
          <GrupoTorneos id="abiertos" titulo="Inscripción abierta" torneos={conLugar} llenos={llenos} />
          <GrupoTorneos id="en-juego" titulo="En juego" torneos={enJuego} />
          <GrupoTorneos id="terminados" titulo="Terminados" torneos={terminados} />
        </>
      )}
    </main>
  );
}

function GrupoTorneos({ id, titulo, torneos, llenos = [] }) {
  if (torneos.length + llenos.length === 0) return null;
  return (
    <section className="grupo-torneos" aria-labelledby={`grupo-${id}`}>
      <h2 id={`grupo-${id}`} className="seccion-titulo">
        {titulo} {torneos.length > 0 && <span className="grupo-cantidad">{torneos.length}</span>}
      </h2>
      {torneos.length > 0 && (
        <ul className="tablero">
          {torneos.map((t) => (
            <FilaTorneo key={t.id_torneo} torneo={t} detallado />
          ))}
        </ul>
      )}
      {llenos.length > 0 && (
        <>
          <h3 className="subgrupo-titulo">Ya se llenaron</h3>
          <ul className="tablero">
            {llenos.map((t) => (
              <FilaTorneo key={t.id_torneo} torneo={t} detallado />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
