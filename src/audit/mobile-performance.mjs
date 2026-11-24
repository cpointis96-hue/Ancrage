const endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const opportunities = [
  ['image-delivery-insight', 'Alléger les images'],
  ['render-blocking-insight', 'Réduire les ressources qui retardent l’affichage'],
  ['unused-javascript', 'Réduire le JavaScript inutilisé'],
  ['unused-css-rules', 'Réduire les styles inutilisés'],
];

export async function measureMobilePages(pages, { key, fetchImpl = globalThis.fetch } = {}) {
  if (!pages.length) return { status: 'NO_CRAWLED_PAGE', pages: [] };
  if (!key) return { status: 'NOT_CONFIGURED', pages: [] };
  const home = pages[0];
  const commercial = pages.slice(1).filter(page => /menu|carte|service|prestations|contact|reserv|booking|devis/i.test(new URL(page.url).pathname));
  const selected = [home, ...commercial, ...pages.slice(1)].filter((page, index, list) => list.indexOf(page) === index).slice(0, 3);
  const results = await Promise.allSettled(selected.map(async ({ url }) => {
    const query = new URLSearchParams({ url, key, strategy: 'mobile', category: 'performance' });
    const response = await fetchImpl(`${endpoint}?${query}`, { redirect: 'error', signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('PageSpeed indisponible');
    const { lighthouseResult: report } = await response.json();
    const lcp = report?.audits?.['largest-contentful-paint']?.numericValue;
    if (report?.runtimeError || !Number.isFinite(lcp) || lcp <= 0 || !Number.isFinite(Date.parse(report.fetchTime))) throw new Error('Mesure Lighthouse indisponible');
    const renderedUrl = report.finalDisplayedUrl ?? report.finalUrl;
    if (renderedUrl && new URL(renderedUrl).origin !== new URL(url).origin) throw new Error('La page mesurée appartient à un autre site');
    const diagnostics = opportunities.flatMap(([id, label]) => {
      const saving = report.audits[id]?.details?.overallSavingsMs ?? report.audits[id]?.metricSavings?.LCP;
      return Number.isFinite(saving) && saving >= 100 ? [{ id, label, estimatedMs: Math.round(saving) }] : [];
    }).sort((left, right) => right.estimatedMs - left.estimatedMs);
    const cls = report.audits['cumulative-layout-shift']?.numericValue;
    const tbt = report.audits['total-blocking-time']?.numericValue;
    return {
      url, observedAt: report.fetchTime, lcpMs: Math.round(lcp),
      ...(Number.isFinite(cls) && cls >= 0 && { cls }),
      ...(Number.isFinite(tbt) && tbt >= 0 && { tbtMs: Math.round(tbt) }),
      hints: diagnostics.map(item => item.label), diagnostics,
    };
  }));
  const measured = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  return { status: measured.length === selected.length ? 'MEASURED' : 'PARTIAL', pages: measured };
}
