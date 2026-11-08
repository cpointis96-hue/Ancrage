import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSeoResearchPlanner } from '../../src/audit/seo-research-planner.mjs';

test('le secours sans IA reste adapté à l’activité, sans menu ni réservation supposés', async () => {
  const planner = createSeoResearchPlanner();
  const result = await planner({ name: 'Atelier des Pins', cityLabel: 'Tours', categories: ['Plombier'] });
  assert.deepEqual(result.plan.queries.map(item => item.query), ['Plombier Tours', 'Atelier des Pins Tours']);
  assert.doesNotMatch(JSON.stringify(result.plan), /menu|reservation|livraison/);
});
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createCostLedger } from '../../src/runs/cost-ledger.mjs';

const prompt = `---
id: local-seo-research-planner
name: Plan de recherche SEO locale
ownerStep: research-plan
outputContract: seo-research-plan
---
Retourne du JSON.`;

const schema = {
  type: 'object', required: ['category', 'queries'], additionalProperties: false,
  properties: {
    category: { type: 'string' },
    queries: { type: 'array', items: { type: 'object', required: ['query', 'intent', 'basis'], additionalProperties: false, properties: { query: { type: 'string' }, intent: { type: 'string' }, basis: { type: 'string' } } } },
  },
};

function dependencies(output) {
  return {
    providers: { async executionContext() { return { secret: 'test-secret' }; } },
    adapters: { openai: { async generate(input) { return { output, cost: 0.005, usage: { total_tokens: 12 }, input }; } } },
    prompts: { async get() { return { activeVersionId: 'prompt-v1' }; }, async resolveRevision() { return prompt; } },
    contracts: { async getActiveVersion() { return { versionId: 'contract-v1', schema }; } },
    workflows: { async resolveActive() { return { versionId: 'workflow-v1', definition: { steps: [{ id: 'research-plan', provider: 'openai', model: 'gpt-5.4-mini', promptRef: 'local-seo-research-planner', contractRef: 'seo-research-plan', maxOutputTokens: 700, budget: 0.05 }] } }; } },
  };
}

async function ledger(failEventType = null) {
  const store = createAtomicStore(await mkdtemp(path.join(tmpdir(), 'ancrage-seo-planner-')));
  const journalStore = failEventType ? { ...store, appendJsonLine: async (relativePath, event) => {
    if (event.type === failEventType) throw Object.assign(new Error('append interrompu'), { code: 'APPEND_FAILED' });
    return store.appendJsonLine(relativePath, event);
  } } : store;
  return { store, ledger: createCostLedger({ store: journalStore, runId: 'planner-run', envelope: { hardLimit: 0.5 } }) };
}

test('personnalise depuis un extrait vérifiable et refuse une spécialité inventée', async () => {
  const contract = JSON.parse(await readFile(new URL('../../fixtures/defaults/contracts/seo-research-plan.schema.json', import.meta.url), 'utf8'));
  const quote = 'Restaurant avec terrasse à Teyran';
  for (const [query, expected] of [['restaurant terrasse Teyran', 'SUCCEEDED'], ['restaurant italien Teyran', 'PARTIAL']]) {
    const output = { category: 'restaurant', queries: [{ query, intent: 'discovery', basis: 'observed-content', targetPage: 'page-accueil', sourceUrl: 'https://fixture.example/', quote, reason: 'Vérifier la visibilité de la terrasse annoncée.' }] };
    const deps = dependencies(output);
    deps.contracts.getActiveVersion = async () => ({ versionId: 'contract-content-test', schema: contract });
    const context = await ledger();
    const result = await createSeoResearchPlanner(deps)({ name: 'Test', cityLabel: 'Teyran', country: 'FR', categories: ['restaurant'], sitePages: [{ url: 'https://fixture.example/', text: quote }], ledger: context.ledger });
    assert.equal(result.status, expected);
    if (expected === 'SUCCEEDED') assert.equal(result.plan.queries[0].quote, quote);
    else assert.equal(result.cause, 'AI_QUERY_PLAN_REJECTED');
  }
});

