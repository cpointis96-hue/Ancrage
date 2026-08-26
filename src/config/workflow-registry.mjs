import { NotFoundError, ValidationError } from '../core/errors.mjs';
import { assertResourceId } from '../core/ids.mjs';
import { validateWorkflowDefinition } from '../workflows/workflow-validator.mjs';

const INDEX_PATH = 'config/workflows/index.json';
const workflowPath = id => `config/workflows/${id}.json`;

export function createWorkflowRegistry({ store }) {
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
    return { ...definition, hash: store.hashText(text) };
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
    return { ...validated, hash: result.hash };
  }

  async function ensure(definition) {
    const current = await store.readText(workflowPath(definition.id), null);
    if (current === null) return save(definition.id, definition, { expectedHash: null });
    await ensureIndexed(definition.id);
    return get(definition.id);
  }

  return { ensure, get, list, save };
}
