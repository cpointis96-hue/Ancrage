import { createHash, randomBytes } from 'node:crypto';
import { link, open, readFile, rename, unlink } from 'node:fs/promises';
import { ConflictError, NotFoundError, ValidationError, AppError } from '../core/errors.mjs';
import { createId } from '../core/ids.mjs';
import { validateJsonSchema } from '../core/json-schema.mjs';

const REQUEST_INDEX = 'public-control-plane/requests/index.json';
const requestPath = id => `public-control-plane/requests/${id}.json`;
const preparationPath = id => `public-control-plane/preparations/${id}.json`;
const idempotencyPath = (scope, key) => `public-control-plane/idempotency/${scope}-${createHash('sha256').update(key).digest('hex')}.json`;
const categories = new Set(['facade', 'signature-dish-1', 'signature-dish-2', 'interior-or-terrace', 'team-or-service']);
const knownRights = new Set(['OWNED', 'AUTHORIZED', 'LICENSED']);
const imageTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
const maxImageBytes = 700 * 1024;
const reportTtlMs = 7 * 24 * 60 * 60 * 1000;

const text = (value, field, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ValidationError(`${field} est invalide.`, { field });
  return value.trim();
};
const fingerprint = value => JSON.stringify(value);
const emailHash = value => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
const response = value => JSON.parse(JSON.stringify(value));
const isProcessAlive = pid => {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== 'ESRCH'; }
};
function publicDomain(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new ValidationError('domain est invalide.', { field: 'domain' });
  let parsed; try { parsed = new URL(value.trim()); } catch { throw new ValidationError('domain est invalide.', { field: 'domain' }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) throw new ValidationError('domain est invalide.', { field: 'domain' });
  return parsed.toString().replace(/\/$/, '');
}

function publicIdentity(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object') throw new ValidationError('identity est invalide.', { field: 'identity' });
  if (value.source === 'google-places') {
    const coordinates = value.coordinates;
    if (coordinates !== undefined && (!coordinates || typeof coordinates !== 'object' || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude))) throw new ValidationError('identity.coordinates est invalide.', { field: 'identity.coordinates' });
    const types = Array.isArray(value.types) ? value.types.map((item, index) => text(item, `identity.types.${index}`, 120)).slice(0, 20) : [];
    const categories = Array.isArray(value.categories) ? value.categories.map((item, index) => text(item, `identity.categories.${index}`, 120)).slice(0, 20) : [];
    return {
      source: value.source,
      placeId: text(value.placeId, 'identity.placeId', 200),
      address: text(value.address, 'identity.address', 500),
      ...(coordinates ? { coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude } } : {}),
      ...(typeof value.primaryType === 'string' && value.primaryType.trim() ? { primaryType: text(value.primaryType, 'identity.primaryType', 120) } : {}),
      ...(typeof value.primaryTypeDisplayName === 'string' && value.primaryTypeDisplayName.trim() ? { primaryTypeDisplayName: text(value.primaryTypeDisplayName, 'identity.primaryTypeDisplayName', 120) } : {}),
      ...(types.length ? { types } : {}),
      ...(categories.length ? { categories } : {}),
    };
  }
  if (value.source === 'manual') return { source: value.source, address: value.address && typeof value.address === 'object' ? response(value.address) : text(value.address, 'identity.address', 500) };
  throw new ValidationError('identity est invalide.', { field: 'identity' });
}

function nextAction(kind, reasonCode) { return { kind, reasonCode }; }

function optionalText(value, field, max = 4000) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) throw new ValidationError(`${field} est invalide.`, { field });
  return value.trim();
}

function normalizeMenu(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new ValidationError('menu est invalide.', { field: 'menu' });
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new ValidationError('Plat invalide.', { field: `menu.${index}` });
    const name = optionalText(item.name, `menu.${index}.name`, 160);
    const priceText = String(item.price ?? '').trim().replace(',', '.');
    const price = Number(priceText.match(/^\d+(?:\.\d+)?/)?.[0] ?? NaN);
    if (!name || !Number.isFinite(price) || price < 0 || price > 100000) throw new ValidationError('Chaque plat doit avoir un nom et un prix valide.', { field: `menu.${index}` });
    return { name, price };
  });
}

function hasCriticalIntake(preparation) {
  const intake = preparation.intake ?? {};
  return Boolean(optionalText(intake.address, 'address', 500) && optionalText(intake.contact, 'contact', 320) && Array.isArray(intake.menu) && intake.menu.length > 0 && intake.menu.every(item => item?.name && Number.isFinite(item.price)));
}

function normalizeHours(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 7) throw new ValidationError('hours est invalide.', { field: 'hours' });
  const days = new Set();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new ValidationError('hours est invalide.', { field: `hours.${index}` });
    const day = text(item.day, `hours.${index}.day`, 12).toUpperCase();
    const opens = text(item.opens, `hours.${index}.opens`, 5);
    const closes = text(item.closes, `hours.${index}.closes`, 5);
    if (!['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(day) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(opens) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(closes) || days.has(day)) throw new ValidationError('hours est invalide.', { field: `hours.${index}` });
    days.add(day);
    return { day, opens, closes };
  });
}

