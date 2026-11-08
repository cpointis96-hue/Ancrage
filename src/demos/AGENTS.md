# demos
Périmètre : ce dossier et ses enfants immédiats. Publication privée des sites de démonstration.
Entrée : runId ou token. Sortie : lien /demo/<token>, contenu, expiration ou révocation.
Exiger run réussi et décision autorisée. Respecter TTL et révocation ; servir uniquement les artefacts autorisés.
Vérifier : `rtk proxy node --test test/demos/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
