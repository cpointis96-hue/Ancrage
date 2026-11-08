import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAtomicStore } from './core/atomic-store.mjs';
import { createPromptRegistry } from './config/prompt-registry.mjs';
import { createWorkflowRegistry } from './config/workflow-registry.mjs';
import { createTemplateRegistry } from './config/template-registry.mjs';
import { createContractRegistry } from './config/contract-registry.mjs';
import { createCliProfileRegistry } from './config/cli-profile-registry.mjs';
import { createDossierRegistry } from './dossiers/dossier-registry.mjs';
import { createDomainCandidatesImplementation, createDomainResearchService } from './internet/domain-research-service.mjs';
import { createMemorySecretStore } from './providers/memory-secret-store.mjs';
import { createKeychainSecretStore } from './providers/keychain-secret-store.mjs';
import { createProviderRegistry } from './providers/provider-registry.mjs';
import { createArtifactRegistry } from './runs/artifact-registry.mjs';
import { createLocalOpener } from './system/local-opener.mjs';
import { createProviderChatImplementation, defaultImplementations } from './workflows/implementations.mjs';
import { createWorkflowEngine } from './workflows/workflow-engine.mjs';
import { clientSiteWorkflow, createClientSiteSimulation, createSimulationImplementations } from './simulation/client-site-simulation.mjs';
import { createDefaultProviderAdapters } from './providers/http-adapters.mjs';
import { createSeoAuditRegistry } from './audit/audit-registry.mjs';
import { runSeoAudit } from './audit/seo-audit-service.mjs';
import { createPublicAuditWorkflow } from './audit/public-audit-workflow.mjs';
import { createSeoResearchPlanner } from './audit/seo-research-planner.mjs';
import { createObservationAnalyst } from './audit/observation-analyst.mjs';
import { createDemoRegistry } from './demos/demo-registry.mjs';
import { createPublicControlPlane } from './public/public-control-plane.mjs';
import { createDemoWorkbench } from './demo/demo-workbench.mjs';
import { createGooglePlacesAutocomplete } from './geography/google-places-autocomplete.mjs';

const defaultsRoot = new URL('../fixtures/defaults/', import.meta.url);
const auditLegacyHashes = JSON.parse(await readFile(new URL('audit-legacy-hashes.json', defaultsRoot), 'utf8'));
const bundledAuditDefault = (key, hash) => [auditLegacyHashes[key]].flat().includes(hash);
const implementationFiles = {
  'collect-query': fileURLToPath(new URL('./workflows/implementations.mjs', import.meta.url)),
  'domain-candidates': fileURLToPath(new URL('./internet/domain-research-service.mjs', import.meta.url)),
  'provider-chat': fileURLToPath(new URL('./workflows/implementations.mjs', import.meta.url)),
  'simulation-dossier-validation': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
  'simulation-content-plan': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
  'simulation-site-build': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
  'simulation-gmb-audit-report': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
  'simulation-seo-competition-report': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
  'simulation-quality-gate': fileURLToPath(new URL('./simulation/client-site-simulation.mjs', import.meta.url)),
};
const legacyLocalSeoResearchPlanner = `---
id: local-seo-research-planner
name: Plan de recherche SEO locale
ownerStep: research-plan
outputContract: seo-research-plan
---
Tu prépares un plan de recherche SEO locale, pas un audit et pas une liste de mots-clés mesurés.

Utilise exclusivement les faits fournis dans l’entrée. La catégorie doit être l’une des catégories autorisées. Ne déduis jamais une catégorie depuis un type Google générique. Ne cite ni volume, ni concurrence, ni concurrent, ni position.

Retourne uniquement un objet JSON conforme au contrat. Propose de une à six requêtes françaises, courtes et utiles. Chaque requête doit contenir le nom de l’établissement ou une catégorie autorisée, et la localité fournie. Utilise \`business-name\` seulement si le nom est présent dans la requête, sinon \`observed-category\`.
`;

