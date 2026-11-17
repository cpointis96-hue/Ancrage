import { validateJsonSchema } from '../core/json-schema.mjs';
import { parsePromptMarkdown } from '../config/frontmatter.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';
import { domainOf, normalize } from './seo-qualification.mjs';
import { decodeHtmlText } from './html-text.mjs';

export function publicSource(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === 'maps.google.com' && url.searchParams.has('cid')) url.searchParams.delete('g_mp');
    return url.href;
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
      const business = `${JSON.stringify(subject.name)} ${JSON.stringify(subject.city)}`;
      const researchPlan = { firstQuery: `${business} site officiel horaires contact`, secondQuery: `${business} fiche établissement annuaire` };
      const coverage = { siteProvided: Boolean(subject.domain), pagesCaptured: pages.filter(page => page.crawlStatus === 'complete').length, pagesUnavailable: pages.filter(page => page.crawlStatus !== 'complete').length };
      const reviews = observations.filter(item => /^google-review-\d+$/.test(item.id));
      const reviewDates = reviews.map(item => item.fact.match(/^Avis Google, (\d{4}-\d{2}-\d{2})/)?.[1]).filter(Boolean).sort();
      const reviewSample = { count: reviews.length, earliest: reviewDates[0] ?? null, latest: reviewDates.at(-1) ?? null, selection: 'GOOGLE_RELEVANCE' };
      result = await adapter.research({ secret: context.secret, model: step.model, system, input: { subject, observedAt, researchPlan, coverage, reviewSample, observations, outputSchema: contract.schema }, maxOutputTokens: Math.min(step.maxOutputTokens ?? 8000, 10000), maxToolCalls: step.maxToolCalls ?? 8, timeoutMs: Math.min(step.timeoutMs ?? 150000, 180000) });
    } catch (error) {
      // A timeout or an ambiguous network error does not prove that the call was free.
      if (/^HTTP_4\d\d$/.test(error.code ?? '')) await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code });
      return { ...failed(/^HTTP_4\d\d$/.test(error.code ?? '') ? error.code : 'AI_COST_RECONCILIATION_REQUIRED'), ...(error.providerError ? { providerError: error.providerError } : {}) };
    }
    const cost = costOf(result, step);
    if (cost === null) return failed('AI_COST_UNAVAILABLE_AFTER_CALL');
    provenance.usage = {
      inputTokens: result.usage?.input_tokens ?? null,
      cachedInputTokens: result.usage?.input_tokens_details?.cached_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
      searchCalls: result.searchCalls ?? null,
      costUsd: cost,
    };
    try {
      const settled = await ledger.settle({ authorizationId: authorization.authorizationId, actualCost: cost });
      if (settled.overLimit) return failed('BUDGET_EXCEEDED_AFTER_CALL');
    } catch { return failed('AI_COST_RECONCILIATION_REQUIRED'); }
    try { validateJsonSchema(contract.schema, result.output); }
    catch (error) {
      // One malformed editorial item must not discard every independently valid finding.
      const output = result.output;
      if (!output || typeof output !== 'object' || Array.isArray(output)) return { ...failed('AI_OBSERVATIONS_INVALID'), validationError: error.message };
      const cleaned = {};
      for (const key of ['observations', 'priorities', 'competitors', 'queries', 'limitations']) {
        const definition = contract.schema.properties[key];
        cleaned[key] = (Array.isArray(output[key]) ? output[key] : []).filter(item => {
          try { validateJsonSchema(definition.items, item); return true; } catch { return false; }
        }).slice(0, definition.maxItems);
      }
      try { validateJsonSchema(contract.schema.properties.conclusion, output.conclusion); cleaned.conclusion = output.conclusion; }
      catch { cleaned.conclusion = { decision: 'UNDETERMINED', reason: 'Les éléments valides ne suffisent pas à conclure.', observationIds: [] }; }
      if (!result.completed || !result.searchCalls || !cleaned.observations.length) return { ...failed('AI_OBSERVATIONS_INVALID'), validationError: error.message };
      const qualified = qualifyObservationResearch({ result: { ...result, output: cleaned }, subject, observations, observedAt, provider: step.provider, execution, source: provenance });
      return { ...qualified, status: 'PARTIAL', cause: 'AI_OBSERVATIONS_PARTIALLY_INVALID', validationError: error.message };
    }
    if (!result.completed || !result.searchCalls) return failed('AI_WEB_SEARCH_NOT_EXECUTED');
    return qualifyObservationResearch({ result, subject, observations, observedAt, provider: step.provider, execution, source: provenance });
  };
}

