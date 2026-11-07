import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createContractRegistry } from '../../src/config/contract-registry.mjs';
import { createPublicControlPlane } from '../../src/public/public-control-plane.mjs';

const city = { id: 'city-fr-nantes', label: 'Nantes', countryCode: 'FR' };
const categories = ['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service'];

async function fixture(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-cp-'));
  const store = createAtomicStore(root); const contracts = createContractRegistry({ store });
  for (const id of ['preparation-draft', 'site-spec', 'acceptance-report']) {
    const schema = JSON.parse(await readFile(new URL(`../../fixtures/defaults/contracts/${id}.schema.json`, import.meta.url), 'utf8'));
    await contracts.save(id, { name: id, schema }, { expectedHash: null }); await contracts.ensure(id);
  }
  const controlPlane = createPublicControlPlane({ store, contracts, siteSpecComposer: async () => validSiteSpec(), ...options });
  return { root, store, contracts, controlPlane };
}

const validSiteSpec = () => ({ schemaVersion: 'site-spec-v1', title: 'Maison Sillage', locale: 'fr-FR', provenance: { auditPacketRef: 'packet-1', preparationDraftRef: 'draft-1' }, confirmation: { status: 'CONFIRMED', confirmedAt: '2026-08-31T10:00:00.000Z' }, template: { id: 'site-preview', versionId: 'v-1', hash: 'a'.repeat(64) }, pages: [{ path: '/', title: 'Maison Sillage', sections: ['identity'], provenanceRefs: ['packet-1'], confirmation: 'CONFIRMED' }], assets: categories.map(category => ({ id: category, artifactRef: `assets/${category}.png`, rightsStatus: 'AUTHORIZED', provenanceRefs: [`asset-${category}`], confirmation: 'CONFIRMED' })) });
const acceptanceReport = status => ({ schemaVersion: 'acceptance-report-v1', revision: 1, status, ruleVersions: ['qa-rules-v1'], gates: [{ id: 'site', status, ruleVersion: 'qa-rules-v1', checkVersion: 'site-v1', evidenceRefs: ['artifacts/site/index.html'] }], artifactRefs: ['artifacts/site/index.html'], evidenceRefs: ['artifacts/site/index.html'], limitations: [], operatorDecision: 'PENDING' });
async function completePreparation(controlPlane, preparation, { hours = [{ day: 'MONDAY', opens: '12:00', closes: '22:00' }], ownerConfirmed = true, menu = [{ name: 'Plat', price: 14 }], rightsStatus = 'AUTHORIZED', assetCategories = categories } = {}) {
  await controlPlane.updateIntake(preparation.id, { locale: 'fr-FR', address: '1 rue du Port', contact: 'contact@example.test', menu, hours, ownerConfirmed });
  for (const category of assetCategories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus, hash: `hash-${category}`, size: 10 });
}
async function readyPreparation(controlPlane, key) {
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: `req-${key}` });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: `prep-${key}` });
  await completePreparation(controlPlane, preparation);
  return preparation;
}
async function markRecoveryRequired(store, preparation, pipelineStatus, pipelineReservation) {
  const relativePath = `public-control-plane/preparations/${preparation.id}.json`;
  const persisted = await store.readJson(relativePath, null);
  persisted.pipelineStatus = pipelineStatus;
  persisted.pipelineReservation = pipelineReservation;
  await store.writeJson(relativePath, persisted);
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

test('refuse une confirmation sans identité dans le parcours branché', async () => {
  const { controlPlane } = await fixture({ auditStarter: async () => ({}) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-no-identity' });
  await assert.rejects(() => controlPlane.decideMatch(request.id, { decision: 'CONFIRM' }), error => error.code === 'MATCH_IDENTITY_REQUIRED');
});

test('transmet explicitement la branche locale sans GMB au moteur d’audit', async () => {
  let receivedDecision = null;
  const { controlPlane } = await fixture({ auditStarter: async ({ decision }) => { receivedDecision = decision; return { final: { html: '<h1>Final local</h1>', pdf: '%PDF-local' } }; } });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, identity: { source: 'manual', address: '1 rue du Port, Nantes' }, idempotencyKey: 'req-local-preview' });
  const delivered = await controlPlane.decideMatch(request.id, { decision: 'LOCAL_PREVIEW_WITHOUT_GMB' });
  assert.equal(receivedDecision, 'LOCAL_PREVIEW_WITHOUT_GMB');
  assert.equal(delivered.state, 'FINAL_REPORT_READY');
  assert.equal(delivered.checkpoints.find(item => item.key === 'gmb-report').blockedReason, 'LOCAL_PREVIEW_WITHOUT_GMB');
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
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, identity: { source: 'manual', address: '1 rue du Port, Nantes' }, idempotencyKey: 'req-progressive' });
  const gmbReady = await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  assert.equal(gmbReady.state, 'GMB_REPORT_READY');
  assert.deepEqual((await controlPlane.listReports(request.id)).reports.map(report => report.kind), ['gmb']);
  finish({ html: '<h1>Final</h1>', pdf: '%PDF-final' });
  for (let attempt = 0; attempt < 100; attempt += 1) { if ((await controlPlane.getRequest(request.id)).state === 'FINAL_REPORT_READY') break; await new Promise(resolve => setTimeout(resolve, 10)); }
  const finalReady = await controlPlane.getRequest(request.id);
  assert.equal(finalReady.state, 'FINAL_REPORT_READY');
  assert.deepEqual(finalReady.reports.map(report => report.kind), ['gmb', 'final']);
  assert.deepEqual(finalReady.checkpoints.map(item => item.key), ['match', 'gmb-report', 'final-report']);
  assert.equal(finalReady.checkpoints.every(item => item.validatedAt && Array.isArray(item.evidenceRefs) && item.progressLabel), true);
});

