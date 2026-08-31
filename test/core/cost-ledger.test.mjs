import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
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
