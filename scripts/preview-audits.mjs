import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildPublicAuditDocument, buildDossierAuditDocument, buildSeoAuditDocument } from '../src/audit/report-document.mjs';
import { renderAuditDocumentHtml } from '../src/audit/report-html.mjs';
import { renderAuditDocumentPdf } from '../src/audit/report-pdf.mjs';
import { analyzeSeoAudit } from '../src/audit/seo-audit.mjs';

const output = path.resolve(process.argv[2] ?? 'outputs/audits');
await mkdir(output, { recursive: true });
const complete = JSON.parse(await readFile(new URL('../test/fixtures/audit-packet/complete-audit-run.json', import.meta.url), 'utf8'));
complete.input.name = 'SIMULATION · Maison Sillage';
complete.updatedAt = '2026-11-07T10:00:00Z';
complete.modules.gmb.candidates = [{ title: complete.input.name, address: 'Adresse fictive, Nantes', category: 'Restaurant' }];
complete.modules.observation = {
  observations: [
    { id: 'site-phone', fact: 'Votre page de contact affiche le 01 02 03 04 05.', url: 'https://maison-sillage.example/contact' },
    { id: 'directory-phone', fact: 'L’annuaire affiche le 01 02 03 04 06.', url: 'https://annuaire.example/maison-sillage' },
  ],
  priorities: [{ title: 'Publier le même numéro de téléphone', observationIds: ['site-phone', 'directory-phone'], consequence: 'Une personne peut essayer de vous joindre à un numéro qui n’est plus utilisé.', correction: 'Confirmez le numéro à conserver, puis mettez à jour votre page de contact et l’annuaire.', limitation: 'Le numéro actuel doit être confirmé par l’établissement.' }],
  conclusion: { decision: 'IMPROVE_SITE', reason: 'Le téléphone diffère entre votre site et l’annuaire. Une mise à jour ciblée suffit pour corriger ce point.', observationIds: ['site-phone', 'directory-phone'] },
  competitors: [], queries: [], limitations: ['Données de recette fictives ; aucun établissement réel n’a été audité.'],
};
const noSite = structuredClone(complete); noSite.input.domain = null; noSite.modules.seo = { summary: { pagesAnalyzed: 0 }, findings: [] };
noSite.modules.observation.observations[0] = { id: 'site-phone', fact: 'La page de la mairie affiche le 01 02 03 04 05.', url: 'https://commune.example/maison-sillage' };
noSite.modules.observation.conclusion.reason = 'Les deux pages publiques affichent des numéros différents. Le contact à publier doit être confirmé.';
noSite.modules.observation.priorities[0].correction = 'Confirmez le numéro à conserver, puis demandez sa mise à jour sur la page communale et dans l’annuaire.';
const unavailable = JSON.parse(await readFile(new URL('../test/fixtures/audit-packet/poor-audit-run.json', import.meta.url), 'utf8'));
unavailable.input.name = 'SIMULATION · Sources indisponibles';
const technical = analyzeSeoAudit({ target: 'https://atelier.example', observedAt: complete.updatedAt, pages: [{ url: 'https://atelier.example', html: '<html lang="fr"><meta name="viewport" content="width=device-width"><meta name="description" content="Atelier de recette"><h1>Atelier de recette</h1></html>' }] });
const documents = [
  ['final', buildPublicAuditDocument(complete)],
  ['local', buildPublicAuditDocument(complete, 'gmb')],
  ['sans-site', buildPublicAuditDocument(noSite)],
  ['partiel', buildPublicAuditDocument(unavailable)],
  ['technique', buildSeoAuditDocument(technical)],
  ['initial', buildDossierAuditDocument({ business: { name: 'SIMULATION · Atelier', city: 'Nantes', address: 'Adresse fictive', contact: 'atelier@example.test' }, story: 'Présentation fournie pour la recette.', kind: 'initial', date: complete.updatedAt })],
];
for (const [name, document] of documents) {
  await writeFile(path.join(output, `${name}.html`), renderAuditDocumentHtml(document));
  await writeFile(path.join(output, `${name}.pdf`), renderAuditDocumentPdf(document));
  await writeFile(path.join(output, `${name}.json`), JSON.stringify(document, null, 2));
}
console.log(JSON.stringify({ output, documents: documents.map(([name]) => name), execution: 'synthetic-fixtures-only', providerCalls: 0 }));
