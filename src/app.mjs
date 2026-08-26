import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createAtomicStore } from './core/atomic-store.mjs';
import { createPromptRegistry } from './config/prompt-registry.mjs';
import { createWorkflowRegistry } from './config/workflow-registry.mjs';
import { createDossierRegistry } from './dossiers/dossier-registry.mjs';
import { createDomainResearchService } from './internet/domain-research-service.mjs';
import { createMemorySecretStore } from './providers/memory-secret-store.mjs';
import { createKeychainSecretStore } from './providers/keychain-secret-store.mjs';
import { createProviderRegistry } from './providers/provider-registry.mjs';
import { createArtifactRegistry } from './runs/artifact-registry.mjs';
import { createLocalOpener } from './system/local-opener.mjs';
import { defaultImplementations } from './workflows/implementations.mjs';
import { createWorkflowEngine } from './workflows/workflow-engine.mjs';
import { clientSiteWorkflow, createClientSiteSimulation, createSimulationImplementations } from './simulation/client-site-simulation.mjs';

const defaultsRoot = new URL('../fixtures/defaults/', import.meta.url);

async function seedPrompt(store, prompts, id) {
  if (await store.readText(`config/prompts/${id}/draft.md`, null) !== null) return;
  const markdown = await readFile(new URL(`prompts/${id}.md`, defaultsRoot), 'utf8');
  await prompts.saveDraft(id, markdown, { expectedHash: null });
}

export function createApp({ dataDir = process.env.ANCRAGE_DATA_DIR ?? path.resolve('.ancrage'), secretStore = process.platform === 'darwin' ? createKeychainSecretStore() : createMemorySecretStore(), adapters = {}, opener = createLocalOpener() } = {}) {
  const store = createAtomicStore(dataDir);
  const prompts = createPromptRegistry({ store });
  const workflows = createWorkflowRegistry({ store });
  const providers = createProviderRegistry({ store, secretStore, adapters });
  const dossiers = createDossierRegistry({ store, opener });
  const faults = new Set();
  const implementations = { ...defaultImplementations, ...createSimulationImplementations({ store, faults }) };
  const runs = createWorkflowEngine({ store, promptRegistry: prompts, implementations });
  const simulation = createClientSiteSimulation({ store, engine: runs, dossiers, faults });
  const artifacts = createArtifactRegistry({ store, runs });
  const internet = createDomainResearchService({ store, runs });
  const ready = (async () => {
    const domainResearch = JSON.parse(await readFile(new URL('workflows/domain-research.json', defaultsRoot), 'utf8'));
    await workflows.ensure(domainResearch);
    await workflows.ensure(clientSiteWorkflow);
    await seedPrompt(store, prompts, 'audit-analyst');
    await seedPrompt(store, prompts, 'copywriter');
  })();
  return { artifacts, dossiers, internet, providers, prompts, ready, runs, simulation, workflows: () => workflows.list() };
}
