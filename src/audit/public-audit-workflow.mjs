import { buildPublicAuditDocument } from './report-document.mjs';
import { renderAuditDocumentPdf } from './report-pdf.mjs';
import { createHash } from 'node:crypto';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../core/errors.mjs';
import { createId } from '../core/ids.mjs';
import { createCostLedger } from '../runs/cost-ledger.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';
import { runSeoAudit } from './seo-audit-service.mjs';
import { resolveAuditBudget, resolveAuditProfile } from './audit-profile.mjs';
import { buildSeoResearchPlan, domainOf, mergeKeywordMetrics, qualifyCompetitorResults, qualifyKeywordResults, selectBusinessCompetitors } from './seo-qualification.mjs';
import { renderPublicAuditReport } from './public-audit-report.mjs';
import { assembleAuditPacket, projectAuditPacket } from './audit-packet.mjs';
import { validateJsonSchema } from '../core/json-schema.mjs';
import { runObservationAudit } from './observation-audit.mjs';

const INDEX_PATH = 'audit-runs/index.json';
const IDEMPOTENCY_PATH = key => `audit-runs/idempotency/${createHash('sha256').update(key).digest('hex')}.json`;
const WORKFLOW_VERSION = 'public-audit-v1';
const STAGES = ['establishment-search', 'site-discovery', 'gmb-audit', 'seo-audit', 'competitor-keywords', 'strategy'];
const reportPath = (id, kind) => `audit-runs/${id}/reports/${kind}.html`;
const packetPath = (id, revision) => `audit-runs/${id}/packets/${revision}.json`;

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
export function renderPublicAuditPdf(result, auditPacket = null) {
  return renderAuditDocumentPdf(buildPublicAuditDocument(result, 'final', auditPacket));
}

