import { validateJsonSchema } from '../core/json-schema.mjs';
import { parsePromptMarkdown } from '../config/frontmatter.mjs';
import { normalize } from './seo-qualification.mjs';

const MAX_QUERIES = 3;

function clean(value) { return String(value ?? '').trim(); }
function uniqueQueries(values) {
  const seen = new Set();
  return values.filter(item => item && !seen.has(normalize(item.query)) && seen.add(normalize(item.query)));
}
function includesText(value, expected) { return normalize(value).includes(normalize(expected)); }
function knownCost(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
function fallbackResult(fallback, cause) { return { status: 'PARTIAL', cause, execution: 'not-run', plan: fallback, source: 'deterministic-fallback' }; }
function errorCode(error, fallback) { return typeof error?.code === 'string' && error.code ? error.code : fallback; }
function costFromUsage(usage, step) {
  const pricing = step.pricing;
  if (pricing?.provider !== step.provider || pricing?.model !== step.model || pricing?.currency !== 'USD') return null;
  if (![pricing.inputPerMillion, pricing.cachedInputPerMillion, pricing.outputPerMillion].every(value => knownCost(value) !== null)) return null;
  const input = usage?.prompt_tokens; const output = usage?.completion_tokens; const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0;
  if (![input, output, cached].every(value => Number.isInteger(value) && value >= 0) || cached > input) return null;
  return ((input - cached) * pricing.inputPerMillion + cached * pricing.cachedInputPerMillion + output * pricing.outputPerMillion) / 1_000_000;
}
function executionFor(adapter, failed = false) {
  const execution = adapter?.executionType === 'http' ? 'real-http-call' : 'adapter-call-no-network';
  return failed ? `${execution}-failed` : execution;
}

export function createSeoResearchPlanner({ providers, adapters, prompts, workflows, contracts } = {}) {
  return async function plan({ name, cityLabel, country, categories = [], sitePages = [], rankedKeywords = [], ledger = null, costEventsRef = null } = {}) {
    const fallback = {
      category: categories[0] ?? null,
      queries: categories[0] && cityLabel ? [
        { query: `${categories[0]} ${cityLabel}`, intent: 'discovery', basis: 'observed-category' },
        ...(name ? [{ query: `${name} ${cityLabel}`, intent: 'brand', basis: 'business-name' }] : []),
      ] : [],
    };
    if (!categories.length || !cityLabel) return fallbackResult(fallback, 'IDENTITY_CATEGORY_NOT_OBSERVED');

    const generationInput = { name, locality: cityLabel, country, allowedCategories: categories, sitePages: sitePages.slice(0, 6).map(page => ({ url: page.url, title: String(page.title ?? '').slice(0, 200), description: String(page.description ?? '').slice(0, 500), heading: String(page.heading ?? '').slice(0, 200), text: String(page.text ?? '').slice(0, 1200) })), rankedKeywords: rankedKeywords.slice(0, 30) };

    let active; let step; let adapter; let estimate; let context; let prompt; let promptText; let contract; let authorization;
    try {
      active = await workflows.resolveActive('local-seo-research');
      step = active.definition.steps.find(item => item.id === 'research-plan');
      if (!step || !step.provider || !step.promptRef || !step.contractRef) return fallbackResult(fallback, 'SEO_RESEARCH_WORKFLOW_INVALID');
      adapter = adapters?.[step.provider];
      if (typeof adapter?.generate !== 'function') return fallbackResult(fallback, 'AI_ADAPTER_UNAVAILABLE');
      estimate = knownCost(step.budget);
      if (estimate === null) return fallbackResult(fallback, 'AI_COST_UNKNOWN');
      if (!ledger || typeof ledger.authorize !== 'function' || typeof ledger.settle !== 'function' || typeof ledger.cancel !== 'function') return fallbackResult(fallback, 'AI_COST_LEDGER_REQUIRED');
      context = await providers.executionContext(step.provider);
      prompt = await prompts.get(step.promptRef);
      if (!prompt.activeVersionId) return fallbackResult(fallback, 'AI_PROMPT_NOT_ACTIVE');
      promptText = await prompts.resolveRevision(step.promptRef, prompt.activeVersionId);
      contract = await contracts.getActiveVersion(step.contractRef);
      const upperCost = costFromUsage({ prompt_tokens: Buffer.byteLength(parsePromptMarkdown(promptText).body + JSON.stringify(generationInput), 'utf8') + 256, completion_tokens: step.maxOutputTokens ?? 700 }, step);
      if (upperCost !== null && upperCost > estimate) return fallbackResult(fallback, 'AI_INPUT_EXCEEDS_BUDGET');
      authorization = await ledger.authorize({ stepId: step.id, provider: step.provider, unit: 'request', quantity: 1, estimatedCost: estimate, essential: false });
    } catch (error) {
      return fallbackResult(fallback, errorCode(error, 'AI_RESEARCH_PLAN_FAILED'));
    }

    const source = extra => ({
      workflowVersionId: active.versionId,
      promptVersionId: prompt.activeVersionId,
      contractVersionId: contract.versionId,
      provider: step.provider,
      model: step.model,
      maxOutputTokens: step.maxOutputTokens ?? 700,
      configuredBudget: estimate,
      ...(step.pricing ? { pricing: step.pricing } : {}),
      costEventsRef,
      authorizationId: authorization.authorizationId,
      ...extra,
    });

    let generated;
    try {
      generated = await adapter.generate({
        secret: context.secret,
        model: step.model,
        system: parsePromptMarkdown(promptText).body,
        input: generationInput,
        maxOutputTokens: step.maxOutputTokens ?? 700,
      });
    } catch (providerError) {
      const providerErrorCode = errorCode(providerError, 'AI_RESEARCH_PLAN_FAILED');
      try {
        await ledger.cancel({ authorizationId: authorization.authorizationId, reason: providerErrorCode });
        return { status: 'PARTIAL', cause: providerErrorCode, execution: executionFor(adapter, true), plan: fallback, source: source({ providerErrorCode, costEvent: { type: 'COST_RELEASED' } }) };
      } catch (releaseError) {
        return { status: 'PARTIAL', cause: 'AI_COST_RELEASE_FAILED', execution: executionFor(adapter, true), plan: fallback, source: source({ providerErrorCode, ledgerErrorCode: errorCode(releaseError, 'AI_COST_RELEASE_FAILED'), costEvent: { type: 'COST_AUTHORIZED' }, ledgerReconciliation: 'REQUIRED' }) };
      }
    }

    const actualCost = knownCost(generated?.cost ?? generated?.usage?.cost ?? costFromUsage(generated?.usage, step));
    if (actualCost === null) return { status: 'PARTIAL', cause: 'AI_COST_UNAVAILABLE_AFTER_CALL', execution: executionFor(adapter), plan: fallback, source: source({ usage: generated?.usage ?? null, costEvent: { type: 'COST_AUTHORIZED' }, ledgerReconciliation: 'REQUIRED' }) };

    let settled;
    try {
      settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost });
    } catch (settleError) {
      return { status: 'PARTIAL', cause: 'AI_COST_SETTLE_FAILED', execution: executionFor(adapter), plan: fallback, source: source({ usage: generated?.usage ?? null, actualCost, ledgerErrorCode: errorCode(settleError, 'AI_COST_SETTLE_FAILED'), costEvent: { type: 'COST_AUTHORIZED' }, ledgerReconciliation: 'REQUIRED' }) };
    }
    const settledSource = source({ usage: generated.usage ?? null, actualCost, costEvent: { type: 'COST_SETTLED', overLimit: settled.overLimit }, ...(settled.thresholdRecoveryRequired ? { thresholdRecoveryRequired: true } : {}) });
    if (settled.overLimit) return { status: 'PARTIAL', cause: 'BUDGET_EXCEEDED_AFTER_CALL', execution: executionFor(adapter), plan: fallback, source: settledSource };

    let output;
    try { output = validateJsonSchema(contract.schema, generated.output); }
    catch (error) { return { status: 'PARTIAL', cause: errorCode(error, 'AI_RESEARCH_PLAN_FAILED'), execution: executionFor(adapter), plan: fallback, source: settledSource }; }
    const category = categories.find(item => normalize(item) === normalize(output.category));
    if (!category) return { status: 'PARTIAL', cause: 'AI_CATEGORY_NOT_OBSERVED', execution: executionFor(adapter), plan: fallback, source: settledSource };
    const queries = uniqueQueries((output.queries ?? []).map(item => {
      const query = clean(item?.query);
      if (!query || query.length > 120 || !includesText(query, cityLabel)) return null;
      if (item.basis === 'business-name' && !includesText(query, name)) return null;
      if (item.basis === 'observed-category' && !includesText(query, category)) return null;
      if (item.basis === 'observed-content') {
        const page = sitePages.find(page => page.url === item.sourceUrl);
        const quote = clean(item.quote);
        if (!page || quote.length < 10 || !includesText(page.text, quote) || !includesText(query, category)) return null;
        const allowedWords = new Set(normalize(`${quote} ${category} ${cityLabel} ${name} a au aux de du des le la les en et pour`).split(' '));
        if (normalize(query).split(' ').some(word => !allowedWords.has(word))) return null;
      }
      return { query, intent: item.intent, basis: item.basis, ...(item.targetPage ? { targetPage: item.targetPage } : {}), ...(item.reason ? { reason: item.reason } : {}), ...(item.basis === 'observed-content' ? { sourceUrl: item.sourceUrl, quote: item.quote } : {}) };
    })).slice(0, MAX_QUERIES);
    if (!queries.length) return { status: 'PARTIAL', cause: 'AI_QUERY_PLAN_REJECTED', execution: executionFor(adapter), plan: fallback, source: settledSource };
    return { status: 'SUCCEEDED', execution: executionFor(adapter), plan: { category, queries }, source: settledSource };
  };
}
