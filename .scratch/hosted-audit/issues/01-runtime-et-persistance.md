# Runtime et persistance de production

Type: task
Status: open

## Avancement vérifié — 7 novembre 2026

- `src/core/postgres-store.mjs` implémente le contrat texte/JSON/binaire et le journal append-only dans Neon, avec préconditions de hash et transactions verrouillées côté PostgreSQL.
- `createApp` accepte un store injecté. Le ledger de coûts utilise les verrous transactionnels du store lorsqu’ils sont disponibles.
- Test réel Neon passé dans un namespace isolé, nettoyé en fin de test : lectures entre instances, conflit d’écriture, immutabilité, PDF binaire, append concurrent, rollback, plafond partagé et réhydratation des réservations.
- Le démarrage concurrent du schéma est sérialisé. Le pilote `pg` est fixé dans le lockfile.
- Le Control Plane utilise des leases PostgreSQL pour ses démarrages lorsque le store hébergé est injecté : acquisition exclusive, renouvellement, libération par propriétaire et récupération après expiration. L’horloge de référence est celle de PostgreSQL ; aucun PID local n’est utilisé pour ces leases. Test réel à deux instances passé, avec expiration simulée et refus d’un ancien propriétaire. Les 19 tests du parcours public passent aussi.
- Le moteur d’observations conserve des checkpoints de crawl et d’analyse dans son run et propose `publicAudits.resume(id)`. Deux tests d’interruption vérifient la réutilisation d’une analyse enregistrée et l’absence de répétition d’un appel dont l’issue est ambiguë. La publication PostgreSQL des artefacts et de leur référence dans le run est transactionnelle.
- Les audits PostgreSQL se créent atomiquement avec leur index et leur clé d’idempotence. `create(..., { defer: true })` persiste le travail sans lancer la collecte ; `resume` exécute sous lease renouvelée. Les transactions vérifient le propriétaire avant mutation, ce qui empêche un worker évincé d’écrire ou de réserver un nouveau coût. Test réel passé : deux créations simultanées donnent le même audit, une seule reprise concurrente aboutit, et une autre instance récupère le PDF final.
- `workPending({ limit })` traite les runs d’observations RUNNING conservés dans Neon ; les runs terminés sont exclus. À raccorder à un déclencheur hébergé authentifié.
- Le Control Plane diffère les audits PostgreSQL et expose `refreshAudit` pour publier leurs rapports sans doublon. `app.workPublicAudits()` réconcilie les demandes, traite un audit persistant, puis met à jour les rapports publics. Les demandes publiques se créent atomiquement avec leur index et leur clé d’idempotence ; la décision d’identité est sérialisée. Test réel Neon passé jusqu’à la lecture du PDF public par une autre instance.
- `src/hosted-app.mjs` fournit un bootstrap sans dossier runtime, exige DATABASE_URL, utilise Neon et les secrets serveur OPENAI_API_KEY/GOOGLE_PLACES_API_KEY et sérialise les seeds/migrations de configuration.
- Bootstrap complet vérifié sur Neon dans un namespace temporaire nettoyé : initialisation terminée, zéro demande initiale, worker sans travail. Le premier seed via connexion distante depuis le Mac prend plusieurs minutes ; mesurer le démarrage dans la région de déploiement et éviter de dépendre d’un premier seed dans une requête courte.
- Restent ouverts : point d’entrée HTTP public sécurisé, déclencheur hébergé authentifié, configuration des providers actifs, migration des données actives, synchronisation GitHub et preuve du parcours déployé. La branche DataForSEO ne propose pas encore de reprise. Aucun déploiement n’utilise encore ce stockage.

## Question

Quelle combinaison d’hébergement Node, stockage durable, jobs reprenables et gestion de secrets assure l’exécution complète sans Mac ? Comparer les contraintes réelles du moteur avant choix ; valider reprise, verrouillage et concurrence. Inclure la persistance chiffrée, révocable et isolée par client des autorisations OAuth Cloudflare nécessaires à la publication de ses propres sites. Aucun fournisseur d’hébergement applicatif n’est imposé par le nettoyage.
