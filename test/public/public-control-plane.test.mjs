import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createPublicControlPlane } from '../../src/public/public-control-plane.mjs';

const city = { id: 'city-fr-nantes', label: 'Nantes', countryCode: 'FR' };
const categories = ['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service'];

async function fixture(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-cp-'));
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root), ...options });
  return { root, controlPlane };
}

test('valide la ville structurée et rend la création idempotente', async () => {
  const { controlPlane } = await fixture();
  await assert.rejects(() => controlPlane.createRequest({ name: 'Maison Sillage', city: { label: 'Nantes' }, idempotencyKey: 'req-1' }), error => error.code === 'VALIDATION_ERROR');
  const input = { name: 'Maison Sillage', city, idempotencyKey: 'req-1' };
  const first = await controlPlane.createRequest(input);
  const replay = await controlPlane.createRequest(input);
  assert.equal(replay.id, first.id);
  await assert.rejects(() => controlPlane.createRequest({ ...input, name: 'Autre Maison' }), error => error.code === 'CONFLICT');
  assert.equal(first.state, 'MATCHING');
});

test('livre GMB avant le rapport final et bloque la préparation prématurée', async () => {
  const { controlPlane } = await fixture();
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-2' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'gmb', html: '<h1>GMB</h1>' });
  assert.equal((await controlPlane.listReports(request.id)).reports[0].kind, 'gmb');
  await assert.rejects(() => controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-1' }), error => error.code === 'REPORT_NOT_READY');
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-1' });
  assert.equal(preparation.status, 'INCOMPLETE');
  assert.equal(Object.hasOwn(preparation, 'email'), false);
});

test('publie le rapport final lorsque la continuation asynchrone se termine', async () => {
  const { root } = await fixture(); let finish;
  const completion = new Promise(resolve => { finish = resolve; });
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root), auditStarter: async () => ({ gmb: { html: '<h1>GMB</h1>' }, completion }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-progressive' });
  const gmbReady = await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  assert.equal(gmbReady.state, 'GMB_REPORT_READY');
  assert.deepEqual((await controlPlane.listReports(request.id)).reports.map(report => report.kind), ['gmb']);
  finish({ html: '<h1>Final</h1>', pdf: '%PDF-final' });
  for (let attempt = 0; attempt < 100; attempt += 1) { if ((await controlPlane.getRequest(request.id)).state === 'FINAL_REPORT_READY') break; await new Promise(resolve => setTimeout(resolve, 10)); }
  const finalReady = await controlPlane.getRequest(request.id);
  assert.equal(finalReady.state, 'FINAL_REPORT_READY');
  assert.deepEqual(finalReady.reports.map(report => report.kind), ['gmb', 'final']);
});

test('fait expirer les rapports publics après leur durée de livraison', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-expiry-')); let now = new Date('2026-08-28T00:00:00.000Z');
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root), clock: () => now });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-expiry' });
  const delivered = await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  assert.match(delivered.reports[0].expiresAt, /2026-09-04/);
  now = new Date('2026-09-05T00:00:00.000Z');
  await assert.rejects(() => controlPlane.readReport(request.id, delivered.reports[0].id), error => error.code === 'REPORT_EXPIRED');
});

test('refuse le démarrage jusqu aux cinq catégories et droits connus', async () => {
  const { controlPlane } = await fixture();
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-3' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-3' });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PREPARATION_INCOMPLETE');
  await controlPlane.updateIntake(preparation.id, { criticalComplete: true, locale: 'fr-FR' });
  for (const category of categories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus: 'AUTHORIZED', hash: `hash-${category}`, size: 10 });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PIPELINE_NOT_CONFIGURED');
});

test('ne fabrique pas un identifiant de pipeline et délègue le run réel au starter configuré', async () => {
  const { root } = await fixture(); let calls = 0;
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root), pipelineStarter: async ({ request, preparation }) => { calls += 1; assert.equal(request.input.name, 'Maison Sillage'); assert.equal(preparation.status, 'INCOMPLETE'); return { runId: 'run-real-1', status: 'READY_FOR_OWNER_REVIEW', acceptanceReport: { status: 'PASS' } }; } });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-4' }); await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' }); await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' }); const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-4' }); await controlPlane.updateIntake(preparation.id, { criticalComplete: true, locale: 'fr-FR' }); for (const category of categories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus: 'AUTHORIZED', hash: `hash-${category}`, size: 10 }); const started = await controlPlane.start(preparation.id); assert.equal(calls, 1); assert.equal(started.pipelineRunId, 'run-real-1'); assert.equal(started.status, 'READY_FOR_OWNER_REVIEW'); assert.deepEqual(started.acceptanceReport, { status: 'PASS' });
});

test('relie l’identité publique, l’audit et la demande de démo listable par le cockpit', async () => {
  const { controlPlane } = await fixture({ auditStarter: async () => ({ audit: { id: 'audit-link-1', status: 'PARTIAL', stages: [], provider: { id: 'dataforseo', readiness: 'ready' } } }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, identity: { source: 'google-places', placeId: 'places/123', address: '1 rue du Port' }, idempotencyKey: 'req-link' });
  const matched = await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  assert.deepEqual(matched.input.identity, { source: 'google-places', placeId: 'places/123', address: '1 rue du Port' });
  assert.equal(matched.audit.id, 'audit-link-1');
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-link' });
  const listed = await controlPlane.listDemoRequests();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].request.audit.id, 'audit-link-1');
  assert.equal(listed[0].preparation.id, preparation.id);
});
