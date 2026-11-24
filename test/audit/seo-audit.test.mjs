import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSeoAudit } from '../../src/audit/seo-audit.mjs';
import { renderSeoAuditReport } from '../../src/audit/audit-report.mjs';

const observedAt = '2026-08-27T10:00:00.000Z';
const target = 'https://restaurant.example.test/';

const healthyPage = `<!doctype html><html lang="fr"><head>
  <title>Restaurant Exemple</title>
  <meta name="description" content="Cuisine locale et horaires du restaurant Exemple.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://restaurant.example.test/">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Restaurant"}</script>
</head><body><h1>Restaurant Exemple</h1><img src="dish.jpg" alt="Plat signature"></body></html>`;

test('remonte les erreurs HTTP et noindex sans signaler les images décoratives', () => {
  const audit = analyzeSeoAudit({ target, observedAt, pages: [{ url: target, status: 404, html: healthyPage.replace('</head>', '<meta name="robots" content="noindex,follow"></head>').replace('alt="Plat signature"', 'alt=""') }] });
  assert.deepEqual(audit.findings.map(item => item.code), ['HTTP_ERROR', 'NOINDEX_OBSERVED']);
});

test('analyse une page saine avec une preuve datée', () => {
  const audit = analyzeSeoAudit({ target, pages: [{ url: target, status: 200, html: healthyPage }], observedAt });

  assert.equal(audit.status, 'SUCCEEDED');
  assert.equal(audit.ruleVersion, 'seo-rules-v3');
  assert.equal(audit.pages[0].findingsCount, 0);
  assert.equal(audit.findings.length, 0);
  assert.equal(audit.observedAt, observedAt);
  assert.equal(audit.pages[0].url, target);
});

test('détecte les signaux SEO déterministes sans inventer de conclusion', () => {
  const audit = analyzeSeoAudit({
    target,
    observedAt,
    pages: [{
      url: target,
      status: 200,
      html: '<html><head><h1>Un</h1><h1>Deux</h1></head><body><img src="dish.jpg"></body></html>',
    }],
  });

  assert.equal(audit.status, 'SUCCEEDED');
  assert.deepEqual(audit.findings.map(finding => finding.code), [
    'MISSING_TITLE',
    'MISSING_META_DESCRIPTION',
    'MISSING_VIEWPORT',
    'MISSING_CANONICAL',
    'MISSING_HTML_LANG',
    'MISSING_STRUCTURED_DATA',
    'MULTIPLE_H1',
    'MISSING_IMAGE_ALT',
  ]);
  assert.equal(audit.findings.every(finding => finding.classification === 'CALCULATED'), true);
  assert.equal(audit.findings.every(finding => finding.evidence.url === target), true);
  assert.equal(audit.findings.every(finding => finding.evidence.canonicalUrl === target), true);
  assert.equal(audit.findings.every(finding => /^sha256:[a-f0-9]{64}$/.test(finding.evidence.rawPayloadHash)), true);
  assert.equal(audit.findings.every(finding => /^evidence-[a-f0-9]{24}$/.test(finding.evidence.id)), true);
  assert.equal(audit.findings.every(finding => Object.hasOwn(finding.evidence, 'requestParameters') && Object.hasOwn(finding.evidence, 'retentionClass')), true);
  assert.equal(JSON.stringify(audit).includes('classement'), false);
});

test('marque un crawl bloqué comme PARTIAL et respecte la borne de pages', () => {
  const audit = analyzeSeoAudit({
    target,
    observedAt,
    maxPages: 1,
    pages: [
      { url: target, status: 403, crawlStatus: 'blocked', html: '' },
      { url: `${target}menu`, status: 200, html: healthyPage },
    ],
  });

  assert.equal(audit.status, 'PARTIAL');
  assert.equal(audit.summary.pagesAnalyzed, 1);
  assert.equal(audit.summary.pagesSkipped, 1);
  assert.deepEqual(audit.findings.map(finding => finding.code), ['CRAWL_BLOCKED', 'PAGE_LIMIT_REACHED']);
});

