# Demo Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the local operator start from an establishment identity and generate a clearly non-commercial HTML site demo from supplied business facts; use a confirmed public domain when one is available.

**Architecture:** Add a separate `demo-workbench` service that calls the existing bounded `runSeoAudit` only when a confirmed public domain is available, persists the audit/report/site artifacts, and never calls DataForSEO or payment systems. The initial form starts with structured identity only; it never invents identity, address, menu, contact, photos, or rights.

**Tech Stack:** Node.js ESM, existing `AtomicStore`, existing bounded crawler and HTML report renderer, existing local HTTP router.

**Spec:** `docs/spec/07-api-control-plane-public-v1.md` and the demo-only clarification in the current user request.

## Global Constraints

- This is an operator demo surface, not a commercial workflow.
- Payment, `Account`, legal documents, domain registration, publication, GMB provider activation, and external credentials remain out of scope.
- A crawl happens only for a confirmed `http`/`https` domain and remains bounded by the existing crawler profile.
- Site output contains only supplied business facts and is marked `DEMO_ONLY` in metadata.

### Task 1: Implement and test the workbench service

**Files:**
- Create: `src/demo/demo-workbench.mjs`
- Test: `test/demo/demo-workbench.test.mjs`

- [x] Write tests with an injected fetcher for a real-shaped public HTML site, invalid/private domains, partial SEO results, escaped business facts, persisted report and site artifacts.
- [x] Run the focused test before implementation and confirm failure.
- [x] Implement bounded audit persistence and deterministic, escaped site rendering from supplied facts only.
- [x] Run the focused test and confirm pass.

### Task 2: Expose the local operator route

**Files:**
- Modify: `src/app.mjs`
- Modify: `src/http/router.mjs`
- Test: `test/http/demo-workbench.test.mjs`

- [x] Add `POST /api/demo/workbench/audits`, `GET /api/demo/workbench/audits`, and report/site artifact reads.
- [x] Keep the route local-server scoped and return explicit `PARTIAL` status when the audit is incomplete.
- [x] Run focused HTTP tests outside the sandbox when loopback binding is required.

### Task 3: Verify boundary and suite

- [x] Run `npm test`.
- [x] Confirm no provider, payment, legal, or `client-site-simulation.mjs` dependency was added.
- [x] Run `git diff --check` and inspect the final status.
