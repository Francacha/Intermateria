import pool from "../data/db.js";
import { eliminarPerfil } from "../data/mongo.js";
import { COLUMNAS_EMPRESA } from "./auth.controller.js";

// Un id que no es un número entero no puede existir en la tabla
const idValido = (id) => /^\d+$/.test(id);

export const obtenerEmpresas = async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${COLUMNAS_EMPRESA} FROM empresas ORDER BY id_empresa`);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener las empresas" });
  }
};

export const obtenerEmpresaPorId = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Empresa no encontrada" });
  }

  try {
    const resultado = await pool.query(`SELECT ${COLUMNAS_EMPRESA} FROM empresas WHERE id_empresa = $1`, [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener la empresa" });
  }
};

export const crearEmpresa = async (req, res) => {
  const { nombre, cuit, email, telefono, direccion } = req.body ?? {};

  if (!nombre || !cuit) {
    return res.status(400).json({ mensaje: "El nombre y el cuit son obligatorios" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO empresas (nombre, cuit, email, telefono, direccion)
       VALUES ($1, $2, LOWER($3), $4, $5) RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre, cuit, email || null, telefono || null, direccion || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya existe una empresa con ese cuit o email" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear la empresa" });
  }
};

export const actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, cuit, email, telefono, direccion, activo } = req.body ?? {};

  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Empresa no encontrada" });
  }

  try {
    // COALESCE: los campos que no se envían conservan su valor actual
    const resultado = await pool.query(
      `UPDATE empresas SET
         nombre = COALESCE($1, nombre),
         cuit = COALESCE($2, cuit),
         email = COALESCE(LOWER($3), email),
         telefono = COALESCE($4, telefono),
         direccion = COALESCE($5, direccion),
         activo = COALESCE($6, activo)
       WHERE id_empresa = $7 RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre || null, cuit || null, email ?? null, telefono ?? null, direccion ?? null, activo ?? null, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya existe una empresa con ese cuit o email" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar la empresa" });
  }
};

export const eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Empresa no encontrada" });
  }

  try {
    const resultado = await pool.query("DELETE FROM empresas WHERE id_empresa = $1", [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    await eliminarPerfil(Number(id));
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar la empresa" });
  }
};
