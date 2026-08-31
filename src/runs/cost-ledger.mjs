import { assertResourceId, createId } from '../core/ids.mjs';
import { ValidationError } from '../core/errors.mjs';

const EVENTS_PATH = runId => `runs/${runId}/cost-events.jsonl`;
const THRESHOLDS = [0.5, 0.8, 1];

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

export function createCostLedger({ store, runId, envelope = {}, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()) } = {}) {
  assertResourceId(runId, 'runId');
  const hardLimit = amount(envelope.hardLimit, 'envelope.hardLimit');
  const currency = requiredText(envelope.currency ?? 'USD', 'envelope.currency', 8).toUpperCase();
  const allowUnknown = envelope.allowUnknown === true;
  let spent = 0;
  let reserved = 0;
  const reservations = new Map();
  const firedThresholds = new Set();
  const eventIds = new Set();
  const eventIdValues = new Set();
  const authorizationIds = new Set();
  let eventSequence = 0;

  function eventIdentity(event) {
    return `${event.eventId}:${event.type}:${event.authorizationId ?? event.threshold ?? ''}`;
  }

  function uniqueId(prefix, used) {
    const base = idFactory(prefix);
    let value = base;
    while (used.has(value)) value = `${base}-${++eventSequence}`;
    return value;
  }

  async function hydrate() {
    const journal = await store.readText(EVENTS_PATH(runId), null);
    if (journal === null) return;
    for (const line of journal.split('\n')) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch { throw costError('Journal de coûts invalide.', 'COST_LEDGER_INVALID'); }
      if (!event || typeof event !== 'object' || event.runId !== runId || typeof event.eventId !== 'string' || !event.eventId || typeof event.type !== 'string') throw costError('Journal de coûts invalide.', 'COST_LEDGER_INVALID');
      const identity = eventIdentity(event);
      if (eventIds.has(identity)) continue;
      eventIds.add(identity);
      eventIdValues.add(event.eventId);
      if (event.type === 'COST_AUTHORIZED') {
        if (!event.authorizationId || authorizationIds.has(event.authorizationId)) continue;
        const estimate = amount(event.estimatedCost ?? 0, 'estimatedCost');
        authorizationIds.add(event.authorizationId);
        reservations.set(event.authorizationId, { authorizationId: event.authorizationId, stepId: event.stepId, provider: event.provider, unit: event.unit, quantity: event.quantity, estimate, essential: event.essential === true });
        reserved += estimate;
      } else if (event.type === 'COST_SETTLED') {
        const reservation = reservations.get(event.authorizationId);
        if (!reservation) continue;
        const actualCost = amount(event.actualCost, 'actualCost');
        reserved -= reservation.estimate;
        spent += actualCost;
        reservations.delete(event.authorizationId);
      } else if (event.type === 'COST_RELEASED') {
        const reservation = reservations.get(event.authorizationId);
        if (!reservation) continue;
        reserved -= reservation.estimate;
        reservations.delete(event.authorizationId);
      } else if (event.type === 'BUDGET_THRESHOLD' && THRESHOLDS.includes(event.threshold)) {
        firedThresholds.add(event.threshold);
      }
    }
  }

  const ready = hydrate();

  async function append(event) {
    const eventId = uniqueId('cost-event', eventIdValues);
    const recorded = { eventId, occurredAt: clock().toISOString(), runId, currency, ...event };
    eventIds.add(eventIdentity(recorded));
    eventIdValues.add(eventId);
    return store.appendJsonLine(EVENTS_PATH(runId), recorded);
  }

  function state() {
    const normalizedReserved = Math.max(0, reserved);
    return { hardLimit, currency, spent, reserved: normalizedReserved, available: Math.max(0, hardLimit - spent - normalizedReserved), utilization: hardLimit === 0 ? (spent > 0 ? 1 : 0) : spent / hardLimit };
  }

  async function authorize({ stepId, provider, unit, quantity = 1, estimatedCost, essential = false } = {}) {
    await ready;
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
  }

  async function settle({ authorizationId, actualCost } = {}) {
    await ready;
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
  }

  async function cancel({ authorizationId, reason = 'CALL_FAILED' } = {}) {
    await ready;
    const reservation = reservations.get(authorizationId);
    if (!reservation) throw new ValidationError('Autorisation de coût introuvable.', { field: 'authorizationId' });
    reserved -= reservation.estimate;
    reservations.delete(authorizationId);
    await append({ type: 'COST_RELEASED', phase: 'after', authorizationId, stepId: reservation.stepId, provider: reservation.provider, unit: reservation.unit, quantity: reservation.quantity, estimatedCost: reservation.estimate, reason: requiredText(reason, 'reason'), state: state() });
    return { state: state() };
  }

  async function emitThresholds() {
    for (const threshold of THRESHOLDS) {
      if (firedThresholds.has(threshold) || (hardLimit === 0 ? spent === 0 : spent / hardLimit < threshold)) continue;
      firedThresholds.add(threshold);
      await append({ type: 'BUDGET_THRESHOLD', phase: 'after', threshold, state: state() });
    }
  }

  return { authorize, cancel, ready, settle, snapshot: state };
}
