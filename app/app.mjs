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
  const progress = `<section class="panel"><div class="section-label">Progression</div>${run.snapshot.steps.map(snapshot => {
    const step = run.steps.find(item => item.id === snapshot.id);
    return `<div class="step-row"><span><strong>${esc(snapshot.id)}</strong>${failedAttempt?.stepId === snapshot.id ? `<small>Échec précédent · ${esc(failedAttempt.errorCode)}</small>` : ''}</span>${badge(step?.status ?? 'EN ATTENTE')}</div>`;
  }).join('')}</section>`;
  const runBody = state.runTab === 'steps' ? progress : state.runTab === 'proofs' ? `<section class="panel"><div class="section-label">Artefacts</div>${artifacts.length ? `<div class="artifact-links">${site ? `<a href="${esc(site.href)}" target="_blank" rel="noopener">Voir le site ${icon('external')}</a>` : ''}${report ? `<a href="${esc(report.href)}" target="_blank" rel="noopener">Voir le rapport ${icon('external')}</a>` : ''}</div>` : '<p class="muted">Aucun artefact disponible pour ce run.</p>'}</section><section class="panel"><div class="section-label">Dossier source</div><p>${dossier ? `${esc(dossier.name)} · ${esc(dossier.city)} · ${dossier.assetCount} média` : 'Dossier introuvable.'}</p></section>` : state.runTab === 'versions' ? `<section class="panel"><div class="section-label">Configuration du run</div><div class="grid"><div><small>Workflow</small><strong>${esc(run.workflowId)}</strong></div><div><small>Version workflow</small><strong>${esc(run.snapshot.workflowVersion)}</strong></div>${run.snapshot.steps.map(step => `<div><small>${esc(step.id)} · prompt</small><strong>${esc(step.promptRef ?? 'Aucun')}</strong></div><div><small>${esc(step.id)} · contrat</small><strong>${esc(step.contractRef ?? 'Aucun')}</strong></div>`).join('')}</div></section>` : state.runTab === 'journal' ? `<section class="panel"><div class="section-label">Journal</div>${events.length ? events.map(event => `<div class="event-row"><span>${formatDate(event.at)}</span><strong>${esc(event.type)}</strong><small>${esc(event.stepId ?? event.decision ?? '')}</small></div>`).join('') : '<p class="muted">Aucun événement enregistré.</p>'}</section>` : `<section class="preview-card"><div class="preview-matter" aria-hidden="true"></div><div class="preview-copy"><span>Site démo</span><strong>${esc(dossier?.name ?? run.workflowId)}</strong><small>${esc(run.workflowId)} · ${run.status === 'SUCCEEDED' ? 'Aperçu prêt' : 'Aperçu en préparation'}</small></div></section><section class="facts">
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

async function renderConfiguration() {
  const [workflows, prompts] = await Promise.all([api.workflows(), api.prompts()]);
  const tabItems = state.configurationTab === 'workflows' ? workflows : prompts;
  const selectedId = tabItems.some(item => item.id === state.selected.configuration) ? state.selected.configuration : tabItems[0]?.id;
  state.selected.configuration = selectedId;
  list.innerHTML = listHeader('Configuration') + `<nav class="tabs list-tabs" aria-label="Type de configuration"><button class="${state.configurationTab === 'workflows' ? 'active' : ''}" type="button" data-configuration-tab="workflows">Workflows</button><button class="${state.configurationTab === 'prompts' ? 'active' : ''}" type="button" data-configuration-tab="prompts">Prompts</button></nav><div class="section-label">${state.configurationTab === 'workflows' ? 'Workflows disponibles' : 'Prompts utilisés'}</div>${tabItems.map(item => `
    <button class="list-row ${item.id === selectedId ? 'active' : ''}" type="button" data-configuration-select="${item.id}">
      <span class="row-top"><strong>${esc(item.name ?? item.id)}</strong>${state.configurationTab === 'prompts' ? badge(item.activeVersionId ? 'PASS' : 'WARN') : `<span class="row-count">${item.steps.length}</span>`}</span>
      <span class="row-meta">${state.configurationTab === 'prompts' ? esc(item.ownerStep) : `${item.steps.length} étapes`}</span>
    </button>`).join('')}`;
  if (!selectedId) {
    detail.innerHTML = emptyState('Aucune configuration', 'Aucun fichier de configuration n’est disponible.');
    return;
  }
  if (state.configurationTab === 'workflows') {
    const workflow = workflows.find(item => item.id === selectedId);
    const action = workflow.id === 'client-site-simulation' ? `<button class="btn primary" type="button" data-test-workflow>Lancer un test</button>${iconControl('Tester une interruption', 'test', 'data-test-workflow-fault')}` : '<button class="btn primary" type="button" data-open-internet>Ouvrir Internet</button>';
    const contracts = workflow.steps.filter(step => step.contractRef);
    detail.innerHTML = `<div class="detail-inner"><header class="inspect-head"><div><div class="eyebrow">Configuration · workflow</div><h2>${esc(workflow.id)}</h2><p>Le fichier local est utilisé par les futurs runs.</p></div><div class="detail-actions">${action}</div></header><section class="panel"><div class="section-label">Étapes dans l’ordre</div>${workflow.steps.map((step, index) => `<div class="workflow-step"><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${esc(step.id)}</strong><small>${esc(step.kind)} · ${esc(step.implementation)}</small><small>Entrées : ${esc((step.inputRefs ?? []).join(' · ') || 'Aucune')} · sorties : ${esc((step.outputRefs ?? []).join(' · ') || 'Aucune')}</small></span><span>${step.timeoutMs} ms</span></div>`).join('')}</section><section class="panel"><div class="section-label">Contrats de données</div>${contracts.length ? contracts.map(step => `<div class="contract-row"><strong>${esc(step.id)}</strong><span>${esc(step.contractRef)}</span></div>`).join('') : '<p class="muted">Aucun contrat déclaré dans ce workflow.</p>'}</section></div>`;
    $('[data-test-workflow]')?.addEventListener('click', async event => {
      const result = await perform(event.currentTarget, () => api.startSimulation({ name: 'Maison Sillage', city: 'Pattaya' }), 'Simulation créée.');
      if (result.ok) await go('runs', result.value.id);
    });
    $('[data-test-workflow-fault]')?.addEventListener('click', async event => {
      const result = await perform(event.currentTarget, () => api.startSimulation({ name: 'Maison Reprise', city: 'Nantes' }, 'site-build'), 'Interruption injectée au rendu.');
      if (result.ok) await go('runs', result.value.id);
    });
    $('[data-open-internet]')?.addEventListener('click', () => go('internet'));
  } else {
    const prompt = await api.getPrompt(selectedId);
    detail.innerHTML = `<div class="detail-inner"><header class="inspect-head"><div><div class="eyebrow">Configuration · prompt</div><h2>${esc(prompt.name)}</h2><p>${esc(prompt.ownerStep)} · ${esc(prompt.modelProfile)}</p></div><div class="detail-actions"><button class="btn primary" type="button" data-save-prompt>Enregistrer</button>${iconControl('Créer une version', 'versions', 'data-version-prompt')}</div></header><section class="panel"><label class="field"><span>Prompt Markdown</span><textarea data-prompt-editor spellcheck="false">${esc(prompt.markdown)}</textarea></label></section><section class="panel"><div class="section-label">Versions</div>${prompt.versions.length ? [...prompt.versions].reverse().map(version => `<div class="version-row"><span><strong>${esc(version.id)}</strong><small>${formatDate(version.createdAt)}</small></span>${prompt.activeVersionId === version.id ? badge('PASS') : `<button class="btn compact" type="button" data-activate-version="${version.id}">Activer</button>`}</div>`).join('') : '<p class="muted">Aucune version créée.</p>'}</section></div>`;
    $('[data-save-prompt]')?.addEventListener('click', async event => {
      const markdown = $('[data-prompt-editor]').value;
      const result = await perform(event.currentTarget, () => api.savePrompt(prompt.id, markdown, prompt.draftHash), 'Brouillon enregistré sur disque.');
      if (result.ok) await render();
    });
    $('[data-version-prompt]')?.addEventListener('click', async event => {
      const markdown = $('[data-prompt-editor]').value;
      const result = await perform(event.currentTarget, async () => {
        const saved = markdown === prompt.markdown ? { hash: prompt.draftHash } : await api.savePrompt(prompt.id, markdown, prompt.draftHash);
        return api.createPromptVersion(prompt.id, saved.hash);
      }, 'Version immuable créée.');
      if (result.ok) await render();
    });
    bindAll('[data-activate-version]', async button => {
      if (!window.confirm('Activer cette version pour les futurs runs ?')) return;
      const result = await perform(button, () => api.activatePrompt(prompt.id, button.dataset.activateVersion), 'Version activée.');
      if (result.ok) await render();
    });
  }
  bindAll('[data-configuration-tab]', button => { state.configurationTab = button.dataset.configurationTab; state.selected.configuration = null; render(); });
  bindAll('[data-configuration-select]', button => { state.selected.configuration = button.dataset.configurationSelect; render(); });
}

function providerErrorLabel(code) {
  return ({ ADAPTER_NOT_CONFIGURED: 'Adaptateur externe non raccordé', CONNECTION_FAILED: 'Connexion refusée', TIMEOUT: 'Délai dépassé' })[code] ?? code ?? '';
}

async function renderProviders() {
  const providers = await api.providers();
  list.innerHTML = listHeader('Providers') + '<div class="section-label">Connexions</div><p class="list-hint">Les clés restent dans le trousseau local.</p>';
  if (!providers.length) {
    detail.innerHTML = emptyState('Aucun provider', 'Le registre local est vide.');
    return;
  }
  detail.innerHTML = `<div class="detail-inner provider-page"><header class="inspect-head"><div><h2>Providers</h2><p>Connexions IA et domaines utilisées par les workflows.</p></div></header><section class="connection-list">${providers.map(provider => `<div class="provider-row"><div class="connection-name"><strong>${esc(provider.name)}</strong><small>${provider.configured ? 'Clé enregistrée' : 'Non configuré'} · ${provider.enabled ? 'actif' : 'inactif'}</small></div><div class="provider-key"><input type="password" autocomplete="new-password" placeholder="Clé API" aria-label="Clé API ${esc(provider.name)}" data-provider-secret="${esc(provider.id)}"><button class="icon-control compact-icon" type="button" aria-label="Enregistrer la clé ${esc(provider.name)}" title="Enregistrer" data-save-provider="${esc(provider.id)}">${icon('save')}</button></div><button class="icon-control compact-icon" type="button" aria-label="Tester la connexion ${esc(provider.name)}" title="Tester" data-test-provider="${esc(provider.id)}">${icon('test')}</button><button class="connection-toggle ${provider.enabled ? 'on' : ''}" type="button" aria-label="${provider.enabled ? 'Désactiver' : 'Activer'} ${esc(provider.name)}" aria-pressed="${provider.enabled}" data-toggle-provider="${esc(provider.id)}"><span></span></button>${provider.configured ? iconControl(`Supprimer la clé ${provider.name}`, 'trash', `data-delete-provider="${esc(provider.id)}"`) : ''}</div>`).join('')}</section><p class="provider-footnote"><span class="state-dot pass" aria-hidden="true"></span>Les clés ne sont jamais renvoyées au navigateur.</p></div>`;
  bindAll('[data-save-provider]', async button => {
    const id = button.dataset.saveProvider;
    const input = document.querySelector(`[data-provider-secret="${id}"]`);
    if (!input.value.trim()) { notify('Saisissez une clé.'); input.focus(); return; }
    const result = await perform(button, () => api.saveSecret(id, input.value), 'Clé enregistrée dans le trousseau local.');
    input.value = '';
    if (result.ok) await render();
  });
  bindAll('[data-test-provider]', async button => {
    const result = await perform(button, () => api.testProvider(button.dataset.testProvider));
    if (result.ok) { notify(result.value.health === 'healthy' ? 'Connexion vérifiée.' : providerErrorLabel(result.value.lastErrorCode)); await render(); }
  });
  bindAll('[data-toggle-provider]', async button => {
    const provider = providers.find(item => item.id === button.dataset.toggleProvider);
    const result = await perform(button, () => api.setEnabled(provider.id, !provider.enabled), provider.enabled ? 'Provider désactivé.' : 'Provider activé.');
    if (result.ok) await render();
  });
  bindAll('[data-delete-provider]', async button => {
    const provider = providers.find(item => item.id === button.dataset.deleteProvider);
    if (!window.confirm(`Supprimer la clé ${provider.name} du trousseau local ?`)) return;
    const result = await perform(button, () => api.deleteSecret(provider.id), 'Clé supprimée.');
    if (result.ok) await render();
  });
}

async function renderInternet() {
  const providers = (await api.providers()).filter(provider => provider.kind === 'domain');
  const active = providers.filter(provider => provider.enabled && provider.health === 'healthy');
  list.innerHTML = listHeader('Internet') + '<div class="section-label">Recherche de domaines</div><p class="list-hint">Un mot-clé ou une expression, puis Entrée.</p>';
  const result = state.internetResult;
  const registrarConfig = state.internetConfigOpen ? `<section class="internet-config-panel"><div class="section-label">Registrars</div>${providers.map(provider => `<button class="connection-row" type="button" data-internet-provider="${esc(provider.id)}"><strong>${esc(provider.name)}</strong><span>${badge(provider.health)}</span><small>${provider.enabled ? 'Actif' : 'Inactif'} · ouvrir Providers pour configurer</small></button>`).join('')}</section>` : '';
  detail.innerHTML = `<div class="detail-inner internet-page"><header class="inspect-head"><div><h2>Internet</h2><p>Recherche locale de candidats, puis vérification par les registrars actifs.</p></div><div class="detail-actions">${iconControl(state.internetConfigOpen ? 'Fermer les connexions Internet' : 'Afficher les connexions Internet', 'config', 'data-toggle-internet-config')}</div></header><form class="internet-search" data-internet-form><label><span class="sr-only">Nom de domaine</span><input name="query" autocomplete="off" placeholder="restaurant pattaya" value="${esc(state.internetQuery)}"></label><button class="icon-control primary" type="submit" aria-label="Rechercher" title="Rechercher" data-internet-submit>${icon('search')}</button></form>${active.length ? '' : '<div class="notice warn">Aucun registrar actif : aucun prix ni disponibilité ne sera inventé.</div>'}${registrarConfig}<section class="panel"><div class="section-label">Résultats</div>${result?.candidates?.length ? result.candidates.map(candidate => `<div class="domain-row"><strong>${esc(candidate.domain)}</strong><span>${candidate.availability === 'unknown' ? 'Disponibilité à vérifier' : esc(candidate.availability)}</span><small>${esc(candidate.source)}</small></div>`).join('') : '<p class="muted">Saisissez une expression pour générer un premier candidat.</p>'}</section></div>`;
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
