// controllers/usuariosController.js
import * as Usuarios from '../models/usuariosModel.js';
import * as Tareas from '../models/tareasModel.js';
import { readJSONBody, sendJSON, HttpError } from '../utils/http.js';

function validarDatosUsuario({ nombre, apellido, email }, { parcial = false } = {}) {
  if (parcial) return; // en PUT, cada campo es opcional (se combina con lo existente)
  if (!nombre || !apellido || !email) {
    throw new HttpError(400, 'nombre, apellido y email son obligatorios');
  }
}

/**
 * Recupera un usuario por su ID, lanzando un error si no se encuentra.
 * @param {string|number} id - El ID del usuario.
 * @returns {Promise<Object>} El usuario recuperado.
 */
async function requerirUsuario(id) {
  const usuario = await Usuarios.obtener(id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  return usuario;
}

/**
 * Lista todos los usuarios.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 */
export async function listar(req, res) {
  sendJSON(res, 200, await Usuarios.listar());
}

/**
 * Obtiene un usuario específico junto con sus tareas.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} id - El ID del usuario.
 */
export async function obtenerConTareas(req, res, id) {
  const usuario = await requerirUsuario(id);
  sendJSON(res, 200, { ...usuario, tareas: await Tareas.deUsuario(id) });
}

/**
 * Crea un nuevo usuario.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 */
export async function crear(req, res) {
  const body = await readJSONBody(req);
  validarDatosUsuario(body);
  const usuario = await Usuarios.crear(body);
  sendJSON(res, 201, usuario);
}

/**
 * Actualiza la información de un usuario.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} id - El ID del usuario.
 */
export async function actualizar(req, res, id) {
  const existente = await requerirUsuario(id);
  const body = await readJSONBody(req);
  const datos = {
    nombre: body.nombre ?? existente.nombre,
    apellido: body.apellido ?? existente.apellido,
    email: body.email ?? existente.email,
    telefono: body.telefono ?? existente.telefono,
    puesto_id: body.puesto_id !== undefined ? body.puesto_id : existente.puesto_id,
  };
  sendJSON(res, 200, await Usuarios.actualizar(id, datos));
}

/**
 * Elimina un usuario y todas sus tareas.
 * @param {Object} req - La petición HTTP.
 * @param {Object} res - La respuesta HTTP.
 * @param {string|number} id - El ID del usuario.
 */
export async function eliminar(req, res, id) {
  await requerirUsuario(id);
  await Usuarios.eliminar(id); // cascada elimina también sus tareas
  sendJSON(res, 200, { message: 'Usuario (y sus tareas) eliminado correctamente' });
}

export { requerirUsuario };
