import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { createPublicAuditWorkflow } from '../../src/audit/public-audit-workflow.mjs';

function providerState() {
  return { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: true, enabled: true, health: 'healthy' }]; } };
}
function adapters(calls) {
  const result = { tasks: [{ result: [{ items: [{ title: 'Candidate', url: 'https://example.com/', keyword: 'restaurant pattaya', keyword_info: { search_volume: 100 } }] }] }] };
  const dataforseo = {};
  for (const name of ['serpMapsLiveAdvanced', 'serpOrganicLiveAdvanced', 'businessListings', 'keywordIdeasLive', 'keywordOverview', 'serpCompetitors']) dataforseo[name] = async input => { calls.push({ name, input }); return result; };
  return { dataforseo };
}

test('compose un audit public DataForSEO borné, sourcé, partiel et idempotent sans appel réel', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-')); const store = createAtomicStore(root); const calls = [];
  const secretStore = createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) });
  const workflow = createPublicAuditWorkflow({ store, providers: providerState(), adapters: adapters(calls), secretStore, idFactory: prefix => `${prefix}-fixed`, clock: () => new Date('2026-08-27T00:00:00.000Z'), fetchImpl: async url => ({ url, status: 200, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => '<html lang="fr"><head><title>Site</title><meta name="description" content="ok"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{}</script></head><body><h1>Site</h1></body></html>' }), lookup: async () => ['93.184.216.34'] });
  const input = { name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, domain: 'https://example.com', idempotencyKey: 'public-1' };
  const first = await workflow.create(input);
  assert.equal(first.status, 'SUCCEEDED'); assert.equal(first.stages.length, 6); assert.equal(first.evidence.length, 6); assert.deepEqual(first.reports.map(item => item.kind).sort(), ['final', 'gmb']); assert.equal((await workflow.readReport(first.id, 'gmb')).value.includes('RAPPORT GMB'), true); assert.equal((await workflow.readReport(first.id, 'final')).value.includes('RAPPORT FINAL SEO'), true); assert.equal(first.modules.seo.status, 'SUCCEEDED'); assert.equal(first.modules.seo.external.onPage, 'NOT_RUN'); assert.equal(first.modules.keywords.ideas[0].keyword, 'restaurant pattaya'); assert.equal(first.input.profile.maxPages, 50); assert.equal(first.input.profile.maxBytes, 25 * 1024 * 1024); assert.equal(first.input.profile.timeoutMs, 180000); assert.equal(first.budget.hardLimit, 2); assert.equal(Math.round(first.budget.spent * 100) / 100, 1.25); assert.equal(calls.length, 6); assert.equal(first.stages.every(item => Number.isInteger(item.durationMs) && item.durationMs >= 0), true); assert.equal(Number.isInteger(first.durationMs), true);
  assert.equal(first.evidence.every(item => item.provider === 'dataforseo' && item.rawPayloadHash.startsWith('sha256:')), true);
  assert.equal(JSON.stringify(first).includes('password'), false);
  const replay = await workflow.create(input); assert.equal(replay.id, first.id); assert.equal(calls.length, 6);
});

test('bloque avant tout appel provider sans enveloppe de coût connue', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-blocked-')); const calls = [];
  const secretStore = createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) });
  const workflow = createPublicAuditWorkflow({ store: createAtomicStore(root), providers: providerState(), adapters: adapters(calls), secretStore });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, budget: { hardLimit: 0 } });
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.stages.every(item => item.status === 'BLOCKED'), true); assert.equal(calls.length, 0);
});

test('bloque la découverte essentielle sans provider DataForSEO prêt, sans fallback inventé', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-not-ready-')); const calls = [];
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(root),
    providers: { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: true, enabled: false, health: 'unhealthy' }]; } },
    adapters: adapters(calls),
    secretStore: createMemorySecretStore(),
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' } });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.stages[0].cause, 'DATAFORSEO_NOT_READY');
  assert.deepEqual(result.modules.establishment.candidates, []);
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(result).includes('example.com'), false);
});
