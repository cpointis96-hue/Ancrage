# Progressive GMB and SEO Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the client journey into two business-level audit steps that publish a first GMB report quickly, then a deeper SEO, keyword, and competition report without duplicating provider micro-steps in the UI.

**Architecture:** Keep provider calls internal to the public audit service, but expose two durable report milestones. `gmb-audit-report` produces the first client-visible report once identity and GMB evidence are sufficient; `seo-competition-report` consumes the confirmed site and GMB result, then produces the deeper report. Both reports belong to the same `AuditRun`, carry provenance, status, duration, and delivery metadata, and remain partial when a provider or gate is unavailable.

**Tech Stack:** Node.js ESM, local atomic JSON store, existing workflow engine and registries, loopback HTTP API, vanilla cockpit UI, Node test runner.

**Spec:** `docs/spec/02-audit-gmb-seo-borné.md`, `CONTEXT.md`, `research/87-parcours-client-reference.md`

## Global Constraints

- Keep the client workflow at business-level steps; provider endpoints remain implementation details.
- Deliver the GMB report before the deeper SEO and competition work when the GMB gate is valid.
- Never present an unconfirmed establishment or domain as confirmed.
- Preserve `PARTIAL`, `BLOCKED`, provenance, cost, timeout, idempotency, and immutable-version behavior.
- Keep technical identifiers in code, but do not expose implementation names in step summaries.
- Do not add client-visible copy or UI chrome outside the requested progressive delivery behavior.
- Work directly in the main project checkout; do not create a worktree or change branches.

---

### Task 1: Record the progressive audit domain decision

**Files:**
- Modify: `CONTEXT.md` near `SEOReport` and `ReportDelivery`
- Create: `docs/adr/0004-progressive-gmb-seo-report-delivery.md`
- Test: none; validate terminology by reviewing the glossary and ADR

**Interfaces:**
- Produces the canonical terms `GMBAuditReport`, `SEOReport`, `ProgressiveAudit`, and `ReportDelivery` for later code and tests.

- [ ] **Step 1: Add glossary definitions**

Add definitions that distinguish the first GMB report from the later deeper SEO report and define progressive delivery as two useful milestones of one audit, not two unrelated audits.

- [ ] **Step 2: Add the ADR**

Record the selected two-step design, the rejected monolithic report, and the rejected provider-per-step design. State that both deliveries share the same `AuditRun` and provenance.

- [ ] **Step 3: Review terminology**

Run `rg -n "GMBAuditReport|SEOReport|ProgressiveAudit|ReportDelivery" CONTEXT.md docs/adr/0004-progressive-gmb-seo-report-delivery.md` and confirm no implementation details entered the glossary.

- [ ] **Step 4: Commit**

Run `git add CONTEXT.md docs/adr/0004-progressive-gmb-seo-report-delivery.md && git commit -m "docs: define progressive audit report delivery"`.

### Task 2: Define the two workflow steps and report contracts

**Files:**
- Modify: `src/audit/public-audit-workflow.mjs`
- Modify: `src/simulation/client-site-simulation.mjs`
- Modify: `src/app.mjs` only for seeded workflow/template mappings if required
- Test: `test/audit/public-audit-workflow.test.mjs`, `test/e2e/client-site-simulation.test.mjs`

**Interfaces:**
- `createPublicAuditWorkflow().create(input)` returns `reports.gmb` and `reports.seoCompetition`, each with `status`, `artifact`, `availableAt`, `durationMs`, and `cause` when partial.
- The client workflow has business steps `gmb-audit-report` and `seo-competition-report`; the latter depends on the former and consumes its report reference.

- [ ] **Step 1: Write failing report milestone tests**

Assert that a healthy GMB call creates a first report artifact and that the deeper report is produced only after its downstream calls complete or become explicitly `PARTIAL`.

- [ ] **Step 2: Write failing workflow graph tests**

