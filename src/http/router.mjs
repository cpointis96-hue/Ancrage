import { readJsonBody, sendJson } from './json.mjs';
import { AppError, NotFoundError, ValidationError } from '../core/errors.mjs';

const id = value => { if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) throw new ValidationError('Identifiant invalide.'); return value; };

export function createRouter({ providers, prompts, workflows, runs, simulation = null, internet = null }) {
  return async function route(request, response, url) {
    const parts = url.pathname.split('/').filter(Boolean); const method = request.method ?? 'GET';
    try {
      if (parts[0] !== 'api') throw new NotFoundError();
      if (parts[1] === 'providers') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await providers.list());
        const providerId = id(parts[2]);
        if (parts[3] === 'secret' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await providers.saveSecret(providerId, body.secret)); }
        if (parts[3] === 'secret' && method === 'DELETE') return sendJson(response, 200, await providers.deleteSecret(providerId));
        if (parts[3] === 'test' && method === 'POST') return sendJson(response, 200, await providers.testConnection(providerId));
        if (parts[3] === 'enabled' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await providers.setEnabled(providerId, body.enabled)); }
      }
      if (parts[1] === 'prompts') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await prompts.list());
        const promptId = id(parts[2]);
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await prompts.get(promptId));
        if (parts[3] === 'draft' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await prompts.saveDraft(promptId, body.markdown, { expectedHash: body.expectedHash })); }
        if (parts[3] === 'versions' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await prompts.createVersion(promptId, { expectedDraftHash: body.expectedDraftHash })); }
        if (parts[3] === 'activate' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await prompts.activate(promptId, body.versionId)); }
      }
      if (parts[1] === 'workflows' && method === 'GET') return sendJson(response, 200, await workflows());
      if (parts[1] === 'runs') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await runs.list());
        if (parts.length === 2 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await runs.start(body.workflowId, body.input ?? {})); }
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await runs.get(id(parts[2])));
        if (parts.length === 4 && parts[3] === 'resume' && method === 'POST') return sendJson(response, 200, await runs.resume(id(parts[2])));
      }
      if (parts[1] === 'internet' && parts[2] === 'search' && method === 'POST') { if (!internet) throw new AppError('Recherche Internet non configurée.', { code: 'INTERNET_NOT_CONFIGURED', status: 503 }); const body = await readJsonBody(request); return sendJson(response, 200, await internet(body)); }
      if (parts[1] === 'simulations' && parts[2] === 'client-site' && simulation) {
        if (parts.length === 3 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await simulation.start(body.profile ?? {}, { fault: body.fault ?? null })); }
        if (parts.length === 5 && parts[4] === 'resume' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await simulation.resume(id(parts[3]), { fault: body.fault ?? null })); }
      }
      throw new NotFoundError();
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError('Erreur interne.');
      sendJson(response, appError.status ?? 500, { error: { code: appError.code, message: appError.status >= 500 ? 'Erreur interne.' : appError.message } });
    }
  };
}
