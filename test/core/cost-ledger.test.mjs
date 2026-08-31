import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createCostLedger } from '../../src/runs/cost-ledger.mjs';

test('autorise, règle et trace les coûts avec seuils 50/80/100', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const store = createAtomicStore(root);
  const ledger = createCostLedger({ store, runId: 'run-cost', envelope: { hardLimit: 10, currency: 'usd' }, idFactory: prefix => `${prefix}-test` });
  const authorization = await ledger.authorize({ stepId: 'serp', provider: 'dataforseo', unit: 'task', estimatedCost: 10 });
  assert.equal(ledger.snapshot().reserved, 10);
  const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost: 10 });
  assert.equal(settled.state.spent, 10);
  assert.equal(settled.state.available, 0);
  const events = (await readFile(path.join(root, 'runs/run-cost/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(event => event.type), ['COST_AUTHORIZED', 'COST_SETTLED', 'BUDGET_THRESHOLD', 'BUDGET_THRESHOLD', 'BUDGET_THRESHOLD']);
  assert.equal(JSON.stringify(events).includes('secret'), false);
});

test('bloque le coût inconnu et le dépassement avant appel', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const ledger = createCostLedger({ store: createAtomicStore(root), runId: 'run-budget', envelope: { hardLimit: 5 } });
  await assert.rejects(() => ledger.authorize({ stepId: 'maps', provider: 'dataforseo', unit: 'task' }), error => error.code === 'COST_UNKNOWN');
  await assert.rejects(() => ledger.authorize({ stepId: 'maps', provider: 'dataforseo', unit: 'task', estimatedCost: 6 }), error => error.code === 'BUDGET_EXCEEDED');
  assert.deepEqual(ledger.snapshot(), { hardLimit: 5, currency: 'USD', spent: 0, reserved: 0, available: 5, utilization: 0 });
});

test('libère une réservation lorsque l’appel échoue', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const ledger = createCostLedger({ store: createAtomicStore(root), runId: 'run-release', envelope: { hardLimit: 5 } });
  const authorization = await ledger.authorize({ stepId: 'onpage', provider: 'dataforseo', unit: 'task', estimatedCost: 3 });
  const released = await ledger.cancel({ authorizationId: authorization.authorizationId });
  assert.equal(released.state.reserved, 0);
  assert.equal(released.state.spent, 0);
});

