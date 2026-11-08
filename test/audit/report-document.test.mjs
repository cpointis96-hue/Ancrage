import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildPublicAuditDocument, buildDossierAuditDocument, buildSeoAuditDocument, REPORT_SECTIONS } from '../../src/audit/report-document.mjs';
import { renderAuditDocumentHtml } from '../../src/audit/report-html.mjs';
import { renderAuditDocumentPdf } from '../../src/audit/report-pdf.mjs';
import { qualifyObservationResearch } from '../../src/audit/observation-analyst.mjs';
import { analyzeSeoAudit } from '../../src/audit/seo-audit.mjs';
import { createApp } from '../../src/app.mjs';
import { createMemorySecretStore } from '../../src/providers/memory-secret-store.mjs';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { observationResponse } from '../fixtures/observation-audit.mjs';

async function fixture() { return JSON.parse(await readFile(new URL('../fixtures/audit-packet/complete-audit-run.json', import.meta.url), 'utf8')); }

test('tous les documents partagent les quatre sections, sans données internes dans le HTML ou PDF', async () => {
  const run = await fixture();
  const documents = ['gmb', 'final'].map(kind => buildPublicAuditDocument(run, kind));
  documents.push(buildDossierAuditDocument({ business: { name: 'Fixture', city: 'Nantes' }, kind: 'initial' }));
  documents.push(buildSeoAuditDocument(analyzeSeoAudit({ target: 'https://fixture.example', observedAt: run.updatedAt, pages: [] })));
  for (const document of documents) {
    assert.deepEqual(document.sections.map(section => section.title), REPORT_SECTIONS);
    const html = renderAuditDocumentHtml(document);
    const pdf = renderAuditDocumentPdf(document);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.equal((html.match(/<h2 /g) ?? []).length, 4);
    assert.doesNotMatch(html + pdf, /cost-events|evidence-gmb|SUCCEEDED|USD|Détails d’exécution|seo-rules-v1/);
    assert.match(pdf, /^%PDF-1.4/);
    const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
    assert.equal(pdf.slice(xref, xref + 4), 'xref');
    assert.equal(pdf.length, Buffer.byteLength(pdf, 'ascii'));
  }
});

test('une priorité étayée suffit et les corrections identiques sont fusionnées', () => {
  const response = observationResponse();
  response.output.priorities = [response.output.priorities[1], response.output.priorities[1]];
  response.output.conclusion.observationIds = ['web-source-1'];
  const qualified = qualifyObservationResearch({ result: response, subject: { name: 'Maison', city: 'Nantes', domain: 'https://fixture.example' }, observations: [], observedAt: '2026-11-07T10:00:00Z', provider: 'fixture', execution: 'adapter-call-no-network', source: {} });
  assert.equal(qualified.priorities.length, 1);
  assert.equal(qualified.status, 'SUCCEEDED');
});

test('une conclusion étayée de conservation du site ne force aucune recommandation', () => {
  const response = observationResponse();
  response.output.priorities = [];
  response.output.conclusion.observationIds = ['web-source-1'];
  const qualified = qualifyObservationResearch({ result: response, subject: { name: 'Maison', city: 'Nantes', domain: 'https://fixture.example' }, observations: [], observedAt: '2026-11-07T10:00:00Z', provider: 'fixture', execution: 'adapter-call-no-network', source: {} });
  assert.equal(qualified.priorities.length, 0);
  assert.equal(qualified.status, 'SUCCEEDED');
});

test('les preuves ne sont rédigées qu’une fois et chaque action garde ses références', async () => {
  const run = await fixture();
  run.modules.observation = {
    observations: [{ id: 'fact-1', fact: 'Le téléphone publié est le 01 02 03 04 05.', url: 'https://fixture.example/contact' }],
    priorities: [{ title: 'Confirmer le téléphone', consequence: 'Vos clients doivent pouvoir vous joindre.', correction: 'Confirmez le numéro à publier.', observationIds: ['fact-1'] }, { title: 'Mettre à jour la page', consequence: 'Le contact doit rester accessible.', correction: 'Mettez à jour le lien téléphonique.', observationIds: ['fact-1'] }],
    conclusion: { reason: 'Les coordonnées doivent être confirmées.', observationIds: ['fact-1'] }, competitors: [], queries: [], limitations: [],
  };
  const document = buildPublicAuditDocument(run);
  const html = renderAuditDocumentHtml(document);
  assert.equal((html.match(/Le téléphone publié est le 01 02 03 04 05/g) ?? []).length, 1);
  assert.equal((html.match(/id="source-1"/g) ?? []).length, 1);
  assert.deepEqual(document.sections[1].blocks.map(action => action.sources), [[1], [1]]);
  assert.equal((html.match(/aria-label="Source 1"/g) ?? []).length, 2);
});

test('un audit partiel conserve des actions techniques, sans prétendre à une vérification navigateur', async () => {
  const run = await fixture();
  run.modules.observation = { observations: [], priorities: [], competitors: [], queries: [], limitations: [] };
  run.modules.seo = analyzeSeoAudit({ target: run.input.domain, observedAt: run.updatedAt, pages: [{ url: run.input.domain, html: '<html><h1>Fixture</h1></html>' }] });
  run.status = 'PARTIAL';
  const html = renderAuditDocumentHtml(buildPublicAuditDocument(run));
  assert.match(html, /Titre de page absent/);
  assert.match(html, /n’ont pas été testés dans un navigateur/);
  assert.doesNotMatch(html, /site absent|Données structurées non observées/);
});