export function qualifyObservationResearch({ result, subject, observations, observedAt, provider, execution, source }) {
    const urls = new Set((result.sources ?? []).map(item => publicSource(item.url)).filter(Boolean));
    const output = result.output;
    const seen = new Set();
    const captured = Map.groupBy(observations.filter(item => publicSource(item.url)), item => publicSource(item.url));
    const capturedQuote = (item, records) => {
      const quotes = [...item.quote.matchAll(/"([^"]+)"/g)].map(match => match[1]);
      if (!quotes.length) quotes.push(item.quote);
      const excerpts = quotes.flatMap(quote => quote.split(/\s*(?:…|\.{3})\s*/)).filter(Boolean);
      return excerpts.length && excerpts.every(quote => {
        const excerpt = normalize(decodeHtmlText(quote));
        return excerpt.length >= 4 && records.some(record => normalize(decodeHtmlText(record.fact)).includes(excerpt));
      });
    };
    const rejectedObservations = [];
    const webObservations = [];
    for (const item of output.observations) {
      const url = publicSource(item.url);
      const records = captured.get(url);
      const reviewRecords = records?.filter(record => /^google-review-\d+$/.test(record.id)) ?? [];
      const sourceKind = records
        ? capturedQuote(item, records) && (reviewRecords.length && capturedQuote(item, reviewRecords) ? 'google-review' : 'captured-page')
        : urls.has(url) ? 'web-search' : null;
      const reason = !/^web-source-\d+$/.test(item.id) || seen.has(item.id) ? 'INVALID_OBSERVATION_ID' : !sourceKind ? 'QUOTE_NOT_CAPTURED' : null;
      if (reason) {
        rejectedObservations.push({ id: item.id, url, reason });
        continue;
      }
      seen.add(item.id);
      webObservations.push({ ...item, url, id: `web-${webObservations.length + 1}`, classification: 'AI_INTERPRETED', sourceKind, originalId: item.id });
    }
    const ids = new Map([...observations.map(item => [item.id, item.id]), ...webObservations.map(item => [item.originalId, item.id])]);
    const corrections = new Set();
    const reviewIds = new Set([...observations.filter(item => /^google-review-\d+$/.test(item.id)), ...webObservations.filter(item => item.sourceKind === 'google-review')].map(item => item.id));
    const hoursConflictSupported = item => {
      if (!/horaires/.test(normalize(item.title)) || !/align|harmonis|contradic|incoher/.test(normalize(item.title))) return true;
      const schedules = new Map();
      const weekdays = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/;
      for (const id of item.observationIds) {
        const evidence = [...observations, ...webObservations].find(value => value.id === id || value.originalId === id);
        if (!evidence?.url || evidence.id === 'google-current-hours') continue;
        const parts = normalize(evidence.quote ?? evidence.fact).split(weekdays);
        for (let index = 1; index < parts.length; index += 2) {
          const day = parts[index];
          const range = parts[index + 1].trim();
          const slots = [...range.matchAll(/\b([01]?\d|2[0-3]) ([0-5]\d)(?: a)? ([01]?\d|2[0-3]) ([0-5]\d)\b/g)]
            .map(match => match.slice(1).map(Number).join(':'));
          if (range === 'ferme') slots.push('CLOSED');
          if (!slots.length) continue;
          const bySource = schedules.get(day) ?? new Map();
          bySource.set(evidence.url, new Set([...(bySource.get(evidence.url) ?? []), ...slots]));
          schedules.set(day, bySource);
        }
      }
      for (const bySource of schedules.values()) {
        const entries = [...bySource.values()];
        if (entries.some((left, index) => entries.slice(index + 1).some(right => left.size === right.size && [...left].some(slot => !right.has(slot))))) return true;
      }
      return false;
    };
    const supportedPriorities = output.priorities.filter(item => item.observationIds.length && item.observationIds.every(id => ids.has(id)) && hoursConflictSupported(item));
    const priorities = supportedPriorities.filter(item => {
      const correction = normalize(item.correction);
      if (corrections.has(correction)) return false;
      corrections.add(correction);
      return true;
    }).map(item => {
      const observationIds = [...new Set(item.observationIds.map(id => ids.get(id)))];
      const reviewOnly = observationIds.every(id => reviewIds.has(id));
      return { ...item, ...(reviewOnly && { confidence: 'TO_VERIFY' }), observationIds, classification: 'AI_INTERPRETED' };
    });
    const competitorNames = new Set();
    const competitors = output.competitors.filter(item => {
      const domain = domainOf(item.url);
      const name = normalize(item.name);
      if (!urls.has(publicSource(item.url)) || domain === domainOf(subject.domain) || name === normalize(subject.name) || competitorNames.has(name)) return false;
      competitorNames.add(name);
      return true;
    }).map(item => ({ title: item.name, url: publicSource(item.url), domain: null, comparison: item.comparison, scope: 'public-web', classification: 'AI_INTERPRETED' }));
    const evidence = webObservations.map(item => createEvidenceSnapshot({ sourceType: item.sourceKind === 'web-search' ? 'ai-web-research' : item.sourceKind === 'google-review' ? 'ai-review-interpretation' : 'ai-crawl-interpretation', provider, canonicalUrl: item.url, observedAt, rawPayload: JSON.stringify(item), ruleVersion: 'observation-audit-v1', requestParameters: { model: source.model } }));
    const supportedConclusion = output.conclusion.observationIds.length && output.conclusion.observationIds.every(id => ids.has(id));
    const complete = (priorities.length > 0 || output.conclusion.decision === 'KEEP_SITE') && supportedPriorities.length === output.priorities.length && webObservations.some(item => urls.has(item.url)) && supportedConclusion && !rejectedObservations.length;
    const observedWords = new Set(normalize(decodeHtmlText([subject.name, subject.city, subject.category, ...observations.map(item => item.fact), ...webObservations.map(item => item.fact)].join(' '))).split(' '));
    const queries = output.queries.filter(item => normalize(item.query).includes(normalize(subject.city)) && normalize(item.query).split(' ').every(word => word.length < 3 || observedWords.has(word)));
    return { status: complete ? 'SUCCEEDED' : 'PARTIAL', cause: complete ? null : 'AI_OBSERVATIONS_INSUFFICIENT', execution, source, qualification: { rejectedObservations, rejectedPriorities: output.priorities.filter(item => !supportedPriorities.includes(item)).map(item => ({ title: item.title, missingObservationIds: item.observationIds.filter(id => !ids.has(id)) })), unsupportedConclusionIds: output.conclusion.observationIds.filter(id => !ids.has(id)) }, observations: webObservations, priorities, competitors, queries, conclusion: supportedConclusion ? { ...output.conclusion, observationIds: output.conclusion.observationIds.map(id => ids.get(id)), classification: 'AI_INTERPRETED' } : null, limitations: output.limitations, evidence };
}
