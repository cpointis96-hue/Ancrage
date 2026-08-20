# Comment ouvrir une intervention Codex sûre depuis le cockpit après un timeout ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Étudier, dans la documentation officielle pertinente de Codex et de l'application, les possibilités et limites d'un bouton du cockpit local qui ouvre une intervention avancée avec le contexte d'une `Demo` interrompue : identifiant, logs, étape bloquée, erreurs, screenshots, `SiteVersion`, données nécessaires et actions autorisées.

Déterminer ce qui peut être transmis sans exposer de secrets ni de données inutiles, comment éviter un handoff ambigu ou non traçable, et comment l'intervention revient dans le Control Plane. Distinguer une simple ouverture de contexte d'une exécution automatique d'actions.

Cette recherche devra utiliser `openai-docs` lorsque le ticket sera traité.

## Answer

La voie recommandée est : cockpit local → bridge/backend local → `Codex App Server` ou `Codex SDK` → reprise ou création d'un thread → démarrage d'un tour avec le contexte du timeout.

Le paquet de handoff peut contenir le `DemoIncident`, l'étape bloquée, la chronologie, les logs filtrés, les artefacts, les contraintes et la demande d'intervention. Il ne doit pas contenir de secrets ni autoriser automatiquement une relance ou une mutation irréversible.

Les deep links publics `codex://` ou `chatgpt://`, les URLs avec prompt prérempli et la création directe d'un chat dans Projects ne sont pas documentés officiellement. Le bouton devra donc ouvrir ou appeler un bridge local contrôlé, pas dépendre d'un deep link supposé.

Voir le [rapport de recherche sourcé](../research/14-handoff-codex-apres-timeout.md).

## Comments
## Comments
