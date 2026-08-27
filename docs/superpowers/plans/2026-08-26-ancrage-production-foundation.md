# Ancrage Production Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les simulations du cockpit par un noyau local opérable qui versionne prompts et workflows, protège les secrets, exécute un workflow test et expose toutes les mutations via une API loopback sécurisée.

**Architecture:** Un `LocalBridge` Node.js sans dépendance runtime écoute uniquement sur `127.0.0.1`, sert une interface statique et orchestre des modules focalisés. Les données opérateur sont écrites atomiquement dans `.ancrage/`; les secrets passent par une interface `SecretStore` dont l'implémentation macOS utilise Keychain et dont les tests utilisent la mémoire. Les runs gèlent un `ConfigurationSnapshot` et écrivent un journal append-only.

**Tech Stack:** Node.js 22+, ESM, `node:http`, `node:fs`, `node:crypto`, `node:child_process`, `node:test`, HTML/CSS/JavaScript natifs.

**Spec:** `.scratch/website-factory-architecture/spec.md`

## Global Constraints

- Le serveur écoute uniquement sur `127.0.0.1`.
- Aucun secret n'est retourné au navigateur, écrit dans `.ancrage/`, un log ou Git.
- Les versions publiées et les artefacts de run sont immuables.
- Une mutation utilise un hash attendu et échoue explicitement en cas de conflit.
- Une sortie invalide ne devient jamais un checkpoint fiable.
- Une action visible possède un comportement réel, un état de chargement, un succès et une récupération d'erreur.
- Le cockpit conserve la direction Ancrage, mode Operate, ENERGY 1 / RHYTHM 1 / MOTION 1.
- Les icônes utilisent un dessin de 14 à 16 px dans une cible interactive minimale de 44 px.

---

### Task 1: Runtime local et stockage atomique

**Files:**
- Create: `src/core/errors.mjs`
- Create: `src/core/ids.mjs`
- Create: `src/core/atomic-store.mjs`
- Create: `test/core/atomic-store.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ANCRAGE_DATA_DIR` ou le chemin `.ancrage/` fourni par le serveur.
- Produces: `createAtomicStore(rootDir)` avec `readJson`, `writeJson`, `readText`, `writeText`, `appendJsonLine`, `hashText` et `resolveSafe`.

- [ ] **Step 1: Écrire les tests de sécurité et d'atomicité**

```js
test('refuse path traversal', () => {
  const store = createAtomicStore(tmp);
  assert.throws(() => store.resolveSafe('../secret'), PathViolationError);
});

test('detects stale expected hash', async () => {
  await store.writeText('config/a.md', 'v1');
  await assert.rejects(
    store.writeText('config/a.md', 'v2', { expectedHash: 'sha256:stale' }),
    ConflictError,
  );
});
```

- [ ] **Step 2: Vérifier l'échec initial**

Run: `node --test test/core/atomic-store.test.mjs`

Expected: FAIL avec `ERR_MODULE_NOT_FOUND` pour `src/core/atomic-store.mjs`.

- [ ] **Step 3: Implémenter le store minimal**

```js
export function createAtomicStore(rootDir) {
  return {
    resolveSafe(relativePath) {},
    async readJson(relativePath, fallback = null) {},
    async writeJson(relativePath, value, options = {}) {},
    async readText(relativePath, fallback = null) {},
    async writeText(relativePath, value, options = {}) {},
    async appendJsonLine(relativePath, value) {},
    hashText(value) {},
  };
}
```

Chaque écriture crée un fichier temporaire aléatoire dans le dossier cible, appelle `fsync`, puis `rename`. `resolveSafe` compare le chemin réel au préfixe absolu du root et refuse `..`, les chemins absolus et les segments vides.

- [ ] **Step 4: Exécuter les tests**

Run: `npm test`

Expected: PASS, aucun fichier hors du répertoire temporaire.

### Task 2: Registre de prompts Markdown versionné

