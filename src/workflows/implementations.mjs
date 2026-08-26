export const defaultImplementations = {
  'collect-query': async ({ input }) => ({ query: input.query ?? '' }),
  'domain-candidates': async ({ input }) => ({ candidates: [{ domain: `${String(input.query).toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, source: 'fixture-adapter', availability: 'unknown' }] }),
};
