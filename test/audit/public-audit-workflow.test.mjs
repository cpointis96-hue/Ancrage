import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { createDefaultProviderAdapters } from '../../src/providers/http-adapters.mjs';
import { createPublicAuditWorkflow as createWorkflow } from '../../src/audit/public-audit-workflow.mjs';
import { createSeoResearchPlanner } from '../../src/audit/seo-research-planner.mjs';

const auditPacketSchema = JSON.parse(await readFile(new URL('../../fixtures/defaults/contracts/audit-packet.schema.json', import.meta.url), 'utf8'));
function createPublicAuditWorkflow(options = {}) {
  const workflow = createWorkflow({ contracts: { async getActiveVersion(id) { assert.equal(id, 'audit-packet'); return { versionId: 'audit-packet-contract-test-v1', schema: auditPacketSchema }; } }, ...options });
  return { ...workflow, create: (input, settings) => workflow.create(input, { enrichment: 'dataforseo', ...settings }) };
}

function providerState() {
  return { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: true, enabled: true, health: 'healthy' }]; } };
}
function adapters(calls) {
  const result = { tasks: [{ result: [{ items: [{ title: 'Maison Sillage', url: 'https://example.com/', keyword: 'restaurant pattaya', keyword_info: { search_volume: 100 } }] }] }] };
  const dataforseo = {};
  for (const name of ['serpMapsLiveAdvanced', 'serpOrganicLiveAdvanced', 'businessListings', 'onPageInstantPages', 'keywordIdeasLive', 'keywordOverview', 'serpCompetitors', 'serpLocalFinder']) dataforseo[name] = async input => { calls.push({ name, input }); return result; };
  return { dataforseo };
}

test('un refus de facturation libère son coût sans empoisonner le run suivant', async () => {
  const store = createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-billing-isolation-')));
  const transport = adapters([]); let attempts = 0;
  transport.dataforseo.serpMapsLiveAdvanced = async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error('rejected'), { code: 'HTTP_402' });
    return { cost: 0, tasks: [] };
  };
  const workflow = createPublicAuditWorkflow({ store, providers: providerState(), adapters: transport, secretStore: createMemorySecretStore({ 'provider:dataforseo': 'test' }) });
  const input = { name: 'Test', city: { id: 'fr-teyran', label: 'Teyran', country: 'FR' } };
  const rejected = await workflow.create(input);
  assert.equal(rejected.stages[0].cause, 'DATAFORSEO_BILLING_REJECTED');
  assert.equal(rejected.budget.reserved, 0);
  const next = await workflow.create(input);
  assert.equal(attempts, 2);
  assert.notEqual(next.stages[0].cause, 'DATAFORSEO_BILLING_REJECTED');
  assert.equal(next.stages.some(stage => stage.cause === 'COST_LEDGER_INVALID'), false);
});

