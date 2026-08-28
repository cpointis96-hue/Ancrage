import { createHash } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError, AppError } from '../core/errors.mjs';
import { createId } from '../core/ids.mjs';

const REQUEST_INDEX = 'public-control-plane/requests/index.json';
const requestPath = id => `public-control-plane/requests/${id}.json`;
const preparationPath = id => `public-control-plane/preparations/${id}.json`;
const idempotencyPath = (scope, key) => `public-control-plane/idempotency/${scope}-${createHash('sha256').update(key).digest('hex')}.json`;
const categories = new Set(['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service']);
const knownRights = new Set(['OWNED', 'AUTHORIZED', 'LICENSED']);

const text = (value, field, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ValidationError(`${field} est invalide.`, { field });
  return value.trim();
};
const fingerprint = value => JSON.stringify(value);
const emailHash = value => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
const response = value => JSON.parse(JSON.stringify(value));
function publicDomain(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new ValidationError('domain est invalide.', { field: 'domain' });
  let parsed; try { parsed = new URL(value.trim()); } catch { throw new ValidationError('domain est invalide.', { field: 'domain' }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) throw new ValidationError('domain est invalide.', { field: 'domain' });
  return parsed.toString().replace(/\/$/, '');
}

function nextAction(kind, reasonCode) { return { kind, reasonCode }; }

export function createPublicControlPlane({ store, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()), auditStarter = null, pipelineStarter = null, demoPresenter = null } = {}) {
  async function readRequest(id) {
    const value = await store.readJson(requestPath(id), null);
    if (!value) throw new NotFoundError(`Demande publique introuvable : ${id}`);
    return value;
  }
  async function saveRequest(value) { value.updatedAt = clock().toISOString(); await store.writeJson(requestPath(value.id), value); return projectRequest(value); }
  async function indexRequest(id) {
    const currentText = await store.readText(REQUEST_INDEX, null); const current = currentText === null ? [] : JSON.parse(currentText);
    if (current.includes(id)) return;
    await store.writeJson(REQUEST_INDEX, [...current, id].sort(), { expectedHash: currentText === null ? null : store.hashText(currentText) });
  }
  function projectRequest(value) {
    const result = response(value); delete result.emailHash;
    if (result.demoRequestId) result.preparation = { id: result.demoRequestId, status: result.preparationStatus };
    return result;
  }
  function requireKey(key) { return text(key, 'Idempotency-Key', 200); }
  function requireFinalReport(request) { if (request.state !== 'FINAL_REPORT_READY') throw new AppError('Le rapport final n’est pas disponible.', { code: 'REPORT_NOT_READY', status: 409 }); }
  function checklist(preparation) {
    const photos = [...categories].every(category => preparation.assets.some(asset => asset.category === category));
    const rights = preparation.assets.length === 5 && preparation.assets.every(asset => knownRights.has(asset.rightsStatus));
    return { ...preparation.checklist, photos, rights };
  }
  async function createRequest(input = {}) {
    const name = text(input.name, 'name'); const city = input.city;
    if (!city || typeof city !== 'object') throw new ValidationError('city est invalide.', { field: 'city' });
    const normalized = { name, city: { id: text(city.id, 'city.id', 120), label: text(city.label, 'city.label'), countryCode: text(city.countryCode, 'city.countryCode', 3).toUpperCase() }, domain: publicDomain(input.domain) };
    const key = requireKey(input.idempotencyKey); const fp = fingerprint(normalized); const previous = await store.readJson(idempotencyPath('request', key), null);
    if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre requête.'); return projectRequest(await readRequest(previous.requestId)); }
    const now = clock().toISOString(); const request = { id: idFactory('public-request'), schemaVersion: 'public-control-plane-v1', state: 'MATCHING', status: 'RUNNING', input: normalized, reports: [], checkpoints: [], nextAction: nextAction('DECIDE_MATCH', 'MATCH_REVIEW_REQUIRED'), warnings: [], errors: [], createdAt: now, updatedAt: now };
    await store.writeJson(requestPath(request.id), request); await indexRequest(request.id); await store.writeJson(idempotencyPath('request', key), { fingerprint: fp, requestId: request.id }, { immutable: true });
    return projectRequest(request);
  }
  async function decideMatch(requestId, input = {}) {
    const request = await readRequest(requestId); const decision = text(input.decision, 'decision', 40);
    if (!['CONFIRM', 'LOCAL_PREVIEW_WITHOUT_GMB'].includes(decision)) throw new ValidationError('decision est invalide.', { field: 'decision' });
    request.matchDecision = decision; request.state = decision === 'CONFIRM' ? 'AUDIT_IN_PROGRESS' : 'LOCAL_PREVIEW_WITHOUT_GMB'; request.nextAction = nextAction('WAIT', 'AUDIT_IN_PROGRESS'); await saveRequest(request);
    if (typeof auditStarter === 'function') {
      const reports = await auditStarter({ request: response(request), decision });
      if (reports?.gmb?.html) await publishReport(request, { kind: 'gmb', html: reports.gmb.html });
      if (reports?.final?.html) await publishReport(request, { kind: 'final', html: reports.final.html, pdf: reports.final.pdf });
    }
    return saveRequest(request);
  }
  async function seedSyntheticReport(requestId, { kind, html, pdf = null } = {}) {
    return publishReport(await readRequest(requestId), { kind, html, pdf });
  }
  async function publishReport(request, { kind, html, pdf = null } = {}) {
    if (!['gmb', 'final'].includes(kind) || typeof html !== 'string') throw new ValidationError('Rapport invalide.');
    const reportId = idFactory(`${kind}-report`); const htmlPath = `public-control-plane/reports/${reportId}.html`; await store.writeText(htmlPath, html, { immutable: true });
    let pdfPath = null; if (kind === 'final' && typeof pdf === 'string') { pdfPath = `public-control-plane/reports/${reportId}.pdf`; await store.writeText(pdfPath, pdf, { immutable: true }); }
    request.reports.push({ id: reportId, kind, status: kind === 'gmb' ? 'GMB_REPORT_READY' : 'FINAL_REPORT_READY', htmlPath, pdfPath, createdAt: clock().toISOString() }); const finalReady = request.reports.some(report => report.kind === 'final'); request.state = finalReady ? 'FINAL_REPORT_READY' : 'GMB_REPORT_READY'; request.status = 'SUCCEEDED'; request.nextAction = finalReady ? nextAction('PREPARE_SITE', 'FINAL_REPORT_READY') : nextAction('WAIT', 'SEO_MODULES_PENDING');
    return saveRequest(request);
  }
  async function listReports(requestId) { const request = await readRequest(requestId); return { requestId, state: request.state, reports: response(request.reports) }; }
  async function readReport(requestId, reportId, format = 'html') {
    const request = await readRequest(requestId); const report = request.reports.find(item => item.id === reportId); if (!report) throw new NotFoundError();
    if (format === 'pdf' && (!report.pdfPath || request.state !== 'FINAL_REPORT_READY')) throw new AppError('Le PDF final n’est pas disponible.', { code: 'REPORT_NOT_READY', status: 409 });
    const path = format === 'pdf' ? report.pdfPath : report.htmlPath; const value = await store.readText(path, null); if (value === null) throw new NotFoundError(); return { value, contentType: format === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8' };
  }
  async function createPreparation(requestId, input = {}) {
    const request = await readRequest(requestId); requireFinalReport(request); const email = text(input.email, 'email', 320); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('email est invalide.', { field: 'email' });
    const key = requireKey(input.idempotencyKey); const fp = fingerprint({ requestId, emailHash: emailHash(email) }); const previous = await store.readJson(idempotencyPath('preparation', key), null); if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre préparation.'); return projectPreparation(await readPreparation(previous.preparationId)); }
    const id = idFactory('demo-request'); const now = clock().toISOString(); const preparation = { id, requestId, emailHash: emailHash(email), status: 'INCOMPLETE', checklist: { criticalComplete: false, locale: false, photos: false, rights: false }, assets: [], pipelineRunId: null, createdAt: now, updatedAt: now };
    await store.writeJson(preparationPath(id), preparation); await store.writeJson(idempotencyPath('preparation', key), { fingerprint: fp, preparationId: id }, { immutable: true }); request.demoRequestId = id; request.preparationStatus = 'INCOMPLETE'; await saveRequest(request); return projectPreparation(preparation);
  }
  async function readPreparation(id) { const value = await store.readJson(preparationPath(id), null); if (!value) throw new NotFoundError(`Demande de démo introuvable : ${id}`); return value; }
  function projectPreparation(value) { const result = response(value); delete result.emailHash; return result; }
  async function savePreparation(value) { value.checklist = checklist(value); value.status = value.pipelineRunId ? (value.pipelineStatus ?? 'WEBSITE_FACTORY_RUNNING') : 'INCOMPLETE'; value.updatedAt = clock().toISOString(); await store.writeJson(preparationPath(value.id), value); return projectPreparation(value); }
  async function updateIntake(id, input = {}) { const preparation = await readPreparation(id); if (input.criticalComplete !== undefined && typeof input.criticalComplete !== 'boolean') throw new ValidationError('criticalComplete est invalide.', { field: 'criticalComplete' }); if (input.locale !== undefined) preparation.locale = text(input.locale, 'locale', 20); for (const field of ['address', 'contact', 'story', 'menu']) if (input[field] !== undefined) preparation.intake = { ...(preparation.intake ?? {}), [field]: input[field] }; preparation.checklist.criticalComplete = input.criticalComplete ?? preparation.checklist.criticalComplete; preparation.checklist.locale = Boolean(preparation.locale); return savePreparation(preparation); }
  async function addAsset(id, input = {}) { const preparation = await readPreparation(id); const asset = { assetId: text(input.assetId, 'assetId', 120), category: text(input.category, 'category', 40), rightsStatus: text(input.rightsStatus, 'rightsStatus', 20), hash: text(input.hash, 'hash', 128), size: Number.isInteger(input.size) && input.size > 0 ? input.size : 0 }; if (!categories.has(asset.category) || !knownRights.has(asset.rightsStatus) || !asset.size) throw new ValidationError('Asset photo invalide ou non autorisé.'); if (preparation.assets.some(item => item.category === asset.category)) throw new ConflictError('Cette catégorie de photo est déjà renseignée.'); preparation.assets.push(asset); return savePreparation(preparation); }
  async function start(id) { const preparation = await readPreparation(id); preparation.checklist = checklist(preparation); if (!preparation.checklist.criticalComplete || !preparation.checklist.locale || !preparation.checklist.photos || !preparation.checklist.rights) throw new AppError('La préparation est incomplète.', { code: 'PREPARATION_INCOMPLETE', status: 409 }); if (typeof pipelineStarter !== 'function') throw new AppError('Le pipeline de démo n’est pas configuré.', { code: 'PIPELINE_NOT_CONFIGURED', status: 503 }); const request = await readRequest(preparation.requestId); const started = await pipelineStarter({ request: response(request), preparation: response(preparation) }); if (!started?.runId) throw new AppError('Le pipeline de démo n’a pas fourni de run vérifiable.', { code: 'PIPELINE_START_FAILED', status: 503 }); preparation.pipelineRunId = text(started.runId, 'pipelineRunId', 120); preparation.pipelineStatus = started.status ?? 'WEBSITE_FACTORY_RUNNING'; preparation.acceptanceReport = started.acceptanceReport ?? null; return savePreparation(preparation); }
  async function validateDemo(id, decision) { const preparation = await readPreparation(id); if (!preparation.pipelineRunId) throw new AppError('Aucun pipeline à valider.', { code: 'PIPELINE_NOT_READY', status: 409 }); if (!['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) throw new ValidationError('Décision opérateur invalide.', { field: 'decision' }); if (typeof demoPresenter !== 'function') throw new AppError('La présentation de démo n’est pas configurée.', { code: 'DEMO_PRESENTATION_NOT_CONFIGURED', status: 503 }); const presented = await demoPresenter({ runId: preparation.pipelineRunId, decision }); preparation.pipelineStatus = decision === 'APPROVED' ? 'READY_FOR_PROSPECT' : 'NEEDS_CORRECTION'; preparation.presentation = presented ?? null; return savePreparation(preparation); }
  return { addAsset, createPreparation, createRequest, decideMatch, getDemoRequest: async id => projectPreparation(await readPreparation(id)), getRequest: async id => projectRequest(await readRequest(id)), listReports, readReport, seedSyntheticReport, start, updateIntake, validateDemo };
}