function preparationDraft(request, preparation) {
  const intake = preparation.intake ?? {};
  const packet = request.audit?.packet ?? null;
  const packetDraft = packet?.preparationDraft ?? {};
  const packetValue = field => packetDraft[field] ?? { value: null, source: 'NONE', confirmation: 'REQUIRED' };
  const value = (field, current) => current !== undefined && current !== null && current !== ''
    ? preparation.packetPrefill?.[field] && JSON.stringify(current) === JSON.stringify(preparation.packetPrefill[field].value)
      ? { field, value: current, source: preparation.packetPrefill[field].source, confirmation: preparation.ownerConfirmed ? 'CONFIRMED' : preparation.packetPrefill[field].confirmation }
      : { field, value: current, source: 'PROSPECT_INPUT', confirmation: preparation.ownerConfirmed ? 'CONFIRMED' : 'REQUIRED' }
    : { field, ...packetValue(field) };
  return {
    id: `draft-${preparation.id}`,
    auditPacketRef: request.audit?.auditPacket?.packetId ?? request.audit?.id ?? request.id,
    revision: 1,
    ...(request.audit?.auditPacket ? { auditPacket: request.audit.auditPacket } : {}),
    locale: preparation.locale,
    values: [
      value('name', request.input.name),
      value('address', intake.address),
      value('contact', intake.contact),
      value('hours', intake.hours),
      value('menu', intake.menu),
      ...preparation.assets.map(asset => ({ field: `photo:${asset.category}`, value: asset.assetId, source: 'OWNER_AUTHORIZED_ASSET', confirmation: 'CONFIRMED' })),
    ],
  };
}

