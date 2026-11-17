import { buildDossierAuditDocument } from '../audit/report-document.mjs';
import { auditReportStyles, escapeReportHtml, renderAuditDocumentContent } from '../audit/report-html.mjs';
import { createId } from '../core/ids.mjs';
import { createDossierRegistry } from '../dossiers/dossier-registry.mjs';
import { renderSitePreview, sitePreviewHtml } from '../demo/site-preview.mjs';

const workflowId = 'client-site-simulation';
export const clientSiteWorkflow = { id: workflowId, name: 'Création de site client', version: 1, steps: [
  { id: 'dossier-validation', kind: 'deterministic', dependsOn: [], inputRefs: [], outputRefs: ['dossier'], outputTemplateId: 'audit-initial', implementation: 'simulation-dossier-validation', timeoutMs: 1000, budget: 0 },
  { id: 'gmb-audit-report', kind: 'deterministic', dependsOn: ['dossier-validation'], inputRefs: ['dossier-validation'], outputRefs: ['gmbReport'], outputTemplateId: 'audit-gmb', implementation: 'simulation-gmb-audit-report', timeoutMs: 1000, budget: 0 },
  { id: 'seo-competition-report', kind: 'deterministic', dependsOn: ['dossier-validation', 'gmb-audit-report'], inputRefs: ['dossier-validation', 'gmb-audit-report'], outputRefs: ['seoReport'], outputTemplateId: 'audit-seo', implementation: 'simulation-seo-competition-report', timeoutMs: 1000, budget: 0 },
  { id: 'content-plan', kind: 'deterministic', dependsOn: ['seo-competition-report'], inputRefs: ['dossier-validation', 'seo-competition-report'], outputRefs: ['contentPlan'], implementation: 'simulation-content-plan', timeoutMs: 1000, budget: 0 },
  { id: 'site-build', kind: 'deterministic', dependsOn: ['content-plan'], inputRefs: ['content-plan'], outputRefs: ['site'], implementation: 'simulation-site-build', timeoutMs: 1000, budget: 0 },
  { id: 'quality-gate', kind: 'deterministic', dependsOn: ['gmb-audit-report', 'site-build', 'seo-competition-report'], inputRefs: ['gmb-audit-report', 'site-build', 'seo-competition-report'], outputRefs: ['quality'], implementation: 'simulation-quality-gate', timeoutMs: 1000, budget: 0 },
] , outputTemplateId: 'site-preview' };

function dossierPaths(id) { return `dossiers/${id}`; }
const runPath = id => `runs/${id}`;
const fallbackReportTemplate = { content: '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{title}}</title><style>{{style}}</style></head><body><main data-report-format="ancrage-audit-v2"><header class="report-header"><div class="report-brand"><strong>ANCRAGE</strong></div><h1>{{title}}</h1></header>{{content}}</main></body></html>' };

function renderTemplate(template, values) {
  return template.replace(/{{\s*(title|content|style|language)\s*}}/g, (_, key) => values[key] ?? '');
}

async function renderAuditFile(localStore, run, stepId, template, title, content, style) {
  const selectedTemplate = template ?? fallbackReportTemplate;
  const relativePath = `${runPath(run.id)}/artifacts/${stepId}/report.html`;
  const html = renderTemplate(selectedTemplate.content, { title: escapeReportHtml(title), content, style });
  const result = await localStore.writeText(relativePath, html, { expectedHash: null });
  return { artifactPath: relativePath, artifactHash: result.hash, templateId: selectedTemplate.id ?? null, templateVersionId: selectedTemplate.versionId ?? null };
}

