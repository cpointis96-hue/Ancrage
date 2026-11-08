# providers
Périmètre : ce dossier et ses enfants immédiats. Adaptateurs HTTP, registre fournisseurs, magasins de secrets.
Entrée : providerId, secretRef, modèle, requête bornée. Sortie : réponse normalisée, usage/coût/état ou erreur fournisseur.
Garder clés hors navigateur, journaux et données métier. Injecter le magasin de secrets pour le serveur ; Keychain reste un adaptateur de développement. Ne pas assimiler une erreur réseau à un appel gratuit.
Vérifier : `rtk proxy node --test test/providers/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