test('conserve le statut PARTIAL de l’audit dans la requête publique', async () => {
  const { root } = await fixture(); let finish;
  const completion = new Promise(resolve => { finish = resolve; });
  const controlPlane = createPublicControlPlane({ store: createAtomicStore(root), auditStarter: async () => ({ audit: { id: 'audit-partial-1', status: 'RUNNING' }, gmb: { html: '<h1>GMB</h1>' }, completion }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, identity: { source: 'manual', address: '1 rue du Port, Nantes' }, idempotencyKey: 'req-partial-status' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  finish({ audit: { id: 'audit-partial-1', status: 'PARTIAL' }, html: '<h1>Final partial</h1>', pdf: '%PDF-partial' });
  for (let attempt = 0; attempt < 100; attempt += 1) { if ((await controlPlane.getRequest(request.id)).state === 'FINAL_REPORT_READY') break; await new Promise(resolve => setTimeout(resolve, 10)); }
  const final = await controlPlane.getRequest(request.id);
  assert.equal(final.status, 'PARTIAL');
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

test('bloque sans horaires, confirmation, prix, droits ou catégorie photo', async () => {
  const { controlPlane } = await fixture();
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-3' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-3' });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PREPARATION_INCOMPLETE');
  await controlPlane.updateIntake(preparation.id, { locale: 'fr-FR', address: '1 rue du Port', contact: 'contact@example.test', menu: [{ name: 'Plat', price: 14 }], ownerConfirmed: true });
  for (const category of categories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus: 'AUTHORIZED', hash: `hash-${category}`, size: 10 });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PREPARATION_INCOMPLETE');
  await controlPlane.updateIntake(preparation.id, { hours: [{ day: 'MONDAY', opens: '12:00', closes: '22:00' }] });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PIPELINE_NOT_CONFIGURED');
  await assert.rejects(() => controlPlane.addAsset(preparation.id, { assetId: 'bad-rights', category: 'facade', hash: 'hash', size: 10 }), error => error.code === 'VALIDATION_ERROR');
  const { controlPlane: missingCategory } = await fixture(); const categoryRequest = await missingCategory.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-category' }); await missingCategory.seedSyntheticReport(categoryRequest.id, { kind: 'final', html: '<h1>Final</h1>' }); const categoryPreparation = await missingCategory.createPreparation(categoryRequest.id, { email: 'owner@example.test', idempotencyKey: 'prep-category' }); await completePreparation(missingCategory, categoryPreparation, { assetCategories: categories.slice(0, -1) }); await assert.rejects(() => missingCategory.start(categoryPreparation.id), error => error.code === 'PREPARATION_INCOMPLETE');
  for (const patch of [
    { menu: [{ name: 'Plat' }] },
    { ownerConfirmed: false },
    { hours: [] },
  ]) await assert.rejects(async () => { const { controlPlane: fresh } = await fixture(); const req = await fresh.createRequest({ name: 'Maison Sillage', city, idempotencyKey: `req-${JSON.stringify(patch)}` }); await fresh.seedSyntheticReport(req.id, { kind: 'final', html: '<h1>Final</h1>' }); const prep = await fresh.createPreparation(req.id, { email: 'owner@example.test', idempotencyKey: `prep-${JSON.stringify(patch)}` }); await completePreparation(fresh, prep, { ...patch }); return fresh.start(prep.id); }, error => error.code === 'PREPARATION_INCOMPLETE' || error.code === 'VALIDATION_ERROR');
  await assert.rejects(() => controlPlane.updateIntake(preparation.id, { hours: [{ day: 'TUESDAY', opens: '24:60', closes: '99:99' }] }), error => error.code === 'VALIDATION_ERROR');
});

test('ne fait pas confiance à criticalComplete et reprend la DemoRequest par e-mail', async () => {
  const { controlPlane } = await fixture({ pipelineStarter: async () => ({ runId: 'run-replay-1', siteSpec: validSiteSpec(), acceptanceReport: acceptanceReport('PASS') }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-replay' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-replay-1' });
  const resumed = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-replay-2' });
  assert.equal(resumed.id, preparation.id);
  await controlPlane.updateIntake(preparation.id, { criticalComplete: true, locale: 'fr-FR' });
  for (const category of categories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus: 'AUTHORIZED', hash: `hash-${category}`, size: 10 });
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'PREPARATION_INCOMPLETE');
  await assert.rejects(() => controlPlane.createPreparation(request.id, { email: 'other@example.test', idempotencyKey: 'prep-replay-3' }), error => error.code === 'CONFLICT');
  await controlPlane.updateIntake(preparation.id, { address: '1 rue du Port', contact: 'contact@example.test', menu: [{ name: 'Plat', price: '14 €' }], hours: [{ day: 'MONDAY', opens: '12:00', closes: '22:00' }], ownerConfirmed: true });
  const started = await controlPlane.start(preparation.id);
  assert.equal(started.status, 'READY_FOR_OWNER_REVIEW');
  assert.equal((await controlPlane.start(preparation.id)).pipelineRunId, 'run-replay-1');
  await assert.rejects(() => controlPlane.updateIntake(preparation.id, { story: 'Modification après gel.' }), error => error.code === 'CONFLICT');
});

test('bloque la présentation si l’AcceptanceReport est bloquant', async () => {
  const { controlPlane } = await fixture({ pipelineStarter: async () => ({ runId: 'run-blocked-1', siteSpec: validSiteSpec(), acceptanceReport: acceptanceReport('BLOCK') }), demoPresenter: async () => ({ href: '/demo/should-not-exist' }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-blocked' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-blocked' });
  await completePreparation(controlPlane, preparation);
  const started = await controlPlane.start(preparation.id);
  assert.equal(started.status, 'BLOCKED');
  await assert.rejects(() => controlPlane.validateDemo(preparation.id, 'APPROVED'), error => error.code === 'DEMO_NOT_READY_FOR_REVIEW');
});

test('refuse un SiteSpec ou AcceptanceReport hors contrat', async () => {
  const { controlPlane } = await fixture({ pipelineStarter: async () => ({ runId: 'run-missing-report-1', siteSpec: validSiteSpec() }) });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-missing-report' });
  await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-missing-report' });
  await completePreparation(controlPlane, preparation);
  await assert.rejects(() => controlPlane.start(preparation.id), error => error.code === 'ACCEPTANCE_REPORT_INVALID');
  const blocked = await controlPlane.getDemoRequest(preparation.id);
  assert.equal(blocked.status, 'ACCEPTANCE_REPORT_INVALID');
  assert.equal(blocked.acceptanceReport, null);
  let starterCalls = 0; const { controlPlane: malformedSpec } = await fixture({ siteSpecComposer: async () => ({}), pipelineStarter: async () => { starterCalls += 1; return { runId: 'run-invalid-site-spec', acceptanceReport: acceptanceReport('PASS') }; } }); const specRequest = await malformedSpec.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-invalid-site-spec' }); await malformedSpec.seedSyntheticReport(specRequest.id, { kind: 'final', html: '<h1>Final</h1>' }); const specPreparation = await malformedSpec.createPreparation(specRequest.id, { email: 'owner@example.test', idempotencyKey: 'prep-invalid-site-spec' }); await completePreparation(malformedSpec, specPreparation); await assert.rejects(() => malformedSpec.start(specPreparation.id), error => error.code === 'SITE_SPEC_INVALID'); assert.equal(starterCalls, 0);
});

test('réserve atomiquement le démarrage et refuse les rapports incohérents', async () => {
  let release; let enteredStarter; let calls = 0; const delayed = new Promise(resolve => { release = resolve; }); const entered = new Promise(resolve => { enteredStarter = resolve; });
  const { controlPlane, store, contracts } = await fixture({ pipelineStarter: async () => { calls += 1; enteredStarter(); await delayed; return { runId: 'run-once', acceptanceReport: acceptanceReport('PASS') }; } });
  const secondControlPlane = createPublicControlPlane({ store, contracts, siteSpecComposer: async () => validSiteSpec(), pipelineStarter: async () => { calls += 1; return { runId: 'run-duplicate', acceptanceReport: acceptanceReport('PASS') }; } });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-concurrent' }); await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>' }); const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-concurrent' }); await completePreparation(controlPlane, preparation);
  const first = controlPlane.start(preparation.id); await entered; await assert.rejects(() => secondControlPlane.start(preparation.id), error => error.code === 'PIPELINE_START_IN_PROGRESS'); assert.equal(calls, 1); release(); const started = await first; const replay = await secondControlPlane.start(preparation.id); assert.equal(started.pipelineRunId, 'run-once'); assert.equal(replay.pipelineRunId, 'run-once');
  const { controlPlane: inconsistent } = await fixture({ pipelineStarter: async () => ({ runId: 'run-inconsistent', acceptanceReport: { ...acceptanceReport('PASS'), gates: [{ ...acceptanceReport('PASS').gates[0], status: 'BLOCK' }] } }) }); const inconsistentRequest = await inconsistent.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-inconsistent' }); await inconsistent.seedSyntheticReport(inconsistentRequest.id, { kind: 'final', html: '<h1>Final</h1>' }); const inconsistentPreparation = await inconsistent.createPreparation(inconsistentRequest.id, { email: 'owner@example.test', idempotencyKey: 'prep-inconsistent' }); await completePreparation(inconsistent, inconsistentPreparation); await assert.rejects(() => inconsistent.start(inconsistentPreparation.id), error => error.code === 'ACCEPTANCE_REPORT_INVALID'); await assert.rejects(() => inconsistent.validateDemo(inconsistentPreparation.id, 'APPROVED'), error => error.code === 'DEMO_NOT_READY_FOR_REVIEW');
});

