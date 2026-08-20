# SEO and Website Factory Reference Documentation Plan

> **For agentic workers:** This is a documentation-only plan. Do not implement the production application while the Wayfinder map remains open.

**Goal:** Consolidate the existing Wayfinder decisions into a readable, editable reference set covering SEO strategy, agents, AI providers, audit-to-site orchestration, stack, skills, costs, and cockpit controls.

**Architecture:** Keep the commercial client journey in `research/87-parcours-client-reference.md` as the invariant. Split technical detail by responsibility: SEO policy, agent contracts, provider routing, pipeline transitions, and stack/skills. Link each document back to existing issue tickets instead of duplicating unresolved vendor facts as decisions.

**Tech Stack:** Markdown; existing `CONTEXT.md`; `.scratch/website-factory-architecture/map.md`; Neon metadata; R2 reports/artifacts; encrypted local archives; deterministic parsers/rules; Screaming Frog where licensing permits; Lighthouse/Playwright; local Ollama/MLX endpoints; approved cloud APIs.

**Spec:** `.scratch/website-factory-architecture/research/87-parcours-client-reference.md` and `.scratch/website-factory-architecture/map.md`

## Global Constraints

- Do not reverse the client journey documented in `research/87-parcours-client-reference.md`.
- Do not request payment before the prospect sees the free demo.
- Request the e-mail at the `Préparer mon site` click, before real generation starts.
- Keep deterministic rules before AI interpretation.
- Never invent critical establishment, menu, location, rights, or SEO facts.
- Never silently fall back to an unknown, premium, cloud, or over-budget provider.
- Keep secrets out of prompts, reports, browser code, and logs.
- Treat unresolved vendor prices, licensing, quotas, and physical behavior as research or test gates, not settled facts.

### Task 1: SEO strategy

**Files:** Create `.scratch/website-factory-architecture/research/82-seo-strategy-website-factory.md`.

Capture the audit layers, evidence rules, local/tourism SEO policy, report states, branch without GMB, and site-creation principles.

### Task 2: Agent catalog

**Files:** Create `.scratch/website-factory-architecture/research/83-catalogue-agents-seo-website-factory.md`.

Define every agent role, input, output, dependency, allowed model class, evidence requirement, and forbidden behavior.

### Task 3: AI provider routing

**Files:** Create `.scratch/website-factory-architecture/research/84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md`.

Define `ProviderConnection`, `ModelProfile`, `AIRoutingPolicy`, token budgets, fallback rules, and the cockpit controls for OpenAI, OpenRouter, OmniRoute, Ollama, and MLX adapters.

### Task 4: Audit-to-site pipeline

**Files:** Create `.scratch/website-factory-architecture/research/85-pipeline-audit-vers-site-website-factory.md`.

Map audit outputs into `SiteSpec`, content, local pages, assets, renderer, QA, human approval, demo delivery, and later production conversion.

### Task 5: SEO stack and skills

**Files:** Create `.scratch/website-factory-architecture/research/86-stack-seo-skills-et-cockpit.md`.

Document the deterministic and AI stack, crawler alternatives, storage, APIs, internal skills, provider boundaries, and verification gates.

### Review

- Check every document against the client reference and `CONTEXT.md`.
- Search for contradictory phrases such as e-mail before intake, payment before demo, automatic presentation, or automatic premium fallback.
- Mark documentation gaps as explicit gates; do not silently resolve external facts.
