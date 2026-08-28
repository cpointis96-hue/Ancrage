# Canonical Audit-to-Demo Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the local Website Factory simulation and public discovery runtime with the canonical audit-to-demo order, while keeping payment and legal activation deferred.

**Architecture:** The simulation remains synthetic and deterministic, but its DAG mirrors the canonical gates: identity/domain, parallel audit inputs, final report, preparation, content, site, QA. Public discovery uses DataForSEO only when provider readiness and cost authorization are proven; otherwise it returns an explicit partial or blocked state without invented data.

**Tech Stack:** Node.js 22, ECMAScript modules, node:test, atomic file store, existing provider adapters and cost ledger.

**Spec:** `docs/spec/01-vertical-slice-public-ancrage-v1.md`, `docs/spec/02-audit-gmb-seo-borné.md`, `docs/spec/03-website-factory-global-v1.md`, `docs/spec/04-website-factory-demo-v1.md`, `docs/spec/07-api-control-plane-public-v1.md`, `docs/spec/08-demo-locale-et-branches-pauvres-v1.md`.

## Global Constraints

- Payment, legal activation, domain purchase, publication, and production remain deferred.
- No silent fallback and no invented establishment, domain, keyword, competitor, or audit fact.
- The frontend does not calculate progress; the Control Plane remains authoritative.
- Distinguish synthetic simulation, provider adapter tests without network, and real DataForSEO calls.
- Preserve unrelated working-tree changes and never store provider secrets in durable artifacts.

### Task 1: Align the canonical simulation graph

**Files:**
- Modify: `src/simulation/client-site-simulation.mjs`
- Modify: `test/e2e/client-site-simulation.test.mjs`
- Modify: `src/app.mjs` only if implementation registration is required by the new steps

**Interfaces:**
- The exported `clientSiteWorkflow` remains the active simulation definition.
- `createSimulationImplementations()` continues to provide deterministic fixture implementations.
- The run must expose report artifacts before content/site artifacts, and the site must depend on the final report.

- [x] **Step 1: Write the failing ordering assertions**

Assert that the active definition has `seo-competition-report` before `content-plan`, `content-plan` depends on the SEO report, and `site-build` depends on content only. Assert a completed run has no site artifact when the final report fails.

- [x] **Step 2: Run the focused test and confirm the current graph fails**

Run: `node --test test/e2e/client-site-simulation.test.mjs`

Expected: FAIL because the current graph starts `content-plan` and `site-build` before the final SEO report.

- [x] **Step 3: Implement the smallest DAG and implementation-input changes**

Move `seo-competition-report` before `content-plan`, make it consume the GMB report plus the dossier/domain audit inputs available in the simulation, then let `content-plan` consume the final report. Ensure the SEO report does not require a prebuilt site; its site-specific checks must report that the site is not built yet rather than inventing results.

- [x] **Step 4: Run focused and full tests**

Run: `node --test test/e2e/client-site-simulation.test.mjs test/config/workflow-registry.test.mjs` and then `npm test`.

Expected: all tests pass and the resumed run creates the site only after the final report succeeds.

### Task 2: Harden public discovery readiness and evidence boundaries

**Files:**
- Modify: `src/audit/public-audit-workflow.mjs`
- Modify: `test/audit/public-audit-workflow.test.mjs`
- Inspect only: `src/providers/http-adapters.mjs`, `src/providers/provider-registry.mjs`, `src/demo/demo-workbench.mjs`

**Interfaces:**
- `createPublicAuditWorkflow().create(input)` remains the public entry point.
- Provider calls remain routed through `adapters.dataforseo` and `createCostLedger`.
- Unavailable provider capabilities return explicit `PARTIAL` or `BLOCKED` states and never synthetic provider evidence.

- [x] **Step 1: Add tests for unconfigured discovery and real-call labeling**

Cover no provider, unhealthy/disabled provider, missing secret, zero budget, adapter-only invocation with captured calls, and a successful live-shaped response whose evidence is marked as provider-derived.

- [x] **Step 2: Run the focused tests**

Run: `node --test test/audit/public-audit-workflow.test.mjs test/providers/http-adapters.test.mjs`

- [x] **Step 3: Implement only readiness and provenance corrections**

Keep simulation out of `public-audit-workflow`; use `DATAFORSEO_NOT_READY`, capability errors, budget causes, and explicit module status. Do not add a fallback domain or fake candidates. Ensure the site-discovery result is `PARTIAL` when no confirmed domain exists and no crawl runs in that branch.

- [x] **Step 4: Run the full suite and record evidence**

Run: `npm test` and `npm run check`.

Expected: synthetic simulation tests, adapter tests without network, and public workflow tests pass separately; no claim of a real DataForSEO call is made without credentials and runtime evidence.
