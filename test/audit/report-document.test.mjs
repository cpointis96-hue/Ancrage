import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildPublicAuditDocument, buildDossierAuditDocument, buildSeoAuditDocument, REPORT_SECTIONS } from '../../src/audit/report-document.mjs';
import { renderAuditDocumentHtml } from '../../src/audit/report-html.mjs';
import { renderAuditDocumentPdf } from '../../src/audit/report-pdf.mjs';
import { qualifyObservationResearch } from '../../src/audit/observation-analyst.mjs';
import { technicalActions } from '../../src/audit/report-sections.mjs';
import { analyzeSeoAudit } from '../../src/audit/seo-audit.mjs';
import { assembleAuditPacket, projectAuditPacket } from '../../src/audit/audit-packet.mjs';
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
  assert.match(html, /Pour vérifier.*Relancez les contrôles/);
  assert.doesNotMatch(html, /site absent|Données structurées non observées/);
});

test('une page trouvée par recherche publique ne compte pas comme contrôle technique', async () => {
  const run = await fixture();
  run.modules.seo = { pages: [], findings: [] };
  run.modules.observation = {
    observations: [{ id: 'web-1', url: 'https://fixture.example/menu', fact: 'La période de validité de la carte est à vérifier.', sourceKind: 'web-search', usefulOnItsOwn: true, reportStatus: 'CHECK' }],
  };
  const document = buildPublicAuditDocument(run);
  const html = renderAuditDocumentHtml(document);
  assert.match(html, /Aucune page collectée pour les contrôles techniques/);
  assert.match(html, /Recherche publique.*La période de validité/);
  assert.doesNotMatch(html, /Contrôles techniques sur [1-9]/);
  assert.match(renderAuditDocumentPdf(document), /Aucune page collect/);
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

test('le rapport final garde les remarques sourcées et laisse les points forts dans les données', async () => {
  const run = await fixture();
  run.modules.observation = {
    observations: [
      { id: 'web-1', fact: 'La carte propose un menu enfant.', url: 'https://fixture.example/carte', usefulOnItsOwn: true },
      { id: 'web-2', fact: 'Les jours de service divergent. ([[1]](https://fixture.example/contact))', url: 'https://fixture.example/contact', usefulOnItsOwn: true, reportStatus: 'ISSUE' },
    ],
    priorities: [], competitors: [], queries: [], limitations: [], conclusion: null,
  };
  const document = buildPublicAuditDocument(run);
  assert.doesNotMatch(renderAuditDocumentHtml(document), /La carte propose un menu enfant/);
  assert.doesNotMatch(renderAuditDocumentPdf(document), /La carte propose un menu enfant/);
  assert.match(renderAuditDocumentHtml(document), /Les jours de service divergent/);
  assert.match(renderAuditDocumentPdf(document), /Les jours de service divergent/);
  assert.doesNotMatch(renderAuditDocumentHtml(document), /\[\[1\]\]/);
  assert.ok(document.sections.flatMap(section => section.blocks).some(block => block.type === 'source' && block.url === 'https://fixture.example/contact'));
  assert.equal(run.modules.observation.observations.length, 2);
});

test('le rapport final affiche seulement les pages et mesures SEO qui appellent une remarque', async () => {
  const run = await fixture();
  const target = run.input.domain;
  const healthyUrl = new URL('/accueil/', target).href;
  const offerUrl = new URL('/offre/', target).href;
  const markup = (url, description, title) => `<html lang="fr"><head><title>${title}</title>
    <meta name="description" content="${description}"><meta name="viewport" content="width=device-width">
    <link rel="canonical" href="${url}"><script type="application/ld+json">{"@type":"WebPage"}</script>
    </head><body><h1>${title}</h1></body></html>`;
  run.modules.seo = analyzeSeoAudit({ target, observedAt: run.updatedAt, pages: [
    { url: healthyUrl, html: markup(healthyUrl, 'Accueil du site', 'Accueil conforme') },
    { url: offerUrl, html: markup(offerUrl, 'Description trop imprécise', 'Offre de départ') },
  ] });
  run.modules.observation = {
    seoReviews: [
      { url: healthyUrl, assessment: 'Page conforme.', edits: [] },
      {
        url: offerUrl, assessment: 'Appréciation interne', reportNote: 'Le contenu du forfait reste à préciser.',
        edits: [{ field: 'DESCRIPTION', proposal: 'Présentation du forfait sur devis.', reason: 'Préciser les conditions.' }],
      },
    ],
    mobilePerformance: { status: 'MEASURED', pages: [
      { url: healthyUrl, lcpMs: 1500, cls: 0, tbtMs: 0, hints: [] },
      { url: offerUrl, lcpMs: 3100, cls: 0, tbtMs: 70, hints: [] },
    ] },
  };
  const document = buildPublicAuditDocument(run);
  const html = renderAuditDocumentHtml(document);
  assert.doesNotMatch(html, /Accueil conforme|Page conforme|Appréciation interne|Liens entrants|Données structurées|70 ms|1,5 s/);
  assert.match(html, /Meta description actuelle.*Description trop imprécise/);
  assert.match(html, /href="#seo">SEO page par page/);
  assert.match(html, /class="report-seo" aria-labelledby="seo"/);
  assert.match(renderAuditDocumentPdf(document), /\/Dest \[\d+ 0 R \/XYZ/);
  assert.match(html, /Le contenu du forfait reste à préciser/);
  assert.match(html, /3,1 s/);
  assert.equal(run.modules.seo.pages.length, 2);
  assert.equal(run.modules.observation.mobilePerformance.pages.length, 2);
});

test('le démarrage active le nouveau contrat standard sans écraser un contrat personnalisé', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-contract-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await app.ready;
  const current = await app.contracts.get('public-observation-analysis');
  const old = structuredClone(current.schema);
  delete old.properties.pageImprovements;
  delete old.properties.siteProposal;
  delete old.properties.firstSitePlan;
  delete old.properties.withoutSiteJourney;
  delete old.properties.siteJourney;
  delete old.properties.seoReviews;
  delete old.properties.conclusion.properties.details;
  delete old.properties.competitors.items.properties.comparisonObservationIds;
  delete old.properties.competitors.items.properties.criterion;
  delete old.properties.competitors.items.properties.application;
  delete old.properties.competitors.items.properties.applicationReason;
  delete old.properties.competitors.items.properties.applicationBasis;
  delete old.properties.competitors.items.properties.visualElements;
  delete old.properties.priorities.items.properties.visualElements;
  delete old.properties.priorities.items.properties.targetUrl;
  delete old.properties.priorities.items.properties.applicationBasis;
  delete old.properties.observations.items.properties.topic;
  delete old.properties.observations.items.properties.usefulOnItsOwn;
  delete old.properties.observations.items.properties.reportStatus;
  delete old.properties.priorities.items.properties.topic;
  delete old.properties.priorities.items.properties.verification;
  delete old.properties.priorities.items.properties.confidence;
  delete old.properties.priorities.items.properties.owner;
  delete old.properties.priorities.items.properties.effort;
  old.properties.observations.items.properties.fact.maxLength = 320;
  old.properties.observations.items.properties.quote.maxLength = 240;
  old.properties.observations.maxItems = 12; old.properties.priorities.maxItems = 3; old.properties.queries.maxItems = 3;
  const draft = await app.contracts.save(current.id, { schema: old }, { expectedHash: current.draftHash });
  const version = await app.contracts.createVersion(current.id, { expectedDraftHash: draft.draftHash });
  await app.contracts.activate(current.id, version.id);
  const migrated = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await migrated.ready;
  const active = await migrated.contracts.getActiveVersion(current.id);
  assert.equal(active.schema.properties.observations.maxItems, 32);
  assert.equal(active.schema.properties.priorities.items.properties.verification.type, 'string');
  assert.deepEqual(active.schema.properties.priorities.items.properties.applicationBasis.enum, ['USABILITY', 'SEO', 'BUSINESS']);
  assert.equal(active.schema.properties.priorities.items.properties.visualElements.items.properties.state.type, 'string');
  assert.deepEqual(active.schema.properties.priorities.items.properties.topic.enum, ['LOCAL', 'SITE', 'MARKET']);
  const custom = structuredClone(active.schema); custom.title = 'Contrat personnalisé';
  const next = await migrated.contracts.save(current.id, { schema: custom }, { expectedHash: (await migrated.contracts.get(current.id)).draftHash });
  const customVersion = await migrated.contracts.createVersion(current.id, { expectedDraftHash: next.draftHash }); await migrated.contracts.activate(current.id, customVersion.id);
  const preserved = createApp({ dataDir: root, secretStore: createMemorySecretStore() }); await preserved.ready;
  assert.equal((await preserved.contracts.getActiveVersion(current.id)).schema.title, custom.title);
});

test('une description manquante sur la page accessibilité ne devient pas une priorité commerciale', () => {
  const findings = ['https://fixture.example/accessibilite/', 'https://fixture.example/menu/'].map(url => ({ code: 'MISSING_META_DESCRIPTION', url, detail: 'Description absente' }));
  const actions = technicalActions(findings);
  assert.equal(actions.length, 1); assert.deepEqual(actions[0].urls, ['https://fixture.example/menu/']);
});

test('l’audit du parcours retient les modifications du site, les preuves par page et les concurrents comparables', async () => {
  const run = await fixture();
  const domain = run.input.domain;
  const site = new URL('/menu', domain).href;
  const rival = 'https://restaurant-voisin.example/menu';
  const directory = 'https://tripadvisor.fr/restaurant';
  const observations = [{ id: 'local-page-1', url: site, fact: 'Formules de déjeuner et de dîner.', heading: 'Menu', callsToAction: [{ label: 'Nous joindre' }] }];
  const reply = observationResponse();
  reply.sources = [{ url: rival }, { url: directory }];
  reply.output.observations = [
    { id: 'web-source-1', url: rival, fact: 'Le menu renvoie à la réservation.', quote: 'Réserver' },
    { id: 'web-source-2', url: directory, fact: 'La fiche de l’annuaire mentionne un autre tarif.', quote: '16 €' },
  ];
  reply.output.priorities = [
    { title: 'Modifier l’annuaire', targetUrl: directory, observationIds: ['web-source-2', 'local-page-1'], consequence: 'Comparaison de prix', correction: 'Écrire à l’annuaire', limitation: 'À confirmer', topic: 'MARKET' },
    { title: 'Clarifier l’action sur la carte', targetUrl: site, observationIds: ['local-page-1'], consequence: 'Le lecteur peut réserver depuis le menu.', correction: 'Clarifiez le lien sur la carte.', limitation: 'Aucune', topic: 'SITE', owner: 'Webmaster', effort: 'CONTENT' },
  ];
  reply.output.siteJourney = [
    { stage: 'CHOOSE', task: 'Choisir une formule', observed: 'La carte présente deux services.', nextCheck: '', observationIds: ['local-page-1'] },
    { stage: 'VISIT', task: 'Trouver le restaurant', observed: 'Le restaurant voisin affiche une adresse.', nextCheck: '', observationIds: ['web-source-1'] },
  ];
  reply.output.pageImprovements = [
    { observationId: 'local-page-1', evidenceExcerpt: 'Lien inventé', friction: 'Preuve absente.', change: 'À rejeter.', copyExample: '', verification: 'Vérifier.' },
    { observationId: 'local-page-1', evidenceExcerpt: 'Nous joindre', friction: 'Le libellé ne précise pas qu’il permet de réserver.', change: 'Précisez le geste près des formules.', copyExample: 'Réserver une table par téléphone', verification: 'Ouvrez la carte et repérez la réservation.' },
  ];
  reply.output.siteProposal = 'Une carte et un parcours de réservation reliés dès le menu.';
  reply.output.competitors = [
    { name: 'Restaurant Voisin', url: rival, criterion: 'Réserver depuis la carte', comparison: 'Sa carte relie le menu à la réservation.', application: 'Ajouter une action explicite près de la formule.', comparisonObservationIds: ['local-page-1', 'web-source-1'] },
    { name: 'Annuaire', url: directory, comparison: 'Fiche tierce.', comparisonObservationIds: ['local-page-1', 'web-source-2'] },
  ];
  reply.output.conclusion = { decision: 'IMPROVE_SITE', reason: 'Clarifiez la réservation sur la carte.', observationIds: ['local-page-1'] };
  const qualified = qualifyObservationResearch({ result: reply, subject: { name: run.input.name, city: 'Nantes', domain }, observations, observedAt: run.updatedAt, provider: 'fixture', execution: 'adapter-call-no-network', source: {} });
  assert.deepEqual(qualified.priorities.map(item => item.title), ['Clarifier l’action sur la carte']);
  assert.deepEqual(qualified.competitors.map(item => item.title), ['Restaurant Voisin']);
  assert.equal(qualified.pageImprovements.length, 1);
  assert.deepEqual(qualified.siteJourney.map(item => item.stage), ['CHOOSE']);
  run.modules.observation = { ...qualified, observations: [...observations, ...qualified.observations], mobilePerformance: { status: 'MEASURED', pages: [{ url: site, lcpMs: 3100, hints: ['Alléger les images'] }] } };
  const doc = buildPublicAuditDocument(run);
  const html = renderAuditDocumentHtml(doc);
  assert.doesNotMatch(html, /Choisir une formule/);
  assert.match(html, /Ouvrir la page concernée/);
  assert.match(html, /Webmaster · Contenu/);
  assert.match(html, /Réserver une table par téléphone/);
  assert.match(html, /3,1 s/);
  assert.doesNotMatch(html, /Restaurant Voisin|restaurant-voisin\.example|À retenir pour votre site/);
  assert.doesNotMatch(html, /Ancrage vous livrerait/);
  assert.doesNotMatch(html, /Modifier l’annuaire|Lien inventé/);
  assert.match(renderAuditDocumentPdf(doc), /3,1 s/);
});


test('la navigation HTML déclenche une vérification sans annoncer un défaut mobile', async () => {
  const run = await fixture();
  const url = new URL('/menu/', run.input.domain).href;
  run.modules.seo = analyzeSeoAudit({
    target: run.input.domain, observedAt: run.updatedAt,
    pages: [{ url, html: '<html><body><nav><a href="tel:+33123456789">Réserver par téléphone</a></nav><main><h1>Notre carte</h1></main></body></html>' }],
  });
  run.modules.observation = {
    priorities: [{ title: 'Confirmer un tarif tiers', correction: 'Relisez les tarifs de la fiche.', consequence: 'Préparer sa visite.', observationIds: [] }],
    conclusion: null,
  };
  const doc = buildPublicAuditDocument(run);
  assert.match(doc.sections[0].blocks[0].text, /Vérifiez l’accès à l’appel depuis la page d’offre/);
  assert.equal(doc.sections[1].blocks[0].code, 'OFFER_CALL_ONLY_IN_LAYOUT');
  const html = renderAuditDocumentHtml(doc);
  assert.doesNotMatch(html, /Ce qu’Ancrage vous livrerait/);
  assert.match(html, /Réserver par téléphone/);
  assert.match(html, /À confirmer sur mobile/);
  assert.match(renderAuditDocumentPdf(doc), /V\\351rifier l/);
});

test('le benchmark complet reste interne et sa recommandation se fond dans l’action propre au site', async () => {
  const run = await fixture();
  const menu = new URL('/menu', run.input.domain).href;
  const rival = 'https://maison-kermes.example/la-carte';
  const ownJpeg = (await readFile(new URL('../../docs/screenshots/a-traiter-2026-10-11.jpg', import.meta.url))).toString('base64');
  const rivalJpeg = (await readFile(new URL('../../docs/screenshots/dossier-menu-2026-10-11.jpg', import.meta.url))).toString('base64');
  const quote = 'La formule du comptoir en cinq services';
  const correction = 'Placez « Appeler pour réserver » sous les formules.';
  const capture = (url, element, state, caption, jpeg) => ({ url, element, state, caption, jpeg, observedAt: run.updatedAt, viewport: { width: 390 } });
  run.modules.keywords.competitors = [{ title: 'Maison Kermès', url: rival, comparison: 'La carte concurrente contient un lien et un prix.' }];
  run.modules.observation = {
    observations: [
      { id: 'own', url: menu, fact: 'Le lien d’appel est dans la navigation.' },
      { id: 'market', url: rival, quote, fact: 'Une carte de saison est affichée.', usefulOnItsOwn: true, reportStatus: 'ISSUE' },
      { id: 'copied', url: menu, fact: quote, usefulOnItsOwn: true, reportStatus: 'ISSUE' },
    ],
    conclusion: { reason: 'Facilitez la réservation depuis la carte.', observationIds: ['own', 'market'] },
    priorities: [{
      title: 'Rendre l’appel accessible depuis la carte', targetUrl: menu, topic: 'SITE', applicationBasis: 'USABILITY', confidence: 'SUPPORTED',
      observationIds: ['own', 'market'], consequence: 'Le client sait que le bouton ouvre le téléphone et peut appeler dès son choix.',
      correction, verification: 'Depuis les formules, ouvrez le composeur et contrôlez le numéro.',
      visualRequests: [
        { url: menu, element: 'Appeler', state: 'Navigation ouverte' },
        { url: menu, element: 'Formules', state: 'Navigation fermée' },
        { url: rival, element: quote },
      ],
    }, {
      title: 'Copier un choix tiers', correction: 'Affichez les nouveaux tarifs.', observationIds: ['market'],
    }],
    competitors: [{
      title: 'Maison Kermès', url: rival, comparison: 'L’autre restaurant propose un bouton au-dessus de son offre.',
      application: correction, applicationBasis: 'USABILITY', comparisonSources: [menu, rival],
      visualRequests: [{ url: rival, element: quote }],
    }],
    pageImprovements: [
      { url: menu, heading: 'Carte', change: correction, evidenceExcerpt: 'Le lien est dans la navigation.' },
      { url: menu, heading: 'Choisir', change: 'Ajouter le texte.', evidenceExcerpt: quote },
    ],
    limitations: [`Lien à vérifier ([source](${rival})).`, 'Le formulaire était inaccessible lors du test.'],
    visualEvidence: [
      capture(menu, 'Appeler', 'Navigation ouverte', 'Lien publié dans la navigation', ownJpeg),
      capture(menu, 'Formules', 'Navigation ouverte', 'État hors contexte', ownJpeg),
      capture(rival, quote, '', 'Capture de Maison Kermès', rivalJpeg),
      capture(menu, 'Formules', 'Navigation fermée', 'Capture réattribuée', rivalJpeg),
    ],
  };
  const { packet } = assembleAuditPacket({ auditRun: run });
  const internal = projectAuditPacket(packet).report.observation;
  assert.equal(internal.competitors[0].application, correction);
  assert.equal(internal.competitors[0].url, rival);
  assert.equal(internal.observations[1].quote, quote);
  assert.equal(internal.visualEvidence[2].jpeg, rivalJpeg);
  const doc = buildPublicAuditDocument(run, 'final', packet);
  const actions = doc.sections.flatMap(section => section.blocks).filter(block => block.type === 'action');
  assert.equal(actions.filter(item => item.action === correction).length, 1);
  const [action] = actions;
  assert.equal(action.basis, 'Ergonomie');
  assert.match(action.impact, /ouvre le téléphone/);
  assert.deepEqual(action.visuals.map(visual => visual.caption ?? visual.missing), ['Lien publié dans la navigation', 'Formules · Navigation fermée']);
  assert.ok(doc.sections.flatMap(section => section.blocks).filter(block => block.type === 'source').every(block => block.url === menu));

  const html = renderAuditDocumentHtml(doc);
  const pdf = renderAuditDocumentPdf(doc);
  const forbidden = /maison[- ]kerm|formule du comptoir|autre restaurant|copier un choix tiers|lien à vérifier|hors contexte|réattribuée/iu;
  assert.doesNotMatch(JSON.stringify(doc), forbidden);
  assert.doesNotMatch(html, forbidden);
  assert.doesNotMatch(pdf, forbidden);
  assert.match(html, /Capture à réaliser · Formules · Navigation fermée/);
  assert.match(pdf, /Capture .*Formules .*Navigation/);
  assert.match(html, /Le formulaire était inaccessible/);
  assert.equal((html.match(/data:image\/jpeg;base64,/g) ?? []).length, 1);
  assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 1);
  assert.ok(!html.includes(rivalJpeg));
  assert.ok(!pdf.includes(Buffer.from(rivalJpeg, 'base64').toString('hex')));
  delete run.modules.observation;
  const legacy = buildPublicAuditDocument(run);
  assert.doesNotMatch(renderAuditDocumentHtml(legacy) + renderAuditDocumentPdf(legacy), forbidden);
});
