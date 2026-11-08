import { validateJsonSchema } from '../core/json-schema.mjs';
import { parsePromptMarkdown } from '../config/frontmatter.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';
import { domainOf, normalize } from './seo-qualification.mjs';
import { decodeHtmlText } from './html-text.mjs';

export function publicSource(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function costOf(result, step) {
  if (Number.isFinite(result.cost) && result.cost >= 0) return result.cost;
  const usage = result.usage; const pricing = step.pricing;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  if (pricing?.model !== step.model || pricing?.provider !== step.provider || pricing?.currency !== 'USD') return null;
  if (![usage?.input_tokens, usage?.output_tokens, cached, result.searchCalls].every(value => Number.isInteger(value) && value >= 0) || cached > usage.input_tokens) return null;
  if (![pricing.inputPerMillion, pricing.cachedInputPerMillion, pricing.outputPerMillion, pricing.webSearchPerCall].every(value => Number.isFinite(value) && value >= 0)) return null;
  return ((usage.input_tokens - cached) * pricing.inputPerMillion + cached * pricing.cachedInputPerMillion + usage.output_tokens * pricing.outputPerMillion) / 1e6 + result.searchCalls * pricing.webSearchPerCall;
}

export function createObservationAnalyst({ providers, adapters, workflows, prompts, contracts } = {}) {
  return async ({ subject, pages, observations, ledger, observedAt, costEventsRef = null }) => {
    const unavailable = cause => ({ status: 'PARTIAL', cause, execution: 'not-run', observations: [], priorities: [], competitors: [], queries: [], evidence: [] });
    let step; let context; let adapter; let system; let contract; let authorization; let provenance;
    try {
      const workflow = await workflows.resolveActive('public-observation-audit');
      step = workflow.definition.steps.find(item => item.id === 'observation-analysis');
      adapter = adapters?.[step?.provider];
      if (typeof adapter?.research !== 'function') return unavailable('AI_WEB_RESEARCH_UNAVAILABLE');
      context = await providers.executionContext(step.provider);
      const prompt = await prompts.get(step.promptRef);
      system = parsePromptMarkdown(await prompts.resolveRevision(step.promptRef, prompt.activeVersionId)).body;
      contract = await contracts.getActiveVersion(step.contractRef);
      provenance = { workflowVersionId: workflow.versionId, promptVersionId: prompt.activeVersionId, contractVersionId: contract.versionId, provider: step.provider, model: step.model, ...(costEventsRef ? { costEventsRef } : {}) };
      if (!Number.isFinite(step.budget) || step.budget <= 0) return unavailable('AI_COST_UNKNOWN');
      authorization = await ledger.authorize({ stepId: step.id, provider: step.provider, unit: 'request', quantity: 1, estimatedCost: step.budget, essential: true });
    } catch (error) { return unavailable(error.code === 'BUDGET_EXCEEDED' ? error.code : 'AI_WEB_RESEARCH_NOT_READY'); }
    const execution = adapter.executionType === 'http' ? 'real-http-call' : 'adapter-call-no-network';
    const failed = cause => ({ ...unavailable(cause), execution, source: provenance });
    let result;
    try {
      const researchPlan = { firstQuery: `${JSON.stringify(subject.name)} ${JSON.stringify(subject.city)} horaires téléphone site officiel`, secondQuery: `${JSON.stringify(subject.name)} ${JSON.stringify(subject.city)} mairie annuaire` };
      result = await adapter.research({ secret: context.secret, model: step.model, system, input: { subject, researchPlan, pages: pages.slice(0, 6), observations, outputSchema: contract.schema }, maxOutputTokens: Math.min(step.maxOutputTokens ?? 8000, 10000), maxToolCalls: 8, timeoutMs: Math.min(step.timeoutMs ?? 150000, 180000) });
    } catch (error) {
      // A timeout or an ambiguous network error does not prove that the call was free.
      if (/^HTTP_4\d\d$/.test(error.code ?? '')) await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code });
      return { ...failed(/^HTTP_4\d\d$/.test(error.code ?? '') ? error.code : 'AI_COST_RECONCILIATION_REQUIRED'), ...(error.providerError ? { providerError: error.providerError } : {}) };
    }
    const cost = costOf(result, step);
    if (cost === null) return failed('AI_COST_UNAVAILABLE_AFTER_CALL');
    try {
      const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost: cost });
      if (settled.overLimit) return failed('BUDGET_EXCEEDED_AFTER_CALL');
    } catch { return failed('AI_COST_RECONCILIATION_REQUIRED'); }
    try { validateJsonSchema(contract.schema, result.output); }
    catch (error) { return { ...failed('AI_OBSERVATIONS_INVALID'), validationError: error.message }; }
    if (!result.completed || !result.searchCalls) return failed('AI_WEB_SEARCH_NOT_EXECUTED');
    return qualifyObservationResearch({ result, subject, observations, observedAt, provider: step.provider, execution, source: provenance });
  };
}

