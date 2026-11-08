import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function cockpit() {
  const elements = Object.fromEntries(['app', 'brand', 'list', 'detail', 'ops-nav', 'control-nav', 'status'].map(id => [id, {
    innerHTML: '', scrollTop: 0, scrollLeft: 0, listeners: {},
    classList: { toggle() {}, remove() {} },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    focus() {},
  }]));
  const api = { dossiers: async () => [], runs: async () => [], publicDemoRequests: async () => [], publicRequests: async () => [] };
  const document = {
    body: { dataset: {} }, scrollingElement: { scrollTop: 0, scrollLeft: 0 },
    querySelector: selector => selector.startsWith('#') ? elements[selector.slice(1)] : null,
    querySelectorAll: () => [],
  };
  const context = vm.createContext({ document, api, icon: () => '', setTimeout, clearTimeout, CSS: { escape: value => value } });
  const source = await readFile(new URL('../../app/app.mjs', import.meta.url), 'utf8');
  vm.runInContext(source.replace(/^import .*;\n/gm, ''), context);
  const ready = () => vm.runInContext('renderQueue', context);
  await ready();
  return { elements, api, ready, refresh: () => vm.runInContext('render()', context),
    navigate(view) {
      elements.app.listeners.click({ target: { closest: selector => selector === '[data-view]' ? { dataset: { view } } : null } });
    },
  };
}

test('le cockpit garde les textes pendant une navigation et une actualisation lentes', async () => {
  const app = await cockpit();
  const { list, detail } = app.elements;
  const before = [list.innerHTML, detail.innerHTML];
  const first = deferred();
  app.api.publicRequests = () => first.promise;
  app.navigate('audits');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual([list.innerHTML, detail.innerHTML], before);
  assert.equal(list.inert, true);
  assert.equal(detail.inert, true);
  first.resolve([{ id: 'fixture', input: { name: 'Établissement de recette' }, status: 'PARTIAL', createdAt: '2026-11-08T09:00:00Z', reports: [] }]);
  await app.ready();
  assert.match(list.innerHTML, /Audits/);
  assert.match(detail.innerHTML, /Établissement de recette/);
  assert.equal(detail.inert, false);

  const visible = [list.innerHTML, detail.innerHTML];
  const refresh = deferred();
  app.api.publicRequests = () => refresh.promise;
  const completed = app.refresh();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual([list.innerHTML, detail.innerHTML], visible);
  refresh.resolve([]);
  await completed;
  assert.match(list.innerHTML, /Aucune demande/);
  assert.equal(detail.innerHTML, '');
});

test('une erreur de chargement libère les panneaux et permet de réessayer', async () => {
  const app = await cockpit();
  app.api.publicRequests = async () => { throw new Error('Connexion interrompue'); };
  app.navigate('audits');
  await app.ready();
  assert.match(app.elements.detail.innerHTML, /Connexion interrompue/);
  assert.match(app.elements.detail.innerHTML, /Réessayer/);
  assert.equal(app.elements.list.inert, false);
  assert.equal(app.elements.detail.inert, false);
  app.api.publicRequests = async () => [];
  await app.refresh();
  assert.match(app.elements.list.innerHTML, /Aucune demande/);
  assert.equal(app.elements.detail.innerHTML, '');
});
