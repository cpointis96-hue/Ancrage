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
  const stages = result.stages.map(item => `<li><strong>${escapeHtml(item.id)}</strong> : ${escapeHtml(item.status)}${item.cause ? ` · ${escapeHtml(item.cause)}` : ''}</li>`).join('');
  const evidence = result.evidence.map(item => `<li>${escapeHtml(item.provider)} · ${escapeHtml(item.canonicalUrl)} · ${escapeHtml(item.rawPayloadHash)}</li>`).join('');
  const modules = kind === 'gmb'
    ? `<p>${result.modules.gmb?.candidates?.length ?? 0} établissement(s) public(s) retourné(s) dans le périmètre observé.</p>`
    : `<p>Site : ${escapeHtml(result.input.domain ?? result.modules.site?.candidates?.[0]?.url ?? 'non confirmé')}.</p><p>${result.modules.seo?.summary ? `${escapeHtml(result.modules.seo.summary.pagesAnalyzed)} page(s) analysée(s).` : 'Audit SEO de base non exécuté.'}</p><p>${result.modules.keywords?.ideas?.length ?? 0} piste(s) de mots-clés et ${result.modules.keywords?.competitors?.length ?? 0} concurrent(s) retournés.</p>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>body{font:16px/1.55 system-ui;max-width:860px;margin:auto;padding:24px;color:#20211f;background:#f5f5f2}header{background:#173024;color:#eef4ec;padding:32px}header small{color:#b8ce98}section{border-top:1px solid #d9dbd5;padding:24px 0}li{margin:8px 0;overflow-wrap:anywhere}small{color:#5a635c}</style></head><body><header><small>${escapeHtml(title.toUpperCase())} · ${escapeHtml(result.status)}</small><h1>${escapeHtml(result.input.name)}</h1><p>${escapeHtml(result.input.city.label)} · Observation : ${escapeHtml(result.startedAt)}</p></header><main><section><h2>Périmètre</h2>${modules}</section><section><h2>Étapes</h2><ul>${stages}</ul></section><section><h2>Limites</h2><p>Les branches absentes, partielles ou non confirmées restent explicitement signalées. Aucun résultat provider non observé n’est remplacé par une valeur synthétique.</p></section><section><h2>Preuves</h2>${evidence ? `<ul>${evidence}</ul>` : '<p>Aucune preuve provider livrée.</p>'}</section></main></body></html>`;
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
    if (!provider?.enabled || provider.health !== 'healthy' || !provider.configured || !adapters?.dataforseo) return null;
    const secret = await secretStore.get('provider:dataforseo');
    return secret ? { provider, secret } : null;
  }
  async function call({ runId, ledger, ready, stepId, capability, tasks, estimate, endpoint, optional = true }) {
    const started = Date.now();
    if (!ready) return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: 'DATAFORSEO_NOT_READY', durationMs: Date.now() - started };
    let authorization;
    try { authorization = await ledger.authorize({ stepId, provider: 'dataforseo', unit: 'request', quantity: 1, estimatedCost: estimate, essential: !optional }); }
    catch (error) { return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: error.code ?? 'COST_NOT_AUTHORIZED', durationMs: Date.now() - started }; }
    try {
      const adapter = adapters.dataforseo[endpoint];
      if (typeof adapter !== 'function') throw Object.assign(new Error('DataForSEO capability unavailable'), { code: 'CAPABILITY_UNAVAILABLE' });
      const payload = await adapter({ secret: ready.secret, tasks });
      const actualCost = typeof payload?.cost === 'number' ? payload.cost : estimate;
      const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost });
      return { status: settled.overLimit ? 'PARTIAL' : 'SUCCEEDED', cause: settled.overLimit ? 'BUDGET_EXCEEDED_AFTER_CALL' : null, capability, durationMs: Date.now() - started, evidence: createEvidenceSnapshot({ sourceType: 'provider', provider: 'dataforseo', canonicalUrl: `https://api.dataforseo.com/v3/${capability}`, observedAt: clock().toISOString(), requestParameters: { endpoint, tasks }, rawPayload: JSON.stringify(payload), ruleVersion: WORKFLOW_VERSION, licenseOrTermsRef: 'dataforseo-terms-pending', retentionClass: 'audit-provider-metadata' }), data: payload };
    } catch (error) {
      await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code ?? 'PROVIDER_CALL_FAILED' });
      return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: error.code ?? 'PROVIDER_CALL_FAILED', durationMs: Date.now() - started };
    }
  }
  function items(result) {
    const tasks = result?.tasks ?? result?.data?.tasks ?? [];
    return tasks.flatMap(task => task.result ?? []).flatMap(item => Array.isArray(item?.items) ? item.items : [item]);
  }
  function normalizeCandidates(result) {
    return items(result).slice(0, 5).map(item => ({
      title: item?.title ?? item?.name ?? null,
      url: item?.url ?? null,
      domain: item?.domain ?? null,
    }));
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
  async function create(input = {}) {
    const runStarted = Date.now();
    const name = text(input.name, 'name');
    const city = input.city;
    if (!city || typeof city !== 'object') throw new ValidationError('city est invalide.', { field: 'city' });
    const cityId = text(city.id, 'city.id', 120); const cityLabel = text(city.label, 'city.label'); const country = text(city.country, 'city.country', 3).toUpperCase();
    const domain = input.domain === undefined ? null : validUrl(input.domain);
    const budget = resolveAuditBudget(input.budget);
    const profile = resolveAuditProfile(input.profile);
    const normalized = { name, city: { id: cityId, label: cityLabel, country }, address: input.address ?? null, domain, profile, budget };
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
    const result = { id, workflowVersion: WORKFLOW_VERSION, status: 'RUNNING', input: normalized, startedAt: observedAt, updatedAt: observedAt, stages: [], evidence: [], modules: {}, reports: [], budget: actualLedger.snapshot() };
    await store.writeJson(pathFor(id), result, { immutable: true }); await addIndex(id);
    const save = async () => store.writeJson(pathFor(id), result);
    const maps = await call({ runId: id, ledger: actualLedger, ready, stepId: 'establishment-search', capability: 'serp/google/maps/live/advanced', endpoint: 'serpMapsLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, location_name: cityLabel, language_code: 'en' }], estimate: costs.serpMaps, optional: false });
    result.stages.push(stage('establishment-search', maps.status, { cause: maps.cause ?? null, durationMs: maps.durationMs })); if (maps.evidence) result.evidence.push(maps.evidence); result.modules.establishment = { candidates: normalizeCandidates(maps) };
    if (maps.status === 'BLOCKED') {
      for (const remaining of STAGES.slice(1)) result.stages.push(stage(remaining, 'BLOCKED', { cause: 'ESTABLISHMENT_GATE_FAILED' }));
      result.status = 'BLOCKED'; result.budget = actualLedger.snapshot(); result.durationMs = Date.now() - runStarted; result.updatedAt = clock().toISOString(); await save();
      if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
      return result;
    }
    const [discovered, gmb] = await Promise.all([
      call({ runId: id, ledger: actualLedger, ready, stepId: 'site-discovery', capability: 'serp/google/organic/live/advanced', endpoint: 'serpOrganicLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, location_name: cityLabel, language_code: 'en' }], estimate: costs.serpOrganicLiveAdvanced }),
      call({ runId: id, ledger: actualLedger, ready, stepId: 'gmb-audit', capability: 'business_data/business_listings/search/live', endpoint: 'businessListings', tasks: [{ keyword: name, location_name: cityLabel, language_code: 'en' }], estimate: costs.businessListings }),
    ]);
    result.stages.push(stage('site-discovery', discovered.status, { cause: discovered.cause ?? (domain ? null : 'SITE_NOT_CONFIRMED'), durationMs: discovered.durationMs })); if (discovered.evidence) result.evidence.push(discovered.evidence); result.modules.site = { providedDomain: domain, candidates: normalizeCandidates(discovered) };
    result.stages.push(stage('gmb-audit', gmb.status, { cause: gmb.cause ?? null, durationMs: gmb.durationMs })); if (gmb.evidence) result.evidence.push(gmb.evidence); result.modules.gmb = { candidates: normalizeCandidates(gmb) };
    await publishReport(result, 'gmb'); result.updatedAt = clock().toISOString(); await save();
    if (domain) {
      const seoStarted = Date.now();
      try {
        result.modules.seo = await runSeoAudit({ target: domain, observedAt, fetchImpl, lookup, profile });
        result.modules.seo.external = { onPage: 'NOT_RUN', cause: 'ASYNC_RESULT_RETRIEVAL_NOT_IMPLEMENTED' };
        result.stages.push(stage('seo-audit', result.modules.seo.status, { cause: null, durationMs: Date.now() - seoStarted }));
      }
      catch (error) { result.stages.push(stage('seo-audit', 'PARTIAL', { cause: error.code ?? 'SEO_AUDIT_FAILED', durationMs: Date.now() - seoStarted })); result.modules.seo = { status: 'PARTIAL' }; }
    } else { result.stages.push(stage('seo-audit', 'PARTIAL', { cause: 'SITE_NOT_CONFIRMED', durationMs: 0 })); result.modules.seo = { status: 'PARTIAL', cause: 'SITE_NOT_CONFIRMED' }; }
    const ideas = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_ideas/live', endpoint: 'keywordIdeasLive', tasks: [{ keywords: [name, `${name} ${cityLabel}`], location_name: cityLabel, language_code: 'en', limit: 25 }], estimate: costs.keywordIdeas });
    const overview = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_overview/live', endpoint: 'keywordOverview', tasks: [{ keywords: [name, `${name} ${cityLabel}`], location_name: cityLabel, language_code: 'en' }], estimate: costs.keywordOverview });
    const competitors = await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/serp_competitors/live', endpoint: 'serpCompetitors', tasks: [{ keywords: [`${name} ${cityLabel}`], location_name: cityLabel, language_code: 'en' }], estimate: costs.serpCompetitors });
    result.stages.push(stage('competitor-keywords', [ideas, overview, competitors].some(item => item.status === 'SUCCEEDED') ? 'SUCCEEDED' : 'PARTIAL', { cause: ideas.cause ?? overview.cause ?? competitors.cause ?? null, durationMs: ideas.durationMs + overview.durationMs + competitors.durationMs })); result.modules.keywords = { ideas: normalizeKeywords(ideas), overview: normalizeKeywords(overview), competitors: normalizeCandidates(competitors) }; for (const item of [ideas, overview, competitors]) if (item.evidence) result.evidence.push(item.evidence);
    result.modules.strategy = { intents: [`${cityLabel} ${name}`, `${name} menu`, `${name} contact`].map(value => ({ value, classification: 'SUGGESTED' })), source: 'deterministic-v1', facts: ['provider-results-required'], interpretation: { status: 'NOT_RUN', cause: 'AI_ROUTING_NOT_ACTIVATED' } };
    result.stages.push(stage('strategy', 'SUCCEEDED', { durationMs: 0 }));
    result.budget = actualLedger.snapshot(); result.status = result.stages.some(item => item.status === 'BLOCKED') ? 'BLOCKED' : result.stages.some(item => item.status === 'PARTIAL') ? 'PARTIAL' : 'SUCCEEDED'; result.durationMs = Date.now() - runStarted; await publishReport(result, 'final'); result.updatedAt = clock().toISOString(); await save();
    if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
    return result;
  }
  return { create, get, list, readReport };
}
