export async function configureHostedProviders(providers, env) {
  for (const [id, key] of [['openai', 'OPENAI_API_KEY'], ['google-places', 'GOOGLE_PLACES_API_KEY']]) {
    if (!env[key]) continue;
    const provider = (await providers.list()).find(item => item.id === id);
    if (!provider || provider.lastCheckedAt) continue;
    const checked = await providers.testConnection(id);
    if (checked.health === 'healthy') await providers.setEnabled(id, true);
  }
}