test('un timeout réel conserve la réservation et suspend les dépenses suivantes', async () => {
  const transport = adapters([]); let calls = 0;
  transport.dataforseo.executionType = 'http';
  transport.dataforseo.serpMapsLiveAdvanced = async () => { calls += 1; throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); };
  const workflow = createPublicAuditWorkflow({ store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-unknown-cost-'))), providers: providerState(), adapters: transport, secretStore: createMemorySecretStore({ 'provider:dataforseo': 'test' }) });
  const result = await workflow.create({ name: 'Test', city: { id: 'fr-teyran', label: 'Teyran', country: 'FR' } });
  assert.equal(calls, 1);
  assert.equal(result.stages[0].cause, 'PROVIDER_COST_UNKNOWN_AFTER_FAILURE');
  assert.equal(result.budget.reserved, 0.01);
  assert.equal(result.budget.spent, 0);
});

test('mesure le domaine avant le planner et conserve les requêtes observées sans nom de village', async () => {
  const transport = adapters([]); let rankedTask; let plannerInput;
  transport.dataforseo.labsLocationsAndLanguages = async () => ({ tasks: [{ result: [{ country_iso_code: 'FR', location_code: 2250, available_languages: [{ language_code: 'fr', available_sources: ['google'] }] }] }] });
  transport.dataforseo.rankedKeywords = async ({ tasks }) => {
    rankedTask = tasks[0];
    return { cost: 0.0156, tasks: [{ result: [{ items: [{ keyword_data: { keyword: 'restaurant', keyword_info: { search_volume: 1000 }, serp_info: { last_updated_time: '2026-10-01T00:00:00Z' } }, ranked_serp_element: { serp_item: { url: 'https://example.com/menu', rank_group: 12, rank_absolute: 15 } } }] }] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-ranked-context-'))), providers: providerState(), adapters: transport,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': 'test' }), lookup: async () => ['93.184.216.34'],
    fetchImpl: async () => new Response('<html lang="fr"><title>Menu à Teyran</title><h1>Carte de saison</h1><p>Déjeuner à Teyran</p></html>', { headers: { 'content-type': 'text/html' } }),
    seoResearchPlanner: async input => { plannerInput = input; return { status: 'PARTIAL', cause: 'FIXTURE', execution: 'not-run', plan: null }; },
  });
  const result = await workflow.create({ name: 'Test', city: { id: 'fr-teyran', label: 'Teyran', country: 'FR' }, domain: 'https://example.com', identity: { primaryType: 'restaurant', source: 'google-places' } });
  assert.equal(rankedTask.target, 'example.com'); assert.equal(rankedTask.limit, 30);
  assert.equal(rankedTask.location_code, 2250); assert.equal(rankedTask.language_code, 'fr');
  assert.match(plannerInput.sitePages[0].text, /Déjeuner à Teyran/);
  assert.equal(plannerInput.rankedKeywords[0].keyword, 'restaurant');
  assert.equal(result.auditProjection.report.rankedKeywords[0].position, 12);
  const html = (await workflow.readReport(result.id)).value;
  assert.match(html, /Présence dans les résultats de recherche/);
  assert.match(html, /Titre|Description absente/);
  assert.doesNotMatch(html, /Détails d’exécution et coûts/);
  assert.match(html, /https:\/\/example.com\/menu/);
});

test('cible la fiche exacte sélectionnée sans payer une recherche Listings supplémentaire', async () => {
  const transport = adapters([]); let exactTask; let searches = 0;
  transport.dataforseo.businessListings = async () => { searches += 1; throw new Error('ne doit pas être appelé'); };
  transport.dataforseo.myBusinessInfo = async ({ tasks }) => {
    exactTask = tasks[0];
    return { cost: 0.0054, tasks: [{ result: [{ items: [
      { title: 'Restaurant Test', place_id: 'selected-place', address: 'Teyran', category: 'Restaurant', phone: 'fixture-phone', rating: { value: 4.2, votes_count: 30 } },
      { title: 'Restaurant Test', place_id: 'wrong-place', address: 'Autre ville' },
    ] }] }] };
  };
  const workflow = createPublicAuditWorkflow({ store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-exact-gmb-'))), providers: providerState(), adapters: transport, secretStore: createMemorySecretStore({ 'provider:dataforseo': 'test' }) });
  const run = await workflow.create({ name: 'Restaurant Test', city: { id: 'fr-teyran', label: 'Teyran', country: 'FR' }, identity: { source: 'google-places', placeId: 'selected-place', coordinates: { latitude: 43.68, longitude: 3.93 } } });
  assert.equal(exactTask.keyword, 'place_id:selected-place');
  assert.equal(exactTask.location_coordinate, '43.68,3.93,200');
  assert.equal(searches, 0);
  assert.equal(run.modules.gmb.candidates.length, 1);
  assert.equal(run.modules.gmb.candidates[0].phone, 'fixture-phone');
  assert.match((await workflow.readReport(run.id, 'gmb')).value, /fixture-phone/);
});

test('compose un audit public DataForSEO borné, sourcé, partiel et idempotent sans appel réel', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-')); const store = createAtomicStore(root); const calls = [];
  const secretStore = createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) });
  const siteHtml = '<html lang="fr"><head><title>Site</title><meta name="description" content="ok"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{}</script></head><body><h1>Site</h1></body></html>';
  const workflow = createPublicAuditWorkflow({ store, providers: providerState(), adapters: adapters(calls), secretStore, idFactory: prefix => `${prefix}-fixed`, clock: () => new Date('2026-08-27T00:00:00.000Z'), fetchImpl: async url => ({ url, status: 200, headers: { get: name => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : name.toLowerCase() === 'content-length' ? String(Buffer.byteLength(siteHtml)) : null }, body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(siteHtml)); controller.close(); } }) }), lookup: async () => ['93.184.216.34'] });
  const input = { name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, domain: 'https://example.com', identity: { source: 'google-places', placeId: 'place-1', address: '1 Beach Road, Pattaya', coordinates: { latitude: 12.9, longitude: 100.9 }, primaryType: 'restaurant' }, idempotencyKey: 'public-1' };
  const first = await workflow.create(input);
  const gmbReport = (await workflow.readReport(first.id, 'gmb')).value;
  const finalReport = (await workflow.readReport(first.id, 'final')).value;
  assert.match(gmbReport, /Présence locale/);
  assert.match(finalReport, /Actions prioritaires/);
  assert.match(finalReport, /Contenus à travailler/);
  assert.match(finalReport, /restaurant pattaya/);
  assert.doesNotMatch(finalReport, /Détails d’exécution et coûts|SEO pays/);
  assert.equal(first.status, 'SUCCEEDED'); assert.equal(first.stages.length, 6); assert.equal(first.evidence.length, 8); assert.deepEqual(first.reports.map(item => item.kind).sort(), ['final', 'gmb']); assert.equal((await workflow.readReport(first.id, 'gmb')).value.includes('Présence locale'), true); assert.equal((await workflow.readReport(first.id, 'final')).value.includes('Audit de visibilité'), true); assert.equal(first.modules.seo.status, 'SUCCEEDED'); assert.equal(first.modules.seo.external.onPage, 'SUCCEEDED'); assert.equal(first.modules.keywords.ideas[0].keyword, 'restaurant pattaya'); assert.equal(first.input.profile.maxPages, 50); assert.equal(first.input.profile.maxBytes, 25 * 1024 * 1024); assert.equal(first.input.profile.timeoutMs, 180000); assert.equal(first.budget.hardLimit, 0.5); assert.equal(Math.round(first.budget.spent * 100) / 100, 0.11); assert.equal(calls.length, 8); assert.deepEqual(calls.find(item => item.name === 'businessListings').input.tasks[0], { title: 'Maison Sillage', location_coordinate: '12.9,100.9,5', limit: 10 }); assert.deepEqual(calls.find(item => item.name === 'serpCompetitors').input.tasks[0].keywords, ['restaurant pattaya']); assert.equal(first.stages.every(item => Number.isInteger(item.durationMs) && item.durationMs >= 0), true); assert.equal(Number.isInteger(first.durationMs), true);
  assert.equal(first.evidence.every(item => item.provider === 'dataforseo' && item.rawPayloadHash.startsWith('sha256:')), true);
  assert.equal(JSON.stringify(first).includes('password'), false);
  const replay = await workflow.create(input); assert.equal(replay.id, first.id); assert.equal(calls.length, 8);
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
  assert.equal(result.stages[0].cause, 'DATAFORSEO_UNHEALTHY');
  assert.equal(result.provider.readiness, 'unhealthy');
  assert.deepEqual(result.modules.establishment.candidates, []);
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(result).includes('example.com'), false);
});

