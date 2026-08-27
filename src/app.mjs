import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createAtomicStore } from './core/atomic-store.mjs';
import { createPromptRegistry } from './config/prompt-registry.mjs';
import { createWorkflowRegistry } from './config/workflow-registry.mjs';
import { createDossierRegistry } from './dossiers/dossier-registry.mjs';
import { createDomainCandidatesImplementation, createDomainResearchService } from './internet/domain-research-service.mjs';
import { createMemorySecretStore } from './providers/memory-secret-store.mjs';
import { createKeychainSecretStore } from './providers/keychain-secret-store.mjs';
import { createProviderRegistry } from './providers/provider-registry.mjs';
import { createArtifactRegistry } from './runs/artifact-registry.mjs';
import { createLocalOpener } from './system/local-opener.mjs';
import { defaultImplementations } from './workflows/implementations.mjs';
import { createWorkflowEngine } from './workflows/workflow-engine.mjs';
import { clientSiteWorkflow, createClientSiteSimulation, createSimulationImplementations } from './simulation/client-site-simulation.mjs';
import { createDefaultProviderAdapters } from './providers/http-adapters.mjs';
import { createSeoAuditRegistry } from './audit/audit-registry.mjs';
import { runSeoAudit } from './audit/seo-audit-service.mjs';

const defaultsRoot = new URL('../fixtures/defaults/', import.meta.url);

async function seedPrompt(store, prompts, id) {
  let migrated = false;
  if (await store.readText(`config/prompts/${id}/draft.md`, null) === null) {
    const markdown = await readFile(new URL(`prompts/${id}.md`, defaultsRoot), 'utf8');
    await prompts.saveDraft(id, markdown, { expectedHash: null });
  } else {
    const current = await store.readText(`config/prompts/${id}/draft.md`);
    let normalized = current.replace(/^modelProfile:.*\n/m, '');
    if (id === 'audit-analyst') normalized = normalized.replace(/^outputContract: local-report$/m, 'outputContract: audit-report');
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

async function seedContract(store, id) {
  if (await store.readText(`config/contracts/${id}.schema.json`, null) !== null) return;
  const schema = JSON.parse(await readFile(new URL(`contracts/${id}.schema.json`, defaultsRoot), 'utf8'));
  await store.writeJson(`config/contracts/${id}.schema.json`, schema, { expectedHash: null });
}

export function createApp({ dataDir = process.env.ANCRAGE_DATA_DIR ?? path.resolve('.ancrage'), secretStore = process.platform === 'darwin' ? createKeychainSecretStore() : createMemorySecretStore(), adapters = {}, opener = createLocalOpener(), auditRunner = runSeoAudit } = {}) {
  const store = createAtomicStore(dataDir);
  const prompts = createPromptRegistry({ store });
  const workflows = createWorkflowRegistry({ store });
  const providerAdapters = { ...createDefaultProviderAdapters(), ...adapters };
  const providers = createProviderRegistry({ store, secretStore, adapters: providerAdapters });
  const dossiers = createDossierRegistry({ store, opener });
  const faults = new Set();
  const implementations = { ...defaultImplementations, ...createSimulationImplementations({ store, faults }), 'domain-candidates': createDomainCandidatesImplementation({ providers, adapters: providerAdapters, secretStore, fallback: query => ({ domain: `${String(query).toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, source: 'local-candidate-generator', availability: 'unknown' }) }) };
  const runs = createWorkflowEngine({ store, promptRegistry: prompts, workflowRegistry: workflows, implementations });
  const simulation = createClientSiteSimulation({ store, engine: runs, dossiers, faults });
  const artifacts = createArtifactRegistry({ store, runs });
  const audits = createSeoAuditRegistry({ store, runner: auditRunner });
  const internet = createDomainResearchService({ store, runs });
  const ready = (async () => {
    await seedContract(store, 'domain-candidates');
    await seedContract(store, 'audit-report');
    await seedContract(store, 'copy-draft');
    const domainResearch = JSON.parse(await readFile(new URL('workflows/domain-research.json', defaultsRoot), 'utf8'));
    await workflows.ensure(domainResearch);
    await workflows.ensure(clientSiteWorkflow);
    await seedPrompt(store, prompts, 'audit-analyst');
    await seedPrompt(store, prompts, 'copywriter');
  })();
  return { artifacts, audits, dossiers, internet, providers, prompts, ready, runs, simulation, workflows };
}
