import test from 'node:test';
import assert from 'node:assert/strict';
import { runObservationAudit } from '../../src/audit/observation-audit.mjs';

const makeResult = () => ({ id: 'resume-test', startedAt: '2026-11-07T00:00:00.000Z', status: 'RUNNING', input: { name: 'Fixture', city: { label: 'Nantes' }, identity: { source: 'google-places', placeId: 'fixture' }, domain: null, profile: { maxPages: 6, timeoutMs: 1000 } }, modules: {}, stages: [], evidence: [], reports: [] });
const analysis = { status: 'SUCCEEDED', execution: 'fixture', observations: [], priorities: [], competitors: [], queries: [], evidence: [] };

for (const interruption of ['before-analysis', 'after-analysis']) {
  test(`reprend ${interruption} sans répéter un appel potentiellement facturé`, async () => {
    let result = makeResult(); let snapshot; let calls = 0; let interrupt = true;
    const run = () => runObservationAudit({ result, ledger: { snapshot: () => ({ spent: 0, reserved: 0 }) }, analyst: async () => { calls++; return analysis; }, clock: () => new Date('2026-11-07T00:00:00Z'), publishPacket: async () => {}, publishReport: async (value, kind) => { value.reports = [...value.reports.filter(report => report.kind !== kind), { kind }]; }, save: async () => {
      snapshot = structuredClone(result);
      const cp = result.observationCheckpoint;
      if (interrupt && (interruption === 'before-analysis' ? cp.analysisStarted && !cp.analysis : cp.analysis)) { interrupt = false; throw new Error('simulated process interruption'); }
    } });
    await assert.rejects(run, /simulated process interruption/);
    result = snapshot;
    await run();
    assert.equal(calls, interruption === 'before-analysis' ? 0 : 1);
    assert.equal(result.reports.filter(item => item.kind === 'gmb').length, 1);
    assert.equal(result.reports.filter(item => item.kind === 'final').length, 1);
    assert.equal(result.stages.filter(item => item.id === 'seo-audit').length, 1);
    if (interruption === 'before-analysis') assert.equal(result.modules.observation.cause, 'AI_COST_RECONCILIATION_REQUIRED');
    else assert.equal(result.modules.observation.status, 'SUCCEEDED');
  });
}
