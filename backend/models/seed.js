// models/seed.js
import pool from '../db.js';
import * as Usuarios from './usuariosModel.js';
import * as Tareas from './tareasModel.js';

export async function seedIfEmpty() {
  // Always ensure some roles exist
  await pool.query("INSERT INTO puestos (nombre) VALUES ('Tech Lead'), ('Senior Full-Stack Engineer'), ('DevOps Engineer'), ('Product Manager') ON CONFLICT DO NOTHING");

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM usuarios');
  if (rows[0].count > 0) return;

  const ana = await Usuarios.crear({ nombre: 'Ana', apellido: 'García', email: 'ana.garcia@example.com', telefono: '555-1234', puesto_id: 1 });
  const luis = await Usuarios.crear({ nombre: 'Luis', apellido: 'Pérez', email: 'luis.perez@example.com', telefono: '555-5678', puesto_id: 2 });

  await Tareas.crear(ana.id, { titulo: 'Preparar presentación', descripcion: 'Slides para la junta del viernes', fecha: '2026-09-26', estatus: 'pendiente' });
  await Tareas.crear(ana.id, { titulo: 'Revisar presupuesto', descripcion: 'Validar gastos de Q3', fecha: '2026-09-28', estatus: 'en_progreso' });
  await Tareas.crear(luis.id, { titulo: 'Actualizar documentación', descripcion: 'API de usuarios', fecha: '2026-09-30', estatus: 'pendiente' });
}