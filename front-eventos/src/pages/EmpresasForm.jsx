import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { actualizarEmpresa, crearEmpresa, obtenerEmpresa } from "../service/empresasService";

const vacia = { nombre: "", cuit: "", email: "", telefono: "", direccion: "" };

export default function EmpresasForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(vacia);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    obtenerEmpresa(id)
      .then((respuesta) => {
        const datos = respuesta.data;
        setEmpresa({
          nombre: datos.nombre,
          cuit: datos.cuit,
          email: datos.email ?? "",
          telefono: datos.telefono ?? "",
          direccion: datos.direccion ?? ""
        });
      })
      .catch(() => setError("Empresa no encontrada"));
  }, [id]);

  const cambiar = (e) => setEmpresa({ ...empresa, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    if (!empresa.nombre.trim() || !empresa.cuit.trim()) {
      setError("El nombre y el cuit son obligatorios");
      return;
    }
    try {
      if (id) await actualizarEmpresa(id, empresa);
      else await crearEmpresa(empresa);
      navigate("/empresas");
    } catch (err) {
      setError(err.response?.data?.mensaje ?? "No se pudo guardar la empresa");
    }
  };

  return (
    <main className="contenedor pagina-auth">
      <form onSubmit={guardar} className="tarjeta formulario-auth">
      <span className="etiqueta">Administración</span>
      <h1>{id ? "Editar empresa" : "Nueva empresa"}</h1>
      {error && <p className="alerta">{error}</p>}
        <label className="campo">
          Nombre *
          <input name="nombre" value={empresa.nombre} onChange={cambiar} maxLength={150} />
        </label>
        <label className="campo">
          CUIT *
          <input name="cuit" value={empresa.cuit} onChange={cambiar} maxLength={13} placeholder="30-12345678-9" />
        </label>
        <label className="campo">
          Email
          <input name="email" type="email" value={empresa.email} onChange={cambiar} maxLength={150} />
        </label>
        <label className="campo">
          Teléfono
          <input name="telefono" value={empresa.telefono} onChange={cambiar} maxLength={30} />
        </label>
        <label className="campo">
          Dirección
          <input name="direccion" value={empresa.direccion} onChange={cambiar} maxLength={200} />
        </label>
        <div className="modal-acciones">
          <Link className="boton boton-fantasma" to="/empresas">Cancelar</Link>
          <button className="boton" type="submit">Guardar</button>
        </div>
      </form>
    </main>
  );
}
