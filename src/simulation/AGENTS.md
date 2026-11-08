# simulation
Périmètre : ce dossier et ses enfants immédiats. Simulation du parcours dossier → audit → contenu → site → qualité.
Entrée : dossier, siteSpec, défauts simulés, moteur injecté. Sortie : workflow, step outputs, artefacts et quality gate.
Identifier les données synthétiques. Préserver ordre des étapes et contrats ; ne pas remplacer une mesure fournisseur par une fixture.
Vérifier : `rtk proxy node --test test/simulation/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
