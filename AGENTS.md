# Project Agent Instructions

## Agent skills

### Issue tracker

Issues and specs live as local Markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context domain documentation uses `CONTEXT.md` at the repository root and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

## Current phase

This project is currently in product discovery and architecture planning.

Use Wayfinder as the primary planning methodology until the Wayfinder map is sufficiently resolved.

Do not implement the production application unless explicitly requested or unless a Wayfinder prototype ticket requires a minimal prototype.

Do not invoke competing planning methodologies such as Superpowers brainstorming or other planning systems during the Wayfinder phase unless explicitly requested.

## Working principles

- Communicate with the user in French.
- Keep technical identifiers, filenames, commands, API names, and upstream skill names unchanged.
- Persist important decisions, assumptions, rejected alternatives, and unresolved questions in project artifacts instead of relying only on conversation memory.
- Prefer deterministic solutions over AI when AI is unnecessary.
- Prefer primary documentation when researching technical claims.
- Do not perform destructive or irreversible actions without explicit confirmation.
- Keep project instructions concise. Add nested AGENTS.md files only when the codebase structure later justifies them.
