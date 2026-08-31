import { createHash } from 'node:crypto';

export const AUDIT_PACKET_VERSION = 'audit-packet-v1';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function hash(value) { return `sha256:${createHash('sha256').update(stableJson(value), 'utf8').digest('hex')}`; }
function unique(values) { return [...new Set(values.filter(value => typeof value === 'string' && value))]; }
function status(value, fallback = 'PARTIAL') { return ['SUCCEEDED', 'PARTIAL', 'BLOCKED'].includes(value) ? value : fallback; }
function coverage(value) { return value === 'SUCCEEDED' ? 'FULL' : value === 'PARTIAL' ? 'PARTIAL' : 'UNAVAILABLE'; }
function stage(run, id) { return run.stages?.find(item => item.id === id) ?? { status: 'PARTIAL', cause: 'STAGE_NOT_RECORDED' }; }
function coverageItem(item) {
  const value = status(item.status);
  return { status: value, coverage: coverage(value), cause: item.cause ?? (value === 'SUCCEEDED' ? 'OBSERVED' : 'NOT_AVAILABLE') };
}
function classified(value, { state = 'OBSERVED', authority = 'AUDIT_RUN', observedAt, evidenceRefs = [] } = {}) {
  const present = value !== null && value !== undefined && value !== '';
  return { state: present ? state : 'MISSING', value: present ? value : null, authority: present ? authority : 'NONE', observedAt: present ? observedAt : null, evidenceRefs };
}
function artifact(value, kind) { return value ? { kind, artifactRef: value } : null; }
function safeCompetitor(value) {
  return {
    title: value?.title ?? null,
    domain: value?.domain ?? null,
    url: value?.url ?? null,
    scope: value?.scope ?? null,
    type: value?.type ?? value?.classification ?? 'unknown',
  };
}
function safeKeyword(value) {
  return {
    keyword: value?.keyword ?? null,
    intent: value?.intent ?? null,
    scope: value?.scope ?? null,
    searchVolume: Number.isFinite(value?.searchVolume) ? value.searchVolume : null,
    cpc: Number.isFinite(value?.cpc) ? value.cpc : null,
  };
}