export function createSimulationImplementations({ store, faults = new Set() }) {
  const implementations = {
    'simulation-dossier-validation': async ({ input, run, store: localStore }) => {
      const dossier = await localStore.readJson(`${dossierPaths(input.dossierId)}/dossier.json`, null);
      const story = await localStore.readText(`${dossierPaths(input.dossierId)}/story.md`, null);
      const menu = await localStore.readJson(`${dossierPaths(input.dossierId)}/menu.json`, null);
      if (!dossier || !story || !menu) throw Object.assign(new Error('dossier incomplet'), { code: 'DOSSIER_INCOMPLETE' });
      const content = renderAuditDocumentContent(buildDossierAuditDocument({ business: dossier, story, menu, kind: 'initial', date: run.createdAt }));
      const template = run.snapshot.steps.find(step => step.id === 'dossier-validation')?.template;
      const artifact = await renderAuditFile(localStore, run, 'dossier-validation', template, dossier.name, content, auditReportStyles());
      return { dossierId: input.dossierId, business: dossier, story, menu, assets: dossier.assets ?? [], ...(artifact ? { artifactPath: artifact.artifactPath, artifactHash: artifact.artifactHash, templateId: artifact.templateId, templateVersionId: artifact.templateVersionId } : {}) };
    },
    'simulation-content-plan': async ({ input }) => {
      const source = input['dossier-validation'];
      const siteSpec = input.siteSpec ?? { schemaVersion: 'site-spec-v1', title: source.business.name, city: source.business.city, address: source.business.address, contact: source.business.contact, sections: ['identity', 'story', 'menu', 'contact'], assetCount: source.assets.length };
      const sections = siteSpec.sections ?? siteSpec.pages?.[0]?.sections ?? ['identity', 'story', 'menu', 'contact'];
      return { dossierId: source.dossierId, reportId: input['seo-competition-report'].dossierId, siteSpec, pages: ['Accueil', 'Menu', 'Histoire', 'Contact'], title: source.business.name, city: source.business.city, address: source.business.address, contact: source.business.contact, story: source.story, menu: source.menu, hours: input.hours, country: source.business.country, synthetic: source.business.provenance === 'synthetic-fixture', assets: source.assets, sections };
    },
    'simulation-gmb-audit-report': async ({ input, run, store: localStore }) => {
      const facts = input['dossier-validation'];
      const body = renderAuditDocumentContent(buildDossierAuditDocument({ business: facts.business, story: facts.story, menu: facts.menu, kind: 'gmb', date: run.createdAt }));
      const template = run.snapshot.steps.find(step => step.id === 'gmb-audit-report')?.template;
      const artifact = await renderAuditFile(localStore, run, 'gmb-audit-report', template, facts.business.name, body, auditReportStyles());
      return { reportKind: 'gmb', status: 'READY_FOR_REVIEW', dossierId: facts.dossierId, artifactPath: artifact.artifactPath, artifactHash: artifact.artifactHash, templateId: artifact.templateId, templateVersionId: artifact.templateVersionId, availableAt: new Date().toISOString(), durationMs: 0 };
    },
    'simulation-site-build': async ({ input, run, store: localStore }) => {
      if (faults.has('site-build')) throw Object.assign(new Error('interruption simulée pendant la génération du site'), { code: 'SIMULATED_CRASH' });
      const sitePath = `${runPath(run.id)}/artifacts/site/index.html`;
      const dossier = input['content-plan'];
      const images = await Promise.all((dossier.assets ?? []).map(async asset => {
        const value = await localStore.readBuffer(`${dossierPaths(dossier.dossierId)}/assets/${asset.name}`, null);
        return value ? { ...asset, dataUrl: `data:${asset.type};base64,${value.toString('base64')}` } : null;
      }));
      const usableImages = images.filter(Boolean);
      const preview = renderSitePreview({ ...dossier, name: dossier.title, images: usableImages, locale: dossier.siteSpec.locale });
      const template = run.snapshot.steps.find(step => step.id === 'site-build')?.template ?? run.snapshot.template;
      const shell = template?.content.replace('<main>{{content}}</main>', '{{content}}').replace('<html lang="fr">', '<html lang="{{language}}">');
      const html = shell ? renderTemplate(shell, preview) : sitePreviewHtml(preview);
      const result = await localStore.writeText(sitePath, html, { expectedHash: null });
      return { artifactPath: sitePath, artifactHash: result.hash, templateId: template?.id ?? null, templateVersionId: template?.versionId ?? null, pages: dossier.pages, embeddedAssets: usableImages.map(item => item.name) };
    },
    'simulation-seo-competition-report': async ({ input, run, store: localStore }) => {
      const gmb = input['gmb-audit-report'];
      const facts = await localStore.readJson(`${dossierPaths(gmb.dossierId)}/dossier.json`, null);
      const body = renderAuditDocumentContent(buildDossierAuditDocument({ business: facts, kind: 'final', date: run.createdAt }));
      const template = run.snapshot.steps.find(step => step.id === 'seo-competition-report')?.template;
      const artifact = await renderAuditFile(localStore, run, 'seo-competition-report', template, facts.name, body, auditReportStyles());
      return { reportKind: 'seo-competition', sourceReportHash: gmb.artifactHash, status: 'READY_FOR_REVIEW', dossierId: gmb.dossierId, artifactPath: artifact.artifactPath, artifactHash: artifact.artifactHash, templateId: artifact.templateId, templateVersionId: artifact.templateVersionId, availableAt: new Date().toISOString(), durationMs: 0 };
    },
    'simulation-quality-gate': async ({ input, store: localStore }) => {
      if (faults.has('quality-gate')) return null;
      const site = input['site-build'];
      const gmb = input['gmb-audit-report'];
      const report = input['seo-competition-report'];
      const siteHtml = site?.artifactPath ? await localStore.readText(site.artifactPath, '') : '';
      const reportHtml = report?.artifactPath ? await localStore.readText(report.artifactPath, '') : '';
      const checks = [
        ['site-artifact', Boolean(site?.artifactHash && siteHtml.includes('<!doctype html>'))],
        ['site-responsive', siteHtml.includes('name="viewport"') && siteHtml.includes('@media')],
        ['site-content', /<h1[ >]/.test(siteHtml) && /Ancrage/i.test(siteHtml)],
        ['gmb-report-artifact', Boolean(gmb?.artifactHash)],
        ['seo-report-artifact', Boolean(report?.artifactHash && reportHtml.includes('<!doctype html>'))],
        ['seo-report-provenance', Boolean(report?.sourceReportHash && report.sourceReportHash === gmb?.artifactHash)],
      ];
      const failed = checks.filter(([, passed]) => !passed).map(([id]) => id);
      if (failed.length) throw Object.assign(new Error(`Contrôle qualité bloqué : ${failed.join(', ')}`), { code: 'QUALITY_BLOCKED' });
      return { status: 'PASS', checks: checks.map(([id]) => id) };
    },
  };
  return implementations;
}