export function createPublicControlPlane({ store, contracts = null, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()), auditStarter = null, siteSpecComposer = null, pipelineStarter = null, pipelineReconciler = null, demoPresenter = null, startLockTimeoutMs = 60_000 } = {}) {
  const starts = new Map();
  if (!Number.isInteger(startLockTimeoutMs) || startLockTimeoutMs < 1 || startLockTimeoutMs > 300_000) throw new ValidationError('startLockTimeoutMs est invalide.', { field: 'startLockTimeoutMs' });
  const lockPath = id => store.resolveSafe(`public-control-plane/preparations/${id}.start.lock`);
  const lockMetadata = token => {
    const acquiredAt = clock();
    return JSON.stringify({ token, pid: process.pid, acquiredAt: acquiredAt.toISOString(), expiresAt: new Date(acquiredAt.getTime() + startLockTimeoutMs).toISOString() });
  };
  async function writeStartLock(filePath, token, { exclusive = false } = {}) {
    const temporaryPath = `${filePath}.${randomBytes(12).toString('hex')}.tmp`;
    const handle = await open(temporaryPath, 'wx', 0o600);
    try {
      await handle.writeFile(lockMetadata(token), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      if (exclusive) await link(temporaryPath, filePath);
      else await rename(temporaryPath, filePath);
    } finally {
      await unlink(temporaryPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  const readLockMetadata = async filePath => {
    try {
      const value = JSON.parse(await readFile(filePath, 'utf8'));
      if (!value || typeof value.token !== 'string' || !value.token || !Number.isInteger(value.pid) || value.pid < 1 || !Number.isFinite(Date.parse(value.expiresAt))) return null;
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      return null;
    }
  };
  async function acquireStartLock(id) {
    if (store.acquireLease) {
      const key = `public-control-plane/preparations/${id}.start.lock`;
      const token = idFactory('pipeline-lock');
      if (!await store.acquireLease(key, token, startLockTimeoutMs)) return null;
      const lock = { key, token, released: false, renewal: Promise.resolve() };
      lock.heartbeat = setInterval(() => renewStartLock(lock).catch(() => {}), Math.max(1, Math.floor(startLockTimeoutMs / 3)));
      lock.heartbeat.unref?.();
      return lock;
    }
    const filePath = lockPath(id);
    const token = idFactory('pipeline-lock');
    try {
      await writeStartLock(filePath, token, { exclusive: true });
      const lock = { lockPath: filePath, token, released: false, renewal: Promise.resolve() };
      const heartbeat = setInterval(() => renewStartLock(lock).catch(() => {}), Math.max(1, Math.floor(startLockTimeoutMs / 3)));
      heartbeat.unref?.();
      lock.heartbeat = heartbeat;
      return lock;
    } catch (error) {
      if (error.code === 'EEXIST') return null;
      throw error;
    }
  }
  async function renewStartLock(lock) {
    const renewal = lock.renewal.then(async () => {
      if (lock.released) return false;
      if (store.renewLease) return store.renewLease(lock.key, lock.token, startLockTimeoutMs);
      const metadata = await readLockMetadata(lock.lockPath);
      if (!metadata || metadata.token !== lock.token || lock.released) return false;
      if (process.env.NODE_ENV === 'test') await globalThis.__ANCRAGE_TEST_START_LEASE_HOOKS__?.afterRead?.({ token: lock.token });
      if (lock.released) return false;
      await writeStartLock(lock.lockPath, lock.token);
      return !lock.released;
    });
    lock.renewal = renewal.catch(() => false);
    return renewal;
  }
  async function releaseStartLock(lock) {
    try {
      clearInterval(lock.heartbeat);
      lock.released = true;
      await lock.renewal;
      if (store.releaseLease) return store.releaseLease(lock.key, lock.token);
      const metadata = await readLockMetadata(lock.lockPath);
      if (metadata?.token === lock.token) await unlink(lock.lockPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  async function startLockState(id) {
    if (store.leaseState) return store.leaseState(`public-control-plane/preparations/${id}.start.lock`);
    const filePath = lockPath(id);
    const metadata = await readLockMetadata(filePath);
    if (!metadata) {
      const exists = await readFile(filePath, 'utf8').then(() => true).catch(error => {
        if (error.code === 'ENOENT') return false;
        throw error;
      });
      return { state: exists ? 'ACTIVE' : 'MISSING' };
    }
    if (new Date(metadata.expiresAt).getTime() > clock().getTime() || isProcessAlive(metadata.pid)) return { state: 'ACTIVE', metadata };
    return { state: 'EXPIRED', metadata };
  }
  async function recoverExpiredStartLock(id, expectedToken) {
    if (store.recoverExpiredLease) return store.recoverExpiredLease(`public-control-plane/preparations/${id}.start.lock`, expectedToken);
    const filePath = lockPath(id);
    const metadata = await readLockMetadata(filePath);
    if (!metadata || metadata.token !== expectedToken || new Date(metadata.expiresAt).getTime() > clock().getTime() || isProcessAlive(metadata.pid)) return 'ACTIVE';
    const recoveryPath = `${filePath}.${createHash('sha256').update(metadata.token).digest('hex')}.recovery`;
    try { await rename(filePath, recoveryPath); }
    catch (error) { if (error.code === 'ENOENT') return 'MISSING'; throw error; }
    const moved = await readLockMetadata(recoveryPath);
    if (!moved || moved.token !== metadata.token || new Date(moved.expiresAt).getTime() > clock().getTime() || isProcessAlive(moved.pid)) {
      await rename(recoveryPath, filePath).catch(() => {});
      return 'ACTIVE';
    }
    await unlink(recoveryPath);
    return 'RECOVERED';
  }
  async function validateContract(id, value, code) {
    if (!contracts?.getActiveVersion) throw new AppError('Le contrat requis n’est pas configuré.', { code, status: 503 });
    let contract;
    try {
      contract = await contracts.getActiveVersion(id);
    } catch (error) {
      throw new AppError('La sortie ne respecte pas son contrat.', { code, status: 503 });
    }
    try {
      const validated = validateJsonSchema(contract.schema, value);
      if (id === 'acceptance-report' && !isAcceptanceReportConsistent(validated)) throw new ValidationError('AcceptanceReport incohérent.');
      return validated;
    }
    catch { throw new AppError('La sortie ne respecte pas son contrat.', { code, status: 503 }); }
  }
  function isAcceptanceReportConsistent(report) {
    const gateStatuses = report.gates.map(gate => gate.status);
    if (report.status === 'PASS') return gateStatuses.every(status => status === 'PASS');
    if (report.status === 'WARN') return gateStatuses.includes('WARN') && !gateStatuses.includes('BLOCK');
    return report.status === 'BLOCK' && gateStatuses.includes('BLOCK');
  }
  function checkpoint(key, status, { reportId = null, blockedReason = null, progressLabel = null } = {}) {
    const defaultLabels = { match: 'Établissement confirmé.', 'gmb-report': 'Rapport GMB disponible.', 'final-report': 'Rapport final disponible.' };
    return { key, status, validatedAt: clock().toISOString(), evidenceRefs: reportId ? [reportId] : [], progressLabel: progressLabel ?? defaultLabels[key] ?? key, ...(blockedReason ? { blockedReason } : {}) };
  }
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
    result.reports = (result.reports ?? []).map(({ id, kind, status, createdAt, expiresAt }) => ({ id, kind, status, createdAt, expiresAt }));
    if (result.demoRequestId) result.preparation = { id: result.demoRequestId, status: result.preparationStatus };
    return result;
  }
  function requireKey(key) { return text(key, 'Idempotency-Key', 200); }
  function requireFinalReport(request) { if (request.state !== 'FINAL_REPORT_READY') throw new AppError('Le rapport final n’est pas disponible.', { code: 'REPORT_NOT_READY', status: 409 }); }
  function checklist(preparation) {
    const photos = [...categories].every(category => preparation.assets.some(asset => asset.category === category));
    const rights = photos && preparation.assets.length === 5 && preparation.assets.every(asset => knownRights.has(asset.rightsStatus));
    return { ...preparation.checklist, criticalComplete: hasCriticalIntake(preparation), locale: Boolean(preparation.locale), hours: Array.isArray(preparation.intake?.hours) && preparation.intake.hours.length > 0, ownerConfirmation: preparation.ownerConfirmed === true, photos, rights };
  }
  async function createRequest(input = {}) {
    if (store.withLock) return store.withLock('public-control-plane/requests/registry.lock', () => createRequestUnlocked(input));
    return createRequestUnlocked(input);
  }
  async function createRequestUnlocked(input = {}) {
    const name = text(input.name, 'name'); const city = input.city;
    if (!city || typeof city !== 'object') throw new ValidationError('city est invalide.', { field: 'city' });
    const normalized = { name, city: { id: text(city.id, 'city.id', 120), label: text(city.label, 'city.label'), countryCode: text(city.countryCode, 'city.countryCode', 3).toUpperCase() }, domain: publicDomain(input.domain), identity: publicIdentity(input.identity) };
    const key = requireKey(input.idempotencyKey); const fp = fingerprint(normalized); const previous = await store.readJson(idempotencyPath('request', key), null);
    if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre requête.'); return projectRequest(await readRequest(previous.requestId)); }
    const now = clock().toISOString(); const request = { id: idFactory('public-request'), schemaVersion: 'public-control-plane-v1', state: 'MATCHING', status: 'RUNNING', input: normalized, reports: [], checkpoints: [], nextAction: nextAction('DECIDE_MATCH', 'MATCH_REVIEW_REQUIRED'), warnings: [], errors: [], createdAt: now, updatedAt: now };
    await store.writeJson(requestPath(request.id), request); await indexRequest(request.id); await store.writeJson(idempotencyPath('request', key), { fingerprint: fp, requestId: request.id }, { immutable: true });
    return projectRequest(request);
  }
  async function decideMatch(requestId, input = {}) {
    if (store.withLock) return store.withLock(`public-control-plane/requests/${requestId}.lock`, () => decideMatchUnlocked(requestId, input));
    return decideMatchUnlocked(requestId, input);
  }
  async function decideMatchUnlocked(requestId, input = {}) {
    const request = await readRequest(requestId); const decision = text(input.decision, 'decision', 40);
    if (!['CONFIRM', 'LOCAL_PREVIEW_WITHOUT_GMB'].includes(decision)) throw new ValidationError('decision est invalide.', { field: 'decision' });
    if (store.withLock && request.matchDecision) {
      if (request.matchDecision !== decision) throw new ConflictError('La décision a déjà été enregistrée.');
      return projectRequest(request);
    }
    if (decision === 'CONFIRM' && typeof auditStarter === 'function' && !request.input.identity) throw new AppError('Une identité confirmée est nécessaire pour lancer cet audit.', { code: 'MATCH_IDENTITY_REQUIRED', status: 409 });
    request.matchDecision = decision; request.state = decision === 'CONFIRM' ? 'AUDIT_IN_PROGRESS' : 'LOCAL_PREVIEW_WITHOUT_GMB'; request.checkpoints = [...(request.checkpoints ?? []).filter(item => item.key !== 'match'), checkpoint('match', 'SUCCEEDED', { progressLabel: decision === 'CONFIRM' ? 'Établissement confirmé.' : 'Aperçu local autorisé.' })]; if (decision === 'LOCAL_PREVIEW_WITHOUT_GMB') request.checkpoints.push(checkpoint('gmb-report', 'PARTIAL', { blockedReason: 'LOCAL_PREVIEW_WITHOUT_GMB', progressLabel: 'Audit GMB non exécuté.' })); request.nextAction = nextAction('WAIT', 'AUDIT_IN_PROGRESS'); await saveRequest(request);
    if (typeof auditStarter === 'function') {
      const reports = await auditStarter({ request: response(request), decision });
      if (reports?.audit) request.audit = response(reports.audit);
      if (reports?.gmb?.html) await publishReport(request, { kind: 'gmb', html: reports.gmb.html, pdf: reports.gmb.pdf });
      if (reports?.final?.html) await publishReport(request, { kind: 'final', html: reports.final.html, pdf: reports.final.pdf });
      if (reports?.completion instanceof Promise) reports.completion.then(async finalReport => { if (finalReport?.audit) request.audit = response(finalReport.audit); if (finalReport?.html) await publishReport(request, { kind: 'final', html: finalReport.html, pdf: finalReport.pdf }); }).catch(async error => { request.status = 'PARTIAL'; request.errors.push({ code: error.code ?? 'AUDIT_COMPLETION_FAILED' }); await saveRequest(request); });
      if (!reports?.deferred && !reports?.gmb?.html && !reports?.final?.html && !(reports?.completion instanceof Promise)) { request.status = reports?.audit?.status === 'BLOCKED' ? 'BLOCKED' : 'PARTIAL'; request.errors.push({ code: reports?.audit?.status === 'BLOCKED' ? 'AUDIT_BLOCKED' : 'AUDIT_REPORT_NOT_AVAILABLE' }); }
    }
    return saveRequest(request);
  }
  async function refreshAudit(requestId) {
    const refresh = async () => {
      const request = await readRequest(requestId);
      if (!request.matchDecision || request.reports.some(item => item.kind === 'final') || typeof auditStarter !== 'function') return projectRequest(request);
      const reports = await auditStarter({ request: response(request), decision: request.matchDecision });
      if (reports?.audit) request.audit = response(reports.audit);
      for (const kind of ['gmb', 'final']) if (reports?.[kind]?.html && !request.reports.some(item => item.kind === kind)) await publishReport(request, { kind, html: reports[kind].html, pdf: reports[kind].pdf });
      if (reports?.audit?.status === 'BLOCKED') { request.status = 'BLOCKED'; request.errors.push({ code: 'AUDIT_BLOCKED' }); }
      return saveRequest(request);
    };
    return store.withLock ? store.withLock(`public-control-plane/requests/${requestId}.lock`, refresh) : refresh();
  }
  async function seedSyntheticReport(requestId, { kind, html, pdf = null } = {}) {
    return publishReport(await readRequest(requestId), { kind, html, pdf });
  }
  async function publishReport(request, { kind, html, pdf = null } = {}) {
    if (!['gmb', 'final'].includes(kind) || typeof html !== 'string') throw new ValidationError('Rapport invalide.');
    const reportId = idFactory(`${kind}-report`); const htmlPath = `public-control-plane/reports/${reportId}.html`; await store.writeText(htmlPath, html, { immutable: true });
    let pdfPath = null; if (typeof pdf === 'string') { pdfPath = `public-control-plane/reports/${reportId}.pdf`; await store.writeText(pdfPath, pdf, { immutable: true }); }
    const createdAt = clock(); request.reports.push({ id: reportId, kind, status: kind === 'gmb' ? 'GMB_REPORT_READY' : 'FINAL_REPORT_READY', htmlPath, pdfPath, createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + reportTtlMs).toISOString(), revokedAt: null }); const finalReady = request.reports.some(report => report.kind === 'final'); request.checkpoints = [...(request.checkpoints ?? []).filter(item => item.key !== `${kind}-report`), checkpoint(`${kind}-report`, 'SUCCEEDED', { reportId })]; request.state = finalReady ? 'FINAL_REPORT_READY' : 'GMB_REPORT_READY'; const auditStatus = request.audit?.status; request.status = finalReady ? (auditStatus === 'BLOCKED' ? 'BLOCKED' : auditStatus === 'PARTIAL' ? 'PARTIAL' : 'SUCCEEDED') : 'RUNNING'; request.nextAction = finalReady ? nextAction('PREPARE_SITE', 'FINAL_REPORT_READY') : nextAction('WAIT', 'SEO_MODULES_PENDING');
    return saveRequest(request);
  }
  async function getDemoRequest(id) { return projectPreparation(await readPreparation(id)); }
  async function listRequests() { return Promise.all((await store.readJson(REQUEST_INDEX, [])).map(async requestId => projectRequest(await readRequest(requestId)))); }
  async function listDemoRequests() { const requests = await listRequests(); return Promise.all(requests.filter(request => request.demoRequestId).map(async request => ({ request, preparation: await getDemoRequest(request.demoRequestId) }))); }
  async function listReports(requestId) { const request = await readRequest(requestId); return { requestId, state: request.state, reports: request.reports.map(({ id, kind, status, createdAt, expiresAt }) => ({ id, kind, status, createdAt, expiresAt })) }; }
  async function readReport(requestId, reportId, format = 'html') {
    const request = await readRequest(requestId); const report = request.reports.find(item => item.id === reportId); if (!report) throw new NotFoundError(); if (report.revokedAt) throw new AppError('Le rapport a été révoqué.', { code: 'REPORT_REVOKED', status: 410 }); if (report.expiresAt && new Date(report.expiresAt).getTime() <= clock().getTime()) throw new AppError('Le rapport a expiré.', { code: 'REPORT_EXPIRED', status: 410 });
    if (format === 'pdf' && (!report.pdfPath || (report.kind === 'final' && request.state !== 'FINAL_REPORT_READY'))) throw new AppError('Le PDF n’est pas disponible.', { code: 'REPORT_NOT_READY', status: 409 });
    const path = format === 'pdf' ? report.pdfPath : report.htmlPath; const value = await store.readText(path, null); if (value === null) throw new NotFoundError(); return { value, contentType: format === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8' };
  }
  async function createPreparation(requestId, input = {}) {
    const request = await readRequest(requestId); requireFinalReport(request); const email = text(input.email, 'email', 320); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('email est invalide.', { field: 'email' });
    const key = requireKey(input.idempotencyKey); const fp = fingerprint({ requestId, emailHash: emailHash(email) }); const previous = await store.readJson(idempotencyPath('preparation', key), null); if (previous) { if (previous.fingerprint !== fp) throw new ConflictError('La clé d’idempotence est déjà associée à une autre préparation.'); return projectPreparation(await readPreparation(previous.preparationId)); }
    if (request.demoRequestId) {
      const existing = await readPreparation(request.demoRequestId);
      if (existing.emailHash !== emailHash(email)) throw new ConflictError('Cette demande de démo est déjà liée à une autre adresse e-mail.');
      await store.writeJson(idempotencyPath('preparation', key), { fingerprint: fp, preparationId: existing.id }, { immutable: true });
      return projectPreparation(existing);
    }
    const packetDraft = request.audit?.packet?.preparationDraft ?? null;
    const packetPrefill = packetDraft ? Object.fromEntries([
      ['address', packetDraft.address], ['contact', packetDraft.contact], ['hours', packetDraft.hours], ['menu', packetDraft.menu],
    ].filter(([, item]) => item && item.value !== null && item.value !== undefined && (Array.isArray(item.value) ? item.value.length : true))) : {};
    const intake = {
      ...(packetPrefill.address ? { address: packetPrefill.address.value } : {}),
      ...(packetPrefill.contact ? { contact: packetPrefill.contact.value } : {}),
      ...(packetPrefill.hours ? { hours: packetPrefill.hours.value } : {}),
      ...(packetPrefill.menu ? { menu: packetPrefill.menu.value } : {}),
    };
    const id = idFactory('demo-request'); const now = clock().toISOString(); const preparation = { id, requestId, emailHash: emailHash(email), status: 'INCOMPLETE', checklist: { criticalComplete: false, locale: false, hours: false, ownerConfirmation: false, photos: false, rights: false }, ...(Object.keys(intake).length ? { intake } : {}), ...(Object.keys(packetPrefill).length ? { packetPrefill } : {}), assets: [], pipelineRunId: null, createdAt: now, updatedAt: now };
    await store.writeJson(preparationPath(id), preparation); await store.writeJson(idempotencyPath('preparation', key), { fingerprint: fp, preparationId: id }, { immutable: true }); request.demoRequestId = id; request.preparationStatus = 'INCOMPLETE'; await saveRequest(request); return projectPreparation(preparation);
  }
  async function readPreparation(id) { const value = await store.readJson(preparationPath(id), null); if (!value) throw new NotFoundError(`Demande de démo introuvable : ${id}`); return value; }
  function projectPreparation(value) { const result = response(value); delete result.emailHash; delete result.packetPrefill; for (const asset of result.assets ?? []) { delete asset.assetPath; delete asset.mimeType; } return result; }
  function requireEditable(preparation) { if (preparation.pipelineRunId) throw new ConflictError('La préparation est gelée pendant et après le pipeline.'); }
  async function savePreparation(value) { value.checklist = checklist(value); value.status = value.pipelineStatus ?? (value.pipelineRunId ? 'WEBSITE_FACTORY_RUNNING' : 'INCOMPLETE'); value.updatedAt = clock().toISOString(); await store.writeJson(preparationPath(value.id), value); return projectPreparation(value); }
  async function updateIntake(id, input = {}) { const preparation = await readPreparation(id); requireEditable(preparation); if (input.criticalComplete !== undefined && typeof input.criticalComplete !== 'boolean') throw new ValidationError('criticalComplete est invalide.', { field: 'criticalComplete' }); if (input.ownerConfirmed !== undefined) { if (typeof input.ownerConfirmed !== 'boolean') throw new ValidationError('ownerConfirmed est invalide.', { field: 'ownerConfirmed' }); preparation.ownerConfirmed = input.ownerConfirmed; } if (input.locale !== undefined) preparation.locale = text(input.locale, 'locale', 20); for (const field of ['address', 'contact', 'story']) if (input[field] !== undefined) preparation.intake = { ...(preparation.intake ?? {}), [field]: optionalText(input[field], field, field === 'story' ? 12000 : field === 'address' ? 500 : 320) }; if (input.hours !== undefined) preparation.intake = { ...(preparation.intake ?? {}), hours: normalizeHours(input.hours) }; if (input.menu !== undefined) preparation.intake = { ...(preparation.intake ?? {}), menu: normalizeMenu(input.menu) }; return savePreparation(preparation); }
  async function addAsset(id, input = {}) {
    const preparation = await readPreparation(id);
    requireEditable(preparation);
    const asset = { assetId: text(input.assetId, 'assetId', 120), category: text(input.category, 'category', 40), rightsStatus: text(input.rightsStatus, 'rightsStatus', 20), hash: text(input.hash, 'hash', 128), size: Number.isInteger(input.size) && input.size > 0 ? input.size : 0 };
    if (!categories.has(asset.category) || !knownRights.has(asset.rightsStatus) || !asset.size) throw new ValidationError('Asset photo invalide ou non autorisé.');
    if (preparation.assets.some(item => item.category === asset.category)) throw new ConflictError('Cette catégorie de photo est déjà renseignée.');
    if (input.dataUrl !== undefined) {
      if (typeof input.dataUrl !== 'string') throw new ValidationError('Image invalide.', { field: 'dataUrl' });
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.dataUrl);
      if (!match || !imageTypes.has(match[1])) throw new ValidationError('Format d’image non autorisé.', { field: 'dataUrl' });
      const value = Buffer.from(match[2], 'base64');
      const signature = match[1] === 'image/png'
        ? value.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : match[1] === 'image/jpeg'
          ? value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff
          : value.subarray(0, 4).toString('ascii') === 'RIFF' && value.subarray(8, 12).toString('ascii') === 'WEBP';
      if (!value.length || value.length > maxImageBytes || !signature || value.length !== asset.size) throw new ValidationError('Le contenu de l’image est invalide.', { field: 'dataUrl' });
      const assetPath = `public-control-plane/preparations/${preparation.id}/assets/${asset.category}.${imageTypes.get(match[1])}`;
      const written = await store.writeBuffer(assetPath, value, { expectedHash: null });
      asset.assetPath = assetPath;
      asset.mimeType = match[1];
      asset.hash = written.hash;
    }
    preparation.assets.push(asset);
    return savePreparation(preparation);
  }
  async function startReserved(id, lock) {
    const currentText = await store.readText(preparationPath(id), null);
    if (currentText === null) throw new NotFoundError(`Demande de démo introuvable : ${id}`);
    const preparation = JSON.parse(currentText);
    preparation.checklist = checklist(preparation);
    if (preparation.pipelineRunId) return projectPreparation(preparation);
    if (preparation.pipelineStatus === 'WEBSITE_FACTORY_STARTING') throw new AppError('Le pipeline de démo est déjà en cours de démarrage.', { code: 'PIPELINE_START_IN_PROGRESS', status: 409, details: { retryable: true, nextAction: 'WAIT' } });
    if (preparation.pipelineStatus === 'PIPELINE_START_FAILED') throw new AppError('Le pipeline précédent doit être vérifié avant reprise.', { code: 'PIPELINE_RECOVERY_REQUIRED', status: 409, details: { retryable: false, nextAction: 'OPERATOR_REVIEW' } });
    if (!preparation.checklist.criticalComplete || !preparation.checklist.locale || !preparation.checklist.hours || !preparation.checklist.ownerConfirmation || !preparation.checklist.photos || !preparation.checklist.rights) throw new AppError('La préparation est incomplète.', { code: 'PREPARATION_INCOMPLETE', status: 409 });
    if (typeof pipelineStarter !== 'function') throw new AppError('Le pipeline de démo n’est pas configuré.', { code: 'PIPELINE_NOT_CONFIGURED', status: 503 });
    const request = await readRequest(preparation.requestId);
    const draft = await validateContract('preparation-draft', preparationDraft(request, preparation), 'PREPARATION_DRAFT_INVALID');
    if (typeof siteSpecComposer !== 'function') throw new AppError('Le composeur SiteSpec n’est pas configuré.', { code: 'SITE_SPEC_NOT_CONFIGURED', status: 503 });
    const siteSpec = await validateContract('site-spec', await siteSpecComposer({ request: response(request), preparation: response(preparation), preparationDraft: response(draft) }), 'SITE_SPEC_INVALID');
    preparation.preparationDraft = draft;
    preparation.siteSpec = siteSpec;
    preparation.pipelineStatus = 'WEBSITE_FACTORY_STARTING';
    preparation.pipelineReservation = idFactory('pipeline-start');
    preparation.updatedAt = clock().toISOString();
    try {
      await store.writeJson(preparationPath(id), preparation, { expectedHash: store.hashText(currentText) });
    } catch (error) {
      if (error instanceof ConflictError) return startReserved(id, lock);
      throw error;
    }
    let started;
    if (!await renewStartLock(lock)) throw new AppError('Le verrou de démarrage n’est plus détenu.', { code: 'PIPELINE_START_IN_PROGRESS', status: 409, details: { retryable: true, nextAction: 'WAIT' } });
    try {
      started = await pipelineStarter({ request: response(request), preparation: response(preparation), preparationDraft: response(draft), siteSpec: response(siteSpec), pipelineReservation: preparation.pipelineReservation });
    } catch (error) {
      preparation.pipelineStatus = 'PIPELINE_START_FAILED';
      await savePreparation(preparation);
      throw error;
    }
    if (!started?.runId) {
      preparation.pipelineStatus = 'PIPELINE_START_FAILED';
      await savePreparation(preparation);
      throw new AppError('Le pipeline de démo n’a pas fourni de run vérifiable.', { code: 'PIPELINE_START_FAILED', status: 503 });
    }
    const runId = text(started.runId, 'pipelineRunId', 120);
    try {
      preparation.acceptanceReport = await validateContract('acceptance-report', started.acceptanceReport, 'ACCEPTANCE_REPORT_INVALID');
    } catch (error) {
      preparation.pipelineRunId = runId;
      preparation.pipelineStatus = error.code;
      preparation.acceptanceReport = null;
      await savePreparation(preparation);
      throw error;
    }
    preparation.pipelineRunId = runId;
    delete preparation.pipelineReservation;
    preparation.pipelineStatus = preparation.acceptanceReport.status === 'BLOCK' ? 'BLOCKED' : 'READY_FOR_OWNER_REVIEW';
    return savePreparation(preparation);
  }
  async function startLocked(id) {
    const lock = await acquireStartLock(id);
    if (!lock) {
      const preparation = await readPreparation(id);
      if (preparation.pipelineRunId) return projectPreparation(preparation);
      throw new AppError('Le pipeline de démo est déjà en cours de démarrage.', { code: 'PIPELINE_START_IN_PROGRESS', status: 409, details: { retryable: true, nextAction: 'WAIT' } });
    }
    try { return await startReserved(id, lock); }
    finally { await releaseStartLock(lock); }
  }
  async function reconcileStart(id, input = {}) {
    if (input.action !== 'CONFIRM_NO_RUN') throw new ValidationError('Action de réconciliation invalide.', { field: 'action' });
    const preparation = await readPreparation(id);
    if (preparation.pipelineRunId) return projectPreparation(preparation);
    if (!['WEBSITE_FACTORY_STARTING', 'PIPELINE_START_FAILED'].includes(preparation.pipelineStatus)) throw new AppError('Aucun démarrage à réconcilier.', { code: 'PIPELINE_RECOVERY_NOT_REQUIRED', status: 409 });
    const lock = await startLockState(id);
    if (lock.state === 'ACTIVE') throw new AppError('Le pipeline de démo est encore actif.', { code: 'PIPELINE_START_IN_PROGRESS', status: 409, details: { retryable: true, nextAction: 'WAIT' } });
    if (typeof pipelineReconciler !== 'function') throw new AppError('Le rapprochement des runs n’est pas configuré.', { code: 'PIPELINE_RECONCILER_NOT_CONFIGURED', status: 503 });
    const reconciled = await pipelineReconciler({ preparation: response(preparation), pipelineReservation: preparation.pipelineReservation });
    if (lock.state === 'EXPIRED' && await recoverExpiredStartLock(id, lock.metadata.token) === 'ACTIVE') throw new AppError('Le pipeline de démo est encore actif.', { code: 'PIPELINE_START_IN_PROGRESS', status: 409, details: { retryable: true, nextAction: 'WAIT' } });
    if (reconciled?.runId) {
      preparation.pipelineRunId = text(reconciled.runId, 'pipelineRunId', 120);
      try {
        preparation.siteSpec = await validateContract('site-spec', reconciled.siteSpec ?? preparation.siteSpec, 'SITE_SPEC_INVALID');
        preparation.acceptanceReport = await validateContract('acceptance-report', reconciled.acceptanceReport, 'ACCEPTANCE_REPORT_INVALID');
      } catch (error) {
        preparation.pipelineStatus = error.code;
        preparation.acceptanceReport = null;
        await savePreparation(preparation);
        throw error;
      }
      delete preparation.pipelineReservation;
      preparation.pipelineStatus = preparation.acceptanceReport.status === 'BLOCK' ? 'BLOCKED' : 'READY_FOR_OWNER_REVIEW';
      return savePreparation(preparation);
    }
    delete preparation.pipelineReservation;
    delete preparation.preparationDraft;
    delete preparation.siteSpec;
    delete preparation.pipelineStatus;
    return savePreparation(preparation);
  }
  async function start(id) {
    const active = starts.get(id);
    if (active) return active;
    const pending = startLocked(id).finally(() => starts.delete(id));
    starts.set(id, pending);
    return pending;
  }
  async function validateDemo(id, decision) { const preparation = await readPreparation(id); if (!preparation.pipelineRunId) throw new AppError('Aucun pipeline à valider.', { code: 'PIPELINE_NOT_READY', status: 409 }); if (!['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) throw new ValidationError('Décision opérateur invalide.'); if (preparation.status !== 'READY_FOR_OWNER_REVIEW') throw new AppError('La démo n’est pas prête pour la validation opérateur.', { code: 'DEMO_NOT_READY_FOR_REVIEW', status: 409 }); if (decision === 'APPROVED' && preparation.acceptanceReport?.status === 'BLOCK') throw new AppError('Une démo bloquée ne peut pas être présentée.', { code: 'ACCEPTANCE_BLOCKED', status: 409 }); if (typeof demoPresenter !== 'function') throw new AppError('La présentation de démo n’est pas configurée.', { code: 'DEMO_PRESENTATION_NOT_CONFIGURED', status: 503 }); const presented = await demoPresenter({ runId: preparation.pipelineRunId, decision }); if (decision === 'APPROVED' && (!presented || typeof presented.href !== 'string' || !presented.href.startsWith('/demo/'))) throw new AppError('La présentation de démo n’a pas fourni de lien vérifiable.', { code: 'DEMO_PRESENTATION_INVALID', status: 503 }); preparation.pipelineStatus = decision === 'APPROVED' ? 'READY_FOR_PROSPECT' : 'NEEDS_CORRECTION'; preparation.presentation = presented ?? null; return savePreparation(preparation); }
  return { refreshAudit, addAsset, createPreparation, createRequest, decideMatch, getDemoRequest, getRequest: async id => projectRequest(await readRequest(id)), listDemoRequests, listReports, listRequests, readReport, reconcileStart, seedSyntheticReport, start, updateIntake, validateDemo };
}