export function assembleAuditPacket({ auditRun, revision = 1, artifacts = {}, packetContractVersion = AUDIT_PACKET_VERSION } = {}) {
  if (!auditRun || typeof auditRun !== 'object' || typeof auditRun.id !== 'string' || !auditRun.id) throw new TypeError('auditRun est requis.');
  if (!Number.isInteger(revision) || revision < 1) throw new TypeError('revision est invalide.');
  const observedAt = auditRun.updatedAt ?? auditRun.startedAt ?? new Date(0).toISOString();
  const input = auditRun.input ?? {};
  const identity = input.identity ?? {};
  const evidenceRefs = unique((auditRun.evidence ?? []).map(item => item?.id));
  const seoFindings = (auditRun.modules?.seo?.findings ?? []).map((item, index) => ({
    ref: `finding:${item.code ?? 'OBSERVATION'}:${index + 1}`,
    code: item.code ?? 'OBSERVATION', severity: item.severity ?? null,
    classification: item.classification ?? null,
    evidenceRefs: unique([item.evidence?.id]),
  }));
  const gmbCandidates = auditRun.modules?.gmb?.candidates ?? [];
  const keywordIdeas = auditRun.modules?.keywords?.ideas ?? [];
  const selectedCompetitors = auditRun.modules?.keywords?.competitors ?? [];
  const competitorCandidates = auditRun.modules?.keywords?.competitorCandidates ?? selectedCompetitors;
  const strategy = auditRun.modules?.strategy ?? {};
  const planner = auditRun.modules?.keywords?.planner ?? {};
  const plannerSource = planner.source ?? {};
  const budget = auditRun.budget ?? {};
  const countryCode = String(input.city?.country ?? '').toUpperCase();
  const languageCode = String(auditRun.modules?.keywords?.location?.language_code ?? (countryCode === 'FR' ? 'fr' : 'en')).toLowerCase();
  const ruleVersions = unique([
    auditRun.modules?.seo?.ruleVersion,
    ...(auditRun.evidence ?? []).map(item => item?.ruleVersion),
    'seo-rules-v1',
  ]);
  const plannerProvenanceRefs = unique([
    plannerSource.workflowVersionId && `workflow:${plannerSource.workflowVersionId}`,
    plannerSource.promptVersionId && `prompt:${plannerSource.promptVersionId}`,
    plannerSource.contractVersionId && `contract:${plannerSource.contractVersionId}`,
    plannerSource.provider && `provider:${plannerSource.provider}`,
    plannerSource.model && `model:${plannerSource.model}`,
  ]);
  const costEventsRef = plannerSource.costEventsRef ?? `runs/${auditRun.id}/cost-events.jsonl`;
  const packet = {
    schemaVersion: AUDIT_PACKET_VERSION,
    packetId: `${auditRun.id}-packet-r${revision}`,
    revision,
    auditRunId: auditRun.id,
    createdAt: observedAt,
    status: status(auditRun.status),
    subject: {
      request: { name: input.name ?? 'Établissement', city: { id: input.city?.id ?? 'unknown', label: input.city?.label ?? 'Inconnue', countryCode } },
      resolution: {
        decision: input.mode ?? 'CONFIRM',
        establishmentStatus: stage(auditRun, 'establishment-search').status,
        siteStatus: auditRun.modules?.site?.confirmation?.status ?? stage(auditRun, 'site-discovery').status,
        selectedEstablishmentEvidenceRefs: evidenceRefs,
      },
    },
    values: {
      address: classified(input.address ?? identity.address, { authority: input.address ? 'REQUEST' : identity.address ? 'GOOGLE_PLACES' : 'NONE', observedAt }),
      category: classified(identity.primaryTypeDisplayName ?? identity.primaryType, { authority: 'GOOGLE_PLACES', observedAt }),
      website: classified(input.domain, { authority: input.domainSource ?? 'NONE', observedAt }),
    },
    coverage: {
      establishment: coverageItem(stage(auditRun, 'establishment-search')),
      localPresence: coverageItem(stage(auditRun, 'gmb-audit')),
      siteAudit: coverageItem(stage(auditRun, 'seo-audit')),
      market: coverageItem(stage(auditRun, 'competitor-keywords')),
    },
    evidenceRefs,
    findings: [
      { ref: 'finding:GMB_CANDIDATES_OBSERVED', code: 'GMB_CANDIDATES_OBSERVED', count: gmbCandidates.length, items: gmbCandidates.map(item => ({ title: item?.title ?? null, address: item?.address ?? null })), evidenceRefs },
      { ref: 'finding:SEO_PAGES_ANALYZED', code: 'SEO_PAGES_ANALYZED', count: auditRun.modules?.seo?.summary?.pagesAnalyzed ?? 0, evidenceRefs },
      { ref: 'finding:STAGES', code: 'STAGES', items: (auditRun.stages ?? []).map(item => ({ id: item.id, status: item.status, cause: item.cause ?? null })), evidenceRefs: [] },
      { ref: 'finding:EVIDENCE', code: 'EVIDENCE', items: (auditRun.evidence ?? []).map(item => ({ ref: item.id, provider: item.provider ?? null, canonicalUrl: item.canonicalUrl ?? null })), evidenceRefs },
      ...seoFindings,
    ],
    market: {
      searchMarket: { engine: 'google', countryCode, languageCode, location: input.city?.label ?? 'Inconnue', device: 'desktop' },
      competitorCandidates: competitorCandidates.slice(0, 20).map(safeCompetitor),
      selectedCompetitors: selectedCompetitors.slice(0, 5).map(safeCompetitor),
      keywordOpportunities: keywordIdeas.slice(0, 50).map(safeKeyword),
    },
    deterministicRecommendations: (strategy.recommendations ?? []).map((text, index) => ({ code: `RECOMMENDATION_${index + 1}`, text, findingRefs: [] })),
    aiContributions: [{
      purpose: 'SEO_RESEARCH_PLAN',
      status: planner.execution === 'not-run' ? 'NOT_RUN' : ['SUCCEEDED', 'PARTIAL', 'BLOCKED', 'FAILED'].includes(planner.status) ? planner.status : 'NOT_RUN',
      cause: planner.cause ?? null,
      executionRef: planner.execution && planner.execution !== 'not-run' ? `execution:${planner.execution}` : null,
      provenanceRefs: plannerProvenanceRefs,
      costEventRefs: plannerSource.costEventsRef ? [plannerSource.costEventsRef] : [],
      recommendations: [],
    }],
    limitations: unique((auditRun.stages ?? []).filter(item => item.cause).map(item => item.cause)),
    cost: {
      currency: budget.currency ?? 'USD', hardLimit: budget.hardLimit ?? 0.5,
      spent: budget.spent ?? 0, reserved: budget.reserved ?? 0,
      costEventsRef,
    },
    lineage: {
      workflowVersion: auditRun.workflowVersion ?? 'public-audit-v1', packetContractVersion,
      promptVersions: unique([plannerSource.promptVersionId]), ruleVersions,
    },
    artifacts: {
      gmbReport: artifact(artifacts.gmbReport, 'html'),
      finalReport: artifact(artifacts.finalReport, 'html'),
      pdf: artifact(artifacts.pdf, 'pdf'),
    },
    preparationDraft: {
      name: { value: input.name ?? null, source: 'PROSPECT_INPUT', confirmation: 'REQUIRED' },
      address: { value: input.address ?? identity.address ?? null, source: input.address || identity.address ? 'AUDIT_INPUT' : 'NONE', confirmation: 'REQUIRED' },
      contact: { value: null, source: 'NONE', confirmation: 'REQUIRED' },
      hours: { value: null, source: 'NONE', confirmation: 'REQUIRED' },
      menu: { items: [], source: 'NONE', confirmation: 'REQUIRED' },
      photos: [],
    },
  };
  return { packet, hash: hash(packet) };
}

