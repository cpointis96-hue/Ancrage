async function call(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Erreur interne.');
  return body;
}

export const api = {
  activatePrompt: (id, versionId) => call(`/prompts/${id}/activate`, { method: 'POST', body: JSON.stringify({ versionId }) }),
  artifacts: runId => call(`/runs/${runId}/artifacts`),
  createIntake: profile => call('/intake/dossiers', { method: 'POST', body: JSON.stringify(profile) }),
  createPromptVersion: (id, expectedDraftHash) => call(`/prompts/${id}/versions`, { method: 'POST', body: JSON.stringify({ expectedDraftHash }) }),
  decideRun: (id, decision) => call(`/runs/${id}/decision`, { method: 'PUT', body: JSON.stringify({ decision }) }),
  deleteSecret: id => call(`/providers/${id}/secret`, { method: 'DELETE' }),
  dossier: id => call(`/dossiers/${id}`),
  dossiers: () => call('/dossiers'),
  getPrompt: id => call(`/prompts/${id}`),
  internetSearch: query => call('/internet/search', { method: 'POST', body: JSON.stringify({ query }) }),
  openDossier: id => call(`/dossiers/${id}/open`, { method: 'POST' }),
  prompts: () => call('/prompts'),
  providers: () => call('/providers'),
  resumeRun: id => call(`/runs/${id}/resume`, { method: 'POST' }),
  run: id => call(`/runs/${id}`),
  events: id => call(`/runs/${id}/events`),
  runs: () => call('/runs'),
  savePrompt: (id, markdown, expectedHash) => call(`/prompts/${id}/draft`, { method: 'PUT', body: JSON.stringify({ markdown, expectedHash }) }),
  saveSecret: (id, secret) => call(`/providers/${id}/secret`, { method: 'PUT', body: JSON.stringify({ secret }) }),
  setEnabled: (id, enabled) => call(`/providers/${id}/enabled`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  startDossierRun: (id, fault = null) => call(`/dossiers/${id}/runs`, { method: 'POST', body: JSON.stringify({ fault }) }),
  startRun: (workflowId, input) => call('/runs', { method: 'POST', body: JSON.stringify({ workflowId, input }) }),
  startSimulation: (profile, fault = null) => call('/simulations/client-site', { method: 'POST', body: JSON.stringify({ profile, fault }) }),
  testProvider: id => call(`/providers/${id}/test`, { method: 'POST' }),
  workflows: () => call('/workflows'),
};
