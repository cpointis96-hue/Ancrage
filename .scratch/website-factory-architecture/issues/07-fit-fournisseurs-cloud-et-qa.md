# Les fournisseurs candidats satisfont-ils les contraintes du MVP ?

Parent: ../map.md
Type: research
Status: resolved

## Question

À partir des documentations officielles et tarifs actuels, vérifier le fit, les limites, les coûts et les contraintes de Cloudflare Workers/Hono, Workflows, Queues, R2, Turnstile, Neon, Playwright, Lighthouse et Axe pour : intake public, jobs asynchrones, génération/rendu, QA, stockage, budgets et fonctionnement Mac éteint.

Capturer les limites qui peuvent invalider ou modifier l'architecture provisoire, avec sources primaires et date de vérification.

## Comments

## Decision provisoire

Le MVP évite tout abonnement mensuel fixe obligatoire. La stack cible reste Cloudflare Workers + Hono, R2, Queues/Workflows, Turnstile/rate limiting, avec Neon PostgreSQL serverless comme base relationnelle candidate. Chaque fournisseur doit être activé seulement avec un budget, un plafond opérationnel et une possibilité de désactivation.

## Answer

La recherche officielle du 27 août 2026 confirme le fit architectural pour un intake public qui doit fonctionner Mac éteint : Workers porte les routes courtes, R2 les binaires, Neon les métadonnées minimales, et Queues/Workflows la reprise asynchrone. Les alertes de dépense Cloudflare et Neon ne sont pas des coupe-circuits ; le `Control Plane` doit donc bloquer ses propres appels optionnels et produire un `CostEvent` par consommation.

Playwright reste réservé aux tests contrôlés avec des binaires de navigateur gérés explicitement ; Lighthouse fournit des audits indicatifs et Axe automatise une partie de la couverture WCAG, sans remplacer la revue humaine. Ces outils ne sont pas une preuve de disponibilité commerciale tant que les runs d'intégration, quotas, restauration et budgets ne sont pas mesurés.

Preuves : [`95-cloudflare-neon-prix-limites-restauration.md`](../research/95-cloudflare-neon-prix-limites-restauration.md), [Playwright browsers](https://playwright.dev/docs/browsers), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview), [axe-core](https://github.com/dequelabs/axe-core). Les gates d'exécution restent ouvertes.
