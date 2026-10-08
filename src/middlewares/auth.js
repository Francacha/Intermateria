import jwt from "jsonwebtoken";

// Protege las rutas del panel: exige "Authorization: Bearer <token>" y deja en
// req.empresa la empresa logueada. Así cada complejo solo accede a sus datos.
export const requiereLogin = (req, res, next) => {
  const [tipo, token] = (req.headers.authorization ?? "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Tenés que iniciar sesión" });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.empresa = { id_empresa: datos.id_empresa, nombre: datos.nombre };
    next();
  } catch {
    res.status(401).json({ mensaje: "La sesión expiró, volvé a iniciar sesión" });
  }
};
