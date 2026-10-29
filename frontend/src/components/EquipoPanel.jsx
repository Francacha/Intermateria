import { useEffect, useState } from "react";
import { actualizarEncargado, crearEncargado, obtenerEncargados } from "../service/complejoService";
import { mensajeDeError } from "../service/api";

// Encargados del complejo (solo el dueño). Cada uno entra con su email y su
// contraseña: toma reservas, cobra y carga resultados, pero no cambia precios,
// horarios, reglas ni torneos. Lo que registra queda con su nombre.
export default function EquipoPanel() {
  const [encargados, setEncargados] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", email: "", turno: "", password: "" });
  const [enviando, setEnviando] = useState(false);
  const [clave, setClave] = useState(null); // { id, password } para cambiar la contraseña de uno

  useEffect(() => {
    obtenerEncargados()
      .then(({ data }) => setEncargados(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar el equipo")));
  }, []);

  const reemplazar = (encargado) =>
    setEncargados((lista) => lista.map((e) => (e.id_encargado === encargado.id_encargado ? encargado : e)));

  const agregar = async (e) => {
    e.preventDefault();
    setError("");
    setAviso("");
    setEnviando(true);
    try {
      const { data } = await crearEncargado(nuevo);
      setEncargados([...encargados, data]);
      setNuevo({ nombre: "", email: "", turno: "", password: "" });
      setAviso(`${data.nombre} ya puede ingresar con ${data.email}.`);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo agregar el encargado"));
    } finally {
      setEnviando(false);
    }
  };

  const cambiar = async (encargado, datos, mensaje) => {
    setError("");
    try {
      const { data } = await actualizarEncargado(encargado.id_encargado, datos);
      reemplazar(data);
      setAviso(mensaje);
      return true;
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar"));
      return false;
    }
  };

  return (
    <section>
      <p className="texto-suave">
        Los encargados atienden el mostrador: toman reservas, cobran señas y saldos, cancelan, cierran canchas e
        inscriben equipos. Los precios, los horarios, las reglas y los torneos los decidís vos.
      </p>
      {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
      {error && <p className="alerta" role="alert">{error}</p>}

      {!encargados ? (
        <p className="texto-suave">Cargando equipo...</p>
      ) : encargados.length === 0 ? (
        <p className="tarjeta vacio">Todavía no agregaste encargados.</p>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Encargado</th>
                <th>Email (usuario)</th>
                <th>Turno</th>
                <th>Estado</th>
                <th><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {encargados.map((e) => (
                <tr key={e.id_encargado} className={e.activo ? "" : "fila-cancelada"}>
                  <td><strong>{e.nombre}</strong></td>
                  <td>{e.email}</td>
                  <td>{e.turno ?? "-"}</td>
                  <td>{e.activo ? "Activo" : "Dado de baja"}</td>
                  <td>
                    <div className="acciones">
                      {clave?.id === e.id_encargado ? (
                        <form
                          className="acciones"
                          onSubmit={async (ev) => {
                            ev.preventDefault();
                            if (await cambiar(e, { password: clave.password }, `Contraseña de ${e.nombre} actualizada.`)) setClave(null);
                          }}
                        >
                          <input
                            type="password"
                            className="campo-chico"
                            placeholder="Nueva contraseña"
                            aria-label={`Nueva contraseña de ${e.nombre}`}
                            minLength={8}
                            value={clave.password}
                            onChange={(ev) => setClave({ ...clave, password: ev.target.value })}
                            autoFocus
                          />
                          <button className="boton boton-chico">Guardar</button>
                          <button type="button" className="accion-texto" onClick={() => setClave(null)}>Cancelar</button>
                        </form>
                      ) : (
                        <>
                          <button className="accion-texto" onClick={() => setClave({ id: e.id_encargado, password: "" })}>
                            Cambiar contraseña
                          </button>
                          <button
                            className={`accion-texto ${e.activo ? "peligro" : ""}`}
                            onClick={() =>
                              cambiar(e, { activo: !e.activo }, e.activo ? `${e.nombre} ya no puede ingresar.` : `${e.nombre} puede volver a ingresar.`)
                            }
                          >
                            {e.activo ? "Dar de baja" : "Reactivar"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="tarjeta formulario-inline" onSubmit={agregar} noValidate>
        <h3>Agregar encargado</h3>
        <div className="grilla-campos grilla-tres">
          <label className="campo">
            Nombre *
            <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={100} />
          </label>
          <label className="campo">
            Email *
            <input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} maxLength={150} />
          </label>
          <label className="campo">
            Turno
            <input value={nuevo.turno} onChange={(e) => setNuevo({ ...nuevo, turno: e.target.value })} maxLength={40} placeholder="Ej: Mañana" />
          </label>
          <label className="campo">
            Contraseña * <small>(mínimo 8 caracteres)</small>
            <input type="password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} minLength={8} />
          </label>
        </div>
        <div className="modal-acciones">
          <button className="boton" disabled={enviando}>{enviando ? "Agregando..." : "Agregar encargado"}</button>
        </div>
      </form>
    </section>
  );
}
