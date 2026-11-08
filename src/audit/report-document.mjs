import { assembleAuditPacket, projectAuditPacket } from './audit-packet.mjs';
import { technicalActions, readableLimit } from './report-sections.mjs';

export const REPORT_FORMAT = 'ancrage-audit-v2';
export const REPORT_SECTIONS = ['L’essentiel', 'Actions prioritaires', 'Observations utiles', 'Sources et périmètre'];
const text = value => String(value ?? '').trim();
const normalized = value => text(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const unique = values => [...new Set(values.filter(Boolean))];
const paragraph = value => ({ type: 'paragraph', text: value });
const table = (title, columns, rows) => ({ type: 'table', title, columns, rows });
const reviewExcerpt = value => { const words = String(value ?? '').trim().split(/\s+/); return words.slice(0, 25).join(' ') + (words.length > 25 ? '…' : ''); };

function additionalLimits(values, { hasWebsite, hasComparisons }) {
  return values.filter(value => {
    const line = normalized(value);
    if (!hasComparisons && /^aucune comparaison concurrentielle\b/.test(line)) return false;
    if (!hasWebsite && /^aucun(?:e)? (?:page propre au site|site officiel)\b.*\bfourni/.test(line)) return false;
    // The document already states that public sources can change; dated caveats stay specific.
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

function documentFor({ name, city, date, kind, status, summary, actions, observations, sources, scope }) {
  const titles = { initial: 'Premier bilan', gmb: 'Présence locale', final: 'Audit de visibilité', seo: 'Audit du site' };
  return {
    format: REPORT_FORMAT, name, city, date: reportDate(date), title: titles[kind] ?? titles.final, status,
    sections: [
      { title: REPORT_SECTIONS[0], blocks: [paragraph(summary)] },
      { title: REPORT_SECTIONS[1], blocks: actions.length ? actions : [paragraph('Aucune correction prioritaire ne peut être établie avec les éléments disponibles.')] },
      { title: REPORT_SECTIONS[2], blocks: observations.length ? observations : [paragraph('Les informations recueillies ne permettent pas de compléter le diagnostic.')] },
      { title: REPORT_SECTIONS[3], blocks: [...sources.map(source => ({ type: 'source', ...source })), ...unique(scope).map(paragraph)] },
    ],
  };
}

export function buildPublicAuditDocument(result, kind = 'final', auditPacket = null) {
  const packet = auditPacket ?? assembleAuditPacket({ auditRun: result }).packet;
  const p = projectAuditPacket(packet);
  const audit = p.report.observation;
  const local = kind === 'gmb';
  const sources = [];
  const sourceId = value => {
    const url = safeReportUrl(value);
    if (!url) return null;
    let source = sources.find(item => item.url === url);
    if (!source) {
      source = { id: `source-${sources.length + 1}`, number: sources.length + 1, url, label: new URL(url).hostname.replace(/^www\./, '') };
      sources.push(source);
    }
    return source.number;
  };
  const used = new Set();
  const factsFor = ids => unique(ids).flatMap(id => {
    const fact = audit?.observations?.find(item => item.id === id);
    if (!fact || used.has(id)) return [];
    used.add(id);
    const values = fact.quote?.match(/\d+(?::\d+)?/g) ?? [];
    const proof = values.some(value => !fact.fact.includes(value)) ? `« ${fact.quote} »` : fact.fact;
    return [{ text: id.startsWith('local-page-') ? `Page examinée : ${fact.fact.split(' — ')[0]}` : proof, source: sourceId(fact.url) }];
  });
  let actions = [];
  let summary;
  const observations = [];
  const scope = [];
  if (local) {
    summary = p.report.gmbCandidates.length > 1
      ? 'Plusieurs fiches correspondent à la recherche. Confirmez l’établissement avant de retenir leurs coordonnées.'
      : p.report.gmbCandidates.length
      ? 'L’établissement a été retrouvé. Les informations ci-dessous permettent de vérifier qu’il s’agit de la bonne adresse.'
      : 'Les données disponibles ne permettent pas de confirmer la fiche de cet établissement.';
    const rows = p.report.gmbCandidates.map(item => [item.title ?? 'Nom non fourni', item.address ?? 'Non fournie', item.phone ?? 'Non fourni', item.category ?? 'Non précisée']);
    if (rows.length) observations.push(table('Informations relevées', ['Établissement', 'Adresse', 'Téléphone', 'Activité'], rows));
    for (const profile of p.report.gmbCandidates) {
      const reference = sourceId(profile.url);
      if (profile.rating !== null && profile.rating !== undefined) observations.push(table('Avis Google', ['Note publique', 'Nombre total d’avis', 'Avis disponibles pour analyse'], [[`${profile.rating}/5`, String(profile.reviewCount ?? 'Non retourné'), String(profile.reviews?.length ?? 0)]]));
      if (profile.hours?.length) observations.push(table('Horaires habituels publiés sur Google', ['Jour et horaires'], profile.hours.map(value => [value])));
      else observations.push(paragraph('Les horaires habituels n’ont pas été retournés par Google. Leur absence dans ce rapport ne prouve pas leur absence sur la fiche.'));
      if (!profile.reviews?.length) observations.push(paragraph('Aucun texte d’avis n’a été retourné pour cette collecte. Aucun diagnostic des thèmes clients ne peut être établi à partir de cette collecte.'));
      if (profile.currentHours?.length && JSON.stringify(profile.currentHours) !== JSON.stringify(profile.hours)) observations.push(table('Horaires courants publiés sur Google', ['Jour et horaires'], profile.currentHours.map(value => [value])));
      if (profile.reviews?.length) {
        observations.push({ type: 'facts', items: profile.reviews.map(review => ({ text: `${review.author ?? 'Auteur non retourné'} · ${review.publishedAt?.slice(0, 10) ?? 'Date non retournée'} · ${review.rating ?? 'Note non retournée'}/5 : « ${reviewExcerpt(review.text)} »`, source: sourceId(review.url ?? profile.url) ?? reference })) });
        scope.push(profile.reviewScope);
      }
    }
    if (audit) {
      actions = distinctActions((audit.priorities ?? []).filter(item => item.topic === 'LOCAL').map(item => ({ type: 'action', title: item.title, impact: item.consequence, action: item.correction, observationIds: item.observationIds, limitation: item.limitation }))).slice(0, 6);
      for (const action of actions) action.facts = factsFor(action.observationIds);
      const localFacts = factsFor((audit.observations ?? []).filter(item => item.topic === 'LOCAL').map(item => item.id));
      if (localFacts.length) observations.unshift({ type: 'facts', items: localFacts });
      if (actions.length) summary = 'Les informations de la fiche et les sources collectées font ressortir les actions ci-dessous. Les constats citent les informations à confirmer ou à corriger.';
      else if (localFacts.length) summary = 'Le diagnostic ci-dessous rapproche les informations publiques et les avis consultés. Aucun défaut supplémentaire n’a été établi dans ce périmètre.';
    }
    for (const item of result.evidence ?? []) if (item.sourceType === 'google-places-selection') sourceId(item.canonicalUrl);
    scope.push('Les données publiques Google ne vérifient ni la propriété de la fiche, ni son classement. Les horaires retournés doivent être confirmés par le propriétaire.');
  } else if (audit) {
    summary = audit.conclusion?.reason ?? 'Les éléments disponibles ne permettent pas encore de décider si le site doit être modifié.';
    actions = distinctActions((audit.priorities ?? []).map(item => ({ type: 'action', title: item.title, impact: item.consequence, action: item.correction, observationIds: item.observationIds, limitation: item.limitation }))).slice(0, 6);
    for (const action of actions) {
      action.facts = factsFor(action.observationIds);
      action.sources = unique(action.observationIds.map(id => sourceId(audit.observations.find(item => item.id === id)?.url)));
    }
    if (!actions.length) actions = technicalActions(p.report.technicalFindings).slice(0, 3).map(item => ({ ...item, facts: [{ text: item.detail, sources: item.urls.map(sourceId).filter(Boolean) }] }));
    const remaining = factsFor(audit.conclusion?.observationIds ?? []);
    if (remaining.length) observations.push({ type: 'facts', items: remaining });
    const additionalFacts = factsFor((audit.observations ?? []).filter(item => !item.id.startsWith('local-')).map(item => item.id));
    if (additionalFacts.length) observations.push({ type: 'facts', items: additionalFacts });
    for (const item of audit.competitors ?? []) {
      observations.push({ type: 'comparison', title: item.title, text: item.comparison, source: sourceId(item.url) });
    }
    const queries = (audit.queries ?? []).slice(0, 6);
    if (queries.length) observations.push(table('Contenus à travailler', ['Recherche envisagée', 'Page à enrichir', 'Intérêt'], queries.map(item => [item.query, item.targetPage, item.reason])));
    const limits = unique([...actions.map(item => item.limitation), ...additionalLimits(audit.limitations ?? [], { hasWebsite: Boolean(p.values.website.value), hasComparisons: Boolean(audit.competitors?.length) })]);
    if (limits.length) scope.push(...limits);
  } else {
    actions = technicalActions(p.report.technicalFindings).slice(0, 3).map(item => ({ ...item, facts: [{ text: item.detail, sources: item.urls.map(sourceId).filter(Boolean) }] }));
    summary = actions.length ? 'Les vérifications ont relevé des corrections sur le site. Commencez par les actions ci-dessous.' : 'Les contrôles disponibles ne permettent pas d’identifier une correction prioritaire sur le site.';
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
  if (!local) {
    if (!p.values.website.value) observations.unshift(paragraph('Aucun site officiel n’a été confirmé pour l’analyse technique.'));
    if (p.values.website.value) {
      observations.unshift(table('Site examiné', ['Site', 'Pages examinées'], [[p.values.website.value, String(p.metrics.sitePages)]]));
      if (p.metrics.sitePages) scope.push('L’examen porte sur les pages collectées. L’affichage et les actions sur mobile n’ont pas été testés dans un navigateur.');
      else scope.push('Aucune page du site n’a pu être examinée ; aucun diagnostic technique ne peut être conclu.');
    }
    scope.push('Les sources publiques peuvent évoluer. Cette analyse ne mesure ni le trafic, ni les ventes, ni les performances privées de l’établissement.');
  }
  const coverageItems = (local ? [['localPresence', 'Fiche Google']] : [['localPresence', 'Fiche Google'], ['siteAudit', 'Site officiel'], ['market', 'Marché local']]).map(([key, label]) => ({ label, status: p.coverage[key]?.status ?? 'PARTIAL' }));
  observations.unshift({ type: 'coverage', title: 'Périmètre documenté', items: coverageItems });
  const causes = p.report.limitations.map(readableLimit);
  scope.push(...unique(causes));
  return documentFor({ name: p.subject.name, city: p.values.address.value ?? p.subject.city, date: packet.createdAt, kind, status: local ? p.coverage.localPresence.status : p.status, summary, actions, observations, sources, scope });
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
    summary: !pagesExamined ? 'Le site n’a pas pu être examiné. Aucun diagnostic technique ne peut être établi.' : actions.length ? 'Les vérifications ont relevé des corrections sur le site. Les actions ci-dessous sont classées par priorité.' : 'Les contrôles effectués n’ont pas relevé de correction prioritaire.',
    actions, observations: [paragraph(`${pagesExamined} ${pagesExamined === 1 ? 'page examinée' : 'pages examinées'}.`)], sources,
    scope: ['Les contrôles portent sur le contenu HTML collecté. Ils ne valident ni l’affichage mobile, ni l’indexation dans Google, ni le fonctionnement des formulaires.'],
  });
}

export function buildDossierAuditDocument({ business, story, menu = [], kind, date }) {
  const rows = [['Adresse', business.address], ['Contact', business.contact], ['Présentation', story], ['Offre fournie', menu.map(item => item.name).join(', ')]].filter(([, value]) => value);
  return documentFor({ name: business.name, city: business.city, date, kind, status: 'PARTIAL', summary: 'Ce bilan reprend les informations fournies pour préparer le site. Aucune vérification publique n’a été réalisée.', actions: [], observations: rows.length ? [table('Informations fournies', ['Information', 'Contenu'], rows)] : [], sources: [], scope: ['Source : dossier fourni par l’établissement. Les informations doivent être confirmées avant publication.'] });
}