test('continue les branches confirmées malgré une recherche établissement DataForSEO pauvre', async () => {
  for (const [label, input] of [
    ['site', { domain: 'https://example.com' }],
    ['identité', { identity: { source: 'google-places', placeId: 'place-1', primaryType: 'restaurant', coordinates: { latitude: 43.6, longitude: 3.9 } } }],
  ]) {
    let crawls = 0;
    const workflow = createPublicAuditWorkflow({
      store: createAtomicStore(await mkdtemp(path.join(tmpdir(), `ancrage-public-audit-poor-${label}-`))),
      providers: { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: true, enabled: false, health: 'unhealthy' }]; } },
      adapters: adapters([]),
      secretStore: createMemorySecretStore(),
      fetchImpl: async url => { crawls += 1; return { url, status: 200, headers: { get: () => 'text/html' }, text: async () => '<title>Site</title><h1>Site</h1>' }; },
      lookup: async () => ['93.184.216.34'],
    });
    const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, ...input });
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.stages.find(item => item.id === 'establishment-search').status, 'PARTIAL');
    assert.equal(result.stages.some(item => item.cause === 'ESTABLISHMENT_GATE_FAILED'), false);
    assert.equal(result.stages.some(item => item.id === 'competitor-keywords'), true);
    if (input.domain) {
      assert.equal(crawls > 0, true);
      assert.equal(result.modules.seo.execution, 'local-crawl');
    } else {
      assert.equal(result.modules.establishment.selected.placeId, 'place-1');
      assert.equal(result.modules.seo.external.crawl, 'BLOCKED');
    }
  }
});

