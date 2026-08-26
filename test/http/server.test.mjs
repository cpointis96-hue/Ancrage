import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../../src/app.mjs';
import { createLocalServer } from '../../src/http/server.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url); const req = http.request(target, { ...options, headers: options.headers }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ headers: response.headers, status: response.statusCode, text: () => Promise.resolve(Buffer.concat(chunks).toString()) })); }); req.on('error', reject); if (options.body) req.write(options.body); req.end();
  });
}

test('API loopback refuse origine étrangère et ne divulgue pas les secrets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-http-')); const api = createLocalServer({ app: createApp({ dataDir: root, secretStore: createMemorySecretStore() }) }); const address = await api.listen(); const base = `http://127.0.0.1:${address.port}`;
  try {
    const bad = await request(`${base}/api/providers`, { headers: { origin: 'https://evil.example' } }); assert.equal(bad.status, 403);
    const save = await request(`${base}/api/providers/openai/secret`, { method: 'PUT', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ secret: 'sk-test-secret' }) }); assert.equal(save.status, 200); assert.equal((await save.text()).includes('sk-test-secret'), false);
    const invalid = await request(`${base}/api/providers/openai/secret`, { method: 'PUT', headers: { origin: base, 'content-type': 'application/json' }, body: '{' }); assert.equal(invalid.status, 400);
    const missing = await request(`${base}/api/not-found`, { headers: { origin: base } }); assert.equal(missing.status, 404);
  } finally { await api.close(); }
});

test('sert les modules du cockpit avec un type JavaScript', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-http-'));
  const api = createLocalServer({ app: createApp({ dataDir: root, secretStore: createMemorySecretStore() }), staticRoot: path.resolve('app') });
  const address = await api.listen();
  try {
    const response = await request(`http://127.0.0.1:${address.port}/app.mjs`);
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^text\/javascript/);
  } finally { await api.close(); }
});

test('expose la simulation client via l’API et permet la reprise', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-http-')); const api = createLocalServer({ app: createApp({ dataDir: root, secretStore: createMemorySecretStore() }) }); const address = await api.listen(); const base = `http://127.0.0.1:${address.port}`;
  try {
    const start = await request(`${base}/api/simulations/client-site`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ profile: { name: 'Maison Sillage' }, fault: 'site-build' }) }); assert.equal(start.status, 201); const failed = JSON.parse(await start.text()); assert.equal(failed.status, 'FAILED');
    const resumed = await request(`${base}/api/simulations/client-site/${failed.id}/resume`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' }); assert.equal(resumed.status, 200); assert.equal(JSON.parse(await resumed.text()).status, 'SUCCEEDED');
    const second = await request(`${base}/api/simulations/client-site`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ profile: { name: 'Maison Générique' }, fault: 'site-build' }) }); const secondFailed = JSON.parse(await second.text());
    const genericResume = await request(`${base}/api/runs/${secondFailed.id}/resume`, { method: 'POST', headers: { origin: base } }); assert.equal(genericResume.status, 200); assert.equal(JSON.parse(await genericResume.text()).status, 'SUCCEEDED');
  } finally { await api.close(); }
});

test('reçoit un intake, crée le dossier, exécute son run et sert ses artefacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-http-'));
  let opened = null;
  const app = createApp({ dataDir: root, secretStore: createMemorySecretStore(), opener: async target => { opened = target; } });
  const api = createLocalServer({ app });
  const address = await api.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const intake = await request(`${base}/api/intake/dossiers`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Le Rivage', city: 'Nantes', story: 'Texte client', menu: [{ name: 'Bar grillé', price: 22 }] }) });
    assert.equal(intake.status, 201);
    const dossier = JSON.parse(await intake.text());
    const listed = await request(`${base}/api/dossiers`, { headers: { origin: base } });
    assert.equal(JSON.parse(await listed.text())[0].id, dossier.id);

    const runResponse = await request(`${base}/api/dossiers/${dossier.id}/runs`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' });
    assert.equal(runResponse.status, 201);
    const run = JSON.parse(await runResponse.text());
    assert.equal(run.status, 'SUCCEEDED');
    const events = await request(`${base}/api/runs/${run.id}/events`, { headers: { origin: base } });
    assert.deepEqual(JSON.parse(await events.text()).map(event => event.type).filter(type => ['RUN_STARTED', 'RUN_FINISHED'].includes(type)), ['RUN_STARTED', 'RUN_FINISHED']);

    const artifacts = await request(`${base}/api/runs/${run.id}/artifacts`, { headers: { origin: base } });
    assert.deepEqual(JSON.parse(await artifacts.text()).map(item => item.kind).sort(), ['report', 'site']);
    const site = await request(`${base}/api/runs/${run.id}/artifacts/site`, { headers: { origin: base } });
    assert.equal(site.status, 200);
    assert.match(await site.text(), /Le Rivage/);

    const decision = await request(`${base}/api/runs/${run.id}/decision`, { method: 'PUT', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'APPROVED' }) });
    assert.equal(JSON.parse(await decision.text()).operatorDecision.decision, 'APPROVED');
    const open = await request(`${base}/api/dossiers/${dossier.id}/open`, { method: 'POST', headers: { origin: base } });
    assert.equal(open.status, 200);
    assert.equal(opened, path.join(root, 'dossiers', dossier.id));
  } finally { await api.close(); }
});
