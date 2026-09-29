// server.js
// Punto de entrada: crea el servidor HTTP, sirve el frontend estático y
// delega las peticiones /api/* al router. No contiene lógica de negocio
// ni SQL — eso vive en controllers/ y models/ respectivamente.
import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { initDB } from './db.js';
import { seedIfEmpty } from './models/seed.js';
import { encontrarRuta } from './router.js';
import { sendError, sendPreflight, HttpError } from './utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

async function serveStatic(req, res, pathname) {
  const filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(FRONTEND_DIR, filePath);

  if (!fullPath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const content = await readFile(fullPath);
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return sendPreflight(res);

  if (!url.pathname.startsWith('/api')) {
    return serveStatic(req, res, url.pathname);
  }

  const ruta = encontrarRuta(req.method, url.pathname);
  if (!ruta) {
    return sendError(res, 404, `No existe el endpoint ${req.method} ${url.pathname}`);
  }

  try {
    await ruta.handler(req, res, ruta.params);
  } catch (err) {
    if (err instanceof HttpError) {
      sendError(res, err.statusCode, err.message);
    } else {
      console.error(err);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
});

// Arranque asíncrono: conecta a PostgreSQL, crea tablas, ejecuta seed y
// levanta el servidor solo cuando la BD esté lista.
async function start() {
  await initDB();
  await seedIfEmpty();
  server.listen(PORT, () => {
    console.log(`✅ API + frontend en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌ No se pudo arrancar:', err.message);
  process.exit(1);
});
