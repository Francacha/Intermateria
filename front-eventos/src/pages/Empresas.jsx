import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  actualizarEmpresa,
  eliminarEmpresa,
  obtenerEmpresas,
  obtenerResumen
} from "../service/empresasService";
import { mensajeDeError } from "../service/api";

// Panel del administrador: alta, baja y edición de las empresas (complejos)
export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    Promise.all([obtenerEmpresas(), obtenerResumen()])
      .then(([e, r]) => {
        setEmpresas(e.data);
        setResumen(r.data);
        setError("");
      })
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar las empresas")))
      .finally(() => setCargando(false));
  }, [recargas]);

  const recargar = () => {
    setCargando(true);
    setRecargas(recargas + 1);
  };

  // Dar de baja no borra nada: la empresa no puede ingresar y deja de verse en el sitio
  const alternarActivo = async (empresa) => {
    const accion = empresa.activo ? "dar de baja" : "reactivar";
    if (!confirm(`¿${accion[0].toUpperCase() + accion.slice(1)} "${empresa.nombre}"?`)) return;
    try {
      const { data } = await actualizarEmpresa(empresa.id_empresa, { activo: !empresa.activo });
      setEmpresas(empresas.map((e) => (e.id_empresa === data.id_empresa ? { ...e, ...data } : e)));
      setResumen((r) => r && { ...r, empresas_activas: r.empresas_activas + (data.activo ? 1 : -1) });
    } catch (err) {
      setError(mensajeDeError(err, `No se pudo ${accion} la empresa`));
    }
  };

  const eliminar = async (empresa) => {
    if (!confirm(`¿Eliminar "${empresa.nombre}"? Se borran también sus canchas, turnos y torneos.`)) return;
    try {
      await eliminarEmpresa(empresa.id_empresa);
      recargar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo eliminar la empresa"));
    }
  };

  const texto = busqueda.trim().toLowerCase();
  const visibles = empresas.filter(
    (e) => !texto || [e.nombre, e.cuit, e.email].some((v) => v?.toLowerCase().includes(texto))
  );

  return (
    <main className="contenedor panel">
      <div className="barra">
        <div>
          <span className="etiqueta">Administración</span>
          <h1>Empresas</h1>
        </div>
        <span className="acciones">
          <button className="boton boton-fantasma" onClick={recargar}>Recargar</button>
          <Link className="boton" to="/admin/empresas/nueva">+ Nueva empresa</Link>
        </span>
      </div>

      {resumen && (
        <div className="estadisticas estadisticas-seis">
          <div className="tarjeta estadistica"><span>Empresas</span><strong>{resumen.empresas}</strong></div>
          <div className="tarjeta estadistica"><span>Activas</span><strong>{resumen.empresas_activas}</strong></div>
          <div className="tarjeta estadistica"><span>Canchas</span><strong>{resumen.canchas}</strong></div>
          <div className="tarjeta estadistica"><span>Jugadores</span><strong>{resumen.clientes}</strong></div>
          <div className="tarjeta estadistica"><span>Turnos</span><strong>{resumen.turnos}</strong></div>
          <div className="tarjeta estadistica"><span>Torneos</span><strong>{resumen.torneos}</strong></div>
        </div>
      )}

      <div className="barra">
        <input
          className="buscador"
          type="search"
          placeholder="Buscar por nombre, CUIT o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <p className="alerta">{error}</p>}
      {cargando ? (
        <p className="texto-suave">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="tarjeta vacio">No hay empresas{texto && " que coincidan"}.</p>
      ) : (
        <div className="tarjeta tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Empresa</th>
                <th>CUIT</th>
                <th>Contacto</th>
                <th>Canchas</th>
                <th>Turnos</th>
                <th>Torneos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((empresa) => (
                <tr key={empresa.id_empresa} className={empresa.activo ? "" : "fila-cancelada"}>
                  <td>{empresa.id_empresa}</td>
                  <td>
                    <strong>{empresa.nombre}</strong>
                    {empresa.direccion && <><br /><small className="texto-suave">{empresa.direccion}</small></>}
                  </td>
                  <td>{empresa.cuit}</td>
                  <td>
                    {empresa.email ?? "-"}
                    {empresa.telefono && <><br /><small className="texto-suave">{empresa.telefono}</small></>}
                  </td>
                  <td>{empresa.canchas}</td>
                  <td>{empresa.turnos}</td>
                  <td>{empresa.torneos}</td>
                  <td>
                    <button
                      className={`interruptor ${empresa.activo ? "encendido" : ""}`}
                      onClick={() => alternarActivo(empresa)}
                      title={empresa.activo ? "Dar de baja" : "Reactivar"}
                    >
                      {empresa.activo ? "Activa" : "De baja"}
                    </button>
                  </td>
                  <td className="acciones">
                    <Link className="boton-icono" to={`/admin/empresas/${empresa.id_empresa}/editar`} title="Editar">✎</Link>
                    <button className="boton-icono peligro" onClick={() => eliminar(empresa)} title="Eliminar">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