Assert that the client workflow contains the two named business steps, that the second depends on the first, and that each step exposes its own output reference and template.

- [ ] **Step 3: Implement report milestone persistence**

Persist report metadata under the existing audit run path, include the report artifact reference in the run JSON, and preserve idempotent replay behavior.

- [ ] **Step 4: Implement the two-step workflow graph**

Replace the single ambiguous audit report stage in the client workflow configuration with the two business-level stages while keeping site generation and quality gate dependencies valid.

- [ ] **Step 5: Run focused tests**

Run `node --test test/audit/public-audit-workflow.test.mjs test/e2e/client-site-simulation.test.mjs test/config/workflow-registry.test.mjs` and expect PASS.

- [ ] **Step 6: Commit**

Run `git add src/audit/public-audit-workflow.mjs src/simulation/client-site-simulation.mjs src/app.mjs test/audit/public-audit-workflow.test.mjs test/e2e/client-site-simulation.test.mjs test/config/workflow-registry.test.mjs && git commit -m "feat: split audit into progressive report steps"`.

### Task 3: Expose report delivery to the client surface

**Files:**
- Modify: `src/http/router.mjs`
- Modify: `app/api.mjs`
- Modify: `app/intake.html`
- Modify: `app/intake.mjs`
- Modify: `app/intake.css`
- Test: `test/http/server.test.mjs`

**Interfaces:**
- Add a read-only route for a report by audit id and report kind, returning the report artifact or an explicit `PARTIAL`/`NOT_READY` state.
- The response must never include provider credentials or raw payloads outside the existing evidence policy.

- [ ] **Step 1: Write failing route tests**

Cover the GMB report being available before the deeper report, the deeper report becoming available later, and a missing report returning an honest non-success state.

- [ ] **Step 2: Implement the narrow report route**

Resolve only persisted report references from the audit run, validate the report kind, and return the existing HTML/content contract.

- [ ] **Step 3: Connect the client surface**

Add only the requested progressive report links or states to the existing client surface, preserving mobile layout and avoiding provider or implementation labels.

- [ ] **Step 4: Run focused HTTP tests**

Run `node --test test/http/server.test.mjs` and expect PASS.

- [ ] **Step 5: Commit**

Run `git add src/http/router.mjs app/api.mjs app/intake.html app/intake.mjs app/intake.css test/http/server.test.mjs && git commit -m "feat: deliver progressive audit reports"`.

### Task 4: Validate end to end and review the implementation boundary

**Files:**
- Test: existing full suite and browser preview
- Modify: only files required by failed tests; no unrelated cleanup

**Interfaces:**
- The final validation proves two client-visible report milestones, correct workflow dependencies, honest partial states, and no regression in the existing site workflow.

- [ ] **Step 1: Run all tests**

Run `rtk npm test`; expect zero failures.

- [ ] **Step 2: Run static checks**

Run `rtk npm run check` and `git diff --check`; expect successful exit codes.

- [ ] **Step 3: Run the browser journey**

Open the local preview, inspect the client workflow at desktop, 800 px, and 390 px, verify the two business step summaries, and confirm no technical implementation name is visible below a step.

- [ ] **Step 4: Verify report delivery behavior**

Exercise the first report link/state, then the deeper report link/state, and inspect browser logs for zero errors or warnings.

- [ ] **Step 5: Commit verified implementation**

Run `git status --short`, inspect the final diff, then commit only the scoped implementation and tests with `git commit -m "test: validate progressive audit delivery"`.

## Spec coverage and deliberate gaps

- Covered: ordered GMB then SEO/concurrence delivery, report artifacts, workflow dependencies, templates, contracts, statuses, duration, provenance, client visibility, and responsive UI.
- Deliberately not claimed by this plan: commercial activation, DataForSEO terms/quotas/right-to-redistribute approval, real OnPage asynchronous polling, or a production-grade establishment confirmation service. Those remain explicit gates in `docs/spec/02-audit-gmb-seo-borné.md`.
