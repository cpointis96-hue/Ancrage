# system
Périmètre : ce dossier et ses enfants immédiats. Ouverture de ressources sur le poste opérateur.
Entrée : cible, reveal. Sortie : fonction d’ouverture optionnelle, Promise ou null hors macOS.
Garder cette capacité optionnelle et réservée au cockpit. Aucun audit hébergé ne doit en dépendre. Ne jamais interpréter la cible comme du shell.
Vérifier : `rtk proxy node --test test/system/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
