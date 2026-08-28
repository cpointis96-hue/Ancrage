# Bounded local SEO research implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement task by task. Steps use checkbox syntax.

**Goal:** Produce a factual, useful local SEO audit without irrelevant keyword leakage or unbounded provider spend.

**Architecture:** Google Places remains the source for business identity and coordinates. An explicitly configured OpenAI step returns only a small JSON query plan, constrained by observed category candidates. DataForSEO executes that plan through the existing direct adapter, under one per-audit ledger. Deterministic qualification ranks and labels results; it never manufactures metrics, categories, or competitors.

**Tech Stack:** Node.js ESM, existing provider/keychain registries, OpenAI Chat Completions adapter, DataForSEO HTTP adapter, node:test.

**Spec:** `docs/spec/06-public-audit-workflow-local-pre-slice-v1.md`

## Global Constraints

- Credentials remain exclusively in the existing secret store.
- Public audits have a hard DataForSEO ceiling of USD 0.50 by default.
- Free DataForSEO location/language resolution runs before billed endpoints.
- The OpenAI planner has a 700-token completion ceiling and a USD 0.05 configured step envelope.
- Only observed data and provider output may appear as facts in a report.

### Task 1: Add a visible, versioned research-planner configuration

**Files:**
- Create: `fixtures/defaults/contracts/seo-research-plan.schema.json`
- Create: `fixtures/defaults/prompts/local-seo-research-planner.md`
- Create: `fixtures/defaults/workflows/local-seo-research.json`
- Modify: `src/app.mjs`
- Test: `test/config/prompt-registry.test.mjs`

- [ ] Add a strict JSON contract with `category` and 1 to 6 query objects.
- [ ] Seed an editable French prompt that permits only supplied category candidates and requires JSON output.
- [ ] Seed and activate the single OpenAI `research-plan` workflow step with model, prompt, contract, time and dollar envelope.
- [ ] Verify the configuration appears as an active prompt/workflow without overwriting an existing user draft.

### Task 2: Bound OpenAI generation and execute the configured planner

**Files:**
- Create: `src/audit/seo-research-planner.mjs`
- Modify: `src/providers/http-adapters.mjs`
- Modify: `src/app.mjs`
- Test: `test/audit/seo-research-planner.test.mjs`
- Test: `test/providers/http-adapters.test.mjs`

- [ ] Pass `maxOutputTokens` from a workflow step to the OpenAI Chat Completions `max_completion_tokens` request field.
- [ ] Resolve the active workflow and active prompt version before a planner call.
- [ ] Require OpenAI provider readiness through the provider registry; return a structured partial result if unavailable.
- [ ] Validate the returned JSON against the active contract and discard any category or query outside observed candidates, locality, and name constraints.
- [ ] Persist only normalized plan and execution metadata, never credentials or raw model text.

### Task 3: Replace literal-city keyword rejection with evidence-ranked selection

**Files:**
- Modify: `src/audit/seo-qualification.mjs`
- Modify: `src/audit/public-audit-workflow.mjs`
- Test: `test/audit/seo-qualification.test.mjs`
- Test: `test/audit/public-audit-workflow.test.mjs`

- [ ] Derive category candidates from primary Google Places category only; retain generic Google technical types as non-display metadata.
- [ ] Use the AI plan when valid, otherwise use a deterministic brand/category/locality fallback.
- [ ] Run one bounded DataForSEO keyword-ideas call (limit 50), then keyword overview for at most 12 ranked candidates.
- [ ] Keep relevant brand, category-local, and category-intent keywords even when the phrase lacks the town; reject clear off-topic or other-city candidates with a recorded reason.
- [ ] Change the default audit ledger from USD 2.00 to USD 0.50 and stop optional calls when its reservation cannot be authorized.

### Task 4: Make report evidence legible

**Files:**
- Modify: `src/audit/public-audit-report.mjs`
- Test: `test/audit/public-audit-workflow.test.mjs`

- [ ] Display the observed business category once, rather than raw Google technical types.
- [ ] Show each keyword's evidence class and scope without calling an unverified keyword local.
- [ ] State the planner/data limitations truthfully when no evidence is available.

### Task 5: Verify the exact journey

**Files:**
- Modify: `docs/guides/configurer-workflows-prompts.md`

- [ ] Document the editable prompt, workflow step, completion ceiling, and per-audit DataForSEO ceiling.
- [ ] Run `npm test`, `npm run check`, static HTTP/loopback checks, and a visible public-report path.
- [ ] Inspect `git diff --check`, staged content, and commit only the verified files on `main`.
