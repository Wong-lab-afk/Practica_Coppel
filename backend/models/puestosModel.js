import pool from '../db.js';
export async function listar() {
  const { rows } = await pool.query('SELECT * FROM puestos ORDER BY nombre ASC');
  return rows;
}
