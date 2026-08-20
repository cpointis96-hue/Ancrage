# Index documentaire — stratégie SEO et Website Factory

Type: index de transmission aux specs et aux agents
Statut: référence

## Ordre de lecture

1. [87 — Parcours client de référence](87-parcours-client-reference.md)
2. [82 — Stratégie SEO Website Factory](82-seo-strategy-website-factory.md)
3. [83 — Catalogue des agents](83-catalogue-agents-seo-website-factory.md)
4. [84 — Routage des providers IA](84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md)
5. [85 — Pipeline audit vers site](85-pipeline-audit-vers-site-website-factory.md)
6. [86 — Stack SEO, skills et cockpit](86-stack-seo-skills-et-cockpit.md)

## Comment les documents s'incorporent aux anciens tickets

| Question de la carte | Document à lire | Tickets de détail |
|---|---|---|
| parcours commercial et ordre des étapes | 87 | 03, 04, 47, 48, 60, 67, 77, 78 |
| politique SEO et limites des promesses | 82 | 25, 26, 39, 46, 57 |
| rôles et contrats des agents | 83 | 23, 27, 50, 55, 56, 70, 77 |
| providers, modèles, fallbacks et budgets | 84 | 07, 38, 50, 51, 52, 53, 54 |
| enchaînement audit → SiteSpec → démo → production | 85 | 04, 06, 12, 13, 23, 59, 70, 77 |
| crawlers, stockage, APIs, skills et cockpit | 86 | 08, 09, 10, 20, 21, 68, 69, 74, 75, 76 |

## Règle pour les futures specs

Une spec doit citer d'abord `87` pour l'ordre client, puis au moins un document parmi `82–86` pour la partie technique. Les tickets numérotés restent la source des décisions détaillées, contraintes et recherches spécifiques. Si une spec contredit `87`, elle est bloquée jusqu'à décision explicite.

## Règle pour les agents

Un agent reçoit le document numéroté correspondant à son rôle, les contrats d'`agent-catalog` et les contraintes du ticket concerné. Il ne reçoit pas seulement un prompt général et ne peut pas déduire seul l'ordre commercial.

## Ce qui n'est pas artificiellement clôturé

La documentation est structurée. Les vérifications externes — coûts, quotas, licences, sécurité SSRF, RPO/RTO, prototypes, tests fournisseurs et vertical slice — restent ouvertes dans la carte jusqu'à preuve réelle.
