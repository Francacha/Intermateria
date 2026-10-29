import bcrypt from "bcryptjs";
import pool from "../data/db.js";
import { emailEnUso } from "./auth.controller.js";
import { ErrorHttp, idValido, responderError } from "../utils/comun.js";

// Encargados del complejo: los da de alta el dueño. Atienden el mostrador,
// toman reservas y cobran; no cambian precios, horarios ni torneos.

const COLUMNAS = "id_encargado, nombre, email, turno, activo, creado_en";
const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "");
const texto = (valor, max) => String(valor ?? "").trim().slice(0, max);

export const listarEncargados = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS} FROM encargados WHERE id_empresa = $1 ORDER BY activo DESC, nombre`,
      [req.empresa.id_empresa]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los encargados");
  }
};

export const crearEncargado = async (req, res) => {
  const { nombre, email, password, turno } = req.body ?? {};
  try {
    if (!texto(nombre, 100)) throw new ErrorHttp(400, "Escribí el nombre del encargado");
    if (!emailValido(email)) throw new ErrorHttp(400, "El email no es válido");
    if (String(password ?? "").length < 8) throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres");
    if (await emailEnUso(pool, email)) throw new ErrorHttp(400, "Ese email ya está registrado");

    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await pool.query(
      `INSERT INTO encargados (id_empresa, nombre, email, password_hash, turno)
       VALUES ($1, $2, LOWER($3), $4, $5) RETURNING ${COLUMNAS}`,
      [req.empresa.id_empresa, texto(nombre, 100), email.trim(), hash, texto(turno, 40) || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ mensaje: "Ese email ya está registrado" });
    responderError(res, error, "Error al crear el encargado");
  }
};

// Editar nombre o turno, darlo de baja / reactivarlo, o ponerle una contraseña nueva
export const actualizarEncargado = async (req, res) => {
  const { id } = req.params;
  const { nombre, turno, activo, password } = req.body ?? {};
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Encargado no encontrado");
    if (nombre !== undefined && !texto(nombre, 100)) throw new ErrorHttp(400, "El nombre no puede quedar vacío");
    if (password !== undefined && String(password).length < 8) {
      throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres");
    }
    const hash = password !== undefined ? await bcrypt.hash(String(password), 10) : null;
    const { rows } = await pool.query(
      `UPDATE encargados SET
         nombre = COALESCE($1, nombre),
         turno = CASE WHEN $2::boolean THEN $3 ELSE turno END,
         activo = COALESCE($4, activo),
         password_hash = COALESCE($5, password_hash)
       WHERE id_encargado = $6 AND id_empresa = $7 RETURNING ${COLUMNAS}`,
      [
        nombre !== undefined ? texto(nombre, 100) : null,
        turno !== undefined,
        texto(turno, 40) || null,
        typeof activo === "boolean" ? activo : null,
        hash,
        id,
        req.empresa.id_empresa
      ]
    );
    if (rows.length === 0) throw new ErrorHttp(404, "Encargado no encontrado");
    res.json(rows[0]);
  } catch (error) {
    responderError(res, error, "Error al actualizar el encargado");
  }
};
