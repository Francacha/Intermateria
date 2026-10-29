import bcrypt from "bcryptjs";
import pool from "../data/db.js";
import { COLUMNAS_EMPRESA } from "./auth.controller.js";
import { normalizarCuit } from "../utils/comun.js";

// Administración de empresas: solo para el rol admin (ver empresas.routes.js)

// Un id que no es un número entero no puede existir en la tabla
const idValido = (id) => /^\d+$/.test(id);

// El email de una empresa no puede ser el de un admin, un encargado o un cliente (es el usuario del login)
const emailDeOtroUsuario = async (email) => {
  if (!email) return false;
  const { rows } = await pool.query(
    `SELECT 1 FROM administradores WHERE email = LOWER($1)
     UNION ALL SELECT 1 FROM encargados WHERE email = LOWER($1)
     UNION ALL SELECT 1 FROM clientes WHERE email = LOWER($1)`,
    [email]
  );
  return rows.length > 0;
};

// Un CUIT o email repetido: el mensaje dice cuál de los dos
const mensajeDuplicado = (error) =>
  String(error.constraint ?? error.detail ?? "").includes("cuit")
    ? "Ya hay un complejo con ese CUIT"
    : "Ese email ya lo usa otro complejo";

export const obtenerEmpresas = async (req, res) => {
  try {
    // Además de los datos, un resumen de la actividad de cada complejo
    const resultado = await pool.query(
      `SELECT ${COLUMNAS_EMPRESA.split(", ").map((c) => `e.${c}`).join(", ")},
         (SELECT COUNT(*) FROM canchas c WHERE c.id_empresa = e.id_empresa)::int AS canchas,
         (SELECT COUNT(*) FROM reservas r WHERE r.id_empresa = e.id_empresa
            AND r.estado <> 'cancelada' AND r.id_partido IS NULL)::int AS turnos,
         (SELECT COUNT(*) FROM torneos t WHERE t.id_empresa = e.id_empresa)::int AS torneos
       FROM empresas e ORDER BY e.id_empresa`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener los complejos" });
  }
};

export const obtenerEmpresaPorId = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Complejo no encontrado" });
  }

  try {
    // Con la misma actividad que la lista: el administrador la ve antes de eliminar
    const resultado = await pool.query(
      `SELECT ${COLUMNAS_EMPRESA.split(", ").map((c) => `e.${c}`).join(", ")},
         (SELECT COUNT(*) FROM canchas c WHERE c.id_empresa = e.id_empresa)::int AS canchas,
         (SELECT COUNT(*) FROM reservas r WHERE r.id_empresa = e.id_empresa
            AND r.estado <> 'cancelada' AND r.id_partido IS NULL)::int AS turnos,
         (SELECT COUNT(*) FROM torneos t WHERE t.id_empresa = e.id_empresa)::int AS torneos
       FROM empresas e WHERE e.id_empresa = $1`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Complejo no encontrado" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener el complejo" });
  }
};

export const crearEmpresa = async (req, res) => {
  const { nombre, cuit, email, telefono, direccion, password, activo } = req.body ?? {};

  if (!nombre || !cuit) {
    return res.status(400).json({ mensaje: "El nombre y el CUIT son obligatorios" });
  }
  const cuitNormalizado = normalizarCuit(cuit);
  if (!cuitNormalizado) {
    return res.status(400).json({ mensaje: "El CUIT no es válido: revisá los 11 números" });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }
  if (password && !email) {
    return res.status(400).json({ mensaje: "Para poder ingresar, el complejo necesita un email" });
  }

  try {
    if (await emailDeOtroUsuario(email)) {
      return res.status(400).json({ mensaje: "Ese email ya lo usa otro usuario" });
    }
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const resultado = await pool.query(
      `INSERT INTO empresas (nombre, cuit, email, telefono, direccion, password_hash, activo)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, $7) RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre, cuitNormalizado, email || null, telefono || null, direccion || null, hash, activo !== false]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: mensajeDuplicado(error) });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear el complejo" });
  }
};

export const actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, cuit, email, telefono, direccion, activo, password } = req.body ?? {};

  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Complejo no encontrado" });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }
  const cuitNormalizado = cuit ? normalizarCuit(cuit) : null;
  if (cuit && !cuitNormalizado) {
    return res.status(400).json({ mensaje: "El CUIT no es válido: revisá los 11 números" });
  }

  try {
    if (await emailDeOtroUsuario(email)) {
      return res.status(400).json({ mensaje: "Ese email ya lo usa otro usuario" });
    }
    const hash = password ? await bcrypt.hash(password, 10) : null;
    // COALESCE: los campos que no se envían conservan su valor actual
    const resultado = await pool.query(
      `UPDATE empresas SET
         nombre = COALESCE($1, nombre),
         cuit = COALESCE($2, cuit),
         email = COALESCE(LOWER($3), email),
         telefono = COALESCE($4, telefono),
         direccion = COALESCE($5, direccion),
         activo = COALESCE($6, activo),
         password_hash = COALESCE($7, password_hash)
       WHERE id_empresa = $8 RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre || null, cuitNormalizado, email || null, telefono ?? null, direccion ?? null, activo ?? null, hash, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Complejo no encontrado" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: mensajeDuplicado(error) });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar el complejo" });
  }
};

// Contraseña nueva para un complejo (la elige el administrador y se la pasa)
export const cambiarPasswordEmpresa = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body ?? {};
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Complejo no encontrado" });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const { rows } = await pool.query("SELECT email FROM empresas WHERE id_empresa = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Complejo no encontrado" });
    }
    if (!rows[0].email) {
      return res.status(400).json({ mensaje: "Para poder ingresar, el complejo necesita un email" });
    }
    const hash = await bcrypt.hash(String(password), 10);
    const resultado = await pool.query(
      `UPDATE empresas SET password_hash = $1 WHERE id_empresa = $2 RETURNING ${COLUMNAS_EMPRESA}`,
      [hash, id]
    );
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al cambiar la contraseña" });
  }
};

// Borra la empresa y, en cascada, sus canchas, turnos, torneos y perfil
export const eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Complejo no encontrado" });
  }

  try {
    const resultado = await pool.query("DELETE FROM empresas WHERE id_empresa = $1", [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Complejo no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar el complejo" });
  }
};

// Números generales para el panel del administrador
export const obtenerResumen = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM empresas)::int AS empresas,
         (SELECT COUNT(*) FROM empresas WHERE activo)::int AS empresas_activas,
         (SELECT COUNT(*) FROM clientes)::int AS clientes,
         (SELECT COUNT(*) FROM canchas)::int AS canchas,
         (SELECT COUNT(*) FROM reservas WHERE estado <> 'cancelada' AND id_partido IS NULL)::int AS turnos,
         (SELECT COUNT(*) FROM torneos)::int AS torneos`
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener el resumen" });
  }
};
