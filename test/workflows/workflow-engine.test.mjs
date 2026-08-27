import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createWorkflowEngine } from '../../src/workflows/workflow-engine.mjs';
import { validateWorkflowDefinition } from '../../src/workflows/workflow-validator.mjs';
import { WorkflowValidationError } from '../../src/core/errors.mjs';
import { createPromptRegistry } from '../../src/config/prompt-registry.mjs';
import { createWorkflowRegistry } from '../../src/config/workflow-registry.mjs';

const definition = { id: 'test-flow', version: 1, steps: [
  { id: 'one', kind: 'deterministic', dependsOn: [], inputRefs: [], outputRefs: ['value'], implementation: 'one', timeoutMs: 1000, budget: 0 },
  { id: 'two', kind: 'deterministic', dependsOn: ['one'], inputRefs: ['one'], outputRefs: ['result'], implementation: 'two', timeoutMs: 1000, budget: 0 },
] };

test('refuse un cycle et exécute un DAG avec hashes persistants', async () => {
  assert.throws(() => validateWorkflowDefinition({ id: 'empty-flow', steps: [] }), WorkflowValidationError);
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

test('fige les versions du workflow, du prompt et le modèle choisi', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-workflow-')); const store = createAtomicStore(root);
  await store.writeJson('config/contracts/copy-draft.schema.json', { type: 'object' }, { expectedHash: null });
  const prompts = createPromptRegistry({ store, clock: () => new Date('2026-08-27T10:00:00.000Z') });
  const promptText = '---\nid: copywriter\nname: Copywriter\nownerStep: redaction\noutputContract: copy-draft\n---\nRédige à partir des faits validés.\n';
  const promptDraft = await prompts.saveDraft('copywriter', promptText, { expectedHash: null });
  const promptVersion = await prompts.createVersion('copywriter', { expectedDraftHash: promptDraft.hash });
  await prompts.activate('copywriter', promptVersion.id);
  const workflows = createWorkflowRegistry({ store, clock: () => new Date('2026-08-27T10:01:00.000Z') });
  const aiDefinition = { id: 'redaction-site', name: 'Rédaction du site', version: 1, steps: [{ id: 'redaction', kind: 'ai', trigger: 'start', dependsOn: [], inputRefs: [], outputRefs: ['copy'], implementation: 'redaction', promptRef: 'copywriter', model: 'provider/model-choisi', contractRef: 'copy-draft', timeoutMs: 1000, budget: 1, approval: 'none' }] };
  const workflowDraft = await workflows.save(aiDefinition.id, aiDefinition, { expectedHash: null });
  const workflowVersion = await workflows.createVersion(aiDefinition.id, { expectedDraftHash: workflowDraft.hash });
  await workflows.activate(aiDefinition.id, workflowVersion.id);
  const engine = createWorkflowEngine({ store, promptRegistry: prompts, workflowRegistry: workflows, implementations: { redaction: async () => ({ copy: 'ok' }) } });
  const run = await engine.start(aiDefinition.id, {});

  assert.equal(run.snapshot.workflowVersionId, workflowVersion.id);
  assert.equal(run.snapshot.workflowHash, workflowVersion.hash);
  assert.equal(run.snapshot.steps[0].promptVersionId, promptVersion.id);
  assert.equal(run.snapshot.steps[0].promptHash, promptVersion.hash);
  assert.equal(run.snapshot.steps[0].model, 'provider/model-choisi');
});
