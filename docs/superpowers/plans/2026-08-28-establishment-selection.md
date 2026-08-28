# Sélection d’établissement Google Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de sélectionner un établissement Google Places, de déduire automatiquement son pays et sa ville, et de proposer un parcours manuel progressif si l’établissement est absent.

**Architecture:** Le formulaire public commence par une recherche d’établissement. Une sélection conserve le `placeId` et demande uniquement les détails d’adresse nécessaires. Le cas absent ouvre un panneau inline avec une adresse structurée ; les deux branches créent le même audit, avec une identité Google ou manuelle.

**Tech Stack:** HTML/CSS/JavaScript natif, Node.js ESM, API Google Places (New), tests `node --test`.

**Spec:** `docs/spec/08-demo-locale-et-branches-pauvres-v1.md`

## Global Constraints

- Le paiement et les questions juridiques restent hors du parcours de démo.
- Les pays et villes restent limités à la configuration de démonstration France et Sri Lanka lorsqu’ils sont demandés dans le parcours manuel.
- Aucun secret ne doit être écrit dans le dépôt ou renvoyé par une API publique.
- La sélection Google est obligatoire dans la branche Google ; l’adresse structurée est obligatoire dans la branche manuelle.
- Les détails Google demandés sont limités à l’identité et aux composants d’adresse nécessaires.

---

### Task 1: Étendre l’adaptateur Google Places

**Files:**
- Modify: `src/providers/http-adapters.mjs`
- Test: `test/providers/http-adapters.test.mjs`

**Interfaces:**
- Consumes: `secret`, `placeId`.
- Produces: `googlePlaces.autocomplete({ secret, input, countryCode, mode })` and `googlePlaces.details({ secret, placeId })`.

- [x] **Step 1: Write the test** for an establishment autocomplete request and a minimal Place Details field mask.
- [x] **Step 2: Run the provider test and verify it passes.**
- [x] **Step 3: Implement `mode: 'establishment'` and `details` using the Places (New) REST endpoints.**
- [x] **Step 4: Run the provider test and verify it passes.**

### Task 2: Add identity and address service behavior

**Files:**
- Modify: `src/geography/google-places-autocomplete.mjs`
- Modify: `src/http/router.mjs`
- Test: live `/api/places/autocomplete` and `/api/places/details` endpoint checks

**Interfaces:**
- Consumes: provider autocomplete/details adapters and `placeId`.
- Produces: normalized establishment suggestions and `{ name, placeId, countryCode, countryLabel, cityLabel, address }`.

- [x] **Step 1: Implement and verify** normalized establishment suggestions and detail extraction.
- [x] **Step 2: Implement the normalized service and `GET /api/places/details`.**
- [x] **Step 3: Run the local endpoint tests and verify they pass.**

### Task 3: Replace the public demo form with the two branches

**Files:**
- Modify: `app/demo.html`
- Modify: `app/demo.mjs`
- Modify: `app/demo.css`
- Test: `test/http/demo-workbench.test.mjs` and browser verification on `app/demo.html`

**Interfaces:**
- Consumes: `/api/places/autocomplete`, `/api/places/details`, `/api/demo/workbench/audits`.
- Produces: selected Google identity or manual structured address payload.

- [x] **Step 1: Implement** establishment selection, country/city autofill, and manual fallback expansion.
- [x] **Step 2: Implement** the visible name search, inline fallback panel, and branch-specific validation.
- [x] **Step 3: Preserve** the audit CTA and progress/result behavior after either valid branch.
- [x] **Step 4: Verify** the live Google branch and the manual branch through the local surface/API.

### Task 4: Persist the selected identity in the demo audit

**Files:**
- Modify: `src/demo/demo-workbench.mjs`
- Modify: `docs/spec/08-demo-locale-et-branches-pauvres-v1.md`
- Test: `test/demo/demo-workbench.test.mjs`

**Interfaces:**
- Consumes: `identity` with `source: 'google-places'` or `source: 'manual'`.
- Produces: audit profile with normalized identity and partial status when Google identity is unavailable.

- [x] **Step 1: Implement** persistence for both identity sources and manual address validation.
- [x] **Step 2: Keep site preparation unstarted.**
- [x] **Step 3: Run the focused demo tests and verify they pass.**

### Task 5: Full verification

**Files:**
- Test: all existing tests

- [x] **Step 1: Run `npm test`.**
- [x] **Step 2: Run `npm run check` and `git diff --check`.**
- [x] **Step 3: Run the local browser flow for a Google establishment and the local API flow for the manual fallback.**
- [x] **Step 4: Confirm provider health, autocomplete response, audit result, and absence of secrets in project files.**
