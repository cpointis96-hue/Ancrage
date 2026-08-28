import { createHash } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors.mjs';
import { createId } from '../core/ids.mjs';
import { createCostLedger } from '../runs/cost-ledger.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';
import { runSeoAudit } from './seo-audit-service.mjs';
import { resolveAuditBudget, resolveAuditProfile } from './audit-profile.mjs';

const INDEX_PATH = 'audit-runs/index.json';
const IDEMPOTENCY_PATH = key => `audit-runs/idempotency/${createHash('sha256').update(key).digest('hex')}.json`;
const WORKFLOW_VERSION = 'public-audit-v1';
const STAGES = ['establishment-search', 'site-discovery', 'gmb-audit', 'seo-audit', 'competitor-keywords', 'strategy'];
const reportPath = (id, kind) => `audit-runs/${id}/reports/${kind}.html`;

function pathFor(id) { return `audit-runs/${id}/run.json`; }
function text(value, field, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ValidationError(`${field} est invalide.`, { field });
  return value.trim();
}
function validUrl(value, field = 'domain') {
  const url = text(value, field, 2048);
  let parsed;
  try { parsed = new URL(url); } catch { throw new ValidationError(`${field} est invalide.`, { field }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) throw new ValidationError(`${field} est invalide.`, { field });
  return parsed.toString().replace(/\/$/, '');
}
function fingerprint(input) { return JSON.stringify(input); }

function stage(id, status, extra = {}) { return { id, status, ...extra }; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function renderReport(result, kind) {
  const title = kind === 'gmb' ? 'Rapport GMB' : 'Rapport final SEO et concurrence';
  const displayStatus = kind === 'gmb' ? result.stages.find(item => item.id === 'gmb-audit')?.status ?? result.status : result.status;
  const stages = result.stages.map(item => `<li><strong>${escapeHtml(item.id)}</strong> : ${escapeHtml(item.status)}${item.cause ? ` · ${escapeHtml(item.cause)}` : ''}</li>`).join('');
  const evidence = result.evidence.map(item => `<li>${escapeHtml(item.provider)} · ${escapeHtml(item.canonicalUrl)} · ${escapeHtml(item.rawPayloadHash)}</li>`).join('');
  const gmbCandidates = result.modules.gmb?.candidates ?? [];
  const selectedEstablishment = result.modules.establishment?.selected ?? null;
  const selectedIdentity = selectedEstablishment ? `<p>Établissement sélectionné : ${escapeHtml(selectedEstablishment.name)}${selectedEstablishment.address ? ` · ${escapeHtml(selectedEstablishment.address)}` : ''}.</p>` : '';
  const keywordIdeas = result.modules.keywords?.ideas ?? [];
  const competitors = result.modules.keywords?.competitors ?? [];
  const body = kind === 'gmb'
    ? `<section><h2>Périmètre</h2>${selectedIdentity}<p>${gmbCandidates.length} établissement(s) correspondant(s) au nom recherché dans le périmètre observé.</p>${gmbCandidates.length ? `<ul>${gmbCandidates.map(item => `<li>${escapeHtml(item.title ?? 'Établissement sans nom')}</li>`).join('')}</ul>` : '<p>Aucun établissement n’a été suffisamment corroboré par la source GMB.</p>'}</section>`
    : `<section><h2>GMB</h2>${selectedIdentity}<p>${gmbCandidates.length} établissement(s) correspondant(s) au nom recherché.</p>${gmbCandidates.length ? `<ul>${gmbCandidates.map(item => `<li>${escapeHtml(item.title ?? 'Établissement sans nom')}</li>`).join('')}</ul>` : result.input.mode === 'LOCAL_PREVIEW_WITHOUT_GMB' ? '<p>Audit GMB non exécuté dans cet aperçu local.</p>' : '<p>Aucune correspondance GMB suffisamment corroborée.</p>'}</section><section><h2>Site et SEO</h2><p>Site : ${escapeHtml(result.input.domain ?? 'non confirmé')}.</p><p>${result.modules.seo?.summary ? `${escapeHtml(result.modules.seo.summary.pagesAnalyzed)} page(s) analysée(s).` : 'Audit SEO de base non exécuté.'}</p></section><section><h2>Mots-clés et concurrence</h2><p>${keywordIdeas.length} piste(s) de mots-clés et ${competitors.length} concurrent(s) utilisable(s).</p>${keywordIdeas.length ? `<ul>${keywordIdeas.map(item => `<li>${escapeHtml(item.keyword)}</li>`).join('')}</ul>` : '<p>Aucune piste exploitable retournée.</p>'}</section><section><h2>Recommandations</h2>${(result.modules.strategy?.recommendations ?? []).length ? `<ul>${result.modules.strategy.recommendations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Aucune recommandation fondée sur les données observées.</p>'}</section>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>body{font:16px/1.55 system-ui;max-width:860px;margin:auto;padding:24px;color:#20211f;background:#f5f5f2}header{background:#173024;color:#eef4ec;padding:32px}header small{color:#b8ce98}section{border-top:1px solid #d9dbd5;padding:24px 0}li{margin:8px 0;overflow-wrap:anywhere}small{color:#5a635c}</style></head><body><header><small>${escapeHtml(title.toUpperCase())} · ${escapeHtml(displayStatus)}</small><h1>${escapeHtml(result.input.name)}</h1><p>${escapeHtml(result.input.city.label)} · Observation : ${escapeHtml(result.startedAt)}</p></header><main>${body}<section><h2>Étapes</h2><ul>${stages}</ul></section><section><h2>Limites</h2><p>Les branches absentes, partielles ou non confirmées restent explicitement signalées. Aucun résultat provider non observé n’est remplacé par une valeur synthétique.</p></section><section><h2>Preuves</h2>${evidence ? `<ul>${evidence}</ul>` : '<p>Aucune preuve provider livrée.</p>'}</section></main></body></html>`;
}
function pdfText(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, character => `\\${character}`); }
function renderPdf(result) {
  const lines = [
    'Rapport final SEO et concurrence',
    result.input.name,
    `${result.input.city.label} - observation ${result.startedAt}`,
    '',
    `Statut : ${result.status}`,
    `Etablissements retournes : ${result.modules.gmb?.candidates?.length ?? 0}`,
    `Pistes de mots-cles : ${result.modules.keywords?.ideas?.length ?? 0}`,
    `Concurrents : ${result.modules.keywords?.competitors?.length ?? 0}`,
    `Preuves provider : ${result.evidence.length}`,
    '',
    'Les branches absentes, partielles ou non confirmees restent signalees.',
  ];
  const commands = ['BT', '/F1 11 Tf', '50 760 Td', ...lines.flatMap((line, index) => [index ? '0 -18 Td' : '', `(${pdfText(line)}) Tj`]).filter(Boolean), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) { offsets.push(Buffer.byteLength(pdf, 'ascii')); pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf, 'ascii'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

export function createPublicAuditWorkflow({ store, providers, adapters, secretStore, lookup, fetchImpl, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()) } = {}) {
  async function get(id) {
    const run = await store.readJson(pathFor(id), null);
    if (!run) throw new NotFoundError(`Run d’audit introuvable : ${id}`);
    return run;
  }
  async function list() {
    const ids = await store.readJson(INDEX_PATH, []);
    return Promise.all(ids.map(get));
  }
  async function publishReport(result, kind) {
    const path = reportPath(result.id, kind);
    await store.writeText(path, renderReport(result, kind), { immutable: true });
    const pdfPath = kind === 'final' ? reportPath(result.id, 'final').replace(/\.html$/, '.pdf') : null;
    if (pdfPath) await store.writeText(pdfPath, renderPdf(result), { immutable: true });
    result.reports = [...(result.reports ?? []).filter(item => item.kind !== kind), { kind, path, pdfPath, status: kind === 'gmb' ? result.stages.find(item => item.id === 'gmb-audit')?.status ?? 'PARTIAL' : result.status, availableAt: clock().toISOString() }];
  }
  async function readReport(id, kind = 'final', format = 'html') {
    const run = await get(id); if (!['gmb', 'final'].includes(kind)) throw new ValidationError('Rapport invalide.', { field: 'kind' });
    const report = run.reports?.find(item => item.kind === kind); if (!report) throw new NotFoundError('Rapport introuvable.');
    if (!['html', 'pdf'].includes(format) || (format === 'pdf' && kind !== 'final') || (format === 'pdf' && run.status !== 'SUCCEEDED' && run.status !== 'PARTIAL')) throw new ValidationError('Format de rapport invalide.');
    const path = format === 'pdf' ? report.pdfPath : report.path; if (!path) throw new NotFoundError('Rapport introuvable.');
    const value = await store.readText(path, null); if (value === null) throw new NotFoundError('Rapport introuvable.');
    return { value, contentType: format === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8', report };
  }
  async function addIndex(id) {
    const currentText = await store.readText(INDEX_PATH, null);
    const current = currentText === null ? [] : JSON.parse(currentText);
    if (current.includes(id)) return;
    await store.writeJson(INDEX_PATH, [...current, id].sort(), { expectedHash: currentText === null ? null : store.hashText(currentText) });
  }
  async function dataForSeoReady() {
    const provider = (await providers.list()).find(item => item.id === 'dataforseo');
    const adapter = adapters?.dataforseo;
    if (!provider) return { state: 'absent', code: 'DATAFORSEO_ABSENT', provider: null, adapter: Boolean(adapter) };
    if (!provider.configured) return { state: 'not-configured', code: 'DATAFORSEO_NOT_CONFIGURED', provider, adapter: Boolean(adapter) };
    if (provider.health !== 'healthy') return { state: 'unhealthy', code: 'DATAFORSEO_UNHEALTHY', provider, adapter: Boolean(adapter) };
    if (!provider.enabled) return { state: 'disabled', code: 'DATAFORSEO_DISABLED', provider, adapter: Boolean(adapter) };
    if (!adapter) return { state: 'adapter-not-configured', code: 'DATAFORSEO_ADAPTER_NOT_CONFIGURED', provider, adapter: false };
    const secret = await secretStore.get('provider:dataforseo');
    if (!secret) return { state: 'not-configured', code: 'DATAFORSEO_SECRET_ABSENT', provider, adapter: true };
    return { state: 'ready', code: null, provider, adapter: true, secret, executionType: adapter.executionType ?? 'adapter' };
  }
  async function call({ runId, ledger, ready, stepId, capability, tasks, estimate, endpoint, optional = true }) {
    const started = Date.now();
    if (ready.state !== 'ready') return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: ready.code, providerState: ready.state, execution: 'not-run', durationMs: Date.now() - started };
    let authorization;
    try { authorization = await ledger.authorize({ stepId, provider: 'dataforseo', unit: 'request', quantity: 1, estimatedCost: estimate, essential: !optional }); }
    catch (error) { return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: error.code ?? 'COST_NOT_AUTHORIZED', durationMs: Date.now() - started }; }
    try {
      const adapter = adapters.dataforseo[endpoint];
      if (typeof adapter !== 'function') throw Object.assign(new Error('DataForSEO capability unavailable'), { code: 'CAPABILITY_UNAVAILABLE' });
      const payload = await adapter({ secret: ready.secret, tasks });
      const actualCost = typeof payload?.cost === 'number' ? payload.cost : estimate;
      const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost });
      const taskFailure = providerTaskFailed(payload);
      return { status: settled.overLimit || taskFailure ? 'PARTIAL' : 'SUCCEEDED', cause: settled.overLimit ? 'BUDGET_EXCEEDED_AFTER_CALL' : taskFailure ? 'PROVIDER_TASK_FAILED' : null, capability, providerState: ready.state, execution: ready.executionType === 'http' ? 'real-http-call' : 'adapter-call-no-network', durationMs: Date.now() - started, evidence: createEvidenceSnapshot({ sourceType: 'provider', provider: 'dataforseo', canonicalUrl: `https://api.dataforseo.com/v3/${capability}`, observedAt: clock().toISOString(), requestParameters: { endpoint, tasks }, rawPayload: JSON.stringify(payload), ruleVersion: WORKFLOW_VERSION, licenseOrTermsRef: 'dataforseo-terms-pending', retentionClass: 'audit-provider-metadata' }), data: payload };
    } catch (error) {
      await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code ?? 'PROVIDER_CALL_FAILED' });
      return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: error.code ?? 'PROVIDER_CALL_FAILED', providerState: ready.state, execution: ready.executionType === 'http' ? 'real-http-call-failed' : 'adapter-call-no-network-failed', durationMs: Date.now() - started };
    }
  }
  function items(result) {
    const tasks = result?.tasks ?? result?.data?.tasks ?? [];
    return tasks.flatMap(task => task.result ?? []).flatMap(item => Array.isArray(item?.items) ? item.items : [item]);
  }