export function qualifyObservationResearch({ result, subject, observations, observedAt, provider, execution, source }) {
    const urls = new Set((result.sources ?? []).map(item => publicSource(item.url)).filter(Boolean));
    const output = result.output;
    const seen = new Set();
    const capturedQuote = item => {
      const text = observations.filter(observation => publicSource(observation.url) === publicSource(item.url)).map(observation => observation.fact).join(' ');
      const quotes = [...item.quote.matchAll(/"([^"]+)"/g)].map(match => match[1]);
      if (!quotes.length) quotes.push(item.quote);
      return quotes.length && quotes.every(quote => normalize(decodeHtmlText(quote)).length >= 4 && normalize(decodeHtmlText(text)).includes(normalize(decodeHtmlText(quote))));
    };
    const webObservations = output.observations.filter(item => /^web-source-\d+$/.test(item.id) && !seen.has(item.id) && seen.add(item.id) && (urls.has(publicSource(item.url)) || capturedQuote(item))).map((item, index) => ({ ...item, url: publicSource(item.url), id: `web-${index + 1}`, classification: 'AI_INTERPRETED', sourceKind: urls.has(publicSource(item.url)) ? 'web-search' : 'captured-page', originalId: item.id }));
    const ids = new Map([...observations.map(item => [item.id, item.id]), ...webObservations.map(item => [item.originalId, item.id])]);
    const corrections = new Set();
    const supportedPriorities = output.priorities.filter(item => item.observationIds.length && item.observationIds.every(id => ids.has(id)));
    const priorities = supportedPriorities.filter(item => {
      const correction = normalize(item.correction);
      if (corrections.has(correction)) return false;
      corrections.add(correction);
      return true;
    }).map(item => ({ ...item, observationIds: item.observationIds.map(id => ids.get(id)), classification: 'AI_INTERPRETED' }));
    const competitorNames = new Set();
    const competitors = output.competitors.filter(item => {
      const domain = domainOf(item.url);
      const name = normalize(item.name);
      if (!urls.has(publicSource(item.url)) || domain === domainOf(subject.domain) || name === normalize(subject.name) || competitorNames.has(name)) return false;
      competitorNames.add(name);
      return true;
    }).map(item => ({ title: item.name, url: publicSource(item.url), domain: null, comparison: item.comparison, scope: 'public-web', classification: 'AI_INTERPRETED' }));
    const evidence = webObservations.map(item => createEvidenceSnapshot({ sourceType: item.sourceKind === 'web-search' ? 'ai-web-research' : 'ai-crawl-interpretation', provider, canonicalUrl: item.url, observedAt, rawPayload: JSON.stringify(item), ruleVersion: 'observation-audit-v1', requestParameters: { model: source.model } }));
    const supportedConclusion = output.conclusion.observationIds.length && output.conclusion.observationIds.every(id => ids.has(id));
    const complete = (priorities.length > 0 || output.conclusion.decision === 'KEEP_SITE') && supportedPriorities.length === output.priorities.length && webObservations.some(item => item.sourceKind === 'web-search') && supportedConclusion;
    const observedWords = new Set(normalize(decodeHtmlText([subject.name, subject.city, subject.category, ...observations.map(item => item.fact), ...webObservations.map(item => item.fact)].join(' '))).split(' '));
    const queries = output.queries.filter(item => normalize(item.query).includes(normalize(subject.city)) && normalize(item.query).split(' ').every(word => word.length < 3 || observedWords.has(word)));
    return { status: complete ? 'SUCCEEDED' : 'PARTIAL', cause: complete ? null : 'AI_OBSERVATIONS_INSUFFICIENT', execution, source, observations: webObservations, priorities, competitors, queries, conclusion: supportedConclusion ? { ...output.conclusion, observationIds: output.conclusion.observationIds.map(id => ids.get(id)), classification: 'AI_INTERPRETED' } : null, limitations: output.limitations, evidence };
}
