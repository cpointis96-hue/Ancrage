import http from 'node:http';
import { createRouter } from './router.mjs';

export function createLocalServer({ app, host = '127.0.0.1', port = 0, staticRoot = null }) {
  let server;
  const router = createRouter(app);
  server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const address = server.address(); const expectedOrigin = `http://${host}:${address?.port ?? port}`;
    const headers = { 'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
    if (origin && origin !== expectedOrigin) { response.writeHead(403, headers); response.end('Forbidden'); return; }
    if ((request.url ?? '').startsWith('/api/')) { for (const [name, value] of Object.entries(headers)) response.setHeader(name, value); return router(request, response, new URL(request.url, expectedOrigin)); }
    if (staticRoot) return serveStatic(request, response, staticRoot, headers);
    response.writeHead(404, headers); response.end('Not found');
  });
  return { server, async listen() { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); }); return server.address(); }, async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } };
}

async function serveStatic(request, response, root, headers) {
  const { readFile } = await import('node:fs/promises'); const { join, normalize } = await import('node:path'); const file = normalize(join(root, new URL(request.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname));
  if (!file.startsWith(root)) { response.writeHead(403, headers); response.end('Forbidden'); return; }
  try { response.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.css') ? 'text/css; charset=utf-8' : /\.m?js$/.test(file) ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' }); response.end(await readFile(file)); } catch { response.writeHead(404, headers); response.end('Not found'); }
}
