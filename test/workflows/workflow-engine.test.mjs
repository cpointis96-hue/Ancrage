import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createWorkflowEngine } from '../../src/workflows/workflow-engine.mjs';
import { validateWorkflowDefinition } from '../../src/workflows/workflow-validator.mjs';
import { WorkflowValidationError } from '../../src/core/errors.mjs';

const definition = { id: 'test-flow', version: 1, steps: [
  { id: 'one', kind: 'deterministic', dependsOn: [], inputRefs: [], outputRefs: ['value'], implementation: 'one', timeoutMs: 1000, budget: 0 },
  { id: 'two', kind: 'deterministic', dependsOn: ['one'], inputRefs: ['one'], outputRefs: ['result'], implementation: 'two', timeoutMs: 1000, budget: 0 },
] };

test('refuse un cycle et exécute un DAG avec hashes persistants', async () => {
  assert.throws(() => validateWorkflowDefinition({ ...definition, steps: definition.steps.map(step => ({ ...step, dependsOn: [step.id] })) }), WorkflowValidationError);
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-workflow-')); const store = createAtomicStore(root);
  await store.writeJson('config/workflows/test-flow.json', definition, { expectedHash: null });
  const engine = createWorkflowEngine({ store, implementations: { one: async () => ({ value: 'ok' }), two: async ({ input }) => ({ result: input.one.value }) } });
  const run = await engine.start('test-flow', {});
  assert.equal(run.status, 'SUCCEEDED'); assert.equal(run.steps.length, 2); assert.equal(run.steps.every(step => step.outputHash), true);
  const resumed = await engine.resume(run.id); assert.equal(resumed.attempts.length, run.attempts.length);
});

test('expurge une sortie invalide', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-workflow-')); const store = createAtomicStore(root);
  await store.writeJson('config/workflows/test-flow.json', { ...definition, steps: [definition.steps[0]] }, { expectedHash: null });
  const engine = createWorkflowEngine({ store, implementations: { one: async () => null } });
  assert.equal((await engine.start('test-flow')).status, 'FAILED');
});
