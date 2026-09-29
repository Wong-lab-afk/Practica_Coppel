// db.js
// Conexión a PostgreSQL (corriendo en Docker) mediante el módulo "pg".
// Exporta el pool de conexiones y una función initDB() que crea las tablas.

import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || 'taskflow',
  password: process.env.DB_PASSWORD || 'taskflow',
  database: process.env.DB_NAME || 'taskflow',
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS puestos (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      puesto_id   INTEGER REFERENCES puestos(id),
      nombre      TEXT NOT NULL,
      apellido    TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      telefono    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN puesto_id INTEGER REFERENCES puestos(id);');
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE tareas ADD COLUMN prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('urgente', 'alta', 'media', 'baja'));");
  } catch (err) {}

  await pool.query(`
        CREATE TABLE IF NOT EXISTS tareas (
      id           SERIAL PRIMARY KEY,
      usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo       TEXT NOT NULL,
      descripcion  TEXT,
      fecha        TEXT,
      estatus      TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estatus IN ('pendiente', 'en_progreso', 'completada')),
      prioridad    TEXT NOT NULL DEFAULT 'media'
                   CHECK (prioridad IN ('urgente', 'alta', 'media', 'baja')),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export default pool;
