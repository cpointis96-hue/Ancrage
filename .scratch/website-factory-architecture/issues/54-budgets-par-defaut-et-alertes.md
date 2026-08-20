# Quels budgets par défaut et quelles alertes pour le routage IA ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir les budgets par défaut du MVP : appel, étape, génération de démo, prospect, journée et mois. Définir les alertes à 50 %, 80 % et 100 %, ainsi que les actions : continuer, réduire de modèle, mettre en pause ou demander confirmation.

Les valeurs doivent être modifiables depuis le cockpit et versionnées comme une configuration. Les budgets commerciaux ne doivent pas être confondus avec les plafonds techniques du fournisseur.

## Recommandation

Commencer avec des budgets très conservateurs, alertes à 50/80/100 %, arrêt dur à 100 %, et confirmation manuelle pour toute augmentation. Le routage peut choisir un modèle moins coûteux lorsque la qualité minimale reste garantie, mais ne doit jamais augmenter silencieusement le budget.

## Comments

## Decision

Le MVP démarre avec des budgets par défaut conservateurs, configurables depuis le cockpit. Les alertes sont fixées à 50 %, 80 % et 100 % ; 100 % déclenche un arrêt dur ou une confirmation explicite. Les budgets seront recalibrés à partir des coûts réels observés, jamais par augmentation silencieuse.
