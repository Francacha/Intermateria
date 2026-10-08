import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { eliminarEmpresa, obtenerEmpresas } from "../service/empresasService";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    obtenerEmpresas()
      .then((respuesta) => {
        setEmpresas(respuesta.data);
        setError("");
      })
      .catch(() => setError("No se pudieron cargar las empresas"))
      .finally(() => setCargando(false));
  }, [recargas]);

  const recargar = () => {
    setCargando(true);
    setRecargas(recargas + 1);
  };

  const eliminar = async (empresa) => {
    if (!confirm(`¿Eliminar "${empresa.nombre}"?`)) return;
    try {
      await eliminarEmpresa(empresa.id_empresa);
      setEmpresas(empresas.filter((e) => e.id_empresa !== empresa.id_empresa));
    } catch {
      setError("No se pudo eliminar la empresa");
    }
  };

  return (
    <main className="contenedor panel">
      <div className="barra">
        <div>
          <span className="etiqueta">Administración</span>
          <h1>Empresas</h1>
        </div>
        <span className="acciones">
          <button className="boton boton-fantasma" onClick={recargar}>Recargar</button>
          <Link className="boton" to="/empresas/nueva">+ Nueva empresa</Link>
        </span>
      </div>
      {error && <p className="alerta">{error}</p>}
      {cargando ? (
        <p className="texto-suave">Cargando...</p>
      ) : empresas.length === 0 ? (
        <p className="tarjeta vacio">No hay empresas cargadas.</p>
      ) : (
        <div className="tarjeta tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>CUIT</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id_empresa}>
                <td>{empresa.id_empresa}</td>
                <td>{empresa.nombre}</td>
                <td>{empresa.cuit}</td>
                <td>{empresa.email ?? "-"}</td>
                <td>{empresa.telefono ?? "-"}</td>
                <td>{empresa.direccion ?? "-"}</td>
                <td className="acciones">
                  <Link className="boton-icono" to={`/empresas/${empresa.id_empresa}/editar`} title="Editar">✎</Link>
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
