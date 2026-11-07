import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.mjs';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { createPublicControlPlane } from '../../src/public/public-control-plane.mjs';

const fixtureUrl = new URL('../fixtures/audit-qualification/local-no-network.json', import.meta.url);
const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlGHgAAAABJRU5ErkJggg==', 'base64');
const photoDataUrl = `data:image/png;base64,${photo.toString('base64')}`;
const photoCategories = ['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service'];

async function readFixture() { return JSON.parse(await readFile(fixtureUrl, 'utf8')); }

function streamedHtml(url) {
  const html = '<!doctype html><html lang="fr"><head><title>Maison Sillage</title><meta name="description" content="Restaurant de fixture"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://maison-sillage.fixture.invalid/"><script type="application/ld+json">{}</script></head><body><h1>Maison Sillage</h1></body></html>';
  return {
    url,
    status: 200,
    headers: { get: name => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : name.toLowerCase() === 'content-length' ? String(Buffer.byteLength(html)) : null },
    body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(html)); controller.close(); } }),
  };
}

function createDataForSeoFixture({ fixture, calls, secret }) {
  const response = { cost: fixture.budget.settledCostPerCall, tasks: [{ result: [{ items: [{ title: fixture.name, url: fixture.domain, keyword: `restaurant ${fixture.city.label.toLowerCase()}`, keyword_info: { search_volume: 100 } }] }] }] };
  const record = name => async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret, `${name} reçoit uniquement le secret de fixture en mémoire`);
    calls.push(name);
    return response;
  };
  const adapter = async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret, 'Le health check de fixture reste local');
    calls.push('health-check');
    return { status: 'fixture-ok' };
  };
  adapter.serpLocations = async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret);
    calls.push('serpLocations');
    return { tasks: [{ result: [{ location_code: fixture.locationLanguage.locationCode, location_name: 'France', country_iso_code: fixture.city.country }] }] };
  };
  adapter.serpLanguages = async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret);
    calls.push('serpLanguages');
    return { tasks: [{ result: [{ language_code: fixture.locationLanguage.languageCode }] }] };
  };
  adapter.businessListingsLocations = async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret);
    calls.push('businessListingsLocations');
    return { tasks: [{ result: [{ location_name: 'France', country_iso_code: fixture.city.country }] }] };
  };
  adapter.labsLocationsAndLanguages = async ({ secret: receivedSecret }) => {
    assert.equal(receivedSecret, secret);
    calls.push('labsLocationsAndLanguages');
    return { tasks: [{ result: [{ location_code: fixture.locationLanguage.locationCode, country_iso_code: fixture.city.country, available_languages: [{ language_code: fixture.locationLanguage.languageCode, available_sources: ['google'] }] }] }] };
  };
  for (const name of ['serpMapsLiveAdvanced', 'serpOrganicLiveAdvanced', 'businessListings', 'onPageInstantPages', 'keywordIdeasLive', 'keywordOverview', 'serpCompetitors', 'serpLocalFinder']) adapter[name] = record(name);
  return adapter;
}

async function assertSecretAbsent(root, secret) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const value = await readFile(path.join(entry.parentPath, entry.name));
    assert.equal(value.includes(Buffer.from(secret)), false, `Le secret de fixture ne doit pas être persisté : ${path.join(entry.parentPath, entry.name)}`);
  }
}

