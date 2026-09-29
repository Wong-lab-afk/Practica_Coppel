import * as puestosController from './controllers/puestosController.js';
// router.js
// Tabla de rutas: une método + patrón de URL con su controlador.
// Mantener esto separado de server.js hace explícito el contrato de la API
// (útil para revisarla de un vistazo) y separa "qué expone la API" de
// "cómo se sirve por HTTP".
import * as UsuariosController from './controllers/usuariosController.js';
import * as TareasController from './controllers/tareasController.js';

export const routes = [
  // --- PUESTOS ---
  { method: 'GET', pattern: /^\/api\/puestos$/, handler: puestosController.listar },
  { method: 'GET', pattern: /^\/api\/usuarios$/, handler: UsuariosController.listar },
  { method: 'GET', pattern: /^\/api\/usuarios\/(\d+)$/, handler: (req, res, [id]) => UsuariosController.obtenerConTareas(req, res, Number(id)) },
  { method: 'POST', pattern: /^\/api\/usuarios$/, handler: UsuariosController.crear },
  { method: 'PUT', pattern: /^\/api\/usuarios\/(\d+)$/, handler: (req, res, [id]) => UsuariosController.actualizar(req, res, Number(id)) },
  { method: 'DELETE', pattern: /^\/api\/usuarios\/(\d+)$/, handler: (req, res, [id]) => UsuariosController.eliminar(req, res, Number(id)) },
  { method: 'POST', pattern: /^\/api\/usuarios\/(\d+)\/tareas$/, handler: (req, res, [id]) => TareasController.crearParaUsuario(req, res, Number(id)) },
  { method: 'PUT', pattern: /^\/api\/tareas\/(\d+)$/, handler: (req, res, [id]) => TareasController.actualizar(req, res, Number(id)) },
  { method: 'DELETE', pattern: /^\/api\/tareas\/(\d+)$/, handler: (req, res, [id]) => TareasController.eliminar(req, res, Number(id)) },
];

export function encontrarRuta(method, pathname) {
  const match = routes.find((r) => r.method === method && r.pattern.test(pathname));
  if (!match) return null;
  return { handler: match.handler, params: pathname.match(match.pattern).slice(1) };
}
