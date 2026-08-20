# Quelles sorties IA doivent obligatoirement être approuvées ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir la frontière entre une sortie IA qui peut continuer automatiquement et une sortie qui doit être relue ou approuvée avant de modifier une Demo, un SiteSpec, une traduction, une page SEO ou une publication.

## Recommandation

Approbation obligatoire pour : identité, adresse, horaires, prix, allergènes, droits des images, claims commerciaux, traduction publiée, pages indexables, données structurées sensibles, achat de domaine, publication production et toute dépense non prévue.

Automatisation possible pour : classification, extraction provisoire, brouillon de copy, suggestions de mots-clés, liens internes proposés, résumé d'audit et optimisation technique déterministe — à condition que la sortie reste marquée comme brouillon ou passe les validations prévues.

## Décision attendue

Fixer les gates par type de sortie, l'acteur qui approuve et la possibilité de déléguer certaines validations à un agent reviewer indépendant.

## Decision

Le propriétaire ne relit pas chaque étape et n'est pas dans la boucle pendant la construction normale. Il voit le livrable final dans le cockpit, avec son `AcceptanceReport`, juste avant sa présentation au prospect.

La présentation est impossible tant que tous les gates bloquants ne sont pas `PASS`. Une sortie IA peut donc progresser automatiquement si elle reste un brouillon, si elle est contrôlée par du code déterministe ou si elle passe une revue indépendante documentée. Une anomalie critique, une donnée sans provenance, un conflit non résolu, un droit d'utilisation inconnu ou un budget dépassé bloque la génération et alerte le propriétaire.

La validation finale du propriétaire reste obligatoire avant présentation, publication ou dépense irréversible. Elle devient une vérification de sécurité et de cohérence du livrable, pas une relecture manuelle de tout le pipeline.

Les agents ne peuvent jamais rendre une information vraie par consensus : les faits critiques doivent avoir une source, une date, une règle de confiance et un état `verified`, `provisional` ou `conflict`.

## Comments

Cette décision vise une automatisation maximale, mais « impossible qu'il y ait un problème » n'est pas une garantie réaliste. L'architecture doit viser le fail-closed : mieux vaut une démo bloquée et signalée qu'une démo présentée avec une adresse, un prix, une photo ou un avis douteux.

## Comments
