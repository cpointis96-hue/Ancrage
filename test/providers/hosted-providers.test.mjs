import test from 'node:test';
import assert from 'node:assert/strict';
import { configureHostedProviders } from '../../src/providers/hosted-providers.mjs';

test('active uniquement un fournisseur serveur neuf et testé avec succès', async () => {
  const tested = []; const enabled = [];
  const definitions = [{ id: 'openai', lastCheckedAt: null }, { id: 'google-places', lastCheckedAt: null }];
  const registry = { list: async () => definitions, testConnection: async id => { tested.push(id); return { health: id === 'openai' ? 'healthy' : 'unhealthy' }; }, setEnabled: async id => enabled.push(id) };
  await configureHostedProviders(registry, {});
  assert.deepEqual(tested, []);
  await configureHostedProviders(registry, { OPENAI_API_KEY: 'test-only', GOOGLE_PLACES_API_KEY: 'test-only' });
  assert.deepEqual(tested, ['openai', 'google-places']);
  assert.deepEqual(enabled, ['openai']);
  definitions.forEach(item => { item.lastCheckedAt = '2026-11-07T00:00:00Z'; });
  await configureHostedProviders(registry, { OPENAI_API_KEY: 'test-only' });
  assert.equal(tested.length, 2);
  definitions[0].health = 'unhealthy';
  await configureHostedProviders(registry, { OPENAI_API_KEY: 'replacement-test-only' });
  assert.equal(tested.length, 3);
});
