import { useRef, useState } from "react";
import useDialogo from "../service/useDialogo";
import { describirGrupos, hoyISO, letrasDeGrupos, maximoDeGrupos, maximoQuePasan } from "../utils/formato";

const TIPOS = [
  { id: "torneo", nombre: "Torneo", detalle: "Eliminación directa: el que pierde queda afuera" },
  { id: "campeonato", nombre: "Campeonato", detalle: "Todos contra todos, con tabla de posiciones" },
  { id: "grupos", nombre: "Grupos + eliminación", detalle: "Fase de grupos y los mejores pasan a la llave" }
];

// Con fase de grupos, que la cantidad de grupos y los que pasan sigan siendo válidos para el cupo.
// Se aplica al mostrar y al guardar (no al escribir: el cupo pasa por "1" antes de llegar a "16")
const ajustarGrupos = (datos) => {
  const cupo = Math.max(2, Math.min(64, Number(datos.cupo) || 2));
  const grupos = Math.max(2, Math.min(datos.cantidad_grupos, maximoDeGrupos(cupo)));
  return { ...datos, cantidad_grupos: grupos, clasifican_por_grupo: Math.min(datos.clasifican_por_grupo, maximoQuePasan(cupo, grupos)) };
};

// Formulario para crear o editar un torneo / campeonato (torneo = null → nuevo)
export default function TorneoModal({ torneo, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState({
    nombre: torneo?.nombre ?? "",
    tipo: torneo?.tipo ?? "torneo",
    deporte: torneo?.deporte ?? "futbol",
    categoria: torneo?.categoria ?? "",
    descripcion: torneo?.descripcion ?? "",
    fecha_inicio: torneo?.fecha_inicio ?? hoyISO(),
    fecha_fin: torneo?.fecha_fin ?? "",
    cupo: torneo?.cupo ?? 8,
    precio_inscripcion: torneo ? Number(torneo.precio_inscripcion) : "",
    premio: torneo?.premio ?? "",
    cantidad_grupos: torneo?.cantidad_grupos ?? 2,
    clasifican_por_grupo: torneo?.clasifican_por_grupo ?? 2,
    ida_vuelta: torneo?.ida_vuelta ?? false
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const ventana = useRef(null);
  useDialogo(ventana, () => !guardando && onCerrar());

  // Con el fixture armado ya no se puede cambiar el formato ni el deporte
  const bloqueado = torneo && torneo.estado !== "inscripcion";

  const cambiar = (campo, valor) => setDatos({ ...datos, [campo]: valor });

  const formato = ajustarGrupos(datos);
  const conGrupos = datos.tipo === "grupos";
  const varios = datos.deporte === "padel" ? "parejas" : "equipos";
  const cupo = Number(datos.cupo) || 0;
  const alcanzaParaGrupos = cupo >= 4;

  const enviar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    if (conGrupos && !alcanzaParaGrupos) {
      setError(`Para jugar con fase de grupos el cupo tiene que ser de al menos 4 ${varios}.`);
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar({
        ...formato,
        cupo: Number(datos.cupo),
        precio_inscripcion: Number(datos.precio_inscripcion) || 0,
        fecha_fin: datos.fecha_fin || null
      });
    } catch (mensaje) {
      setError(mensaje);
      setGuardando(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={() => !guardando && onCerrar()}>
      <form
        ref={ventana}
        className="tarjeta modal modal-ancho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="torneo-modal-titulo"
        tabIndex={-1}
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="torneo-modal-titulo">{torneo ? `Editar ${torneo.tipo === "campeonato" ? "campeonato" : "torneo"}` : "Nuevo torneo o campeonato"}</h2>
        {error && <p className="alerta" role="alert">{error}</p>}

        <div className="formatos">
          {TIPOS.map((tipo) => (
            <button
              type="button"
              key={tipo.id}
              disabled={bloqueado}
              className={`opcion ${datos.tipo === tipo.id ? "elegida" : ""}`}
              onClick={() => cambiar("tipo", tipo.id)}
            >
              <strong>{tipo.nombre}</strong>
              <small>{tipo.detalle}</small>
            </button>
          ))}
        </div>

        <div className="segmentado">
          {[["futbol", "Fútbol"], ["padel", "Pádel"]].map(([id, nombre]) => (
            <button type="button" key={id} disabled={bloqueado} className={datos.deporte === id ? "activo" : ""} onClick={() => cambiar("deporte", id)}>
              {nombre}
            </button>
          ))}
        </div>

        <div className="grilla-campos">
          <label className="campo">
            Nombre *
            <input value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} required maxLength={120} autoFocus placeholder="Copa de Verano" />
          </label>
          <label className="campo">
            Categoría
            <input value={datos.categoria} onChange={(e) => cambiar("categoria", e.target.value)} maxLength={60} placeholder="Libre, +35, 4ta..." />
          </label>
          <label className="campo">
            Empieza *
            <input type="date" value={datos.fecha_inicio} onChange={(e) => cambiar("fecha_inicio", e.target.value)} required />
          </label>
          <label className="campo">
            Termina
            <input type="date" value={datos.fecha_fin} min={datos.fecha_inicio} onChange={(e) => cambiar("fecha_fin", e.target.value)} />
          </label>
          <label className="campo">
            Cupo de {datos.deporte === "padel" ? "parejas" : "equipos"} *
            <input type="number" min="2" max="64" value={datos.cupo} onChange={(e) => cambiar("cupo", e.target.value)} required />
          </label>
          <label className="campo">
            Inscripción ($)
            <input type="number" min="0" step="500" value={datos.precio_inscripcion} onChange={(e) => cambiar("precio_inscripcion", e.target.value)} placeholder="0 = gratis" />
          </label>
        </div>
        {conGrupos && (
          <fieldset className="config-formato" disabled={bloqueado}>
            <legend>Fase de grupos</legend>
            {alcanzaParaGrupos ? (
              <>
                <OpcionesNumericas
                  titulo="Cantidad de grupos"
                  valores={Array.from({ length: maximoDeGrupos(cupo) - 1 }, (_, i) => i + 2)}
                  elegido={formato.cantidad_grupos}
                  etiqueta={(n) => `${n} grupos (${letrasDeGrupos(n).join(", ")})`}
                  onElegir={(n) => cambiar("cantidad_grupos", n)}
                />
                <OpcionesNumericas
                  titulo="Pasan a la llave por grupo"
                  valores={Array.from({ length: maximoQuePasan(cupo, formato.cantidad_grupos) }, (_, i) => i + 1)}
                  elegido={formato.clasifican_por_grupo}
                  etiqueta={(n) => (n === 1 ? "Pasa el primero" : `Pasan los ${n} primeros`)}
                  onElegir={(n) => cambiar("clasifican_por_grupo", n)}
                />
                <IdaVuelta valor={datos.ida_vuelta} onCambiar={(v) => cambiar("ida_vuelta", v)} />
                <p className="vista-formato" aria-live="polite">
                  Con el cupo lleno:{" "}
                  {describirGrupos({
                    equipos: cupo,
                    grupos: formato.cantidad_grupos,
                    pasan: formato.clasifican_por_grupo,
                    idaVuelta: datos.ida_vuelta,
                    varios
                  })}
                </p>
                <p className="texto-suave sin-margen">
                  Los grupos los sorteás vos o los armás a mano antes de cerrar la inscripción.
                </p>
              </>
            ) : (
              <p className="campo-aviso sin-margen">Para jugar con fase de grupos el cupo tiene que ser de al menos 4 {varios}.</p>
            )}
          </fieldset>
        )}
        {datos.tipo === "campeonato" && (
          <fieldset className="config-formato" disabled={bloqueado}>
            <legend>Partidos</legend>
            <IdaVuelta valor={datos.ida_vuelta} onCambiar={(v) => cambiar("ida_vuelta", v)} />
          </fieldset>
        )}

        <label className="campo">
          Premio
          <input value={datos.premio} onChange={(e) => cambiar("premio", e.target.value)} maxLength={150} />
        </label>
        <label className="campo">
          Descripción
          <textarea rows={3} value={datos.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} maxLength={500} placeholder="Días de juego, reglamento, etc." />
        </label>

        <div className="modal-acciones">
          <button type="button" className="boton boton-fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="boton" aria-disabled={guardando} aria-busy={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

// Botones para elegir un número (grupos, cuántos pasan): solo aparecen los que sirven para el cupo
function OpcionesNumericas({ titulo, valores, elegido, etiqueta, onElegir }) {
  return (
    <div className="campo">
      <span className="campo-titulo-chico">{titulo}</span>
      <div className="segmentado segmentado-numeros" role="group" aria-label={titulo}>
        {valores.map((n) => (
          <button type="button" key={n} className={elegido === n ? "activo" : ""} aria-pressed={elegido === n} aria-label={etiqueta(n)} onClick={() => onElegir(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function IdaVuelta({ valor, onCambiar }) {
  return (
    <div className="campo">
      <span className="campo-titulo-chico">Cada cruce se juega</span>
      <div className="segmentado" role="group" aria-label="Cada cruce se juega">
        <button type="button" className={!valor ? "activo" : ""} aria-pressed={!valor} onClick={() => onCambiar(false)}>Una vez</button>
        <button type="button" className={valor ? "activo" : ""} aria-pressed={valor} onClick={() => onCambiar(true)}>Ida y vuelta</button>
      </div>
    </div>
  );
}
