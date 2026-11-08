import { runSeoAudit } from './seo-audit-service.mjs';
import { createEvidenceSnapshot } from './evidence.mjs';

const stage = (id, status, cause = null, execution = 'not-run') => ({ id, status, cause, execution });

export async function runObservationAudit({ result, ledger, analyst, profileReader = async () => ({ status: 'PARTIAL', cause: 'GOOGLE_PROFILE_NOT_CONFIGURED' }), fetchImpl, lookup, publishReport, publishPacket, save, clock, waitForGmb }) {
  const { name, city, identity, domain, profile, address, mode } = result.input;
  const observedAt = result.startedAt;
  const confirmed = identity?.source === 'google-places' && Boolean(identity.placeId);
  const identityUrl = confirmed ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city.label}`)}&query_place_id=${encodeURIComponent(identity.placeId)}` : null;
  const preview = mode === 'LOCAL_PREVIEW_WITHOUT_GMB';
  result.workflowVersion = 'observation-audit-v1';
  result.provider = { id: 'public-observations', readiness: 'independent-of-dataforseo' };
  if (!confirmed && !preview) {
    result.stages = ['establishment-search', 'site-discovery', 'gmb-audit', 'seo-audit', 'competitor-keywords', 'strategy'].map(id => stage(id, 'BLOCKED', 'ESTABLISHMENT_NOT_CONFIRMED'));
    result.status = 'BLOCKED';
    await publishPacket(result); await save();
    return result;
  }
  const checkpoint = result.observationCheckpoint ??= {};
  if (!checkpoint.identityReady) {
    result.modules.establishment = { selected: confirmed ? { source: 'google-places', placeId: identity.placeId, name, address } : null, candidates: [] };
    result.modules.site = { providedDomain: domain, candidates: [], confirmation: domain ? { status: 'CONFIRMED', source: result.input.domainSource } : { status: 'NOT_CONFIRMED', cause: 'NO_WEBSITE_PROVIDED' } };
    const observations = [];
    if (confirmed) {
      const fact = `${name} — ${address ?? city.label}`;
      observations.push({ id: 'local-identity', url: identityUrl, fact, classification: 'OBSERVED' });
      result.evidence.push(createEvidenceSnapshot({ sourceType: 'google-places-selection', provider: 'google-places', canonicalUrl: identityUrl, observedAt, rawPayload: JSON.stringify({ name, address, placeId: identity.placeId }), ruleVersion: result.workflowVersion }));
    }
    result.stages.push(stage('establishment-search', confirmed ? 'SUCCEEDED' : 'PARTIAL', confirmed ? null : 'ESTABLISHMENT_NOT_CONFIRMED', confirmed ? 'google-places-selection' : 'not-run'));
    result.stages.push(stage('site-discovery', 'SUCCEEDED', null, domain ? 'provided-domain' : 'no-website-provided'));
    result.modules.gmb = { candidates: confirmed ? [{ title: name, address, category: identity.primaryTypeDisplayName ?? identity.primaryType ?? null, url: identityUrl, observedAt }] : [], confirmation: { status: confirmed ? 'SELECTED' : 'NOT_CONFIRMED', cause: confirmed ? null : 'ESTABLISHMENT_NOT_CONFIRMED' } };
    result.stages.push(stage('gmb-audit', confirmed ? 'SUCCEEDED' : 'PARTIAL', confirmed ? null : 'ESTABLISHMENT_NOT_CONFIRMED', confirmed ? 'google-places-selection' : 'not-run'));
    checkpoint.observations = observations;
    checkpoint.identityReady = true;
  }
  if (confirmed && !checkpoint.profile) {
    if (checkpoint.profileStarted) checkpoint.profile = { status: 'PARTIAL', cause: 'GOOGLE_PROFILE_COST_RECONCILIATION_REQUIRED' };
    else {
      checkpoint.profileStarted = true;
      await save();
      checkpoint.profile = await profileReader({ placeId: identity.placeId, ledger });
      await save();
    }
  }
  const google = checkpoint.profile;
  const googleProfile = google?.profile;
  if (googleProfile) {
    result.modules.gmb.candidates = [{ ...googleProfile, observedAt }];
    if (!checkpoint.profileEvidenceReady) {
      result.evidence.push(createEvidenceSnapshot({ sourceType: 'google-places-details', provider: 'google-places', canonicalUrl: googleProfile.url ?? identityUrl, observedAt, rawPayload: JSON.stringify(googleProfile), ruleVersion: result.workflowVersion }));
      checkpoint.profileEvidenceReady = true;
    }
  }
  const gmbStage = result.stages.find(item => item.id === 'gmb-audit');
  if (confirmed) Object.assign(gmbStage, stage('gmb-audit', google?.status ?? 'PARTIAL', google?.cause ?? null, googleProfile ? 'google-places-details' : 'not-run'));
  const observations = [...checkpoint.observations];
  if (googleProfile) {
    const add = (id, fact) => observations.push({ id: `google-${id}`, url: googleProfile.url ?? identityUrl, fact, classification: 'OBSERVED' });
    add('contact', `Google Maps : ${googleProfile.title}, ${googleProfile.address}. Téléphone : ${googleProfile.phone ?? 'non retourné'}. Site : ${googleProfile.website ?? 'non retourné'}. Statut : ${googleProfile.businessStatus ?? 'non retourné'}.`);
    if (googleProfile.hours.length) add('hours', `Horaires habituels Google : ${googleProfile.hours.join(' ; ')}`);
    if (googleProfile.currentHours.length) add('current-hours', `Horaires courants Google : ${googleProfile.currentHours.join(' ; ')}`);
    if (googleProfile.rating !== null) add('rating', `Note Google : ${googleProfile.rating}/5 sur ${googleProfile.reviewCount ?? 'un nombre non retourné de'} avis.`);
    googleProfile.reviews.forEach((review, index) => add(`review-${index + 1}`, `Avis Google, ${review.publishedAt ?? 'date inconnue'}, ${review.rating ?? 'note inconnue'}/5 : ${review.text}`));
  }
  const sampleProfile = { ...profile, maxPages: Math.min(profile.maxPages, 6), timeoutMs: Math.min(profile.timeoutMs, 30000), prioritizeClientPages: true };
  const crawl = checkpoint.seo ? Promise.resolve(checkpoint.seo) : domain ? runSeoAudit({ target: domain, observedAt, fetchImpl, lookup, profile: sampleProfile }).catch(error => ({ status: 'PARTIAL', cause: error.code ?? 'CRAWL_FAILED', pages: [], findings: [] })) : Promise.resolve({ status: 'SUCCEEDED', pages: [], findings: [], summary: { pagesAnalyzed: 0 }, execution: 'not-run' });
  if (!result.reports.some(report => report.kind === 'gmb')) {
    if (!preview) await publishReport(result, 'gmb');
    else if (!result.auditPacket) await publishPacket(result);
  }
  await save();
  const complete = async () => {
    const seo = await crawl;
    checkpoint.seo = seo;
    await save();
    // A deliberate sample limit is part of this audit's scope; failed captures remain partial.
    const crawlPartial = seo.cause || !seo.pages?.length || seo.pages.some(page => page.crawlStatus !== 'complete');
    const siteStatus = domain && crawlPartial ? 'PARTIAL' : 'SUCCEEDED';
    result.modules.seo = { ...seo, status: siteStatus, execution: domain ? 'local-crawl' : 'not-run', external: { crawl: siteStatus, onPage: 'NOT_RUN', cause: domain && crawlPartial ? seo.cause ?? 'CRAWL_INCOMPLETE' : null } };
    result.stages = result.stages.filter(item => !['seo-audit', 'competitor-keywords', 'strategy'].includes(item.id));
    result.stages.push(stage('seo-audit', siteStatus, domain && crawlPartial ? seo.cause ?? 'CRAWL_INCOMPLETE' : null, result.modules.seo.execution));
    for (const [index, page] of (seo.pages ?? []).entries()) {
      if (page.crawlStatus !== 'complete') continue;
      const fact = `${page.title || 'Sans titre'} — ${page.text ?? ''}`;
      observations.push({ id: `local-page-${index + 1}`, url: page.url, fact, contactLinks: page.contactLinks, viewport: page.viewport, classification: 'OBSERVED' });
      if (!checkpoint.evidenceReady) result.evidence.push(createEvidenceSnapshot({ canonicalUrl: page.url, observedAt, rawPayload: JSON.stringify(page), ruleVersion: result.workflowVersion }));
    }
    for (const [index, finding] of (seo.findings ?? []).filter(item => item.code !== 'PAGE_LIMIT_REACHED').slice(0, 20).entries()) observations.push({ id: `local-check-${index + 1}`, url: finding.evidence.canonicalUrl, fact: finding.detail, classification: 'CALCULATED' });
    checkpoint.evidenceReady = true;
    let analysis = checkpoint.analysis ?? (checkpoint.analysisStarted ? { status: 'PARTIAL', cause: 'AI_COST_RECONCILIATION_REQUIRED', execution: 'not-run', observations: [], priorities: [], competitors: [], queries: [], evidence: [] } : null);
    if (!analysis) {
      checkpoint.analysisStarted = true;
      await save();
      try { analysis = analyst ? await analyst({ subject: { name, city: city.label, country: city.country, address, domain, category: identity?.primaryTypeDisplayName ?? identity?.primaryType ?? null, businessTypes: identity?.types ?? [] }, pages: seo.pages ?? [], observations, ledger, observedAt, costEventsRef: `runs/${result.id}/cost-events.jsonl` }) : null; }
      catch { analysis = null; }
      analysis ??= { status: 'PARTIAL', cause: 'AI_WEB_RESEARCH_UNAVAILABLE', execution: 'not-run', observations: [], priorities: [], competitors: [], queries: [], evidence: [] };
      checkpoint.analysis = analysis;
      await save();
    }
    if (!checkpoint.analysisEvidenceReady) result.evidence.push(...(analysis.evidence ?? []));
    checkpoint.analysisEvidenceReady = true;
    result.modules.observation = { ...analysis, observations: [...observations, ...(analysis.observations ?? [])], scope: sampleProfile, limitations: [...(analysis.limitations ?? []), ...(seo.crawlSummary?.limitReached ? [`L’examen du site est limité à ${sampleProfile.maxPages} pages, en privilégiant les liens de contact, réservation, menu et services détectés.`] : [])] };
    result.modules.keywords = { ideas: [], competitors: analysis.competitors ?? [], rankedKeywords: [], researchPlan: { queries: analysis.queries ?? [] }, planner: { status: analysis.status, cause: analysis.cause, execution: analysis.execution, source: analysis.source ?? {} } };
    result.modules.strategy = { recommendations: [], source: 'observation-audit-v1', interpretation: { status: analysis.status, cause: analysis.cause } };
    result.stages.push(stage('competitor-keywords', analysis.status, analysis.cause, analysis.execution), stage('strategy', analysis.status, analysis.cause, analysis.execution));
    result.status = result.stages.some(item => item.status !== 'SUCCEEDED') ? 'PARTIAL' : 'SUCCEEDED';
    result.budget = ledger.snapshot(); result.updatedAt = clock().toISOString();
    if (!preview) await publishReport(result, 'gmb');
    await publishReport(result, 'final'); await save();
    return result;
  };
  return waitForGmb && !preview ? { ...result, completion: complete() } : complete();
}
