import { api } from './api.mjs';
import { icon } from './icons.mjs';

const views = [
  { id: 'inbox', label: 'À traiter', icon: 'inbox', group: 'ops' },
  { id: 'runs', label: 'Runs', icon: 'runs', group: 'ops' },
  { id: 'dossiers', label: 'Dossiers', icon: 'dossiers', group: 'ops' },
  { id: 'configuration', label: 'Configuration', icon: 'config', group: 'control' },
  { id: 'providers', label: 'Providers', icon: 'providers', group: 'control' },
  { id: 'internet', label: 'Internet', icon: 'internet', group: 'control' },
];

const state = {
  view: 'inbox',
  selected: {},
  runTab: 'overview',
  dossierTab: 'identity',
  configurationTab: 'workflows',
  configurationCreating: null,
  configurationDraft: null,
  internetQuery: '',
  internetResult: null,
  internetConfigOpen: false,
};

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const list = $('#list');
const detail = $('#detail');
let toastTimer;
let renderQueue = Promise.resolve();

function notify(message) {
  clearTimeout(toastTimer);
  $('#status').textContent = message;
  $('#status').classList.toggle('visible', Boolean(message));
  if (message) toastTimer = setTimeout(() => $('#status').classList.remove('visible'), 4200);
}

function renderNav() {
  for (const group of ['ops', 'control']) {
    const root = $(`#${group}-nav`);
    root.innerHTML = views.filter(view => view.group === group).map(view => `
      <button class="nav-item ${state.view === view.id ? 'active' : ''}" type="button" aria-label="${esc(view.label)}" data-view="${view.id}" ${state.view === view.id ? 'aria-current="page"' : ''}>
        <span class="nav-icon">${icon(view.icon)}</span><span class="nav-label">${view.label}</span>
      </button>`).join('');
  }
}

function badge(value) {
  const label = statusLabel(value);
  return `<span class="badge ${statusTone(value)}"><span class="state-dot" aria-hidden="true"></span>${esc(label)}</span>`;
}

function statusTone(value) {
  if (['SUCCEEDED', 'PASS', 'APPROVED', 'healthy', 'INTAKE_COMPLETE'].includes(value)) return 'pass';
  if (['FAILED', 'BLOCKED', 'CHANGES_REQUESTED', 'unhealthy'].includes(value)) return 'block';
  if (['RUNNING', 'WAITING_FOR_APPROVAL'].includes(value)) return 'active';
  return 'warn';
}