test('agrège l’exécution du planner sans transformer not-run en appel', async () => {
  const input = { name: 'Maison Sillage', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, identity: { source: 'google-places', placeId: 'place-1', primaryType: 'restaurant' } };
  const unavailableProvider = { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: true, enabled: false, health: 'unhealthy' }]; } };
  const httpAdapters = createDefaultProviderAdapters({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '{"category":"restaurant","queries":[{"query":"restaurant Teyran","intent":"discovery","basis":"observed-category"}]}' } }] }) }) });
  const httpPlanner = createSeoResearchPlanner({
    providers: { async executionContext() { return { secret: 'test-secret' }; } },
    adapters: { openai: httpAdapters.openai },
    prompts: { async get() { return { activeVersionId: 'prompt-v1' }; }, async resolveRevision() { return '---\nid: local-seo-research-planner\nname: Test\nownerStep: research-plan\noutputContract: seo-research-plan\n---\nRetourne JSON.'; } },
    contracts: { async getActiveVersion() { return { versionId: 'contract-v1', schema: { type: 'object', required: ['category', 'queries'], additionalProperties: false, properties: { category: { type: 'string' }, queries: { type: 'array', items: { type: 'object', required: ['query', 'intent', 'basis'], additionalProperties: false, properties: { query: { type: 'string' }, intent: { type: 'string' }, basis: { type: 'string' } } } } } } }; } },
    workflows: { async resolveActive() { return { versionId: 'workflow-v1', definition: { steps: [{ id: 'research-plan', provider: 'openai', model: 'gpt-test', promptRef: 'local-seo-research-planner', contractRef: 'seo-research-plan', budget: 0.05 }] } }; } },
  });
  const withPlanner = createPublicAuditWorkflow({ store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-planner-http-'))), providers: unavailableProvider, adapters: adapters([]), secretStore: createMemorySecretStore(), seoResearchPlanner: httpPlanner });
  const plannerResult = await withPlanner.create(input);
  assert.equal(plannerResult.modules.keywords.planner.execution, 'real-http-call');
  assert.equal(plannerResult.stages.find(item => item.id === 'competitor-keywords').execution, 'real-http-call');

  const withoutPlanner = createPublicAuditWorkflow({ store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-planner-none-'))), providers: unavailableProvider, adapters: adapters([]), secretStore: createMemorySecretStore() });
  const notRunResult = await withoutPlanner.create(input);
  assert.equal(notRunResult.modules.keywords.planner.execution, 'not-run');
  assert.equal(notRunResult.stages.find(item => item.id === 'competitor-keywords').execution, 'not-run');
});

test('signale le provider non configuré avant la résolution des contrats', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.serpLocations = async () => { calls.push({ name: 'serpLocations' }); return { tasks: [] }; };
  configuredAdapters.dataforseo.serpLanguages = async () => { calls.push({ name: 'serpLanguages' }); return { tasks: [] }; };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-not-configured-'))),
    providers: { async list() { return [{ id: 'dataforseo', kind: 'seo', configured: false, enabled: false, health: 'unknown' }]; } },
    adapters: configuredAdapters,
    secretStore: createMemorySecretStore(),
  });
  const result = await workflow.create({ name: 'Le Midi-Teyranais', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, budget: { hardLimit: 0.5 } });
  assert.equal(result.stages[0].cause, 'DATAFORSEO_NOT_CONFIGURED');
  assert.equal(result.stages[0].execution, 'not-run');
  assert.equal(calls.length, 0);
  assert.equal(result.budget.spent, 0);
});

