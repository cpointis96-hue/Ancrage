import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createContractRegistry, normalizeContractId } from '../../src/config/contract-registry.mjs';
import { ValidationError } from '../../src/core/errors.mjs';
import { validateJsonSchema } from '../../src/core/json-schema.mjs';

const contractsRoot = new URL('../../fixtures/defaults/contracts/', import.meta.url);

const contractSamples = {
  'minimal-request': { name: 'Maison Sillage', city: { id: 'fr-nantes', label: 'Nantes', countryCode: 'FR' }, locale: 'fr-FR', idempotencyKey: 'request-1' },
  'establishment-resolution': { candidates: [{ id: 'place-1', name: 'Maison Sillage', score: 0.9, evidenceRefs: ['evidence:place-1'] }], decision: 'AUTO_CONTINUE', ambiguities: [], evidenceRefs: ['evidence:place-1'] },
  'audit-packet': { schemaVersion: 'audit-packet-v1', packetId: 'packet-1', revision: 1, status: 'PARTIAL', subject: {}, coverage: {}, evidenceRefs: [], findings: [], limitations: ['Site non confirmé.'], cost: { currency: 'USD', hardLimit: 0.5, spent: 0, reserved: 0, costEventsRef: 'runs/audit-1/cost-events.jsonl' }, lineage: {}, artifacts: {}, preparationDraft: {} },
  'preparation-draft': { id: 'draft-1', auditPacketRef: 'packet-1', revision: 1, locale: 'fr-FR', values: [{ field: 'name', value: 'Maison Sillage', source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' }] },
  'demo-readiness': { templateFamily: 'restaurant', status: 'INCOMPLETE', checks: [{ id: 'hours', status: 'BLOCK' }], missing: ['hours'], blocks: ['hours'] },
  'site-spec': { schemaVersion: 'site-spec-v1', title: 'Maison Sillage', locale: 'fr-FR', template: { id: 'site-preview', versionId: 'v-1', hash: 'a'.repeat(64) }, pages: [{ path: '/', title: 'Accueil', sections: ['identity'] }], assets: [] },
  'acceptance-report': { schemaVersion: 'acceptance-report-v1', status: 'WARN', gates: [{ id: 'mobile', status: 'WARN', evidenceRefs: ['artifacts/site/screenshot.png'] }], artifactRefs: ['artifacts/site/index.html'], evidenceRefs: ['artifacts/site/screenshot.png'], limitations: [], operatorDecision: 'PENDING' },
};

const invalidContractSamples = {
  'minimal-request': { ...contractSamples['minimal-request'], city: { ...contractSamples['minimal-request'].city, countryCode: 'FRA' } },
  'establishment-resolution': { ...contractSamples['establishment-resolution'], candidates: [{ ...contractSamples['establishment-resolution'].candidates[0], score: 1.1 }] },
  'audit-packet': { ...contractSamples['audit-packet'], cost: { ...contractSamples['audit-packet'].cost, hardLimit: 0.51 } },
  'preparation-draft': { ...contractSamples['preparation-draft'], locale: 'fr_FR' },
  'demo-readiness': { ...contractSamples['demo-readiness'], checks: [] },
  'site-spec': { ...contractSamples['site-spec'], pages: [] },
  'acceptance-report': { ...contractSamples['acceptance-report'], gates: [] },
};

test('persiste, versionne et active un contrat JSON Schema', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ancrage-contracts-'));
  try {
    const registry = createContractRegistry({ store: createAtomicStore(root), clock: () => new Date('2026-08-27T10:00:00.000Z') });
    const schema = { type: 'object', required: ['title'], properties: { title: { type: 'string' } } };
    const saved = await registry.save('site-output', { name: 'Sortie site', schema }, { expectedHash: null });
    const version = await registry.createVersion('site-output', { expectedDraftHash: saved.draftHash });
    const active = await registry.activate('site-output', version.id);
    assert.equal(active.activeVersionId, version.id);
    assert.equal(active.schema.$id, 'site-output');
    assert.equal(normalizeContractId('contracts/site-output.schema.json'), 'site-output');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('valide les fixtures de contrats DataForSEO / Ancrage', async () => {
  for (const [id, sample] of Object.entries(contractSamples)) {
    const schema = JSON.parse(await readFile(new URL(`${id}.schema.json`, contractsRoot), 'utf8'));
    assert.equal(validateJsonSchema(schema, sample), sample);
    assert.throws(() => validateJsonSchema(schema, invalidContractSamples[id]), ValidationError);
  }
});

test('refuse les contraintes de taille, format et bornes numériques', () => {
  const schema = {
    type: 'object',
    required: ['text', 'count', 'items'],
    properties: {
      text: { type: 'string', minLength: 2, maxLength: 4, pattern: '^[A-Z]+$' },
      count: { type: 'integer', minimum: 1, maximum: 3 },
      items: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' } },
    },
    additionalProperties: false,
  };
  const valid = { text: 'AB', count: 2, items: ['one'] };
  assert.equal(validateJsonSchema(schema, valid), valid);
  for (const invalid of [
    { text: 'A', count: 2, items: ['one'] },
    { text: 'ABCDE', count: 2, items: ['one'] },
    { text: 'Ab', count: 2, items: ['one'] },
    { text: 'AB', count: 0, items: ['one'] },
    { text: 'AB', count: 4, items: ['one'] },
    { text: 'AB', count: 2, items: [] },
    { text: 'AB', count: 2, items: ['one', 'two', 'three'] },
  ]) assert.throws(() => validateJsonSchema(schema, invalid), ValidationError);
});
