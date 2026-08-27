export const STANDARD_AUDIT_PROFILE = Object.freeze({
  maxPages: 50,
  maxBytes: 25 * 1024 * 1024,
  timeoutMs: 180000,
});

export const STANDARD_AUDIT_BUDGET = Object.freeze({
  hardLimit: 2,
  currency: 'USD',
  endpointCosts: Object.freeze({
    serpMaps: 0.3,
    serpOrganicLiveAdvanced: 0.15,
    businessListings: 0.2,
    onPage: 0.3,
    keywordSearchVolume: 0.1,
    keywordIdeas: 0.1,
    keywordOverview: 0.2,
    serpCompetitors: 0.3,
  }),
});

export function resolveAuditProfile(profile = {}) {
  return { ...STANDARD_AUDIT_PROFILE, ...profile };
}

export function resolveAuditBudget(budget = {}) {
  return { ...STANDARD_AUDIT_BUDGET, ...budget, endpointCosts: { ...STANDARD_AUDIT_BUDGET.endpointCosts, ...(budget.endpointCosts ?? {}) } };
}