async function seedPrompt(store, prompts, id) {
  let migrated = false;
  if (await store.readText(`config/prompts/${id}/draft.md`, null) === null) {
    const markdown = await readFile(new URL(`prompts/${id}.md`, defaultsRoot), 'utf8');
    await prompts.saveDraft(id, markdown, { expectedHash: null });
  } else {
    const current = await store.readText(`config/prompts/${id}/draft.md`);
    let normalized = current.replace(/^modelProfile:.*\n/m, '');
    if (bundledAuditDefault(`prompts/${id}.md`, store.hashText(current))) {
      const existing = await prompts.get(id);
      const active = existing.activeVersionId ? await prompts.resolveRevision(id, existing.activeVersionId) : current;
      if (store.hashText(active) === store.hashText(current)) normalized = await readFile(new URL(`prompts/${id}.md`, defaultsRoot), 'utf8');
    }
    if (id === 'audit-analyst') normalized = normalized.replace(/^outputContract: local-report$/m, 'outputContract: audit-report');
    if (id === 'local-seo-research-planner' && normalized === legacyLocalSeoResearchPlanner) normalized = await readFile(new URL(`prompts/${id}.md`, defaultsRoot), 'utf8');
    if (normalized !== current) {
      await prompts.saveDraft(id, normalized, { expectedHash: store.hashText(current) });
      migrated = true;
    }
  }
  const prompt = await prompts.get(id);
  if (!prompt.activeVersionId || migrated) {
    const version = await prompts.createVersion(id, { expectedDraftHash: prompt.draftHash });
    await prompts.activate(id, version.id);
  }
}

async function seedContract(store, contracts, id) {
  const current = await store.readText(`config/contracts/${id}.schema.json`, null);
  if (current === null || bundledAuditDefault(`contracts/${id}.schema.json`, store.hashText(current))) {
    const schema = JSON.parse(await readFile(new URL(`contracts/${id}.schema.json`, defaultsRoot), 'utf8'));
    await store.writeJson(`config/contracts/${id}.schema.json`, schema, { expectedHash: current === null ? null : store.hashText(current) });
  }
  await contracts.ensure(id, id);
}

async function seedTemplate(store, templates, id) {
  const current = await store.readText(`config/templates/${id}/draft.html`, null);
  if (current !== null) {
    if (!bundledAuditDefault(`templates/${id}.html`, store.hashText(current))) return;
    const active = await templates.getActiveVersion(id);
    if (active.hash !== store.hashText(current)) return;
  }
  const content = await readFile(new URL(`templates/${id}.html`, defaultsRoot), 'utf8');
  const names = { 'site-preview': 'Site preview', 'audit-initial': 'Premier audit', 'audit-gmb': 'Audit GMB', 'audit-seo': 'Audit SEO et concurrence' };
  const saved = await templates.save(id, { name: names[id] ?? id, content }, { expectedHash: current === null ? null : store.hashText(current) });
  const version = await templates.createVersion(id, { expectedDraftHash: saved.draftHash });
  await templates.activate(id, version.id);
}

async function ensureClientAuditTemplates(workflows) {
  const current = await workflows.get('client-site-simulation');
  const templateByStep = { 'dossier-validation': 'audit-initial', 'gmb-audit-report': 'audit-gmb', 'seo-competition-report': 'audit-seo' };
  const legacySimulation = current.steps.length === 5
    && current.steps.some(step => step.id === 'report-build' && step.implementation === 'simulation-report-build')
    && !current.steps.some(step => step.id === 'gmb-audit-report' || step.id === 'seo-competition-report');
  const contentPlan = current.steps.find(step => step.id === 'content-plan');
  const finalReport = current.steps.find(step => step.id === 'seo-competition-report');
  const staleSequence = Boolean(contentPlan?.dependsOn?.includes('dossier-validation') || finalReport?.dependsOn?.includes('site-build'));
  const sourceSteps = legacySimulation || staleSequence ? clientSiteWorkflow.steps : current.steps;
  const steps = sourceSteps.map(step => {
    const withTemplate = templateByStep[step.id] && !step.outputTemplateId ? { ...step, outputTemplateId: templateByStep[step.id] } : step;
    if (withTemplate.kind === 'ai') return withTemplate;
    if (!['actor', 'model', 'promptRef', 'provider'].some(field => Object.hasOwn(withTemplate, field))) return withTemplate;
    const { actor: _actor, model: _model, promptRef: _promptRef, provider: _provider, ...deterministicStep } = withTemplate;
    return deterministicStep;
  });
  if (JSON.stringify(steps) === JSON.stringify(current.steps)) return;
  const { hash: _hash, activeVersionId: _activeVersionId, versions: _versions, ...definition } = current;
  const saved = await workflows.save(current.id, { ...definition, steps }, { expectedHash: current.hash });
  const version = await workflows.createVersion(current.id, { expectedDraftHash: saved.hash });
  await workflows.activate(current.id, version.id);
}

