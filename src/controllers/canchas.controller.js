import pool from "../data/db.js";

// Todas las consultas filtran por req.empresa.id_empresa (viene del token):
// un complejo nunca puede ver ni tocar canchas de otro.

const DEPORTES = ["futbol", "padel"];
const idValido = (id) => /^\d+$/.test(id);

export const obtenerCanchas = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM canchas WHERE id_empresa = $1 ORDER BY deporte, nombre",
      [req.empresa.id_empresa]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener las canchas" });
  }
};

export const crearCancha = async (req, res) => {
  const { nombre, deporte, jugadores, superficie, techada, precio_hora } = req.body ?? {};

  if (!nombre || !DEPORTES.includes(deporte)) {
    return res.status(400).json({ mensaje: "El nombre y el deporte (fútbol o pádel) son obligatorios" });
  }
  if (!(Number(precio_hora) >= 0)) {
    return res.status(400).json({ mensaje: "El precio por hora debe ser un número mayor o igual a 0" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO canchas (id_empresa, nombre, deporte, jugadores, superficie, techada, precio_hora)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.empresa.id_empresa,
        nombre,
        deporte,
        jugadores || (deporte === "padel" ? 4 : 5),
        superficie || null,
        Boolean(techada),
        precio_hora
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya tenés una cancha con ese nombre" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear la cancha" });
  }
};

export const actualizarCancha = async (req, res) => {
  const { id } = req.params;
  const { nombre, deporte, jugadores, superficie, techada, precio_hora, activa } = req.body ?? {};

  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Cancha no encontrada" });
  }
  if (deporte !== undefined && !DEPORTES.includes(deporte)) {
    return res.status(400).json({ mensaje: "El deporte debe ser fútbol o pádel" });
  }
  if (precio_hora !== undefined && !(Number(precio_hora) >= 0)) {
    return res.status(400).json({ mensaje: "El precio por hora debe ser un número mayor o igual a 0" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE canchas SET
         nombre = COALESCE($1, nombre),
         deporte = COALESCE($2, deporte),
         jugadores = COALESCE($3, jugadores),
         superficie = COALESCE($4, superficie),
         techada = COALESCE($5, techada),
         precio_hora = COALESCE($6, precio_hora),
         activa = COALESCE($7, activa)
       WHERE id_cancha = $8 AND id_empresa = $9 RETURNING *`,
      [
        nombre || null,
        deporte ?? null,
        jugadores || null,
        superficie ?? null,
        techada ?? null,
        precio_hora ?? null,
        activa ?? null,
        id,
        req.empresa.id_empresa
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Cancha no encontrada" });
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya tenés una cancha con ese nombre" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar la cancha" });
  }
};

export const eliminarCancha = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(404).json({ mensaje: "Cancha no encontrada" });
  }

  try {
    const resultado = await pool.query(
      "DELETE FROM canchas WHERE id_cancha = $1 AND id_empresa = $2",
      [id, req.empresa.id_empresa]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Cancha no encontrada" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar la cancha" });
  }
};
