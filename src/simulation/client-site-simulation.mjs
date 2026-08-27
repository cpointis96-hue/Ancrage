import { createId } from '../core/ids.mjs';
import { createDossierRegistry } from '../dossiers/dossier-registry.mjs';

const workflowId = 'client-site-simulation';
export const clientSiteWorkflow = { id: workflowId, name: 'Création de site client', version: 1, steps: [
  { id: 'dossier-validation', kind: 'deterministic', dependsOn: [], inputRefs: [], outputRefs: ['dossier'], implementation: 'simulation-dossier-validation', timeoutMs: 1000, budget: 0 },
  { id: 'content-plan', kind: 'deterministic', dependsOn: ['dossier-validation'], inputRefs: ['dossier-validation'], outputRefs: ['contentPlan'], implementation: 'simulation-content-plan', timeoutMs: 1000, budget: 0 },
  { id: 'site-build', kind: 'deterministic', dependsOn: ['content-plan'], inputRefs: ['content-plan'], outputRefs: ['site'], implementation: 'simulation-site-build', timeoutMs: 1000, budget: 0 },
  { id: 'report-build', kind: 'deterministic', dependsOn: ['dossier-validation', 'content-plan'], inputRefs: ['dossier-validation', 'content-plan'], outputRefs: ['report'], implementation: 'simulation-report-build', timeoutMs: 1000, budget: 0 },
  { id: 'quality-gate', kind: 'deterministic', dependsOn: ['site-build', 'report-build'], inputRefs: ['site-build', 'report-build'], outputRefs: ['quality'], implementation: 'simulation-quality-gate', timeoutMs: 1000, budget: 0 },
] , outputTemplateId: 'site-preview' };

function dossierPaths(id) { return `dossiers/${id}`; }
const runPath = id => `runs/${id}`;
const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function renderTemplate(template, values) {
  return template.replace(/{{\s*(title|content|style)\s*}}/g, (_, key) => values[key] ?? '');
}

