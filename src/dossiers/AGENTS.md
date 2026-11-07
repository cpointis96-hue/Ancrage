# dossiers
Périmètre : ce dossier et ses enfants immédiats. Dossiers établissement et actifs.
Entrée : profil, menu, photos data URL, source/ID. Sortie : dossier validé, liste, actif binaire ou erreur.
Valider tailles, types d’image, droits et IDs. Garder stockage atomique et ouverture optionnelle ; préserver chemins d’actifs persistés.
Vérifier : `rtk proxy node --test test/dossiers/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
