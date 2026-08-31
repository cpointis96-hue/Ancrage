import { validateJsonSchema } from '../core/json-schema.mjs';
import { parsePromptMarkdown } from '../config/frontmatter.mjs';
import { normalize } from './seo-qualification.mjs';

const MAX_QUERIES = 6;

function clean(value) { return String(value ?? '').trim(); }
function uniqueQueries(values) {
  const seen = new Set();
  return values.filter(item => item && !seen.has(normalize(item.query)) && seen.add(normalize(item.query)));
}
function includesText(value, expected) { return normalize(value).includes(normalize(expected)); }
function knownCost(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
function fallbackResult(fallback, cause) { return { status: 'PARTIAL', cause, execution: 'not-run', plan: fallback, source: 'deterministic-fallback' }; }

export function createSeoResearchPlanner({ providers, adapters, prompts, workflows, contracts } = {}) {
  return async function plan({ name, cityLabel, country, categories = [], ledger = null, costEventsRef = null } = {}) {
    const fallback = {
      category: categories[0] ?? null,
      queries: categories[0] && cityLabel ? [
        { query: `${categories[0]} ${cityLabel}`, intent: 'discovery', basis: 'observed-category' },
        { query: `${categories[0]} ${cityLabel} menu`, intent: 'menu', basis: 'observed-category' },
        { query: `${name} ${cityLabel}`, intent: 'brand', basis: 'business-name' },
      ] : [],
    };
    if (!categories.length || !cityLabel) return fallbackResult(fallback, 'IDENTITY_CATEGORY_NOT_OBSERVED');
    try {
      const active = await workflows.resolveActive('local-seo-research');
      const step = active.definition.steps.find(item => item.id === 'research-plan');
      if (!step || !step.provider || !step.promptRef || !step.contractRef) return fallbackResult(fallback, 'SEO_RESEARCH_WORKFLOW_INVALID');
      const adapter = adapters?.[step.provider];
      if (typeof adapter?.generate !== 'function') return fallbackResult(fallback, 'AI_ADAPTER_UNAVAILABLE');
      const estimate = knownCost(step.budget);
      if (estimate === null) return fallbackResult(fallback, 'AI_COST_UNKNOWN');
      if (!ledger || typeof ledger.authorize !== 'function' || typeof ledger.settle !== 'function' || typeof ledger.cancel !== 'function') return fallbackResult(fallback, 'AI_COST_LEDGER_REQUIRED');
      const context = await providers.executionContext(step.provider);
      const prompt = await prompts.get(step.promptRef);
      if (!prompt.activeVersionId) return fallbackResult(fallback, 'AI_PROMPT_NOT_ACTIVE');
      const promptText = await prompts.resolveRevision(step.promptRef, prompt.activeVersionId);
      const contract = await contracts.getActiveVersion(step.contractRef);
      const authorization = await ledger.authorize({ stepId: step.id, provider: step.provider, unit: 'request', quantity: 1, estimatedCost: estimate, essential: false });
      let generated;
      try {
        generated = await adapter.generate({
          secret: context.secret,
          model: step.model,
          system: parsePromptMarkdown(promptText).body,
          input: { name, locality: cityLabel, country, allowedCategories: categories },
          maxOutputTokens: step.maxOutputTokens ?? 700,
        });
      } catch (error) {
        await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code ?? 'AI_RESEARCH_PLAN_FAILED' });
        throw error;
      }
      const actualCost = knownCost(generated?.cost ?? generated?.usage?.cost);
      if (actualCost === null) {
        await ledger.cancel({ authorizationId: authorization.authorizationId, reason: 'AI_COST_UNAVAILABLE_AFTER_CALL' });
        return fallbackResult(fallback, 'AI_COST_UNAVAILABLE_AFTER_CALL');
      }
      const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost });
      const source = { workflowVersionId: active.versionId, promptVersionId: prompt.activeVersionId, contractVersionId: contract.versionId, provider: step.provider, model: step.model, maxOutputTokens: step.maxOutputTokens ?? 700, configuredBudget: estimate, usage: generated.usage ?? null, actualCost, costEventsRef, costEvent: { authorizationId: authorization.authorizationId, type: 'COST_SETTLED', overLimit: settled.overLimit } };
      if (settled.overLimit) return { status: 'PARTIAL', cause: 'BUDGET_EXCEEDED_AFTER_CALL', execution: 'real-http-call', plan: fallback, source };
      let output;
      try { output = validateJsonSchema(contract.schema, generated.output); }
      catch (error) { return { status: 'PARTIAL', cause: error.code ?? 'AI_RESEARCH_PLAN_FAILED', execution: 'real-http-call', plan: fallback, source }; }
      const category = categories.find(item => normalize(item) === normalize(output.category));
      if (!category) return { status: 'PARTIAL', cause: 'AI_CATEGORY_NOT_OBSERVED', execution: 'real-http-call', plan: fallback, source };
      const queries = uniqueQueries((output.queries ?? []).map(item => {
        const query = clean(item?.query);
        if (!query || query.length > 120 || !includesText(query, cityLabel)) return null;
        if (item.basis === 'business-name' && !includesText(query, name)) return null;
        if (item.basis === 'observed-category' && !includesText(query, category)) return null;
        return { query, intent: item.intent, basis: item.basis };
      })).slice(0, MAX_QUERIES);
      if (!queries.length) return { status: 'PARTIAL', cause: 'AI_QUERY_PLAN_REJECTED', execution: 'real-http-call', plan: fallback, source };
      return { status: 'SUCCEEDED', execution: 'real-http-call', plan: { category, queries }, source };
    } catch (error) {
      return { status: 'PARTIAL', cause: error.code ?? 'AI_RESEARCH_PLAN_FAILED', execution: 'not-run', plan: fallback, source: 'deterministic-fallback' };
    }
  };
}
