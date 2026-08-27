import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createId } from '../core/ids.mjs';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors.mjs';
import { validateWorkflowDefinition } from './workflow-validator.mjs';
import { defaultImplementations } from './implementations.mjs';

const workflowRoot = new URL('../../fixtures/defaults/workflows/', import.meta.url);
const runPath = id => `runs/${id}`;

async function loadDefinition(store, id, workflowRegistry) {
  if (workflowRegistry) return workflowRegistry.resolveActive(id);
  const local = await store.readJson(`config/workflows/${id}.json`, null);
  if (local) {
    const definition = validateWorkflowDefinition(local);
    return { definition, versionId: `v${definition.version ?? 1}`, hash: store.hashText(JSON.stringify(definition)) };
  }
  try {
    const text = await readFile(new URL(`${id}.json`, workflowRoot), 'utf8');
    const definition = validateWorkflowDefinition(JSON.parse(text));
    return { definition, versionId: `v${definition.version ?? 1}`, hash: store.hashText(text) };
  } catch { throw new NotFoundError(`Workflow introuvable : ${id}`); }
}

export function createWorkflowEngine({ store, promptRegistry, workflowRegistry = null, implementations = defaultImplementations, clock = () => new Date(), idFactory = prefix => createId(prefix, clock()) }) {
  async function get(id) { const run = await store.readJson(`${runPath(id)}/run-manifest.json`, null); if (!run) throw new NotFoundError(`Run introuvable : ${id}`); const operatorDecision = await store.readJson(`${runPath(id)}/operator-decision.json`, null); return { ...run, operatorDecision }; }
  async function list() { const index = await store.readJson('runs/index.json', []); return Promise.all(index.map(get)); }
  async function event(id, type, data = {}) { return store.appendJsonLine(`${runPath(id)}/events.jsonl`, { at: clock().toISOString(), type, ...data }); }
  async function events(id) {
    const text = await store.readText(`${runPath(id)}/events.jsonl`, '');
    return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
  async function addIndex(id) { const current = await store.readJson('runs/index.json', []); if (!current.includes(id)) await store.writeJson('runs/index.json', [...current, id].sort(), { expectedHash: (await store.readText('runs/index.json', null)) === null ? null : store.hashText(await store.readText('runs/index.json')) }); }
  async function start(workflowId, input = {}) {
    const loaded = await loadDefinition(store, workflowId, workflowRegistry);
    const definition = loaded.definition;
    const frozenSteps = await Promise.all(definition.steps.map(async step => {
      if (step.kind !== 'ai') return { id: step.id, kind: step.kind, promptRef: null, promptVersionId: null, promptHash: null, model: null, contractRef: step.contractRef ?? null };
      if (!promptRegistry) throw new ValidationError('Registre de prompts absent.');
      const prompt = await promptRegistry.get(step.promptRef);
      if (!prompt.activeVersionId) throw new ValidationError(`Aucune version active pour le prompt : ${step.promptRef}`);
      const version = prompt.versions.find(item => item.id === prompt.activeVersionId);
      return { id: step.id, kind: step.kind, promptRef: step.promptRef, promptVersionId: version.id, promptHash: version.hash, model: step.model, contractRef: step.contractRef ?? prompt.outputContract ?? null };
    }));
    const id = idFactory('run');
    const run = { id, workflowId, status: 'RUNNING', input, snapshot: { workflowId, workflowVersion: definition.version ?? 1, workflowVersionId: loaded.versionId, workflowHash: loaded.hash, definition, steps: frozenSteps }, steps: [], attempts: [], startedAt: clock().toISOString(), updatedAt: clock().toISOString() };
    await store.writeJson(`${runPath(id)}/run-manifest.json`, run, { expectedHash: null }); await addIndex(id); await event(id, 'RUN_STARTED', { workflowId });
    return execute(run, definition);
  }
  async function execute(run, definition) {
    const outputs = {};
    run.status = 'RUNNING';
    for (const step of definition.steps) {
      const previous = run.steps.find(item => item.id === step.id && item.status === 'SUCCEEDED' && item.outputHash);
      const checkpoint = previous ? await store.readJson(`${runPath(run.id)}/steps/${step.id}/step-run.json`, null) : null;
      if (checkpoint && previous && checkpoint.outputHash === previous.outputHash) { outputs[step.id] = checkpoint.output; continue; }
      if ((step.dependsOn ?? []).some(dep => !outputs[dep])) { run.status = 'BLOCKED'; break; }
      const input = Object.assign({}, run.input, ...((step.inputRefs ?? []).map(ref => ({ [ref]: outputs[ref] }))));
      const attempt = { id: idFactory('attempt'), stepId: step.id, startedAt: clock().toISOString() }; await event(run.id, 'STEP_STARTED', { stepId: step.id, attemptId: attempt.id });
      try {
        const implementation = implementations[step.implementation]; if (!implementation) throw new ValidationError(`Implémentation absente : ${step.implementation}`);
        const result = await Promise.race([Promise.resolve(implementation({ input, step, run, store })), new Promise((_, reject) => { const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), step.timeoutMs); timer.unref?.(); })]);
        if (!result || typeof result !== 'object') throw new ValidationError('Sortie d’étape invalide.');
        const outputHash = store.hashText(JSON.stringify(result)); attempt.status = 'SUCCEEDED'; attempt.outputHash = outputHash; attempt.finishedAt = clock().toISOString(); run.steps = [...run.steps.filter(item => item.id !== step.id), { id: step.id, status: 'SUCCEEDED', outputHash }]; outputs[step.id] = result; await store.writeJson(`${runPath(run.id)}/steps/${step.id}/step-run.json`, { stepId: step.id, output: result, outputHash, attemptId: attempt.id }, { expectedHash: null }); await event(run.id, 'STEP_SUCCEEDED', { stepId: step.id, outputHash });
      } catch (error) { attempt.status = 'FAILED'; attempt.errorCode = error.code === 'TIMEOUT' ? 'TIMEOUT' : error.code === 'VALIDATION_ERROR' ? 'INVALID_OUTPUT' : 'STEP_FAILED'; attempt.finishedAt = clock().toISOString(); run.status = 'FAILED'; await event(run.id, 'STEP_FAILED', { stepId: step.id, errorCode: attempt.errorCode }); run.attempts.push(attempt); run.updatedAt = clock().toISOString(); await store.writeJson(`${runPath(run.id)}/run-manifest.json`, run); return run; }
      run.attempts.push(attempt); run.updatedAt = clock().toISOString(); await store.writeJson(`${runPath(run.id)}/run-manifest.json`, run);
    }
    if (run.status === 'RUNNING') run.status = 'SUCCEEDED'; run.updatedAt = clock().toISOString(); await event(run.id, 'RUN_FINISHED', { status: run.status }); await store.writeJson(`${runPath(run.id)}/run-manifest.json`, run); return run;
  }
  async function resume(id) { const run = await get(id); const definition = validateWorkflowDefinition(run.snapshot.definition); return run.status === 'SUCCEEDED' ? run : execute(run, definition); }
  async function decide(id, decision) {
    const run = await get(id);
    if (run.status !== 'SUCCEEDED') throw new ConflictError('Le run doit être terminé avant la décision opérateur.');
    if (!['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) throw new ValidationError('Décision opérateur invalide.');
    const relativePath = `${runPath(id)}/operator-decision.json`;
    const current = await store.readText(relativePath, null);
    const record = { decision, decidedAt: clock().toISOString() };
    await store.writeJson(relativePath, record, { expectedHash: current === null ? null : store.hashText(current) });
    await event(id, 'OPERATOR_DECISION_RECORDED', { decision });
    return get(id);
  }
  return { decide, events, get, list, resume, start };
}
