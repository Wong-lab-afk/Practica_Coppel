import pool from '../db.js';

function toDTO(row) {
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fecha: row.fecha,
    estatus: row.estatus,
    prioridad: row.prioridad || 'media',
    created_at: row.created_at,
  };
}

export async function deUsuario(usuarioId) {
  const { rows } = await pool.query(
    'SELECT * FROM tareas WHERE usuario_id = $1 ORDER BY id DESC',
    [usuarioId]
  );
  return rows.map(toDTO);
}

export async function obtener(id) {
  const { rows } = await pool.query('SELECT * FROM tareas WHERE id = $1', [id]);
  return rows[0] ? toDTO(rows[0]) : null;
}

export async function crear(usuarioId, { titulo, descripcion, fecha, estatus = 'pendiente', prioridad = 'media' }) {
  const { rows } = await pool.query(
    'INSERT INTO tareas (usuario_id, titulo, descripcion, fecha, estatus, prioridad) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [usuarioId, titulo, descripcion || null, fecha || null, estatus, prioridad]
  );
  return toDTO(rows[0]);
}

export async function actualizar(id, { usuarioId, titulo, descripcion, fecha, estatus, prioridad }) {
  const { rows } = await pool.query(
    'UPDATE tareas SET usuario_id = $1, titulo = $2, descripcion = $3, fecha = $4, estatus = $5, prioridad = $6 WHERE id = $7 RETURNING *',
    [usuarioId, titulo, descripcion, fecha, estatus, prioridad || 'media', id]
  );
  return rows[0] ? toDTO(rows[0]) : null;
}

export async function eliminar(id) {
  await pool.query('DELETE FROM tareas WHERE id = $1', [id]);
}
