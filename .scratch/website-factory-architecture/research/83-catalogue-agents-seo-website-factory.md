# Agent Catalog — SEO and Website Factory

Type: agent contracts
Status: reference architecture

## Contract shared by every agent

Each `AgentDefinition` has a version, purpose, inputs, output schema, allowed data policy, model class, budget, timeout, retry policy, evidence requirement, and reviewer. Each `AgentRun` records configuration version, provider/model, input references, output hash, cost, duration, errors, and validation.

Agents return structured contributions. They do not mutate the source of truth, publish, send e-mail, spend money, or promote a fact without a Control Plane transition.

## Agents and dependencies

| Agent | Inputs | Output | Depends on | Default execution |
|---|---|---|---|---|
| `CityResolver` | typed city text | city candidates and stable ID | none | deterministic/local index |
| `EstablishmentMatcher` | name, selected city, public candidates | `EstablishmentMatch` | city selected | deterministic first, small model only for ranking explanations |
| `GMBObserver` | confirmed/strong candidate | sourced GMB findings | match | deterministic/public-source rules |
| `AddressResolver` | address text | normalized address/coordinates | no-GMB branch | deterministic provider |
| `SiteDiscoverer` | name, city, fiche, address | `SiteCandidate` list | match/address | deterministic + bounded search |
| `CrawlOrchestrator` | authorized URL, crawl profile | `CrawlRun`, raw export refs | site candidate | controlled worker |
| `TechnicalSEOAnalyzer` | crawl resources and metrics | technical findings | crawl/metrics | deterministic |
| `ContentSEOAnalyzer` | pages, menu, supplied facts | content/intent findings | crawl/intake | deterministic + small classifier |
| `KeywordIntentAnalyzer` | city, category, language, observed search data | intents and keyword evidence | match/address/site | deterministic first, small model for grouping |
| `LocalCompetitorSelector` | intents, location, category | bounded competitor set | keyword/location | deterministic rules |
| `CompetitorAnalyzer` | competitor evidence | comparison findings | selected competitors | deterministic + small summarizer |
| `LocalMarketAnalyzer` | local area, intents, competitors | bounded local opportunity set | location/competitors | deterministic + small summarizer |
| `ProvenanceNormalizer` | all source records | normalized evidence refs | every branch | deterministic |
| `AuditReportComposer` | validated findings and limits | `SEOReport` | GMB/SEO branches | deterministic template + structured synthesis |
| `ReportExplainer` | approved findings | readable explanations | report data | small approved model |
| `BusinessProfileWriter` | verified facts and supplied story | business profile draft | intake/evidence | small model + schema gate |
| `ContentPlanner` | audit, intents, business profile | page/content plan | final report | deterministic + small model |
| `Copywriter` | approved plan and evidence | page copy drafts | content plan | local-small first |
| `Translator` | approved source copy, language | versioned translation | copy draft | local-small/cloud-small approved |
| `AssetCurator` | supplied assets and rights metadata | selected asset refs | photo intake | deterministic + vision only when allowed |
| `SiteSpecComposer` | plan, copy, assets, SEO rules | versioned `SiteSpec` | all site contributions | deterministic merge |
| `Renderer` | `SiteSpec`, template | build artifact | SiteSpec | deterministic |
| `SEOAcceptanceReviewer` | rendered build and findings | SEO gate evidence | renderer | deterministic |
| `CopyAccessibilityReviewer` | rendered build, copy, locale | copy/accessibility findings | renderer | deterministic + reviewer model where useful |
| `SecurityReviewer` | build, URLs, uploads, headers | security gate evidence | renderer | deterministic/security tooling |
| `CostReviewer` | all run events and budget | cost gate | every run | deterministic |
| `AcceptanceReportComposer` | all gates and warnings | `AcceptanceReport` | all reviewers | deterministic |

## Parallelism rules

After identity and data-policy checks, GMB observation, site discovery, site probing, and independent measurements may run in parallel. After normalization, findings by family may run in parallel. Site contributions may run in parallel only after the prospect clicks the CTA and supplies an e-mail.

No agent may declare a frontend checkpoint complete. The Control Plane validates contracts, evidence, budget, and transition state.

## Forbidden behavior

- no invention of facts;
- no silent provider escalation;
- no direct publication or e-mail sending;
- no arbitrary shell commands from public UI;
- no writing to another agent's source of truth;
- no unbounded crawl, keyword, competitor, or page generation;
- no agent consensus as proof;
- no retry after paid failure without explicit policy and budget.
