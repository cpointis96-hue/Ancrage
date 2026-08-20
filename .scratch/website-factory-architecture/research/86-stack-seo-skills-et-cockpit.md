# SEO Stack and Skills

Type: stack and operating reference
Status: architecture reference; vendor and license gates remain explicit

## 1. Deterministic foundation

- structured city index for mandatory city selection;
- approved establishment/source lookup;
- bounded site discovery and URL validation;
- HTML/parser and HTTP checks;
- internal crawl for a deterministic baseline;
- Screaming Frog only where license and operating terms allow it;
- Lighthouse/Playwright for performance, mobile, accessibility, and rendering checks;
- rule engine for indexability, metadata, links, images, structured data, local consistency, and page conditions;
- schema and provenance validation;
- deterministic PHP/static renderer;
- screenshot and link checks.

## 2. Data and infrastructure

- Neon PostgreSQL: metadata, state, configuration versions, contacts, audit entities, costs, and events;
- R2/object storage: reports and required artifacts with lifecycle;
- encrypted local Mac archive: heavy crawl/export material, never the only source of truth;
- Cloudflare: public delivery, API boundary, queues/workflows, and controlled asynchronous work as verified;
- cockpit local on the operator Mac in MVP;
- private signed URLs for reports and demos;
- versioned `SiteSpec` and immutable build artifacts.

## 3. AI layer

The AI layer is subordinate to the deterministic layer. Use it for classification, grouping, explanation, prioritization, constrained copy, translation, and ambiguity — not for facts, parsing, cost accounting, security decisions, or unbounded page generation.

Provider connections and routing are defined in `ai-provider-routing.md`. Agent responsibilities are defined in `agent-catalog.md`.

## 4. Skills by phase

| Phase | Skills/tools | What they do |
|---|---|---|
| domain vocabulary | `domain-modeling` | preserve terms, entities, boundaries, and decisions |
| external facts | `research` | primary documentation, licenses, quotas, standards, prices |
| public browser checks | `browser:control-in-app-browser` | inspect visible authenticated/public behavior where needed |
| report/cockpit UX | `prototype` | test behavior, density, states, and comprehension before production |
| interface review | `apple-design`, `make-interfaces-feel-better` | review mobile/native clarity and interaction polish when UI work is authorized |
| deterministic analysis | parser, crawler, Lighthouse, Playwright, schema and test tooling | produce evidence and gates |
| AI execution | configured `AgentDefinition` + `AIRoutingPolicy` | execute only approved structured contributions |

Skills are not hidden business rules. A skill can guide work or validation, but the Control Plane owns state and authorization.

## 5. Verification gates

Before activation of any external component, verify current documentation, price, quota, license, data policy, timeout, retry behavior, and shutdown path. A successful test request is not sufficient evidence for production readiness.

Open research gates remain tracked in the Wayfinder map: provider limits, Screaming Frog licensing, SSRF isolation, RPO/RTO, pricing, prototypes, and vertical slices.
