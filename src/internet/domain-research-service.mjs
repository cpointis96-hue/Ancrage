import { ValidationError } from '../core/errors.mjs';

export function createDomainResearchService({ runs, store }) {
  return async ({ query }) => {
    if (typeof query !== 'string' || !query.trim()) throw new ValidationError('Nom de domaine requis.', { field: 'query' });
    const run = await runs.start('domain-research', { query: query.trim() });
    const checkpoint = await store.readJson(`runs/${run.id}/steps/domain-candidates/step-run.json`, null);
    return {
      runId: run.id,
      status: run.status,
      candidates: checkpoint?.output?.candidates ?? [],
    };
  };
}
