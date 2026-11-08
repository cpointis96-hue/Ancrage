import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { createDefaultProviderAdapters } from '../../src/providers/http-adapters.mjs';
import { observationInput, observationOutput, observationResponse, fixtureHtml } from '../fixtures/observation-audit.mjs';

async function setup(t, { research = async () => observationResponse(), configured = true, fetchImpl = fixtureHtml } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-observations-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  let calls = 0;
  const openai = Object.assign(async () => ({}), { research: async input => { calls += 1; return research(input); } });
  const googlePlaces = Object.assign(async () => ({}), { auditDetails: async ({ placeId }) => ({ id: placeId, displayName: { text: 'Maison Sauge' }, formattedAddress: '12 rue Fixture, Nantes', googleMapsUri: 'https://maps.google.com/?cid=fixture', regularOpeningHours: { weekdayDescriptions: ['lundi: 12:00–14:00'] }, rating: 4.5, userRatingCount: 123, reviews: [{ rating: 4, originalText: { text: 'Accueil attentif.' }, publishTime: '2026-10-01T12:00:00Z' }] }) });
  const dataforseo = new Proxy(() => {}, { get() { throw new Error('Aucune capacité DataForSEO autorisée'); } });
  const app = createApp({ dataDir: root, secretStore: createMemorySecretStore(), adapters: { openai, dataforseo, googlePlaces, 'google-places': googlePlaces }, auditFetchImpl: fetchImpl, auditLookup: async () => ['93.184.216.34'] });
  await app.ready;
  if (configured) {
    await app.providers.saveSecret('google-places', 'fixture-only'); await app.providers.testConnection('google-places'); await app.providers.setEnabled('google-places', true);
    await app.providers.saveSecret('openai', 'fixture-only'); await app.providers.testConnection('openai'); await app.providers.setEnabled('openai', true);
  }
  return { app, calls: () => calls };
}

test('audit complet sans DataForSEO, preuves, trois priorités et site conservé', async t => {
  const { app, calls } = await setup(t);
  const input = { ...observationInput, idempotencyKey: 'observation-replay' };
  const result = await app.publicAudits.create(input);
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.modules.seo.pages[0].contactLinks[0], 'tel:+33000000000');
  assert.equal(result.modules.observation.priorities.length, 3);
  assert.equal(result.modules.observation.conclusion.decision, 'KEEP_SITE');
  assert.ok(Math.abs(result.budget.spent - 0.038) < 1e-9);
  assert.equal(result.budget.reserved, 0);
  assert.equal(result.modules.gmb.candidates[0].reviewCount, 123);
  const localReport = (await app.publicAudits.readReport(result.id, 'gmb')).value;
  assert.match(localReport, /Accueil attentif/);
  assert.match(localReport, /lundi: 12:00/);
  assert.match(localReport, /ne représente pas tous les avis/);
  const html = (await app.publicAudits.readReport(result.id)).value;
  assert.match(html, /ne justifient pas une refonte/);
  assert.match(html, /https:\/\/voisin.example\/menu/);
  assert.doesNotMatch(html, /Audit partiel|Volume pays|SEO pays|DATAFORSEO_/);
  const pdf = (await app.publicAudits.readReport(result.id, 'final', 'pdf')).value;
  assert.match(pdf, /Faciliter le contact/); assert.match(pdf, /Pour vos clients/); assert.match(pdf, /voisin.example/);
  assert.equal((await app.publicAudits.create(input)).id, result.id);
  assert.equal((await app.publicAudits.resume(result.id)).id, result.id);
  assert.equal(calls(), 1);
  assert.equal((await app.publicAudits.readPacket(result.id)).packet.aiContributions[0].purpose, 'PUBLIC_OBSERVATION_ANALYSIS');
  assert.deepEqual((await app.publicAudits.readPacket(result.id)).packet.aiContributions[0].costEventRefs, [`runs/${result.id}/cost-events.jsonl`]);
});

