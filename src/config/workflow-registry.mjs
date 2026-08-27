import { ConflictError, NotFoundError, ValidationError } from '../core/errors.mjs';
import { assertResourceId } from '../core/ids.mjs';
import { validateWorkflowDefinition } from '../workflows/workflow-validator.mjs';

const INDEX_PATH = 'config/workflows/index.json';
const workflowPath = id => `config/workflows/${id}.json`;
const manifestPath = id => `config/workflows/${id}/manifest.json`;
const versionPath = (id, versionId) => `config/workflows/${id}/versions/${versionId}.json`;

function versionStamp(date) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

export function createWorkflowRegistry({ store, clock = () => new Date() }) {
  async function ensureIndexed(id) {
    const currentText = await store.readText(INDEX_PATH, null);
    const current = currentText === null ? [] : JSON.parse(currentText);
    if (current.includes(id)) return;
    await store.writeJson(INDEX_PATH, [...current, id].sort(), { expectedHash: currentText === null ? null : store.hashText(currentText) });
  }

  async function get(id) {
    assertResourceId(id, 'workflowId');
    const text = await store.readText(workflowPath(id), null);
    if (text === null) throw new NotFoundError(`Workflow introuvable : ${id}`);
    const definition = validateWorkflowDefinition(JSON.parse(text));
    const manifest = await store.readJson(manifestPath(id), { activeVersionId: null, versions: [] });
    return { ...definition, hash: store.hashText(text), activeVersionId: manifest.activeVersionId, versions: manifest.versions ?? [] };
  }

  async function list() {
    const ids = await store.readJson(INDEX_PATH, []);
    const workflows = await Promise.all(ids.map(get));
    return workflows.sort((a, b) => a.id.localeCompare(b.id));
  }

  async function save(id, definition, { expectedHash } = {}) {
    assertResourceId(id, 'workflowId');
    if (!definition || typeof definition !== 'object' || definition.id !== id) throw new ValidationError('Définition de workflow invalide.');
    const validated = validateWorkflowDefinition(definition);
    const result = await store.writeJson(workflowPath(id), validated, { expectedHash });
    await ensureIndexed(id);
    const currentManifest = await store.readJson(manifestPath(id), null);
    if (!currentManifest) {
      await store.writeJson(manifestPath(id), { id, activeVersionId: null, versions: [], updatedAt: clock().toISOString() }, { expectedHash: null });
    } else {
      const currentText = await store.readText(manifestPath(id));
      await store.writeJson(manifestPath(id), { ...currentManifest, updatedAt: clock().toISOString() }, { expectedHash: store.hashText(currentText) });
    }
    return get(id);
  }

  async function createVersion(id, { expectedDraftHash }) {
    const workflow = await get(id);
    if (workflow.hash !== expectedDraftHash) throw new ConflictError(undefined, { currentHash: workflow.hash });
    for (const step of workflow.steps) {
      if (!step.contractRef) continue;
      const relativePath = step.contractRef.startsWith('contracts/') ? `config/${step.contractRef}` : `config/contracts/${step.contractRef}.schema.json`;
      if (await store.readText(relativePath, null) === null) throw new ValidationError(`Contrat introuvable : ${step.contractRef}`);
    }
    const definition = { ...workflow };
    delete definition.hash;
    delete definition.activeVersionId;
    delete definition.versions;
    const manifest = await store.readJson(manifestPath(id), { id, activeVersionId: null, versions: [] });
    const versionId = `v-${versionStamp(clock())}-${workflow.hash.slice(-8)}`;
    if (manifest.versions.some(version => version.id === versionId)) return manifest.versions.find(version => version.id === versionId);
    await store.writeJson(versionPath(id, versionId), definition, { immutable: true });
    const version = { id: versionId, hash: workflow.hash, createdAt: clock().toISOString() };
    const currentText = await store.readText(manifestPath(id), null);
    await store.writeJson(manifestPath(id), { ...manifest, versions: [...manifest.versions, version], updatedAt: clock().toISOString() }, { expectedHash: currentText === null ? null : store.hashText(currentText) });
    return version;
  }

  async function activate(id, versionId) {
    assertResourceId(versionId, 'versionId');
    const workflow = await get(id);
    if (!workflow.versions.some(version => version.id === versionId)) throw new NotFoundError(`Version introuvable : ${versionId}`);
    const manifest = await store.readJson(manifestPath(id));
    const currentText = await store.readText(manifestPath(id));
    await store.writeJson(manifestPath(id), { ...manifest, activeVersionId: versionId, activatedAt: clock().toISOString(), updatedAt: clock().toISOString() }, { expectedHash: store.hashText(currentText) });
    return get(id);
  }

  async function resolveActive(id) {
    const workflow = await get(id);
    if (!workflow.activeVersionId) throw new ConflictError(`Aucune version active pour le workflow : ${id}`);
    const version = workflow.versions.find(item => item.id === workflow.activeVersionId);
    const definition = validateWorkflowDefinition(await store.readJson(versionPath(id, workflow.activeVersionId)));
    return { definition, versionId: version.id, hash: version.hash };
  }

  async function ensure(definition) {
    const current = await store.readText(workflowPath(definition.id), null);
    if (current === null) await save(definition.id, definition, { expectedHash: null });
    await ensureIndexed(definition.id);
    const workflow = await get(definition.id);
    if (!workflow.activeVersionId) {
      const version = await createVersion(definition.id, { expectedDraftHash: workflow.hash });
      return activate(definition.id, version.id);
    }
    return workflow;
  }

  return { activate, createVersion, ensure, get, list, resolveActive, save };
}
