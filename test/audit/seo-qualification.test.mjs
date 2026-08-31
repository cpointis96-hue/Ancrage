import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeoResearchPlan, competitorType, qualifyCompetitorResults, qualifyKeywordResults, selectBusinessCompetitors } from '../../src/audit/seo-qualification.mjs';

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
    { domain: 'www.example.com', visibility: 90, keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'competitor.fr', visibility: 5, avg_position: 4, keywords: ['restaurant Teyran'], is_business: true },
    { url: 'https://competitor.fr/page', visibility: 8, keywords_count: 3, keywords: ['restaurant Teyran'], is_business: true },
  ] }] }] }, { targetDomain: 'https://example.com', selectedKeywords: ['restaurant Teyran'], locality: 'Teyran' });
  assert.equal(result.selected.length, 1);
  assert.equal(result.selected[0].domain, 'competitor.fr');
  assert.equal(result.selected[0].scope, 'national-seo');
  assert.equal(result.selected[0].visibility, 8);
  assert.equal(result.selected[0].locality, 'Teyran');
  assert.equal(result.selected[0].type, 'business');
  assert.equal(result.rejected[0].reason, 'AUDITED_DOMAIN_EXCLUDED');
});

test('conserve les candidats et rejette les annuaires, médias et plateformes sans compléter artificiellement', () => {
  const items = [
    { domain: 'tripadvisor.fr', keywords: ['restaurant Teyran'] },
    { domain: 'guide.local.fr', keywords: ['restaurant Teyran'] },
    { domain: 'instagram.com', keywords: ['restaurant Teyran'] },
    { domain: 'restaurant-a.fr', keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'restaurant-b.fr', keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'restaurant-c.fr', keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'restaurant-d.fr', keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'restaurant-e.fr', keywords: ['restaurant Teyran'], is_business: true },
    { domain: 'restaurant-f.fr', keywords: ['restaurant Teyran'], is_business: true },
  ];
  const result = qualifyCompetitorResults({ tasks: [{ result: [{ items }] }] }, { selectedKeywords: ['restaurant Teyran'] });
  assert.equal(result.candidates.length, 9);
  assert.deepEqual(result.selected.map(item => item.domain), ['restaurant-a.fr', 'restaurant-b.fr', 'restaurant-c.fr', 'restaurant-d.fr', 'restaurant-e.fr']);
  assert.deepEqual(result.rejected.filter(item => item.reason === 'NON_BUSINESS_COMPETITOR').map(item => item.type).sort(), ['directory', 'media', 'platform']);
  assert.equal(result.rejected.some(item => item.reason === 'COMPETITOR_SHORTLIST_LIMIT'), true);
});

test('canonise les URL, fusionne local et national, et motive chaque exclusion une seule fois', () => {
  const selection = selectBusinessCompetitors([
    { title: 'Restaurant voisin', url: 'https://www.voisin.fr/menu', scope: 'local-serp', source: 'dataforseo_local_finder', businessConfirmed: true },
    { title: 'Restaurant voisin SEO', domain: 'voisin.fr', scope: 'national-seo', source: 'dataforseo_labs_serp_competitors', matchedKeywords: ['restaurant Teyran'], is_business: true },
    { title: 'Établissement audité', url: 'https://www.example.com/', scope: 'local-serp', source: 'dataforseo_local_finder', businessConfirmed: true },
  ], { targetDomain: 'https://example.com', targetName: 'Établissement audité' });
  assert.equal(selection.candidates.length, 2);
  const voisin = selection.candidates.find(item => item.domain === 'voisin.fr');
  assert.deepEqual(voisin.scopes.sort(), ['local-serp', 'national-seo']);
  assert.deepEqual(voisin.sources.sort(), ['dataforseo_labs_serp_competitors', 'dataforseo_local_finder']);
  assert.equal(voisin.mergedCandidateCount, 2);
  assert.equal(voisin.mergeReason, 'CANONICAL_DOMAIN_COLLISION');
  assert.equal(selection.selected.length, 1);
  assert.equal(selection.rejected.length, 1);
  assert.equal(selection.rejected[0].reason, 'AUDITED_DOMAIN_EXCLUDED');
});

test('ne classe pas un titre ambigu comme média et rejette l’identité métier inconnue', () => {
  assert.equal(competitorType({ domain: 'restaurant.example', title: 'Le Guide Gourmand', businessConfirmed: true }), 'business');
  assert.equal(competitorType({ url: 'https://guide.restaurant.example/page', title: 'Restaurant voisin', businessConfirmed: true }), 'media');
  const result = selectBusinessCompetitors([{ domain: 'inconnu.example', title: 'Restaurant voisin', scope: 'national-seo', source: 'dataforseo_labs_serp_competitors' }]);
  assert.equal(result.selected.length, 0);
  assert.equal(result.rejected[0].reason, 'BUSINESS_IDENTITY_NOT_CONFIRMED');
});

test('écarte les villes et enseignes remontées par une idée nationale', () => {
  const plan = buildSeoResearchPlan({ name: 'Le Midi-Teyranais', cityLabel: 'Teyran', country: 'FR', identity: { primaryType: 'restaurant' } });
  const result = qualifyKeywordResults({ tasks: [{ result: [{ items: [
    { keyword: 'restaurant Teyran menu', keyword_info: { search_volume: 30 } },
    { keyword: 'restaurant Mende', keyword_info: { search_volume: 4400 } },
    { keyword: "Damian's restaurant menu", keyword_info: { search_volume: 2900 } },
    { keyword: 'menu restaurant scolaire', keyword_info: { search_volume: 2900 } },
    { keyword: 'menu restaurant', keyword_info: { search_volume: 1000 } },
  ] }] }] }, plan);
  assert.deepEqual(result.selected.map(item => item.keyword), ['restaurant Teyran menu', 'menu restaurant']);
  assert.equal(result.rejected.find(item => item.keyword === 'restaurant Mende').reason, 'QUERY_NOT_RELEVANT_TO_LOCAL_BUSINESS');
  assert.equal(result.rejected.find(item => item.keyword === "Damian's restaurant menu").reason, 'QUERY_NOT_RELEVANT_TO_LOCAL_BUSINESS');
});
