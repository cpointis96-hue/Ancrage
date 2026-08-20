# Quel point de reprise autoriser pour une nouvelle génération après timeout ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 15-politique-reprise-timeout.md

## Question

Après validation humaine d'un incident, la nouvelle `DemoGeneration` doit-elle repartir du dernier checkpoint validé, reprendre toute la génération, ou laisser l'opérateur choisir selon l'étape bloquée ?

Recommandation : reprendre depuis le dernier checkpoint validé lorsque celui-ci est idempotent et que ses données, artefacts et versions sont encore valides ; sinon redémarrer depuis un point antérieur explicitement choisi. Toute reprise reçoit une nouvelle deadline et un budget plafonné.

À préciser : quels checkpoints sont fiables, quelles étapes sont rejouables, comment invalider un artefact contaminé, et quand une nouvelle saisie du restaurateur est nécessaire.

## Answer

La nouvelle `DemoGeneration` reprend depuis le dernier checkpoint validé uniquement si ce checkpoint est idempotent, complet, traçable et encore compatible avec les données et la version du pipeline.

Sinon, l'opérateur choisit explicitement un point antérieur ou un redémarrage complet. Dans tous les cas :

- confirmation humaine obligatoire ;
- nouvelle `deadlineAt` selon la `DeadlinePolicy` ;
- nouveau budget explicite ;
- nouvelle tentative et nouveaux logs ;
- invalidation des artefacts contaminés ou devenus obsolètes ;
- nouvelle `AcceptanceReport` avant toute présentation.

La reprise ne réhabilite jamais la génération timeoutée d'origine.

## Comments

- Accord du propriétaire : reprendre depuis le dernier checkpoint fiable, avec confirmation humaine et limites explicites.
## Comments