test('rend un rapport échappé avec ses preuves sans script', () => {
  const unsafeTarget = 'https://restaurant.example.test/<script>alert(1)</script>';
  const audit = analyzeSeoAudit({
    target: unsafeTarget,
    observedAt,
    pages: [{ url: target, status: 200, html: '<html><body><h1><script>alert(1)</script></h1></body></html>' }],
  });
  const report = renderSeoAuditReport(audit);

  assert.match(report, /Audit du site/);
  assert.match(report, /Titre de page absent/);
  assert.match(report, /27 août 2026/);
  assert.doesNotMatch(report, /seo-rules-v1|MISSING_TITLE/);
  assert.match(report, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(report, /<script/);
  assert.doesNotMatch(report, /promesse de classement/);
});

test('signale le téléphone cantonné à la navigation d’une page d’offre', () => {
  const menu = new URL('/menu/', target).href;
  const nav = '<header><nav><a href="tel:+33123456789">Réservation</a></nav></header>';
  const html = healthyPage.replace('<h1>Restaurant Exemple</h1>', nav + '<main><h1>Menu</h1><p>Formule du midi</p></main>');
  const audit = analyzeSeoAudit({ target, observedAt, pages: [
    { url: menu, html },
    { url: new URL('/prestations/', target).href, html: html.replace('</main>', '<a href="/contact/">Nous contacter</a></main>') },
    { url: new URL('/tarifs/', target).href, html: html.replace('</main>', '<iframe src="/reservation/"></iframe></main>') },
    { url: new URL('/tarifs-abonnement/', target).href, html: html.replace('</main>', '<a href="/souscription/">Souscrire</a></main>') },
    { url: new URL('/mentions-legales/', target).href, html },
  ] });
  const matches = audit.findings.filter(item => item.code === 'OFFER_CALL_ONLY_IN_LAYOUT');
  assert.deepEqual(matches.map(item => item.evidence.url), [menu]);
  assert.match(matches[0].detail, /Réservation/);
  assert.match(renderSeoAuditReport(audit), /Vérifier l’accès à l’appel depuis l’offre/);
});

test('une directive HTTP applicable à Google est relevée sans confondre les autres robots', () => {
  const pages = [
    { url: new URL('/carte/', target).href, html: healthyPage, robotsHeader: 'noindex, nofollow' },
    { url: new URL('/service/', target).href, html: healthyPage, robotsHeader: 'otherbot: noindex' },
  ];
  const audit = analyzeSeoAudit({ target, observedAt, pages });
  const findings = audit.findings.filter(item => item.code === 'NOINDEX_OBSERVED');
  assert.deepEqual(findings.map(item => item.evidence.canonicalUrl), [pages[0].url]);
  assert.match(findings[0].detail, /X-Robots-Tag/);
});

test('relève les métadonnées et titres réels, puis compare les pages et leurs liens', () => {
  const index = new URL('/', target).href;
  const offer = new URL('/offre/', target).href;
  const gone = new URL('/indisponible/', target).href;
  const html = `<!doctype html><html lang=fr><head>
    <title>Offre &amp; tarifs</title><meta name=description content="Voir les formules">
    <link rel=canonical href="/indisponible/">
    <script>const fake = '<h2>Intitulé inventé</h2>';</script>
    <script type="application/ld+json">{"@graph":[{"@type":"Restaurant"}]}</script>
    </head><body><header><h2>Hors contenu</h2></header><main>
    <h1>La carte</h1><h3>Plats et desserts</h3><h2 hidden>Masqué</h2><h2> </h2>
    <a href="/offre/">Voir l’offre</a><a href="/indisponible/">Ancienne formule</a>
    </main></body></html>`;
  const audit = analyzeSeoAudit({target,observedAt,pages:[
    {url:index,html},{url:offer,html},{url:gone,status:404,crawlStatus:'blocked'},
  ]});
  const [home,next] = audit.pages;
  assert.equal(home.title,'Offre & tarifs');
  assert.deepEqual(home.onPage.headingCounts,[1,1,1,0,0,0]);
  assert.deepEqual(home.onPage.headingJumps,[{from:1,to:3,text:'Plats et desserts'}]);
  assert.deepEqual(home.onPage.jsonLd.types,['Restaurant']);
  assert.deepEqual(next.onPage.inbound,[{url:index,inContent:true}]);
  for (const code of ['EMPTY_HEADINGS','HEADING_HIERARCHY','DUPLICATE_TITLE','DUPLICATE_META_DESCRIPTION','DUPLICATE_H1','BROKEN_INTERNAL_LINK','CANONICAL_TO_UNAVAILABLE_PAGE']) {
    assert.ok(audit.findings.some(item=>item.code===code && item.evidence.canonicalUrl===index),code);
  }
  const htmlReport=renderSeoAuditReport(audit);
  assert.match(htmlReport,/SEO page par page/);
  assert.match(htmlReport,/Offre &amp; tarifs/);
  assert.doesNotMatch(htmlReport,/Intitulé inventé|Hors contenu|Masqué/);
});

test('relie un lien de réservation cassé à la page où le client le trouve', () => {
  const menu = new URL('/menu/', target).href;
  const reservation = new URL('/reservation/', target).href;
  const other = new URL('/contact/', target).href;
  const html = healthyPage.replace('</body>', '<a href="/reservation/#table">Réserver une table</a><a href="/contact/">Contact</a></body>');
  const audit = analyzeSeoAudit({ target, observedAt, pages: [
    { url: menu, html },
    { url: reservation, status: 404, crawlStatus: 'blocked' },
    { url: other, status: 403, crawlStatus: 'blocked' },
  ] });
  const matches = audit.findings.filter(item => item.code === 'BROKEN_CONTACT_LINK');
  assert.deepEqual(matches.map(item => item.evidence.url), [menu]);
  assert.match(matches[0].detail, /Réserver une table.*\/reservation\/.*HTTP 404/);
});
