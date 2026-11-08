import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { REPORT_SECTIONS } from '../../src/audit/report-document.mjs';

const cases = [
  { slug: 'artisan', name: 'SIMULATION · Atelier des Pins', city: 'Tours', category: 'Plombier', text: 'Interventions de plomberie à Tours.', title: '', issue: 'Titre de page absent', action: 'Rédigez un titre qui indique l’activité et la ville.', impact: 'La page doit être identifiable dans les résultats de recherche.' },
  { slug: 'salon', name: 'SIMULATION · Salon des Rives', city: 'Angers', category: 'Salon de coiffure', text: 'Salon de coiffure à Angers.', title: 'Salon des Rives à Angers', noindex: true, issue: 'Vérifier la visibilité de la page', action: 'Confirmez que cette page doit être publique, puis retirez sa consigne de non-indexation.', impact: 'Une consigne demande aux moteurs de ne pas afficher cette page.' },
  { slug: 'atelier', name: 'SIMULATION · Céramique du Parc', city: 'Lille', category: 'Atelier de céramique', text: 'Atelier de céramique à Lille.', title: 'Céramique du Parc à Lille' },
];

test('le même pipeline et le même template produisent des diagnostics distincts selon les faits du site', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-profile-matrix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const captured = [];
  const openai = Object.assign(async () => ({}), { research: async request => {
    captured.push(request);
    const scenario = cases.find(item => item.name === request.input.subject.name);
    assert.ok(scenario);
    const url = `https://${scenario.slug}.example/`;
    return { cost: 0.001, completed: true, searchCalls: 1, sources: [{ url }], output: {
      observations: [{ id: 'web-source-1', url, fact: scenario.text, quote: scenario.text }],
      priorities: scenario.issue ? [{ title: scenario.issue, observationIds: ['local-check-1'], consequence: scenario.impact, correction: scenario.action, limitation: 'Le classement réel du site n’est pas mesuré.' }] : [],
      conclusion: { decision: scenario.issue ? 'IMPROVE_SITE' : 'KEEP_SITE', reason: scenario.issue ? 'Les pages collectées justifient une correction ciblée.' : 'Les informations collectées ne justifient pas une refonte.', observationIds: scenario.issue ? ['local-check-1'] : ['web-source-1'] },
      competitors: [], queries: [], limitations: [],
    } };
  } });
  const app = createApp({ dataDir: root, secretStore: createMemorySecretStore(), adapters: { openai }, auditLookup: async () => ['93.184.216.34'], auditFetchImpl: async value => {
    const scenario = cases.find(item => new URL(value).hostname === `${item.slug}.example`);
    return new Response(`<html lang="fr"><head>${scenario.title ? `<title>${scenario.title}</title>` : ''}<meta name="description" content="${scenario.text}"><meta name="viewport" content="width=device-width">${scenario.noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="canonical" href="${value}"><script type="application/ld+json">{}</script></head><body><h1>${scenario.text}</h1></body></html>`, { headers: { 'content-type': 'text/html' } });
  } });
  await app.ready;
  await app.providers.saveSecret('openai', 'fixture-only'); await app.providers.testConnection('openai'); await app.providers.setEnabled('openai', true);
  const styles = [];
  for (const scenario of cases) {
    const run = await app.publicAudits.create({ name: scenario.name, city: { id: scenario.slug, label: scenario.city, country: 'FR' }, domain: `https://${scenario.slug}.example`, identity: { source: 'google-places', placeId: `fixture-${scenario.slug}`, primaryTypeDisplayName: scenario.category } });
    assert.equal(run.status, 'PARTIAL', scenario.slug);
    assert.equal(run.modules.observation.status, 'SUCCEEDED', scenario.slug);
    assert.equal(run.stages.find(stage => stage.id === 'gmb-audit').cause, 'GOOGLE_PROFILE_NOT_CONFIGURED');
    assert.equal(run.modules.seo.pages.length, 1);
    assert.equal(run.modules.observation.priorities.length, scenario.issue ? 1 : 0);
    const html = (await app.publicAudits.readReport(run.id)).value;
    assert.deepEqual([...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(match => match[1]), REPORT_SECTIONS);
    styles.push(html.match(/<style>(.*?)<\/style>/s)[1]);
    assert.ok(html.includes(scenario.issue ?? 'ne justifient pas une refonte'));
    assert.doesNotMatch(html, /page-menu|page-reservation|Restaurant|Nantes|Maison Sillage/);
    for (const other of cases.filter(item => item !== scenario)) assert.ok(!html.includes(other.name));
    const sent = captured.at(-1).input;
    assert.equal(sent.subject.category, scenario.category);
    assert.ok(sent.researchPlan.firstQuery.includes(JSON.stringify(scenario.name)));
    assert.ok(sent.researchPlan.firstQuery.includes(JSON.stringify(scenario.city)));
    assert.ok(sent.pages[0].text.includes(scenario.text));
  }
  assert.equal(new Set(styles).size, 1);
  assert.equal(new Set(captured.map(request => request.system)).size, 1);
});
