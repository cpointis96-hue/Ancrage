# Jusqu'où développer les pages locales et pages de plats ?

Parent: ../map.md
Type: research
Status: open

## Question

Définir une architecture SEO locale qui puisse proposer plusieurs pages utiles — menu, plats signatures, cuisine, histoire, quartiers/communes réellement servis, accès, événements — sans fabriquer vingt pages quasi identiques uniquement pour capter des mots-clés.

Chaque page doit avoir une intention utilisateur réelle, des informations spécifiques vérifiables, une place dans l'arborescence, des liens internes, un CTA et une décision `index`/`noindex`. Les pages générées à partir de données faibles, traduites mécaniquement ou simplement corrélées à une commune doivent rester privées, fusionnées ou exclues de l'index.

## Décision attendue

Fixer une règle de génération : nombre de pages par défaut, seuil de qualité pour indexer, preuves locales nécessaires, contrôle humain, règles de canonicalisation et stratégie de mise à jour.

## Sources à privilégier

Google Search Central et documentation structurée officielle ; compléter par des tests sur un petit dataset réel.

## Comments

- Règle provisoire retenue : produire beaucoup de contenu pour la démo est acceptable, mais n'indexer en production que les pages qui passent le seuil de valeur, d'originalité, de provenance et de navigation utile. Le détail sera aligné sur le ticket SEO professionnel.

## Decision provisoire

Le système peut proposer de nombreuses pages pour la démo, mais la production n'indexe que les pages qui passent un seuil de valeur, d'originalité, de provenance, de navigation utile et d'intention réelle. Les pages faibles sont fusionnées, privées ou `noindex`.
