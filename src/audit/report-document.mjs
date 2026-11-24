import { assembleAuditPacket, projectAuditPacket } from './audit-packet.mjs';
import { technicalActions, readableLimit } from './report-sections.mjs';
import { jpegSize } from './report-visuals.mjs';
import { decodeHtmlText } from './html-text.mjs';
import { domainOf, normalize as normalized } from './seo-qualification.mjs';

export const REPORT_FORMAT = 'ancrage-audit-v2';
export const REPORT_SECTIONS = ['L’essentiel', 'Actions prioritaires', 'Observations utiles', 'Sources et périmètre'];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(values.filter(Boolean))];
const paragraph = value => ({ type: 'paragraph', text: value });
const table = (title, columns, rows) => ({ type: 'table', title, columns, rows });
const actionEffort = { CONTENT: 'Contenu', IMPLEMENTATION: 'Intégration', DIAGNOSIS: 'Diagnostic' };
const applicationBasis = { USABILITY: 'Ergonomie', SEO: 'Référencement', BUSINESS: 'Choix commercial' };
const seoField = { TITLE: 'Title proposé', DESCRIPTION: 'Meta description proposée', HEADINGS: 'Titres de section proposés', CONTENT: 'Contenu à travailler', INTERNAL_LINKS: 'Lien interne à travailler' };
const decimal = value => value.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
const editorialText = value => text(value)
  .replace(/\s*\(\[[^\]]*\]\(https?:\/\/[^)]+\)\)/g, '')
  .replace(/【[^】]*】|\[\[?\d+\]?\]\(https?:\/\/[^)]+\)/g, '')
  .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
  .replace(/(\*\*|__|~~|`)(.+?)\1/g, '$2')
  .replace(/\s*\(\s*\)|\s+([,.])/g, '$1')
  .trim();

function additionalLimits(values, { hasWebsite }) {
  return values.filter(value => {
    const line = normalized(value);
    if (!hasWebsite && /^aucun(?:e)? (?:page propre au site|site officiel)\b.*\bfourni/.test(line)) return false;
    if (!/\d/.test(line) && /\bpeuvent\b.*\b(?:change|evolu)/.test(line)) return false;
    return true;
  });
}

function clientEvidence({ audit, market, website, name }) {
  const ownDomain = domainOf(website);
  const rivals = [...(audit?.competitors ?? []), ...market.selectedCompetitors, ...market.competitorCandidates];
  const domains = unique(rivals.flatMap(item => [domainOf(item.url), domainOf(item.domain)]))
    .filter(domain => domain !== ownDomain);
  const externalRival = value => {
    const host = domainOf(value);
    return host && domains.some(domain => host === domain || host.endsWith('.' + domain));
  };
  const internalFact = fact => fact.topic === 'MARKET' || externalRival(fact.url);
  const internalFacts = (audit?.observations ?? []).filter(internalFact);
  const distinctive = value => normalized(value).length >= 16 && normalized(value).split(' ').length >= 4;
  const comparisons = rivals.flatMap(item => text(item.comparison).split(/(?<=[.!?])\s+/u));
  const excerpts = [
    ...internalFacts.flatMap(item => [item.fact, item.quote]),
    ...comparisons,
    ...comparisons.flatMap(value => [...value.matchAll(/«([^»]+)»|“([^”]+)”|"([^"]+)"/gu)].map(match => match[1] ?? match[2] ?? match[3])),
    ...(audit?.visualEvidence ?? []).filter(item => externalRival(item.url)).flatMap(item => [item.caption, item.element]),
  ];
  const identities = unique([
    ...rivals.map(item => item.title).filter(title => normalized(title) !== normalized(name)),
    ...domains,
    ...excerpts.filter(distinctive),
  ].map(normalized)).map(value => ' ' + value + ' ');
  const publishable = value => {
    // Check before stripping citations so a link with an innocuous label is also excluded.
    const decoded = decodeHtmlText(value).replace(/(?:%[\da-f]{2})+/gi, part => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    const line = ' ' + normalized(decoded) + ' ';
    return !identities.some(identity => line.includes(identity))
      && !/\b(?:concurrente?s?|concurren(?:ce|tiel(?:le)?s?)|benchmark|restaurant voisin|autre restaurant|autre etablissement)\b/.test(line);
  };
  const url = value => {
    const candidate = safeReportUrl(value);
    return candidate && !externalRival(candidate) && publishable(candidate) ? candidate : null;
  };
  return {
    copy: value => publishable(value) ? editorialText(value) : '',
    publishable, url, internalFact,
    ownPage: value => Boolean(ownDomain && url(value) && domainOf(value) === ownDomain),
  };
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

function documentFor({ name, city, date, kind, status, summary, summaryDetails, summarySources, actions, seo = [], observations, sources, scope, compact = false }) {
  const titles = { initial: 'Premier bilan', gmb: 'Présence locale', final: 'Audit de visibilité', seo: 'Audit du site' };
  return {
    format: REPORT_FORMAT, name, city, date: reportDate(date), title: titles[kind] ?? titles.final, status,
    sections: [
      { title: REPORT_SECTIONS[0], blocks: summaryDetails ? [paragraph(summary), { ...paragraph(summaryDetails), sources: summarySources }] : [{ ...paragraph(summary), sources: summarySources }] },
      { title: REPORT_SECTIONS[1], blocks: actions.length ? actions : [paragraph('Aucune correction prioritaire ne peut être établie avec les éléments disponibles.')] },
      ...(seo.length ? [{ id: 'seo', title: 'SEO page par page', blocks: seo }] : []),
      { title: REPORT_SECTIONS[2], blocks: observations.length || compact ? observations : [paragraph('Les éléments recueillis ne permettent pas de compléter le diagnostic.')] },
      { title: REPORT_SECTIONS[3], blocks: [...unique(scope).map(paragraph), ...sources.map(source => ({ type: 'source', ...source }))] },
    ],
  };
}

function seoBlocks(pages, reviews, findings, sourceId, { compact = false, publishedActions = [], copy = editorialText, pageUrl = safeReportUrl } = {}) {
  const reviewByUrl = new Map((reviews ?? []).map(item => [safeReportUrl(item.url), item]));
  const technicalByUrl = Map.groupBy(findings, item => safeReportUrl(item.url));
  return pages.flatMap(page => {
    const url = pageUrl(page.url);
    if (!url || !page.onPage) return [];
    const data = page.onPage;
    const review = reviewByUrl.get(url);
    const path = new URL(url).pathname + new URL(url).search;
    const heading = data.headings.find(item => item.level === 1 && item.text)?.text;
    const headings = data.headingCounts.flatMap((count, index) => count ? [`H${index + 1} × ${count}`] : []).join(' · ');
    const current = {
      TITLE: ['Title actuel', copy(data.title || 'Absent ou vide')],
      DESCRIPTION: ['Meta description actuelle', copy(data.description || 'Absente ou vide')],
      HEADINGS: ['Structure actuelle', copy([heading && `« ${heading} »`, headings].filter(Boolean).join(' · ') || 'Aucun titre de section relevé')],
    };
    const edits = (review?.edits ?? []).flatMap(edit => seoField[edit.field] && copy(edit.proposal) && copy(edit.reason)
      ? [{ label: seoField[edit.field], text: copy(edit.proposal), reason: copy(edit.reason), ...(compact && { current: current[edit.field] }) }]
      : []);
    const checks = unique((page.checks ?? technicalByUrl.get(url) ?? []).filter(item =>
      !['OFFER_CALL_ONLY_IN_LAYOUT', 'MISSING_STRUCTURED_DATA'].includes(item.code)
      && (!compact || (
        !publishedActions.some(action => action.code === item.code && action.urls?.includes(url))
        && !['MISSING_CANONICAL', 'CANONICAL_TO_OTHER_URL'].includes(item.code)
        && !(item.code === 'MISSING_META_DESCRIPTION' && /\/(?:mentions-legales|politique-de-confidentialite|privacy|accessibilite)(?:\/|$)/i.test(path))
      ))).map(item => copy(item.detail)));
    const title = path === '/' ? 'Accueil' : copy(heading) || path;
    if (compact) {
      const assessment = copy(review?.reportNote) || (edits.length ? copy(review?.assessment) : '');
      if (!assessment && !edits.length && !checks.length) return [];
      return [{ type: 'seo-page', title, url, source: sourceId(url), assessment, values: [], checks, edits }];
    }
    const importantHeadings = data.headings.filter(item => item.level <= 3);
    const headingText = importantHeadings.slice(0, 18).map(({ level, text }) => `H${level} ${text ? '« ' + text + ' »' : 'vide'}`).join(' · ');
    const canonicals = unique(data.canonicals).map(item => item === url ? 'cette page' : item);
    const types = data.jsonLd.types.join(', ');
    const inbound = data.inbound.filter(item => item.inContent);
    return [{
      type: 'seo-page', title, url, source: sourceId(url),
      intent: copy(review?.intent),
      assessment: copy(review?.assessment),
      values: [
        ['Balise title', data.title || 'Absente ou vide'],
        ['Meta description', data.description || 'Absente ou vide'],
        ['Structure H1 à H6', headings || 'Aucun titre de section relevé dans le HTML'],
        ...(headingText ? [['Libellés H1 à H3', headingText + (importantHeadings.length > 18 ? ' · extrait' : '')]] : []),
        ['Accès et indexation', [`HTTP ${page.status}`, data.noindex ? 'noindex relevé' : 'aucun noindex HTML ou HTTP relevé', canonicals.length ? `canonique vers ${canonicals.join(', ')}` : 'aucune canonique valide dans le HTML'].join(' · ')],
        ['Liens entrants dans l’échantillon', `${data.inbound.length} page(s), dont ${inbound.length} depuis le contenu`],
        ['Données structurées JSON-LD', types || (data.jsonLd.blocks ? `${data.jsonLd.blocks} bloc(s), type de premier niveau indéterminé` : 'Aucun bloc relevé dans le HTML')],
      ].flatMap(([label, value]) => copy(value) ? [[label, copy(value)]] : []),
      checks, edits,
    }];
  });
}

export function buildPublicAuditDocument(result, kind = 'final', auditPacket = null) {
  const packet = auditPacket ?? assembleAuditPacket({ auditRun: result }).packet;
  const p = projectAuditPacket(packet);
  const audit = p.report.observation;
  const legacyAudit = !audit && result.workflowVersion !== 'observation-audit-v1';
  const local = kind === 'gmb';
  const compact = kind === 'final';
  const { copy, publishable, url: clientUrl, internalFact, ownPage } = clientEvidence({
    audit, market: p.market, website: p.values.website.value, name: p.subject.name,
  });
  const sources = [];
  const sourceId = value => {
    const url = clientUrl(value);
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
  const visualEvidence = audit?.visualEvidence ?? [];
  const externalImages = new Set(visualEvidence.filter(item => !ownPage(item.url)).map(item => item.jpeg));
  const captures = visualEvidence.filter(item => ownPage(item.url) && !externalImages.has(item.jpeg)).slice(0, 12).flatMap(item => {
    const url = clientUrl(item.url);
    const size = jpegSize(item.jpeg);
    const date = item.observedAt && reportDate(item.observedAt);
    const caption = copy(item.caption);
    return url && size && date && copy(item.element) && caption && publishable(item.state)
      ? [{ ...size, jpeg: item.jpeg, url, date, element: item.element, state: copy(item.state), caption, viewportWidth: Number.isInteger(item.viewport?.width) ? item.viewport.width : null }]
      : [];
  });
  const visualProofs = (requests = []) => requests.flatMap(request => {
    if (!ownPage(request.url) || !copy(request.element) || !publishable(request.state)) return [];
    const url = clientUrl(request.url);
    const state = copy(request.state);
    const image = captures.find(item => item.url === url && normalized(item.element) === normalized(request.element)
      && (!state || normalized(item.state) === normalized(state)));
    if (image) {
      const { element, state, ...visual } = image;
      return [{ ...visual, source: sourceId(url) }];
    }
    return [{ missing: [copy(request.element), state].filter(Boolean).join(' · '), source: sourceId(url) }];
  });
  const factsById = new Map((audit?.observations ?? []).filter(fact =>
    !internalFact(fact) && (!fact.url || clientUrl(fact.url)) && publishable(fact.fact) && publishable(fact.quote)
  ).map(fact => [fact.id, fact]));
  const hasClientEvidence = ids => !ids?.length || ids.some(id => factsById.has(id));
  const sourcesFor = (ids = []) => unique(ids.map(id => sourceId(factsById.get(id)?.url)));
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
    const proof = copy(quoteAddsValues && !reviewQuote && fact.quote.length <= 180 ? `« ${fact.quote} »` : fact.fact);
    if (!proof) return [];
    const key = `${safeReportUrl(fact.url) ?? ''}\n${normalized(proof)}`;
    if (publishedFacts.has(key)) return [];
    publishedFacts.add(key);
    const label = { 'web-search': 'Recherche publique', 'captured-page': 'Source collectée', 'google-review': 'Échantillon d’avis Google' }[fact.sourceKind];
    return [{ text: proof, label, source: sourceId(fact.url) }];
  });
  const siteFocused = Array.isArray(audit?.pageImprovements);
  const auditActions = (audit?.priorities ?? [])
    .filter(item => (local ? item.topic === 'LOCAL' : item.topic !== 'MARKET' && (!siteFocused || !p.values.website.value || item.topic !== 'LOCAL'))
      && (!item.targetUrl || clientUrl(item.targetUrl)) && hasClientEvidence(item.observationIds)
      && [item.title, item.consequence, item.correction, item.verification].every(publishable))
    .map(item => ({
    type: 'action',
    title: copy(item.title),
    impact: copy(item.consequence),
    action: copy(item.correction),
    verification: copy(item.verification),
    confidence: item.confidence === 'TO_VERIFY' ? 'À confirmer' : item.confidence === 'SUPPORTED' ? 'Constat étayé' : '',
    owner: copy(item.owner),
    effort: actionEffort[item.effort],
    basis: applicationBasis[item.applicationBasis],
    targetUrl: clientUrl(item.targetUrl),
    visualRequests: item.visualRequests,
    observationIds: item.observationIds ?? [],
    limitation: /^aucune[.!]?$/i.test(text(item.limitation)) ? '' : copy(item.limitation),
  }));
  let actions = [];
  let summary;
  let summarySources;
  let summaryDetails;
  const observations = [];
  const scope = [];
  const technicalFindings = p.report.technicalFindings.filter(item => (!item.url || clientUrl(item.url)) && publishable(item.detail));
  const technical = local ? [] : technicalActions(technicalFindings)
    .filter(item => item.code !== 'OFFER_CALL_ONLY_IN_LAYOUT' || !auditActions.some(action =>
      action.confidence === 'Constat étayé' && item.urls.includes(action.targetUrl)
      && action.observationIds.some(id => factsById.get(id)?.code === item.code)))
    .filter(item => !auditActions.length || ['BROKEN_CONTACT_LINK', 'HTTP_ERROR', 'OFFER_CALL_ONLY_IN_LAYOUT'].includes(item.code)).slice(0, 3);
  const confirmedTechnical = technical.filter(item => ['BROKEN_CONTACT_LINK', 'HTTP_ERROR'].includes(item.code));
  const selectedActions = distinctActions([
    ...confirmedTechnical, ...auditActions.filter(item => item.confidence === 'Constat étayé'),
    ...technical.filter(item => !confirmedTechnical.includes(item)), ...auditActions.filter(item => item.confidence !== 'Constat étayé'),
  ]).slice(0, 3);
  const publishedPerformance = new Set(selectedActions.flatMap(action => (action.observationIds ?? []).flatMap(id =>
    /^mobile-performance-\d+$/.test(id) ? [factsById.get(id)?.url] : [])));
  const offerAction = technical.find(item => item.code === 'OFFER_CALL_ONLY_IN_LAYOUT');
  const brokenContact = technical.some(item => item.code === 'BROKEN_CONTACT_LINK');
  const siteDecision = brokenContact
    ? 'Rétablissez d’abord le lien qui mène de votre site à la prise de contact.'
    : offerAction ? 'Vérifiez l’accès à l’appel depuis la page d’offre sur un téléphone.' : '';
  if (local) {
    const candidates = p.report.gmbCandidates.filter(item =>
      (!item.url || clientUrl(item.url)) && [item.title, item.address, item.phone].every(publishable));
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
    const conclusion = hasClientEvidence(audit.conclusion?.observationIds) ? copy(audit.conclusion?.reason) : '';
    summary = (brokenContact && siteDecision) || conclusion || siteDecision || (technical.length
      ? 'Commencez par les corrections relevées sur les pages examinées.'
      : 'Les éléments disponibles ne suffisent pas pour décider d’une modification du site.');
    if (!brokenContact && conclusion) summaryDetails = copy(audit.conclusion.details);
    if (!p.values.website.value && clientUrl(audit.websiteCandidate)) {
      observations.push({ type: 'paragraph', text: 'Google signale une adresse de site. Confirmez avec l’établissement qu’elle correspond bien à son site officiel.', sources: [sourceId(audit.websiteCandidate)] });
    }
    const journeyStages = { CHOOSE: 'Choisir', CONTACT: 'Contacter ou réserver', VISIT: 'Venir ou recevoir le service' };
    const websiteStages = { DISCOVER: 'Découvrir', ...journeyStages };
    for (const stage of Object.keys(websiteStages)) {
      const item = (audit.siteJourney ?? []).find(entry => entry.stage === stage);
      if (!item || !hasClientEvidence(item.observationIds) || !copy(item.observed) || (compact && !copy(item.nextCheck))) continue;
      observations.push({
        type: 'comparison', title: websiteStages[stage], subject: copy(item.task),
        text: copy(item.observed), next: copy(item.nextCheck), nextLabel: 'À contrôler',
        sources: sourcesFor(item.observationIds),
      });
    }
    for (const item of audit.withoutSiteJourney ?? []) {
      if (!hasClientEvidence(item.observationIds) || !copy(item.observed) || (compact && !copy(item.gap))) continue;
      observations.push({
        type: 'comparison', title: journeyStages[item.stage],
        text: [copy(item.observed), copy(item.gap)].filter(Boolean).join(' '),
        sources: sourcesFor(item.observationIds),
      });
    }
    const firstSitePlan = (audit.firstSitePlan ?? []).filter(item => hasClientEvidence(item.observationIds)
      && [item.page, item.question, item.content, item.callToAction, item.verification].every(publishable));
    if (firstSitePlan.length) {
      observations.push({ type: 'comparison', title: 'Votre premier site', text: 'Les contenus et boutons ci-dessous répondent aux décisions que vos clients doivent prendre.' });
      for (const item of firstSitePlan) {
        observations.push({
          type: 'action', title: editorialText(item.page), impact: editorialText(item.question),
          action: editorialText(item.content), callToAction: editorialText(item.callToAction),
          verification: editorialText(item.verification),
          sources: sourcesFor(item.observationIds),
        });
      }
    }
    for (const item of audit.pageImprovements ?? []) {
      const url = clientUrl(item.url);
      if (!url || ![item.friction, item.change, item.verification, item.evidenceExcerpt].every(publishable)) continue;
      if (auditActions.some(action => normalized(action.action) === normalized(item.change))) continue;
      observations.push({
        type: 'action', title: copy(item.heading) || new URL(url).pathname, targetUrl: url,
        impact: copy(item.friction), action: copy(item.change), verification: copy(item.verification),
        example: copy(item.copyExample), facts: [{ text: copy(item.evidenceExcerpt), source: sourceId(url) }],
      });
    }
    if (audit.mobilePerformance && p.values.website.value) {
      const measures = audit.mobilePerformance.pages.filter(item => ownPage(item.url));
      const diagnosticHints = item => (item.diagnostics?.map(hint => `${hint.label} (env. ${hint.estimatedMs} ms)`) ?? item.hints ?? []).map(copy).filter(Boolean);
      const slowRows = compact ? measures.flatMap(item => {
        if (publishedPerformance.has(item.url)) return [];
        const metrics = [
          item.lcpMs > 2500 && `Affichage principal (LCP) · ${decimal(item.lcpMs / 1000)} s`,
          item.cls > 0.1 && `Instabilité de la mise en page (CLS) · ${decimal(item.cls)}`,
          item.tbtMs > 200 && `Blocage (TBT) · ${item.tbtMs} ms`,
        ].filter(Boolean);
        if (!metrics.length) return [];
        const hints = diagnosticHints(item);
        return [[pageName(new URL(item.url).pathname), [...metrics, ...hints].join(' · ')]];
      }) : [];
      if (slowRows.length) {
        observations.push(table('Vitesse mobile · Écarts mesurés en laboratoire', ['Page', 'Écart'], slowRows));
      } else if (!compact && measures.length) {
        observations.push(table('Vitesse mobile · Lighthouse en laboratoire', ['Page', 'Affichage principal (LCP)', 'Stabilité (CLS) · Blocage (TBT)', 'Pistes et économies estimées'], measures.map(item => [
          pageName(new URL(item.url).pathname), `${decimal(item.lcpMs / 1000)} s`,
          `${Number.isFinite(item.cls) ? decimal(item.cls) : '—'} · ${Number.isFinite(item.tbtMs) ? `${item.tbtMs} ms` : '—'}`, diagnosticHints(item).join(' · ') || '—',
        ])));
        scope.push('Les temps Lighthouse sont des mesures en laboratoire. Les économies estimées peuvent se recouper.');
      }
      if (audit.mobilePerformance.status !== 'MEASURED') scope.push(measures.length ? 'La mesure de vitesse mobile est disponible sur une partie des pages testées.' : 'La vitesse de chargement mobile n’a pas été mesurée.');
    }
    const proposal = copy(audit.siteProposal);
    if (proposal && !compact) observations.push({ type: 'comparison', title: 'Ce qu’Ancrage vous livrerait', text: proposal });
    scope.push(...additionalLimits((audit.limitations ?? []).map(copy), { hasWebsite: Boolean(p.values.website.value) }));
  } else {
    summary = siteDecision || (technical.length ? 'Les vérifications ont relevé des corrections sur le site.' : 'Les contrôles disponibles ne permettent pas d’identifier une correction prioritaire sur le site.');
    const ranks = p.report.rankedKeywords.filter(item => publishable(item.keyword) && (!item.url || clientUrl(item.url)));
    if (ranks.length) {
      observations.push(table('Présence dans les résultats de recherche', ['Recherche', 'Position observée', 'Page'], ranks.map(item => [item.keyword, item.position ?? 'Non mesurée', item.url])));
      scope.push('Ces positions concernent le pays et la langue de la collecte ; elles ne mesurent pas un classement local dans Google Maps.');
    }
    const keywords = p.market.keywordOpportunities.filter(item => [item.keyword, item.targetPage].every(publishable)).slice(0, 3);
    if (keywords.length) {
      observations.push(table('Contenus à travailler', ['Recherche envisagée', 'Page à enrichir', 'Volume estimé dans le pays'], keywords.map(item => [item.keyword, pageName(item.targetPage), item.searchVolume === null ? 'Non mesuré' : String(item.searchVolume)])));
      scope.push(`Les volumes sont des estimations à l’échelle du pays (${p.market.searchMarket.countryCode}), sans estimation du nombre de clients dans la commune.`);
    }
  }
  actions = selectedActions.map(({ observationIds, visualRequests, ...item }) => {
    if (item.urls) return { ...item, facts: [{ text: item.detail, sources: item.urls.map(sourceId).filter(Boolean) }] };
    return {
      ...item,
      facts: factsFor(observationIds ?? []),
      sources: sourcesFor(observationIds),
      visuals: visualProofs(visualRequests),
    };
  });
  const usefulFacts = factsFor([...factsById.values()]
    .filter(fact => fact.usefulOnItsOwn && (!compact || ['ISSUE', 'CHECK'].includes(fact.reportStatus)) && (!local || fact.topic === 'LOCAL') && !used.has(fact.id))
    .slice(0, 2).map(fact => fact.id));
  if (usefulFacts.length) observations.unshift({ type: 'facts', items: usefulFacts });
  if (!local) {
    const decisionFacts = compact ? [] : factsFor(audit?.conclusion?.observationIds ?? []);
    if (decisionFacts.length) observations.unshift({ type: 'facts', items: decisionFacts });
    summarySources = sourcesFor(audit?.conclusion?.observationIds)
      .filter(number => !actions.some(action => action.sources?.includes(number)) && !decisionFacts.some(fact => fact.source === number));
    const sitePages = p.metrics.sitePages;
    if (!p.values.website.value && !clientUrl(audit?.websiteCandidate)) scope.unshift('Aucun site officiel n’a été confirmé pour les contrôles du site.');
    else if (p.values.website.value && sitePages) {
      scope.unshift(`Contrôles techniques sur ${sitePages} ${sitePages === 1 ? 'page collectée' : 'pages collectées'}.`);
      if (!captures.length) {
        scope.unshift('L’affichage et les actions sur mobile n’ont pas été testés dans un navigateur.');
      }
    } else if (p.values.website.value) observations.push(paragraph([...factsById.values()].some(fact => fact.sourceKind === 'web-search')
      ? 'Aucune page collectée pour les contrôles techniques. Les constats issus de la recherche publique sont signalés dans le rapport.'
      : 'Aucune page collectée pour les contrôles techniques du site.'));
  }
  const coverageItems = (local ? [['localPresence', 'Fiche Google']] : [['siteAudit', 'Contrôles du site'], ['market', audit ? 'Recherche publique' : 'Marché local']]).map(([key, label]) => ({ label, status: key === 'siteAudit' && !p.values.website.value ? 'NOT_MEASURED' : p.coverage[key]?.status ?? 'PARTIAL' }));
  if (!compact && (local || !audit || !p.values.website.value)) observations.unshift({ type: 'coverage', title: 'Périmètre documenté', items: coverageItems });
  const causes = p.report.limitations.filter(code => !/(?:CRAWL_|REDIRECT_|GOOGLE_)/.test(code) || (!local && p.metrics.sitePages && /CRAWL_/.test(code)));
  if (!local) scope.push(...unique(causes.map(readableLimit)));
  const seo = local ? [] : seoBlocks(p.report.seoPages ?? [], audit?.seoReviews, technicalFindings, sourceId, { compact, publishedActions: actions, copy, pageUrl: clientUrl });
  if (seo.length) {
    scope.push('L’analyse SEO porte sur le HTML et les URL collectés. L’état dans l’index, le title affiché dans Google et les positions exigent des mesures distinctes.');
  }
  if (local && !sources.length && !scope.length) scope.push('La source consultée ne fournit aucun lien direct vers une fiche.');
  return documentFor({ name: p.subject.name, city: (legacyAudit && p.values.address.value) || p.subject.city, date: packet.createdAt, kind, status: local ? p.coverage.localPresence.status : p.status, summary, summaryDetails, summarySources, actions, seo, observations, sources, scope, compact });
}

function pageName(value) {
  return ({ 'page-accueil': 'Accueil', 'page-menu': 'Carte ou menu', 'page-reservation': 'Réservation', 'page-services': 'Services', 'page-contact': 'Contact et accès' })[value] ?? value ?? 'Page à confirmer';
}

export function buildSeoAuditDocument(audit) {
  const pagesExamined = audit.pages ? audit.pages.filter(page => page.crawlStatus === 'complete').length : audit.summary.pagesAnalyzed;
  const sources = [];
  const sourceId = value => {
      const url = safeReportUrl(value);
      if (!url) return null;
      let source = sources.find(source => source.url === url);
      if (!source) { source = { id: `source-${sources.length + 1}`, number: sources.length + 1, url, label: url }; sources.push(source); }
      return source.number;
  };
  const findings = audit.findings.map(item => ({ ...item, url: item.evidence?.canonicalUrl ?? item.evidence?.url }));
  const actions = technicalActions(findings).slice(0, 3).map(item => {
    const references = item.urls.map(sourceId).filter(Boolean);
    return { ...item, facts: [{ text: item.detail, sources: references }] };
  });
  return documentFor({ name: audit.target, city: '', date: audit.observedAt, kind: 'seo', status: audit.status,
    summary: actions.length ? 'Traitez d’abord les corrections prioritaires. Le détail des balises et des écarts figure ensuite par page.' : !pagesExamined ? 'Le site n’a pas pu être examiné. Aucun diagnostic technique ne peut être établi.' : 'Les contrôles effectués n’ont pas relevé de correction prioritaire.',
    actions, seo: seoBlocks(audit.pages ?? [], [], findings.filter(item => !actions.some(action => action.code === item.code)), sourceId),
    observations: [paragraph(`${pagesExamined} ${pagesExamined === 1 ? 'page examinée' : 'pages examinées'}.`)], sources,
    scope: ['Les contrôles portent sur le contenu HTML collecté. Ils ne valident ni l’affichage mobile, ni l’indexation dans Google, ni le fonctionnement des formulaires.'],
  });
}

export function buildDossierAuditDocument({ business, story, menu = [], kind, date }) {
  const rows = [['Adresse', business.address], ['Contact', business.contact], ['Présentation', story], ['Offre fournie', menu.map(item => item.name).join(', ')]].filter(([, value]) => value);
  return documentFor({ name: business.name, city: business.city, date, kind, status: 'PARTIAL', summary: 'Ce bilan reprend les informations fournies pour préparer le site. Aucune vérification publique n’a été réalisée.', actions: [], observations: rows.length ? [table('Informations fournies', ['Information', 'Contenu'], rows)] : [], sources: [], scope: ['Source : dossier fourni par l’établissement. Les informations doivent être confirmées avant publication.'] });
}
