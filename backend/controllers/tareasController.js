import * as Tareas from '../models/tareasModel.js';
import { requerirUsuario } from './usuariosController.js';
import { readJSONBody, sendJSON, HttpError } from '../utils/http.js';

const ESTATUS_VALIDOS = ['pendiente', 'en_progreso', 'completada'];
const PRIORIDADES_VALIDAS = ['urgente', 'alta', 'media', 'baja'];

/**
 * Recupera una tarea por su ID, lanzando un error si no se encuentra.
 * @param {string|number} id - El ID de la tarea.
 * @returns {Promise<Object>} La tarea recuperada.
 */
async function requerirTarea(id) {
  const tarea = await Tareas.obtener(id);
  if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
  return tarea;
}

function validarEstatus(estatus, prioridad) {
  if (estatus !== undefined && !ESTATUS_VALIDOS.includes(estatus)) {
    throw new HttpError(400, `estatus inválido. Debe ser: ${ESTATUS_VALIDOS.join(', ')}`);
  }
  if (prioridad !== undefined && !PRIORIDADES_VALIDAS.includes(prioridad)) {
    throw new HttpError(400, `prioridad inválida. Debe ser: ${PRIORIDADES_VALIDAS.join(', ')}`);
  }
}

/**
 * Crea una nueva tarea para un usuario específico.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} usuarioId - El ID del usuario.
 */
export async function crearParaUsuario(req, res, usuarioId) {
  await requerirUsuario(usuarioId);
  const body = await readJSONBody(req);
  if (!body.titulo) throw new HttpError(400, 'titulo es obligatorio');
  validarEstatus(body.estatus, body.prioridad);
  sendJSON(res, 201, await Tareas.crear(usuarioId, body));
}

/**
 * Actualiza la información de una tarea existente.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} id - El ID de la tarea a actualizar.
 */
export async function actualizar(req, res, id) {
  const existente = await requerirTarea(id);
  const body = await readJSONBody(req);
  validarEstatus(body.estatus, body.prioridad);

  const usuarioId = body.usuario_id ?? existente.usuario_id;
  if (body.usuario_id !== undefined) await requerirUsuario(usuarioId);

  const datos = {
    usuarioId,
    titulo: body.titulo ?? existente.titulo,
    descripcion: body.descripcion ?? existente.descripcion,
    fecha: body.fecha ?? existente.fecha,
    estatus: body.estatus ?? existente.estatus,
    prioridad: body.prioridad ?? existente.prioridad,
  };
  sendJSON(res, 200, await Tareas.actualizar(id, datos));
}

/**
 * Elimina una tarea por su ID.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} id - El ID de la tarea a eliminar.
 */
export async function eliminar(req, res, id) {
  await requerirTarea(id);
  await Tareas.eliminar(id);
  sendJSON(res, 200, { message: 'Tarea eliminada correctamente' });
}
