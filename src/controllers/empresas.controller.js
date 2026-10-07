import pool from "../data/db.js";

export const obtenerEmpresas = async (req, res) => {
  try {
    const resultado = await pool.query("SELECT * FROM empresas ORDER BY id_empresa");
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener las empresas" });
  }
};

export const obtenerEmpresaPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query("SELECT * FROM empresas WHERE id_empresa = $1", [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener la empresa" });
  }
};

export const crearEmpresa = async (req, res) => {
  const { nombre, cuit } = req.body;
  
  if (!nombre || !cuit) {
    return res.status(400).json({ mensaje: "El nombre y el cuit son obligatorios" });
  }

  try {
    const resultado = await pool.query(
      "INSERT INTO empresas (nombre, cuit) VALUES ($1, $2) RETURNING *",
      [nombre, cuit]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear la empresa" });
    console.log("ERROR DE BD:", error);
  }
};

export const actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, cuit } = req.body;
  
  try {
    const resultado = await pool.query(
      "UPDATE empresas SET nombre = $1, cuit = $2 WHERE id_empresa = $3 RETURNING *",
      [nombre, cuit, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar la empresa" });
  }
};

export const eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query("DELETE FROM empresas WHERE id_empresa = $1", [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar la empresa" });
  }
};