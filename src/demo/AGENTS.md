# demo
Périmètre : ce dossier et ses enfants immédiats. Workbench de préparation et aperçu de démonstration.
Entrée : profil établissement, URL, menu, photos ; store et auditRunner injectés. Sortie : record, rapport, aperçu HTML.
Valider entrées et échapper contenu HTML. Garder limites de collecte et états explicites. Préserver les routes consommatrices existantes.
Vérifier : `rtk proxy node --test test/demo/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
