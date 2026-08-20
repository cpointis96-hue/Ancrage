# Que peut faire l'opérateur après l'arrêt à T+1h ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 13-critere-acceptation-demo.md

## Question

Après un hard timeout, quelles actions sont autorisées depuis le cockpit : consulter uniquement, relancer l'étape échouée, reprendre depuis un checkpoint, régénérer avec un budget supplémentaire, modifier les données, demander des informations au restaurateur, ou abandonner la démo ?

Chaque action devra préciser son coût potentiel, son idempotence, sa nécessité de confirmation humaine, son effet sur les versions et son message au prospect.

## Answer

Une `DemoGeneration` qui atteint `T+1h` devient immuable et reste consultable pour l'audit. Elle n'est ni rouverte ni modifiée silencieusement.

Toute reprise est une nouvelle `DemoGeneration` liée au même `DemoIncident` et à une `RecoveryAction` explicite. Cette nouvelle tentative reçoit sa propre deadline, son propre budget, ses propres logs et son propre résultat QA.

La reprise exige une confirmation humaine. Une réussite technique ne clôt pas l'incident : seule une nouvelle `AcceptanceReport` positive peut rendre la démo présentable.

Les actions opérateur doivent rester distinctes : consulter, annoter, corriger les données, demander des informations, reprendre, régénérer depuis le début ou abandonner. Chaque action doit conserver son auteur, sa justification, son coût prévu et son résultat.

## Comments

- Accord du propriétaire : une tentative qui dépasse une heure s'arrête ; la reprise doit préserver l'historique et ne pas réécrire la tentative initiale.
## Comments
