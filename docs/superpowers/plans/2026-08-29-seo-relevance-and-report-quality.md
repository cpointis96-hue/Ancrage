# SEO Relevance and Report Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public local SEO audit produce geographically relevant, business-grounded keyword and competitor shortlists with a readable, truthful report.

**Architecture:** Keep DataForSEO behind the existing adapter and cost ledger. Add a small deterministic qualification module that builds seeds from confirmed context, filters provider rows by local scope and business anchors, enriches only retained keywords, and classifies competitor evidence without promoting national Labs results to local facts. Extend the existing HTML report with compact, accessible tables and explicit states while preserving the current provenance and partiality contracts.

**Tech Stack:** Node.js ESM, built-in `node:test`, injected provider adapters, atomic JSON store, static HTML/CSS report renderer.

**Spec:** `docs/spec/02-audit-gmb-seo-borné.md`, `docs/spec/06-public-audit-workflow-local-pre-slice-v1.md`, `docs/research/open-seo-comparison-2026-08-29.md`.

## Global Constraints

- Preserve the current `main` checkout and all unrelated changes.
- Never expose credentials, raw provider payloads, or secrets in reports, logs, tests, or messages.
- Do not invent a category, specialty, locality, keyword, competitor, metric, cost, or completion state.
- Use free location/language resolution before paid calls and keep provider calls behind the existing adapter and ledger.
- Keep `SUCCEEDED`, `PARTIAL`, and `BLOCKED` truthful and preserve evidence hashes.
- Use the confirmed `placeId`/coordinates when available; do not treat a national Labs competitor as a local direct competitor.
- UI direction: compact Ancrage cockpit/report, one focal summary, restrained palette, no decorative metadata, no generic marketing copy.
- The report must reflow at desktop, tablet, and 390px with no horizontal overflow; all controls must be keyboard usable.

---

### Task 1: Add deterministic SEO qualification contracts

**Files:**
- Create: `src/audit/seo-qualification.mjs`
- Test: `test/audit/seo-qualification.test.mjs`

**Interfaces:**
- `buildSeoResearchPlan({ name, cityLabel, country, identity })` returns `{ seeds, anchors, locality, scope, reasons }`.
- `qualifyKeywordResults(result, plan)` returns `{ selected, rejected, sourceCount }` with normalized keyword fields, `intent`, `sourceSeed`, `localityMatch`, `businessMatch`, `priority`, and rejection reasons.
- `qualifyCompetitorResults(result, { targetDomain, selectedKeywords, locality })` returns deduplicated candidate rows with `scope: 'national-seo'`, evidence metrics, and no target-domain row.

- [x] **Step 1: Write failing tests** for accent-insensitive city matching, rejection of out-of-scope phrases such as `menu cantine à Lyon` for Teyran, rejection of terms without a local signal, preservation of missing metrics as `null`, seed construction from an observed category, and competitor deduplication/target exclusion.
- [x] **Step 2: Run the focused test** with `node --test test/audit/seo-qualification.test.mjs`; expect failure because the module does not exist.
- [x] **Step 3: Implement minimal pure functions** using normalized tokens, explicit locality matching, observed identity categories/types only, deterministic intent classification, no AI, and no fabricated fallback category.
- [x] **Step 4: Run the focused test** and require PASS.

### Task 2: Integrate the qualified research flow

**Files:**
- Modify: `src/audit/public-audit-workflow.mjs`
- Modify: `src/providers/http-adapters.mjs` to request confirmed Google Places category fields when details are fetched
- Modify: `src/geography/google-places-autocomplete.mjs` and `src/public/public-control-plane.mjs` only where the normalized identity contract needs to carry those observed fields
- Test: `test/audit/public-audit-workflow.test.mjs`, `test/providers/http-adapters.test.mjs`, `test/geography/google-places-autocomplete.test.mjs`

**Interfaces:**
- The workflow stores a bounded `researchPlan` and keyword `rejected` reasons internally without secrets or raw payloads.
- The idea call receives only qualified 1–5 seeds with the resolved Labs location/language.
- Overview and competitor calls receive only selected keyword strings; if none survive, they are not called and the stage is `PARTIAL` with an explicit cause.

- [x] **Step 1: Add failing workflow assertions** proving irrelevant keyword rows are absent, qualified rows retain provenance/metrics, overview/competitors use retained keywords, and no follow-on paid call occurs when the idea response has no local relevant rows.
- [x] **Step 2: Extend the Places field mask and identity normalization** to carry only observed category/type fields needed to build seeds; keep browser output bounded.
- [x] **Step 3: Replace fixed keyword normalization** with `buildSeoResearchPlan`, qualified ideas, selected-keyword hydration, and qualified competitor normalization. Preserve current adapter call names, ledger settlement, evidence snapshots, and idempotency.
- [x] **Step 4: Run focused audit, geography, and provider tests** and resolve only contract-related failures.

### Task 3: Build the report data view and renderer

**Files:**
- Modify: `src/audit/audit-report.mjs` or extract a focused report renderer only if the existing file cannot remain legible
- Modify: `src/audit/public-audit-workflow.mjs` only to pass the normalized report data already present in the run
- Test: `test/audit/public-audit-workflow.test.mjs`, relevant HTTP report tests

**Interfaces:**
- Final HTML contains a concise summary, separate SEO/keywords/competitors/limits sections, and tables driven only by normalized observations.
- Empty, partial, blocked, and unavailable states are explicit and do not render invented rows.
- Keyword rows show intent, locality, source, known metrics, priority, and rationale; competitor rows show type/scope, observed metrics, and corroboration state.

- [x] **Step 1: Add failing report assertions** for relevant keywords only, visible unknown metrics, competitor scope distinction, empty/partial states, and no secret/raw-payload leakage.
- [x] **Step 2: Implement the report structure** with a single focal header, restrained Ancrage palette, clear tables, readable line wrapping, and evidence/limits kept in their own section.
- [x] **Step 3: Add CSS states and responsive reflow** for tables at desktop, tablet, and 390px; use real links only, visible focus styles, and no hover-only interaction.
- [x] **Step 4: Run focused report tests** and inspect generated HTML for escaping and forbidden em-dash/UI noise.

### Task 4: Validate the actual workflow and visible report

**Files:**
- Test/inspect: existing HTTP and loopback test suites; no unrelated production files

- [x] **Step 1: Run `npm test` and `npm run check`.**
- [x] **Step 2: Run `git diff --check` and scan changed artifacts for credentials, raw payloads, and fabricated claims.**
- [x] **Step 3: Start or reuse the local preview and inspect the report at desktop, tablet, and 390px; verify no horizontal overflow, keyboard focus, and real report links.**
- [x] **Step 4: Confirm no DataForSEO live call was made by the test/preview validation unless explicitly started as a bounded run.**
- [x] **Step 5: Inspect exact staging content and commit only the scoped implementation plus tests and plan/report documentation on `main`, without push.**

## Self-review coverage

- Context and locality are handled before keyword qualification.
- The plan does not add a new provider, AI dependency, or silent fallback.
- Missing metrics remain unknown and local/national scope is explicit.
- Existing partiality, cost ledger, evidence, report persistence, and idempotency remain authoritative.
- UI work follows the existing Ancrage direction and is validated separately from backend tests.
