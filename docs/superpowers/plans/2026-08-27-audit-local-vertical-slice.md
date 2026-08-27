# Audit local vertical slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le premier noyau testable de l’audit SEO local, déterministe, borné et indépendant de tout provider externe.

**Architecture:** Une analyse pure reçoit un `target` et des pages déjà capturées, produit des findings sourcés et un état `SUCCEEDED`, `PARTIAL` ou `BLOCKED`, puis un renderer déterministe compose le rapport HTML. Cette tranche ne fait aucun fetch réseau, ne lance aucun provider et ne modifie pas la fondation Ancrage ; elle prépare le contrat nécessaire au futur crawler autorisé.

**Tech Stack:** Node.js ESM >=22, APIs standard, `node:test`, stockage en mémoire de test uniquement.

**Spec:** `docs/spec/02-audit-gmb-seo-borné.md`, section 4, sections 5–7 et section 14.

## Global Constraints

- L’audit doit rester séparé de l’identité GMB et ne jamais inventer une donnée absente.
- Les règles déterministes précèdent toute IA ; cette tranche n’utilise aucune IA.
- Chaque finding doit être relié à une URL, une date d’observation et une règle versionnée.
- Les résultats synthétiques de test sont `synthetic-fixture` et ne constituent pas une preuve commerciale.
- Aucun provider externe, credential, paiement, publication, suppression distante ou envoi n’est utilisé.
- `PARTIAL` et `BLOCKED` sont des résultats explicites, jamais des succès implicites.

---

### Task 1: Contrat d’analyse d’une page

**Files:**
- Create: `src/audit/seo-audit.mjs`
- Test: `test/audit/seo-audit.test.mjs`

**Interfaces:**
- Consumes: `{ target, pages, observedAt, maxPages }`, où chaque page contient `{ url, status, html, crawlStatus }`.
- Produces: `analyzeSeoAudit(input)` retournant `{ schemaVersion, ruleVersion, target, observedAt, status, summary, pages, findings }`.

- [ ] **Step 1: Write the failing test**

Tester une page HTML avec titre, meta description, un seul `h1`, viewport, canonical, `lang`, alt et JSON-LD ; vérifier qu’elle retourne zéro finding bloquant et conserve l’URL/date.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: FAIL because `analyzeSeoAudit` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implémenter une analyse standard sans dépendance : vérifier `title`, `meta[name="description"]`, `h1`, `meta[name="viewport"]`, `link[rel="canonical"]`, `html lang`, `img alt` et `script[type="application/ld+json"]`. Émettre une preuve `{ url, observedAt, ruleVersion }` par finding. Une page `crawlStatus: "blocked"` produit seulement `CRAWL_BLOCKED` et rend l’audit `PARTIAL`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: PASS.

### Task 2: Bornes multi-pages et états partiels

**Files:**
- Modify: `src/audit/seo-audit.mjs`
- Test: `test/audit/seo-audit.test.mjs`

**Interfaces:**
- Consumes: le même contrat, avec plusieurs pages, statuts HTTP et `maxPages`.
- Produces: findings `MISSING_TITLE`, `MISSING_META_DESCRIPTION`, `MULTIPLE_H1`, `MISSING_CANONICAL`, `MISSING_STRUCTURED_DATA`, `MISSING_IMAGE_ALT`, `CRAWL_BLOCKED` et `PAGE_LIMIT_REACHED` avec sévérité explicable.

- [ ] **Step 1: Write the failing test**

Ajouter une page volontairement erronée, une page bloquée et une entrée au-delà de `maxPages` ; vérifier les codes attendus, `status: "PARTIAL"`, le nombre de pages analysées et l’absence de phrase de classement.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: FAIL because multi-page limits and partial status are absent.

- [ ] **Step 3: Write minimal implementation**

Limiter le traitement à `maxPages` (50 par défaut, maximum 50), conserver les pages ignorées dans le résumé, ne jamais convertir un statut HTTP ou un blocage en absence de contenu, et calculer `summary.counts` uniquement à partir des observations disponibles.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: PASS.

### Task 3: Rapport HTML déterministe

**Files:**
- Create: `src/audit/audit-report.mjs`
- Test: `test/audit/seo-audit.test.mjs`

**Interfaces:**
- Consumes: le résultat de `analyzeSeoAudit`.
- Produces: `renderSeoAuditReport(audit)` retournant un document HTML échappé contenant le statut, le périmètre, les findings et leurs URLs/dates/règles.

- [ ] **Step 1: Write the failing test**

Vérifier que le rapport contient `PARTIAL`, une preuve URL/date/règle, échappe `<script>` dans une donnée d’entrée et ne contient aucune promesse de classement.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: FAIL because `renderSeoAuditReport` does not exist.

- [ ] **Step 3: Write minimal implementation**

