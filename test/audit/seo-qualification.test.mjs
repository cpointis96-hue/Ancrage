import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeoResearchPlan, qualifyCompetitorResults, qualifyKeywordResults } from '../../src/audit/seo-qualification.mjs';

test('construit les seeds depuis la catégorie observée et la ville', () => {
  const plan = buildSeoResearchPlan({ cityLabel: 'Teyran', country: 'FR', identity: { primaryType: 'restaurant' } });
  assert.deepEqual(plan.seeds, ['restaurant Teyran', 'restaurant Teyran menu', 'restaurant Teyran reservation']);
  assert.deepEqual(plan.anchors, ['restaurant']);
  assert.equal(plan.scope, 'local-business-category');
});

test('rejette les mots-clés hors activité mais conserve les opportunités de marché liées à la catégorie', () => {
  const plan = buildSeoResearchPlan({ cityLabel: 'Teyran', country: 'FR', identity: { primaryType: 'restaurant' } });
  const result = qualifyKeywordResults({ tasks: [{ result: [{ items: [
    { keyword: 'restaurant Teyran menu', keyword_info: { search_volume: 30 } },
    { keyword: 'menu cantine à Lyon', keyword_info: { search_volume: 800 } },
    { keyword: 'menu cantine monde', keyword_info: { search_volume: 500 } },
    { keyword: 'restaurant Teyran', keyword_info: { search_volume: null } },
  ] }] }] }, plan);
  assert.deepEqual(result.selected.map(item => item.keyword), ['restaurant Teyran menu', 'restaurant Teyran']);
  assert.equal(result.rejected.find(item => item.keyword === 'menu cantine à Lyon').reason, 'BUSINESS_ANCHOR_NOT_CONFIRMED');
  assert.equal(result.rejected.find(item => item.keyword === 'menu cantine monde').reason, 'BUSINESS_ANCHOR_NOT_CONFIRMED');
  assert.equal(result.selected[1].searchVolume, null);
});

test('refuse toute shortlist sans catégorie observée', () => {
  const plan = buildSeoResearchPlan({ cityLabel: 'Teyran', country: 'FR', identity: {} });
  const result = qualifyKeywordResults({ tasks: [{ result: [{ items: [{ keyword: 'restaurant Teyran' }] }] }] }, plan);
  assert.deepEqual(plan.seeds, []);
  assert.equal(result.selected.length, 0);
  assert.equal(result.rejected[0].reason, 'BUSINESS_CATEGORY_NOT_OBSERVED');
});

test('déduplique les concurrents, exclut le domaine audité et les qualifie comme SEO nationaux', () => {
  const result = qualifyCompetitorResults({ tasks: [{ result: [{ items: [
    { domain: 'www.example.com', visibility: 90 },
    { domain: 'competitor.fr', visibility: 5, avg_position: 4 },
    { url: 'https://competitor.fr/page', visibility: 8, keywords_count: 3 },
  ] }] }] }, { targetDomain: 'https://example.com', selectedKeywords: ['restaurant Teyran'], locality: 'Teyran' });
  assert.equal(result.length, 1);
  assert.equal(result[0].domain, 'competitor.fr');
  assert.equal(result[0].scope, 'national-seo');
  assert.equal(result[0].visibility, 8);
  assert.equal(result[0].locality, 'Teyran');
});
