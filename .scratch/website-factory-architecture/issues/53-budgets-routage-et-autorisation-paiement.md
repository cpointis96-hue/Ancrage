# Comment autoriser le paiement cloud sans perdre le contrôle ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir les limites qui autorisent un fallback cloud automatique : budget maximum par appel, par étape, par `DemoGeneration`, par prospect, par jour et par fournisseur. Définir aussi le comportement lorsqu'un appel dépasserait le plafond ou lorsqu'un fournisseur renvoie un coût inconnu.

Le cockpit doit montrer le coût estimé avant activation d'une politique, le coût réel après exécution et le motif du choix du fournisseur. Toute dépense doit être liée au `CostEvent` correspondant.

## Recommandation

Autoriser le fallback uniquement dans une enveloppe préconfigurée. Le modèle le moins cher qui satisfait les capacités requises est sélectionné ; un modèle premium exige une validation distincte. Si le coût est inconnu ou dépasse le plafond, l'étape s'arrête et demande une intervention.

## Comments

## Decision

Les budgets sont configurables par agent, étape, `DemoGeneration`, prospect, fournisseur et période, avec un plafond global. Toute dépense produit un `CostEvent`. Un dépassement, un coût inconnu ou une estimation absente bloque l'exécution et demande une intervention explicite.