function statusLabel(value) {
  return ({
    SUCCEEDED: 'Terminé', FAILED: 'Échec', BLOCKED: 'Bloqué', RUNNING: 'En cours',
    APPROVED: 'Validé', CHANGES_REQUESTED: 'Corrections', INTAKE_COMPLETE: 'Complet',
    healthy: 'Testé', unhealthy: 'Erreur', unknown: 'Non testé', PASS: 'PASS', WARN: 'WARN',
  })[value] ?? value ?? 'Inconnu';
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function listHeader(title, action = '') {
  return `<header class="list-header"><h1>${esc(title)}</h1>${action}</header>`;
}

function emptyState(title, text, action = '') {
  return `<section class="empty-state"><h2>${esc(title)}</h2><p>${esc(text)}</p>${action}</section>`;
}

function iconControl(label, name, attributes = '') {
  return `<button class="icon-control" type="button" aria-label="${esc(label)}" title="${esc(label)}" ${attributes}>${icon(name)}</button>`;
}

function bindAll(selector, handler) {
  document.querySelectorAll(selector).forEach(element => element.addEventListener('click', event => handler(event.currentTarget, event)));
}

async function perform(button, operation, successMessage = '') {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const value = await operation();
    if (successMessage) notify(successMessage);
    return { ok: true, value };
  } catch (error) {
    notify(error.message);
    return { ok: false, value: null };
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function loading() {
  list.innerHTML = '<div class="loading-line"></div><div class="loading-line short"></div>';
  detail.innerHTML = '<div class="detail-inner"><div class="loading-line"></div><div class="loading-panel"></div></div>';
}

function showError(error) {
  list.innerHTML = listHeader(views.find(view => view.id === state.view)?.label ?? 'Ancrage');
  detail.innerHTML = emptyState('Impossible de charger cette vue', error.message, '<button class="btn primary" type="button" data-retry>Réessayer</button>');
  $('[data-retry]')?.addEventListener('click', render);
}

async function go(view, selectedId = null) {
  state.view = view;
  if (selectedId) state.selected[view] = selectedId;
  await render();
  detail.focus({ preventScroll: true });
}

function latestRunsByDossier(runs) {
  const result = new Map();
  [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).forEach(run => {
    if (run.input?.dossierId && !result.has(run.input.dossierId)) result.set(run.input.dossierId, run);
  });
  return result;
}

function dossierName(run, dossiers) {
  return dossiers.find(item => item.id === run.input?.dossierId)?.name ?? run.workflowId;
}

function inboxDescriptor(dossier, run) {
  if (!run) return { action: 'Préparer le site', phase: 'Dossier reçu', status: 'WARN', kind: 'start' };
  if (run.status === 'FAILED' || run.status === 'BLOCKED') return { action: 'Voir les corrections', phase: 'Run interrompu', status: run.status, kind: 'run' };
  if (run.operatorDecision?.decision === 'CHANGES_REQUESTED') return { action: 'Voir les corrections', phase: 'Corrections demandées', status: 'CHANGES_REQUESTED', kind: 'run' };
  if (run.status === 'SUCCEEDED' && !run.operatorDecision) return { action: 'Vérifier les artefacts', phase: 'Validation finale', status: 'WARN', kind: 'run' };
  if (run.status === 'RUNNING') return { action: 'Suivre le run', phase: 'Création en cours', status: 'RUNNING', kind: 'run' };
  return null;
}

async function renderInbox() {
  const [dossiers, runs] = await Promise.all([api.dossiers(), api.runs()]);
  const latest = latestRunsByDossier(runs);
  const items = dossiers.map(dossier => ({ dossier, run: latest.get(dossier.id) ?? null })).map(item => ({ ...item, descriptor: inboxDescriptor(item.dossier, item.run) })).filter(item => item.descriptor);
  list.innerHTML = listHeader('À traiter') + (items.length ? items.map(item => `
    <button class="list-row ${state.selected.inbox === item.dossier.id ? 'active' : ''}" type="button" data-inbox-select="${item.dossier.id}">
      <span class="row-top"><strong>${esc(item.dossier.name)}</strong>${badge(item.descriptor.status)}</span>
      <span class="row-meta">${esc(item.descriptor.action)}</span>
    </button>`).join('') : '<p class="list-empty">Aucune décision en attente.</p>');
  if (!items.length) {
    detail.innerHTML = emptyState('Tout est à jour', 'Un nouveau dossier apparaîtra ici dès que l’intake aura été validé.', '<a class="btn primary" href="/intake.html" target="_blank" rel="noopener">Ouvrir l’intake</a>');
    return;
  }
  const selected = items.find(item => item.dossier.id === state.selected.inbox) ?? items[0];
  state.selected.inbox = selected.dossier.id;
  document.querySelector(`[data-inbox-select="${selected.dossier.id}"]`)?.classList.add('active');
  const checks = selected.run ? selected.run.steps.map(step => ({ label: step.id, status: step.status })) : [
    { label: 'Histoire', status: selected.dossier.hasStory ? 'PASS' : 'WARN' },
    { label: 'Menu', status: selected.dossier.menuItemCount ? 'PASS' : 'WARN' },
    { label: 'Image', status: selected.dossier.assetCount ? 'PASS' : 'WARN' },
  ];
  detail.innerHTML = `<div class="detail-inner">
    <header class="inspect-head">
      <div><h2>${esc(selected.dossier.name)}</h2><p>${esc(selected.descriptor.phase)}</p></div>
      <div class="detail-actions inbox-actions">
        <button class="btn primary ${selected.descriptor.action === 'Voir les corrections' ? 'corrections' : ''}" type="button" data-inbox-action="${selected.descriptor.kind}">${esc(selected.descriptor.action)}</button>
        ${iconControl('Ouvrir le dossier', 'folder', `data-open-dossier="${selected.dossier.id}"`)}
      </div>
    </header>
    <section class="panel"><div class="section-label">À faire</div><strong>${esc(selected.descriptor.action)}</strong></section>
    <section class="panel"><div class="section-label">État vérifié</div>${checks.map(check => `<div class="step-row"><span>${esc(check.label)}</span>${badge(check.status)}</div>`).join('')}</section>
  </div>`;
  bindAll('[data-inbox-select]', button => { state.selected.inbox = button.dataset.inboxSelect; render(); });
  $('[data-inbox-action]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    if (button.dataset.inboxAction === 'start') {
      const result = await perform(button, () => api.startDossierRun(selected.dossier.id), 'Création lancée.');
      if (result.ok) await go('runs', result.value.id);
    } else await go('runs', selected.run.id);
  });
  bindOpenDossier();
}

function bindOpenDossier() {
  bindAll('[data-open-dossier]', button => perform(button, () => api.openDossier(button.dataset.openDossier), 'Dossier ouvert dans Finder.'));
}

