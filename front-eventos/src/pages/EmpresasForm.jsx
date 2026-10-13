import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { actualizarEmpresa, crearEmpresa, obtenerEmpresa } from "../service/empresasService";
import { mensajeDeError } from "../service/api";

const vacia = { nombre: "", cuit: "", email: "", telefono: "", direccion: "", password: "", activo: true };

// Alta y edición de empresas (administrador)
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
          direccion: datos.direccion ?? "",
          password: "",
          activo: datos.activo
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
    if (empresa.password && empresa.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    // Sin contraseña nueva, se conserva la actual
    const { password, ...resto } = empresa;
    const datos = password ? empresa : resto;
    try {
      if (id) await actualizarEmpresa(id, datos);
      else await crearEmpresa(datos);
      navigate("/admin");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar la empresa"));
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
          Email <small>(es el usuario para ingresar)</small>
          <input name="email" type="email" value={empresa.email} onChange={cambiar} maxLength={150} />
        </label>
        <label className="campo">
          {id ? "Nueva contraseña" : "Contraseña"} <small>({id ? "vacío = no cambia" : "mínimo 8 caracteres"})</small>
          <input name="password" type="password" value={empresa.password} onChange={cambiar} minLength={8} autoComplete="new-password" />
        </label>
        <label className="campo">
          Teléfono
          <input name="telefono" value={empresa.telefono} onChange={cambiar} maxLength={30} />
        </label>
        <label className="campo">
          Dirección
          <input name="direccion" value={empresa.direccion} onChange={cambiar} maxLength={200} />
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={empresa.activo} onChange={(e) => setEmpresa({ ...empresa, activo: e.target.checked })} />
          Empresa activa (puede ingresar y aparece en el sitio)
        </label>
        <div className="modal-acciones">
          <Link className="boton boton-fantasma" to="/admin">Cancelar</Link>
          <button className="boton" type="submit">Guardar</button>
        </div>
      </form>
    </main>
  );
}
