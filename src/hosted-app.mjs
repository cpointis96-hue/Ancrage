import { Pool } from 'pg';
import { createApp } from './app.mjs';
import { createPostgresStore } from './core/postgres-store.mjs';
import { createMemorySecretStore } from './providers/memory-secret-store.mjs';
import { configureHostedProviders } from './providers/hosted-providers.mjs';

export async function createHostedApp({ env = process.env, namespace = 'ancrage', pool: providedPool = null } = {}) {
  if (!providedPool && !env.DATABASE_URL) throw new Error('DATABASE_URL est requis pour le runtime hébergé.');
  const pool = providedPool ?? new Pool({ connectionString: env.DATABASE_URL, max: 4, connectionTimeoutMillis: 10000 });
  const store = createPostgresStore({ pool, namespace });
  const secrets = {};
  if (env.OPENAI_API_KEY) secrets['provider:openai'] = env.OPENAI_API_KEY;
  if (env.GOOGLE_PLACES_API_KEY) secrets['provider:google-places'] = env.GOOGLE_PLACES_API_KEY;
  const secretStore = createMemorySecretStore(secrets);
  try {
    // Seeds and migrations must finish together before another instance starts.
    return await store.withLock('config/bootstrap.lock', async () => {
      const app = createApp({ store, secretStore, opener: async () => { throw new Error('Ouverture locale indisponible.'); } });
      await app.ready;
      await configureHostedProviders(app.providers, env);
      return { ...app, store, close: () => providedPool ? Promise.resolve() : pool.end() };
    });
  } catch (error) {
    if (!providedPool) await pool.end();
    throw error;
  }
}