async function renderRuns() {
  const [rawRuns, dossiers] = await Promise.all([api.runs(), api.dossiers()]);
  const runs = [...rawRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  list.innerHTML = listHeader('Runs') + (runs.length ? `<label class="search-field"><span class="sr-only">Rechercher un run</span>${icon('search')}<input type="search" placeholder="Rechercher" data-run-search></label><div class="section-label">Exécutions</div>${runs.map(run => `
    <button class="list-row ${state.selected.runs === run.id ? 'active' : ''}" type="button" data-run-select="${run.id}" data-search-value="${esc(`${run.id} ${dossierName(run, dossiers)} ${run.workflowId}`.toLowerCase())}">
      <span class="row-top"><strong>${esc(dossierName(run, dossiers))}</strong>${badge(run.status)}</span>
      <span class="row-meta">${esc(run.workflowId)} · ${formatDate(run.updatedAt)}</span>
    </button>`).join('')}` : '<p class="list-empty">Aucun run enregistré.</p>');
  if (!runs.length) {
    detail.innerHTML = emptyState('Aucune exécution', 'Lancez la création depuis un dossier prêt.');
    return;
  }
  const run = runs.find(item => item.id === state.selected.runs) ?? runs[0];
  state.selected.runs = run.id;
  document.querySelector(`[data-run-select="${run.id}"]`)?.classList.add('active');
  const dossier = dossiers.find(item => item.id === run.input?.dossierId) ?? null;
  const artifacts = await api.artifacts(run.id).catch(() => []);
  const site = artifacts.find(item => item.kind === 'site');
  const report = artifacts.find(item => item.kind === 'report');
  const events = state.runTab === 'journal' ? await api.events(run.id).catch(() => []) : [];
  const checkpoint = [...run.steps].reverse().find(step => step.status === 'SUCCEEDED');
  const failedAttempt = [...run.attempts].reverse().find(attempt => attempt.status === 'FAILED');
  const runActions = [];
  if (['FAILED', 'BLOCKED'].includes(run.status)) runActions.push('<button class="btn primary" type="button" data-resume-run>Reprendre</button>');
  if (run.workflowId === 'client-site-simulation' && run.status === 'SUCCEEDED' && !run.operatorDecision) {
    runActions.push('<button class="btn primary" type="button" data-run-decision="APPROVED">Valider</button>');
    runActions.push('<button class="btn" type="button" data-run-decision="CHANGES_REQUESTED">Renvoyer en correction</button>');
  }
  if (run.operatorDecision?.decision === 'CHANGES_REQUESTED' && dossier) runActions.push('<button class="btn primary" type="button" data-rerun-dossier>Relancer après correction</button>');
  if (run.operatorDecision?.decision === 'APPROVED' && site) runActions.push(`<a class="btn primary" href="${esc(site.href)}" target="_blank" rel="noopener">Voir le site</a>`);
  if (dossier) runActions.push(iconControl('Ouvrir le dossier', 'folder', `data-open-dossier="${dossier.id}"`));
  const runTabs = [['overview', 'Vue'], ['steps', 'Étapes'], ['proofs', 'Preuves'], ['versions', 'Versions'], ['journal', 'Journal']];
  const snapshotRows = run.snapshot.steps.map(step => `<div class="snapshot-step"><strong>${esc(step.id)}</strong>${step.promptRef ? `<small>Prompt : ${esc(step.promptRef)} · ${esc(step.promptVersionId)}</small><small>Modèle : ${esc(step.model)}</small>` : '<small>Étape déterministe</small>'}${step.contractRef ? `<small>Contrat : ${esc(step.contractRef)}</small>` : ''}</div>`).join('');
  const progress = `<section class="panel"><div class="section-label">Progression</div>${run.snapshot.steps.map(snapshot => {
    const step = run.steps.find(item => item.id === snapshot.id);
    return `<div class="step-row"><span><strong>${esc(snapshot.id)}</strong>${failedAttempt?.stepId === snapshot.id ? `<small>Échec précédent · ${esc(failedAttempt.errorCode)}</small>` : ''}</span>${badge(step?.status ?? 'EN ATTENTE')}</div>`;
  }).join('')}</section>`;
  const runBody = state.runTab === 'steps' ? progress : state.runTab === 'proofs' ? `<section class="panel"><div class="section-label">Artefacts</div>${artifacts.length ? `<div class="artifact-links">${site ? `<a href="${esc(site.href)}" target="_blank" rel="noopener">Voir le site ${icon('external')}</a>` : ''}${report ? `<a href="${esc(report.href)}" target="_blank" rel="noopener">Voir le rapport ${icon('external')}</a>` : ''}</div>` : '<p class="muted">Aucun artefact disponible pour ce run.</p>'}</section><section class="panel"><div class="section-label">Dossier source</div><p>${dossier ? `${esc(dossier.name)} · ${esc(dossier.city)} · ${dossier.assetCount} média` : 'Dossier introuvable.'}</p></section>` : state.runTab === 'versions' ? `<section class="panel"><div class="section-label">Configuration figée pour ce run</div><div class="snapshot-head"><span><small>Workflow</small><strong>${esc(run.workflowId)}</strong></span><span><small>Version active</small><strong>${esc(run.snapshot.workflowVersionId ?? run.snapshot.workflowVersion)}</strong></span><span><small>Hash</small><strong>${esc(run.snapshot.workflowHash ?? 'Ancien run sans hash')}</strong></span></div>${snapshotRows}</section>` : state.runTab === 'journal' ? `<section class="panel"><div class="section-label">Journal</div>${events.length ? events.map(event => `<div class="event-row"><span>${formatDate(event.at)}</span><strong>${esc(event.type)}</strong><small>${esc(event.stepId ?? event.decision ?? '')}</small></div>`).join('') : '<p class="muted">Aucun événement enregistré.</p>'}</section>` : `<section class="preview-card"><div class="preview-matter" aria-hidden="true"></div><div class="preview-copy"><span>Site démo</span><strong>${esc(dossier?.name ?? run.workflowId)}</strong><small>${esc(run.workflowId)} · ${run.status === 'SUCCEEDED' ? 'Aperçu prêt' : 'Aperçu en préparation'}</small></div></section><section class="facts">
      <div class="fact"><small>État</small><strong>${badge(run.status)}</strong></div>
      <div class="fact"><small>Checkpoint fiable</small><strong>${esc(checkpoint?.id ?? 'Aucun')}</strong></div>
      <div class="fact"><small>Tentatives</small><strong>${run.attempts.length}</strong></div>
      <div class="fact"><small>Décision</small><strong>${run.operatorDecision ? badge(run.operatorDecision.decision) : 'À prendre'}</strong></div>
    </section>${progress}`;
  detail.innerHTML = `<div class="detail-inner">
    <header class="inspect-head"><div><div class="eyebrow">Run · ${esc(run.id)}</div><h2>${esc(dossier?.name ?? run.workflowId)}</h2><p>${esc(run.workflowId)}</p></div><div class="detail-actions">${runActions.join('')}</div></header>
    <nav class="tabs" aria-label="Sections du run">${runTabs.map(([id, label]) => `<button class="${state.runTab === id ? 'active' : ''}" type="button" data-run-tab="${id}">${label}</button>`).join('')}</nav>
    ${runBody}
  </div>`;
  bindAll('[data-run-tab]', button => { state.runTab = button.dataset.runTab; render(); });
  bindAll('[data-run-select]', button => { state.selected.runs = button.dataset.runSelect; state.runTab = 'overview'; render(); });
  $('[data-run-search]')?.addEventListener('input', event => {
    const query = event.currentTarget.value.trim().toLowerCase();
    document.querySelectorAll('[data-search-value]').forEach(row => { row.hidden = !row.dataset.searchValue.includes(query); });
  });
  $('[data-resume-run]')?.addEventListener('click', async event => {
    const result = await perform(event.currentTarget, () => api.resumeRun(run.id), 'Run repris depuis le dernier checkpoint.');
    if (result.ok) await render();
  });
  bindAll('[data-run-decision]', async button => {
    const decision = button.dataset.runDecision;
    if (decision === 'APPROVED' && !window.confirm('Valider ces artefacts pour la suite du parcours ?')) return;
    const result = await perform(button, () => api.decideRun(run.id, decision), decision === 'APPROVED' ? 'Run validé.' : 'Corrections demandées.');
    if (result.ok) await render();
  });
  $('[data-rerun-dossier]')?.addEventListener('click', async event => {
    const result = await perform(event.currentTarget, () => api.startDossierRun(dossier.id), 'Nouveau run lancé.');
    if (result.ok) { state.selected.runs = result.value.id; await render(); }
  });
  bindOpenDossier();
}

async function renderDossiers() {
  const [dossiers, runs] = await Promise.all([api.dossiers(), api.runs()]);
  const intakeAction = `<a class="icon-control" href="/intake.html" target="_blank" rel="noopener" aria-label="Ouvrir l’intake" title="Ouvrir l’intake">${icon('plus')}</a>`;
  list.innerHTML = listHeader('Dossiers', intakeAction) + (dossiers.length ? `<label class="search-field"><span class="sr-only">Rechercher un dossier</span>${icon('search')}<input type="search" placeholder="Rechercher" data-dossier-search></label><div class="section-label">Dossiers suivis</div>${dossiers.map(dossier => `
    <button class="list-row ${state.selected.dossiers === dossier.id ? 'active' : ''}" type="button" data-dossier-select="${dossier.id}" data-search-value="${esc(`${dossier.name} ${dossier.city}`.toLowerCase())}">
      <span class="row-top"><strong>${esc(dossier.name)}</strong>${badge(dossier.status)}</span>
      <span class="row-meta">${esc(dossier.city)} · ${dossier.assetCount} média</span>
    </button>`).join('')}` : '<p class="list-empty">Aucun dossier reçu.</p>');
  if (!dossiers.length) {
    detail.innerHTML = emptyState('Aucun dossier', 'Validez un intake pour créer le premier dossier local.', '<a class="btn primary" href="/intake.html" target="_blank" rel="noopener">Ouvrir l’intake</a>');
    return;
  }
  const summary = dossiers.find(item => item.id === state.selected.dossiers) ?? dossiers[0];
  state.selected.dossiers = summary.id;
  document.querySelector(`[data-dossier-select="${summary.id}"]`)?.classList.add('active');
  const dossier = await api.dossier(summary.id);
  const latest = [...runs].filter(run => run.input?.dossierId === dossier.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  const primary = latest ? `<button class="btn primary" type="button" data-open-run="${latest.id}">Voir le run</button>` : '<button class="btn primary" type="button" data-start-dossier>Lancer la création</button>';
  const tabs = [['identity', 'Identité'], ['story', 'Histoire'], ['menu', 'Menu'], ['media', 'Médias']];
  let body;
  if (state.dossierTab === 'story') body = `<section class="panel"><div class="section-label">Texte fourni</div><p class="preserve">${esc(dossier.story || 'Aucune histoire fournie.')}</p></section>`;
  else if (state.dossierTab === 'menu') body = `<section class="panel"><div class="section-label">Menu fourni</div>${dossier.menu.length ? dossier.menu.map(item => `<div class="menu-row"><span><strong>${esc(item.name)}</strong>${item.description ? `<small>${esc(item.description)}</small>` : ''}</span><span>${item.price === null ? '—' : esc(item.price)}</span></div>`).join('') : '<p class="muted">Aucun plat fourni.</p>'}</section>`;
  else if (state.dossierTab === 'media') body = `<section class="panel"><div class="section-label">Médias reçus</div>${dossier.assets.length ? `<div class="media-grid">${dossier.assets.map(asset => `<figure><img src="/api/dossiers/${dossier.id}/assets/${encodeURIComponent(asset.name)}" alt="${esc(asset.alt || dossier.name)}"><figcaption>${esc(asset.name)} · ${Math.ceil(asset.size / 1024)} Ko</figcaption></figure>`).join('')}</div>` : '<p class="muted">Aucun média fourni.</p>'}</section>`;
  else body = `<section class="facts"><div class="fact"><small>Ville</small><strong>${esc(dossier.city)}</strong></div><div class="fact"><small>Pays</small><strong>${esc(dossier.country || '—')}</strong></div><div class="fact"><small>Source</small><strong>${esc(dossier.source)}</strong></div><div class="fact"><small>Dernier run</small><strong>${latest ? badge(latest.status) : 'Non lancé'}</strong></div></section><section class="panel"><div class="section-label">Adresse</div><p>${esc(dossier.address || 'Non fournie')}</p></section>`;
  detail.innerHTML = `<div class="detail-inner">
    <header class="inspect-head"><div><div class="eyebrow">Dossier · identité et contenu</div><h2>${esc(dossier.name)}</h2><p>${esc(dossier.city)}</p></div><div class="detail-actions">${primary}${iconControl('Ouvrir le dossier', 'folder', `data-open-dossier="${dossier.id}"`)}</div></header>
    <nav class="tabs" aria-label="Sections du dossier">${tabs.map(([id, label]) => `<button class="${state.dossierTab === id ? 'active' : ''}" type="button" data-dossier-tab="${id}">${label}</button>`).join('')}</nav>
    ${body}
  </div>`;
  bindAll('[data-dossier-select]', button => { state.selected.dossiers = button.dataset.dossierSelect; state.dossierTab = 'identity'; render(); });
  bindAll('[data-dossier-tab]', button => { state.dossierTab = button.dataset.dossierTab; render(); });
  $('[data-dossier-search]')?.addEventListener('input', event => {
    const query = event.currentTarget.value.trim().toLowerCase();
    document.querySelectorAll('[data-search-value]').forEach(row => { row.hidden = !row.dataset.searchValue.includes(query); });
  });
  $('[data-open-run]')?.addEventListener('click', event => go('runs', event.currentTarget.dataset.openRun));
  $('[data-start-dossier]')?.addEventListener('click', async event => {
    const result = await perform(event.currentTarget, () => api.startDossierRun(dossier.id), 'Création lancée.');
    if (result.ok) await go('runs', result.value.id);
  });
  bindOpenDossier();
}

const csv = value => String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);

function promptBody(markdown) {
  const closing = markdown.indexOf('\n---\n', 4);
  return closing < 0 ? markdown : markdown.slice(closing + 5).trim();
}

function promptMarkdown({ id, name, ownerStep, outputContract, body }) {
  return `---\nid: ${id}\nname: ${name}\nownerStep: ${ownerStep}\noutputContract: ${outputContract}\n---\n${body.trim()}\n`;
}

function workflowStepEditor(step, index, prompts) {
  const option = (value, label) => `<option value="${value}" ${step.kind === value ? 'selected' : ''}>${label}</option>`;
  return `<section class="workflow-editor-step" data-workflow-step>
    <header><strong>Étape ${index + 1}</strong>${iconControl(`Supprimer l’étape ${index + 1}`, 'trash', 'data-remove-workflow-step')}</header>
    <div class="form-grid">
      <label class="field"><span>Identifiant</span><input value="${esc(step.id ?? '')}" data-step-field="id" placeholder="analyse"></label>
      <label class="field"><span>Type</span><select data-step-field="kind">${option('deterministic', 'Déterministe')}${option('ai', 'IA')}</select></label>
      <label class="field span-2"><span>Implémentation</span><input value="${esc(step.implementation ?? '')}" data-step-field="implementation" placeholder="nom-de-l-implementation"></label>
      <label class="field"><span>Dépend de</span><input value="${esc((step.dependsOn ?? []).join(', '))}" data-step-field="dependsOn" placeholder="étape-précédente"></label>
      <label class="field"><span>Entrées reçues</span><input value="${esc((step.inputRefs ?? []).join(', '))}" data-step-field="inputRefs" placeholder="étape-précédente"></label>
      <label class="field span-2"><span>Sorties produites</span><input value="${esc((step.outputRefs ?? []).join(', '))}" data-step-field="outputRefs" placeholder="rapport, preuves"></label>
      <label class="field"><span>Prompt si étape IA</span><select data-step-field="promptRef"><option value="">Aucun</option>${prompts.map(prompt => `<option value="${esc(prompt.id)}" ${step.promptRef === prompt.id ? 'selected' : ''}>${esc(prompt.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Modèle si étape IA</span><input value="${esc(step.model ?? '')}" data-step-field="model" placeholder="Modèle choisi"></label>
      <label class="field span-2"><span>Contrat de sortie</span><input value="${esc(step.contractRef ?? '')}" data-step-field="contractRef" placeholder="copy-draft"></label>
      <label class="field"><span>Timeout en ms</span><input type="number" min="100" max="900000" value="${esc(step.timeoutMs ?? 1000)}" data-step-field="timeoutMs"></label>
      <label class="field"><span>Budget maximum</span><input type="number" min="0" step="0.01" value="${esc(step.budget ?? 0)}" data-step-field="budget"></label>
    </div>
  </section>`;
}

function readWorkflowForm() {
  const steps = [...document.querySelectorAll('[data-workflow-step]')].map((row, index) => {
    const value = name => row.querySelector(`[data-step-field="${name}"]`).value.trim();
    const step = {
      id: value('id'), kind: value('kind'), trigger: index === 0 ? 'start' : 'ready',
      dependsOn: csv(value('dependsOn')), inputRefs: csv(value('inputRefs')), outputRefs: csv(value('outputRefs')),
      implementation: value('implementation'), timeoutMs: Number(value('timeoutMs')), budget: Number(value('budget')), approval: 'none',
    };
    if (value('promptRef')) step.promptRef = value('promptRef');
    if (value('model')) step.model = value('model');
    if (value('contractRef')) step.contractRef = value('contractRef');
    return step;
  });
  return { id: $('[data-workflow-id]').value.trim(), name: $('[data-workflow-name]').value.trim(), version: Number($('[data-workflow-version]').value), steps };
}

async function renderConfiguration() {
  const [workflows, prompts] = await Promise.all([api.workflows(), api.prompts()]);
  const tabItems = state.configurationTab === 'workflows' ? workflows : prompts;
  const creating = state.configurationCreating === state.configurationTab;
  const selectedId = creating ? null : (tabItems.some(item => item.id === state.selected.configuration) ? state.selected.configuration : tabItems[0]?.id);
  state.selected.configuration = selectedId;
  const createLabel = state.configurationTab === 'workflows' ? 'Créer un workflow' : 'Créer un prompt';
  list.innerHTML = listHeader('Configuration', iconControl(createLabel, 'plus', 'data-new-configuration')) + `<nav class="tabs list-tabs" aria-label="Type de configuration"><button class="${state.configurationTab === 'workflows' ? 'active' : ''}" type="button" data-configuration-tab="workflows">Workflows</button><button class="${state.configurationTab === 'prompts' ? 'active' : ''}" type="button" data-configuration-tab="prompts">Prompts</button></nav><div class="section-label">${state.configurationTab === 'workflows' ? 'Workflows' : 'Prompts'}</div>${tabItems.map(item => `
    <button class="list-row ${item.id === selectedId ? 'active' : ''}" type="button" data-configuration-select="${item.id}">
      <span class="row-top"><strong>${esc(item.name ?? item.id)}</strong>${state.configurationTab === 'workflows' ? `<span class="row-count">${item.steps.length}</span>` : ''}</span>
      <span class="row-meta">${state.configurationTab === 'prompts' ? `Étape ${esc(item.ownerStep)}` : `${item.steps.length} étapes`}</span>
    </button>`).join('')}`;

  if (state.configurationTab === 'workflows') {
    const source = creating ? { id: '', name: '', version: 1, hash: null, activeVersionId: null, versions: [], steps: [{ id: 'premiere-etape', kind: 'deterministic', dependsOn: [], inputRefs: [], outputRefs: ['resultat'], implementation: '', timeoutMs: 1000, budget: 0 }] } : workflows.find(item => item.id === selectedId);
    if (!source) { detail.innerHTML = emptyState('Aucun workflow', 'Créez le premier workflow pour définir ses étapes.'); }
    else {
      const workflow = state.configurationDraft ?? source;
      const action = `<button class="btn primary" type="button" data-save-workflow>Enregistrer</button>${creating ? '' : iconControl('Créer une version', 'versions', 'data-version-workflow')}`;
      const workflowAction = !creating && workflow.id === 'domain-research' ? '<button class="btn" type="button" data-open-internet>Ouvrir Internet</button>' : '';
      detail.innerHTML = `<div class="detail-inner"><header class="inspect-head"><div><div class="eyebrow">Workflow</div><h2>${creating ? 'Nouveau workflow' : esc(workflow.name || workflow.id)}</h2><p>${creating ? 'Définissez les étapes dans leur ordre d’exécution.' : `config/workflows/${esc(workflow.id)}.json`}</p></div><div class="detail-actions">${action}</div></header>
        <section class="panel"><div class="form-grid"><label class="field"><span>Identifiant</span><input value="${esc(workflow.id)}" data-workflow-id ${creating ? '' : 'readonly'}></label><label class="field"><span>Nom</span><input value="${esc(workflow.name ?? '')}" data-workflow-name></label><label class="field"><span>Version du fichier</span><input type="number" min="1" value="${esc(workflow.version ?? 1)}" data-workflow-version></label></div></section>
        <div class="workflow-editor">${workflow.steps.map((step, index) => workflowStepEditor(step, index, prompts)).join('')}</div>
        <button class="btn" type="button" data-add-workflow-step>${icon('plus')} Ajouter une étape</button>
        ${creating ? '' : `<section class="panel"><div class="section-label">Versions</div>${workflow.versions.length ? [...workflow.versions].reverse().map(version => `<div class="version-row"><span><strong>${esc(version.id)}</strong><small>${formatDate(version.createdAt)}</small></span>${workflow.activeVersionId === version.id ? '<span class="version-active">Version utilisée par les futurs runs</span>' : `<button class="btn compact" type="button" data-activate-workflow="${version.id}">Activer</button>`}</div>`).join('') : '<p class="muted">Enregistrez puis créez une première version.</p>'}</section>${workflowAction ? `<section class="panel"><div class="detail-actions left">${workflowAction}</div></section>` : ''}`}
      </div>`;
      $('[data-add-workflow-step]')?.addEventListener('click', () => { const draft = readWorkflowForm(); draft.steps.push({ id: `etape-${draft.steps.length + 1}`, kind: 'deterministic', dependsOn: draft.steps.length ? [draft.steps.at(-1).id] : [], inputRefs: draft.steps.length ? [draft.steps.at(-1).id] : [], outputRefs: ['resultat'], implementation: '', timeoutMs: 1000, budget: 0 }); state.configurationDraft = draft; render(); });
      bindAll('[data-remove-workflow-step]', button => { const draft = readWorkflowForm(); const index = [...document.querySelectorAll('[data-remove-workflow-step]')].indexOf(button); draft.steps.splice(index, 1); state.configurationDraft = draft; render(); });
      $('[data-save-workflow]')?.addEventListener('click', async event => {
        const definition = readWorkflowForm();
        const result = await perform(event.currentTarget, () => api.saveWorkflow(definition.id, definition, creating ? null : source.hash), 'Workflow enregistré sur disque.');
        if (result.ok) { state.configurationCreating = null; state.configurationDraft = null; state.selected.configuration = definition.id; await render(); }
      });
      $('[data-version-workflow]')?.addEventListener('click', async event => {
        const definition = readWorkflowForm();
        const result = await perform(event.currentTarget, async () => { const saved = await api.saveWorkflow(definition.id, definition, source.hash); return api.createWorkflowVersion(definition.id, saved.hash); }, 'Version immuable créée.');
        if (result.ok) { state.configurationDraft = null; await render(); }
      });
      bindAll('[data-activate-workflow]', async button => { if (!window.confirm('Utiliser cette version pour les futurs runs ?')) return; const result = await perform(button, () => api.activateWorkflow(source.id, button.dataset.activateWorkflow), 'Version activée.'); if (result.ok) await render(); });
      $('[data-open-internet]')?.addEventListener('click', () => go('internet'));
    }
  } else {
    const prompt = creating ? { id: '', name: '', ownerStep: '', outputContract: '', markdown: '', draftHash: null, activeVersionId: null, versions: [] } : (selectedId ? await api.getPrompt(selectedId) : null);
    if (!prompt) detail.innerHTML = emptyState('Aucun prompt', 'Créez le premier prompt pour écrire ses instructions.');
    else {
      detail.innerHTML = `<div class="detail-inner"><header class="inspect-head"><div><div class="eyebrow">Prompt</div><h2>${creating ? 'Nouveau prompt' : esc(prompt.name)}</h2><p>${creating ? 'Le prompt sera enregistré comme fichier Markdown.' : `config/prompts/${esc(prompt.id)}/draft.md`}</p></div><div class="detail-actions"><button class="btn primary" type="button" data-save-prompt>Enregistrer</button>${creating ? '' : iconControl('Créer une version', 'versions', 'data-version-prompt')}</div></header>
        <section class="panel"><div class="form-grid"><label class="field"><span>Identifiant</span><input value="${esc(prompt.id)}" data-prompt-id ${creating ? '' : 'readonly'}></label><label class="field"><span>Nom</span><input value="${esc(prompt.name)}" data-prompt-name></label><label class="field"><span>Étape propriétaire</span><input value="${esc(prompt.ownerStep)}" data-prompt-owner placeholder="analyse"></label><label class="field"><span>Contrat de sortie</span><input value="${esc(prompt.outputContract)}" data-prompt-contract placeholder="audit-report"></label><label class="field span-2"><span>Instructions</span><textarea data-prompt-body>${esc(promptBody(prompt.markdown))}</textarea></label></div></section>
        ${creating ? '' : `<section class="panel"><div class="section-label">Versions</div>${prompt.versions.length ? [...prompt.versions].reverse().map(version => `<div class="version-row"><span><strong>${esc(version.id)}</strong><small>${formatDate(version.createdAt)}</small></span>${prompt.activeVersionId === version.id ? '<span class="version-active">Version utilisée par les futurs runs</span>' : `<button class="btn compact" type="button" data-activate-version="${version.id}">Activer</button>`}</div>`).join('') : '<p class="muted">Enregistrez puis créez une première version.</p>'}</section>`}
      </div>`;
      const readPrompt = () => promptMarkdown({ id: $('[data-prompt-id]').value.trim(), name: $('[data-prompt-name]').value.trim(), ownerStep: $('[data-prompt-owner]').value.trim(), outputContract: $('[data-prompt-contract]').value.trim(), body: $('[data-prompt-body]').value });
      $('[data-save-prompt]')?.addEventListener('click', async event => { const id = $('[data-prompt-id]').value.trim(); const result = await perform(event.currentTarget, () => api.savePrompt(id, readPrompt(), creating ? null : prompt.draftHash), 'Prompt enregistré sur disque.'); if (result.ok) { state.configurationCreating = null; state.selected.configuration = id; await render(); } });
      $('[data-version-prompt]')?.addEventListener('click', async event => { const markdown = readPrompt(); const result = await perform(event.currentTarget, async () => { const saved = await api.savePrompt(prompt.id, markdown, prompt.draftHash); return api.createPromptVersion(prompt.id, saved.hash); }, 'Version immuable créée.'); if (result.ok) await render(); });
      bindAll('[data-activate-version]', async button => { if (!window.confirm('Utiliser cette version pour les futurs runs ?')) return; const result = await perform(button, () => api.activatePrompt(prompt.id, button.dataset.activateVersion), 'Version activée.'); if (result.ok) await render(); });
    }
  }
  $('[data-new-configuration]')?.addEventListener('click', () => { state.configurationCreating = state.configurationTab; state.configurationDraft = null; state.selected.configuration = null; render(); });
  bindAll('[data-configuration-tab]', button => { state.configurationTab = button.dataset.configurationTab; state.configurationCreating = null; state.configurationDraft = null; state.selected.configuration = null; render(); });
  bindAll('[data-configuration-select]', button => { state.configurationCreating = null; state.configurationDraft = null; state.selected.configuration = button.dataset.configurationSelect; render(); });
}

async function renderProviders() {
  const providers = await api.providers();
  list.innerHTML = listHeader('Providers');
  if (!providers.length) {
    detail.innerHTML = emptyState('Aucun provider', 'Le registre local est vide.');
    return;
  }
  detail.innerHTML = `<div class="detail-inner provider-page"><header class="inspect-head"><div><h2>Providers</h2></div></header><section class="connection-list">${providers.map(provider => `<div class="provider-row"><div class="connection-name"><strong>${esc(provider.name)}</strong></div><div class="provider-key"><input type="password" autocomplete="new-password" placeholder="Clé API" aria-label="Clé API ${esc(provider.name)}" data-provider-secret="${esc(provider.id)}"></div><button class="icon-control compact-icon" type="button" aria-label="Enregistrer la clé ${esc(provider.name)}" title="Enregistrer" data-save-provider="${esc(provider.id)}">${icon('save')}</button><button class="connection-toggle ${provider.enabled ? 'on' : ''}" type="button" aria-label="${provider.enabled ? 'Désactiver' : 'Activer'} ${esc(provider.name)}" aria-pressed="${provider.enabled}" data-toggle-provider="${esc(provider.id)}"><span></span></button></div>`).join('')}</section></div>`;
  bindAll('[data-save-provider]', async button => {
    const id = button.dataset.saveProvider;
    const input = document.querySelector(`[data-provider-secret="${id}"]`);
    if (!input.value.trim()) { notify('Saisissez une clé.'); input.focus(); return; }
    const result = await perform(button, () => api.saveSecret(id, input.value));
    if (!result.ok) return;
    const checked = await perform(button, () => api.testProvider(id));
    if (!checked.ok || checked.value.health !== 'healthy') {
      notify('Clé non valide');
      await api.deleteSecret(id).catch(() => {});
      await render();
      return;
    }
    notify('Clé enregistrée');
    await render();
  });
  bindAll('[data-toggle-provider]', async button => {
    const provider = providers.find(item => item.id === button.dataset.toggleProvider);
    const result = await perform(button, () => api.setEnabled(provider.id, !provider.enabled), provider.enabled ? 'Provider désactivé.' : 'Provider activé.');
    if (result.ok) await render();
  });
}

async function renderInternet() {
  const providers = (await api.providers()).filter(provider => provider.kind === 'domain');
  list.innerHTML = '';
  const result = state.internetResult;
  const registrarConfig = state.internetConfigOpen ? `<section class="internet-config-panel"><div class="section-label">Registrars</div>${providers.map(provider => `<button class="connection-row" type="button" data-internet-provider="${esc(provider.id)}"><strong>${esc(provider.name)}</strong><span>${badge(provider.health)}</span><small>${provider.enabled ? 'Actif' : 'Inactif'} · ouvrir Providers pour configurer</small></button>`).join('')}</section>` : '';
  const rows = result?.candidates?.length ? result.candidates.map(candidate => `<div class="domain-row"><strong>${esc(candidate.domain)}</strong><span>${candidate.availability === 'unknown' ? 'Disponibilité à vérifier' : esc(candidate.availability)}</span><small>${esc(candidate.source)}</small></div>`).join('') : '';
  detail.innerHTML = `<div class="detail-inner internet-page"><header class="inspect-head"><div><h2>Internet</h2></div><div class="detail-actions">${iconControl(state.internetConfigOpen ? 'Fermer les connexions Internet' : 'Afficher les connexions Internet', 'config', 'data-toggle-internet-config')}</div></header><form class="internet-search" data-internet-form><label><span class="sr-only">Nom de domaine</span><input name="query" autocomplete="off" placeholder="Nom de domaine" value="${esc(state.internetQuery)}"></label><button class="icon-control primary" type="submit" aria-label="Rechercher" title="Rechercher" data-internet-submit>${icon('search')}</button></form>${registrarConfig}${rows ? `<section class="panel">${rows}</section>` : ''}</div>`;
  const submitInternet = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[data-internet-submit]');
    const query = form.querySelector('input[name="query"]').value.trim();
    if (!query) return;
    state.internetQuery = query;
    const result = await perform(button, () => api.internetSearch(query), 'Recherche terminée.');
    if (result.ok) { state.internetResult = result.value; await render(); }
  };
  $('[data-internet-form]')?.addEventListener('submit', submitInternet);
  $('[data-toggle-internet-config]')?.addEventListener('click', () => { state.internetConfigOpen = !state.internetConfigOpen; render(); });
}

async function renderNow() {
  renderNav();
  document.body.dataset.view = state.view;
  loading();
  try {
    if (state.view === 'inbox') await renderInbox();
    else if (state.view === 'runs') await renderRuns();
    else if (state.view === 'dossiers') await renderDossiers();
    else if (state.view === 'configuration') await renderConfiguration();
    else if (state.view === 'providers') await renderProviders();
    else await renderInternet();
  } catch (error) {
    showError(error);
  }
}

function render() {
  const next = renderQueue.then(renderNow);
  renderQueue = next.catch(() => {});
  return next;
}

$('#app').addEventListener('click', event => {
  const provider = event.target.closest('[data-internet-provider]');
  if (provider) {
    go('providers', provider.dataset.internetProvider);
    return;
  }
  const button = event.target.closest('[data-view]');
  if (button) go(button.dataset.view);
});

$('#brand').addEventListener('click', () => go('inbox'));
render();