test('sépare les états provider et distingue un adapter de test sans réseau', async () => {
  const cases = [
    ['absent', null, 'DATAFORSEO_ABSENT'],
    ['not-configured', { id: 'dataforseo', kind: 'seo', configured: false, enabled: false, health: 'unknown' }, 'DATAFORSEO_NOT_CONFIGURED'],
    ['unhealthy', { id: 'dataforseo', kind: 'seo', configured: true, enabled: false, health: 'unhealthy' }, 'DATAFORSEO_UNHEALTHY'],
    ['disabled', { id: 'dataforseo', kind: 'seo', configured: true, enabled: false, health: 'healthy' }, 'DATAFORSEO_DISABLED'],
  ];
  for (const [state, provider, cause] of cases) {
    const calls = [];
    const workflow = createPublicAuditWorkflow({
      store: createAtomicStore(await mkdtemp(path.join(tmpdir(), `ancrage-public-audit-${state}-`))),
      providers: { async list() { return provider ? [provider] : []; } },
      adapters: adapters(calls),
      secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
    });
    const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' } });
    assert.equal(result.provider.readiness, state);
    assert.equal(result.stages[0].cause, cause);
    assert.equal(result.stages[0].execution, 'not-run');
    assert.equal(calls.length, 0);
  }

  const calls = [];
  const workflow = createPublicAuditWorkflow({ store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-adapter-'))), providers: providerState(), adapters: adapters(calls), secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }) });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, domain: 'https://example.com', identity: { source: 'google-places', placeId: 'place-1', address: '1 Beach Road, Pattaya', primaryType: 'restaurant' } });
  assert.equal(result.provider.adapter, 'adapter');
  assert.equal(result.stages[0].execution, 'adapter-call-no-network');
  assert.equal(result.modules.keywords.execution.ideas, 'adapter-call-no-network');
});

test('bloque le crawl local et OnPage sans domaine confirmé sans inventer de site', async () => {
  const calls = [];
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-no-domain-'))),
    providers: providerState(),
    adapters: adapters(calls),
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
    fetchImpl: async () => { throw new Error('Le crawl local ne doit pas démarrer.'); },
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' } });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.modules.site.confirmation.status, 'NOT_CONFIRMED');
  assert.equal(result.modules.seo.execution, 'not-run');
  assert.equal(result.modules.seo.external.crawl, 'BLOCKED');
  assert.equal(result.modules.seo.external.onPage, 'BLOCKED');
  assert.equal(result.stages.find(item => item.id === 'seo-audit').status, 'BLOCKED');
  assert.equal(calls.some(item => item.name === 'onPageInstantPages'), false);
  assert.doesNotMatch((await workflow.readReport(result.id, 'final')).value, /https:\/\/example\.com/);
  assert.equal(result.modules.gmb.confirmation.cause, 'GOOGLE_PLACES_COORDINATES_REQUIRED');
  assert.equal(calls.some(item => item.name === 'businessListings'), false);
});

test('résout les contrats SERP et Labs avant les appels payants', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.serpLocations = async () => ({ tasks: [{ result: [{ location_code: 2250, location_name: 'France', country_iso_code: 'FR' }] }] });
  configuredAdapters.dataforseo.serpLanguages = async () => ({ tasks: [{ result: [{ language_code: 'fr' }] }] });
  configuredAdapters.dataforseo.businessListingsLocations = async () => ({ tasks: [{ result: [{ location_name: 'France', country_iso_code: 'FR' }] }] });
  configuredAdapters.dataforseo.labsLocationsAndLanguages = async () => ({ tasks: [{ result: [{ location_code: 2250, country_iso_code: 'FR', available_languages: [{ language_code: 'fr', available_sources: ['google'] }] }] }] });
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-resolved-'))), providers: providerState(), adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
  });
  const result = await workflow.create({ name: 'Le Midi Teyranais', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, identity: { source: 'google-places', placeId: 'place-1', address: '1 rue de la mairie', coordinates: { latitude: 43.68, longitude: 3.93 }, primaryType: 'restaurant' } });
  assert.deepEqual(calls.find(item => item.name === 'serpMapsLiveAdvanced').input.tasks[0], { keyword: 'Le Midi Teyranais Teyran', location_code: 2250, language_code: 'fr' });
  assert.deepEqual(calls.find(item => item.name === 'keywordIdeasLive').input.tasks[0], { keywords: ['restaurant Teyran', 'Le Midi Teyranais Teyran'], location_code: 2250, language_code: 'fr', limit: 50, include_serp_info: false, include_clickstream_data: false });
  assert.equal(result.status, 'PARTIAL');
});

