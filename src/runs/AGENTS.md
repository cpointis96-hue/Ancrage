# runs
Périmètre : ce dossier et ses enfants immédiats. Registre d’artefacts et journal de coûts.
Entrée : runId/kind ; réservation stepId/provider/estimatedCost puis authorizationId/actualCost. Sortie : descripteur/contenu ; état du budget.
Préserver verrouillage, réhydratation, seuils et plafond. Réconcilier chaque autorisation. Ne jamais exposer les secrets dans les artefacts.
Vérifier : `rtk proxy node --test test/runs/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
