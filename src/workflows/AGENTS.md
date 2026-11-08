# workflows
Périmètre : ce dossier et ses enfants immédiats. Validation des graphes, exécution des étapes, checkpoints, décisions.
Entrée : définition/version, input, implémentations et registres injectés. Sortie : run-manifest, step-runs, événements, artefacts, décision opérateur.
Valider dépendances et contrats. Figer versions au démarrage. Préserver reprise et états ; ne pas présenter une simulation comme une mesure réelle.
Vérifier : `rtk proxy node --test test/workflows/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