test('les caractères français et les liens sont préservés dans le PDF', async () => {
  const run = await fixture(); run.input.name = 'L’Atelier d’Aurélia';
  const pdf = renderAuditDocumentPdf(buildPublicAuditDocument(run));
  assert.match(pdf, /WinAnsiEncoding/);
  assert.match(pdf, /L\\222Atelier d\\222Aur\\351lia/);
  assert.match(pdf, /\/Subtype \/Link/);
});

test('un constat technique commun à plusieurs pages reste unique avec toutes ses sources', () => {
  const audit = analyzeSeoAudit({ target: 'https://fixture.example', observedAt: '2026-11-07T10:00:00Z', pages: ['contact', 'services'].map(path => ({ url: `https://fixture.example/${path}`, html: '<html lang="fr"><meta name="viewport" content="width=device-width"><meta name="description" content="Fixture"><h1>Fixture</h1></html>' })) });
  const document = buildSeoAuditDocument(audit);
  const html = renderAuditDocumentHtml(document);
  assert.equal((html.match(/La page ne contient pas de title exploitable/g) ?? []).length, 1);
  assert.match(html, /https:\/\/fixture.example\/contact/);
  assert.match(html, /https:\/\/fixture.example\/services/);
  assert.deepEqual(document.sections[1].blocks[0].facts[0].sources, [1, 2]);
});

test('les limites spécifiques au mobile restent visibles et les fiches ambiguës sont distinguées', async () => {
  const run = await fixture();
  const local = renderAuditDocumentHtml(buildPublicAuditDocument(run, 'gmb'));
  assert.match(local, /Plusieurs fiches correspondent/);
  assert.match(local, /Maison Sillage Centre/);
  run.modules.observation = { observations: [], priorities: [], competitors: [], queries: [], limitations: ['Le formulaire de réservation était inaccessible lors de la collecte.'] };
  assert.match(renderAuditDocumentHtml(buildPublicAuditDocument(run)), /formulaire de réservation était inaccessible/);
});

test('les valeurs des preuves restent visibles même si le constat ne contient que l’adresse', async () => {
  const run = await fixture();
  run.modules.observation = { observations: [{ id: 'hours', fact: 'L’établissement au 61 place du Village publie des horaires différents.', quote: 'Lundi : 07:30 - 14:30', url: 'https://commune.example/commerce' }], priorities: [{ title: 'Harmoniser les horaires', consequence: 'Une visite peut être préparée avec des informations contradictoires.', correction: 'Confirmez puis harmonisez les horaires.', limitation: 'Les horaires réels sont à confirmer.', observationIds: ['hours'] }], competitors: [], queries: [], limitations: ['Aucune comparaison concurrentielle n’est assez étayée pour être retenue.', 'Les horaires observés peuvent avoir changé depuis la collecte.', 'Le formulaire de réservation était inaccessible lors de la collecte.'] };
  const html = renderAuditDocumentHtml(buildPublicAuditDocument(run));
  assert.match(html, /Lundi : 07:30 - 14:30/);
  assert.match(html, /horaires réels sont à confirmer/);
  assert.match(html, /formulaire de réservation était inaccessible/);
  assert.doesNotMatch(html, /Aucune comparaison concurrentielle|horaires observés peuvent avoir changé/);
});

test('le démarrage migre les anciennes consignes standard et préserve un prompt personnalisé', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-report-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await app.ready;
  const store = createAtomicStore(root);
  const old = '---\nid: audit-analyst\nname: Audit Analyst\nownerStep: S3\noutputContract: audit-report\n---\nInterprète uniquement les faits et preuves fournis. Sépare les constats, les limites et les recommandations. N\'invente aucune donnée absente.\n';
  let current = await app.prompts.get('audit-analyst');
  await app.prompts.saveDraft('audit-analyst', old, { expectedHash: current.draftHash });
  let version = await app.prompts.createVersion('audit-analyst', { expectedDraftHash: store.hashText(old) });
  await app.prompts.activate('audit-analyst', version.id);
  const migrated = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await migrated.ready;
  current = await migrated.prompts.get('audit-analyst');
  assert.match(await migrated.prompts.resolveRevision('audit-analyst', current.activeVersionId), /Une seule action utile suffit/);
  const custom = old.replace('Interprète uniquement', 'CONSIGNE PERSONNALISÉE : interprète uniquement');
  await migrated.prompts.saveDraft('audit-analyst', custom, { expectedHash: current.draftHash });
  version = await migrated.prompts.createVersion('audit-analyst', { expectedDraftHash: store.hashText(custom) });
  await migrated.prompts.activate('audit-analyst', version.id);
  const preserved = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await preserved.ready;
  const prompt = await preserved.prompts.get('audit-analyst');
  assert.equal(await preserved.prompts.resolveRevision('audit-analyst', prompt.activeVersionId), custom);
});
