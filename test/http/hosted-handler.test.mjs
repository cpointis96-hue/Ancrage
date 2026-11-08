import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHostedHandler } from '../../src/http/hosted-handler.mjs';
import { hashOperatorPassword } from '../../src/http/operator-auth.mjs';

test('le cockpit authentifié consulte les demandes hébergées et refuse les mutations sans Origin', async () => {
  const state = new Map();
  const app = {
    store: { withLock: async (_key, action) => action(), readJson: async key => state.get(key), writeJson: async (key, value) => state.set(key, value) },
    publicControlPlane: { listRequests: async () => [{ id: 'request-from-client-site' }] },
    workPublicAudits: async () => [],
  };
  const handler = createHostedHandler({ origin: 'https://fixture.example', sessionSecret: 'x'.repeat(32), operatorPasswordHash: await hashOperatorPassword('fixture-password-operator'), getApp: async () => app });
  async function invoke(url, method = 'GET', headers = {}, body = '') {
    const request = Readable.from(body ? [Buffer.from(body)] : []);
    Object.assign(request, { url, method, headers });
    const response = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, writeHead(status, headers) { this.statusCode = status; for (const [name, value] of Object.entries(headers)) this.setHeader(name, value); }, end(value) { this.body = String(value); } };
    await handler(request, response);
    return response;
  }
  assert.match((await invoke('/cockpit')).body, /Mot de passe du cockpit/);
  assert.equal((await invoke('/api/public/requests')).statusCode, 401);
  assert.equal((await invoke('/api/operator/login', 'POST', {}, '{}')).statusCode, 403);
  const login = await invoke('/api/operator/login', 'POST', { origin: 'https://fixture.example' }, JSON.stringify({ password: 'fixture-password-operator' }));
  assert.equal(login.statusCode, 200);
  const cookie = login.headers['set-cookie'].split(';')[0];
  assert.match((await invoke('/cockpit', 'GET', { cookie })).body, /operator-logout/);
  const requests = await invoke('/api/public/requests', 'GET', { cookie });
  assert.equal(requests.statusCode, 200);
  assert.match(requests.body, /request-from-client-site/);
  assert.equal((await invoke('/api/providers/test/enabled', 'PUT', { cookie }, '{}')).statusCode, 403);
  assert.equal((await invoke('/api/public/requests', 'GET', { cookie: cookie + 'x' })).statusCode, 401);
  const logout = await invoke('/api/operator/logout', 'POST', { cookie, origin: 'https://fixture.example' });
  assert.match(logout.headers['set-cookie'], /Max-Age=0/);
});

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
  assert.match((await invoke('/demo.html')).body, /public-reports/);
  assert.equal((await invoke('/demo.mjs')).statusCode, 200);
  assert.equal((await invoke('/demo.css')).statusCode, 200);
  assert.equal((await invoke('/assets/JetBrainsMono%5Bwght%5D.woff2')).statusCode, 200);
});
