import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../data/db.js";

// Columnas públicas de una empresa: nunca se devuelve password_hash
export const COLUMNAS_EMPRESA =
  "id_empresa, nombre, cuit, email, telefono, direccion, activo, fecha_creacion";

const MAX_CANCHAS = 30;

const crearToken = (empresa) =>
  jwt.sign(
    { id_empresa: empresa.id_empresa, nombre: empresa.nombre },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

const cantidadValida = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_CANCHAS;

export const registrar = async (req, res) => {
  const { nombre, cuit, email, password, telefono, direccion, canchas } = req.body ?? {};
  const futbol = Number(canchas?.futbol ?? 0);
  const padel = Number(canchas?.padel ?? 0);
  const precioFutbol = Number(canchas?.precio_futbol ?? 0);
  const precioPadel = Number(canchas?.precio_padel ?? 0);

  if (!nombre || !cuit || !email || !password) {
    return res.status(400).json({ mensaje: "Nombre, CUIT, email y contraseña son obligatorios" });
  }
  if (password.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }
  if (!cantidadValida(futbol) || !cantidadValida(padel) || futbol + padel === 0) {
    return res.status(400).json({
      mensaje: `Indicá cuántas canchas de fútbol y/o pádel manejás (entre 1 y ${MAX_CANCHAS})`
    });
  }
  if (!(precioFutbol >= 0) || !(precioPadel >= 0)) {
    return res.status(400).json({ mensaje: "El precio por hora no puede ser negativo" });
  }

  // La empresa y sus canchas se crean juntas: o se guarda todo o nada
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await cliente.query(
      `INSERT INTO empresas (nombre, cuit, email, password_hash, telefono, direccion)
       VALUES ($1, $2, LOWER($3), $4, $5, $6) RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre, cuit, email, hash, telefono || null, direccion || null]
    );
    const empresa = rows[0];

    const nuevas = [
      ...Array.from({ length: futbol }, (_, i) => [`Fútbol ${i + 1}`, "futbol", 5, precioFutbol]),
      ...Array.from({ length: padel }, (_, i) => [`Pádel ${i + 1}`, "padel", 4, precioPadel])
    ];
    for (const [nombreCancha, deporte, jugadores, precio] of nuevas) {
      await cliente.query(
        `INSERT INTO canchas (id_empresa, nombre, deporte, jugadores, precio_hora)
         VALUES ($1, $2, $3, $4, $5)`,
        [empresa.id_empresa, nombreCancha, deporte, jugadores, precio]
      );
    }

    await cliente.query("COMMIT");
    res.status(201).json({ token: crearToken(empresa), empresa });
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya existe una empresa con ese CUIT o email" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar la empresa" });
  } finally {
    cliente.release();
  }
};

export const iniciarSesion = async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ mensaje: "Email y contraseña son obligatorios" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS_EMPRESA}, password_hash FROM empresas WHERE email = LOWER($1)`,
      [email]
    );
    const encontrada = rows[0];
    const valida = encontrada?.password_hash && (await bcrypt.compare(password, encontrada.password_hash));
    // Mismo mensaje si no existe el email o si la contraseña es incorrecta
    if (!valida) {
      return res.status(401).json({ mensaje: "Email o contraseña incorrectos" });
    }
    if (!encontrada.activo) {
      return res.status(403).json({ mensaje: "La empresa está dada de baja" });
    }

    const { password_hash, ...empresa } = encontrada;
    res.json({ token: crearToken(empresa), empresa });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
};

export const obtenerSesion = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS_EMPRESA} FROM empresas WHERE id_empresa = $1`,
      [req.empresa.id_empresa]
    );
    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "La empresa ya no existe" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener la sesión" });
  }
};
