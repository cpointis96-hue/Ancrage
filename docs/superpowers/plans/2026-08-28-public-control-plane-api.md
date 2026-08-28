# Public Control Plane API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the local, synthetic-contract HTTP surface defined by `docs/spec/07-api-control-plane-public-v1.md` without activating providers or changing the client-site simulation.

**Architecture:** Add one persistent `public-control-plane` registry responsible for opaque public requests, report visibility, `DemoRequest` preparation, checklist/asset gates, and idempotency. Add only the public routes to the existing router and inject the registry through `createApp`; synthetic report state is an internal test fixture method, never an HTTP capability.

**Tech Stack:** Node.js ESM, `node:http`, existing `AtomicStore`, existing `AppError` classes, Node test runner.

**Spec:** `docs/spec/07-api-control-plane-public-v1.md`

## Global Constraints

- The Control Plane remains the authority for public state and transitions.
- Public identifiers are opaque and responses contain no secrets, raw payloads, provider tokens, local paths, or plaintext email.
- `GMB_REPORT_READY` exposes the GMB HTML report but never the final PDF or `Préparer mon site`.
- A valid email may create an `INCOMPLETE` `DemoRequest`; no generation run starts before critical intake, five photo categories, known rights, and a gelable budget.
- No provider, payment, domain, publication, operator route, or `client-site-simulation.mjs` change is part of this tranche.

### Task 1: Build the persistent public Control Plane registry

**Files:**
- Create: `src/public/public-control-plane.mjs`
- Test: `test/public/public-control-plane.test.mjs`

**Interfaces:**
- Consumes: `AtomicStore` and `Idempotency-Key`-derived request fingerprints.
- Produces: `createPublicControlPlane({ store, clock, idFactory })` with `createRequest`, `getRequest`, `decideMatch`, `listReports`, `readReport`, `createPreparation`, `getDemoRequest`, `updateIntake`, `addAsset`, `start`, and test-only `seedSyntheticReport`.

- [x] Write tests for structured-city validation, request idempotency/conflict, match decisions, GMB/final report gates, valid/invalid email, incomplete preparation, five photo categories, known rights, and start authorization.
- [x] Run `node --test test/public/public-control-plane.test.mjs` and confirm the new tests fail before implementation.
- [x] Implement the registry with immutable report metadata, hashed idempotency records, opaque IDs, stable `nextAction` and sanitized response projections.
- [x] Run the focused registry test and confirm it passes.

### Task 2: Expose the public HTTP contract

**Files:**
- Modify: `src/http/router.mjs`
- Modify: `src/app.mjs`
- Test: `test/http/public-control-plane.test.mjs`

**Interfaces:**
- Consumes: the registry from Task 1 through `createRouter` and `createApp`.
- Produces: the routes in spec 07 sections 2 and 5, with `Idempotency-Key` forwarding and stable error envelopes.

- [x] Write HTTP tests for request creation/replay/conflict, report visibility before and after final readiness, preparation creation, intake update, asset metadata, and blocked/allowed start.
- [x] Run `node --test test/http/public-control-plane.test.mjs` and confirm the new route tests fail before wiring.
- [x] Wire `publicControlPlane` into `createApp` and add only `/api/public/...` branches to the router.
- [x] Map `AppError` details to `fieldErrors`, `retryable`, `nextAction`, and opaque `requestId` without leaking internal errors.
- [x] Run the focused HTTP test and confirm it passes.

### Task 3: Verify the complete existing suite and documentation boundary

**Files:**
- Modify: none unless test evidence requires a narrow correction.
- Test: existing `test/**/*.test.mjs`.

**Interfaces:**
- Consumes: the completed registry and routes.
- Produces: verified local API behavior and an explicit sandbox limitation record if loopback tests cannot bind.

- [x] Run `npm test`.
- [x] Confirm no test or implementation references `client-site-simulation.mjs` as part of the new public API.
- [x] Run `git diff --check` and inspect `git status --short --branch`.
- [x] Report passing tests, any pre-existing `listen EPERM`, changed files, and deferred gates.
