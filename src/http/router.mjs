import { readJsonBody, sendContent, sendJson } from './json.mjs';
import { AppError, NotFoundError, ValidationError } from '../core/errors.mjs';

const id = value => { if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) throw new ValidationError('Identifiant invalide.'); return value; };

export function createRouter({ artifacts = null, audits = null, publicAudits = null, dossiers = null, providers, prompts, ready = Promise.resolve(), templates = null, workflows, runs, simulation = null, internet = null }) {
  return async function route(request, response, url) {
    const parts = url.pathname.split('/').filter(Boolean); const method = request.method ?? 'GET';
    try {
      await ready;
      if (parts[0] !== 'api') throw new NotFoundError();
      if (parts[1] === 'intake' && parts[2] === 'dossiers' && parts.length === 3 && method === 'POST' && dossiers) {
        const body = await readJsonBody(request);
        return sendJson(response, 201, await dossiers.create(body, { source: 'local-public-intake' }));
      }
      if (parts[1] === 'dossiers' && dossiers) {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await dossiers.list());
        if (parts.length === 2 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await dossiers.create(body, { source: 'local-operator' })); }
        const dossierId = id(parts[2]);
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await dossiers.get(dossierId));
        if (parts[3] === 'open' && parts.length === 4 && method === 'POST') return sendJson(response, 200, await dossiers.open(dossierId));
        if (parts[3] === 'runs' && parts.length === 4 && method === 'POST' && simulation) { const body = await readJsonBody(request); return sendJson(response, 201, await simulation.startDossier(dossierId, { fault: body.fault ?? null })); }
        if (parts[3] === 'assets' && parts.length === 5 && method === 'GET') { const asset = await dossiers.readAsset(dossierId, decodeURIComponent(parts[4])); return sendContent(response, 200, asset.value, asset.type, { 'Content-Disposition': `inline; filename="${asset.name}"` }); }
      }
      if (parts[1] === 'providers') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await providers.list());
        const providerId = id(parts[2]);
        if (parts[3] === 'secret' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await providers.saveSecret(providerId, body.secret)); }
        if (parts[3] === 'secret' && method === 'DELETE') return sendJson(response, 200, await providers.deleteSecret(providerId));
        if (parts[3] === 'test' && method === 'POST') return sendJson(response, 200, await providers.testConnection(providerId));
        if (parts[3] === 'test-secret' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await providers.testConnection(providerId, { secretOverride: body.secret })); }
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
      if (parts[1] === 'workflows') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await workflows.list());
        const workflowId = id(parts[2]);
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await workflows.get(workflowId));
        if (parts[3] === 'draft' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await workflows.save(workflowId, body.definition, { expectedHash: body.expectedHash })); }
        if (parts[3] === 'versions' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await workflows.createVersion(workflowId, { expectedDraftHash: body.expectedDraftHash })); }
        if (parts[3] === 'activate' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await workflows.activate(workflowId, body.versionId)); }
      }
      if (parts[1] === 'templates' && templates) {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await templates.list());
        const templateId = id(parts[2]);
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await templates.get(templateId));
        if (parts[3] === 'draft' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await templates.save(templateId, body, { expectedHash: body.expectedHash })); }
        if (parts[3] === 'versions' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await templates.createVersion(templateId, { expectedDraftHash: body.expectedDraftHash })); }
        if (parts[3] === 'activate' && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 200, await templates.activate(templateId, body.versionId)); }
        if (parts.length === 3 && method === 'DELETE') return sendJson(response, 200, await templates.remove(templateId));
      }
      if (parts[1] === 'runs') {
        if (parts.length === 2 && method === 'GET') return sendJson(response, 200, await runs.list());
        if (parts.length === 2 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await runs.start(body.workflowId, body.input ?? {})); }
        if (parts.length === 4 && parts[3] === 'artifacts' && method === 'GET' && artifacts) return sendJson(response, 200, await artifacts.list(id(parts[2])));
        if (parts.length === 5 && parts[3] === 'artifacts' && method === 'GET' && artifacts) { const artifact = await artifacts.read(id(parts[2]), id(parts[4])); return sendContent(response, 200, artifact.value, artifact.contentType, { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:" }); }
        if (parts.length === 4 && parts[3] === 'decision' && method === 'PUT') { const body = await readJsonBody(request); return sendJson(response, 200, await runs.decide(id(parts[2]), body.decision)); }
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await runs.get(id(parts[2])));
        if (parts.length === 4 && parts[3] === 'events' && method === 'GET') return sendJson(response, 200, await runs.events(id(parts[2])));
        if (parts.length === 4 && parts[3] === 'resume' && method === 'POST') {
          const runId = id(parts[2]);
          const run = await runs.get(runId);
          const resumed = run.workflowId === simulation?.workflowId ? await simulation.resume(runId) : await runs.resume(runId);
          return sendJson(response, 200, resumed);
        }
      }
      if (parts[1] === 'internet' && parts[2] === 'search' && method === 'POST') { if (!internet) throw new AppError('Recherche Internet non configurée.', { code: 'INTERNET_NOT_CONFIGURED', status: 503 }); const body = await readJsonBody(request); return sendJson(response, 200, await internet(body)); }
      if (parts[1] === 'audits' && parts[2] === 'seo' && audits) {
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await audits.list());
        if (parts.length === 3 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await audits.create({ ...body, idempotencyKey: body.idempotencyKey ?? request.headers['idempotency-key'] })); }
        if (parts.length === 4 && method === 'GET') return sendJson(response, 200, await audits.get(id(parts[3])));
        if (parts.length === 5 && parts[4] === 'report' && method === 'GET') { const report = await audits.readReport(id(parts[3])); return sendContent(response, 200, report.value, report.contentType); }
      }
      if (parts[1] === 'audits' && parts[2] === 'local' && publicAudits) {
        if (parts.length === 3 && method === 'GET') return sendJson(response, 200, await publicAudits.list());
        if (parts.length === 3 && method === 'POST') { const body = await readJsonBody(request); return sendJson(response, 201, await publicAudits.create({ ...body, idempotencyKey: body.idempotencyKey ?? request.headers['idempotency-key'] })); }
        if (parts.length === 4 && method === 'GET') return sendJson(response, 200, await publicAudits.get(id(parts[3])));
      }
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