export function createPublicAuditWorkflow({ store, providers, adapters, secretStore, lookup, fetchImpl, contracts = null, seoResearchPlanner = null, observationAnalyst = null, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()) } = {}) {
  async function get(id) {
    const run = await store.readJson(pathFor(id), null);
    if (!run) throw new NotFoundError(`Run d’audit introuvable : ${id}`);
    return run;
  }
  async function list() {
    const ids = await store.readJson(INDEX_PATH, []);
    return Promise.all(ids.map(get));
  }
  function packetArtifacts(result, overrides = {}) {
    const current = Object.fromEntries((result.reports ?? []).map(item => [item.kind, item]));
    return {
      gmbReport: overrides.gmbReport ?? current.gmb?.path ?? null,
      finalReport: overrides.finalReport ?? current.final?.path ?? null,
      pdf: overrides.pdf ?? current.final?.pdfPath ?? null,
    };
  }
  async function publishPacket(result, artifacts = {}) {
    if (!contracts?.getActiveVersion) throw new AppError('Le contrat AuditPacket actif est requis.', { code: 'AUDIT_PACKET_CONTRACT_UNAVAILABLE', status: 503 });
    let activeContract;
    try { activeContract = await contracts.getActiveVersion('audit-packet'); }
    catch { throw new AppError('Le contrat AuditPacket actif est indisponible.', { code: 'AUDIT_PACKET_CONTRACT_UNAVAILABLE', status: 503 }); }
    const revision = (result.auditPacket?.revision ?? 0) + 1;
    const assembled = assembleAuditPacket({ auditRun: result, revision, artifacts: packetArtifacts(result, artifacts), packetContractVersion: activeContract.versionId });
    try { validateJsonSchema(activeContract.schema, assembled.packet); }
    catch { throw new AppError('La projection AuditPacket ne respecte pas son contrat actif.', { code: 'AUDIT_PACKET_INVALID', status: 503 }); }
    const snapshotRef = packetPath(result.id, revision);
    await store.writeJson(snapshotRef, assembled.packet, { immutable: true });
    result.auditPacket = { packetId: assembled.packet.packetId, revision, hash: assembled.hash, snapshotRef };
    result.auditProjection = projectAuditPacket(assembled.packet);
    return assembled.packet;
  }
  async function publishReport(result, kind) {
    const path = reportPath(result.id, kind);
    const pdfPath = kind === 'final' ? reportPath(result.id, 'final').replace(/\.html$/, '.pdf') : null;
    const packet = await publishPacket(result, kind === 'gmb' ? { gmbReport: path } : { finalReport: path, pdf: pdfPath });
    await store.writeText(path, renderPublicAuditReport(result, kind, packet), { immutable: true });
    if (pdfPath) await store.writeText(pdfPath, renderPublicAuditPdf(result, packet), { immutable: true });
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
  async function readPacket(id) {
    const run = await get(id);
    if (!run.auditPacket?.snapshotRef) throw new NotFoundError('AuditPacket introuvable.');
    const packet = await store.readJson(run.auditPacket.snapshotRef, null);
    if (!packet) throw new NotFoundError('AuditPacket introuvable.');
    return { packet, snapshot: run.auditPacket };
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
    if (ready.failure) return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: ready.failure, providerState: ready.state, execution: 'not-run', durationMs: 0 };
    if (ready.state !== 'ready') return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: ready.code, providerState: ready.state, execution: 'not-run', durationMs: Date.now() - started };
    let authorization;
    try { authorization = await ledger.authorize({ stepId, provider: 'dataforseo', unit: 'request', quantity: 1, estimatedCost: estimate, essential: !optional }); }
    catch (error) { return { status: optional ? 'PARTIAL' : 'BLOCKED', cause: error.code ?? 'COST_NOT_AUTHORIZED', durationMs: Date.now() - started }; }
    let payload;
    try {
      const adapter = adapters.dataforseo[endpoint];
      if (typeof adapter !== 'function') throw Object.assign(new Error('DataForSEO capability unavailable'), { code: 'CAPABILITY_UNAVAILABLE' });
      payload = await adapter({ secret: ready.secret, tasks });
    } catch (error) {
      const rejectedBeforeCharge = /^HTTP_4\d\d$/.test(error.code ?? '') || /^DATAFORSEO_40\d{3}$/.test(error.code ?? '') || ['CAPABILITY_UNAVAILABLE', 'INVALID_CREDENTIAL', 'MISSING_CREDENTIAL'].includes(error.code);
      if (ready.executionType === 'http' && !rejectedBeforeCharge) {
        ready.failure = 'COST_RECONCILIATION_REQUIRED';
        return { status: 'PARTIAL', cause: 'PROVIDER_COST_UNKNOWN_AFTER_FAILURE', providerState: ready.state, execution: 'real-http-call-failed', durationMs: Date.now() - started };
      }
      await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code ?? 'PROVIDER_CALL_FAILED' });
      const providerCode = Number(error.providerCode ?? String(error.code ?? '').replace('DATAFORSEO_', ''));
      const cause = [40200, 40210].includes(providerCode) ? 'DATAFORSEO_CREDIT_REQUIRED' : error.code === 'HTTP_402' ? 'DATAFORSEO_BILLING_REJECTED' : (error.code ?? 'PROVIDER_CALL_FAILED');
      if (cause === 'DATAFORSEO_CREDIT_REQUIRED' || cause === 'DATAFORSEO_BILLING_REJECTED') ready.failure = cause;
      return { status: optional ? 'PARTIAL' : 'BLOCKED', cause, providerState: ready.state, execution: ready.executionType === 'http' ? 'real-http-call-failed' : 'adapter-call-no-network-failed', durationMs: Date.now() - started };
    }
    const evidence = createEvidenceSnapshot({ sourceType: 'provider', provider: 'dataforseo', canonicalUrl: `https://api.dataforseo.com/v3/${capability}`, observedAt: clock().toISOString(), requestParameters: { endpoint, tasks }, rawPayload: JSON.stringify(payload), ruleVersion: WORKFLOW_VERSION, licenseOrTermsRef: 'dataforseo-terms-pending', retentionClass: 'audit-provider-metadata' });
    const execution = ready.executionType === 'http' ? 'real-http-call' : 'adapter-call-no-network';
    const actualCost = payload?.cost ?? (ready.executionType !== 'http' ? estimate : null);
    if (typeof actualCost !== 'number' || !Number.isFinite(actualCost) || actualCost < 0) {
      ready.failure = 'COST_RECONCILIATION_REQUIRED';
      return { status: 'PARTIAL', cause: 'PROVIDER_COST_UNAVAILABLE', execution, durationMs: Date.now() - started, evidence, data: payload };
    }
    let settled;
    try { settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost }); }
    catch {
      ready.failure = 'COST_RECONCILIATION_REQUIRED';
      return { status: 'PARTIAL', cause: 'COST_SETTLE_FAILED', execution, durationMs: Date.now() - started, evidence, data: payload };
    }
    const taskFailure = providerTaskFailed(payload);
    const billingTask = payload?.tasks?.find(task => [40200, 40210, 40203].includes(Number(task.status_code)));
    if (billingTask) ready.failure = [40200, 40210].includes(Number(billingTask.status_code)) ? 'DATAFORSEO_CREDIT_REQUIRED' : 'DATAFORSEO_BILLING_REJECTED';
    if (settled.overLimit) ready.failure = 'BUDGET_EXCEEDED_AFTER_CALL';
    return { status: settled.overLimit || taskFailure ? 'PARTIAL' : 'SUCCEEDED', cause: settled.overLimit ? 'BUDGET_EXCEEDED_AFTER_CALL' : billingTask ? ready.failure : taskFailure ? 'PROVIDER_TASK_FAILED' : null, capability, providerState: ready.state, execution, durationMs: Date.now() - started, evidence, data: taskFailure ? null : payload };
  }
  function summarizeProviderCall(result) {
    const { data, ...summary } = result;
    return summary;
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
      address: item?.address ?? null,
      phone: item?.phone ?? null,
      category: item?.category ?? null,
      placeId: item?.place_id ?? null,
      rating: item?.rating ?? null,
      observedAt: item?.last_updated_time ?? null,
    }));
}
function providerTaskFailed(payload) {
  return Number(payload?.tasks_error ?? 0) > 0 || (payload?.tasks ?? []).some(task => Number(task?.status_code ?? 20000) >= 40000);
}
function providerLocation(country, cityLabel) {
  return ({ FR: 'France', LK: 'Sri Lanka', AU: 'Australia', TH: 'Thailand' })[country] ?? cityLabel;
}
function resultItems(result) { return (result?.tasks ?? []).flatMap(task => task.result ?? []); }
function normalized(value) { return String(value ?? '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function findLocation(result, cityLabel, country) {
  const wantedCity = normalized(cityLabel); const wantedCountry = normalized(country);
  const locations = resultItems(result);
  return locations.find(item => normalized(item.location_name).includes(wantedCity) && (!wantedCountry || normalized(item.country_iso_code) === wantedCountry))
    ?? locations.find(item => normalized(item.country_iso_code) === wantedCountry)
    ?? locations.find(item => normalized(item.location_name).includes(wantedCity));
}
function findLanguage(result, preferred = 'en') {
  return resultItems(result).find(item => String(item.language_code ?? '') === preferred) ?? resultItems(result)[0] ?? null;
}
function findLabsPair(result, country, preferred = 'en') {
  const location = resultItems(result).find(item => normalized(item.country_iso_code) === normalized(country));
  const languages = location?.available_languages ?? [];
  const language = languages.find(item => item.language_code === preferred && item.available_sources?.includes('google'))
    ?? languages.find(item => item.available_sources?.includes('google'));
  return location && language ? { location_code: location.location_code, language_code: language.language_code } : null;
}
  function notRun(cause) { return { status: 'PARTIAL', cause, execution: 'not-run', durationMs: 0 }; }
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
    const fp = fingerprint({ ...normalized, enrichment: options.enrichment ?? null });
    if (key) {
      const previous = await store.readJson(IDEMPOTENCY_PATH(key.trim()), null);
      if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre requête.'); return get(previous.runId); }
    }
    const hardLimit = budget.hardLimit;
    const id = idFactory('audit-run');
    let ledgerSequence = 0;
    const actualLedger = createCostLedger({ store, runId: id, envelope: { hardLimit, currency: budget.currency ?? 'USD' }, clock, idFactory: prefix => `${idFactory(prefix)}-${ledgerSequence++}` });
    if (options.enrichment !== 'dataforseo') {
      const observedAt = clock().toISOString();
      const result = { id, workflowVersion: 'observation-audit-v1', status: 'RUNNING', input: normalized, startedAt: observedAt, updatedAt: observedAt, stages: [], evidence: [], modules: {}, reports: [], budget: actualLedger.snapshot() };
      await store.writeJson(pathFor(id), result, { immutable: true }); await addIndex(id);
      if (key) await store.writeJson(IDEMPOTENCY_PATH(key.trim()), { fingerprint: fp, runId: id }, { immutable: true });
      return runObservationAudit({ result, ledger: actualLedger, analyst: observationAnalyst, fetchImpl, lookup, publishReport, publishPacket, save: () => store.writeJson(pathFor(id), result), clock, waitForGmb: options.waitFor === 'gmb' });
    }
    const ready = await dataForSeoReady();
    const costs = budget.endpointCosts ?? {};
    const coordinates = identity?.coordinates;
    const dataForSeoLocation = async () => {
      if (ready.state !== 'ready') return { serp: null, business: null, labs: null };
      const adapter = adapters.dataforseo;
      const resolution = { serp: null, business: null, labs: null };
      try {
        if (adapter.serpLocations && adapter.serpLanguages) {
          const [locations, languages] = await Promise.all([
            adapter.serpLocations({ secret: ready.secret, country }),
            adapter.serpLanguages({ secret: ready.secret }),
          ]);
          const location = findLocation(locations, cityLabel, country);
          const language = findLanguage(languages, country === 'FR' ? 'fr' : 'en');
          if (location?.location_code && language?.language_code) resolution.serp = { location_code: location.location_code, language_code: language.language_code };
        }
        if (adapter.businessListingsLocations) {
          const locations = await adapter.businessListingsLocations({ secret: ready.secret, country });
          resolution.business = findLocation(locations, cityLabel, country) ?? null;
        }
        if (adapter.labsLocationsAndLanguages) {
          resolution.labs = findLabsPair(await adapter.labsLocationsAndLanguages({ secret: ready.secret }), country, country === 'FR' ? 'fr' : 'en');
        }
      } catch (error) {
        resultResolutionError = error.code ?? 'DATAFORSEO_LOCATION_RESOLUTION_FAILED';
      }
      return resolution;
    };
    let resultResolutionError = null;
    const resolvedLocations = localPreview ? { serp: null, business: null, labs: null } : await dataForSeoLocation();
    const dataForSeoAdapter = adapters?.dataforseo ?? {};
    const hasSerpResolvers = Boolean(dataForSeoAdapter.serpLocations && dataForSeoAdapter.serpLanguages);
    const hasBusinessResolver = Boolean(dataForSeoAdapter.businessListingsLocations);
    const serpTarget = resolvedLocations.serp ? { ...resolvedLocations.serp } : { location_name: cityLabel, language_code: 'en' };
    const labTarget = resolvedLocations.labs ?? { location_name: providerLocation(country, cityLabel), language_code: 'en' };
    const observedAt = clock().toISOString();
    const result = { id, workflowVersion: WORKFLOW_VERSION, status: 'RUNNING', input: normalized, startedAt: observedAt, updatedAt: observedAt, provider: ready.provider
      ? { id: ready.provider.id, configured: ready.provider.configured, enabled: ready.provider.enabled, health: ready.provider.health, readiness: ready.state, adapter: ready.adapter ? (ready.executionType === 'http' ? 'http' : 'adapter') : 'absent' }
      : { id: 'dataforseo', configured: false, enabled: false, health: 'absent', readiness: ready.state, adapter: ready.adapter ? 'adapter' : 'absent' }, stages: [], evidence: [], modules: {}, reports: [], budget: actualLedger.snapshot() };
    await store.writeJson(pathFor(id), result, { immutable: true }); await addIndex(id);
    const save = async () => store.writeJson(pathFor(id), result);
    const maps = localPreview
      ? { status: 'PARTIAL', cause: 'LOCAL_PREVIEW_WITHOUT_GMB', execution: 'not-run', durationMs: 0 }
      : ready.state === 'ready' && hasSerpResolvers && !resolvedLocations.serp
        ? { status: 'BLOCKED', cause: resultResolutionError ?? 'SERP_LOCATION_LANGUAGE_UNRESOLVED', execution: 'not-run', durationMs: 0 }
        : await call({ runId: id, ledger: actualLedger, ready, stepId: 'establishment-search', capability: 'serp/google/maps/live/advanced', endpoint: 'serpMapsLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, ...serpTarget }], estimate: costs.serpMaps, optional: false });
    const establishmentCandidates = normalizeCandidates(maps, name);
    const identityConfirmed = identity?.source === 'google-places';
    const independentlyConfirmed = Boolean(domain || identityConfirmed || localPreview);
    const establishmentStatus = maps.status === 'BLOCKED' && independentlyConfirmed ? 'PARTIAL' : maps.status;
    result.stages.push(stage('establishment-search', establishmentStatus, { cause: maps.cause ?? null, providerState: maps.providerState ?? ready.state, execution: maps.execution ?? 'not-run', durationMs: maps.durationMs })); if (maps.evidence) result.evidence.push(maps.evidence); result.modules.establishment = { selected: identityConfirmed ? { source: 'google-places', placeId: identity.placeId ?? null, name, address: identity.address ?? null } : null, candidates: establishmentCandidates };
    if (maps.status === 'BLOCKED' && !independentlyConfirmed) {
      for (const remaining of STAGES.slice(1)) result.stages.push(stage(remaining, 'BLOCKED', { cause: 'ESTABLISHMENT_GATE_FAILED', execution: 'not-run' }));
      result.status = 'BLOCKED'; result.budget = actualLedger.snapshot(); result.durationMs = Date.now() - runStarted; result.updatedAt = clock().toISOString(); await publishPacket(result); await save();
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
      ready.state === 'ready' && hasSerpResolvers && !resolvedLocations.serp
        ? Promise.resolve({ status: 'PARTIAL', cause: resultResolutionError ?? 'SERP_LOCATION_LANGUAGE_UNRESOLVED', execution: 'not-run', durationMs: 0 })
        : call({ runId: id, ledger: actualLedger, ready, stepId: 'site-discovery', capability: 'serp/google/organic/live/advanced', endpoint: 'serpOrganicLiveAdvanced', tasks: [{ keyword: `${name} ${cityLabel}`, ...serpTarget }], estimate: costs.serpOrganicLiveAdvanced }),
      localPreview
        ? Promise.resolve({ status: 'PARTIAL', cause: 'LOCAL_PREVIEW_WITHOUT_GMB', execution: 'not-run', durationMs: 0 })
        : identity?.source === 'google-places' && identity.placeId && coordinates && adapters.dataforseo?.myBusinessInfo
          ? call({ runId: id, ledger: actualLedger, ready, stepId: 'gmb-audit', capability: 'business_data/google/my_business_info/live', endpoint: 'myBusinessInfo', tasks: [{ keyword: `place_id:${identity.placeId}`, location_coordinate: `${coordinates.latitude},${coordinates.longitude},200`, language_code: country === 'FR' ? 'fr' : 'en' }], estimate: costs.myBusinessInfo })
        : coordinates
          ? ready.state === 'ready' && hasBusinessResolver && !resolvedLocations.business
            ? Promise.resolve({ status: 'PARTIAL', cause: resultResolutionError ?? 'BUSINESS_LISTINGS_LOCATION_UNRESOLVED', execution: 'not-run', durationMs: 0 })
            : call({ runId: id, ledger: actualLedger, ready, stepId: 'gmb-audit', capability: 'business_data/business_listings/search/live', endpoint: 'businessListings', tasks: [{ title: name, location_coordinate: `${coordinates.latitude},${coordinates.longitude},5`, limit: 10 }], estimate: costs.businessListings })
          : Promise.resolve({ status: 'PARTIAL', cause: 'GOOGLE_PLACES_COORDINATES_REQUIRED', execution: 'not-run', durationMs: 0 }),
    ]);
    const siteCandidates = normalizeCandidates(discovered, name);
    result.stages.push(stage('site-discovery', domain ? discovered.status : (discovered.status === 'BLOCKED' ? 'BLOCKED' : 'PARTIAL'), { cause: discovered.cause ?? (domain ? null : 'SITE_NOT_CONFIRMED'), providerState: discovered.providerState ?? ready.state, execution: discovered.execution ?? 'not-run', durationMs: discovered.durationMs })); if (discovered.evidence) result.evidence.push(discovered.evidence); result.modules.site = { providedDomain: domain, candidates: siteCandidates, confirmation: domain ? { status: 'CONFIRMED', source: normalized.domainSource } : { status: 'NOT_CONFIRMED', cause: 'SITE_NOT_CONFIRMED' } };
    const gmbCandidates = normalizeCandidates(gmb, name).filter(item => !identity?.placeId || !item.placeId || item.placeId === identity.placeId);
    const gmbStatus = gmb.status === 'SUCCEEDED' && gmbCandidates.length === 0 ? 'PARTIAL' : gmb.status;
    const gmbCause = gmb.cause ?? (gmbCandidates.length === 0 ? 'ESTABLISHMENT_NOT_CORROBORATED' : null);
    result.stages.push(stage('gmb-audit', gmbStatus, { cause: gmbCause, providerState: gmb.providerState ?? ready.state, execution: gmb.execution ?? 'not-run', durationMs: gmb.durationMs })); if (gmb.evidence) result.evidence.push(gmb.evidence); result.modules.gmb = { candidates: gmbCandidates, confirmation: { status: localPreview ? 'NOT_RUN' : gmbCandidates.length ? 'CANDIDATES_FOUND' : 'NOT_CONFIRMED', cause: localPreview ? 'LOCAL_PREVIEW_WITHOUT_GMB' : gmbCandidates.length ? null : gmbCause } };
    result.budget = actualLedger.snapshot();
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
    const observedCategories = [identity?.primaryTypeDisplayName, identity?.primaryType].filter(value => typeof value === 'string' && value.trim());
    const rankings = domain && resolvedLocations.labs && adapters.dataforseo?.rankedKeywords
      ? await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/ranked_keywords/live', endpoint: 'rankedKeywords', tasks: [{ target: domainOf(domain), ...labTarget, item_types: ['organic'], limit: 30, order_by: ['ranked_serp_element.serp_item.rank_group,asc'] }], estimate: costs.rankedKeywords })
      : notRun(domain ? 'RANKED_KEYWORDS_NOT_CONFIGURED' : 'SITE_NOT_CONFIRMED');
    const rankedKeywords = items(rankings).flatMap(item => {
      const keyword = item.keyword_data?.keyword; const serp = item.ranked_serp_element?.serp_item;
      return keyword && serp?.url && domainOf(serp.url) === domainOf(domain) ? [{ keyword, url: serp.url, position: serp.rank_group ?? null, absolutePosition: serp.rank_absolute ?? null, searchVolume: item.keyword_data?.keyword_info?.search_volume ?? null, observedAt: item.keyword_data?.serp_info?.last_updated_time ?? null, evidenceRef: rankings.evidence?.id ?? null }] : [];
    });
    const planner = seoResearchPlanner
      ? await seoResearchPlanner({ name, cityLabel, country, categories: observedCategories, sitePages: seoBase.module.pages ?? [], rankedKeywords, ledger: actualLedger, costEventsRef: `runs/${id}/cost-events.jsonl` })
      : { status: 'PARTIAL', cause: 'AI_ROUTING_NOT_CONFIGURED', execution: 'not-run', plan: null, source: 'deterministic-fallback' };
    const researchPlan = buildSeoResearchPlan({ name, cityLabel, country, identity, planned: planner.plan });
    const ideas = researchPlan.seeds.length
      ? await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_ideas/live', endpoint: 'keywordIdeasLive', tasks: [{ keywords: researchPlan.seeds, ...labTarget, limit: 50, include_serp_info: false, include_clickstream_data: false }], estimate: costs.keywordIdeas })
      : notRun('IDENTITY_CATEGORY_NOT_OBSERVED');
    const qualifiedKeywords = qualifyKeywordResults(ideas.data ?? ideas, researchPlan);
    let keywordIdeas = qualifiedKeywords.selected;
    const selectedKeywords = keywordIdeas.map(item => item.keyword).slice(0, 12);
    const overview = selectedKeywords.length
      ? await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/keyword_overview/live', endpoint: 'keywordOverview', tasks: [{ keywords: selectedKeywords, ...labTarget }], estimate: costs.keywordOverview })
      : notRun('NO_RELEVANT_KEYWORDS');
    if (overview.data) keywordIdeas = mergeKeywordMetrics(keywordIdeas, qualifyKeywordResults(overview.data, researchPlan).selected);
    const competitors = selectedKeywords.length
      ? await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'dataforseo_labs/google/serp_competitors/live', endpoint: 'serpCompetitors', tasks: [{ keywords: selectedKeywords, ...labTarget, item_types: ['organic'], limit: 5 }], estimate: costs.serpCompetitors })
      : notRun('NO_RELEVANT_KEYWORDS');
    const qualifiedCompetitors = qualifyCompetitorResults(competitors.data ?? competitors, { selectedKeywords, locality: cityLabel });
    const localFinder = coordinates && researchPlan.seeds.length
      ? await call({ runId: id, ledger: actualLedger, ready, stepId: 'competitor-keywords', capability: 'serp/google/local_finder/live/advanced', endpoint: 'serpLocalFinder', tasks: [{ keyword: researchPlan.seeds[0], location_coordinate: `${coordinates.latitude},${coordinates.longitude}`, language_code: serpTarget.language_code, depth: 10 }], estimate: costs.serpLocalFinder })
      : notRun(coordinates ? 'NO_LOCAL_QUERY' : 'GOOGLE_PLACES_COORDINATES_REQUIRED');
    const localCandidates = normalizeCandidates(localFinder, researchPlan.seeds[0])
      .map(item => ({ ...item, scope: 'local-serp', classification: 'LOCAL_COMPETITOR_OBSERVED', businessConfirmed: true, source: 'dataforseo_local_finder' }));
    const selectedCompetitors = selectBusinessCompetitors([...localCandidates, ...qualifiedCompetitors.candidates], { targetDomain: domain, targetName: name });
    const localCompetitors = selectedCompetitors.selected.filter(item => item.scopes.includes('local-serp'));
    const allCompetitors = selectedCompetitors.selected;
    const keywordStatus = keywordIdeas.length || allCompetitors.length ? 'SUCCEEDED' : 'PARTIAL';
    const researchCause = ideas.cause ?? overview.cause ?? competitors.cause ?? localFinder.cause ?? resultResolutionError ?? (keywordStatus === 'PARTIAL' ? 'NO_USABLE_KEYWORD_OR_COMPETITOR_RESULTS' : null);
    const researchExecutions = [planner.execution, ideas.execution, overview.execution, competitors.execution, localFinder.execution].filter(value => value && value !== 'not-run');
    const researchExecution = researchExecutions.some(value => value.startsWith('real-http-call')) ? 'real-http-call'
      : researchExecutions.some(value => value.startsWith('adapter-call-no-network')) ? 'adapter-call-no-network'
        : 'not-run';
    result.stages.push(stage('competitor-keywords', keywordStatus, { cause: researchCause, providerState: ready.state, execution: researchExecution, durationMs: ideas.durationMs + overview.durationMs + competitors.durationMs + localFinder.durationMs }));
    result.modules.keywords = { ideas: keywordIdeas, rejected: qualifiedKeywords.rejected, overview: summarizeProviderCall(overview), competitors: allCompetitors, competitorCandidates: selectedCompetitors.candidates, competitorRejected: selectedCompetitors.rejected, localCompetitors, researchPlan, planner: { status: planner.status, cause: planner.cause ?? null, execution: planner.execution, source: planner.source }, location: labTarget, execution: { ideas: ideas.execution ?? 'not-run', overview: overview.execution ?? 'not-run', competitors: competitors.execution ?? 'not-run', localFinder: localFinder.execution ?? 'not-run' } };
    result.modules.keywords.rankedKeywords = rankedKeywords;
    result.modules.keywords.rankings = summarizeProviderCall(rankings);
    for (const item of [ideas, overview, competitors, localFinder, rankings]) if (item.evidence) result.evidence.push(item.evidence);
    result.modules.strategy = { intents: researchPlan.seeds.map(value => ({ value, classification: 'SUGGESTED' })), recommendations: [!domain ? 'Confirmer le site officiel avant toute conclusion SEO technique.' : null, !gmbCandidates.length ? 'Vérifier l’identité et l’adresse avant de retenir une fiche GMB.' : null, !keywordIdeas.length && !allCompetitors.length ? 'Aucune recommandation concurrentielle n’est fondée sans résultat exploitable.' : null].filter(Boolean), source: 'deterministic-v1', facts: ['provider-results-required'], interpretation: { status: planner.status, cause: planner.cause ?? null } };
    result.stages.push(stage('strategy', 'SUCCEEDED', { durationMs: 0 }));
    result.budget = actualLedger.snapshot(); result.status = result.stages.some(item => item.status === 'PARTIAL' || item.status === 'BLOCKED') ? 'PARTIAL' : 'SUCCEEDED'; result.durationMs = Date.now() - runStarted; await publishReport(result, 'final'); result.updatedAt = clock().toISOString(); await save();
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
  return { create, get, list, readPacket, readReport };
}
