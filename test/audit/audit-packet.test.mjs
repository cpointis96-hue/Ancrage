import { buildPublicAuditDocument } from '../../src/audit/report-document.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assembleAuditPacket, projectAuditPacket } from '../../src/audit/audit-packet.mjs';
import { renderPublicAuditReport } from '../../src/audit/public-audit-report.mjs';
import { createPublicAuditWorkflow, renderPublicAuditPdf } from '../../src/audit/public-audit-workflow.mjs';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { validateJsonSchema } from '../../src/core/json-schema.mjs';

const fixtureRoot = new URL('../fixtures/audit-packet/', import.meta.url);
const contractUrl = new URL('../../fixtures/defaults/contracts/audit-packet.schema.json', import.meta.url);

async function fixture(name) { return JSON.parse(await readFile(new URL(name, fixtureRoot), 'utf8')); }

test('assemble des snapshots AuditPacket pauvres et complets, hashés et sans secrets', async () => {
  const schema = JSON.parse(await readFile(contractUrl, 'utf8'));
  for (const name of ['poor-audit-run.json', 'complete-audit-run.json']) {
    const auditRun = await fixture(name);
    const first = assembleAuditPacket({ auditRun, revision: 1, artifacts: { finalReport: `audit-runs/${auditRun.id}/reports/final.html`, pdf: `audit-runs/${auditRun.id}/reports/final.pdf` } });
    const second = assembleAuditPacket({ auditRun, revision: 1, artifacts: { finalReport: `audit-runs/${auditRun.id}/reports/final.html`, pdf: `audit-runs/${auditRun.id}/reports/final.pdf` } });
    assert.equal(validateJsonSchema(schema, first.packet), first.packet, name);
    assert.match(first.hash, /^sha256:[a-f0-9]{64}$/, name);
    assert.equal(first.hash, second.hash, name);
    assert.equal(JSON.stringify(first.packet).includes('secret'), false, name);
  }
});

test('HTML, PDF et cockpit partagent le statut et les chiffres de la projection', async () => {
  const auditRun = await fixture('complete-audit-run.json');
  const { packet } = assembleAuditPacket({ auditRun, revision: 2, artifacts: { gmbReport: 'audit-runs/audit-complete-1/reports/gmb.html', finalReport: 'audit-runs/audit-complete-1/reports/final.html', pdf: 'audit-runs/audit-complete-1/reports/final.pdf' } });
  const cockpit = projectAuditPacket(packet);
  const html = renderPublicAuditReport(auditRun, 'final', packet);
  const pdf = renderPublicAuditPdf(auditRun, packet);
  assert.equal(cockpit.status, 'SUCCEEDED');
  assert.equal(cockpit.metrics.keywordOpportunities, 1);
  assert.equal(cockpit.metrics.competitors, 1);
  assert.equal(cockpit.metrics.gmbCandidates, 2);
  assert.equal(cockpit.cost.costEventsRef, 'runs/audit-complete-1/cost-events.jsonl');
  assert.equal(cockpit.report.evidence.length, 2);
  assert.equal(cockpit.report.limitations.length, 0);
  assert.deepEqual(packet.aiContributions[0].provenanceRefs, ['workflow:workflow-v7', 'prompt:prompt-v9', 'contract:contract-v3', 'provider:openai', 'model:gpt-test']);
  assert.deepEqual(packet.aiContributions[0].costEventRefs, ['runs/audit-complete-1/cost-events.jsonl']);
  assert.deepEqual(packet.lineage.promptVersions, ['prompt-v9']);
  const document = buildPublicAuditDocument(auditRun, 'final', packet);
  assert.equal(document.status, cockpit.status);
  assert.match(html, /restaurant nantes/);
  assert.match(html, /720/);
  assert.match(html, /api.example\/gmb|maison-sillage.example/);
  assert.match(html, /Description absente/);
  assert.doesNotMatch(html, /USD|cost-events|evidence-gmb|SUCCEEDED/);
  assert.match(pdf, /restaurant nantes/);
  assert.match(pdf, /720/);
  assert.doesNotMatch(pdf, /Couts USD|cost-events|evidence-gmb|SUCCEEDED/);
});

test('publie un snapshot hashé lisible par le cockpit sans appeler de provider ou de crawl', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-audit-packet-'));
  try {
    const schema = JSON.parse(await readFile(contractUrl, 'utf8'));
    const workflow = createPublicAuditWorkflow({
      store: createAtomicStore(root),
      providers: { list: async () => [] }, adapters: {}, secretStore: { get: async () => null },
      contracts: { async getActiveVersion() { return { versionId: 'audit-packet-contract-test-v1', schema }; } },
      idFactory: prefix => `${prefix}-fixed`,
    });
    const run = await workflow.create({ name: 'Maison Sillage', city: { id: 'fr-nantes', label: 'Nantes', country: 'FR' } });
    const stored = await workflow.readPacket(run.id);
    assert.equal(run.status, 'BLOCKED');
    assert.match(run.auditPacket.hash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(stored.snapshot.packetId, run.auditPacket.packetId);
    assert.equal(projectAuditPacket(stored.packet).status, run.status);
    assert.equal(projectAuditPacket(stored.packet).metrics.spent, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuse de publier un snapshot incompatible avec le contrat actif', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-audit-packet-contract-'));
  try {
    const workflow = createPublicAuditWorkflow({
      store: createAtomicStore(root), providers: { list: async () => [] }, adapters: {}, secretStore: { get: async () => null },
      contracts: { async getActiveVersion() { return { versionId: 'audit-packet-contract-invalid', schema: { type: 'object', required: ['missing'], properties: {}, additionalProperties: false } }; } },
      idFactory: prefix => `${prefix}-fixed`,
    });
    await assert.rejects(() => workflow.create({ name: 'Maison Sillage', city: { id: 'fr-nantes', label: 'Nantes', country: 'FR' } }), error => error.code === 'AUDIT_PACKET_INVALID');
    assert.equal(await createAtomicStore(root).readJson('audit-runs/audit-run-fixed/packets/1.json', null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
