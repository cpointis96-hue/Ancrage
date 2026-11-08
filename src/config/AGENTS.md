# config
Périmètre : ce dossier et ses enfants immédiats. Registres de prompts, contrats, workflows, templates, profils CLI.
Entrée : ID, brouillon, expectedHash ; activation par versionId. Sortie : brouillon hashé, version immuable, référence active ou erreur.
Valider références avant activation. Préserver versions actives et brouillons personnalisés. Garder ouverture de ressources optionnelle.
Vérifier : `rtk proxy node --test test/config/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