test('conserve la sélection Google Places même si la source GMB ne la corrobore pas', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.businessListings = async input => {
    calls.push({ name: 'businessListings', input });
    return { tasks: [{ result: [{ items: [{ title: 'Un autre établissement' }] }] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-selection-'))), providers: providerState(), adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
    fetchImpl: async url => ({ url, status: 200, headers: { get: () => 'text/html' }, text: async () => '<title>Site</title><h1>Site</h1>' }), lookup: async () => ['93.184.216.34'],
  });
  const result = await workflow.create({ name: 'La Guinguette du Massillan', city: { id: 'city-1', label: 'Le Crès', country: 'FR' }, domain: 'https://www.schproutz.com', domainSource: 'google-places', identity: { source: 'google-places', placeId: 'place-1', address: 'D67, 34920 Le Crès, France' } });
  assert.equal(result.modules.establishment.selected.placeId, 'place-1');
  assert.equal(result.modules.site.confirmation.source, 'google-places');
  assert.equal(result.modules.gmb.confirmation.status, 'NOT_CONFIRMED');
  assert.match((await workflow.readReport(result.id, 'final')).value, /D67, 34920 Le Crès/);
  assert.match((await workflow.readReport(result.id, 'gmb')).value, /ne permettent pas de confirmer la fiche/);
});

test('l’aperçu local sans GMB conserve l’adresse et n’appelle aucune source GMB', async () => {
  const calls = [];
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-local-'))), providers: providerState(), adapters: adapters(calls),
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, address: '1 rue du Port, Pattaya' }, { mode: 'LOCAL_PREVIEW_WITHOUT_GMB' });
  assert.equal(result.input.address, '1 rue du Port, Pattaya');
  assert.equal(result.modules.gmb.confirmation.cause, 'LOCAL_PREVIEW_WITHOUT_GMB');
  assert.equal(result.reports.some(report => report.kind === 'gmb'), false);
  assert.equal(calls.some(item => item.name === 'serpMapsLiveAdvanced' || item.name === 'businessListings'), false);
});

test('signale une erreur de tâche provider au lieu de la compter comme un succès', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.keywordIdeasLive = async input => {
    calls.push({ name: 'keywordIdeasLive', input });
    return { tasks: [{ result: [{ items: [{ keyword: 'restaurant Le Crès', keyword_info: { search_volume: 20 } }] }] }] };
  };
  configuredAdapters.dataforseo.keywordOverview = async input => {
    calls.push({ name: 'keywordOverview', input });
    return { cost: 0, tasks_error: 1, tasks: [{ status_code: 40501, status_message: "Invalid Field: 'location_name'.", result: [] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-task-failure-'))), providers: providerState(), adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Le Crès', country: 'FR' }, identity: { source: 'google-places', placeId: 'place-1', address: '1 rue du Port, Le Crès', primaryType: 'restaurant' } });
  assert.equal(result.modules.keywords.overview.status, 'PARTIAL');
  assert.equal(result.modules.keywords.overview.cause, 'PROVIDER_TASK_FAILED');
  assert.equal('data' in result.modules.keywords.overview, false);
  assert.equal(calls.find(item => item.name === 'keywordOverview').input.tasks[0].location_name, 'France');
});

test('écarte les idées hors périmètre et n’hydrate pas une shortlist vide', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.keywordIdeasLive = async input => {
    calls.push({ name: 'keywordIdeasLive', input });
    return { tasks: [{ result: [{ items: [
      { keyword: 'menu cantine à Lyon', keyword_info: { search_volume: 800 } },
      { keyword: 'menu cantine monde', keyword_info: { search_volume: 500 } },
    ] }] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-relevance-'))),
    providers: providerState(),
    adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'user', password: 'password' }) }),
  });
  const result = await workflow.create({ name: 'Le Midi Teyranais', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, identity: { source: 'google-places', placeId: 'place-1', address: '1 rue de la mairie, Teyran', primaryType: 'restaurant', coordinates: { latitude: 43.68, longitude: 3.93 } } });
  const report = (await workflow.readReport(result.id, 'final')).value;
  assert.deepEqual(result.modules.keywords.ideas, []);
  assert.equal(result.modules.keywords.overview.execution, 'not-run');
  assert.equal(result.modules.keywords.competitors.length, 0);
  assert.equal(calls.some(item => item.name === 'keywordOverview' || item.name === 'serpCompetitors'), false);
  assert.equal(report.includes('menu cantine'), false);
  assert.equal(result.status, 'PARTIAL');
});

