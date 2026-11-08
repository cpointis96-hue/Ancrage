# Prouver le parcours hébergé

Type: task
Status: open
Blocked by: 01, 02

## Vérifications réalisées

- Déploiements construits depuis GitHub ; domaine actuel `https://ancrage-pied.vercel.app`. Page publique, modules client et Google Places fonctionnels. Le nom du projet et du produit reste Ancrage ; `ancrage.vercel.app` est déjà utilisé par un autre site.
- Test réel de La Cigale à Nantes explicitement autorisé, plafond applicatif OpenAI 0,50 USD : demande `public-request-20261107150320-67df6a0a`, audit `audit-run-20261107150320-ee433b96`. Exécution hébergée terminée en PARTIAL, rapports HTML/PDF HTTP 200, PDF valide. Ledger : dépense IA 0 USD, réservations 0 ; les requêtes Google Places ne sont pas comptabilisées dans ce ledger.
- Causes vérifiées : clé OpenAI refusée HTTP 401 et redirection HTTP vers HTTPS bloquée par le crawler. Le correctif HTTPS du même hôte et le retest des providers refusés passent leurs tests. La variable OPENAI_API_KEY était absente lors du dernier contrôle des métadonnées Vercel ; correction utilisateur en attente.
- Connexion du projet existant à `cpointis96-hue/Ancrage` établie dans les réglages Git de Vercel. Le push du commit `2e4b54e` a déclenché automatiquement `dpl_9rSh4VHdUwUrGVVJwHac5qbqpRiY`, sans commande de déploiement manuel.
- Suite locale après corrections : 201 tests passent, 1 test Neon optionnel ignoré dans cette commande ; vérification statique passée. Les tests Neon réels ont été exécutés séparément au cours du raccordement.

## Essai avec clé corrigée

- Nouvelle clé et permissions vérifiées par le bootstrap Vercel : OpenAI healthy/enabled, plus d’erreur d’authentification. Déploiement `dpl_HefJyiDpSurXeqRVZHgsys9VpSgV` READY, commit `2e4b54e`.
- Même cible autorisée, nouvelle exécution `audit-run-20261107231927-399309fd`, demande `public-request-20261107231926-7c155e00`. Résultat final PARTIAL : 6 pages reçues, dont 2 bloquées ; analyse OpenAI réelle terminée avec AI_OBSERVATIONS_INSUFFICIENT. Aucun résultat complet revendiqué.
- Coût IA enregistré : 0,02528425 USD sur plafond 0,50 USD, réservation restante 0. Google Places reste hors de ce ledger.
- Rapports finaux HTML 8703 octets et PDF 9678 octets, HTTP 200 ; signature PDF valide. Demande sans cookie : HTTP 403. Le calcul et les artefacts sont hébergés dans Vercel/Neon.

Restent à prouver : parcours navigateur complet, interruption/reprise du worker déployé, accès opérateur et migration des configurations/données utiles encore locales. L’objectif d’autonomie complète n’est pas atteint.

## Question

Sur l’environnement retenu, déclencher un audit autorisé depuis le site avec le Mac éteint ; interrompre puis reprendre le worker ; vérifier rapport HTML/PDF, preuves, coûts et absence de duplication. Consigner les résultats réels et les limites.
