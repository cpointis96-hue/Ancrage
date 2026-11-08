# Vérification

## Commandes reproductibles

```sh
npm run check
npm test
npm run dev
```

Le contrôle couvre syntaxe des modules, JSON et liens locaux. Les tests couvrent stockage, budgets, versions, audits, provenance, dossiers, workflows, API, génération synthétique et reprise. Les tests HTTP nécessitent une écoute loopback autorisée.

## Résultats du 8 novembre 2026

- `npm test` : 205 tests réussis, aucun échec, un test Neon facultatif ignoré. L’écoute loopback est autorisée pour les tests HTTP ; les 13 erreurs `listen EPERM` observées dans le sandbox ne se reproduisent pas hors sandbox.
- `npm run check` : 111 modules JavaScript, 27 fichiers JSON et 89 liens locaux vérifiés après réunion des historiques local et GitHub.
- Deux tests de régression vérifient la conservation des textes pendant une navigation ou une actualisation retardée, puis la récupération après une erreur de chargement.
- Les sept destinations du cockpit ont été parcourues à 1280, 768 et 390 px, sans débordement horizontal. La barre mobile s’adapte au nombre de boutons au lieu d’en masquer après le sixième.
- `npm run preview:audits` : six cas synthétiques HTML/PDF générés, sans appel fournisseur. Le HTML a été contrôlé à 1280 et 390 px : quatre sections présentes, aucune référence interne cassée et aucun débordement. Le PDF de référence a été rendu et inspecté visuellement.
- Un rapport réel existant a été ouvert dans le cockpit hébergé : données, sources et limites explicites visibles. Son statut PARTIAL reste présenté comme tel.
- Sorties générées, données runtime et secrets restent exclus de Git. La fusion préserve aussi les guides, exemples et captures ajoutés sur GitHub depuis les autres chats.

## Limites

Cette recette n’a déclenché aucun nouvel audit payant et ne transforme pas les audits partiels existants en audits complets. Le test Neon ignoré ne constitue pas une preuve de reprise d’un worker en production. Les essais réels et les limites du parcours hébergé sont consignés dans les travaux actifs.
