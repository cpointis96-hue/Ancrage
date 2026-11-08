# internet
Périmètre : ce dossier et ses enfants immédiats. Recherche de domaines via workflows et fournisseurs.
Entrée : requête, runs/store ou providers/adapters/secretStore/fallback injectés. Sortie : run ou candidates.
Distinguer candidat et disponibilité vérifiée. Le fallback reste non vérifié. Garder appels externes derrière les adaptateurs.
Vérifier : `rtk proxy node --test test/internet/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