Échapper toutes les valeurs interpolées, afficher seulement les champs d’audit observés et utiliser un style inline minimal ; aucun appel réseau, script ou contenu marketing additionnel.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/audit/seo-audit.test.mjs`
Expected: PASS.

### Task 4: Jeu de fixtures vertical slice local

**Files:**
- Create: `test/audit/vertical-slice.test.mjs`
- Create: `docs/spec/05-audit-local-vertical-slice-v1.md`

**Interfaces:**
- Consumes: `analyzeSeoAudit` et `renderSeoAuditReport` avec fixtures locales.
- Produces: preuve de couverture des sept profils requis sans déclarer de site réel, de provider ou de commercialisation.

- [ ] **Step 1: Write the failing test**

Définir sept fixtures nommées `static`, `wordpress`, `multilingual`, `javascript`, `intentional-errors`, `crawl-blocked` et `no-structured-data`, puis vérifier le statut et les findings attendus de chacune.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/vertical-slice.test.mjs`
Expected: FAIL until the analyzer handles all fixture states.

- [ ] **Step 3: Write minimal implementation and fixture note**

Conserver les HTML directement dans le test, marquer chaque résultat `synthetic-fixture`, et documenter clairement que ce pré-slice valide le contrat local ; le vertical slice réel avec sites autorisés reste une gate séparée.

- [ ] **Step 4: Run verification**

Run: `node --test test/audit/seo-audit.test.mjs test/audit/vertical-slice.test.mjs`
Expected: PASS with no network access.

## Self-review gaps

- Le crawler HTTP réel est réduit à une politique bornée et testée avec dépendances injectées ; la validation DNS/SSRF complète en environnement réel, les appels DataForSEO, l’identification GMB, les coûts `CostEvent`, Neon/R2, la suppression et la restauration exigent des tests autorisés distincts.
- Aucun finding de performance Lighthouse, d’accessibilité Axe ou de contenu JavaScript n’est déduit à partir de HTML non rendu.
- Aucun résultat de fixture ne peut être utilisé comme preuve client ou promesse commerciale.

## Execution status — 27 août 2026

- [x] Contrat d’analyse HTML déterministe et findings versionnés.
- [x] États `PARTIAL`, blocage de crawl et limites de pages.
- [x] Rapport HTML déterministe et échappé.
- [x] Sept profils synthétiques couverts sans réseau.
- [x] Politique de cible publique, même-origin, limites d’octets et redirections privées.
- [x] Service `crawlSite → analyzeSeoAudit`, sans exposition du HTML brut.
- [x] Registre local persistant et routes Control Plane pour créer, relire et servir un audit.
- [x] Bornes absolues du profil d’octets et de durée.
- [x] Adapters DataForSEO couvrant les familles SEO documentées, testés sans réseau réel.
- [x] Registre local de pré-autorisation et règlement `CostEvent`, testé sans provider.

Le prochain incrément exige une autorisation de test pour des sites réels et un budget/provider séparé ; il n’est pas inclus dans cette tranche.

### Task 5: Politique de cible publique et crawler HTML borné

**Files:**
- Create: `src/audit/site-crawler.mjs`
- Test: `test/audit/site-crawler.test.mjs`

**Interfaces:**
- Consumes: `{ target, fetchImpl, lookup, maxPages, maxBytes, timeoutMs }`.
- Produces: `{ target, pages, summary }`, avec pages HTML du même origin, ou pages `crawlStatus: "blocked"` sans contenu brut en cas d’échec.

- [ ] **Step 1: Write the failing test**

Tester un faux fetch de deux pages HTML, une redirection vers une IP privée et un nom résolu vers localhost ; vérifier que le crawl reste sur l’origin public, refuse les cibles privées et borne le nombre de pages/octets.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/site-crawler.test.mjs`
Expected: FAIL because `crawlSite` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implémenter la validation `http`/`https`, sans credentials ni port arbitraire, la résolution DNS injectée, le rejet des IP loopback/link-local/RFC1918/réservées, la revalidation après redirection, le même-origin, `maxPages <= 50`, `maxBytes` par page et un timeout par requête. Ne jamais exécuter de script, télécharger de binaire ou suivre une redirection hors politique.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/audit/site-crawler.test.mjs`
Expected: PASS.

### Task 6: Service d’audit local capturé

**Files:**
- Create: `src/audit/seo-audit-service.mjs`
- Test: `test/audit/vertical-slice.test.mjs`

**Interfaces:**
- Consumes: `{ target, observedAt, fetchImpl, lookup, profile }`.
- Produces: `runSeoAudit(input)` retournant le résultat de crawl et le résultat `analyzeSeoAudit`, sans provider externe.

- [ ] **Step 1: Write the failing test**

Exécuter `runSeoAudit` avec un faux fetch local et vérifier que les findings du HTML capturé portent l’URL/date, que le résultat partiel est conservé et qu’aucun appel réseau réel n’est requis.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/audit/vertical-slice.test.mjs`
Expected: FAIL because `runSeoAudit` does not exist.

- [ ] **Step 3: Write minimal implementation**

Composer `crawlSite` puis `analyzeSeoAudit`. Le service ne prend jamais une décision GMB, ne lance aucune IA et ne traite pas une page non capturée comme une absence commerciale.

- [ ] **Step 4: Run verification**

Run: `node --test test/audit/*.test.mjs`
Expected: PASS with no external network.