export function createSimulationImplementations({ store, faults = new Set() }) {
  const implementations = {
    'simulation-dossier-validation': async ({ input, store: localStore }) => {
      const dossier = await localStore.readJson(`${dossierPaths(input.dossierId)}/dossier.json`, null);
      const story = await localStore.readText(`${dossierPaths(input.dossierId)}/story.md`, null);
      const menu = await localStore.readJson(`${dossierPaths(input.dossierId)}/menu.json`, null);
      if (!dossier || !story || !menu) throw Object.assign(new Error('dossier incomplet'), { code: 'DOSSIER_INCOMPLETE' });
      return { dossierId: input.dossierId, business: dossier, story, menu, assets: dossier.assets ?? [] };
    },
    'simulation-content-plan': async ({ input }) => {
      const source = input['dossier-validation'];
      return { dossierId: source.dossierId, pages: ['Accueil', 'Menu', 'Histoire', 'Contact'], title: source.business.name, city: source.business.city, address: source.business.address, contact: source.business.contact, story: source.story, menu: source.menu, assets: source.assets, sections: ['identity', 'story', 'menu', 'contact'] };
    },
    'simulation-site-build': async ({ input, run, store: localStore }) => {
      if (faults.has('site-build')) throw Object.assign(new Error('interruption simulée pendant la génération du site'), { code: 'SIMULATED_CRASH' });
      const sitePath = `${runPath(run.id)}/artifacts/site/index.html`;
      const dossier = input['content-plan'];
      const images = await Promise.all((dossier.assets ?? []).map(async asset => {
        const value = await localStore.readBuffer(`${dossierPaths(dossier.dossierId)}/assets/${asset.name}`, null);
        return value ? { ...asset, dataUrl: `data:${asset.type};base64,${value.toString('base64')}` } : null;
      }));
      const image = images.find(Boolean);
      const menu = dossier.menu.length ? `<section id="menu"><p class="eyebrow">À table</p><h2>À découvrir sur place</h2><div class="menu">${dossier.menu.map(item => `<article><div><h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div><strong>${item.price === null ? '' : esc(item.price)}</strong></article>`).join('')}</div></section>` : '';
      const contact = dossier.contact ? `<a class="contact-link" href="mailto:${esc(encodeURIComponent(dossier.contact))}">Écrire à l’établissement</a>` : '';
      const generatedHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(dossier.title)} · ${esc(dossier.city)}</title><style>:root{color-scheme:dark;--ink:#edf1e8;--muted:#b4c0b0;--line:#536153;--moss:#b8ce98;--deep:#101711}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--deep);color:var(--ink);font:16px/1.6 system-ui,-apple-system,sans-serif}main{max-width:1180px;margin:auto;padding:24px clamp(24px,6vw,88px) 80px}.topbar{display:flex;justify-content:space-between;gap:24px;padding:18px 0;border-bottom:1px solid var(--line)}.mark,.eyebrow{color:var(--moss);font-size:12px;letter-spacing:.14em;text-transform:uppercase}.topbar a,.contact-link{color:var(--moss)}.hero{min-height:68vh;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,44%);gap:clamp(32px,7vw,110px);align-items:center;padding:clamp(48px,10vw,132px) 0}.hero h1{max-width:10ch;margin:16px 0;font-size:clamp(48px,8vw,112px);line-height:.94;letter-spacing:-.06em}.hero p{max-width:34rem;color:var(--muted);font-size:18px}.hero-media{min-height:390px;border:1px solid var(--line);background:#1f2b20;overflow:hidden}.hero-media img{display:block;width:100%;height:100%;min-height:390px;object-fit:cover}.section{border-top:1px solid var(--line);padding:48px 0}.section h2{font-size:clamp(30px,4vw,58px);line-height:1;letter-spacing:-.05em;margin:10px 0 30px}.story{max-width:42rem;color:var(--muted);font-size:20px}.menu{display:grid;gap:0;border-top:1px solid var(--line)}.menu article{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid var(--line);padding:18px 0}.menu h3{margin:0;font-size:19px}.menu p{margin:3px 0 0;color:var(--muted)}.menu strong{color:var(--moss);white-space:nowrap}.contact-link{display:inline-block;border-bottom:1px solid var(--moss);padding-bottom:4px;text-decoration:none}:focus-visible{outline:2px solid var(--moss);outline-offset:5px}@media(max-width:760px){main{padding:18px 20px 56px}.topbar{align-items:flex-start}.hero{display:block;min-height:0;padding:60px 0 52px}.hero h1{font-size:clamp(52px,16vw,78px)}.hero-media{min-height:280px;margin-top:42px}.hero-media img{min-height:280px}.hero-media img{min-height:280px}.section{padding:36px 0}.section h2{font-size:38px}.story{font-size:18px}.menu article{gap:12px}}</style></head><body><main><header class="topbar"><span class="mark">ANCRAGE</span><span>${esc(dossier.city)}</span></header><section class="hero"><div><p class="eyebrow">Une adresse à découvrir</p><h1>${esc(dossier.title)}</h1><p>${esc(dossier.address || dossier.city)}</p>${contact}</div>${image ? `<div class="hero-media"><img src="${esc(image.dataUrl)}" alt="${esc(image.alt || dossier.title)}"></div>` : '<div class="hero-media" aria-hidden="true"></div>'}</section>${dossier.story ? `<section class="section" id="histoire"><p class="eyebrow">L’histoire du lieu</p><p class="story">${esc(dossier.story)}</p></section>` : ''}${menu}<section class="section" id="contact"><p class="eyebrow">Le lieu</p><h2>${esc(dossier.city)}</h2><p>${esc(dossier.address || 'Adresse à confirmer')}</p>${contact}</section></main></body></html>`;
      const template = run.snapshot.template;
      const body = generatedHtml.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? generatedHtml;
      const style = generatedHtml.match(/<style>([\s\S]*)<\/style>/)?.[1] ?? '';
      const html = template ? renderTemplate(template.content, { title: dossier.title, content: body, style }) : generatedHtml;
      const result = await localStore.writeText(sitePath, html, { expectedHash: null });
      return { artifactPath: sitePath, artifactHash: result.hash, templateId: template?.id ?? null, templateVersionId: template?.versionId ?? null, pages: dossier.pages, embeddedAssets: image ? [image.name] : [] };
    },
    'simulation-report-build': async ({ input, run, store: localStore }) => {
      const reportPath = `${runPath(run.id)}/artifacts/report/report.html`;
      const facts = input['dossier-validation'];
      const plan = input['content-plan'];
      const menu = facts.menu.length ? `<ul>${facts.menu.map(item => `<li>${esc(item.name)}${item.price === null ? '' : ` · ${esc(item.price)}`}</li>`).join('')}</ul>` : '<p>Aucun plat fourni.</p>';
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapport - ${esc(facts.business.name)}</title><style>body{font:16px/1.55 system-ui;max-width:820px;margin:0 auto;padding:24px;color:#20211f;background:#f5f5f2}header{padding:clamp(28px,6vw,64px);background:#173024;color:#eef4ec}header p{color:#b8ce98}section{border-top:1px solid #d9dbd5;padding:28px 0}h1,h2{letter-spacing:-.04em}li{margin:6px 0}.evidence{color:#5a635c}a{color:#285947}:focus-visible{outline:2px solid #285947;outline-offset:4px}</style></head><body><header><p>ANCRAGE · RAPPORT LOCAL</p><h1>${esc(facts.business.name)}</h1><div>${esc(facts.business.city)}</div></header><main><section><h2>Histoire fournie</h2><p>${esc(facts.story || 'Aucune histoire fournie.')}</p></section><section><h2>Offre fournie</h2>${menu}</section><section><h2>Pages préparées</h2><ul>${plan.pages.map(page => `<li>${esc(page)}</li>`).join('')}</ul></section><section><h2>Preuves de génération</h2><p class="evidence">Le dossier source, le site et le rapport ont été écrits localement. La prochaine vérification porte sur le contenu avant présentation.</p><p class="evidence">Source du dossier : ${esc(facts.business.source || 'intake local')}</p></section></main></body></html>`;
      const result = await localStore.writeText(reportPath, html, { expectedHash: null });
      return { artifactPath: reportPath, artifactHash: result.hash, format: 'html' };
    },
    'simulation-quality-gate': async ({ input, store: localStore }) => {
      if (faults.has('quality-gate')) return null;
      const site = input['site-build'];
      const report = input['report-build'];
      const siteHtml = site?.artifactPath ? await localStore.readText(site.artifactPath, '') : '';
      const reportHtml = report?.artifactPath ? await localStore.readText(report.artifactPath, '') : '';
      const checks = [
        ['site-artifact', Boolean(site?.artifactHash && siteHtml.includes('<!doctype html>'))],
        ['site-responsive', siteHtml.includes('name="viewport"') && siteHtml.includes('@media')],
        ['site-content', siteHtml.includes('<h1>') && siteHtml.includes('ANCRAGE')],
        ['report-artifact', Boolean(report?.artifactHash && reportHtml.includes('<!doctype html>'))],
        ['report-provenance', reportHtml.includes('Source du dossier')],
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
  async function startDossier(dossierId, { fault = null } = {}) { faults.clear(); if (fault) faults.add(fault); await dossiers.get(dossierId); const current = await store.readText(`config/workflows/${workflowId}.json`, null); if (current === null) await store.writeJson(`config/workflows/${workflowId}.json`, clientSiteWorkflow, { expectedHash: null }); return engine.start(workflowId, { dossierId }); }
  async function start(profile = {}, { fault = null } = {}) { const dossier = await prepareDossier(profile); return startDossier(dossier.id, { fault }); }
  async function resume(runId, { fault = null } = {}) { faults.clear(); if (fault) faults.add(fault); return engine.resume(runId); }
  return { prepareDossier, resume, start, startDossier, workflowId };
}
