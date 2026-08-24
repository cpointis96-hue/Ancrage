# Architecture UX du cockpit

## Règle de conception

Le cockpit ne doit pas ressembler à un dashboard SaaS générique. Il doit ressembler à un outil de travail : une file de décisions, un contexte sélectionné et un inspecteur précis.

## Écran « À traiter »

Question à laquelle il répond : **qu'est-ce qui nécessite mon attention maintenant ?**

Ordre de priorité :

1. blocage sécurité, provenance ou plafond dur ;
2. synchronisation disponible ;
3. démo en attente de validation ;
4. run partiel ou repris ;
5. warning non bloquant.

Chaque ligne possède un statut textuel, une cause courte, l'âge et une action principale. Pas de compteur décoratif ni de graphique sans décision associée.

## Écran « Runs »

La ligne d'un run affiche : établissement, type, état, étape courante, dernière activité, version et action disponible.

Le détail est organisé en onglets courts :

- **Vue** : état, progression réelle, résultat et prochaine action ;
- **Étapes** : checkpoints et contributions ;
- **Preuves** : sources, hashes, URLs, QA ;
- **Coût** : estimation, réel, local/cloud, événements ;
- **Versions** : prompts, configuration, providers ;
- **Journal** : événements techniques filtrables.

Un onglet n'est conservé que s'il répond à une question différente. Les événements détaillés ne sont jamais imposés dans la vue principale.

## Écran « Configuration »

La configuration est organisée par intention, pas par fournisseur :

- rôle de l'agent ;
- étapes autorisées ;
- données acceptées ;
- provider et fallback ;
- prompt et schéma ;
- budget et seuils ;
- version active.

Une modification crée un brouillon prévisualisable. Elle ne modifie pas les runs en cours. Les secrets ne sont jamais affichés dans l'interface de contenu.

## Écran de validation

La validation finale est une décision unique, précédée d'un résumé :

- aperçu de la démo ;
- `PASS`, `WARN`, `BLOCK` ;
- provenance critique ;
- preuves QA ;
- limites connues ;
- coût et version ;
- actions : **Valider**, **Renvoyer en correction**, **Ouvrir le contexte local**, **Abandonner**.

« Envoyer au prospect » n'est disponible qu'après validation. Cette séparation est obligatoire.

## Synchronisation

La synchronisation est une action globale visible dans la barre d'outils, mais son détail reste dans « Système » : éléments trouvés, importés, déjà présents, rejetés, supprimés de R2 après accusé et erreurs reprenables.

Elle doit être idempotente et ne jamais masquer une importation partielle.
