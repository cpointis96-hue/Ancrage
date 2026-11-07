const INTENT_RULES = [
  { name: 'menu', terms: ['menu', 'carte'] },
  { name: 'reservation', terms: ['reservation', 'reserver', 'book', 'booking'] },
  { name: 'delivery', terms: ['livraison', 'delivery', 'deliveroo', 'uber eats'] },
  { name: 'contact', terms: ['contact', 'telephone', 'adresse', 'horaires'] },
];

const GENERIC_CATEGORY_QUERIES = new Set([
  'restaurant',
  'restaurant menu',
  'menu restaurant',
  'menu de restaurant',
  'menu du restaurant',
  'carte de restaurant',
  'carte menu restaurant',
  'cuisine restaurant',
  'fait maison restaurant menu',
]);
const OFF_TOPIC_TERMS = ['cantine', 'scolaire', 'ikea', 'porte menu', 'guide michelin', 'pdf'];

function normalize(value) {
  return String(value ?? '')
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(value) { return normalize(value).split(' ').filter(Boolean); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function flattenItems(result) {
  return (result?.tasks ?? result?.data?.tasks ?? [])
    .flatMap(task => task?.result ?? [])
    .flatMap(item => Array.isArray(item?.items) ? item.items : [item])
    .filter(item => item && typeof item === 'object');
}

function significantWords(value) { return words(value).filter(word => word.length >= 3); }

function includesPhraseOrWords(haystack, phrase) {
  const normalizedHaystack = normalize(haystack);
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedHaystack.includes(normalizedPhrase)) return true;
  const wanted = significantWords(normalizedPhrase);
  return wanted.length > 0 && wanted.every(word => normalizedHaystack.split(' ').includes(word));
}

function categoryValues(identity = {}) {
  return [identity.primaryTypeDisplayName, identity.primaryType]
    .filter(value => typeof value === 'string' && value.trim());
}

function keywordValue(item) {
  return item?.keyword ?? item?.keyword_data?.keyword ?? item?.keyword_info?.keyword ?? null;
}

function keywordInfo(item) {
  return item?.keyword_info ?? item?.keyword_data?.keyword_info ?? {};
}

function keywordIntent(item, keyword) {
  const providerIntent = item?.search_intent_info?.main_intent ?? item?.keyword_data?.search_intent_info?.main_intent;
  if (typeof providerIntent === 'string' && providerIntent.trim()) return providerIntent.trim().toLowerCase();
  const normalized = normalize(keyword);
  return INTENT_RULES.find(rule => rule.terms.some(term => normalized.includes(normalize(term))))?.name ?? 'discovery';
}

function keywordMatchesName(keyword, name) {
  return Boolean(name) && includesPhraseOrWords(keyword, name);
}

function hasNamedNoise(keyword, plan) {
  const normalized = normalize(keyword);
  if (OFF_TOPIC_TERMS.some(term => normalized.includes(normalize(term)))) return true;
  if (String(keyword).includes("'") || String(keyword).includes('’')) return true;
  if (GENERIC_CATEGORY_QUERIES.has(normalized)) return true;
  if (plan.locality && includesPhraseOrWords(keyword, plan.locality)) return false;
  if (plan.name && keywordMatchesName(keyword, plan.name)) return false;
  return Boolean(plan.locality);
}

function domainOf(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLocaleLowerCase('en').replace(/^www\./, '') || null;
  } catch { return null; }
}

export function buildSeoResearchPlan({ name, cityLabel, country, identity = {}, planned = null } = {}) {
  const locality = String(cityLabel ?? '').trim();
  const anchors = unique(categoryValues(identity).map(normalize).filter(Boolean));
  const primaryAnchor = anchors[0] ?? null;
  const plannedQueries = Array.isArray(planned?.queries) ? planned.queries : [];
  const seeds = plannedQueries.length
    ? unique(plannedQueries.map(item => String(item?.query ?? '').trim()).filter(Boolean)).slice(0, 6)
    : primaryAnchor && locality
    ? unique([
      `${primaryAnchor} ${locality}`,
      name ? `${name} ${locality}` : null,
    ])
    : [];
  return {
    locality,
    name: String(name ?? '').trim(),
    country: String(country ?? '').trim().toUpperCase() || null,
    anchors,
    category: planned?.category ?? primaryAnchor,
    seeds,
    queries: plannedQueries.filter(item => seeds.includes(item.query)),
    scope: primaryAnchor ? 'local-business-category' : 'local-business-category-unknown',
    planner: plannedQueries.length ? 'configured-ai' : 'deterministic-fallback',
    reasons: primaryAnchor ? ['OBSERVED_PRIMARY_CATEGORY'] : ['IDENTITY_CATEGORY_NOT_OBSERVED'],
  };
}

