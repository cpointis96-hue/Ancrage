# Les fournisseurs candidats satisfont-ils les contraintes du MVP ?

Parent: ../map.md
Type: research
Status: open

## Question

À partir des documentations officielles et tarifs actuels, vérifier le fit, les limites, les coûts et les contraintes de Cloudflare Workers/Hono, Workflows, Queues, R2, Turnstile, Neon, Playwright, Lighthouse et Axe pour : intake public, jobs asynchrones, génération/rendu, QA, stockage, budgets et fonctionnement Mac éteint.

Capturer les limites qui peuvent invalider ou modifier l'architecture provisoire, avec sources primaires et date de vérification.

## Comments

## Decision provisoire

Le MVP évite tout abonnement mensuel fixe obligatoire. La stack cible reste Cloudflare Workers + Hono, R2, Queues/Workflows, Turnstile/rate limiting, avec Neon PostgreSQL serverless comme base relationnelle candidate. Chaque fournisseur doit être activé seulement avec un budget, un plafond opérationnel et une possibilité de désactivation.