function normalizeQuery(value) {
  return String(value ?? '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function normalizeCandidates(result, query = '') {
  const terms = normalizeQuery(query).split(' ').filter(term => term.length >= 5);
  return items(result).filter(item => {
      if (!terms.length) return true;
      const haystack = normalizeQuery([item?.title, item?.name, item?.url, item?.domain, item?.address, item?.location].join(' '));
      return terms.some(term => haystack.includes(term));
    }).slice(0, 5).map(item => ({
      title: item?.title ?? item?.name ?? null,
      url: item?.url ?? null,
      domain: item?.domain ?? null,
    }));
}
function providerTaskFailed(payload) {
  return Number(payload?.tasks_error ?? 0) > 0 || (payload?.tasks ?? []).some(task => Number(task?.status_code ?? 20000) >= 40000);
}
function providerLocation(country, cityLabel) {
  return ({ FR: 'France', LK: 'Sri Lanka', AU: 'Australia', TH: 'Thailand' })[country] ?? cityLabel;
}
  function normalizeKeywords(result) {
    return items(result).slice(0, 25).map(item => ({
      keyword: item?.keyword ?? item?.keyword_data?.keyword ?? null,
      searchVolume: item?.keyword_info?.search_volume ?? item?.keyword_data?.keyword_info?.search_volume ?? null,
      competition: item?.keyword_info?.competition ?? item?.keyword_data?.keyword_info?.competition ?? null,
      cpc: item?.keyword_info?.cpc ?? item?.keyword_data?.keyword_info?.cpc ?? null,
      intent: item?.search_intent_info?.main_intent ?? item?.keyword_data?.search_intent_info?.main_intent ?? null,
    })).filter(item => item.keyword);
  }
  async function create(input = {}, options = {}) {
    const runStarted = Date.now();
    const name = text(input.name, 'name');
    const city = input.city;
    if (!city || typeof city !== 'object') throw new ValidationError('city est invalide.', { field: 'city' });
    const cityId = text(city.id, 'city.id', 120); const cityLabel = text(city.label, 'city.label'); const country = text(city.country, 'city.country', 3).toUpperCase();
    const domain = input.domain === undefined ? null : validUrl(input.domain);
    const budget = resolveAuditBudget(input.budget);
    const profile = resolveAuditProfile(input.profile);
    const identity = input.identity && typeof input.identity === 'object' ? input.identity : null;
    const localPreview = options.mode === 'LOCAL_PREVIEW_WITHOUT_GMB';
    const normalized = { name, city: { id: cityId, label: cityLabel, country }, address: input.address ?? identity?.address ?? null, domain, domainSource: domain ? (input.domainSource === 'google-places' ? 'google-places' : 'request') : null, identity, mode: localPreview ? 'LOCAL_PREVIEW_WITHOUT_GMB' : 'CONFIRM', profile, budget };
    const key = input.idempotencyKey;
    if (key !== undefined && (typeof key !== 'string' || !key.trim() || key.length > 200)) throw new ValidationError('idempotencyKey est invalide.', { field: 'idempotencyKey' });
    const fp = fingerprint(normalized);
    if (key) {
      const previous = await store.readJson(IDEMPOTENCY_PATH(key.trim()), null);
      if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre requête.'); return get(previous.runId); }
    }
    const hardLimit = budget.hardLimit;
    const id = idFactory('audit-run');
    let ledgerSequence = 0;
    const actualLedger = createCostLedger({ store, runId: id, envelope: { hardLimit, currency: budget.currency ?? 'USD' }, clock, idFactory: prefix => `${idFactory(prefix)}-${ledgerSequence++}` });
    const ready = await dataForSeoReady();
    const costs = budget.endpointCosts ?? {};
    const observedAt = clock().toISOString();
    const result = { id, workflowVersion: WORKFLOW_VERSION, status: 'RUNNING', input: normalized, startedAt: observedAt, updatedAt: observedAt, provider: ready.provider
      ? { id: ready.provider.id, configured: ready.provider.configured, enabled: ready.provider.enabled, health: ready.provider.health, readiness: ready.state, adapter: ready.adapter ? (ready.executionType === 'http' ? 'http' : 'adapter') : 'absent' }
      : { id: 'dataforseo', configured: false, enabled: false, health: 'absent', readiness: ready.state, adapter: ready.adapter ? 'adapter' : 'absent' }, stages: [], evidence: [], modules: {}, reports: [], budget: actualLedger.snapshot() };
    await store.writeJson(pathFor(id), result, { immutable: true }); await addIndex(id);
    const save = async () => store.writeJson(pathFor(id), result);
    const maps = localPreview
      ? { status: 'PARTIAL', cause: 'LOCAL_PREVIEW_WITHOUT_GMB', execution: 'not-run', durationMs: 0 }
      : await call({ runId: id, ledger: actualLedger, ready, stepId: 'establishment-search', capability: 'serp/google/maps/live/advanced', endpoint: 'serpMapsLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, location_name: cityLabel, language_code: 'en' }], estimate: costs.serpMaps, optional: false });
    const establishmentCandidates = normalizeCandidates(maps, name);
    result.stages.push(stage('establishment-search', maps.status, { cause: maps.cause ?? null, providerState: maps.providerState ?? ready.state, execution: maps.execution ?? 'not-run', durationMs: maps.durationMs })); if (maps.evidence) result.evidence.push(maps.evidence); result.modules.establishment = { selected: identity?.source === 'google-places' ? { source: 'google-places', placeId: identity.placeId ?? null, name, address: identity.address ?? null } : null, candidates: establishmentCandidates };
    if (maps.status === 'BLOCKED') {
      for (const remaining of STAGES.slice(1)) result.stages.push(stage(remaining, 'BLOCKED', { cause: 'ESTABLISHMENT_GATE_FAILED', execution: 'not-run' }));
      result.status = 'BLOCKED'; result.budget = actualLedger.snapshot(); result.durationMs = Date.now() - runStarted; result.updatedAt = clock().toISOString(); await save();
      if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
      return result;
    }
    const seoBasePromise = domain ? (async () => {
      const seoStarted = Date.now();
      try {
        const module = await runSeoAudit({ target: domain, observedAt, fetchImpl, lookup, profile });
        return { module, durationMs: Date.now() - seoStarted };
      } catch (error) {
        return { module: { status: 'PARTIAL', cause: error.code ?? 'SEO_AUDIT_FAILED' }, durationMs: Date.now() - seoStarted };
      }
    })() : Promise.resolve({ module: { status: 'BLOCKED', cause: 'SITE_NOT_CONFIRMED', execution: 'not-run' }, durationMs: 0 });
    const [discovered, gmb] = await Promise.all([
      call({ runId: id, ledger: actualLedger, ready, stepId: 'site-discovery', capability: 'serp/google/organic/live/advanced', endpoint: 'serpOrganicLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, location_name: cityLabel, language_code: 'en' }], estimate: costs.serpOrganicLiveAdvanced }),
      localPreview
        ? Promise.resolve({ status: 'PARTIAL', cause: 'LOCAL_PREVIEW_WITHOUT_GMB', execution: 'not-run', durationMs: 0 })
        : call({ runId: id, ledger: actualLedger, ready, stepId: 'gmb-audit', capability: 'business_data/business_listings/search/live', endpoint: 'businessListings', tasks: [{ keyword: name, location_name: cityLabel, language_code: 'en' }], estimate: costs.businessListings }),
    ]);
    const siteCandidates = normalizeCandidates(discovered, name);
    result.stages.push(stage('site-discovery', domain ? discovered.status : (discovered.status === 'BLOCKED' ? 'BLOCKED' : 'PARTIAL'), { cause: discovered.cause ?? (domain ? null : 'SITE_NOT_CONFIRMED'), providerState: discovered.providerState ?? ready.state, execution: discovered.execution ?? 'not-run', durationMs: discovered.durationMs })); if (discovered.evidence) result.evidence.push(discovered.evidence); result.modules.site = { providedDomain: domain, candidates: siteCandidates, confirmation: domain ? { status: 'CONFIRMED', source: normalized.domainSource } : { status: 'NOT_CONFIRMED', cause: 'SITE_NOT_CONFIRMED' } };
    const gmbCandidates = normalizeCandidates(gmb, name);
    const gmbStatus = gmb.status === 'SUCCEEDED' && gmbCandidates.length === 0 ? 'PARTIAL' : gmb.status;
    const gmbCause = gmb.cause ?? (gmbCandidates.length === 0 ? 'ESTABLISHMENT_NOT_CORROBORATED' : null);
    result.stages.push(stage('gmb-audit', gmbStatus, { cause: gmbCause, providerState: gmb.providerState ?? ready.state, execution: gmb.execution ?? 'not-run', durationMs: gmb.durationMs })); if (gmb.evidence) result.evidence.push(gmb.evidence); result.modules.gmb = { candidates: gmbCandidates, confirmation: { status: localPreview ? 'NOT_RUN' : gmbCandidates.length ? 'CANDIDATES_FOUND' : 'NOT_CONFIRMED', cause: localPreview ? 'LOCAL_PREVIEW_WITHOUT_GMB' : gmbCandidates.length ? null : 'ESTABLISHMENT_NOT_CORROBORATED' } };
    if (!localPreview) await publishReport(result, 'gmb'); result.updatedAt = clock().toISOString(); await save();
    const continueAfterGmb = async () => {
    try {
    const [seoBase, onPage] = await Promise.all([
      seoBasePromise,
      domain
        ? call({ runId: id, ledger: actualLedger, ready, stepId: 'seo-audit', capability: 'on_page/instant_pages', endpoint: 'onPageInstantPages', tasks: [{ url: domain }] , estimate: costs.onPage })
        : Promise.resolve({ status: 'PARTIAL', cause: 'SITE_NOT_CONFIRMED', durationMs: 0 }),
    ]);
    const seoStatus = !domain ? 'BLOCKED' : (seoBase.module.status === 'BLOCKED' ? 'BLOCKED' : seoBase.module.status === 'PARTIAL' || onPage.status === 'PARTIAL' ? 'PARTIAL' : 'SUCCEEDED');
    const seoCause = !domain ? 'SITE_NOT_CONFIRMED' : seoBase.module.cause ?? onPage.cause ?? null;
    result.modules.seo = { ...seoBase.module, status: seoStatus, execution: domain ? 'local-crawl' : 'not-run', external: { crawl: domain ? seoBase.module.status : 'BLOCKED', onPage: domain ? onPage.status : 'BLOCKED', cause: seoCause } };
    if (onPage.evidence) result.evidence.push(onPage.evidence);
    result.stages.push(stage('seo-audit', seoStatus, { cause: seoCause, providerState: onPage.providerState ?? null, execution: domain ? onPage.execution ?? seoBase.module.execution ?? 'local-crawl' : 'not-run', durationMs: seoBase.durationMs + onPage.durationMs }));
    const keywordLocation = providerLocation(country, cityLabel);
    const ideas = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_ideas/live', endpoint: 'keywordIdeasLive', tasks: [{ keywords: [name, `${name} ${cityLabel}`], location_name: keywordLocation, language_code: 'en', limit: 25 }], estimate: costs.keywordIdeas });
    const overview = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_overview/live', endpoint: 'keywordOverview', tasks: [{ keywords: [name, `${name} ${cityLabel}`], location_name: keywordLocation, language_code: 'en' }], estimate: costs.keywordOverview });
    const competitors = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/serp_competitors/live', endpoint: 'serpCompetitors', tasks: [{ keywords: [`${name} ${cityLabel}`], location_name: keywordLocation, language_code: 'en' }], estimate: costs.serpCompetitors });
    const keywordIdeas = normalizeKeywords(ideas); const keywordCompetitors = normalizeCandidates(competitors); const keywordStatus = keywordIdeas.length || keywordCompetitors.length ? 'SUCCEEDED' : 'PARTIAL';
    result.stages.push(stage('competitor-keywords', keywordStatus, { cause: ideas.cause ?? overview.cause ?? competitors.cause ?? (keywordStatus === 'PARTIAL' ? 'NO_USABLE_KEYWORD_OR_COMPETITOR_RESULTS' : null), providerState: ready.state, execution: [ideas, overview, competitors].some(item => item.execution === 'real-http-call') ? 'real-http-call' : [ideas, overview, competitors].some(item => item.execution) ? 'adapter-call-no-network' : 'not-run', durationMs: ideas.durationMs + overview.durationMs + competitors.durationMs })); result.modules.keywords = { ideas: keywordIdeas, overview, competitors: keywordCompetitors, execution: { ideas: ideas.execution ?? 'not-run', overview: overview.execution ?? 'not-run', competitors: competitors.execution ?? 'not-run' } }; for (const item of [ideas, overview, competitors]) if (item.evidence) result.evidence.push(item.evidence);
    result.modules.strategy = { intents: [`${cityLabel} ${name}`, `${name} menu`, `${name} contact`].map(value => ({ value, classification: 'SUGGESTED' })), recommendations: [!domain ? 'Confirmer le site officiel avant toute conclusion SEO technique.' : null, !gmbCandidates.length ? 'Vérifier l’identité et l’adresse avant de retenir une fiche GMB.' : null, !keywordIdeas.length && !keywordCompetitors.length ? 'Aucune recommandation concurrentielle n’est fondée sans résultat exploitable.' : null].filter(Boolean), source: 'deterministic-v1', facts: ['provider-results-required'], interpretation: { status: 'NOT_RUN', cause: 'AI_ROUTING_NOT_ACTIVATED' } };
    result.stages.push(stage('strategy', 'SUCCEEDED', { durationMs: 0 }));
    result.budget = actualLedger.snapshot(); result.status = result.stages.some(item => item.status === 'BLOCKED' && item.id !== 'seo-audit') ? 'BLOCKED' : result.stages.some(item => item.status === 'PARTIAL' || item.status === 'BLOCKED') ? 'PARTIAL' : 'SUCCEEDED'; result.durationMs = Date.now() - runStarted; await publishReport(result, 'final'); result.updatedAt = clock().toISOString(); await save();
    if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
    return result;
    } catch (error) {
      for (const stageId of ['seo-audit', 'competitor-keywords', 'strategy']) if (!result.stages.some(item => item.id === stageId)) result.stages.push(stage(stageId, 'PARTIAL', { cause: error.code ?? 'AUDIT_CONTINUATION_FAILED', execution: 'not-run', durationMs: 0 }));
      result.modules.strategy ??= { intents: [], recommendations: [], source: 'deterministic-v1', facts: [], interpretation: { status: 'NOT_RUN', cause: error.code ?? 'AUDIT_CONTINUATION_FAILED' } };
      result.status = 'PARTIAL'; result.budget = actualLedger.snapshot(); result.durationMs = Date.now() - runStarted; result.updatedAt = clock().toISOString(); await publishReport(result, 'final'); await save();
      if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
      return result;
    }
    };
    if (options.waitFor === 'gmb') return { ...result, completion: continueAfterGmb() };
    return continueAfterGmb();
  }
  return { create, get, list, readReport };
}