test('qualifie localement audit → préparation → SiteSpec → AcceptanceReport sans preuve DataForSEO live', async () => {
  const fixture = await readFixture();
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-delivery-qualification-'));
  const secretStore = createMemorySecretStore();
  const fixtureSecret = `test-only-${randomUUID()}`;
  const calls = [];
  const dataforseo = createDataForSeoFixture({ fixture, calls, secret: fixtureSecret });
  const appOptions = { dataDir: root, secretStore, adapters: { dataforseo }, auditFetchImpl: async url => streamedHtml(url), auditLookup: async () => [{ address: '93.184.216.34', family: 4 }] };

  try {
    const app = createApp(appOptions);
    await app.ready;
    const provider = state => app.providers.list().then(items => items.find(item => item.id === fixture.provider.id)).then(value => {
      assert.deepEqual({ configured: value.configured, healthy: value.health, enabled: value.enabled }, state);
      return value;
    });

    await provider(fixture.provider.expectedStates.beforeConfiguration);
    await app.providers.saveSecret(fixture.provider.id, fixtureSecret);
    await provider(fixture.provider.expectedStates.afterConfiguration);
    await app.providers.testConnection(fixture.provider.id);
    await provider(fixture.provider.expectedStates.afterHealthCheck);
    await app.providers.setEnabled(fixture.provider.id, true);
    await provider(fixture.provider.expectedStates.afterEnablement);

    const auditInput = {
      name: fixture.name,
      city: { id: fixture.city.id, label: fixture.city.label, country: fixture.city.country },
      domain: fixture.domain,
      domainSource: 'google-places',
      address: '1 rue du Port, Nantes',
      identity: { source: 'google-places', placeId: 'places/fixture-maison-sillage', address: '1 rue du Port, Nantes', coordinates: { latitude: 47.2184, longitude: -1.5536 }, primaryType: 'restaurant' },
      idempotencyKey: fixture.idempotencyKey,
    };
    const audit = await app.publicAudits.create(auditInput, { enrichment: 'dataforseo' });
    const { packet, snapshot } = await app.publicAudits.readPacket(audit.id);

    assert.equal(audit.provider.readiness, 'ready');
    assert.equal(audit.provider.adapter, 'adapter');
    assert.equal(audit.modules.keywords.location.location_code, fixture.locationLanguage.locationCode);
    assert.equal(audit.modules.keywords.location.language_code, fixture.locationLanguage.languageCode);
    assert.equal(audit.stages.filter(stage => stage.execution === fixture.provider.execution).length > 0, true);
    assert.equal(audit.budget.spent > 0 && audit.budget.spent <= fixture.budget.hardLimit, true);
    assert.equal(packet.packetId, snapshot.packetId);
    assert.equal(packet.status, audit.status);
    assert.equal(packet.cost.costEventsRef, `runs/${audit.id}/cost-events.jsonl`);

    const costEvents = await readFile(path.join(root, `runs/${audit.id}/cost-events.jsonl`), 'utf8');
    const costTypes = costEvents.trim().split('\n').map(line => JSON.parse(line).type);
    assert.equal(costTypes.includes('COST_AUTHORIZED'), true);
    assert.equal(costTypes.includes('COST_SETTLED'), true);
    assert.equal(costEvents.includes(fixtureSecret), false);

    const endpointCallsBeforeReplay = calls.length;
    const rehydrated = createApp(appOptions);
    await rehydrated.ready;
    const replay = await rehydrated.publicAudits.create(auditInput, { enrichment: 'dataforseo' });
    assert.equal(replay.id, audit.id);
    assert.equal(calls.length, endpointCallsBeforeReplay, 'La reprise idempotente ne rappelle aucun endpoint de fixture');

    const template = await rehydrated.templates.getActiveVersion('site-preview');
    const auditSummary = { id: audit.id, status: audit.status, stages: audit.stages, provider: audit.provider, auditPacket: snapshot, auditProjection: audit.auditProjection, packet };
    const controlPlane = createPublicControlPlane({
      store: createAtomicStore(root),
      contracts: rehydrated.contracts,
      auditStarter: async () => ({ audit: auditSummary, gmb: { html: '<h1>Rapport GMB de fixture</h1>' }, final: { html: '<h1>Rapport final de fixture</h1>', pdf: '%PDF-fixture' } }),
      siteSpecComposer: async ({ request, preparation, preparationDraft }) => ({
        schemaVersion: 'site-spec-v1',
        title: request.input.name,
        locale: preparation.locale,
        provenance: { auditPacketRef: preparationDraft.auditPacketRef, preparationDraftRef: preparationDraft.id },
        confirmation: { status: 'CONFIRMED', confirmedAt: '2026-09-01T00:00:00.000Z' },
        template: { id: template.id, versionId: template.versionId, hash: template.hash.replace(/^sha256:/, '') },
        pages: [{ path: '/', title: request.input.name, sections: ['identity', 'menu', 'contact'], provenanceRefs: [preparationDraft.auditPacketRef, preparationDraft.id], confirmation: 'CONFIRMED' }],
        assets: photoCategories.map(category => ({ id: `fixture-${category}`, artifactRef: `qualification/${category}.png`, rightsStatus: 'AUTHORIZED', provenanceRefs: [`fixture-${category}`], confirmation: 'CONFIRMED' })),
      }),
      pipelineStarter: async ({ siteSpec }) => ({
        runId: 'qualification-local-run-1',
        siteSpec,
        acceptanceReport: {
          schemaVersion: 'acceptance-report-v1', revision: 1, status: 'PASS', ruleVersions: ['qualification-rules-v1'],
          gates: [{ id: 'contractual-fixture', status: 'PASS', ruleVersion: 'qualification-rules-v1', checkVersion: 'qualification-check-v1', evidenceRefs: ['qualification/site.html'] }],
          artifactRefs: ['qualification/site.html'], evidenceRefs: ['qualification/site.html'], limitations: [], operatorDecision: 'PENDING',
        },
      }),
    });
    const request = await controlPlane.createRequest({
      name: fixture.name,
      city: { id: fixture.city.id, label: fixture.city.label, countryCode: fixture.city.country },
      domain: fixture.domain,
      identity: { source: 'google-places', placeId: 'places/fixture-maison-sillage', address: '1 rue du Port, Nantes', coordinates: { latitude: 47.2184, longitude: -1.5536 }, primaryType: 'restaurant' },
      idempotencyKey: `${fixture.idempotencyKey}-request`,
    });
    const finalRequest = await controlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
    assert.equal(finalRequest.status, audit.status);
    const preparation = await controlPlane.createPreparation(request.id, { email: 'owner@example.test', idempotencyKey: `${fixture.idempotencyKey}-preparation` });
    await controlPlane.updateIntake(preparation.id, {
      locale: fixture.city.locale,
      address: '1 rue du Port, Nantes',
      contact: 'owner@example.test',
      hours: [{ day: 'MONDAY', opens: '12:00', closes: '22:00' }],
      menu: [{ name: 'Plat de fixture', price: 14 }],
      ownerConfirmed: true,
    });
    for (const category of photoCategories) await controlPlane.addAsset(preparation.id, { assetId: `fixture-${category}`, category, rightsStatus: 'AUTHORIZED', hash: 'fixture-hash', size: photo.length, dataUrl: photoDataUrl });
    const started = await controlPlane.start(preparation.id);
    const replayedStart = await controlPlane.start(preparation.id);

    assert.equal(started.pipelineRunId, replayedStart.pipelineRunId);
    assert.equal(started.preparationDraft.auditPacketRef, packet.packetId);
    assert.equal(started.siteSpec.provenance.auditPacketRef, packet.packetId);
    assert.equal(started.acceptanceReport.status, 'PASS');
    assert.equal(started.acceptanceReport.gates.every(gate => gate.status === 'PASS' && gate.evidenceRefs.length > 0), true);

    const qualification = {
      status: fixture.liveEvidence.deliveryStatus,
      reason: fixture.liveEvidence.reason,
      providerExecution: fixture.provider.execution,
      viewport390: fixture.viewport390,
    };
    assert.deepEqual(qualification, {
      status: 'PARTIAL',
      reason: 'DATAFORSEO_LIVE_EVIDENCE_NOT_AUTHORIZED',
      providerExecution: 'adapter-call-no-network',
      viewport390: 'NON_OBSERVABLE_WITHOUT_LOCAL_BROWSER_TOOLING',
    });
    assert.equal(JSON.stringify({ audit, packet, started, qualification }).includes(fixtureSecret), false);
    await assertSecretAbsent(root, fixtureSecret);

    await rehydrated.providers.deleteSecret(fixture.provider.id);
    const deleted = (await rehydrated.providers.list()).find(item => item.id === fixture.provider.id);
    assert.deepEqual({ configured: deleted.configured, healthy: deleted.health, enabled: deleted.enabled }, fixture.provider.expectedStates.beforeConfiguration);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
