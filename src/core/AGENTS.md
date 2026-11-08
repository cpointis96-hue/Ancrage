# core
Périmètre : ce dossier et ses enfants immédiats. Stockage atomique, erreurs, IDs, validation JSON.
Entrée : chemin relatif, texte/Buffer/JSON, expectedHash/immutable ; schéma + valeur. Sortie : hash/previousHash/path, valeur validée ou erreur typée.
Refuser traversées et liens hors racine. Garder permissions 0700/0600, fsync, rename, préconditions et versions immuables.
Vérifier : `rtk proxy node --test test/core/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
