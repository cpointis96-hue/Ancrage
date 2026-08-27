# Quel vertical slice réel prouve l'audit SEO ?

Parent: ../map.md
Type: task
Status: open

## Action

Sélectionner un petit jeu de sites autorisés et documentés couvrant : restaurant vitrine, WordPress, site multilingue, site JavaScript, erreurs SEO volontaires, blocage du crawl et site sans données structurées.

## Mesures

- exactitude du rapprochement établissement/domaine ;
- durée et coût par profil ;
- taux de crawl terminé ou partiel ;
- findings déterministes attendus vs détectés ;
- affirmations IA reliées à une preuve ;
- temps de revue humaine ;
- ouverture et compréhension du rapport ;
- erreurs de livraison et suppression des données.

## Gate

Aucune commercialisation de l'audit avant un vertical slice reproductible, avec accord de crawl, logs, budget, rapport et suppression vérifiés.

## Progression — 27 août 2026

Un pré-slice local déterministe est implémenté dans `src/audit/seo-audit.mjs`, `src/audit/site-crawler.mjs`, `src/audit/seo-audit-service.mjs` et `src/audit/audit-report.mjs`. Le registre et les routes locales ajoutent la persistance du résultat et du rapport sous un identifiant d’audit, avec rechargement vérifié par test HTTP. Il couvre l’analyse HTML, le même-origin, les limites de pages/octet, les cibles privées, les redirections privées, les états `PARTIAL` et un rapport HTML échappé. Les tests couvrent les sept profils synthétiques demandés dans `test/audit/vertical-slice.test.mjs`.

Cette progression ne ferme pas l’issue : aucun site réel, provider, `CostEvent`, GMB, restauration, suppression ou mesure commerciale n’a été exécuté. La preuve contractuelle est détaillée dans [`docs/spec/05-audit-local-vertical-slice-v1.md`](../../../docs/spec/05-audit-local-vertical-slice-v1.md).