test('attend un heartbeat engagé avant de libérer le bail de démarrage', async () => {
  let pipelineStarted = false; let heartbeatBlocked = false; let unblockRenewal; let renewalBlocked; let releaseStarter; let starterEntered;
  const renewalGate = new Promise(resolve => { unblockRenewal = resolve; }); const renewalObserved = new Promise(resolve => { renewalBlocked = resolve; });
  const starterGate = new Promise(resolve => { releaseStarter = resolve; }); const starterObserved = new Promise(resolve => { starterEntered = resolve; });
  const previousHooks = globalThis.__ANCRAGE_TEST_START_LEASE_HOOKS__;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  globalThis.__ANCRAGE_TEST_START_LEASE_HOOKS__ = { afterRead: async () => { if (pipelineStarted && !heartbeatBlocked) { heartbeatBlocked = true; renewalBlocked(); await renewalGate; } } };
  const first = await fixture({
    startLockTimeoutMs: 10,
    pipelineStarter: async () => { pipelineStarted = true; starterEntered(); await starterGate; throw new Error('interruption A'); },
    pipelineReconciler: async () => null,
  });
  try {
    const second = createPublicControlPlane({ store: first.store, contracts: first.contracts, startLockTimeoutMs: 10, siteSpecComposer: async () => validSiteSpec(), pipelineStarter: async () => ({ runId: 'run-b', acceptanceReport: acceptanceReport('PASS') }) });
    const preparation = await readyPreparation(first.controlPlane, 'heartbeat-release');
    const starting = first.controlPlane.start(preparation.id); await starterObserved; await renewalObserved;
    releaseStarter();
    await assert.rejects(() => second.start(preparation.id), error => error.code === 'PIPELINE_START_IN_PROGRESS');
    unblockRenewal();
    await assert.rejects(() => starting, /interruption A/);
    await first.controlPlane.reconcileStart(preparation.id, { action: 'CONFIRM_NO_RUN' });
    const recovered = await second.start(preparation.id);
    assert.equal(recovered.pipelineRunId, 'run-b');
  } finally {
    if (previousHooks === undefined) delete globalThis.__ANCRAGE_TEST_START_LEASE_HOOKS__;
    else globalThis.__ANCRAGE_TEST_START_LEASE_HOOKS__ = previousHooks;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('réconcilie un verrou expiré seulement après avoir recherché le run réservé', async () => {
  let reconciledReservation = null; let starterCalls = 0;
  const { controlPlane, store } = await fixture({
    startLockTimeoutMs: 1_000,
    pipelineStarter: async () => { starterCalls += 1; return { runId: 'run-after-recovery', acceptanceReport: acceptanceReport('PASS') }; },
    pipelineReconciler: async ({ pipelineReservation }) => { reconciledReservation = pipelineReservation; return null; },
  });
  const preparation = await readyPreparation(controlPlane, 'stale-lock');
  await markRecoveryRequired(store, preparation, 'WEBSITE_FACTORY_STARTING', 'reservation-stale');
  const lockFile = store.resolveSafe(`public-control-plane/preparations/${preparation.id}.start.lock`);
  const exitedPid = 999_999_999;
  assert.throws(() => process.kill(exitedPid, 0), error => error.code === 'ESRCH');
  await writeFile(lockFile, JSON.stringify({ token: 'stale-owner', pid: exitedPid, acquiredAt: '2026-08-30T10:00:00.000Z', expiresAt: '2026-08-30T10:01:00.000Z' }), { mode: 0o600 });
  const recovered = await controlPlane.reconcileStart(preparation.id, { action: 'CONFIRM_NO_RUN' });
  assert.equal(reconciledReservation, 'reservation-stale');
  assert.equal(recovered.status, 'INCOMPLETE');
  await assert.rejects(() => readFile(lockFile, 'utf8'), error => error.code === 'ENOENT');
  assert.equal((await controlPlane.start(preparation.id)).pipelineRunId, 'run-after-recovery');
  assert.equal(starterCalls, 1);
});

test('ne vole pas un verrou actif et débloque un starter échoué après rapprochement', async () => {
  const active = await fixture({ startLockTimeoutMs: 1_000, pipelineReconciler: async () => null });
  const activePreparation = await readyPreparation(active.controlPlane, 'active-lock');
  await markRecoveryRequired(active.store, activePreparation, 'WEBSITE_FACTORY_STARTING', 'reservation-active');
  const activeLockFile = active.store.resolveSafe(`public-control-plane/preparations/${activePreparation.id}.start.lock`);
  assert.doesNotThrow(() => process.kill(process.pid, 0));
  const activeMetadata = { token: 'active-owner', pid: process.pid, acquiredAt: '2026-08-30T10:00:00.000Z', expiresAt: '2026-08-30T10:01:00.000Z' };
  await writeFile(activeLockFile, JSON.stringify(activeMetadata), { mode: 0o600 });
  await assert.rejects(() => active.controlPlane.reconcileStart(activePreparation.id, { action: 'CONFIRM_NO_RUN' }), error => error.code === 'PIPELINE_START_IN_PROGRESS');
  assert.deepEqual(JSON.parse(await readFile(activeLockFile, 'utf8')), activeMetadata);

  let starterCalls = 0;
  const failed = await fixture({
    pipelineStarter: async () => {
      starterCalls += 1;
      if (starterCalls === 1) throw new Error('starter failed');
      return { runId: 'run-after-failure', acceptanceReport: acceptanceReport('PASS') };
    },
    pipelineReconciler: async () => null,
  });
  const failedPreparation = await readyPreparation(failed.controlPlane, 'starter-failure');
  await assert.rejects(() => failed.controlPlane.start(failedPreparation.id), /starter failed/);
  assert.equal((await failed.controlPlane.getDemoRequest(failedPreparation.id)).status, 'PIPELINE_START_FAILED');
  assert.equal((await failed.controlPlane.reconcileStart(failedPreparation.id, { action: 'CONFIRM_NO_RUN' })).status, 'INCOMPLETE');
  assert.equal((await failed.controlPlane.start(failedPreparation.id)).pipelineRunId, 'run-after-failure');
  assert.equal(starterCalls, 2);
});

test('gèle le run déjà créé pendant la réconciliation au lieu de relancer le starter', async () => {
  let starterCalls = 0; let reservation = null;
  const { controlPlane } = await fixture({
    pipelineStarter: async ({ pipelineReservation }) => { starterCalls += 1; reservation = pipelineReservation; throw new Error('process interrupted after run creation'); },
    pipelineReconciler: async ({ pipelineReservation }) => pipelineReservation === reservation ? { runId: 'run-existing-after-crash', siteSpec: validSiteSpec(), acceptanceReport: acceptanceReport('PASS') } : null,
    demoPresenter: async () => ({ href: '/demo/recovered' }),
  });
  const preparation = await readyPreparation(controlPlane, 'existing-run');
  await assert.rejects(() => controlPlane.start(preparation.id), /process interrupted/);
  const reconciled = await controlPlane.reconcileStart(preparation.id, { action: 'CONFIRM_NO_RUN' });
  assert.equal(reconciled.pipelineRunId, 'run-existing-after-crash');
  assert.equal(reconciled.status, 'READY_FOR_OWNER_REVIEW');
  assert.equal((await controlPlane.validateDemo(preparation.id, 'APPROVED')).status, 'READY_FOR_PROSPECT');
  assert.equal((await controlPlane.start(preparation.id)).pipelineRunId, 'run-existing-after-crash');
  assert.equal(starterCalls, 1);
});

test('ne fabrique pas un identifiant de pipeline et délègue le run réel au starter configuré', async () => {
  let calls = 0; const { controlPlane } = await fixture({ pipelineStarter: async ({ request, preparation, preparationDraft }) => { calls += 1; assert.equal(request.input.name, 'Maison Sillage'); assert.equal(preparation.status, 'INCOMPLETE'); assert.equal(preparationDraft.values.every(value => value.confirmation === 'CONFIRMED'), true); return { runId: 'run-real-1', siteSpec: validSiteSpec(), acceptanceReport: acceptanceReport('WARN') }; } });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, idempotencyKey: 'req-4' }); await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' }); await controlPlane.seedSyntheticReport(request.id, { kind: 'final', html: '<h1>Final</h1>', pdf: '%PDF-synthetic' }); const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-4' }); await completePreparation(controlPlane, preparation); const started = await controlPlane.start(preparation.id); assert.equal(calls, 1); assert.equal(started.pipelineRunId, 'run-real-1'); assert.equal(started.status, 'READY_FOR_OWNER_REVIEW'); assert.equal(started.acceptanceReport.status, 'WARN'); assert.equal((await controlPlane.start(preparation.id)).pipelineRunId, 'run-real-1'); assert.equal(calls, 1);
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

test('préremplit le PreparationDraft depuis le snapshot AuditPacket et conserve sa provenance', async () => {
  let receivedDraft = null;
  const auditPacket = {
    packetId: 'audit-packet-1', revision: 2, snapshotRef: 'audit-runs/audit-1/packets/2.json', hash: `sha256:${'a'.repeat(64)}`,
  };
  const packet = {
    preparationDraft: {
      name: { value: 'Maison Sillage', source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' },
      address: { value: '1 rue du Port', source: 'GOOGLE_PLACES', confirmation: 'REQUIRED' },
      contact: { value: 'contact@example.test', source: 'GOOGLE_BUSINESS_PROFILE', confirmation: 'REQUIRED' },
      hours: { value: [{ day: 'MONDAY', opens: '12:00', closes: '22:00' }], source: 'GOOGLE_BUSINESS_PROFILE', confirmation: 'REQUIRED' },
      menu: { items: [], source: 'NONE', confirmation: 'REQUIRED' }, photos: [],
    },
  };
  const { controlPlane } = await fixture({
    auditStarter: async () => ({ audit: { id: 'audit-1', status: 'PARTIAL', auditPacket, packet }, final: { html: '<h1>Final</h1>' } }),
    pipelineStarter: async ({ preparationDraft }) => { receivedDraft = preparationDraft; return { runId: 'run-packet-1', siteSpec: validSiteSpec(), acceptanceReport: acceptanceReport('PASS') }; },
  });
  const request = await controlPlane.createRequest({ name: 'Maison Sillage', city, identity: { source: 'manual', address: '1 rue du Port' }, idempotencyKey: 'req-packet-prefill' });
  await controlPlane.decideMatch(request.id, { decision: 'LOCAL_PREVIEW_WITHOUT_GMB' });
  const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: 'prep-packet-prefill' });
  assert.equal(preparation.intake.address, '1 rue du Port');
  assert.equal(preparation.intake.contact, 'contact@example.test');
  await controlPlane.updateIntake(preparation.id, { locale: 'fr-FR', menu: [{ name: 'Plat', price: 14 }], ownerConfirmed: true });
  for (const category of categories) await controlPlane.addAsset(preparation.id, { assetId: category, category, rightsStatus: 'AUTHORIZED', hash: `hash-${category}`, size: 10 });
  await controlPlane.start(preparation.id);
  assert.equal(receivedDraft.auditPacketRef, 'audit-packet-1');
  assert.deepEqual(receivedDraft.auditPacket, auditPacket);
  assert.deepEqual(receivedDraft.values.find(item => item.field === 'address'), { field: 'address', value: '1 rue du Port', source: 'GOOGLE_PLACES', confirmation: 'CONFIRMED' });
  assert.deepEqual(receivedDraft.values.find(item => item.field === 'contact'), { field: 'contact', value: 'contact@example.test', source: 'GOOGLE_BUSINESS_PROFILE', confirmation: 'CONFIRMED' });
});
