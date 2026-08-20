# Comment configurer les agents depuis le cockpit sans perdre la traçabilité ?

Parent: ../map.md
Type: prototype
Status: resolved

## Question

Prototyper une interface locale de registre des agents intervenant dans le processus. Pour chaque agent, afficher au minimum : nom, description courte compréhensible, place dans le workflow, déclencheur, entrées, sorties attendues, modèle/fournisseur, règles, budget, statut actif/inactif, version et derniers résultats.

L'opérateur doit pouvoir modifier et sauvegarder la configuration, mais une nouvelle configuration ne doit pas réécrire l'historique : chaque exécution doit conserver la version de configuration utilisée. Les changements sensibles doivent pouvoir être prévisualisés, validés et restaurés.

Le prototype doit distinguer configuration éditable, contrats structurés, secrets, exécution, résultats et activation d'une version. Les secrets et credentials ne doivent jamais apparaître dans le navigateur.

## Décision attendue

Définir la surface minimale du registre, les champs réellement modifiables au MVP, la publication/activation d'une version et les confirmations nécessaires avant qu'une modification influence une nouvelle démo.

## Answer

Tout est configurable depuis un cockpit compact : instructions, description, position et ordre, modèle, fournisseur, budget, activation, contrats attendus et paramètres autorisés. Chaque sauvegarde crée une version ; une exécution conserve la version utilisée. L'interface doit privilégier une vue synthétique, des panneaux de détail, une validation avant activation et un retour arrière rapide. Les secrets restent hors de l'interface navigateur.

Une configuration activée s'applique uniquement aux nouvelles démos. Les démos déjà en cours conservent la version de configuration avec laquelle elles ont démarré, sauf intervention explicite et traçable de l'opérateur.

## Comments
