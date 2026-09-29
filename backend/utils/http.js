// utils/http.js
// Helpers pequeños y reutilizables para responder y leer peticiones HTTP,
// evitando repetir este código en cada controlador.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: message });
}

export function sendPreflight(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

const MAX_BODY_SIZE = 1_000_000; // 1 MB, suficiente para este dominio

export function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_SIZE) {
        req.destroy();
        reject(new HttpError(413, 'Cuerpo de la petición demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

// Error con código HTTP asociado. Los controladores lo lanzan y el router
// central lo traduce a la respuesta correcta, en vez de repetir try/catch
// con formato distinto en cada handler.
export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