test('garde le rapport local progressif et ne demande l’e-mail qu’après le final', async t => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const { app } = await setup(t, { research: async () => { await pending; const response = observationResponse(); response.output.priorities[0].topic = 'LOCAL'; return response; } });
  const request = await app.publicControlPlane.createRequest({ ...observationInput, city: { id: 'fr-nantes', label: 'Nantes', countryCode: 'FR' }, idempotencyKey: 'public-observation-request' });
  const local = await app.publicControlPlane.decideMatch(request.id, { decision: 'CONFIRM' });
  assert.equal(local.state, 'GMB_REPORT_READY');
  assert.equal(local.demoRequestId, undefined);
  await assert.rejects(() => app.publicControlPlane.createPreparation(request.id, { email: 'fixture@example.com', idempotencyKey: 'too-early' }));
  release();
  let final;
  for (let i = 0; i < 200; i += 1) {
    final = await app.publicControlPlane.getRequest(request.id);
    if (final.state === 'FINAL_REPORT_READY') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(final.state, 'FINAL_REPORT_READY'); assert.equal(final.status, 'SUCCEEDED');
  assert.equal(final.nextAction.kind, 'PREPARE_SITE');
  assert.equal(final.reports.filter(report => report.kind === 'gmb').length, 1);
  const enrichedLocal = await app.publicControlPlane.readReport(request.id, final.reports.find(report => report.kind === 'gmb').id);
  assert.match(enrichedLocal.value, /Faciliter le contact/);
  const enrichedPdf = await app.publicControlPlane.readReport(request.id, final.reports.find(report => report.kind === 'gmb').id, 'pdf');
  assert.match(enrichedPdf.value, /Faciliter le contact/);
  assert.ok((await app.publicControlPlane.createPreparation(request.id, { email: 'fixture@example.com', idempotencyKey: 'after-final' })).id);
});

test('IA indisponible conserve le crawl et un rapport partiel explicite', async t => {
  const { app, calls } = await setup(t, { configured: false });
  const result = await app.publicAudits.create(observationInput);
  assert.equal(result.status, 'PARTIAL'); assert.equal(calls(), 0);
  assert.equal(result.modules.seo.status, 'SUCCEEDED');
  assert.equal(result.modules.observation.cause, 'AI_WEB_RESEARCH_NOT_READY');
  assert.equal(result.budget.spent, 0);
});

test('un crawl bloqué reste partiel même avec une IA répondant avec des sources', async t => {
  const { app } = await setup(t, { fetchImpl: async () => new Response('Blocked', { status: 403 }) });
  const result = await app.publicAudits.create(observationInput);
  assert.equal(result.status, 'PARTIAL'); assert.equal(result.modules.seo.status, 'PARTIAL');
  assert.equal(result.modules.observation.priorities.some(item => item.observationIds.includes('local-page-1')), false);
});

test('refuse une priorité et un concurrent dont les URLs ne figurent pas dans les sources', async t => {
  const output = structuredClone(observationOutput); output.observations[0].url = 'https://invented.example'; output.competitors[0].url = 'javascript:alert(1)';
  const { app } = await setup(t, { research: async () => observationResponse(output) });
  const result = await app.publicAudits.create(observationInput);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.modules.observation.priorities.length, 2);
  assert.equal(result.modules.observation.competitors.length, 0);
  assert.doesNotMatch((await app.publicAudits.readReport(result.id)).value, /invented.example|javascript:alert/);
});

test('privilégie les pages utiles et distingue échantillon borné et échec de capture', async t => {
  const { app } = await setup(t, { fetchImpl: async () => new Response('<html lang="fr"><title>Fixture</title><a href="/histoire">Histoire</a><a href="/equipe">Équipe</a><a href="/contact">Contact</a></html>', { headers: { 'content-type': 'text/html' } }) });
  const result = await app.publicAudits.create({ ...observationInput, profile: { maxPages: 2 } });
  assert.equal(result.modules.seo.pages[1].url, 'https://sillage.example/contact');
  assert.equal(result.modules.seo.crawlSummary.limitReached, true);
  assert.equal(result.status, 'SUCCEEDED');
  assert.match(result.modules.observation.limitations.join(' '), /limité à 2 pages/);
});

test('ne présente ni le site audité comme concurrent ni une spécialité ou ville inventée', async t => {
  const response = observationResponse();
  response.output.competitors.push({ name: 'Le site audité', url: 'https://www.sillage.example/menu', comparison: 'Ne doit pas être comparé à lui-même.' });
  response.sources.push({ url: 'https://www.sillage.example/menu' });
  response.output.queries.push({ query: 'plombier Nantes', intent: 'Invention', targetPage: 'Accueil', reason: 'Sans preuve' }, { query: 'restaurant Lyon', intent: 'Autre ville', targetPage: 'Accueil', reason: 'Sans preuve' });
  const { app } = await setup(t, { research: async () => response });
  const result = await app.publicAudits.create(observationInput);
  assert.equal(result.modules.observation.competitors.length, 1);
  assert.deepEqual(result.modules.observation.queries.map(item => item.query), ['restaurant Nantes']);
});

test('accepte les citations vérifiées du crawl même si seules les autres sources sont recherchées sur le web', async t => {
  const response = observationResponse();
  response.output.observations.push({ id: 'web-source-2', url: 'https://sillage.example/', fact: 'Le titre annonce le restaurant de fixture.', quote: 'Restaurant de fixture' });
  response.output.priorities[0].observationIds = ['web-source-2'];
  const { app } = await setup(t, { research: async () => response });
  const run = await app.publicAudits.create(observationInput);
  assert.equal(run.status, 'SUCCEEDED');
  assert.equal(run.modules.observation.observations.find(item => item.originalId === 'web-source-2').sourceKind, 'captured-page');
  assert.ok(run.evidence.some(item => item.sourceType === 'ai-crawl-interpretation'));
});