function normalizedKeywordRow(item, plan) {
  const keyword = String(keywordValue(item) ?? '').trim();
  if (!keyword) return null;
  const info = keywordInfo(item);
  const localityMatch = includesPhraseOrWords(keyword, plan.locality);
  const businessMatch = plan.anchors.some(anchor => includesPhraseOrWords(keyword, anchor));
  const nameMatch = keywordMatchesName(keyword, plan.name);
  const intent = keywordIntent(item, keyword);
  const targetPage = plan.queries?.find(item => normalize(item.query) === normalize(keyword))?.targetPage ?? (intent === 'menu' ? 'page-menu' : intent === 'reservation' ? 'page-reservation' : intent === 'delivery' ? 'page-services' : intent === 'contact' ? 'page-contact' : 'page-accueil');
  const searchVolume = info.search_volume ?? null;
  const competition = info.competition ?? null;
  const cpc = info.cpc ?? null;
  const keywordDifficulty = info.keyword_difficulty ?? item?.keyword_data?.keyword_info?.keyword_difficulty ?? null;
  const priority = (localityMatch ? 50 : 0) + (businessMatch ? 35 : 0) + (intent !== 'discovery' ? 10 : 0) + (typeof searchVolume === 'number' && searchVolume > 0 ? 5 : 0) + (typeof keywordDifficulty === 'number' ? 5 : 0);
  return {
    keyword,
    canonicalKeyword: normalize(keyword),
    searchVolume,
    competition,
    cpc,
    keywordDifficulty,
    intent,
    targetPage,
    source: item?.source ?? item?.keyword_data?.source ?? null,
    sourceSeed: item?.seed ?? item?.source_seed ?? item?.keyword_data?.seed ?? null,
    localityMatch,
    businessMatch,
    nameMatch,
    scope: localityMatch ? 'local-query' : 'market-query',
    evidence: localityMatch && businessMatch ? 'category-and-locality' : businessMatch ? 'observed-category' : 'unconfirmed',
    priority,
  };
}

export function qualifyKeywordResults(result, plan) {
  const selected = [];
  const rejected = [];
  const seen = new Set();
  for (const item of flattenItems(result)) {
    const row = normalizedKeywordRow(item, plan);
    if (!row) continue;
    if (seen.has(row.canonicalKeyword)) continue;
    seen.add(row.canonicalKeyword);
    const reason = !plan.anchors.length
      ? 'BUSINESS_CATEGORY_NOT_OBSERVED'
      : !row.businessMatch ? 'BUSINESS_ANCHOR_NOT_CONFIRMED'
        : hasNamedNoise(row.keyword, plan) ? 'QUERY_NOT_RELEVANT_TO_LOCAL_BUSINESS'
          : null;
    if (reason) rejected.push({ ...row, reason });
    else selected.push(row);
  }
  selected.sort((left, right) => right.priority - left.priority || (right.searchVolume ?? -1) - (left.searchVolume ?? -1) || left.canonicalKeyword.localeCompare(right.canonicalKeyword));
  const shortlist = selected.slice(0, 12);
  rejected.push(...selected.slice(12).map(item => ({ ...item, reason: 'SHORTLIST_LIMIT' })));
  return { selected: shortlist, rejected, sourceCount: shortlist.length + rejected.length };
}

export function mergeKeywordMetrics(rows, metrics) {
  const byKeyword = new Map(metrics.map(item => [item.canonicalKeyword, item]));
  return rows.map(row => {
    const enriched = byKeyword.get(row.canonicalKeyword);
    if (!enriched) return row;
    return {
      ...row,
      searchVolume: enriched.searchVolume ?? row.searchVolume,
      competition: enriched.competition ?? row.competition,
      cpc: enriched.cpc ?? row.cpc,
      keywordDifficulty: enriched.keywordDifficulty ?? row.keywordDifficulty,
      intent: enriched.intent ?? row.intent,
      metricSource: 'keyword-overview',
    };
  });
}