export function projectAuditPacket(packet) {
  if (!packet || packet.schemaVersion !== AUDIT_PACKET_VERSION) throw new TypeError('AuditPacket invalide.');
  const count = code => packet.findings.find(item => item.code === code)?.count ?? 0;
  const items = code => packet.findings.find(item => item.code === code)?.items ?? [];
  return {
    packetId: packet.packetId,
    revision: packet.revision,
    status: packet.status,
    subject: { name: packet.subject.request.name, city: packet.subject.request.city.label, resolution: packet.subject.resolution },
    values: packet.values,
    market: packet.market,
    evidenceRefs: packet.evidenceRefs,
    lineage: packet.lineage,
    metrics: {
      gmbCandidates: count('GMB_CANDIDATES_OBSERVED'), sitePages: count('SEO_PAGES_ANALYZED'),
      keywordOpportunities: packet.market.keywordOpportunities.length, competitors: packet.market.selectedCompetitors.length,
      evidence: packet.evidenceRefs.length, spent: packet.cost.spent, reserved: packet.cost.reserved, hardLimit: packet.cost.hardLimit,
    },
    coverage: packet.coverage,
    cost: packet.cost,
    artifacts: packet.artifacts,
    report: {
      gmbCandidates: items('GMB_CANDIDATES_OBSERVED'),
      stages: items('STAGES'),
      evidence: items('EVIDENCE'),
      recommendations: packet.deterministicRecommendations,
      limitations: packet.limitations,
      aiContributions: packet.aiContributions,
    },
    preparationDraft: packet.preparationDraft,
  };
}