**Files:**
- Create: `src/config/frontmatter.mjs`
- Create: `src/config/prompt-registry.mjs`
- Create: `test/config/prompt-registry.test.mjs`
- Create: `fixtures/defaults/prompts/audit-analyst.md`
- Create: `fixtures/defaults/prompts/copywriter.md`

**Interfaces:**
- Consumes: `AtomicStore` de Task 1.
- Produces: `createPromptRegistry({ store, clock })` avec `list`, `get`, `saveDraft`, `createVersion`, `activate` et `diff`.

- [ ] **Step 1: Écrire le test du cycle draft -> version -> activation**

```js
const saved = await registry.saveDraft('copywriter', markdown, { expectedHash: null });
const version = await registry.createVersion('copywriter', { expectedDraftHash: saved.hash });
await registry.activate('copywriter', version.id);
assert.equal((await registry.get('copywriter')).activeVersionId, version.id);
assert.equal(await store.readText(`config/prompts/copywriter/versions/${version.id}.md`), markdown);
```

- [ ] **Step 2: Vérifier l'échec initial**

Run: `node --test test/config/prompt-registry.test.mjs`

Expected: FAIL avec module absent.

- [ ] **Step 3: Implémenter le parseur borné et le registre**

Le frontmatter accepte uniquement des lignes `clé: valeur`, rejette les clés inconnues et exige `id`, `name`, `ownerStep` et `outputContract`. Le modèle est choisi dans l’étape IA du workflow. Une version utilise `v-<timestamp>-<hash8>` et ne peut pas être remplacée.

- [ ] **Step 4: Tester conflits et immutabilité**

Run: `node --test test/config/prompt-registry.test.mjs`

Expected: PASS pour création, activation, diff, conflit de hash et refus d'écraser une version.

### Task 3: SecretStore Keychain et registre providers

**Files:**
- Create: `src/providers/memory-secret-store.mjs`
- Create: `src/providers/keychain-secret-store.mjs`
- Create: `src/providers/provider-registry.mjs`
- Create: `test/providers/provider-registry.test.mjs`
- Create: `fixtures/defaults/providers.json`

**Interfaces:**
- Consumes: `AtomicStore`, fonction injectée `fetch`, interface `SecretStore` (`has`, `set`, `get`, `delete`).
- Produces: `createProviderRegistry({ store, secretStore, adapters, clock })` avec `list`, `saveSecret`, `deleteSecret`, `setEnabled` et `testConnection`.

- [ ] **Step 1: Écrire les tests de non-divulgation**

```js
await registry.saveSecret('openai', 'sk-test-secret');
const provider = (await registry.list()).find(item => item.id === 'openai');
assert.equal(provider.configured, true);
assert.equal(JSON.stringify(provider).includes('sk-test-secret'), false);
assert.equal(JSON.stringify(await store.readJson('state/provider-status.json', {})).includes('sk-test-secret'), false);
```

- [ ] **Step 2: Vérifier l'échec initial**

Run: `node --test test/providers/provider-registry.test.mjs`

Expected: FAIL avec module absent.

- [ ] **Step 3: Implémenter Keychain sans shell**

Utiliser `spawnFile('/usr/bin/security', args)` avec arguments séparés. Le service vaut `com.ancrage.provider`; le compte vaut l'identifiant normalisé du provider. Les erreurs retournées sont converties en codes expurgés, jamais en commande ou secret.

- [ ] **Step 4: Implémenter activation et health check borné**

Un provider ne devient `enabled` que si `configured` et `health === 'healthy'`. Un test possède un timeout de 8 secondes, ne persiste que `health`, `lastCheckedAt` et `lastErrorCode`.

- [ ] **Step 5: Exécuter les tests**

Run: `node --test test/providers/provider-registry.test.mjs`

Expected: PASS, aucune occurrence de la fixture secrète dans `.ancrage/` temporaire.

### Task 4: Validation et moteur de workflows

