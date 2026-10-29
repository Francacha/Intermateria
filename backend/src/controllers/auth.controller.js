import bcrypt from "bcryptjs";
import pool from "../data/db.js";
import { crearToken } from "../middlewares/auth.js";
import { normalizarCuit } from "../utils/comun.js";

// Columnas públicas de una empresa: nunca se devuelve password_hash
export const COLUMNAS_EMPRESA =
  "id_empresa, nombre, cuit, email, telefono, direccion, activo, fecha_creacion";

const COLUMNAS_CLIENTE = "id_cliente, nombre, apellido, telefono, email, fecha_alta";

const MAX_CANCHAS = 30;

const cantidadValida = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_CANCHAS;
const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "");

// El email es el usuario para iniciar sesión: no puede repetirse entre
// administradores, empresas, encargados y clientes.
export const emailEnUso = async (db, email) => {
  const { rows } = await db.query(
    `SELECT 1 FROM administradores WHERE email = LOWER($1)
     UNION ALL SELECT 1 FROM empresas WHERE email = LOWER($1)
     UNION ALL SELECT 1 FROM encargados WHERE email = LOWER($1)
     UNION ALL SELECT 1 FROM clientes WHERE email = LOWER($1)`,
    [email]
  );
  return rows.length > 0;
};

// Datos del usuario logueado que se mandan al front (sin contraseña).
// En un complejo, además: quién es la persona (dueño o encargado) y su puesto.
const datosUsuario = async (rol, id, idEncargado = null) => {
  const consultas = {
    admin: "SELECT id_admin, nombre, email FROM administradores WHERE id_admin = $1",
    empresa: `SELECT ${COLUMNAS_EMPRESA} FROM empresas WHERE id_empresa = $1`,
    cliente: `SELECT ${COLUMNAS_CLIENTE} FROM clientes WHERE id_cliente = $1`
  };
  const { rows } = await pool.query(consultas[rol], [id]);
  if (!rows[0]) return null;
  if (rol !== "empresa") return { rol, ...rows[0] };
  if (!idEncargado) return { rol, ...rows[0], puesto: "dueno", persona: "Dueño" };

  const { rows: [encargado] } = await pool.query(
    "SELECT id_encargado, nombre, email, turno FROM encargados WHERE id_encargado = $1 AND id_empresa = $2",
    [idEncargado, id]
  );
  if (!encargado) return null;
  return {
    rol,
    ...rows[0],
    puesto: "encargado",
    persona: encargado.nombre,
    id_encargado: encargado.id_encargado,
    email_encargado: encargado.email,
    turno: encargado.turno
  };
};

const sesion = (rol, id, nombre, usuario, extra = {}) => ({ token: crearToken(rol, id, nombre, extra), usuario });

// Registro de un complejo: la empresa y sus canchas se crean juntas
export const registrar = async (req, res) => {
  const { nombre, cuit, email, password, telefono, direccion, canchas } = req.body ?? {};
  const futbol = Number(canchas?.futbol ?? 0);
  const padel = Number(canchas?.padel ?? 0);
  const precioFutbol = Number(canchas?.precio_futbol ?? 0);
  const precioPadel = Number(canchas?.precio_padel ?? 0);
  // Fútbol 5, 7 u 11 (jugadores por equipo); si no viene, fútbol 5
  const jugadoresFutbol = Number(canchas?.jugadores_futbol ?? 5);

  if (!nombre || !cuit || !email || !password) {
    return res.status(400).json({ mensaje: "Nombre, CUIT, email y contraseña son obligatorios" });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ mensaje: "El email no es válido" });
  }
  const cuitNormalizado = normalizarCuit(cuit);
  if (!cuitNormalizado) {
    return res.status(400).json({ mensaje: "El CUIT no es válido: revisá los 11 números" });
  }
  if (![5, 7, 11].includes(jugadoresFutbol)) {
    return res.status(400).json({ mensaje: "Las canchas de fútbol tienen que ser de 5, 7 u 11" });
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

  // O se guarda todo o nada
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    if (await emailEnUso(cliente, email)) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({ mensaje: "Ese email ya está registrado" });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await cliente.query(
      `INSERT INTO empresas (nombre, cuit, email, password_hash, telefono, direccion)
       VALUES ($1, $2, LOWER($3), $4, $5, $6) RETURNING ${COLUMNAS_EMPRESA}`,
      [nombre, cuitNormalizado, email, hash, telefono || null, direccion || null]
    );
    const empresa = rows[0];

    const nuevas = [
      ...Array.from({ length: futbol }, (_, i) => [`Fútbol ${i + 1}`, "futbol", jugadoresFutbol, precioFutbol]),
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
    res.status(201).json(
      sesion("empresa", empresa.id_empresa, empresa.nombre, { rol: "empresa", ...empresa, puesto: "dueno", persona: "Dueño" }, { puesto: "dueno" })
    );
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23505") {
      const porCuit = String(error.constraint ?? error.detail ?? "").includes("cuit");
      return res.status(400).json({
        mensaje: porCuit ? "Ya hay un complejo registrado con ese CUIT" : "Ese email ya está registrado"
      });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar la empresa" });
  } finally {
    cliente.release();
  }
};

