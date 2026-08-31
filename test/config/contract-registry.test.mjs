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
  'establishment-resolution': { candidates: [{ id: 'place-1', name: 'Maison Sillage', score: 0.9, signals: ['name-city-match'], evidenceRefs: ['evidence:place-1'] }], siteCandidates: [{ url: 'https://maison-sillage.example', score: 0.9, signals: ['official-link'], evidenceRefs: ['evidence:site-1'] }], decision: 'AUTO_CONTINUE', ambiguities: [], evidenceRefs: ['evidence:place-1'] },
  'audit-packet': {
    schemaVersion: 'audit-packet-v1', packetId: 'packet-1', revision: 1, auditRunId: 'audit-run-1', createdAt: '2026-08-31T10:00:00.000Z', status: 'PARTIAL',
    subject: { request: { name: 'Maison Sillage', city: { id: 'fr-nantes', label: 'Nantes', countryCode: 'FR' } }, resolution: { decision: 'LOCAL_PREVIEW_WITHOUT_GMB', establishmentStatus: 'OWNER_SELECTED_MANUAL', siteStatus: 'NOT_CONFIRMED', selectedEstablishmentEvidenceRefs: [] } },
    values: { address: { state: 'OBSERVED', value: '1 rue du Port', authority: 'PROSPECT_INPUT_UNCONFIRMED', observedAt: '2026-08-31T10:00:00.000Z', evidenceRefs: [] }, category: { state: 'MISSING', value: null, authority: 'NONE', observedAt: null, evidenceRefs: [] }, website: { state: 'MISSING', value: null, authority: 'NONE', observedAt: null, evidenceRefs: [] } },
    coverage: { establishment: { status: 'PARTIAL', coverage: 'PARTIAL', cause: 'LOCAL_PREVIEW_WITHOUT_GMB' }, localPresence: { status: 'PARTIAL', coverage: 'UNAVAILABLE', cause: 'LOCAL_PREVIEW_WITHOUT_GMB' }, siteAudit: { status: 'BLOCKED', coverage: 'UNAVAILABLE', cause: 'SITE_NOT_CONFIRMED' }, market: { status: 'PARTIAL', coverage: 'UNAVAILABLE', cause: 'IDENTITY_CATEGORY_NOT_OBSERVED' } },
    evidenceRefs: [], findings: [], market: { searchMarket: { engine: 'google', countryCode: 'FR', languageCode: 'fr', location: 'Nantes', device: 'desktop' }, competitorCandidates: [], selectedCompetitors: [], keywordOpportunities: [] }, deterministicRecommendations: [{ code: 'CONFIRM_OFFICIAL_SITE', text: 'Confirmer le site officiel.', findingRefs: [] }], aiContributions: [{ purpose: 'SEO_RESEARCH_PLAN', status: 'NOT_RUN', cause: 'IDENTITY_CATEGORY_NOT_OBSERVED', executionRef: null, recommendations: [] }], limitations: ['Site non confirmé.'], cost: { currency: 'USD', hardLimit: 0.5, spent: 0, reserved: 0, costEventsRef: 'runs/audit-1/cost-events.jsonl' }, lineage: { workflowVersion: 'public-audit-v1', packetContractVersion: 'audit-packet-v1', promptVersions: [], ruleVersions: ['seo-rules-v1'] }, artifacts: { gmbReport: null, finalReport: { kind: 'html', artifactRef: 'runs/audit-1/final.html' }, pdf: { kind: 'pdf', artifactRef: 'runs/audit-1/final.pdf' } }, preparationDraft: { name: { value: 'Maison Sillage', source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' }, address: { value: '1 rue du Port', source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' }, contact: { value: null, source: 'NONE', confirmation: 'REQUIRED' }, hours: { value: null, source: 'NONE', confirmation: 'REQUIRED' }, menu: { items: [], source: 'NONE', confirmation: 'REQUIRED' }, photos: [] },
  },
  'preparation-draft': { id: 'draft-1', auditPacketRef: 'packet-1', revision: 1, locale: 'fr-FR', values: [{ field: 'name', value: 'Maison Sillage', source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' }] },
  'demo-readiness': { templateFamily: 'restaurant', status: 'INCOMPLETE', checks: [{ id: 'hours', status: 'BLOCK' }], missing: ['hours'], blocks: ['hours'] },
  'site-spec': { schemaVersion: 'site-spec-v1', title: 'Maison Sillage', locale: 'fr-FR', provenance: { auditPacketRef: 'packet-1', preparationDraftRef: 'draft-1' }, confirmation: { status: 'CONFIRMED', confirmedAt: '2026-08-31T10:00:00.000Z' }, template: { id: 'site-preview', versionId: 'v-1', hash: 'a'.repeat(64) }, pages: [{ path: '/', title: 'Accueil', sections: ['identity'], provenanceRefs: ['packet-1'], confirmation: 'CONFIRMED' }], assets: [{ id: 'photo-1', artifactRef: 'assets/photo-1.jpg', rightsStatus: 'AUTHORIZED', provenanceRefs: ['asset-1'], confirmation: 'CONFIRMED' }] },
  'acceptance-report': { schemaVersion: 'acceptance-report-v1', revision: 1, status: 'WARN', ruleVersions: ['qa-rules-v1'], gates: [{ id: 'mobile', status: 'WARN', ruleVersion: 'qa-rules-v1', checkVersion: 'mobile-v1', evidenceRefs: ['artifacts/site/screenshot.png'] }], artifactRefs: ['artifacts/site/index.html'], evidenceRefs: ['artifacts/site/screenshot.png'], limitations: [], operatorDecision: 'PENDING' },
};

const invalidContractSamples = {
  'minimal-request': { ...contractSamples['minimal-request'], city: { ...contractSamples['minimal-request'].city, countryCode: 'FRA' } },
  'establishment-resolution': { ...contractSamples['establishment-resolution'], candidates: [] },
  'audit-packet': { ...contractSamples['audit-packet'], cost: { ...contractSamples['audit-packet'].cost, spent: 0.3, reserved: 0.3 } },
  'preparation-draft': { ...contractSamples['preparation-draft'], locale: 'fr_FR' },
  'demo-readiness': { ...contractSamples['demo-readiness'], checks: [] },
  'site-spec': { ...contractSamples['site-spec'], assets: [{ ...contractSamples['site-spec'].assets[0], rightsStatus: 'UNKNOWN' }] },
  'acceptance-report': { ...contractSamples['acceptance-report'], ruleVersions: [] },
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
  const schema = JSON.parse(await readFile(new URL('establishment-resolution.schema.json', contractsRoot), 'utf8'));
  const noCandidateResolution = { ...contractSamples['establishment-resolution'], candidates: [], siteCandidates: [], decision: 'ASK_MORE_DATA' };
  assert.equal(validateJsonSchema(schema, noCandidateResolution), noCandidateResolution);
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

test('refuse une somme qui dépasse la borne déclarée', () => {
  const schema = {
    type: 'object',
    required: ['limit', 'used', 'reserved'],
    properties: { limit: { type: 'number' }, used: { type: 'number' }, reserved: { type: 'number' } },
    sumMaximum: { properties: ['used', 'reserved'], maximumProperty: 'limit' },
  };
  const valid = { limit: 1, used: 0.4, reserved: 0.6 };
  assert.equal(validateJsonSchema(schema, valid), valid);
  assert.throws(() => validateJsonSchema(schema, { limit: 1, used: 0.6, reserved: 0.5 }), ValidationError);
});