function competitorMetrics(item) {
  const data = item?.keyword_data ?? item?.metrics ?? item;
  return {
    keywordsCount: data?.keywords_count ?? data?.keyword_count ?? null,
    avgPosition: data?.avg_position ?? data?.average_position ?? null,
    medianPosition: data?.median_position ?? null,
    visibility: data?.visibility ?? null,
    trafficEstimate: data?.etv ?? data?.traffic_estimate ?? null,
  };
}

const DIRECTORY_HOSTS = ['tripadvisor', 'yelp', 'pagesjaunes', 'google', 'foursquare', 'thefork'];
const PLATFORM_HOSTS = ['facebook', 'instagram', 'tiktok', 'booking', 'deliveroo', 'ubereats', 'linkedin', 'wikipedia'];
const MEDIA_LABELS = new Set(['guide', 'magazine', 'journal', 'news', 'media', 'presse']);

function hostnameMatches(domain, names) {
  return names.some(name => domain === name || domain.startsWith(`${name}.`) || domain.endsWith(`.${name}`) || domain.includes(`.${name}.`));
}
function hasMediaLabel(domain) { return domain.split('.').some(label => MEDIA_LABELS.has(label)); }
function sourceValues(candidate) { return unique([...(candidate.sources ?? []), candidate.source]); }
function scopeValues(candidate) { return unique([...(candidate.scopes ?? []), candidate.scope]); }
function matchedKeywordValues(candidate) { return unique(candidate.matchedKeywords ?? []); }
function businessConfirmed(candidate) {
  return candidate.businessConfirmed === true
    || sourceValues(candidate).includes('dataforseo_local_finder')
    || candidate.providerBusinessType === 'business';
}

export function competitorType(candidate = {}) {
  const domain = domainOf(candidate.domain) ?? domainOf(candidate.url) ?? '';
  if (hostnameMatches(domain, DIRECTORY_HOSTS)) return 'directory';
  if (hostnameMatches(domain, PLATFORM_HOSTS)) return 'platform';
  if (hasMediaLabel(domain)) return 'media';
  return businessConfirmed(candidate) ? 'business' : 'unknown';
}

function candidateKey(candidate) { return candidate.domain ?? (candidate.title ? `title:${normalize(candidate.title)}` : null); }
function mergeMetrics(left, right) {
  const avgPosition = Math.min(left.avgPosition ?? Infinity, right.avgPosition ?? Infinity);
  const medianPosition = Math.min(left.medianPosition ?? Infinity, right.medianPosition ?? Infinity);
  return {
    keywordsCount: Math.max(left.keywordsCount ?? 0, right.keywordsCount ?? 0) || null,
    visibility: Math.max(left.visibility ?? 0, right.visibility ?? 0) || null,
    avgPosition: Number.isFinite(avgPosition) ? avgPosition : null,
    medianPosition: Number.isFinite(medianPosition) ? medianPosition : null,
    trafficEstimate: Math.max(left.trafficEstimate ?? 0, right.trafficEstimate ?? 0) || null,
  };
}

export function mergeCompetitorCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const domain = domainOf(candidate?.domain) ?? domainOf(candidate?.url);
    const normalized = {
      ...candidate,
      domain,
      scopes: scopeValues(candidate),
      sources: sourceValues(candidate),
      matchedKeywords: matchedKeywordValues(candidate),
      provenances: unique([...(candidate.provenances ?? []), `${candidate.scope ?? 'unknown'}:${candidate.source ?? 'unknown'}`]),
      businessConfirmed: businessConfirmed(candidate),
      mergedCandidateCount: candidate.mergedCandidateCount ?? 1,
    };
    const key = candidateKey(normalized);
    if (!key) continue;
    const previous = byKey.get(key);
    if (!previous) { byKey.set(key, normalized); continue; }
    const merged = {
      ...previous,
      title: previous.title ?? normalized.title ?? null,
      scopes: unique([...previous.scopes, ...normalized.scopes]),
      sources: unique([...previous.sources, ...normalized.sources]),
      matchedKeywords: unique([...previous.matchedKeywords, ...normalized.matchedKeywords]),
      keywordPositions: { ...(previous.keywordPositions ?? {}), ...(normalized.keywordPositions ?? {}) },
      provenances: unique([...previous.provenances, ...normalized.provenances]),
      businessConfirmed: previous.businessConfirmed || normalized.businessConfirmed,
      mergedCandidateCount: (previous.mergedCandidateCount ?? 1) + 1,
      mergeReason: 'CANONICAL_DOMAIN_COLLISION',
      ...mergeMetrics(previous, normalized),
    };
    byKey.set(key, merged);
  }
  return [...byKey.values()].map(candidate => ({ ...candidate, type: competitorType(candidate) }))
    .sort((left, right) => (right.visibility ?? -1) - (left.visibility ?? -1) || (left.avgPosition ?? Infinity) - (right.avgPosition ?? Infinity) || String(left.domain ?? left.title).localeCompare(String(right.domain ?? right.title)));
}

