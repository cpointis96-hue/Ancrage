# http
Périmètre : ce dossier et ses enfants immédiats. Serveur HTTP, routes et sérialisation.
Entrée : requête/réponse Node, URL, app injectée, staticRoot. Sortie : réponse JSON/HTML/PDF/binaire avec code HTTP.
Préserver routes, codes, limites des corps, vérification Origin, CSP et confinement des fichiers. Le serveur actuel est local ; ne pas l’exposer publiquement sans séparation/authentification des routes privées.
Vérifier : `rtk proxy node --test test/http/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
