import jwt from "jsonwebtoken";
import pool from "../data/db.js";

// Hay tres tipos de usuario y cada uno tiene su propia tabla:
//   admin   → administradores (gestiona las empresas)
//   empresa → empresas        (cada complejo: canchas, turnos, torneos)
//   cliente → clientes        (jugadores: reservan turnos e inscriben equipos)
export const crearToken = (rol, id, nombre) =>
  jwt.sign({ rol, id, nombre }, process.env.JWT_SECRET, { expiresIn: "8h" });

// Exige "Authorization: Bearer <token>" con alguno de los roles indicados y
// deja en req.usuario quién es. Para las empresas también deja req.empresa,
// así cada complejo solo accede a sus datos.
export const requiere = (...roles) => async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization ?? "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Tenés que iniciar sesión" });
  }

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ mensaje: "La sesión expiró, volvé a iniciar sesión" });
  }
  if (!roles.includes(datos.rol)) {
    return res.status(403).json({ mensaje: "No tenés permiso para hacer esto" });
  }

  req.usuario = { rol: datos.rol, id: datos.id, nombre: datos.nombre };

  if (datos.rol === "empresa") {
    // Si el admin dio de baja la empresa, su token deja de servir al instante
    try {
      const { rows } = await pool.query("SELECT activo FROM empresas WHERE id_empresa = $1", [datos.id]);
      if (rows.length === 0) return res.status(401).json({ mensaje: "La empresa ya no existe" });
      if (!rows[0].activo) return res.status(403).json({ mensaje: "La empresa está dada de baja" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ mensaje: "Error al validar la sesión" });
    }
    req.empresa = { id_empresa: datos.id, nombre: datos.nombre };
  }

  next();
};

export const requiereEmpresa = requiere("empresa");
export const requiereCliente = requiere("cliente");
export const requiereAdmin = requiere("admin");
