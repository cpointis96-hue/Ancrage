# Website Factory — contexte produit

Ce fichier fixe le vocabulaire stable du produit. Il ne décrit ni l'implémentation ni les choix de fournisseur.

## Termes canoniques

- **Prospect** : personne qui demande ou consulte un audit et peut ensuite demander une démo.
- **Établissement** : activité locale analysée, par exemple un restaurant.
- **Dossier** : informations, sources, photos et coordonnées nécessaires à l'analyse ou à la génération.
- **Audit** : restitution factuelle et sourcée de l'état local, Google Business Profile et SEO.
- **Rapport** : présentation compréhensible d'un audit, avec faits, preuves, limites et priorités.
- **Run** : exécution versionnée d'un pipeline, avec progression, événements, checkpoints et résultat.
- **Agent** : rôle spécialisé qui produit une contribution structurée ; il ne décide pas seul de l'état métier.
- **Provider** : moteur ou service d'exécution sélectionné par une politique de routage.
- **Configuration** : ensemble versionné d'un prompt, d'un schéma, d'un provider et de règles d'exécution.
- **Cockpit** : interface privée de l'opérateur pour observer, configurer, synchroniser, reprendre et valider.
- **Site public** : interface accessible au prospect pour obtenir la valeur de l'audit et demander une démo.
- **Démo** : site personnalisé navigable avant paiement, présenté uniquement après QA et validation opérateur.
- **Validation opérateur** : décision explicite qui autorise la présentation d'une démo au prospect.
- **État bloquant** : état qui interdit la suite tant qu'une condition critique n'est pas satisfaite.

## Frontières

- Le **Control Plane** possède les états, autorisations, budgets, provenance et transitions.
- Les agents fournissent des contributions ; ils ne redéfinissent pas le parcours commercial.
- Le cockpit et le site public sont conçus maintenant. Les sites clients générés sont une surface ultérieure.
- Le style macOS/Codex est une direction d'interface pour le cockpit, pas un changement de plateforme vers SwiftUI.
