import * as Puestos from '../models/puestosModel.js';
import { sendJSON } from '../utils/http.js';

export async function listar(req, res) {
  const puestos = await Puestos.listar();
  sendJSON(res, 200, puestos);
}
