# Combien de relances et quel budget autoriser après timeout ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 16-point-de-reprise-apres-timeout.md

## Question

Après un timeout, combien de `RecoveryAction` de reprise sont autorisées, avec quel budget maximal par tentative et quel budget cumulé par `DemoRequest` ou `Demo` ?

Recommandation : confirmation opérateur obligatoire, une limite basse de tentatives, un budget additionnel explicitement affiché avant chaque relance, aucun dépassement silencieux et abandon ou demande d'informations lorsque la limite est atteinte.

À préciser : distinction entre retry technique gratuit, régénération complète coûteuse, correction de données, intervention Codex et nouvelle demande du restaurateur.

## Answer

Après un timeout, le système autorise **zéro relance automatique** et ne consomme aucun budget de récupération sans action humaine.

L'incident reste bloqué et le propriétaire reprend la main avec Codex pour finir lui-même. Cette intervention manuelle n'est pas une boucle de retry du workflow : elle est documentée comme `OperatorIntervention`/`CodexHandoff` et conserve le lien avec la génération timeoutée.

Toute éventuelle nouvelle génération ou action payante devra être déclenchée explicitement par le propriétaire, avec son propre budget, sa propre deadline et sa propre traçabilité.

## Comments

- Décision du propriétaire : « aucune [relance], je reprendrai la main avec Codex et finirai moi-même ».
## Comments
