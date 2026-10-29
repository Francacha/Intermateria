import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Confirmar from "../components/Confirmar";
import { Cargando, ConError } from "../components/Estados";
import FormPassword from "../components/FormPassword";
import Icono from "../components/Icono";
import { mensajeDeError } from "../service/api";
import {
  actualizarEmpresa,
  cambiarPasswordEmpresa,
  obtenerEmpresas,
  obtenerResumen
} from "../service/empresasService";
import useCarga from "../service/useCarga";

// La lista y los números generales llegan juntos
const consultar = () =>
  Promise.all([obtenerEmpresas(), obtenerResumen()]).then(([e, r]) => ({ data: { complejos: e.data, resumen: r.data } }));

const ESTADOS = [
  { id: "todos", nombre: "Todos" },
  { id: "activos", nombre: "Activos" },
  { id: "baja", nombre: "De baja" }
];

// "1 cancha" / "6 canchas"
const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Panel del administrador: los complejos del sitio, su estado y su acceso
export default function Empresas() {
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const busqueda = params.get("q") ?? "";
  const estado = ESTADOS.some((e) => e.id === params.get("estado")) ? params.get("estado") : "todos";
  const pendientes = params.get("pendientes") === "1"; // solo los activos sin canchas

  const { datos, error, reintentar } = useCarga(consultar, "No pudimos traer los complejos.");
  const [cambios, setCambios] = useState({}); // id → datos actualizados (dar de baja / reactivar)
  const [listo, setListo] = useState(state?.listo ?? ""); // mensaje después de una acción
  const [editandoPassword, setEditandoPassword] = useState(null);
  const [darDeBaja, setDarDeBaja] = useState(null); // complejo con el diálogo abierto
  const [reactivando, setReactivando] = useState(null);
  const [errorFila, setErrorFila] = useState(null); // { id, mensaje }
  const [focoEn, setFocoEn] = useState(null); // id del botón que recupera el foco
  const mensajeListo = useRef(null);

  useEffect(() => {
    document.title = "Complejos · Reservas de Canchas";
    return () => {
      document.title = "Reservas de Canchas";
    };
  }, []);

  // El "Listo" que llega desde el formulario se muestra una vez: si se recarga la página, ya no está
  useEffect(() => {
    if (state?.listo) navigate(pathname + search, { replace: true, state: null });
  }, [state, pathname, search, navigate]);

  // Después de una acción, el foco pasa al mensaje de confirmación
  useEffect(() => {
    if (listo) mensajeListo.current?.focus();
  }, [listo]);

  useEffect(() => {
    if (focoEn) document.getElementById(focoEn)?.focus();
  }, [focoEn]);

  const cambiarFiltros = (cambiosFiltro, reemplazar = false) => {
    const nuevos = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambiosFiltro)) {
      if (!valor || (clave === "estado" && valor === "todos")) nuevos.delete(clave);
      else nuevos.set(clave, valor);
    }
    setParams(nuevos, { replace: reemplazar });
  };

  const aplicar = (data) => setCambios((c) => ({ ...c, [data.id_empresa]: data }));

  const empezar = () => {
    setListo("");
    setErrorFila(null);
    setFocoEn(null);
  };

  const reactivar = async (complejo) => {
    if (reactivando) return;
    empezar();
    setReactivando(complejo.id_empresa);
    try {
      const { data } = await actualizarEmpresa(complejo.id_empresa, { activo: true });
      aplicar(data);
      setListo(`Listo: «${complejo.nombre}» está activo de nuevo y aparece en el sitio.`);
    } catch (err) {
      setErrorFila({ id: complejo.id_empresa, mensaje: mensajeDeError(err, "No se pudo reactivar el complejo.") });
    } finally {
      setReactivando(null);
    }
  };

  const cerrarPassword = (id) => {
    setEditandoPassword(null);
    setFocoEn(`password-boton-${id}`);
  };

  const complejos = datos?.complejos.map((c) => ({ ...c, ...cambios[c.id_empresa] })) ?? [];
  const resumen = datos?.resumen;
  const activos = complejos.filter((c) => c.activo).length;
  const sinCanchas = complejos.filter((c) => c.activo && c.canchas === 0).length;
  const porEstado = { todos: complejos.length, activos, baja: complejos.length - activos };

  const texto = busqueda.trim().toLowerCase();
  const visibles = complejos.filter(
    (c) =>
      (estado === "todos" || (estado === "activos" ? c.activo : !c.activo)) &&
      (!pendientes || (c.activo && c.canchas === 0)) &&
      (!texto || [c.nombre, c.cuit, c.email, c.direccion].some((v) => v?.toLowerCase().includes(texto)))
  );
  const hayLista = datos && complejos.length > 0;

  // Sin resultados: primero se afloja el filtro de estado o el de pendientes, la búsqueda queda
  const aflojar = estado !== "todos" || pendientes ? { estado: "", pendientes: "" } : { q: "" };

  return (
    <main className="contenedor panel">
      <div className="barra">
        <div>
          <h1>Complejos</h1>
          {resumen && hayLista && (
            <p className="texto-suave sin-margen">
              {activos} de {cuenta(complejos.length, "complejo activo", "complejos activos")} · {cuenta(resumen.canchas, "cancha", "canchas")} ·{" "}
              {cuenta(resumen.clientes, "jugador", "jugadores")} · {cuenta(resumen.turnos, "turno", "turnos")} ·{" "}
              {cuenta(resumen.torneos, "torneo", "torneos")}
              {sinCanchas > 0 && !pendientes && (
                <>
                  {" · "}
                  <button className="boton-enlace campo-aviso" onClick={() => cambiarFiltros({ pendientes: "1" })}>
                    {cuenta(sinCanchas, "activo sin canchas", "activos sin canchas")}
                  </button>
                </>
              )}
            </p>
          )}
        </div>
        <Link className="boton" to="/admin/empresas/nueva" state={{ desde: search }}>
          <Icono nombre="mas" tamano={18} /> Nuevo complejo
        </Link>
      </div>

      {hayLista && (
        <div className="barra barra-admin">
          <input
            className="buscador"
            type="search"
            aria-label="Buscar complejo por nombre, CUIT, email o dirección"
            placeholder="Buscar por nombre, CUIT, email o dirección"
            value={busqueda}
            onChange={(e) => cambiarFiltros({ q: e.target.value }, true)}
          />
          <div className="segmentado" role="group" aria-label="Estado">
            {ESTADOS.map((e) => (
              <button
                key={e.id}
                type="button"
                className={estado === e.id ? "activo" : ""}
                aria-pressed={estado === e.id}
                onClick={() => cambiarFiltros({ estado: e.id })}
              >
                {e.nombre}
                <span className="segmentado-cuenta"> {porEstado[e.id]}</span>
              </button>
            ))}
          </div>
          {pendientes && (
            <button className="chip-filtro" onClick={() => cambiarFiltros({ pendientes: "" })} aria-label="Quitar filtro: activos sin canchas">
              Activos sin canchas <Icono nombre="cerrar" tamano={14} />
            </button>
          )}
        </div>
      )}

      {listo && <p className="aviso-ok" role="status" tabIndex={-1} ref={mensajeListo}>{listo}</p>}

      {error ? (
        <ConError mensaje={error} onReintentar={reintentar} />
      ) : !datos ? (
        <Cargando filas={4} etiqueta="Cargando complejos" />
      ) : complejos.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>
            Todavía no hay complejos. Se pueden registrar solos desde “Registrá tu complejo”, o lo podés cargar vos con
            “Nuevo complejo”.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="tablero tablero-estado">
          <p>
            {[
              "No hay complejos",
              pendientes ? "activos sin canchas" : estado === "activos" ? "activos" : estado === "baja" ? "de baja" : "",
              texto ? `que coincidan con «${busqueda.trim()}»` : ""
            ]
              .filter(Boolean)
              .join(" ")}
            .
          </p>
          <button className="boton boton-fantasma" onClick={() => cambiarFiltros(aflojar, true)}>
            {aflojar.q === "" ? "Borrar la búsqueda" : texto ? "Buscar en todos" : "Ver todos"}
          </button>
        </div>
      ) : (
        <ul className="tablero">
          {visibles.map((c) => (
            <li key={c.id_empresa} className={`renglon renglon-admin ${c.activo ? "" : "renglon-de-baja"}`}>
              <div className="renglon-info">
                <span className="renglon-titulo">
                  {c.activo ? (
                    <Link to={`/complejos/${c.id_empresa}`}><strong>{c.nombre}</strong></Link>
                  ) : (
                    <strong>{c.nombre}</strong>
                  )}
                  <span className={`pastilla-estado ${c.activo ? "activo" : "de-baja"}`}>{c.activo ? "Activo" : "De baja"}</span>
                </span>
                <span className="texto-suave">
                  {c.direccion && `${c.direccion} · `}
                  <span className="sin-corte">CUIT {c.cuit}</span>
                </span>
                <span className="texto-suave">
                  {c.email || (
                    <span className="campo-aviso">
                      Sin email: no puede ingresar.{" "}
                      <Link to={`/admin/empresas/${c.id_empresa}/editar`} state={{ desde: search }}>Cargale uno</Link>
                    </span>
                  )}
                  {c.telefono && ` · ${c.telefono}`}
                </span>
                <span className="renglon-numeros">
                  {cuenta(c.canchas, "cancha", "canchas")} · {cuenta(c.turnos, "turno", "turnos")} ·{" "}
                  {cuenta(c.torneos, "torneo", "torneos")}
                </span>
              </div>

              <div className="renglon-acciones">
                <Link className="boton boton-fantasma" to={`/admin/empresas/${c.id_empresa}/editar`} state={{ desde: search }}>
                  Editar<span className="solo-lectores"> {c.nombre}</span>
                </Link>
                {c.email && (
                  <button
                    id={`password-boton-${c.id_empresa}`}
                    className="accion-texto"
                    aria-expanded={editandoPassword === c.id_empresa}
                    onClick={() => {
                      empezar();
                      setEditandoPassword(editandoPassword === c.id_empresa ? null : c.id_empresa);
                    }}
                  >
                    Nueva contraseña<span className="solo-lectores"> para {c.nombre}</span>
                  </button>
                )}
                {c.activo ? (
                  <button
                    className="accion-texto peligro"
                    onClick={() => {
                      empezar();
                      setDarDeBaja(c);
                    }}
                  >
                    Dar de baja<span className="solo-lectores"> {c.nombre}</span>
                  </button>
                ) : (
                  <button
                    className="accion-texto"
                    onClick={() => reactivar(c)}
                    aria-disabled={reactivando === c.id_empresa}
                    aria-busy={reactivando === c.id_empresa}
                  >
                    {reactivando === c.id_empresa ? "Reactivando…" : "Reactivar"}
                    <span className="solo-lectores"> {c.nombre}</span>
                  </button>
                )}
              </div>

              {editandoPassword === c.id_empresa && (
                <div className="renglon-ancho">
                  <FormPassword
                    id={`password-complejo-${c.id_empresa}`}
                    nombre={c.nombre}
                    onGuardar={(password) => cambiarPasswordEmpresa(c.id_empresa, password)}
                    onCancelar={() => cerrarPassword(c.id_empresa)}
                    onListo={() => {
                      setEditandoPassword(null);
                      setListo(
                        `Listo: «${c.nombre}» ya ${c.activo ? "puede ingresar" : "va a poder ingresar cuando lo reactives"} con ${c.email} y la contraseña nueva.`
                      );
                    }}
                  >
                    <p className="texto-suave sin-margen nota-chica">
                      Pasásela en persona o por teléfono y pedile que después la cambie desde su panel.
                      {!c.activo && " Está de baja: va a poder ingresar recién cuando lo reactives."}
                    </p>
                  </FormPassword>
                </div>
              )}

              {errorFila?.id === c.id_empresa && (
                <p className="alerta renglon-ancho" role="alert">{errorFila.mensaje}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {darDeBaja && (
        <Confirmar
          titulo="¿Dar de baja este complejo?"
          textoBoton="Dar de baja"
          peligro
          onCerrar={() => setDarDeBaja(null)}
          onConfirmar={async () => {
            const { data } = await actualizarEmpresa(darDeBaja.id_empresa, { activo: false });
            aplicar(data);
            setDarDeBaja(null);
            setListo(`Listo: «${darDeBaja.nombre}» quedó de baja.`);
          }}
        >
          <p>
            <strong>{darDeBaja.nombre}</strong> no va a poder ingresar a su panel y deja de aparecer en el sitio. No se
            borra nada: sus canchas, turnos y torneos quedan guardados y lo podés reactivar cuando quieras.
          </p>
        </Confirmar>
      )}
    </main>
  );
}
