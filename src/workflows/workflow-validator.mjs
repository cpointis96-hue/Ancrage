import { WorkflowValidationError } from '../core/errors.mjs';

export function validateWorkflowDefinition(definition) {
  if (!definition || typeof definition !== 'object' || !Array.isArray(definition.steps) || !definition.id) throw new WorkflowValidationError('Workflow invalide.');
  const ids = new Set();
  for (const step of definition.steps) {
    if (!step.id || ids.has(step.id)) throw new WorkflowValidationError('Identifiant d’étape dupliqué.');
    ids.add(step.id);
    if (!Number.isInteger(step.timeoutMs) || step.timeoutMs < 100 || step.timeoutMs > 900000) throw new WorkflowValidationError('Timeout d’étape invalide.');
    if (typeof step.budget !== 'number' || step.budget < 0) throw new WorkflowValidationError('Budget d’étape invalide.');
    if (step.kind === 'ai' && !step.promptRef) throw new WorkflowValidationError('Prompt obligatoire pour une étape IA.');
    for (const dep of step.dependsOn ?? []) if (!definition.steps.some(candidate => candidate.id === dep)) throw new WorkflowValidationError('Dépendance absente.');
    for (const output of step.outputRefs ?? []) if (definition.steps.some(candidate => candidate !== step && (candidate.outputRefs ?? []).includes(output))) throw new WorkflowValidationError('Sortie ambiguë.');
  }
  const visiting = new Set(); const visited = new Set();
  function visit(id) { if (visiting.has(id)) throw new WorkflowValidationError('Cycle détecté.'); if (visited.has(id)) return; visiting.add(id); const step = definition.steps.find(item => item.id === id); for (const dep of step.dependsOn ?? []) visit(dep); visiting.delete(id); visited.add(id); }
  for (const step of definition.steps) visit(step.id);
  return definition;
}
