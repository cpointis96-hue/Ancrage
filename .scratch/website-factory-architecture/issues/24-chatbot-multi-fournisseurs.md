# Quel chatbot et quel routage local/cloud pour le MVP ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Étudier un chatbot accessible à la personne et configurable par l'opérateur entre modèles locaux et fournisseurs API cloud. Déterminer le périmètre : expliquer l'audit et les leviers, répondre sur le site et les offres, ou modifier directement le site.

Comparer les contraintes de routage, confidentialité, conservation, coût, disponibilité, streaming, structured outputs, outils autorisés, prompt injection, quotas et traçabilité. Le chatbot ne doit jamais devenir la source de vérité ni publier une modification sans validation adaptée.

## Décision attendue

Définir une interface de fournisseur indépendante, les cas où le local est privilégié, le fallback cloud, les budgets, les logs et la frontière entre conversation informative et action métier.

## Answer

Pour le MVP, le chatbot est une aide gratuite visible sur la landing page, représentée par la mascotte en bas à droite. Il reçoit uniquement la documentation validée du service et du site afin d'aider un visiteur à comprendre l'offre et le parcours. Il ne modifie pas le site, ne lance pas de workflow, ne devient pas la source de vérité et ne promet pas de résultat SEO.

La configuration des fournisseurs, des documents autorisés, des limites, des coûts et des versions reste dans le cockpit opérateur. La gratuité est une contrainte de coût à vérifier côté fournisseur ; elle ne doit pas être interprétée comme une disponibilité ou un quota garanti sans recherche.

## Sources à privilégier

Documentation officielle des fournisseurs effectivement retenus et standards de sécurité pertinents.

## Comments

## Decision

Le chatbot mascotte de la landing page répond uniquement à partir de la documentation validée du service, explique les offres et guide le formulaire. Il ne modifie pas une démo, ne promet pas de classement et n'exécute aucune action métier.
