import { mkdir, open, realpath, unlink } from 'node:fs/promises';
import path from 'node:path';
import { assertResourceId, createId } from '../core/ids.mjs';
import { ValidationError } from '../core/errors.mjs';

const EVENTS_PATH = runId => `runs/${runId}/cost-events.jsonl`;
const LOCK_PATH = runId => `runs/${runId}/cost-events.lock`;
const THRESHOLDS = [0.5, 0.8, 1];
const LOCK_TIMEOUT_MS = 500;

function costError(message, code, details = null) {
  return Object.assign(new Error(message), { code, details, status: 409 });
}

function amount(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ValidationError(`${field} est invalide.`, { field });
  return value;
}

function requiredText(value, field, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ValidationError(`${field} est invalide.`, { field });
  return value.trim();
}

function journalError() { return costError('Journal de coûts invalide.', 'COST_LEDGER_INVALID'); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

export function createCostLedger({ store, runId, envelope = {}, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()), lockTimeoutMs = LOCK_TIMEOUT_MS } = {}) {
  assertResourceId(runId, 'runId');
  const hardLimit = amount(envelope.hardLimit, 'envelope.hardLimit');
  const currency = requiredText(envelope.currency ?? 'USD', 'envelope.currency', 8).toUpperCase();
  const allowUnknown = envelope.allowUnknown === true;
  if (!Number.isInteger(lockTimeoutMs) || lockTimeoutMs < 1 || lockTimeoutMs > 10_000) throw new ValidationError('lockTimeoutMs est invalide.', { field: 'lockTimeoutMs' });
  let spent = 0;
  let reserved = 0;
  const reservations = new Map();
  const firedThresholds = new Set();
  const eventIds = new Map();
  const authorizationIds = new Set();
  let eventSequence = 0;

  function validText(value, max = 120) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw journalError();
    return value.trim();
  }

  function validAmount(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw journalError();
    return value;
  }

  function uniqueId(prefix, used) {
    const base = idFactory(prefix);
    if (typeof base !== 'string' || !base) throw new ValidationError('idFactory est invalide.', { field: 'idFactory' });
    let value = base;
    while (used.has(value)) value = `${base}-${++eventSequence}`;
    return value;
  }

  function reset() {
    spent = 0;
    reserved = 0;
    reservations.clear();
    firedThresholds.clear();
    eventIds.clear();
    authorizationIds.clear();
  }

  function reservationFrom(event) {
    if (event.phase !== 'before') throw journalError();
    let estimatedCost;
    if (event.estimatedCost === null) {
      if (!allowUnknown) throw journalError();
      estimatedCost = 0;
    } else {
      estimatedCost = validAmount(event.estimatedCost);
    }
    if (typeof event.essential !== 'boolean') throw journalError();
    return {
      authorizationId: validText(event.authorizationId),
      stepId: validText(event.stepId),
      provider: validText(event.provider),
      unit: validText(event.unit),
      quantity: validAmount(event.quantity),
      estimate: estimatedCost,
      essential: event.essential,
    };
  }

  function assertReservationEvent(event, reservation, type) {
    if (event.phase !== 'after' || event.authorizationId !== reservation.authorizationId || event.stepId !== reservation.stepId || event.provider !== reservation.provider || event.unit !== reservation.unit || event.quantity !== reservation.quantity || event.estimatedCost !== reservation.estimate || event.essential !== reservation.essential) throw journalError();
    if (type === 'COST_SETTLED') {
      const actualCost = validAmount(event.actualCost);
      if (typeof event.overLimit !== 'boolean' || event.overLimit !== ((spent + actualCost) > hardLimit)) throw journalError();
      return actualCost;
    }
    validText(event.reason);
    return null;
  }

  function applyEvent(event) {
    if (event.type === 'COST_AUTHORIZED') {
      const reservation = reservationFrom(event);
      if (authorizationIds.has(reservation.authorizationId)) throw journalError();
      authorizationIds.add(reservation.authorizationId);
      reservations.set(reservation.authorizationId, reservation);
      reserved += reservation.estimate;
      return;
    }
    if (event.type === 'COST_SETTLED') {
      const reservation = reservations.get(event.authorizationId);
      if (!reservation) throw journalError();
      const actualCost = assertReservationEvent(event, reservation, event.type);
      reserved -= reservation.estimate;
      spent += actualCost;
      reservations.delete(event.authorizationId);
      return;
    }
    if (event.type === 'COST_RELEASED') {
      const reservation = reservations.get(event.authorizationId);
      if (!reservation) throw journalError();
      assertReservationEvent(event, reservation, event.type);
      reserved -= reservation.estimate;
      reservations.delete(event.authorizationId);
      return;
    }
    if (event.type === 'BUDGET_THRESHOLD') {
      if (event.phase !== 'after' || !THRESHOLDS.includes(event.threshold) || firedThresholds.has(event.threshold) || (hardLimit === 0 ? spent === 0 : spent / hardLimit < event.threshold)) throw journalError();
      firedThresholds.add(event.threshold);
      return;
    }
    throw journalError();
  }

  async function hydrate() {
    const journal = await store.readText(EVENTS_PATH(runId), null);
    if (journal === null) return;
    for (const line of journal.split('\n')) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch { throw journalError(); }
      if (!event || typeof event !== 'object' || event.runId !== runId || event.currency !== currency || typeof event.type !== 'string') throw journalError();
      const eventId = validText(event.eventId);
      validText(event.occurredAt, 64);
      const serialized = stableJson(event);
      const previous = eventIds.get(eventId);
      if (previous !== undefined) {
        if (previous !== serialized) throw journalError();
        continue;
      }
      eventIds.set(eventId, serialized);
      applyEvent(event);
    }
  }

  async function acquireLock() {
    const lockPath = store.resolveSafe(LOCK_PATH(runId));
    const parent = path.dirname(lockPath);
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const [realRoot, realParent] = await Promise.all([realpath(store.root), realpath(parent)]);
    if (!isInside(realRoot, realParent)) throw costError('Répertoire de verrou invalide.', 'COST_LEDGER_LOCK_INVALID');
    const deadline = Date.now() + lockTimeoutMs;
    while (true) {
      try {
        const handle = await open(lockPath, 'wx', 0o600);
        return async () => {
          await handle.close();
          await unlink(lockPath);
        };
      } catch (error) {
        if (error.code !== 'EEXIST' || Date.now() >= deadline) throw costError('Ledger de coûts indisponible.', 'COST_LEDGER_BUSY');
        await wait(Math.min(10, Math.max(1, deadline - Date.now())));
      }
    }
  }

  async function withinLock(action) {
    const release = await acquireLock();
    try {
      reset();
      await hydrate();
      await recoverThresholds();
      return await action();
    } finally {
      await release();
    }
  }

  const ready = withinLock(async () => undefined);

  async function append(event) {
    const eventId = uniqueId('cost-event', eventIds);
    const recorded = { eventId, occurredAt: clock().toISOString(), runId, currency, ...event };
    eventIds.set(eventId, stableJson(recorded));
    return store.appendJsonLine(EVENTS_PATH(runId), recorded);
  }

  function state() {
    const normalizedReserved = Math.max(0, reserved);
    return { hardLimit, currency, spent, reserved: normalizedReserved, available: Math.max(0, hardLimit - spent - normalizedReserved), utilization: hardLimit === 0 ? (spent > 0 ? 1 : 0) : spent / hardLimit };
  }

  async function authorize({ stepId, provider, unit, quantity = 1, estimatedCost, essential = false } = {}) {
    await ready;
    return withinLock(async () => {
      const fields = { stepId: requiredText(stepId, 'stepId'), provider: requiredText(provider, 'provider'), unit: requiredText(unit, 'unit') };
      amount(quantity, 'quantity');
      if (estimatedCost === null || estimatedCost === undefined) {
        if (!allowUnknown) throw costError('Coût estimé obligatoire avant consommation.', 'COST_UNKNOWN');
      } else amount(estimatedCost, 'estimatedCost');
      const estimate = estimatedCost ?? 0;
      if (spent + reserved + estimate > hardLimit) throw costError('Plafond budgétaire dépassé avant appel.', 'BUDGET_EXCEEDED', { ...state(), estimate });
      const authorizationId = uniqueId('cost-auth', authorizationIds);
      authorizationIds.add(authorizationId);
      reservations.set(authorizationId, { authorizationId, ...fields, quantity, estimate, essential });
      reserved += estimate;
      await append({ type: 'COST_AUTHORIZED', phase: 'before', authorizationId, ...fields, quantity, estimatedCost: estimatedCost ?? null, essential, state: state() });
      return { authorizationId, state: state() };
    });
  }

  async function settle({ authorizationId, actualCost } = {}) {
    await ready;
    return withinLock(async () => {
      const reservation = reservations.get(authorizationId);
      if (!reservation) throw new ValidationError('Autorisation de coût introuvable.', { field: 'authorizationId' });
      amount(actualCost, 'actualCost');
      reserved -= reservation.estimate;
      spent += actualCost;
      reservations.delete(authorizationId);
      const overLimit = spent > hardLimit;
      await append({ type: 'COST_SETTLED', phase: 'after', authorizationId, stepId: reservation.stepId, provider: reservation.provider, unit: reservation.unit, quantity: reservation.quantity, estimatedCost: reservation.estimate, actualCost, essential: reservation.essential, overLimit, state: state() });
      await emitThresholds();
      return { overLimit, state: state() };
    });
  }

  async function cancel({ authorizationId, reason = 'CALL_FAILED' } = {}) {
    await ready;
    return withinLock(async () => {
      const reservation = reservations.get(authorizationId);
      if (!reservation) throw new ValidationError('Autorisation de coût introuvable.', { field: 'authorizationId' });
      reserved -= reservation.estimate;
      reservations.delete(authorizationId);
      await append({ type: 'COST_RELEASED', phase: 'after', authorizationId, stepId: reservation.stepId, provider: reservation.provider, unit: reservation.unit, quantity: reservation.quantity, estimatedCost: reservation.estimate, reason: requiredText(reason, 'reason'), state: state() });
      return { state: state() };
    });
  }

  async function emitThresholds() {
    for (const threshold of THRESHOLDS) {
      if (firedThresholds.has(threshold) || (hardLimit === 0 ? spent === 0 : spent / hardLimit < threshold)) continue;
      firedThresholds.add(threshold);
      await append({ type: 'BUDGET_THRESHOLD', phase: 'after', threshold, state: state() });
    }
  }

  async function recoverThresholds() {
    await emitThresholds();
  }

  return { authorize, cancel, ready, settle, snapshot: state };
}
