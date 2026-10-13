import pg from "pg";

// Las columnas DATE se devuelven como texto "2026-10-14": si se convirtieran a
// Date de JavaScript, la zona horaria podría correrlas un día.
pg.types.setTypeParser(1082, (valor) => valor);

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Supabase (vía web) exige SSL; el PostgreSQL del contenedor no lo usa
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

export default pool;