export function selectBusinessCompetitors(candidates, { targetDomain = null, targetName = null } = {}) {
  const target = domainOf(targetDomain);
  const targetTitle = normalize(targetName);
  const merged = mergeCompetitorCandidates(candidates);
  const accepted = [];
  const rejected = [];
  for (const candidate of merged) {
    if (candidate.domain && candidate.domain === target) { rejected.push({ ...candidate, reason: 'AUDITED_DOMAIN_EXCLUDED' }); continue; }
    if (targetTitle && normalize(candidate.title) === targetTitle) { rejected.push({ ...candidate, reason: 'AUDITED_BUSINESS_EXCLUDED' }); continue; }
    if (candidate.type === 'unknown') { rejected.push({ ...candidate, reason: 'BUSINESS_IDENTITY_NOT_CONFIRMED' }); continue; }
    if (candidate.type !== 'business') { rejected.push({ ...candidate, reason: 'NON_BUSINESS_COMPETITOR' }); continue; }
    accepted.push(candidate);
  }
  return { candidates: merged, selected: accepted.slice(0, 5), rejected: [...rejected, ...accepted.slice(5).map(item => ({ ...item, reason: 'COMPETITOR_SHORTLIST_LIMIT' }))] };
}

export function qualifyCompetitorResults(result, { targetDomain = null, selectedKeywords = [], locality = null } = {}) {
  const wanted = new Set(selectedKeywords.map(value => normalize(typeof value === 'string' ? value : value?.keyword)).filter(Boolean));
  const byDomain = new Map();
  for (const item of flattenItems(result)) {
    const domain = domainOf(item?.domain) ?? domainOf(item?.url) ?? domainOf(item?.target);
    if (!domain) continue;
    const metrics = competitorMetrics(item);
    const rawKeywords = Array.isArray(item?.keywords) ? item.keywords : item?.keyword ? [item.keyword] : Object.keys(item?.keywords_positions ?? {});
    const matchedKeywords = rawKeywords.map(value => String(value).trim()).filter(value => wanted.has(normalize(value)));
    if (!matchedKeywords.length) continue;
    const existing = byDomain.get(domain);
    const row = {
      domain,
      title: item?.title ?? item?.name ?? null,
      scope: 'national-seo',
      locality: locality ?? null,
      classification: 'SEO_COMPETITOR_CANDIDATE',
      matchedKeywords,
      keywordPositions: Object.fromEntries(matchedKeywords.filter(keyword => Array.isArray(item.keywords_positions?.[keyword])).map(keyword => [keyword, item.keywords_positions[keyword].filter(value => Number.isInteger(value) && value > 0)])),
      businessConfirmed: item?.is_business === true || item?.business === true,
      providerBusinessType: item?.business_type ?? item?.entity_type ?? item?.type ?? null,
      ...metrics,
      source: item?.source ?? 'dataforseo_labs_serp_competitors',
    };
    if (!existing) byDomain.set(domain, row);
    else byDomain.set(domain, {
      ...existing,
      matchedKeywords: unique([...existing.matchedKeywords, ...matchedKeywords]),
      businessConfirmed: existing.businessConfirmed || row.businessConfirmed,
      ...mergeMetrics(existing, row),
    });
  }
  const candidates = [...byDomain.values()].sort((left, right) => (right.visibility ?? -1) - (left.visibility ?? -1) || (left.avgPosition ?? Infinity) - (right.avgPosition ?? Infinity) || left.domain.localeCompare(right.domain));
  const selection = selectBusinessCompetitors(candidates, { targetDomain });
  return Object.assign(selection.selected, { candidates: selection.candidates, selected: [...selection.selected], rejected: selection.rejected });
}

export { domainOf, normalize };
