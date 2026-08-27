import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createWorkflowRegistry } from '../../src/config/workflow-registry.mjs';

const definition = {
  id: 'audit-site',
  name: 'Audit du site',
  version: 1,
  steps: [{ id: 'collecte', kind: 'deterministic', trigger: 'start', dependsOn: [], inputRefs: [], outputRefs: ['faits'], implementation: 'collecte', timeoutMs: 1000, budget: 0, approval: 'none', contractRef: 'audit-report' }],
};

let rootDir;
let store;
let registry;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'ancrage-workflows-'));
  store = createAtomicStore(rootDir);
  await store.writeJson('config/contracts/audit-report.schema.json', { type: 'object' }, { expectedHash: null });
  registry = createWorkflowRegistry({ store, clock: () => new Date('2026-08-27T10:11:12.000Z') });
});

afterEach(async () => { await rm(rootDir, { recursive: true, force: true }); });

test('versionne et active un workflow sans modifier la version gelée', async () => {
  const saved = await registry.save(definition.id, definition, { expectedHash: null });
  const version = await registry.createVersion(definition.id, { expectedDraftHash: saved.hash });
  await registry.activate(definition.id, version.id);
  const changed = await registry.save(definition.id, { ...definition, name: 'Audit du site modifié', version: 2 }, { expectedHash: saved.hash });
  const active = await registry.resolveActive(definition.id);

  assert.equal(changed.name, 'Audit du site modifié');
  assert.equal(active.definition.name, 'Audit du site');
  assert.equal(active.versionId, version.id);
  assert.equal(active.hash, version.hash);
  assert.equal((await registry.list())[0].versions.length, 1);
});
