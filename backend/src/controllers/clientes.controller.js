import bcrypt from "bcryptjs";
import pool from "../data/db.js";
import { ErrorHttp, idValido, responderError } from "../utils/comun.js";

// Administración de jugadores (solo el administrador).
// Sirve sobre todo para ayudar a un jugador que olvidó su contraseña.

// Jugadores, filtrados por email, nombre o apellido (?q=lucas)
export const listarClientes = async (req, res) => {
  const busqueda = String(req.query.q ?? "").trim();
  try {
    const { rows } = await pool.query(
      `SELECT id_cliente, nombre, apellido, email, telefono, fecha_alta
         FROM clientes
        WHERE $1 = '' OR email ILIKE '%' || $1 || '%' OR (nombre || ' ' || apellido) ILIKE '%' || $1 || '%'
        ORDER BY apellido, nombre
        LIMIT 50`,
      [busqueda]
    );
    res.json(rows);
  } catch (error) {
    responderError(res, error, "Error al obtener los jugadores");
  }
};

// Contraseña nueva para un jugador (la elige el administrador y se la pasa)
export const cambiarPasswordCliente = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body ?? {};
  try {
    if (!idValido(id)) throw new ErrorHttp(404, "Jugador no encontrado");
    if (!password || String(password).length < 8) {
      throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres");
    }
    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await pool.query(
      `UPDATE clientes SET password_hash = $1 WHERE id_cliente = $2
       RETURNING id_cliente, nombre, apellido, email`,
      [hash, id]
    );
    if (rows.length === 0) throw new ErrorHttp(404, "Jugador no encontrado");
    res.json(rows[0]);
  } catch (error) {
    responderError(res, error, "Error al cambiar la contraseña");
  }
};
