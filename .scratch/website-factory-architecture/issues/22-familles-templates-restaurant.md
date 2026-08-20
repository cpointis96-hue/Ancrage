# Combien de familles de templates restaurant faut-il pour le MVP ?

Parent: ../map.md
Type: prototype
Status: open

## Question

Concevoir un petit prototype comparant plusieurs familles visuelles de pages restaurant, toutes rendues depuis le même `SiteSpec` et avec les mêmes données. Tester la différence perceptible entre les familles, la lisibilité mobile, le menu, les photos, les CTA et la capacité à éviter l'effet « site cloné ».

Le prototype doit explorer au minimum : restaurant généraliste, adresse gastronomique, bistrot/café et restaurant touristique ou familial. Il ne s'agit pas encore de produire les templates définitifs.

## Décision attendue

Fixer le nombre initial de familles, les composants communs, les variations autorisées par le contenu et les limites de liberté laissées à l'IA. Le renderer doit rester déterministe et les versions précédentes doivent rester reproductibles.

## Comments

## Decision provisoire

Le MVP part sur trois familles visuelles : `Local & chaleureux`, `Premium gastronomique` et `Tropical & expérience`. Elles partagent le même `SiteSpec`, les mêmes composants fondamentaux et un renderer déterministe. Le prototype reste à réaliser pour vérifier la différence perceptible, la lisibilité mobile et l'absence d'effet cloné.

Prototype : [templates-prototype.html](../prototypes/templates-prototype.html), variantes `?variant=a`, `?variant=b`, `?variant=c`.

## Deferred

Les variantes produites sont rejetées comme direction visuelle. Le choix des templates est retiré du chemin critique et sera repris plus tard avec un agent UI dédié. Aucun style de ce prototype ne doit être promu en production.
