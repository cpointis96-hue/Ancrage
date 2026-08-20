# Que peut modifier Codex pendant l'intervention manuelle après timeout ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 17-limites-relance-et-budget-timeout.md

## Question

Après un timeout, Codex peut-il modifier et tester localement la `Demo` ou la `SiteVersion`, tandis que toute action externe ou irréversible — publication, envoi au prospect, achat, dépense, suppression ou mutation de données métier — exige une confirmation explicite du propriétaire ?

Recommandation : oui. Codex peut analyser, corriger, générer des fichiers de travail et exécuter des vérifications locales dans un périmètre contrôlé ; le propriétaire garde la décision finale sur la base de données, la publication, les messages, les coûts et les suppressions.

## Answer

La frontière est validée : Codex peut modifier et tester localement la `Demo` ou la `SiteVersion` dans le contexte de l'intervention, mais toute action externe ou irréversible exige une confirmation explicite du propriétaire.

Sont bloquées sans confirmation : publication, envoi au prospect, achat de domaine, dépense, suppression, mutation de données métier, changement de source de vérité et clôture de l'incident. Le `CodexHandoff` et l'`OperatorIntervention` restent traçables ; Codex ne peut pas les clôturer implicitement.

## Comments

- Accord du propriétaire : « oui » à la modification et aux tests locaux, avec confirmation explicite pour les effets externes ou irréversibles.
## Comments
