import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const target = '/prototypes/ux-vertical-slice/cockpit-operator-v2.html';
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png' };

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  const requested = pathname === '/' ? target : pathname;
  const file = normalize(join(root, requested));
  if (!file.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Ship Studio preview: http://127.0.0.1:${port}${target}`));