export function createClientSiteSimulation({ store, engine, dossiers = createDossierRegistry({ store }), clock = () => new Date(), idFactory = prefix => createId(prefix, clock()), faults = new Set() }) {
  const defaultPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlGHgAAAABJRU5ErkJggg==';
  async function prepareDossier(profile = {}) { const dossier = await dossiers.create({ name: profile.name ?? 'Bistro Sillage', city: profile.city ?? 'Pattaya', country: profile.country ?? 'Thaïlande', contact: profile.contact ?? 'contact@example.test', story: profile.story ?? 'Une histoire synthétique fournie par le restaurateur pour tester le parcours.', menu: profile.menu ?? [{ name: 'Plat signature', price: 12 }], photo: profile.photo ?? { dataUrl: defaultPhoto, alt: 'Image synthétique du restaurant' } }, { source: 'synthetic-fixture', id: idFactory('dossier') }); return { id: dossier.id, dossier }; }
  async function startDossier(dossierId, { fault = null, siteSpec = null, pipelineReservation = null, hours = null } = {}) { faults.clear(); if (fault) faults.add(fault); await dossiers.get(dossierId); const current = await store.readText(`config/workflows/${workflowId}.json`, null); if (current === null) await store.writeJson(`config/workflows/${workflowId}.json`, clientSiteWorkflow, { expectedHash: null }); return engine.start(workflowId, { dossierId, ...(siteSpec ? { siteSpec } : {}), ...(hours ? { hours } : {}), ...(pipelineReservation ? { pipelineReservation } : {}) }); }
  async function start(profile = {}, { fault = null } = {}) { const dossier = await prepareDossier(profile); return startDossier(dossier.id, { fault }); }
  async function resume(runId, { fault = null } = {}) { faults.clear(); if (fault) faults.add(fault); return engine.resume(runId); }
  return { prepareDossier, resume, start, startDossier, workflowId };
}
