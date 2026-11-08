# geography
Périmètre : ce dossier et ses enfants immédiats. Autocomplétion Google Places et résolution établissement.
Entrée : input/countryCode/mode ou identifiant Place, fournisseurs et secrets injectés. Sortie : suggestions ou établissement ; SUCCEEDED/PARTIAL avec cause.
Préserver token de session, champs demandés, pays et types observés. Ne pas déduire une activité précise d’un type générique.
Vérifier : `rtk proxy node --test test/geography/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
