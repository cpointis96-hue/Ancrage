import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createWorkflowEngine } from '../../src/workflows/workflow-engine.mjs';
import { createClientSiteSimulation, createSimulationImplementations } from '../../src/simulation/client-site-simulation.mjs';

test('simulation client : dossier, images, site, rapport, crash puis reprise', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-client-sim-')); const store = createAtomicStore(root); const faults = new Set(); const engine = createWorkflowEngine({ store, implementations: createSimulationImplementations({ store, faults }) }); const simulation = createClientSiteSimulation({ store, engine, faults });
  const failed = await simulation.start({ name: 'Maison Sillage', city: 'Pattaya', story: 'Texte fourni par le restaurateur.', menu: [{ name: 'Khao soi', price: 14 }] }, { fault: 'site-build' });
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.steps.map(step => step.id).join(','), 'dossier-validation,content-plan');
  const recovered = await simulation.resume(failed.id); assert.equal(recovered.status, 'SUCCEEDED'); assert.equal(recovered.attempts.filter(attempt => attempt.stepId === 'dossier-validation').length, 1); assert.equal(recovered.attempts.filter(attempt => attempt.stepId === 'site-build').length, 2);
  const site = await readFile(path.join(root, `runs/${failed.id}/artifacts/site/index.html`), 'utf8'); const report = await readFile(path.join(root, `runs/${failed.id}/artifacts/report/report.html`), 'utf8'); assert.match(site, /Maison Sillage/); assert.match(report, /Texte fourni/);
  const dossier = await store.readJson(`dossiers/${failed.input.dossierId}/dossier.json`); assert.equal(dossier.provenance, 'synthetic-fixture'); assert.equal((await readFile(path.join(root, `dossiers/${failed.input.dossierId}/assets/photo-1.png`))).length > 0, true); assert.equal(JSON.stringify(await store.readJson(`runs/${failed.id}/run-manifest.json`)).includes('secret'), false);
});