**Files:**
- Create: `src/workflows/workflow-validator.mjs`
- Create: `src/workflows/workflow-engine.mjs`
- Create: `src/workflows/implementations.mjs`
- Create: `test/workflows/workflow-engine.test.mjs`
- Create: `fixtures/defaults/workflows/domain-research.json`
- Create: `fixtures/defaults/contracts/domain-candidates.schema.json`

**Interfaces:**
- Consumes: `AtomicStore`, registre de prompts, implémentations injectées.
- Produces: `validateWorkflowDefinition(definition)` et `createWorkflowEngine({ store, promptRegistry, implementations, clock, idFactory })` avec `start`, `get`, `list`, `resume`.

- [ ] **Step 1: Écrire les tests de graphe et de reprise**

```js
assert.throws(() => validateWorkflowDefinition(cyclicWorkflow), WorkflowValidationError);
const run = await engine.start('domain-research', { query: 'restaurant pattaya' });
assert.equal(run.status, 'SUCCEEDED');
assert.equal(run.steps.every(step => step.outputHash), true);
const resumed = await engine.resume(run.id);
assert.equal(resumed.attempts.length, run.attempts.length);
```

- [ ] **Step 2: Vérifier l'échec initial**

Run: `node --test test/workflows/workflow-engine.test.mjs`

Expected: FAIL avec module absent.

- [ ] **Step 3: Implémenter le validateur de DAG**

Valider identifiants, dépendances, cycle, sorties uniques, timeout entre 100 et 900000 ms, budget numérique non négatif et `promptRef` obligatoire pour `kind: "ai"`.

- [ ] **Step 4: Implémenter un run append-only**

Le moteur écrit d'abord `run-manifest.json`, puis un événement par transition dans `events.jsonl`, puis chaque `step-run.json`. Une sortie est hashée avant le statut `SUCCEEDED`. Une reprise ignore les étapes déjà réussies dont les hashes existent.

- [ ] **Step 5: Exécuter les tests**

Run: `node --test test/workflows/workflow-engine.test.mjs`

Expected: PASS pour succès, blocage, timeout, sortie invalide, reprise et immutabilité.

### Task 5: API loopback sécurisée

**Files:**
- Create: `src/http/json.mjs`
- Create: `src/http/router.mjs`
- Create: `src/http/server.mjs`
- Create: `src/app.mjs`
- Create: `test/http/server.test.mjs`
- Modify: `ship-studio-preview.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: registries et engine des Tasks 2 à 4.
- Produces: `createLocalServer({ app, host, port })` et routes `/api/providers`, `/api/prompts`, `/api/workflows`, `/api/runs`, `/api/internet/search`.

- [ ] **Step 1: Écrire les tests HTTP**

```js
const response = await request('/api/prompts/copywriter/draft', {
  method: 'PUT',
  headers: { origin: baseUrl, 'content-type': 'application/json' },
  body: JSON.stringify({ markdown, expectedHash: null }),
});
assert.equal(response.status, 200);
assert.equal(response.headers.get('access-control-allow-origin'), null);
```

Tester aussi origine étrangère `403`, JSON invalide `400`, corps supérieur à 1 MiB `413`, route absente `404` et erreur interne expurgée `500`.

- [ ] **Step 2: Vérifier l'échec initial**

Run: `node --test test/http/server.test.mjs`

Expected: FAIL avec module absent.

- [ ] **Step 3: Implémenter routes et headers**

Ajouter CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` pour l'API, validation stricte de l'origine et refus des méthodes non déclarées.

- [ ] **Step 4: Exécuter l'intégration**

Run: `npm test`

Expected: PASS pour toutes les routes et invariants de sécurité.

### Task 6: Cockpit opérable et unifié

**Files:**
- Create: `app/index.html`
- Create: `app/styles.css`
- Create: `app/icons.mjs`
- Create: `app/api.mjs`
- Create: `app/app.mjs`
- Create: `test/ui/contracts.test.mjs`
- Modify: `index.html`
- Preserve: `prototypes/ux-vertical-slice/cockpit-operator-v2.html`