test('refuse une citation inventée sur une page capturée et conserve plusieurs établissements d’une même source', async t => {
  const response = observationResponse();
  response.output.observations.push({ id: 'web-source-2', url: 'https://sillage.example/', fact: 'Spécialité inventée.', quote: 'Des sushis préparés chaque matin' });
  response.output.priorities[0].observationIds = ['web-source-2'];
  response.output.competitors.push({ name: 'Un autre établissement', url: 'https://voisin.example/menu', comparison: 'Source commune à deux établissements distincts.' });
  const { app } = await setup(t, { research: async () => response });
  const run = await app.publicAudits.create(observationInput);
  assert.equal(run.status, 'PARTIAL');
  assert.equal(run.modules.observation.priorities.length, 2);
  assert.equal(run.modules.observation.competitors.length, 2);
  assert.equal(run.modules.observation.competitors[0].domain, null);
});

test('sans site fourni, conserve une décision étayée sans inventer de contrôle technique', async t => {
  const response = observationResponse();
  response.output.priorities[0].observationIds = ['local-identity'];
  response.output.conclusion = { decision: 'GOOGLE_PROFILE_FIRST', reason: 'Vérifier les informations publiques avant de décider du site.', observationIds: ['local-identity'] };
  const { app } = await setup(t, { research: async () => response, fetchImpl: async () => { throw new Error('Aucun crawl sans domaine'); } });
  const result = await app.publicAudits.create({ ...observationInput, domain: undefined });
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.modules.seo.execution, 'not-run');
  const html = (await app.publicAudits.readReport(result.id)).value;
  assert.match(html, /Actions prioritaires/);
  assert.match(html, /Aucun site officiel n’a été confirmé/);
  assert.doesNotMatch(html, /Aucune anomalie remontée/);
});

test('timeout et coût inconnu conservent la réservation, budget insuffisant empêche l’appel', async t => {
  for (const research of [async () => { throw new Error('timeout'); }, async () => ({ ...observationResponse(), usage: null })]) {
    const { app } = await setup(t, { research });
    const result = await app.publicAudits.create(observationInput);
    assert.equal(result.status, 'PARTIAL'); assert.equal(result.budget.reserved, 0.18); assert.equal(result.budget.spent, 0.025);
  }
  const { app, calls } = await setup(t);
  const result = await app.publicAudits.create({ ...observationInput, budget: { hardLimit: 0.01 } });
  assert.equal(calls(), 0); assert.equal(result.modules.observation.cause, 'BUDGET_EXCEEDED');
});

test('adaptateur Responses borne la recherche et conserve citations et usage même si JSON invalide', async () => {
  let sent;
  const adapters = createDefaultProviderAdapters({ fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ status: 'completed', usage: { input_tokens: 1, output_tokens: 1 }, output: [{ type: 'web_search_call', action: { type: 'search', sources: [{ url: 'https://source.example' }] } }, { type: 'message', content: [{ type: 'output_text', text: '{broken', annotations: [{ type: 'url_citation', url: 'https://cited.example' }] }] }] }));
  } });
  const result = await adapters.openai.research({ secret: 'fixture-only', model: 'gpt-5.4-mini', system: 'JSON', input: {} });
  assert.equal(sent.max_tool_calls, 2); assert.equal(sent.store, false); assert.equal(result.searchCalls, 1);
  assert.equal(sent.text, undefined);
  assert.equal(result.sources.length, 2); assert.equal(result.output, null); assert.equal(result.usage.output_tokens, 1);
});

test('collecte Google dédiée inclut horaires et avis sans modifier la sélection légère', async () => {
  const calls = [];
  const adapters = createDefaultProviderAdapters({ fetchImpl: async (url, options) => { calls.push({ url, mask: options.headers['x-goog-fieldmask'] }); return new Response(JSON.stringify({ id: 'fixture' })); } });
  await adapters.googlePlaces.details({ secret: 'fixture-only', placeId: 'fixture' });
  await adapters.googlePlaces.auditDetails({ secret: 'fixture-only', placeId: 'fixture' });
  assert.doesNotMatch(calls[0].mask, /reviews/);
  assert.match(calls[1].mask, /reviews/);
  assert.match(calls[1].mask, /regularOpeningHours/);
  assert.throws(() => adapters.googlePlaces.auditDetails({ secret: 'fixture-only', placeId: '../private' }), /Invalid place ID/);
});
