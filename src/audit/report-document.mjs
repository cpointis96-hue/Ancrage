import { assembleAuditPacket, projectAuditPacket } from './audit-packet.mjs';
import { technicalActions, readableLimit } from './report-sections.mjs';

export const REPORT_FORMAT = 'ancrage-audit-v2';
export const REPORT_SECTIONS = ['L’essentiel', 'Actions prioritaires', 'Observations utiles', 'Sources et périmètre'];
const text = value => String(value ?? '').trim();
const normalized = value => text(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const unique = values => [...new Set(values.filter(Boolean))];
const paragraph = value => ({ type: 'paragraph', text: value });
const table = (title, columns, rows) => ({ type: 'table', title, columns, rows });
const editorialText = value => text(value)
  .replace(/\s*\(\[[^\]]*\]\(https?:\/\/[^)]+\)\)/g, '')
  .replace(/【[^】]*】|\[\[?\d+\]?\]\(https?:\/\/[^)]+\)/g, '')
  .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
  .replace(/(\*\*|__|~~|`)(.+?)\1/g, '$2')
  .replace(/\s*\(\s*\)|\s+([,.])/g, '$1')
  .trim();

function additionalLimits(values, { hasWebsite, hasComparisons }) {
  return values.filter(value => {
    const line = normalized(value);
    if (!hasComparisons && /^aucune comparaison concurrentielle\b/.test(line)) return false;
    if (!hasWebsite && /^aucun(?:e)? (?:page propre au site|site officiel)\b.*\bfourni/.test(line)) return false;
    if (!/\d/.test(line) && /\bpeuvent\b.*\b(?:change|evolu)/.test(line)) return false;
    return true;
  });
}

export function safeReportUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function reportDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(date);
}

export function distinctActions(actions) {
  const seen = new Set();
  return actions.filter(action => {
    const key = normalized(action.action);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function documentFor({ name, city, date, kind, status, summary, summarySources, actions, observations, sources, scope }) {
  const titles = { initial: 'Premier bilan', gmb: 'Présence locale', final: 'Audit de visibilité', seo: 'Audit du site' };
  return {
    format: REPORT_FORMAT, name, city, date: reportDate(date), title: titles[kind] ?? titles.final, status,
    sections: [
      { title: REPORT_SECTIONS[0], blocks: [{ ...paragraph(summary), sources: summarySources }] },
      { title: REPORT_SECTIONS[1], blocks: actions.length ? actions : [paragraph('Aucune correction prioritaire ne peut être établie avec les éléments disponibles.')] },
      { title: REPORT_SECTIONS[2], blocks: observations.length ? observations : [paragraph('Les éléments recueillis ne permettent pas de compléter le diagnostic.')] },
      { title: REPORT_SECTIONS[3], blocks: [...unique(scope).map(paragraph), ...sources.map(source => ({ type: 'source', ...source }))] },
    ],
  };
}

export function buildPublicAuditDocument(result, kind = 'final', auditPacket = null) {
  const packet = auditPacket ?? assembleAuditPacket({ auditRun: result }).packet;
  const p = projectAuditPacket(packet);
  const audit = p.report.observation;
  const legacyAudit = !audit && result.workflowVersion !== 'observation-audit-v1';
  const local = kind === 'gmb';
  const sources = [];
  const sourceId = value => {
    const url = safeReportUrl(value);
    if (!url) return null;
    let source = sources.find(item => item.url === url);
    if (!source) {
      const parsed = new URL(url);
      const label = parsed.hostname.replace(/^www\./, '') + (parsed.pathname === '/' ? '' : parsed.pathname);
      source = { id: `source-${sources.length + 1}`, number: sources.length + 1, url, label };
      sources.push(source);
    }
    return source.number;
  };
  const factsById = new Map((audit?.observations ?? []).map(fact => [fact.id, fact]));
  const rawReviews = p.report.gmbCandidates.flatMap(item => item.reviews ?? []);
  const googleSourceUrls = new Set([...p.report.gmbCandidates, ...rawReviews].map(item => safeReportUrl(item.url)).filter(Boolean));
  const reviewText = rawReviews.map(item => normalized(item.text)).filter(Boolean);
  const containsReview = value => {
    const line = normalized(value);
    return reviewText.some(review => line === review || (review.length >= 32 && ` ${line} `.includes(` ${review} `)));
  };
  const used = new Set();
  const publishedFacts = new Set();
  const factsFor = ids => unique(ids).flatMap(id => {
    const fact = factsById.get(id);
    if (!fact || used.has(id)) return [];
    used.add(id);
    if (/^(?:google-(?:review-|contact$|rating$|(?:current-)?hours$)|local-(?:page-|identity$))/.test(id)) return [];
    if (containsReview(fact.fact) || /^avis google,\s*\d{4}-\d{2}/i.test(fact.fact)) return [];
    const values = fact.quote?.match(/\d+(?::\d+)?/g) ?? [];
    const quoteAddsValues = values.some(value => !fact.fact.includes(value));
    const reviewQuote = fact.sourceKind === 'google-review' || containsReview(fact.quote) || googleSourceUrls.has(safeReportUrl(fact.url));
    const proof = editorialText(quoteAddsValues && !reviewQuote && fact.quote.length <= 180 ? `« ${fact.quote} »` : fact.fact);
    if (!proof) return [];
    const key = `${safeReportUrl(fact.url) ?? ''}\n${normalized(proof)}`;
    if (publishedFacts.has(key)) return [];
    publishedFacts.add(key);
    const label = { 'web-search': 'Recherche publique', 'captured-page': 'Source collectée', 'google-review': 'Échantillon d’avis Google' }[fact.sourceKind];
    return [{ text: proof, label, source: sourceId(fact.url) }];
  });
  const auditActions = (audit?.priorities ?? []).filter(item => !local || item.topic === 'LOCAL').map(item => ({
    type: 'action',
    title: editorialText(item.title),
    impact: editorialText(item.consequence),
    action: editorialText(item.correction),
    verification: editorialText(item.verification),
    confidence: item.confidence === 'TO_VERIFY' ? 'À confirmer' : item.confidence === 'SUPPORTED' ? 'Constat étayé' : '',
    observationIds: item.observationIds,
    limitation: /^aucune[.!]?$/i.test(text(item.limitation)) ? '' : editorialText(item.limitation),
  }));
  let actions = [];
  let summary;
  let summarySources;
  const observations = [];
  const scope = [];
  const technical = local ? [] : technicalActions(p.report.technicalFindings)
    .filter(item => !auditActions.length || item.code === 'HTTP_ERROR').slice(0, 3);
  if (local) {
    const candidates = p.report.gmbCandidates;
    summary = candidates.length > 1
      ? 'Plusieurs fiches correspondent à la recherche. Confirmez votre établissement avant de modifier une fiche.'
      : candidates.length
      ? 'La fiche de votre établissement a été retrouvée.'
      : 'Les sources disponibles ne permettent pas de confirmer la fiche de cet établissement.';
    if (legacyAudit && candidates.length === 1 && candidates[0].phone) {
      observations.push(paragraph(`Numéro indiqué sur la fiche Google : ${candidates[0].phone}.`));
    }
    if (candidates.length > 1) {
      observations.push(table('Fiches à départager', ['Établissement', 'Adresse'], candidates.map(item => [item.title ?? 'Nom non fourni', item.address ?? 'Adresse non fournie'])));
    }
    for (const item of candidates) sourceId(item.url);
    for (const item of result.evidence ?? []) if (item.sourceType === 'google-places-selection' && !candidates.some(candidate => candidate.url)) sourceId(item.canonicalUrl);
    if (p.coverage.localPresence.status !== 'SUCCEEDED') scope.push('Les détails de la fiche Google sont partiellement disponibles.');
  } else if (audit) {
    summary = editorialText(audit.conclusion?.reason) || (technical.length
      ? 'Commencez par les corrections relevées sur les pages examinées.'
      : 'Les éléments disponibles ne suffisent pas pour décider d’une modification du site.');
    for (const item of audit.competitors ?? []) {
      observations.push({ type: 'comparison', title: editorialText(item.title), text: editorialText(item.comparison), source: sourceId(item.url) });
    }
    scope.push(...additionalLimits((audit.limitations ?? []).map(editorialText), { hasWebsite: Boolean(p.values.website.value), hasComparisons: Boolean(audit.competitors?.length) }));
  } else {
    summary = technical.length ? 'Les vérifications ont relevé des corrections sur le site.' : 'Les contrôles disponibles ne permettent pas d’identifier une correction prioritaire sur le site.';
    const ranks = p.report.rankedKeywords;
    if (ranks.length) {
      observations.push(table('Présence dans les résultats de recherche', ['Recherche', 'Position observée', 'Page'], ranks.map(item => [item.keyword, item.position ?? 'Non mesurée', item.url])));
      scope.push('Ces positions concernent le pays et la langue de la collecte ; elles ne mesurent pas un classement local dans Google Maps.');
    }
    const keywords = p.market.keywordOpportunities.slice(0, 3);
    if (keywords.length) {
      observations.push(table('Contenus à travailler', ['Recherche envisagée', 'Page à enrichir', 'Volume estimé dans le pays'], keywords.map(item => [item.keyword, pageName(item.targetPage), item.searchVolume === null ? 'Non mesuré' : String(item.searchVolume)])));
      scope.push(`Les volumes sont des estimations à l’échelle du pays (${p.market.searchMarket.countryCode}), sans estimation du nombre de clients dans la commune.`);
    }
    const competitors = p.market.selectedCompetitors.filter(item => item.comparison);
    for (const item of competitors) observations.push({ type: 'comparison', title: item.title, text: item.comparison, source: sourceId(item.url) });
  }
  actions = distinctActions([...technical, ...auditActions]).slice(0, 3).map(item => {
    if (item.urls) return { ...item, facts: [{ text: item.detail, sources: item.urls.map(sourceId).filter(Boolean) }] };
    return {
      ...item,
      facts: factsFor(item.observationIds),
      sources: unique(item.observationIds.map(id => sourceId(factsById.get(id)?.url))),
    };
  });
  const usefulFacts = factsFor([...factsById.values()]
    .filter(fact => fact.usefulOnItsOwn && (!local || fact.topic === 'LOCAL') && !used.has(fact.id))
    .slice(0, 2).map(fact => fact.id));
  if (usefulFacts.length) observations.unshift({ type: 'facts', items: usefulFacts });
  if (!local) {
    const decisionFacts = factsFor(audit?.conclusion?.observationIds ?? []);
    if (decisionFacts.length) observations.unshift({ type: 'facts', items: decisionFacts });
    summarySources = unique((audit?.conclusion?.observationIds ?? []).map(id => sourceId(factsById.get(id)?.url)))
      .filter(number => !actions.some(action => action.sources?.includes(number)) && !decisionFacts.some(fact => fact.source === number));
    const sitePages = p.metrics.sitePages;
    if (!p.values.website.value) observations.push(paragraph('Aucun site officiel n’a été confirmé pour les contrôles du site.'));
    else if (sitePages) {
      observations.push(paragraph(`Contrôles techniques sur ${sitePages} ${sitePages === 1 ? 'page collectée' : 'pages collectées'}.`));
      scope.unshift('L’affichage et les actions sur mobile n’ont pas été testés dans un navigateur.');
    } else observations.push(paragraph(audit?.observations?.some(fact => fact.sourceKind === 'web-search')
      ? 'Aucune page collectée pour les contrôles techniques. Les constats issus de la recherche publique sont signalés dans le rapport.'
      : 'Aucune page collectée pour les contrôles techniques du site.'));
  }
  const coverageItems = (local ? [['localPresence', 'Fiche Google']] : [['siteAudit', 'Contrôles du site'], ['market', audit ? 'Recherche publique' : 'Marché local']]).map(([key, label]) => ({ label, status: key === 'siteAudit' && !p.values.website.value ? 'NOT_MEASURED' : p.coverage[key]?.status ?? 'PARTIAL' }));
  if (local || !audit || !p.values.website.value) observations.unshift({ type: 'coverage', title: 'Périmètre documenté', items: coverageItems });
  const causes = p.report.limitations.filter(code => !/(?:CRAWL_|REDIRECT_|GOOGLE_)/.test(code) || (!local && p.metrics.sitePages && /CRAWL_/.test(code)));
  if (!local) scope.push(...unique(causes.map(readableLimit)));
  if (local && !sources.length && !scope.length) scope.push('La source consultée ne fournit aucun lien direct vers une fiche.');
  return documentFor({ name: p.subject.name, city: (legacyAudit && p.values.address.value) || p.subject.city, date: packet.createdAt, kind, status: local ? p.coverage.localPresence.status : p.status, summary, summarySources, actions, observations, sources, scope });
}

function pageName(value) {
  return ({ 'page-accueil': 'Accueil', 'page-menu': 'Carte ou menu', 'page-reservation': 'Réservation', 'page-services': 'Services', 'page-contact': 'Contact et accès' })[value] ?? value ?? 'Page à confirmer';
}

export function buildSeoAuditDocument(audit) {
  const pagesExamined = audit.pages ? audit.pages.filter(page => page.crawlStatus === 'complete').length : audit.summary.pagesAnalyzed;
  const sources = [];
  const actions = technicalActions(audit.findings.map(item => ({ ...item, url: item.evidence?.canonicalUrl ?? item.evidence?.url }))).slice(0, 3).map(item => {
    const references = item.urls.map(value => {
      const url = safeReportUrl(value);
      if (!url) return null;
      let source = sources.find(source => source.url === url);
      if (!source) { source = { id: `source-${sources.length + 1}`, number: sources.length + 1, url, label: url }; sources.push(source); }
      return source.number;
    }).filter(Boolean);
    return { ...item, facts: [{ text: item.detail, sources: references }] };
  });
  return documentFor({ name: audit.target, city: '', date: audit.observedAt, kind: 'seo', status: audit.status,
    summary: actions.length ? 'Les vérifications ont relevé des corrections sur le site. Les actions ci-dessous sont classées par priorité.' : !pagesExamined ? 'Le site n’a pas pu être examiné. Aucun diagnostic technique ne peut être établi.' : 'Les contrôles effectués n’ont pas relevé de correction prioritaire.',
    actions, observations: [paragraph(`${pagesExamined} ${pagesExamined === 1 ? 'page examinée' : 'pages examinées'}.`)], sources,
    scope: ['Les contrôles portent sur le contenu HTML collecté. Ils ne valident ni l’affichage mobile, ni l’indexation dans Google, ni le fonctionnement des formulaires.'],
  });
}

export function buildDossierAuditDocument({ business, story, menu = [], kind, date }) {
  const rows = [['Adresse', business.address], ['Contact', business.contact], ['Présentation', story], ['Offre fournie', menu.map(item => item.name).join(', ')]].filter(([, value]) => value);
  return documentFor({ name: business.name, city: business.city, date, kind, status: 'PARTIAL', summary: 'Ce bilan reprend les informations fournies pour préparer le site. Aucune vérification publique n’a été réalisée.', actions: [], observations: rows.length ? [table('Informations fournies', ['Information', 'Contenu'], rows)] : [], sources: [], scope: ['Source : dossier fourni par l’établissement. Les informations doivent être confirmées avant publication.'] });
}
