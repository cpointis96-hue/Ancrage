# Public Audit to Cockpit Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public audit produce truthful, distinct reports and expose each resulting business object in the correct cockpit view.

**Architecture:** Keep the deterministic Control Plane authoritative. A provider result becomes a business fact only after identity/domain corroboration; otherwise the run remains `PARTIAL` or `BLOCKED`. Keep audit, preparation, dossier, and generation run as separate objects, then expose each at its existing lifecycle boundary.

**Tech Stack:** Node.js ESM, built-in `node:test`, local HTTP server, static browser UI, JSON files with atomic writes, injected provider adapters.

**Spec:** `docs/spec/01-vertical-slice-public-ancrage-v1.md`, `docs/spec/02-audit-gmb-seo-borné.md`, `docs/spec/03-website-factory-global-v1.md`, `docs/spec/04-website-factory-demo-v1.md`, `docs/spec/07-api-control-plane-public-v1.md`.

## Global Constraints

- Preserve the current `main` checkout; do not create a commit unless explicitly requested.
- Do not expose provider payloads, credentials, private data, or internal scores to the browser.
- Do not invent an establishment, domain, keyword, competitor, recommendation, cost, or completion state.
- Use the existing budget envelope and deterministic providers; no new provider or dependency without evidence.
- Keep `PARTIAL`, `BLOCKED`, and `SUCCEEDED` consistent from audit run to public request, report, and cockpit.
- Keep the UI scope locked; every visible addition must enable a concrete user action or explain a real state.
- Run the smallest relevant test after each change, then `npm test` and `npm run check` before handoff.

### Task 1: Reproduce and lock the observed failures

**Files:**
- Modify: `test/audit/public-audit-workflow.test.mjs`
- Modify: `test/public/public-control-plane.test.mjs`
- Modify: `test/http/public-control-plane.test.mjs`

- [x] Add a fixture where provider search returns unrelated establishments and assert that no candidate is confirmed as the restaurant.
- [x] Add a fixture where no corroborated domain exists and assert that SEO is `BLOCKED` with `SITE_NOT_CONFIRMED`.
- [x] Add assertions that the public request preserves the underlying audit `PARTIAL` status.
- [x] Run the focused audit/public tests and resolve the mismatch.

### Task 2: Correct provider result qualification

**Files:**
- Modify: `src/audit/public-audit-workflow.mjs`
- Modify: `src/public/public-control-plane.mjs`
- Test: `test/audit/public-audit-workflow.test.mjs`, `test/public/public-control-plane.test.mjs`

- [x] Keep raw provider results internal and add the smallest deterministic qualification needed to reject candidates that do not match the selected establishment and city.
- [x] Confirm a domain only when it is explicitly supplied or corroborated by an allowed source; otherwise preserve `SITE_NOT_CONFIRMED` and do not crawl.
- [x] Make keyword and competitor modules report `PARTIAL` or `BLOCKED` when the provider returns no usable items, rather than treating an empty response as useful success.
- [x] Propagate the final audit status into the public request; do not convert an audit `PARTIAL` into public `SUCCEEDED`.
- [x] Run the focused audit/public tests; result PASS.

### Task 3: Make GMB and final reports materially distinct and truthful

**Files:**
- Modify: `src/audit/public-audit-workflow.mjs`
- Modify: `src/public/public-control-plane.mjs`
- Test: `test/audit/public-audit-workflow.test.mjs`, `test/http/public-control-plane.test.mjs`

- [x] Render the GMB report from the GMB stage status, not the whole run status, so a ready GMB report does not say `RUNNING`.
- [x] Render the final report with separate sections for GMB observations, site/SEO status, keywords, competitors, recommendations, and explicit limits; omit unobserved result lists rather than filling them.
- [x] Include only facts backed by the normalized module data and evidence already present in the run.
- [x] Keep the final report `PARTIAL` when the site is unconfirmed or a required module is unavailable.
- [x] Add assertions proving the GMB and final HTML have different headings and module content.
- [x] Run the focused report tests; result PASS.

### Task 4: Add truthful progress for the final report

**Files:**
- Modify: `src/public/public-control-plane.mjs`
- Modify: `app/demo.html`
- Modify: `app/demo.mjs`
- Modify: `app/demo.css`
- Test: `test/http/public-control-plane.test.mjs`

- [x] Expose the real final-report stage/checkpoint state while the asynchronous continuation is running.
- [x] Add one compact progress treatment for the final report using the existing Ancrage palette and a finite, non-looping transition; the state remains understandable without animation and respects `prefers-reduced-motion`.
- [x] Show the next real state when the report is partial, blocked, or ready; do not show a completed state before the final report is persisted.
- [x] Verify the public page in the browser at the tested desktop viewport; no horizontal overflow was observed. Additional tablet/390 px sweep remains a follow-up QA check.
- [x] Run the focused HTTP and UI contract tests; result PASS.

### Task 5: Verify lifecycle visibility in the cockpit

**Files:**
- Modify: `app/app.mjs`
- Modify: `app/api.mjs` only if an existing route wrapper is missing
- Test: `test/http/public-control-plane.test.mjs`, relevant cockpit contract tests

- [x] Keep a public audit-only request out of `Runs` and `Dossiers` until its lifecycle creates those objects.
- [x] Ensure `À traiter` lists a `DemoRequest` immediately after valid preparation e-mail, including `INCOMPLETE` preparation.
- [x] Ensure `Runs` and `Dossiers` list the generated local objects only after the complete checklist starts the pipeline; existing integration coverage confirms the pipeline boundary.
- [x] Existing integration coverage covers audit-only, preparation-incomplete, and pipeline-started states.
- [x] Refresh the cockpit and verify the observed `À traiter` result against the live UI/API-backed state.

### Task 6: Full validation and independent review

**Files:**
- No production file changes unless a validation failure identifies one.

- [x] Run `node --test` and require all tests to pass (`95/95`).
- [x] Run syntax checks for changed JS modules; `npm run check` was already passing before the final module checks.
- [x] Keep the existing local server on `127.0.0.1:4173` untouched and start a corrected validation instance on `127.0.0.1:4174`.
- [x] Use one test establishment and record the observed GMB state, site confirmation, keywords, competitors, final report status, and budget in the runtime result.
- [x] Verify the public flow, final report, and `À traiter` in the browser; `Runs`/`Dossiers` lifecycle is covered by the integration suite.
- [x] Compare the independent Terra review with measured results and resolve the confirmed identity/checkpoint gaps.
- [x] Report changed files, tests, remaining external-provider limitations, and explicitly state that no commit was created.
