import path from 'node:path';
import { createAtomicStore } from './core/atomic-store.mjs';
import { createPromptRegistry } from './config/prompt-registry.mjs';
import { createMemorySecretStore } from './providers/memory-secret-store.mjs';
import { createKeychainSecretStore } from './providers/keychain-secret-store.mjs';
import { createProviderRegistry } from './providers/provider-registry.mjs';
import { createWorkflowEngine } from './workflows/workflow-engine.mjs';
import { createClientSiteSimulation, createSimulationImplementations } from './simulation/client-site-simulation.mjs';

export function createApp({ dataDir = process.env.ANCRAGE_DATA_DIR ?? path.resolve('.ancrage'), secretStore = process.platform === 'darwin' ? createKeychainSecretStore() : createMemorySecretStore(), adapters = {} } = {}) {
  const store = createAtomicStore(dataDir); const prompts = createPromptRegistry({ store }); const providers = createProviderRegistry({ store, secretStore, adapters }); const runs = createWorkflowEngine({ store, promptRegistry: prompts }); const faults = new Set(); const simulationRuns = createWorkflowEngine({ store, promptRegistry: prompts, implementations: createSimulationImplementations({ store, faults }) }); const simulation = createClientSiteSimulation({ store, engine: simulationRuns, faults });
  return { providers, prompts, runs, simulation, workflows: async () => [{ id: 'domain-research', version: 1, status: 'available' }, { id: 'client-site-simulation', version: 1, status: 'available' }] };
}