export function createApp({ store: providedStore = null, dataDir = process.env.ANCRAGE_DATA_DIR ?? path.resolve('.ancrage'), secretStore = process.platform === 'darwin' ? createKeychainSecretStore() : createMemorySecretStore(), adapters = {}, opener = createLocalOpener(), auditRunner = runSeoAudit, auditFetchImpl = globalThis.fetch, auditLookup = undefined, publicControlPlane: providedPublicControlPlane = null, demoWorkbench: providedDemoWorkbench = null } = {}) {
  const store = providedStore ?? createAtomicStore(dataDir);
  const contracts = createContractRegistry({ store });
  const cliProfiles = createCliProfileRegistry({ store });
  const prompts = createPromptRegistry({ store, contractRegistry: contracts });
  const workflows = createWorkflowRegistry({ store, promptRegistry: prompts, contractRegistry: contracts, cliProfileRegistry: cliProfiles, opener, implementationFiles });
  const templates = createTemplateRegistry({ store });
  const providerAdapters = { ...createDefaultProviderAdapters(), ...adapters };
  const providers = createProviderRegistry({ store, secretStore, adapters: providerAdapters });
  const googlePlacesAutocomplete = createGooglePlacesAutocomplete({ providers, adapters: providerAdapters, secretStore });
  const dossiers = createDossierRegistry({ store, opener });
  const faults = new Set();
  const implementations = { ...defaultImplementations, 'provider-chat': createProviderChatImplementation({ providers, adapters: providerAdapters }), ...createSimulationImplementations({ store, faults }), 'domain-candidates': createDomainCandidatesImplementation({ providers, adapters: providerAdapters, secretStore, fallback: query => ({ domain: `${String(query).toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, source: 'local-candidate-generator', availability: 'unknown' }) }) };
  const runs = createWorkflowEngine({ store, promptRegistry: prompts, workflowRegistry: workflows, contractRegistry: contracts, cliProfileRegistry: cliProfiles, templateRegistry: templates, implementations });
  const simulation = createClientSiteSimulation({ store, engine: runs, dossiers, faults });
  const artifacts = createArtifactRegistry({ store, runs });
  const demos = createDemoRegistry({ store, artifacts, runs });
  const audits = createSeoAuditRegistry({ store, runner: auditRunner });
  const seoResearchPlanner = createSeoResearchPlanner({ providers, adapters: providerAdapters, prompts, workflows, contracts });
  const observationAnalyst = createObservationAnalyst({ providers, adapters: providerAdapters, prompts, workflows, contracts });
  const publicAudits = createPublicAuditWorkflow({ store, providers, adapters: providerAdapters, secretStore, fetchImpl: auditFetchImpl, lookup: auditLookup, contracts, seoResearchPlanner, observationAnalyst });
  const demoWorkbench = providedDemoWorkbench ?? createDemoWorkbench({ store, auditRunner, fetchImpl: auditFetchImpl, lookup: auditLookup });
  const acceptanceReportFromRun = async run => {
    const quality = await store.readJson(`runs/${run.id}/steps/quality-gate/step-run.json`, null);
    const artifactRefs = [
      `runs/${run.id}/artifacts/site/index.html`,
      `runs/${run.id}/artifacts/gmb-audit-report/report.html`,
      `runs/${run.id}/artifacts/seo-competition-report/report.html`,
    ];
    const gates = (quality?.output?.checks ?? []).map(id => ({ id, status: quality.output.status, ruleVersion: 'simulation-quality-rules-v1', checkVersion: 'simulation-quality-check-v1', evidenceRefs: artifactRefs }));
    return {
      schemaVersion: 'acceptance-report-v1', revision: 1, status: quality?.output?.status ?? 'BLOCK',
      ruleVersions: ['simulation-quality-rules-v1'], gates, artifactRefs, evidenceRefs: artifactRefs,
      limitations: [], operatorDecision: 'PENDING',
    };
  };
  const publicControlPlane = providedPublicControlPlane ?? createPublicControlPlane({
    store,
    auditReportReader: (id, kind, format) => publicAudits.readReport(id, kind, format),
    contracts,
    auditStarter: async ({ request, decision }) => {
      const audit = await publicAudits.create({
        name: request.input.name,
        city: { id: request.input.city.id, label: request.input.city.label, country: request.input.city.countryCode },
        domain: request.input.domain ?? undefined,
        domainSource: request.input.identity?.source === 'google-places' ? 'google-places' : 'request',
        address: request.input.identity?.address ?? undefined,
        identity: request.input.identity ?? undefined,
        idempotencyKey: `public-control-plane-${request.id}`,
      }, { mode: decision, waitFor: decision === 'CONFIRM' ? 'gmb' : undefined, defer: Boolean(store.withLease) });
      const summary = async value => ({ id: value.id, status: value.status, stages: value.stages, provider: value.provider, auditPacket: value.auditPacket, auditProjection: value.auditProjection, packet: value.auditPacket ? (await publicAudits.readPacket(value.id)).packet : null });
      const reports = { audit: await summary(audit), deferred: Boolean(store.withLease) && audit.status === 'RUNNING' };
      for (const kind of ['gmb', 'final']) {
        const report = audit.reports?.find(item => item.kind === kind);
        if (report) reports[kind] = { html: (await publicAudits.readReport(audit.id, kind)).value };
        if (report?.pdfPath) reports[kind].pdf = (await publicAudits.readReport(audit.id, kind, 'pdf')).value;
      }
      if (!reports.final && audit.completion) {
        reports.completion = audit.completion.then(async completed => ({ audit: await summary(completed), html: (await publicAudits.readReport(completed.id, 'final')).value, pdf: (await publicAudits.readReport(completed.id, 'final', 'pdf')).value }));
      }
      return reports;
    },
    siteSpecComposer: async ({ request, preparation, preparationDraft }) => {
      const template = await templates.getActiveVersion('site-preview');
      const confirmedAt = new Date().toISOString();
      return {
        schemaVersion: 'site-spec-v1',
        title: request.input.name,
        locale: preparation.locale,
        provenance: { auditPacketRef: preparationDraft.auditPacketRef, preparationDraftRef: preparationDraft.id },
        confirmation: { status: 'CONFIRMED', confirmedAt },
        template: { id: template.id, versionId: template.versionId, hash: template.hash.replace(/^sha256:/, '') },
        pages: [{ path: '/', title: request.input.name, sections: ['identity', 'story', 'menu', 'contact'], provenanceRefs: [preparationDraft.auditPacketRef, preparationDraft.id], confirmation: 'CONFIRMED' }],
        assets: preparation.assets.map(asset => ({ id: asset.assetId, artifactRef: asset.assetPath, rightsStatus: asset.rightsStatus, provenanceRefs: [asset.hash], confirmation: 'CONFIRMED' })),
      };
    },
    pipelineStarter: async ({ request, preparation, siteSpec, pipelineReservation }) => {
      const intake = preparation.intake ?? {};
      const firstPhoto = preparation.assets.find(asset => asset.assetPath && asset.mimeType);
      if (!firstPhoto) throw Object.assign(new Error('Les fichiers photo ne sont pas disponibles pour la démo.'), { code: 'PHOTO_BYTES_NOT_AVAILABLE', status: 409 });
      const photoFiles = await Promise.all(preparation.assets.map(async asset => ({ asset, value: await store.readBuffer(asset.assetPath, null) })));
      if (photoFiles.some(item => !item.value)) throw Object.assign(new Error('Un fichier photo est introuvable dans la préparation.'), { code: 'PHOTO_BYTES_NOT_AVAILABLE', status: 409 });
      const dossier = await dossiers.create({
        name: request.input.name,
        city: request.input.city.label,
        country: request.input.city.countryCode,
        address: intake.address ?? '',
        contact: intake.contact ?? '',
        story: intake.story ?? '',
        menu: Array.isArray(intake.menu) ? intake.menu : [],
        photos: photoFiles.map(({ asset, value }) => ({ dataUrl: `data:${asset.mimeType};base64,${value.toString('base64')}`, alt: request.input.name, category: asset.category, rightsStatus: asset.rightsStatus })),
      }, { source: 'public-demo-intake' });
      const run = await simulation.startDossier(dossier.id, { siteSpec, pipelineReservation });
      if (run.status !== 'SUCCEEDED') throw new Error('Le pipeline de démo n’est pas terminé.');
      return {
        runId: run.id,
        siteSpec,
        acceptanceReport: await acceptanceReportFromRun(run),
      };
    },
    pipelineReconciler: async ({ pipelineReservation }) => {
      const run = (await runs.list()).find(item => item.input?.pipelineReservation === pipelineReservation);
      if (!run) return null;
      return run.status === 'SUCCEEDED' ? { runId: run.id, siteSpec: run.input.siteSpec, acceptanceReport: await acceptanceReportFromRun(run) } : { runId: run.id };
    },
    demoPresenter: async ({ runId, decision }) => {
      await runs.decide(runId, decision);
      return decision === 'APPROVED' ? demos.create(runId) : { decision };
    },
  });
  const workPublicAudits = async () => {
    const requests = await publicControlPlane.listRequests();
    for (const request of requests) if (request.matchDecision && request.status === 'RUNNING') await publicControlPlane.refreshAudit(request.id);
    const completed = await publicAudits.workPending();
    for (const request of requests) if (request.matchDecision && request.status === 'RUNNING') await publicControlPlane.refreshAudit(request.id);
    return completed;
  };
  const internet = createDomainResearchService({ store, runs });
  const ready = (async () => {
    await seedContract(store, contracts, 'domain-candidates');
    await seedContract(store, contracts, 'audit-report');
    await seedContract(store, contracts, 'copy-draft');
    await seedContract(store, contracts, 'seo-research-plan');
    await seedContract(store, contracts, 'audit-packet');
    await seedContract(store, contracts, 'public-observation-analysis');
    await seedContract(store, contracts, 'preparation-draft');
    await seedContract(store, contracts, 'demo-readiness');
    await seedContract(store, contracts, 'site-spec');
    await seedContract(store, contracts, 'acceptance-report');
    await seedPrompt(store, prompts, 'audit-analyst');
    await seedPrompt(store, prompts, 'copywriter');
    await seedPrompt(store, prompts, 'local-seo-research-planner');
    await seedPrompt(store, prompts, 'public-observation-analyst');
    const domainResearch = JSON.parse(await readFile(new URL('workflows/domain-research.json', defaultsRoot), 'utf8'));
    const localSeoResearch = JSON.parse(await readFile(new URL('workflows/local-seo-research.json', defaultsRoot), 'utf8'));
    await workflows.ensure(domainResearch);
    await workflows.ensure(localSeoResearch);
    await workflows.ensure(JSON.parse(await readFile(new URL('workflows/public-observation-audit.json', defaultsRoot), 'utf8')));
    await workflows.ensure(clientSiteWorkflow);
    await seedTemplate(store, templates, 'site-preview');
    await seedTemplate(store, templates, 'audit-initial');
    await seedTemplate(store, templates, 'audit-gmb');
    await seedTemplate(store, templates, 'audit-seo');
    await ensureClientAuditTemplates(workflows);
  })();
  return { workPublicAudits, artifacts, audits, cliProfiles, contracts, demoWorkbench, demos, dossiers, googlePlacesAutocomplete, internet, providers, prompts, publicAudits, publicControlPlane, ready, runs, simulation, templates, workflows };
}
