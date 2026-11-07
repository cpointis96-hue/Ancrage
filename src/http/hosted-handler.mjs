import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRouter } from './router.mjs';
import { readJsonBody, sendJson } from './json.mjs';

const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function createHostedHandler({ getApp, sessionSecret, workerSecret, waitUntil = () => {}, origin }) {
  if (!sessionSecret || sessionSecret.length < 32) throw new Error('PUBLIC_SESSION_SECRET doit contenir au moins 32 caractères.');
  const sign = id => createHmac('sha256', sessionSecret).update(id).digest('hex');
  const cookieName = id => `ancrage_${id}`;
  const authorize = (request, id) => (request.headers.cookie ?? '').split(';').some(value => same(value.trim(), `${cookieName(id)}=${sign(id)}`));
  const grant = (response, id) => response.setHeader('Set-Cookie', `${cookieName(id)}=${sign(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, origin);
      const method = request.method ?? 'GET';
      if (request.headers.origin && request.headers.origin !== origin) return sendJson(response, 403, { error: { code: 'FORBIDDEN' } });
      if (url.pathname === '/api/internal/work') {
        if (method !== 'GET' || !workerSecret || !same(request.headers.authorization, `Bearer ${workerSecret}`)) return sendJson(response, 403, { error: { code: 'FORBIDDEN' } });
        return sendJson(response, 200, { completed: await (await getApp()).workPublicAudits() });
      }
      if (!url.pathname.startsWith('/api/')) {
        const files = { '/': ['intake.html', 'text/html'], '/intake.html': ['intake.html', 'text/html'], '/intake.css': ['intake.css', 'text/css'], '/intake.mjs': ['intake.mjs', 'text/javascript'], '/api.mjs': ['api.mjs', 'text/javascript'], '/assets/brand-rock.png': ['assets/brand-rock.png', 'image/png'], '/assets/jet.woff2': ['assets/jet.woff2', 'font/woff2'] };
        files['/assets/JetBrainsMono[wght].woff2'] = ['assets/JetBrainsMono[wght].woff2', 'font/woff2'];
        const file = files[decodeURIComponent(url.pathname)];
        if (!file || method !== 'GET') return sendJson(response, 404, { error: { code: 'NOT_FOUND' } });
        response.setHeader('Content-Type', file[1]);
        response.end(await readFile(new URL(`../../app/${file[0]}`, import.meta.url)));
        return;
      }
      if (url.pathname === '/api/public/requests' && method === 'POST') {
        const body = await readJsonBody(request);
        const app = await getApp();
        const created = await app.publicControlPlane.createRequest({ ...body, idempotencyKey: body.idempotencyKey ?? request.headers['idempotency-key'] });
        grant(response, created.id);
        return sendJson(response, 201, created);
      }
      const match = url.pathname.match(/^\/api\/public\/requests\/([a-z0-9-]+)(.*)$/);
      const demo = url.pathname.match(/^\/api\/public\/demo-requests\/([a-z0-9-]+)(.*)$/);
      const places = ['/api/places/autocomplete', '/api/places/details'].includes(url.pathname) && method === 'GET';
      const allowed = match && ((method === 'GET' && /^($|\/reports(?:\/[a-z0-9-]+(?:\/pdf)?)?)$/.test(match[2])) || (method === 'POST' && ['/match-decision', '/preparation'].includes(match[2]))) || demo && ((method === 'GET' && !demo[2]) || (method === 'PUT' && demo[2] === '/intake') || (method === 'POST' && ['/assets', '/start'].includes(demo[2])));
      if (!places && !allowed) return sendJson(response, 404, { error: { code: 'NOT_FOUND' } });
      if (!places && !authorize(request, (match ?? demo)[1])) return sendJson(response, 403, { error: { code: 'FORBIDDEN' } });
      const app = await getApp();
      if (match?.[2] === '/preparation' && method === 'POST') {
        const body = await readJsonBody(request);
        const prepared = await app.publicControlPlane.createPreparation(match[1], { ...body, idempotencyKey: body.idempotencyKey ?? request.headers['idempotency-key'] });
        grant(response, prepared.id);
        return sendJson(response, 201, prepared);
      }
      await createRouter(app)(request, response, url);
      if (match && response.statusCode < 400) waitUntil(app.workPublicAudits().catch(() => {}));
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status >= 400 && error.status < 500 ? error.status : 503, { error: { code: error.status < 500 ? error.code : 'SERVICE_UNAVAILABLE', message: error.status < 500 ? error.message : 'Service temporairement indisponible.' } });
    }
  };
}
