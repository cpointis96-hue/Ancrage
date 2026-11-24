import { ValidationError } from '../core/errors.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';
import { decodeHtmlText } from './html-text.mjs';
import { readOnPage } from './seo-on-page.mjs';

export const SEO_RULE_VERSION = 'seo-rules-v3';
const DEFAULT_MAX_PAGES = 50;

function requiredUrl(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} est requis.`, { field });
  let parsed;
  try { parsed = new URL(value); } catch { throw new ValidationError(`${field} est invalide.`, { field }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new ValidationError(`${field} est invalide.`, { field });
  return value;
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) result[match[1].toLowerCase()] = match[2].trim();
  return result;
}

function finding(code, severity, url, observedAt, detail, rawPayload = '') {
  return {
    code,
    severity,
    classification: 'CALCULATED',
    detail,
    evidence: createEvidenceSnapshot({ canonicalUrl: url, observedAt, rawPayload, ruleVersion: SEO_RULE_VERSION }),
  };
}

const actionWords = /^(?:tel:|mailto:)|contact|r[eé]serv|booking|rendez.vous|devis|quote|commander|order/i;
const purchaseWords = /acheter|souscrire|inscription|panier|checkout|subscribe|add.to.cart/i;
const offerPage = /(?:^|\/)(?:menus?|cartes?|prestations?|services?|offers?|tarifs?|pricing)(?:[-/]|$)/i;
const layoutSections = /<(header|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

function contactAction(item) { return actionWords.test(item.href ?? '') || actionWords.test(item.label); }

function actionsIn(html) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].flatMap(([, tag, props, content]) => {
    const attr = attributes(props);
    const label = decodeHtmlText(content.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() || attr['aria-label'];
    const href = attr.href && decodeHtmlText(attr.href);
    if (!label && !href) return [];
    return [{ label: (label || href).slice(0, 100), ...(href && { href: href.slice(0, 320) }), button: tag.toLowerCase() === 'button' }];
  });
}

function analyzePage(page, observedAt) {
  const url = requiredUrl(page.url, 'page.url');
  if (page.crawlStatus === 'skipped') {
    return { page: { url, status: page.status ?? null, crawlStatus: 'skipped', contentType: page.contentType, findingsCount: 0 }, findings: [] };
  }
  if (page.crawlStatus === 'blocked') {
    const missing = [404, 410].includes(page.status);
    const detail = page.status ? `La collecte a reçu une réponse HTTP ${page.status}.` : 'La page n’a pas pu être analysée.';
    const findings = [finding('CRAWL_BLOCKED', 'WARN', url, observedAt, detail, JSON.stringify({ status: page.status ?? null, cause: page.errorCode ?? null }))];
    if (missing) findings.push({ ...findings[0], code: 'HTTP_ERROR', severity: 'ERROR' });
    return { page: { url, status: page.status ?? null, crawlStatus: 'blocked', findingsCount: findings.length }, findings };
  }
  if (typeof page.html !== 'string') throw new ValidationError('page.html est invalide.', { field: 'page.html' });
  const html = page.html;
  const { mainText, internalLinks, ...onPage } = readOnPage(html, url);
  const { title, description, robots, headings, headingCounts: [h1Count] } = onPage;
  const findings = [];
  const add = (code, detail, evidence = onPage) => findings.push(finding(code, 'WARN', url, observedAt, detail, JSON.stringify(evidence)));
  if ((page.status ?? 200) >= 400) findings.push(finding('HTTP_ERROR', 'ERROR', url, observedAt, `Le serveur renvoie HTTP ${page.status}.`, html));
  const robotsHeader = page.robotsHeader ?? '';
  const noindex = /\b(noindex|none)\b/i.test(robots);
  const headerNoindex = /(?:^|,)\s*googlebot:\s*(?:noindex|none)(?=\s*(?:,|$))/i.test(robotsHeader)
    || (!robotsHeader.includes(':') && /(?:^|,)\s*(?:noindex|none)(?=\s*(?:,|$))/i.test(robotsHeader));
  if (noindex || headerNoindex) findings.push(finding('NOINDEX_OBSERVED', 'WARN', url, observedAt,
    headerNoindex ? 'L’en-tête HTTP X-Robots-Tag demande de ne pas indexer cette page.' : 'Une directive HTML demande de ne pas indexer cette page.',
    JSON.stringify({ robots, robotsHeader })));
  if (!title) add('MISSING_TITLE', 'La page ne contient pas de title exploitable.');
  if (!description) add('MISSING_META_DESCRIPTION', 'La page ne contient pas de meta description renseignée.');
  if (onPage.titleCount > 1) add('MULTIPLE_TITLES', `${onPage.titleCount} balises title figurent dans l’en-tête HTML.`);
  if (onPage.descriptionCount > 1) add('MULTIPLE_META_DESCRIPTIONS', `${onPage.descriptionCount} meta descriptions figurent dans l’en-tête HTML.`);
  if (!onPage.viewport) add('MISSING_VIEWPORT', 'La page ne contient pas de viewport.');
  if (!onPage.canonicalCount) add('MISSING_CANONICAL', 'Aucune URL canonique déclarée dans l’en-tête HTML.');
  if (onPage.canonicals.includes(null)) add('INVALID_CANONICAL', 'Une balise canonique ne contient pas d’URL HTTP exploitable.');
  if (new Set(onPage.canonicals.filter(Boolean)).size > 1) add('CONFLICTING_CANONICALS', 'La page déclare plusieurs URL canoniques différentes.');
  if (!onPage.lang) add('MISSING_HTML_LANG', 'La langue du document n’est pas déclarée.');
  if (!onPage.jsonLd.blocks) add('MISSING_STRUCTURED_DATA', 'Aucune donnée structurée JSON-LD observée dans le HTML.');
  if (onPage.jsonLd.invalid) add('INVALID_JSON_LD', `${onPage.jsonLd.invalid} bloc(s) JSON-LD illisible(s).`);
  if (!headings.some(item => item.level === 1 && item.text)) add('MISSING_H1', 'Aucun H1 renseigné dans le contenu HTML.');
  if (h1Count > 1) add('MULTIPLE_H1', `${h1Count} balises H1 observées dans le contenu HTML.`);
  if (onPage.emptyHeadings) add('EMPTY_HEADINGS', `${onPage.emptyHeadings} titre(s) de section sans texte dans le HTML.`);
  if (onPage.headingJumps.length) {
    const jumps = new Set(onPage.headingJumps.map(item => `H${item.from} → H${item.to}`));
    add('HEADING_HIERARCHY', `Niveaux sautés dans le contenu HTML (${[...jumps].join(', ')}). Examinez le plan des sections.`);
  }
  if (onPage.missingImageAlt) add('MISSING_IMAGE_ALT', `${onPage.missingImageAlt} image(s) sans attribut alt.`);
  const text = decodeHtmlText(html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 1200);
  const contactLinks = [...html.matchAll(/<a\b[^>]*>/gi)].map(match => attributes(match[0]).href).filter(value => value && /^(tel:|mailto:)|contact|reserv|booking/i.test(value)).slice(0, 12);
  const body = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(html)?.[1] ?? html;
  const staticBody = body.replace(/<!--[\s\S]*?-->|<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const sharedSections = [...staticBody.matchAll(layoutSections)];
  const main = staticBody.replace(layoutSections, ' ');
  const actionList = actionsIn(staticBody);
  const callsToAction = [...new Map(actionList
    .filter(item => item.button || contactAction(item) || /menu|carte|itineraire|directions/i.test(item.href + ' ' + item.label))
    .map(({ label, href }) => [JSON.stringify([label, href]), { label, ...(href && { href }) }])).values()].slice(0, 12);
  const mainActions = actionsIn(main).filter(item => contactAction(item) || purchaseWords.test(`${item.href ?? ''} ${item.label}`));
  const sharedPhone = sharedSections.flatMap(([section]) => actionsIn(section)).find(item => item.href?.startsWith('tel:'));
  if ((page.status ?? 200) < 400 && offerPage.test(new URL(url).pathname) && sharedPhone && !mainActions.length && !/<(?:form|iframe)\b/i.test(main)) {
    findings.push(finding('OFFER_CALL_ONLY_IN_LAYOUT', 'WARN', url, observedAt,
      `Le lien d’appel « ${sharedPhone.label} » a été relevé dans l’en-tête, la navigation ou le pied de page. Aucun lien de contact ou de réservation n’a été repéré dans le contenu HTML de l’offre.`,
      JSON.stringify({ url, sharedPhone, mainActions })));
  }
  const sections = headings.filter(item => [2, 3].includes(item.level) && item.text).map(item => item.text).slice(0, 12);
  return {
    page: {
      url, title, description, heading: headings.find(item => item.level === 1)?.text ?? '', text,
      mainText: mainText.slice(0, 1800), contactLinks, callsToAction, sections, viewport: onPage.viewport,
      status: page.status ?? 200, crawlStatus: 'complete', findingsCount: findings.length,
      onPage: { ...onPage, robotsHeader, noindex: noindex || headerNoindex, inbound: [], contentLinks: internalLinks.filter(item => item.inContent).slice(0, 12) },
    },
    findings, internalLinks,
  };
}

function addCrossPageFindings(analyzed, observedAt) {
  const complete = analyzed.filter(item => item.page.onPage);
  const byUrl = new Map(analyzed.map(item => [new URL(item.page.url).href, item]));
  const add = (item, code, detail, proof) => item.findings.push(finding(code, 'WARN', item.page.url, observedAt, detail, JSON.stringify(proof)));
  const normalized = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const [field, label, code] of [
    ['title', 'Title', 'DUPLICATE_TITLE'],
    ['description', 'Meta description', 'DUPLICATE_META_DESCRIPTION'],
    ['heading', 'H1', 'DUPLICATE_H1'],
  ]) {
    const groups = Map.groupBy(complete.filter(item => item.page[field] && !item.page.onPage.noindex), item => normalized(item.page[field]));
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const urls = group.map(item => item.page.url);
      for (const item of group) {
        add(item, code, `${label} identique sur ${group.length} pages de l’échantillon : « ${item.page[field]} ».`, { urls, value: item.page[field] });
      }
    }
  }
  for (const item of complete) {
    const { url, onPage } = item.page;
    for (const link of item.internalLinks) {
      const target = byUrl.get(link.url);
      if (!target || target === item) continue;
      if (target.page.onPage) target.page.onPage.inbound.push({ url, inContent: link.inContent });
      if ([404, 410].includes(target.page.status) && !item.brokenContactTargets.has(link.url)) {
        add(item, 'BROKEN_INTERNAL_LINK', `Le lien « ${link.label || 'sans texte'} » mène à ${new URL(link.url).pathname}, qui a répondu HTTP ${target.page.status}.`, link);
      }
    }
    for (const canonical of new Set(onPage.canonicals.filter(Boolean))) {
      if (canonical === url) continue;
      const target = byUrl.get(canonical)?.page;
      if (target && ([404, 410].includes(target.status) || target.onPage?.noindex)) {
        add(item, 'CANONICAL_TO_UNAVAILABLE_PAGE', `L’URL canonique déclarée cible ${canonical}, relevée ${target.onPage?.noindex ? 'avec noindex' : `en HTTP ${target.status}`}.`, { canonical, status: target.status, noindex: target.onPage?.noindex });
      } else {
        add(item, 'CANONICAL_TO_OTHER_URL', `L’URL canonique déclarée cible ${canonical}. Vérifiez si les deux URL doivent représenter la même page.`, { canonical });
      }
    }
  }
}

export function analyzeSeoAudit({ target, pages, observedAt, maxPages = DEFAULT_MAX_PAGES, limitReached = false } = {}) {
  const normalizedTarget = requiredUrl(target, 'target');
  if (!Array.isArray(pages)) throw new ValidationError('pages est invalide.', { field: 'pages' });
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > DEFAULT_MAX_PAGES) throw new ValidationError('maxPages est invalide.', { field: 'maxPages' });
  if (typeof observedAt !== 'string' || !observedAt.trim() || Number.isNaN(Date.parse(observedAt))) throw new ValidationError('observedAt est invalide.', { field: 'observedAt' });
  const analyzed = pages.slice(0, maxPages).map(page => analyzePage(page, observedAt));
  const unavailable = new Map(analyzed.filter(item => [404, 410].includes(item.page.status))
    .map(item => [new URL(item.page.url).href, item.page.status]));
  for (const item of analyzed) {
    const { page } = item;
    const checked = item.brokenContactTargets = new Set();
    for (const action of (page.callsToAction ?? []).filter(contactAction)) {
      if (!action.href) continue;
      let destination;
      try { destination = new URL(action.href, page.url); } catch { continue; }
      destination.hash = '';
      const status = unavailable.get(destination.href);
      if (!status || destination.origin !== new URL(page.url).origin || checked.has(destination.href)) continue;
      checked.add(destination.href);
      item.findings.push(finding('BROKEN_CONTACT_LINK', 'ERROR', page.url, observedAt,
        `Le lien « ${action.label} » renvoie vers ${destination.pathname}, qui a répondu HTTP ${status} pendant la collecte.`,
        JSON.stringify({ originPage: page.url, link: action, destination: destination.href, status })));
    }
  }
  addCrossPageFindings(analyzed, observedAt);
  for (const item of analyzed) item.page.findingsCount = item.findings.length;
  const findings = analyzed.flatMap(item => item.findings);
  const beyondLimit = Math.max(0, pages.length - analyzed.length);
  if (beyondLimit || limitReached) findings.push(finding('PAGE_LIMIT_REACHED', 'WARN', normalizedTarget, observedAt, beyondLimit ? `${beyondLimit} page(s) ignorée(s) après la limite du profil.` : 'La collecte a atteint la limite de pages du profil.'));
  if (!analyzed.some(item => item.page.crawlStatus !== 'skipped')) findings.push(finding('NO_PAGES_CAPTURED', 'WARN', normalizedTarget, observedAt, 'Aucune page HTML n’a été capturée.'));
  const counts = findings.reduce((result, item) => ({ ...result, [item.code]: (result[item.code] ?? 0) + 1 }), {});
  return {
    schemaVersion: 1,
    ruleVersion: SEO_RULE_VERSION,
    target: normalizedTarget,
    observedAt,
    status: findings.some(item => ['CRAWL_BLOCKED', 'PAGE_LIMIT_REACHED', 'NO_PAGES_CAPTURED'].includes(item.code)) ? 'PARTIAL' : 'SUCCEEDED',
    summary: { pagesReceived: pages.length, pagesAnalyzed: analyzed.filter(item => item.page.crawlStatus !== 'skipped').length, pagesSkipped: beyondLimit, counts },
    pages: analyzed.map(item => item.page),
    findings,
  };
}
