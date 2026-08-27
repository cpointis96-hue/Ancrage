# Compact Configuration UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Configuration lighter to scan while preserving every existing workflow setting, data connection, and file-backed resource.

**Architecture:** Keep the current API calls, state object, draft readers, and persistence formats unchanged. Replace only the workflow editor's always-expanded form with compact step summaries, conditionally revealed fields, and explicit input/output resource links.

**Tech Stack:** Vanilla ES modules, HTML templates, CSS, Node.js built-in test runner.

**Spec:** User-approved compact configuration direction in this task.

## Global Constraints

- Do not change configuration schemas, API routes, filenames, registry behavior, or run behavior.
- Every existing step field remains editable after opening its relevant disclosure.
- Input and output references remain visible and accessible on every workflow step.
- Provider, model, and prompt controls appear only for AI steps.
- Preserve usable desktop, tablet, and 390 px layouts without horizontal overflow.

---

### Task 1: Compact workflow step presentation

**Files:**

- Modify: `app/app.mjs`
- Modify: `app/styles.css`
- Test: `test/ui/contracts.test.mjs`

**Interfaces:**

- Consumes: existing `workflowStepEditor`, `readWorkflowForm`, `api.workflows`, `api.templates`, `api.contracts`, `api.cliProfiles`, and `api.providers`.
- Produces: unchanged workflow draft shape consumed by `api.saveWorkflow`.

- [ ] Write assertions that the workflow editor has explicit compact step sections and input/output resource links.
- [ ] Implement a summary header and disclosure for each step, retaining existing `data-step-field` controls for draft reading.
- [ ] Show AI-specific fields only when the step kind is `ai`, then update their visibility when the kind changes.
- [ ] Present input and output refs as compact file links, while retaining their full editable fields inside the disclosure.
- [ ] Add restrained layout rules for compact rows, details, and narrow viewports.
- [ ] Run `rtk npm test` and inspect Configuration at desktop, tablet, and 390 px.
- [ ] Commit the scoped UI change.
