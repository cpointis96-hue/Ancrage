import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProviderAdapters } from '../../src/providers/http-adapters.mjs';

function fakeFetch(calls) {
  return async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, text: async () => JSON.stringify({ result: { domains: [] }, results: [], SearchResponse: { SearchResults: [] }, reply: { available: [] } }) };
  };
}

test('utilise le schéma d’authentification officiel de chaque provider', async () => {
  const calls = [];
  const adapters = createDefaultProviderAdapters({ fetchImpl: fakeFetch(calls), env: { CLOUDFLARE_ACCOUNT_ID: 'account', NAMECOM_USERNAME: 'user' } });
  await adapters.openai({ secret: 'openai-key' });
  await adapters.anthropic({ secret: 'anthropic-key' });
  await adapters.googleGemini({ secret: 'gemini-key' });
  await adapters.openrouter({ secret: 'router-key' });
  await adapters.cloudflare({ secret: 'cloudflare-key' });
  await adapters.dynadot({ secret: 'dynadot-key' });
  await adapters.namesilo({ secret: 'namesilo-key' });
  await adapters.nameCom({ secret: 'name-key' });
  assert.equal(calls[0].options.headers.authorization, 'Bearer openai-key');
  assert.equal(calls[1].options.headers['x-api-key'], 'anthropic-key');
  assert.equal(calls[2].options.headers['x-goog-api-key'], 'gemini-key');
  assert.equal(calls[3].options.headers.authorization, 'Bearer router-key');
  assert.equal(calls[4].options.headers.authorization, 'Bearer cloudflare-key');
  assert.match(calls[5].url, /key=dynadot-key/);
  assert.match(calls[6].url, /key=namesilo-key/);
  assert.match(calls[7].options.headers.authorization, /^Basic /);
});

test('accepte les credentials structurés nécessaires aux APIs composites', async () => {
  const calls = [];
  const adapters = createDefaultProviderAdapters({ fetchImpl: fakeFetch(calls), env: {} });
  await adapters.cloudflare({ secret: JSON.stringify({ token: 'token', accountId: 'account' }) });
  await adapters.nameCom({ secret: JSON.stringify({ token: 'token', username: 'user' }) });
  assert.equal(calls[0].options.headers.authorization, 'Bearer token');
  assert.match(calls[1].options.headers.authorization, /^Basic /);
});

test('recherche avec les adapters registrar sans divulguer la clé dans le résultat', async () => {
  const calls = [];
  const adapters = createDefaultProviderAdapters({ fetchImpl: fakeFetch(calls), env: { CLOUDFLARE_ACCOUNT_ID: 'account', NAMECOM_USERNAME: 'user' } });
  const results = await Promise.all([
    adapters.cloudflare.search({ secret: 'secret', query: 'Maison Sillage' }),
    adapters.dynadot.search({ secret: 'secret', query: 'Maison Sillage' }),
    adapters.namesilo.search({ secret: 'secret', query: 'Maison Sillage' }),
    adapters.nameCom.search({ secret: 'secret', query: 'Maison Sillage' }),
  ]);
  assert.equal(calls.length, 4);
  assert.equal(JSON.stringify(results).includes('secret'), false);
});