test('conserve la réservation si la persistance du règlement échoue', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const atomicStore = createAtomicStore(root);
  const store = { ...atomicStore, appendJsonLine: async (relativePath, event) => {
    if (event.type === 'COST_SETTLED') throw Object.assign(new Error('append interrompu'), { code: 'APPEND_FAILED' });
    return atomicStore.appendJsonLine(relativePath, event);
  } };
  const ledger = createCostLedger({ store, runId: 'run-settle-append', envelope: { hardLimit: 5 } });
  const authorization = await ledger.authorize({ stepId: 'onpage', provider: 'dataforseo', unit: 'task', estimatedCost: 3 });
  await assert.rejects(() => ledger.settle({ authorizationId: authorization.authorizationId, actualCost: 2 }), error => error.code === 'APPEND_FAILED');
  assert.deepEqual(ledger.snapshot(), { hardLimit: 5, currency: 'USD', spent: 0, reserved: 3, available: 2, utilization: 0 });
  const events = (await readFile(path.join(root, 'runs/run-settle-append/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(event => event.type), ['COST_AUTHORIZED']);
});

test('conserve la réservation si la persistance de la libération échoue', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const atomicStore = createAtomicStore(root);
  const store = { ...atomicStore, appendJsonLine: async (relativePath, event) => {
    if (event.type === 'COST_RELEASED') throw Object.assign(new Error('append interrompu'), { code: 'APPEND_FAILED' });
    return atomicStore.appendJsonLine(relativePath, event);
  } };
  const ledger = createCostLedger({ store, runId: 'run-release-append', envelope: { hardLimit: 5 } });
  const authorization = await ledger.authorize({ stepId: 'onpage', provider: 'dataforseo', unit: 'task', estimatedCost: 3 });
  await assert.rejects(() => ledger.cancel({ authorizationId: authorization.authorizationId }), error => error.code === 'APPEND_FAILED');
  assert.deepEqual(ledger.snapshot(), { hardLimit: 5, currency: 'USD', spent: 0, reserved: 3, available: 2, utilization: 0 });
  const events = (await readFile(path.join(root, 'runs/run-release-append/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(event => event.type), ['COST_AUTHORIZED']);
});

test('hydrate le ledger sans rejouer les événements ou les seuils au redémarrage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const store = createAtomicStore(root);
  let firstSequence = 0;
  const first = createCostLedger({ store, runId: 'run-restart', envelope: { hardLimit: 10 }, idFactory: prefix => `${prefix}-${++firstSequence}` });
  await first.ready;
  const settled = await first.authorize({ stepId: 'serp', provider: 'dataforseo', unit: 'task', estimatedCost: 6 });
  await first.settle({ authorizationId: settled.authorizationId, actualCost: 6 });
  const pending = await first.authorize({ stepId: 'maps', provider: 'dataforseo', unit: 'task', estimatedCost: 2 });
  const journalPath = 'runs/run-restart/cost-events.jsonl';
  const events = (await readFile(path.join(root, journalPath), 'utf8')).trim().split('\n').map(JSON.parse);
  await store.appendJsonLine(journalPath, events.find(event => event.type === 'COST_SETTLED'));

  let restartedSequence = 0;
  const restarted = createCostLedger({ store, runId: 'run-restart', envelope: { hardLimit: 10 }, idFactory: prefix => `${prefix}-${++restartedSequence}` });
  await restarted.ready;
  assert.deepEqual(restarted.snapshot(), { hardLimit: 10, currency: 'USD', spent: 6, reserved: 2, available: 2, utilization: 0.6 });
  await restarted.settle({ authorizationId: pending.authorizationId, actualCost: 2 });

  const resumedEvents = (await readFile(path.join(root, journalPath), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(resumedEvents.filter(event => event.type === 'BUDGET_THRESHOLD').map(event => event.threshold), [0.5, 0.8]);
});

test('sérialise deux ledgers concurrents avant autorisation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const atomicStore = createAtomicStore(root);
  const store = { ...atomicStore, appendJsonLine: async (...args) => { await new Promise(resolve => setTimeout(resolve, 30)); return atomicStore.appendJsonLine(...args); } };
  const first = createCostLedger({ store, runId: 'run-concurrent', envelope: { hardLimit: 5 } });
  const second = createCostLedger({ store, runId: 'run-concurrent', envelope: { hardLimit: 5 } });
  await Promise.all([first.ready, second.ready]);
  const outcomes = await Promise.allSettled([
    first.authorize({ stepId: 'one', provider: 'dataforseo', unit: 'task', estimatedCost: 4 }),
    second.authorize({ stepId: 'two', provider: 'dataforseo', unit: 'task', estimatedCost: 4 }),
  ]);
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(item => item.status === 'rejected').reason.code, 'BUDGET_EXCEEDED');

  const resumed = createCostLedger({ store: atomicStore, runId: 'run-concurrent', envelope: { hardLimit: 5 } });
  await resumed.ready;
  assert.equal(resumed.snapshot().reserved, 4);
});

test('refuse un eventId conflictuel ou un journal sémantiquement corrompu', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const store = createAtomicStore(root);
  const ledger = createCostLedger({ store, runId: 'run-corrupt', envelope: { hardLimit: 5 } });
  const authorization = await ledger.authorize({ stepId: 'serp', provider: 'dataforseo', unit: 'task', estimatedCost: 2 });
  const journalPath = 'runs/run-corrupt/cost-events.jsonl';
  const event = JSON.parse((await readFile(path.join(root, journalPath), 'utf8')).trim());
  await store.appendJsonLine(journalPath, { ...event, authorizationId: `${authorization.authorizationId}-other` });

  const conflicted = createCostLedger({ store, runId: 'run-corrupt', envelope: { hardLimit: 5 } });
  await assert.rejects(() => conflicted.ready, error => error.code === 'COST_LEDGER_INVALID');

  const secondRoot = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const secondStore = createAtomicStore(secondRoot);
  await secondStore.appendJsonLine('runs/run-corrupt-type/cost-events.jsonl', { eventId: 'unknown-event', occurredAt: new Date().toISOString(), runId: 'run-corrupt-type', currency: 'USD', type: 'COST_UNKNOWN' });
  const corrupted = createCostLedger({ store: secondStore, runId: 'run-corrupt-type', envelope: { hardLimit: 5 } });
  await assert.rejects(() => corrupted.ready, error => error.code === 'COST_LEDGER_INVALID');
});

test('échoue fermé sans supprimer un verrou de ledger persistant', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const store = createAtomicStore(root);
  await store.writeText('runs/run-busy/cost-events.lock', 'processus interrompu');
  const ledger = createCostLedger({ store, runId: 'run-busy', envelope: { hardLimit: 5 }, lockTimeoutMs: 10 });
  await assert.rejects(() => ledger.ready, error => error.code === 'COST_LEDGER_BUSY');
  assert.equal(await store.readText('runs/run-busy/cost-events.lock'), 'processus interrompu');
});

test('récupère les seuils absents après un append partiel', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const atomicStore = createAtomicStore(root);
  const failingStore = {
    ...atomicStore,
    appendJsonLine: async (relativePath, event) => {
      if (event.type === 'BUDGET_THRESHOLD' && event.threshold === 0.8) throw new Error('append interrompu');
      return atomicStore.appendJsonLine(relativePath, event);
    },
  };
  const ledger = createCostLedger({ store: failingStore, runId: 'run-threshold-recovery', envelope: { hardLimit: 10 } });
  const authorization = await ledger.authorize({ stepId: 'serp', provider: 'dataforseo', unit: 'task', estimatedCost: 10 });
  const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost: 10 });
  assert.equal(settled.thresholdRecoveryRequired, true);
  assert.equal(settled.state.spent, 10);

  const resumed = createCostLedger({ store: atomicStore, runId: 'run-threshold-recovery', envelope: { hardLimit: 10 } });
  await resumed.ready;
  const events = (await readFile(path.join(root, 'runs/run-threshold-recovery/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.filter(event => event.type === 'BUDGET_THRESHOLD').map(event => event.threshold), [0.5, 0.8, 1]);
});

test('refuse un parent de verrou symlinké sans créer de verrou externe', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-cost-'));
  const external = await mkdtemp(path.join(tmpdir(), 'ancrage-external-'));
  await mkdir(path.join(root, 'runs'), { recursive: true });
  await symlink(external, path.join(root, 'runs', 'run-symlink'));
  const ledger = createCostLedger({ store: createAtomicStore(root), runId: 'run-symlink', envelope: { hardLimit: 5 } });
  await assert.rejects(() => ledger.ready, error => error.code === 'COST_LEDGER_LOCK_INVALID');
  await assert.rejects(() => readFile(path.join(external, 'cost-events.lock')));
});