test('règle la consommation tokens au tarif versionné sans rejeter le plan IA', async () => {
  const output = { category: 'restaurant', queries: [{ query: 'restaurant Teyran', intent: 'discovery', basis: 'observed-category' }] };
  const deps = dependencies(output);
  const definition = JSON.parse(await readFile(new URL('../../fixtures/defaults/workflows/local-seo-research.json', import.meta.url), 'utf8'));
  deps.workflows.resolveActive = async () => ({ versionId: 'priced-workflow', definition });
  deps.adapters.openai.generate = async () => ({ output, usage: { prompt_tokens: 1000, prompt_tokens_details: { cached_tokens: 100 }, completion_tokens: 100 } });
  const context = await ledger();
  const result = await createSeoResearchPlanner(deps)({ name: 'Test', cityLabel: 'Teyran', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.status, 'SUCCEEDED');
  assert.ok(Math.abs(context.ledger.snapshot().spent - 0.0011325) < 1e-12);
  assert.equal(context.ledger.snapshot().reserved, 0);
  assert.equal(result.source.pricing.model, 'gpt-5.4-mini');
});

test('exécute le plan IA configuré et borne sa sortie', async () => {
  const output = { category: 'restaurant', queries: [{ query: 'restaurant Assas', intent: 'discovery', basis: 'observed-category' }] };
  const planner = createSeoResearchPlanner(dependencies(output));
  const context = await ledger();
  const result = await planner({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger, costEventsRef: 'runs/planner-run/cost-events.jsonl' });
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.execution, 'adapter-call-no-network');
  assert.equal(result.plan.queries[0].query, 'restaurant Assas');
  assert.equal(result.source.maxOutputTokens, 700);
  assert.equal(result.source.costEvent.type, 'COST_SETTLED');
  assert.equal(result.source.costEventsRef, 'runs/planner-run/cost-events.jsonl');
  const events = (await readFile(path.join(context.store.root, 'runs/planner-run/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.slice(0, 2).map(item => item.type), ['COST_AUTHORIZED', 'COST_SETTLED']);
});

test('retombe sur un plan déterministe lorsque l’IA invente une catégorie', async () => {
  const output = { category: 'cantine', queries: [{ query: 'cantine Assas', intent: 'discovery', basis: 'observed-category' }] };
  const planner = createSeoResearchPlanner(dependencies(output));
  const context = await ledger();
  const result = await planner({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.cause, 'AI_CATEGORY_NOT_OBSERVED');
  assert.equal(result.plan.category, 'restaurant');
});

test('n’appelle pas le provider IA sans coût connu', async () => {
  let calls = 0;
  const dependenciesWithoutCost = dependencies({ category: 'restaurant', queries: [] });
  dependenciesWithoutCost.workflows.resolveActive = async () => ({ versionId: 'workflow-v1', definition: { steps: [{ id: 'research-plan', provider: 'openai', model: 'gpt-5.4-mini', promptRef: 'local-seo-research-planner', contractRef: 'seo-research-plan', maxOutputTokens: 700 }] } });
  dependenciesWithoutCost.adapters.openai.generate = async () => { calls += 1; return { output: {} }; };
  const context = await ledger();
  const result = await createSeoResearchPlanner(dependenciesWithoutCost)({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.cause, 'AI_COST_UNKNOWN');
  assert.equal(calls, 0);
});

test('libère l’autorisation IA lorsque le provider échoue', async () => {
  const failing = dependencies({ category: 'restaurant', queries: [] });
  failing.adapters.openai.generate = async () => { throw Object.assign(new Error('indisponible'), { code: 'AI_PROVIDER_FAILED' }); };
  const context = await ledger();
  const result = await createSeoResearchPlanner(failing)({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.cause, 'AI_PROVIDER_FAILED');
  assert.equal(result.execution, 'adapter-call-no-network-failed');
  assert.equal(result.source.costEvent.type, 'COST_RELEASED');
  const events = (await readFile(path.join(context.store.root, 'runs/planner-run/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(item => item.type), ['COST_AUTHORIZED', 'COST_RELEASED']);
});

test('conserve la réservation si le coût réel manque après l’appel', async () => {
  const missingCost = dependencies({ category: 'restaurant', queries: [] });
  missingCost.adapters.openai.generate = async () => ({ output: { category: 'restaurant', queries: [] }, usage: { total_tokens: 12 } });
  const context = await ledger();
  const result = await createSeoResearchPlanner(missingCost)({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.cause, 'AI_COST_UNAVAILABLE_AFTER_CALL');
  assert.equal(result.execution, 'adapter-call-no-network');
  assert.equal(result.source.ledgerReconciliation, 'REQUIRED');
  assert.equal(context.ledger.snapshot().reserved, 0.05);
  const events = (await readFile(path.join(context.store.root, 'runs/planner-run/cost-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(item => item.type), ['COST_AUTHORIZED']);
});

test('conserve la réservation et la preuve si le règlement échoue', async () => {
  const context = await ledger('COST_SETTLED');
  const result = await createSeoResearchPlanner(dependencies({ category: 'restaurant', queries: [] }))({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.cause, 'AI_COST_SETTLE_FAILED');
  assert.equal(result.execution, 'adapter-call-no-network');
  assert.equal(result.source.actualCost, 0.005);
  assert.equal(result.source.ledgerErrorCode, 'APPEND_FAILED');
  assert.equal(result.source.ledgerReconciliation, 'REQUIRED');
  assert.equal(context.ledger.snapshot().reserved, 0.05);
});

test('garde l’erreur provider et demande une réconciliation si la release échoue', async () => {
  const failing = dependencies({ category: 'restaurant', queries: [] });
  failing.adapters.openai.executionType = 'http';
  failing.adapters.openai.generate = async () => { throw Object.assign(new Error('indisponible'), { code: 'AI_PROVIDER_FAILED' }); };
  const context = await ledger('COST_RELEASED');
  const result = await createSeoResearchPlanner(failing)({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.cause, 'AI_COST_RELEASE_FAILED');
  assert.equal(result.execution, 'real-http-call-failed');
  assert.equal(result.source.providerErrorCode, 'AI_PROVIDER_FAILED');
  assert.equal(result.source.ledgerErrorCode, 'APPEND_FAILED');
  assert.equal(result.source.ledgerReconciliation, 'REQUIRED');
  assert.equal(context.ledger.snapshot().reserved, 0.05);
});

test('distingue un règlement durable d’une reprise de seuil à planifier', async () => {
  const recovering = dependencies({ category: 'restaurant', queries: [{ query: 'restaurant Assas', intent: 'discovery', basis: 'observed-category' }] });
  recovering.adapters.openai.generate = async () => ({ output: { category: 'restaurant', queries: [{ query: 'restaurant Assas', intent: 'discovery', basis: 'observed-category' }] }, cost: 0.5, usage: { total_tokens: 12 } });
  const context = await ledger('BUDGET_THRESHOLD');
  const result = await createSeoResearchPlanner(recovering)({ name: 'La Mameta', cityLabel: 'Assas', country: 'FR', categories: ['restaurant'], ledger: context.ledger });
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.source.costEvent.type, 'COST_SETTLED');
  assert.equal(result.source.thresholdRecoveryRequired, true);
  assert.equal(context.ledger.snapshot().spent, 0.5);
});
