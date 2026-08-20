# SEO Strategy — Website Factory

Type: strategic reference for humans and AI
Status: Wayfinder reference; external verification gates remain open

## 1. Commercial invariant

The product sells a visible result before payment. The prospect receives useful local SEO value, then a personalized demo, then decides whether to pay for production.

The strategy must never turn into a promise of first position, guaranteed traffic, guaranteed indexing, or guaranteed revenue. It promises a sourced diagnosis and a technically solid, useful local SEO foundation.

The exact client order is defined in [87-parcours-client-reference.md](87-parcours-client-reference.md). This document explains the SEO work behind that order.

## 2. SEO layers

### A. Establishment and local identity

Inputs: selected city, restaurant name, candidate GMB records, address when needed, public sources, supplied facts.

Outputs: `EstablishmentMatch`, source list, confidence, conflicts, chosen identity or `LOCAL_PREVIEW_WITHOUT_GMB`.

Rules:

- A city must be selected from structured suggestions.
- A strong unique match may continue automatically while showing the fiche.
- Multiple matches require explicit confirmation.
- No match does not prove that no GMB fiche exists.

### B. GMB audit

Inspect only authorized public information in the MVP: identity consistency, category, address/phone/hours, description, photos where usage is permitted, menu/link, reviews as observable signals, missing opportunities, and limitations.

The GMB audit is shown as soon as its checkpoint is valid. It is not hidden until the technical SEO audit finishes.

### C. Technical site audit

Use deterministic measurements first: availability, status codes, redirects, crawlability, indexability, titles, descriptions, canonicals, headings, internal links, images, structured data, sitemap, robots, mobile rendering, performance, accessibility, security headers, and broken links.

Screaming Frog is an internal crawler only where its license and execution terms permit the intended workflow. Otherwise use the internal bounded crawler plus Lighthouse/Playwright and document the reduced scope.

### D. Search intent and keywords

Identify local search intents rather than generating a giant keyword list. Distinguish:

- restaurant/category intent;
- cuisine and signature-dish intent;
- location, neighborhood, attraction, beach, landmark, or tourism intent;
- booking, menu, opening-hours, contact, and visit intent.

Every keyword recommendation must retain language, location, source/method, confidence, intent, and whether it is observed, calculated, or hypothesized.

### E. Competitors and local market

The MVP compares a bounded set of direct competitors selected from three important local intents. The current working decision is five direct competitors. Compare only useful dimensions: distance/area, cuisine, price signal, local profile, site, menu, content, technical visibility, and clear opportunities.

Do not call this a complete market study. The report is a bounded local visibility and competitor snapshot.

### F. SEO site creation

The site uses the audit and enrichment as evidence for:

- information architecture;
- homepage positioning;
- menu and signature dishes;
- history/positioning when supplied and verified;
- visit/contact/reservation information;
- useful local or tourism pages only when the restaurant has a real relationship to the place;
- titles, descriptions, headings, internal links, structured data, image metadata, sitemap, robots, and performance.

No artificial city pages, keyword stuffing, invented history, invented dishes, fake reviews, or unsupported local claims.

## 3. Evidence contract

Each important item is classified as:

- `OBSERVED` — directly sourced;
- `CALCULATED` — produced by a deterministic rule or metric;
- `AI_INTERPRETED` — explanation or grouping grounded in findings;
- `SUGGESTED` — proposal requiring review;
- `HYPOTHESIS` — useful idea not yet verified;
- `CONFLICT` — sources disagree;
- `UNKNOWN` — not established.

Critical facts also carry source, retrieval date, confidence, rights status, and language/market context.

## 4. Report progression

1. `CITY_SELECTED` and `EstablishmentMatch` are validated.
2. GMB work and technical/SEO branches run under bounded budgets.
3. `GMB_REPORT_READY` displays the first useful result.
4. `SEO_REPORT_IN_PROGRESS` remains visible with real checkpoints.
5. `FINAL_REPORT_READY` combines GMB and SEO in a readable report.
6. `Préparer mon site` requests the e-mail before real generation.

## 5. Quality gates

The final site must pass data/provenance, copy, SEO, mobile/visual, accessibility, security, cost, and link/CTA gates. `BLOCK` prevents presentation. `WARN` is visible to the owner and requires acceptance or correction. Agent agreement is not evidence.

## 6. Skills used by phase

- `research`: external facts, provider terms, SEO standards, licenses, and current limits.
- `domain-modeling`: vocabulary, state boundaries, evidence contracts, and decision records.
- `prototype`: report, public journey, cockpit, and progressive states before production UI.
- `browser:control-in-app-browser`: inspect and validate visible public flows where a browser session is required.
- deterministic code and test tools: parsing, crawling, metrics, rules, schema validation, and rendering checks.

Skills support the workflow; they do not replace the Control Plane or become hidden business logic.
