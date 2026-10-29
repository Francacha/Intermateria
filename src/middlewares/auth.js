import jwt from "jsonwebtoken";
import pool from "../data/db.js";

// Hay tres tipos de usuario y cada uno tiene su propia tabla:
//   admin   → administradores (gestiona las empresas)
//   empresa → empresas        (cada complejo: canchas, turnos, torneos)
//   cliente → clientes        (jugadores: reservan turnos e inscriben equipos)
// En el complejo trabajan el dueño (la cuenta de la empresa) y sus encargados
// (tabla encargados): los dos tienen rol "empresa" y se distinguen por "puesto".
//   extra: { puesto: "dueno" | "encargado", id_encargado, persona }
export const crearToken = (rol, id, nombre, extra = {}) =>
  jwt.sign({ rol, id, nombre, ...extra }, process.env.JWT_SECRET, { expiresIn: "8h" });

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
    // Los tokens anteriores a los encargados no traen puesto: eran del dueño
    const puesto = datos.puesto === "encargado" ? "encargado" : "dueno";
    // Si el admin dio de baja la empresa (o el dueño al encargado), el token deja de servir al instante
    try {
      const { rows } = await pool.query(
        `SELECT e.activo, enc.activo AS encargado_activo, enc.nombre AS encargado
           FROM empresas e
           LEFT JOIN encargados enc ON enc.id_encargado = $2 AND enc.id_empresa = e.id_empresa
          WHERE e.id_empresa = $1`,
        [datos.id, puesto === "encargado" ? datos.id_encargado : null]
      );
      if (rows.length === 0) return res.status(401).json({ mensaje: "La empresa ya no existe" });
      if (!rows[0].activo) return res.status(403).json({ mensaje: "La empresa está dada de baja" });
      if (puesto === "encargado" && !rows[0].encargado_activo) {
        return res.status(401).json({ mensaje: "Tu usuario de encargado fue dado de baja" });
      }
      req.empresa = {
        id_empresa: datos.id,
        nombre: datos.nombre,
        puesto,
        id_encargado: puesto === "encargado" ? datos.id_encargado : null,
        // Quién hizo cada cosa (pagos, cancelaciones, cierres)
        quien: puesto === "encargado" ? rows[0].encargado : "Dueño"
      };
    } catch (error) {
      console.error(error);
      return res.status(500).json({ mensaje: "Error al validar la sesión" });
    }
    req.usuario.puesto = req.empresa.puesto;
    req.usuario.id_encargado = req.empresa.id_encargado;
  }

  next();
};

export const requiereEmpresa = requiere("empresa");
export const requiereCliente = requiere("cliente");
export const requiereAdmin = requiere("admin");

// Va después de requiereEmpresa: precios, horarios, reglas, torneos, reportes y
// equipo los decide el dueño (entrevista, preguntas 5, 7 y 34)
export const soloDueno = (req, res, next) => {
  if (req.empresa?.puesto !== "dueno") {
    return res.status(403).json({ mensaje: "Esto lo puede hacer solo el dueño del complejo" });
  }
  next();
};
