# Profil cockpit — Ancrage V1

Status: référence visuelle et comportementale de prototype
Surface: cockpit opérateur local
Prototype source: [`prototypes/sstr-direction/cockpit.html`](../../../prototypes/sstr-direction/cockpit.html)
Profil client associé: [`client-site.html`](../../../prototypes/sstr-direction/client-site.html)

## Rôle

Ce profil fixe la base du cockpit opérateur pour le MVP web local. Il reprend l'identité d'Ancrage — charbon, vert mousse, image de roche humide et `JetBrains Mono` — mais conserve une densité d'outil de travail : file de projets, run sélectionné, étapes, provenance et actions explicites.

Il ne transforme pas le cockpit en page marketing et ne remplace pas l'architecture UX ni les contrats du `Control Plane`.

## Structure de référence

1. **Navigation courte** — `À traiter`, `Runs`, `Dossiers`, `Configuration`, `Qualité`, `Système`.
2. **File de travail** — projets récents, URL complète, lien direct vers la démo, statut, progression et motif d'attente.
3. **Inspecteur contextuel** — projet sélectionné, URL, actions `Contexte local` et `Valider`, aperçu, état, étape, source et parcours d'exécution.
4. **Synchronisation** — action globale visible, état terminé/reprenable, aucun lancement implicite d'IA ou de génération coûteuse.

## Règles visuelles

- Police locale : `JetBrains Mono`, depuis `assets/JetBrainsMono[wght].woff2`.
- Fond charbon/vert très sombre ; accent mousse réservé aux actions positives, états terminés et focus.
- Image organique utilisée comme matière de profondeur et de contexte, jamais comme décoration qui masque une décision.
- Séparateurs fins, rayons courts, aucune grille de statistiques décorative, aucun faux flux d'activité.
- Les statuts restent lisibles par le texte et ne dépendent jamais uniquement de la couleur.
- Les liens de démo affichent l'URL complète et ouvrent une nouvelle cible avec `rel="noreferrer"`.

## Comportements déjà validés dans le prototype

- sélection d'un projet et mise à jour de l'inspecteur ;
- synchronisation locale avec retour d'état ;
- validation d'une démo avec changement d'état ;
- ouverture du contexte local simulée ;
- navigation latérale avec état actif ;
- rendu desktop et mobile sans débordement horizontal ;
- chargement réel de `JetBrains Mono`.

## Ce que la future spec doit encore ajouter

- états réels `EMPTY`, `LOADING`, `PARTIAL`, `WARN`, `BLOCK`, `READY_FOR_OWNER_REVIEW` et erreur reprenable ;
- coûts estimés/réels, budgets par étape/agent/provider et `CostEvent` ;
- versions de prompts, configurations figées et fichiers d'agents éditables ;
- provenance, hashes, preuves QA et journal de synchronisation ;
- reprise idempotente, arrêt contrôlé et frontière d'approbation humaine ;
- contrat API entre cockpit local et `Control Plane` cloud ;
- clavier, focus, zoom 200 %, lecteurs d'écran et tests d'accessibilité complets.

## Décision de portée

Ce fichier est le profil de référence du cockpit Ancrage V1 pour les prochains wireframes, la spec d'interface et les tests de vertical slice. Il ne constitue pas une autorisation de réutiliser les données fictives ou de mettre le prototype en production.
