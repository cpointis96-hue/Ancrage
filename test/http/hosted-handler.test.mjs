import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHostedHandler } from '../../src/http/hosted-handler.mjs';

test('isole les demandes publiques et bloque les routes privées avant initialisation', async () => {
  let initialized = 0; let worked = 0;
  const app = { publicControlPlane: { createRequest: async () => ({ id: 'request-fixture' }), getRequest: async id => ({ id }), createPreparation: async () => ({ id: 'preparation-fixture' }), getDemoRequest: async id => ({ id }) }, workPublicAudits: async () => { worked++; return []; } };
  const background = [];
  const handler = createHostedHandler({ origin: 'https://fixture.example', sessionSecret: 'x'.repeat(32), workerSecret: 'worker-secret', getApp: async () => { initialized++; return app; }, waitUntil: promise => background.push(promise) });
  const invoke = async (url, method = 'GET', headers = {}, body = '') => {
    const req = Readable.from(body ? [Buffer.from(body)] : []); Object.assign(req, { url, method, headers });
    const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, writeHead(status, values) { this.statusCode = status; this.headersSent = true; for (const [name, value] of Object.entries(values)) this.setHeader(name, value); }, end(value) { this.body = String(value); } };
    await handler(req, res); return res;
  };
  for (const path of ['/api/providers', '/api/public/requests', '/api/public/demo-requests', '/api/public/demo-requests/a/decision', '/app.mjs', '/.env.local', '/src/app.mjs']) assert.equal((await invoke(path)).statusCode, 404);
  assert.equal((await invoke('/api/public/requests/request-fixture')).statusCode, 403);
  assert.equal((await invoke('/api/internal/work')).statusCode, 403);
  assert.equal(initialized, 0);
  assert.equal((await invoke('/api/public/requests', 'POST', { origin: 'https://evil.example' }, '{}')).statusCode, 403);
  const created = await invoke('/api/public/requests', 'POST', {}, '{}');
  assert.equal(created.statusCode, 201);
  const cookie = created.headers['set-cookie'].split(';')[0];
  assert.match(created.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await invoke('/api/public/requests/request-fixture', 'GET', { cookie })).statusCode, 200);
  assert.equal((await invoke('/api/public/requests/another-request', 'GET', { cookie })).statusCode, 403);
  assert.equal((await invoke('/api/public/requests/request-fixture', 'GET', { cookie: `${cookie}tampered` })).statusCode, 403);
  const prep = await invoke('/api/public/requests/request-fixture/preparation', 'POST', { cookie }, '{}');
  const prepCookie = prep.headers['set-cookie'].split(';')[0];
  assert.equal((await invoke('/api/public/demo-requests/preparation-fixture', 'GET', { cookie: prepCookie })).statusCode, 200);
  assert.equal((await invoke('/api/public/demo-requests/preparation-fixture', 'GET', { cookie })).statusCode, 403);
  assert.equal((await invoke('/api/internal/work', 'GET', { authorization: 'Bearer worker-secret' })).statusCode, 200);
  await Promise.all(background);
  assert.ok(worked >= 2);
  assert.match((await invoke('/')).body, /Ancrage/i);
  assert.equal((await invoke('/assets/JetBrainsMono%5Bwght%5D.woff2')).statusCode, 200);
});
