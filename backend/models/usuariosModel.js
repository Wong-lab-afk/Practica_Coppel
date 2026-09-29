import pool from '../db.js';
import { HttpError } from '../utils/http.js';

function toDTO(row) {
  return {
    id: row.id,
    puesto_id: row.puesto_id,
    puesto_nombre: row.puesto_nombre || null,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    telefono: row.telefono,
    created_at: row.created_at,
  };
}

function traducirErrorSQL(err) {
  if (err.code === '23505') { 
    return new HttpError(409, 'Ya existe un usuario con ese email');
  }
  return new HttpError(500, 'Error de base de datos');
}

export async function listar() {
  const { rows } = await pool.query('SELECT u.*, p.nombre AS puesto_nombre FROM usuarios u LEFT JOIN puestos p ON u.puesto_id = p.id ORDER BY u.id DESC');
  return rows.map(toDTO);
}

export async function obtener(id) {
  const { rows } = await pool.query('SELECT u.*, p.nombre AS puesto_nombre FROM usuarios u LEFT JOIN puestos p ON u.puesto_id = p.id WHERE u.id = $1', [id]);
  return rows[0] ? toDTO(rows[0]) : null;
}

export async function existe(id) {
  const { rows } = await pool.query('SELECT 1 FROM usuarios WHERE id = $1', [id]);
  return rows.length > 0;
}

export async function crear({ nombre, apellido, email, telefono, puesto_id }) {
  try {
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, telefono, puesto_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, apellido, email, telefono || null, puesto_id || null]
    );
    return obtener(rows[0].id);
  } catch (err) {
    throw traducirErrorSQL(err);
  }
}

export async function actualizar(id, { nombre, apellido, email, telefono, puesto_id }) {
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, telefono = $4, puesto_id = $5 WHERE id = $6 RETURNING *',
      [nombre, apellido, email, telefono, puesto_id || null, id]
    );
    return rows[0] ? obtener(rows[0].id) : null;
  } catch (err) {
    throw traducirErrorSQL(err);
  }
}

export async function eliminar(id) {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
}