test('ne dépasse jamais le plafond public de 0,50 USD demandé par le workflow', async () => {
  const calls = [];
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-cap-'))),
    providers: providerState(),
    adapters: adapters(calls),
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'fixture-user', password: 'fixture-pass' }) }),
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Pattaya', country: 'TH' }, budget: { hardLimit: 2 } });
  assert.equal(result.budget.hardLimit, 0.5);
});

test('ne présente pas l’établissement audité comme concurrent local', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.serpLocalFinder = async input => {
    calls.push({ name: 'serpLocalFinder', input });
    return { tasks: [{ result: [{ items: [
      { title: 'Le Midi-Teyranais', domain: 'restaurant-midi-teyranais.fr' },
      { title: 'Restaurant voisin', domain: 'voisin.example' },
    ] }] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-self-'))),
    providers: providerState(),
    adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'fixture-user', password: 'fixture-pass' }) }),
  });
  const result = await workflow.create({ name: 'Le Midi-Teyranais', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, domain: 'https://restaurant-midi-teyranais.fr', identity: { source: 'google-places', placeId: 'place-1', address: '1 rue de la mairie, Teyran', coordinates: { latitude: 43.68, longitude: 3.93 }, primaryType: 'restaurant' } });
  assert.equal(result.modules.keywords.localCompetitors.some(item => item.title === 'Le Midi-Teyranais'), false);
  assert.equal(result.modules.keywords.localCompetitors.some(item => item.title === 'Restaurant voisin'), true);
});

test('persiste des candidats concurrents canoniques et fusionne une collision locale et nationale', async () => {
  const calls = [];
  const configuredAdapters = adapters(calls);
  configuredAdapters.dataforseo.keywordIdeasLive = async input => {
    calls.push({ name: 'keywordIdeasLive', input });
    return { tasks: [{ result: [{ items: [{ keyword: 'restaurant Teyran', keyword_info: { search_volume: 20 } }] }] }] };
  };
  configuredAdapters.dataforseo.serpCompetitors = async input => {
    calls.push({ name: 'serpCompetitors', input });
    return { tasks: [{ result: [{ items: [{ domain: 'www.voisin.example', keywords: ['restaurant Teyran'], is_business: true }] }] }] };
  };
  configuredAdapters.dataforseo.serpLocalFinder = async input => {
    calls.push({ name: 'serpLocalFinder', input });
    return { tasks: [{ result: [{ items: [
      { title: 'Restaurant voisin Teyran', url: 'https://voisin.example/menu' },
      { title: 'Maison Sillage restaurant Teyran', url: 'https://www.example.com/' },
    ] }] }] };
  };
  const workflow = createPublicAuditWorkflow({
    store: createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-public-audit-competitor-merge-'))), providers: providerState(), adapters: configuredAdapters,
    secretStore: createMemorySecretStore({ 'provider:dataforseo': JSON.stringify({ login: 'fixture-user', password: 'fixture-pass' }) }),
  });
  const result = await workflow.create({ name: 'Maison Sillage', city: { id: 'city-1', label: 'Teyran', country: 'FR' }, domain: 'https://example.com', identity: { source: 'google-places', placeId: 'place-1', coordinates: { latitude: 43.68, longitude: 3.93 }, primaryType: 'restaurant' } });
  const voisin = result.modules.keywords.competitorCandidates.find(item => item.domain === 'voisin.example');
  assert.deepEqual(voisin.scopes.sort(), ['local-serp', 'national-seo']);
  assert.equal(voisin.mergedCandidateCount, 2);
  assert.equal(result.modules.keywords.competitors.length, 1);
  assert.equal(result.modules.keywords.competitorRejected.filter(item => item.reason === 'AUDITED_DOMAIN_EXCLUDED').length, 1);
});
