# public
Périmètre : ce dossier et ses enfants immédiats. Demandes publiques, rapports progressifs, préparation et démarrage de démo.
Entrée : identité/ville/domaine, décision de correspondance, préparation, actifs, clé d’idempotence. Sortie : projection publique, nextAction, rapports, états de préparation/pipeline.
Garder transitions, contrôles de contrats et verrou de démarrage. Masquer chemins internes et emailHash. Ne lancer le pipeline qu’après validation des éléments requis. Le parcours audit doit fonctionner sans cockpit connecté.
Vérifier : `rtk proxy node --test test/public/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
