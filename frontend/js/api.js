// js/api.js
// Única capa que sabe hablar con el backend. No toca el DOM ni el estado:
// solo hace fetch y devuelve datos (o lanza un Error con el mensaje del
// servidor). El resto de la app no sabe que existe "fetch".
const BASE = '/api';

/**
 * Hace una petición HTTP al backend.
 * @param {string} path - La ruta de la API.
 * @param {Object} [options={}] - Opciones de la petición fetch.
 * @returns {Promise<any>} Los datos devueltos por la API.
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  listarUsuarios: () => request('/usuarios'),
  obtenerUsuario: (id) => request(`/usuarios/${id}`),
  crearUsuario: (payload) => request('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarUsuario: (id, payload) => request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eliminarUsuario: (id) => request(`/usuarios/${id}`, { method: 'DELETE' }),
  obtenerPuestos: () => request('/puestos'),

  crearTarea: (usuarioId, payload) => request(`/usuarios/${usuarioId}/tareas`, { method: 'POST', body: JSON.stringify(payload) }),
  actualizarTarea: (id, payload) => request(`/tareas/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eliminarTarea: (id) => request(`/tareas/${id}`, { method: 'DELETE' }),
};
