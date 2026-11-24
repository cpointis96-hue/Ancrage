import { analyzeSeoAudit } from './seo-audit.mjs';
import { crawlSite } from './site-crawler.mjs';

export async function runSeoAudit({ target, entryUrls, observedAt, fetchImpl, lookup, profile = {} } = {}) {
  const crawl = await crawlSite({ target, entryUrls, fetchImpl, lookup, maxPages: profile.maxPages, maxBytes: profile.maxBytes, timeoutMs: profile.timeoutMs, prioritizeClientPages: profile.prioritizeClientPages });
  const audit = analyzeSeoAudit({ target: crawl.target, pages: crawl.pages, observedAt, maxPages: profile.maxPages, limitReached: crawl.summary.limitReached });
  return { ...audit, crawlSummary: crawl.summary };
}