**Interfaces:**
- Consumes: API de Task 5.
- Produces: six surfaces `À traiter`, `Runs`, `Dossiers`, `Configuration`, `Providers`, `Internet` sans données fictives ni contrôles morts.

- [ ] **Step 1: Écrire les contrats statiques UI**

```js
assert.match(html, /id="app"/);
assert.equal(/onclick=/.test(html), false);
assert.equal(/Mistral/.test(source), false);
assert.equal(/fetch\(['"]\/api\//.test(source), true);
```

- [ ] **Step 2: Construire le shell et l'iconographie**

Centraliser chaque SVG dans `icons.mjs`, `viewBox="0 0 20 20"`, `stroke-width="1.5"`, dessin 14 à 16 px et cible 44 px. Aucune icône Unicode. Conserver la palette et les séparateurs Ancrage.

- [ ] **Step 3: Raccorder Providers**

Afficher `configured`, `enabled`, `health` et les actions réelles enregistrer, tester, activer. Effacer le champ secret après réponse, annoncer le résultat via `aria-live`, désactiver les doubles soumissions.

- [ ] **Step 4: Raccorder Prompts**

Charger le vrai `draft.md`, préserver le texte en cas d'erreur, enregistrer avec `expectedHash`, créer une version, afficher le diff et activer après confirmation explicite.

- [ ] **Step 5: Raccorder Workflows, Runs et Internet**

Les listes viennent de l'API. Les états vides expliquent l'action suivante. `Internet` lance le workflow déterministe et affiche uniquement les devis sourcés reçus ; aucun prix de fixture n'apparaît dans le bundle.

- [ ] **Step 6: Valider responsive et accessibilité**

Tester 1440 px, 900 px et 390 px, zoom 200 %, clavier seul, focus visible, états loading/error/offline et absence de `scrollWidth > clientWidth`.

### Task 7: Vertical slice de preuve et documentation

**Files:**
- Create: `test/e2e/local-vertical-slice.test.mjs`
- Create: `docs/runbooks/local-production.md`
- Modify: `.scratch/website-factory-architecture/map.md`
- Modify: `docs/ux/08-guide-reprise-cockpit-prototypes.md`

**Interfaces:**
- Consumes: application complète Tasks 1 à 6.
- Produces: preuve automatisée `provider fixture -> prompt version -> workflow -> run -> artifact -> reprise`.

- [ ] **Step 1: Écrire le test vertical slice**

Le test démarre le serveur sur un port éphémère, enregistre un secret dans `MemorySecretStore`, teste un provider fixture, sauvegarde et active un prompt, démarre `domain-research`, vérifie les hashes et redémarre le serveur avec le même data dir.

- [ ] **Step 2: Vérifier la persistance après redémarrage**

```js
assert.equal(reloadedRun.status, 'SUCCEEDED');
assert.equal(reloadedPrompt.activeVersionId, version.id);
assert.equal(serializedData.includes(secret), false);
```

- [ ] **Step 3: Exécuter le gate complet**

Run: `npm test && npm run check`

Expected: tous les tests passent, `git diff --check` passe, aucune clé détectée dans les fichiers suivis ou `.ancrage/` de test.

- [ ] **Step 4: Documenter le démarrage et les limites observées**

Le runbook contient les commandes exactes, le chemin des données, la procédure Keychain, l'export, la restauration et les intégrations externes encore non vérifiées. La carte Wayfinder ne ferme que les preuves réellement obtenues.

## Self-review

- Chaque exigence de la spec possède une tâche : stockage et conflits (1), prompts (2), secrets/providers (3), workflows/runs (4), frontières HTTP (5), comportement UI (6), vertical slice et reprise (7).
- Aucun composant dépend d'un secret réel pendant les tests.
- Les formats et signatures utilisés par les tâches suivantes sont définis dans les tâches précédentes.
- Les intégrations cloud et registrars réelles restent une phase distincte après ce noyau ; elles utiliseront les mêmes interfaces et nécessiteront des comptes de test dédiés.
