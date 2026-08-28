import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createPublicControlPlane } from '../../src/public/public-control-plane.mjs';

const city = { id: 'city-fr-nantes', label: 'Nantes', countryCode: 'FR' };
const categories = ['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service'];

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-cp-'));
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root) });
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