// Registro de un jugador
export const registrarCliente = async (req, res) => {
  const { nombre, apellido, telefono, email, password } = req.body ?? {};

  if (!nombre || !apellido || !telefono || !email || !password) {
    return res.status(400).json({ mensaje: "Nombre, apellido, teléfono, email y contraseña son obligatorios" });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ mensaje: "El email no es válido" });
  }
  if (password.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    if (await emailEnUso(pool, email)) {
      return res.status(400).json({ mensaje: "Ese email ya está registrado" });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO clientes (nombre, apellido, telefono, email, password_hash)
       VALUES ($1, $2, $3, LOWER($4), $5) RETURNING ${COLUMNAS_CLIENTE}`,
      [nombre.trim(), apellido.trim(), telefono.trim(), email, hash]
    );
    const nuevo = rows[0];
    res.status(201).json(
      sesion("cliente", nuevo.id_cliente, `${nuevo.nombre} ${nuevo.apellido}`, { rol: "cliente", ...nuevo })
    );
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ese email ya está registrado" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrarte" });
  }
};

// Un único login para todos: se busca el email en administradores, empresas
// (dueños), encargados y clientes
export const iniciarSesion = async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ mensaje: "Email y contraseña son obligatorios" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 'admin' AS rol, id_admin AS id, nombre, password_hash, TRUE AS activo, NULL::int AS id_encargado, TRUE AS persona_activa
         FROM administradores WHERE email = LOWER($1)
       UNION ALL
       SELECT 'empresa', id_empresa, nombre, password_hash, activo, NULL, TRUE
         FROM empresas WHERE email = LOWER($1)
       UNION ALL
       SELECT 'empresa', e.id_empresa, e.nombre, enc.password_hash, e.activo, enc.id_encargado, enc.activo
         FROM encargados enc JOIN empresas e ON e.id_empresa = enc.id_empresa
        WHERE enc.email = LOWER($1)
       UNION ALL
       SELECT 'cliente', id_cliente, nombre || ' ' || apellido, password_hash, TRUE, NULL, TRUE
         FROM clientes WHERE email = LOWER($1)`,
      [email]
    );

    let encontrado = null;
    for (const fila of rows) {
      if (fila.password_hash && (await bcrypt.compare(password, fila.password_hash))) {
        encontrado = fila;
        break;
      }
    }
    // Mismo mensaje si no existe el email o si la contraseña es incorrecta
    if (!encontrado) {
      return res.status(401).json({ mensaje: "Email o contraseña incorrectos" });
    }
    if (!encontrado.activo) {
      return res.status(403).json({ mensaje: "La empresa está dada de baja" });
    }
    if (!encontrado.persona_activa) {
      return res.status(403).json({ mensaje: "Tu usuario de encargado está dado de baja. Hablá con el dueño del complejo." });
    }

    const usuario = await datosUsuario(encontrado.rol, encontrado.id, encontrado.id_encargado);
    const extra =
      encontrado.rol !== "empresa"
        ? {}
        : encontrado.id_encargado
          ? { puesto: "encargado", id_encargado: encontrado.id_encargado }
          : { puesto: "dueno" };
    res.json(sesion(encontrado.rol, encontrado.id, encontrado.nombre, usuario, extra));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
};

export const obtenerSesion = async (req, res) => {
  try {
    const usuario = await datosUsuario(req.usuario.rol, req.usuario.id, req.usuario.id_encargado);
    if (!usuario) {
      return res.status(401).json({ mensaje: "El usuario ya no existe" });
    }
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener la sesión" });
  }
};

// Tabla y columna de id de cada rol, para cambiar la contraseña propia
const TABLA_DEL_ROL = {
  admin: ["administradores", "id_admin"],
  empresa: ["empresas", "id_empresa"],
  cliente: ["clientes", "id_cliente"]
};

// El usuario logueado cambia su contraseña: tiene que confirmar la actual
export const cambiarPassword = async (req, res) => {
  const { actual, nueva } = req.body ?? {};
  if (!actual || !nueva) {
    return res.status(400).json({ mensaje: "Completá la contraseña actual y la nueva" });
  }
  if (String(nueva).length < 8) {
    return res.status(400).json({ mensaje: "La contraseña nueva debe tener al menos 8 caracteres" });
  }
  // Un encargado cambia su propia contraseña, no la del complejo
  const encargado = req.usuario.puesto === "encargado";
  const [tabla, columna] = encargado ? ["encargados", "id_encargado"] : TABLA_DEL_ROL[req.usuario.rol];
  const id = encargado ? req.usuario.id_encargado : req.usuario.id;
  try {
    const { rows } = await pool.query(`SELECT password_hash FROM ${tabla} WHERE ${columna} = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: "No encontramos tu cuenta" });
    if (!rows[0].password_hash || !(await bcrypt.compare(String(actual), rows[0].password_hash))) {
      return res.status(400).json({ mensaje: "La contraseña actual no es correcta" });
    }
    const hash = await bcrypt.hash(String(nueva), 10);
    await pool.query(`UPDATE ${tabla} SET password_hash = $1 WHERE ${columna} = $2`, [hash, id]);
    res.json({ mensaje: "Contraseña actualizada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al cambiar la contraseña" });
  }
};
