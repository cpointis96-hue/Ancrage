# Brief UX et périmètre

## Résultat recherché

Permettre à l'opérateur de piloter une Website Factory complexe sans console opaque, et permettre à un prospect de comprendre la valeur de l'audit sans être noyé par la technique.

La qualité UX se mesure par la compréhension et la capacité d'agir, pas par le nombre de fonctions affichées.

## Surfaces prioritaires

### Cockpit opérateur — mode `Operate`

Interface privée, principalement utilisée sur le Mac de l'opérateur. Elle doit donner une sensation d'outil développeur macOS compact : peu de décoration, hiérarchie forte, panneaux inspectables et actions réversibles.

Jobs principaux :

- voir ce qui nécessite une intervention ;
- synchroniser les dossiers reçus pendant l'absence du Mac ;
- lancer ou reprendre un run ;
- inspecter les étapes, sources, prompts, configurations et coûts ;
- corriger une configuration ;
- vérifier les gates QA ;
- valider ou refuser une démo.

### Site public — modes `Persuade` puis `Read`

Interface publique Mobile First. Elle doit être accueillante, pédagogique et progressive.

Jobs principaux :

- comprendre la promesse ;
- identifier un établissement avec nom + ville ;
- voir l'audit dès qu'une restitution est disponible ;
- compléter seulement les informations manquantes ;
- demander la préparation du site au moment prévu ;
- fournir l'e-mail pendant la préparation ;
- consulter ensuite la démo privée.

## Invariants non négociables

- Le parcours de `87-parcours-client-reference.md` ne doit pas être réordonné.
- Aucun paiement avant la démo.
- Aucun e-mail avant le clic « Préparer mon site ».
- Aucune génération réelle sans e-mail valide.
- Aucune démo présentée sans validation opérateur.
- Un état partiel reste explicitement `PARTIAL`.
- Une absence de fiche GMB n'est jamais présentée comme une preuve d'absence.
- Les faits, hypothèses, suggestions, preuves et limites restent séparés.

## Ce qui est explicitement exclu maintenant

- design final des sites clients ;
- catalogue final de templates ;
- perfectionnement des audits SEO ;
- réglage fin des prix et budgets ;
- application native macOS ;
- administration publique du cockpit ;
- chatbot capable d'agir sur un run.
