# Quelles exigences de sécurité et de conservation doivent contraindre l'architecture ?

Parent: ../map.md
Type: research
Status: resolved

## Question

À partir d'OWASP ASVS, des références OWASP adaptées aux systèmes IA et des documentations officielles pertinentes, établir les exigences MVP concernant formulaire, uploads, URLs utilisateur, SSRF, injections, prompt injection, secrets, outils d'agents, sandboxing, limites de dépenses, rate limiting, accès admin, audit trail, dépendances, backups, restore et suppression des données.

Séparer les exigences bloquantes avant spécification des contrôles pouvant être différés, en conservant les sources et la date de vérification.

## Comments

## Politique provisoire

Démo publique : 7 jours. Données de démo expirées : archivage interne limité. Photos non retenues : suppression rapide. Logs, coûts et preuves QA : conservation plus longue pour audit. Toute suppression sur demande est traitée selon les obligations applicables. Les durées exactes par pays restent à rechercher avant spécification.

La stratégie de sauvegarde prévoit des versions immuables, une sauvegarde quotidienne de la base, une réplication des médias importants, des tests réguliers de restauration et une action cockpit pour restaurer une version précédente. Les objectifs RPO/RTO et les fournisseurs restent à préciser par recherche technique.

## Research pointers

- `../research/61-fournisseurs-usage-based-neon-cloudflare.md`
- `../research/62-conservation-donnees-marches.md`
- `../research/63-rpo-rto-mvp.md`
- `../research/64-protocole-test-prix-restaurants.md`
- `../research/95-cloudflare-neon-prix-limites-restauration.md`
- `../research/96-cityindex-gmb-concurrence-conservation.md`
- `../research/97-pricing-et-cadre-legal-marches.md`

La contrainte financière est ajoutée aux gates : aucun fournisseur payant ne doit être activé sans budget explicite, suivi `CostEvent`, alerte et mécanisme d'arrêt ou de désactivation vérifié. Une limite d'alerte qui ne bloque pas réellement la consommation ne suffit pas à protéger le budget.

Les uploads acceptent uniquement des types et tailles autorisés, sont scannés et stockés isolément avec URLs temporaires. Les métadonnées sensibles peuvent être supprimées selon la politique choisie. Aucun fichier reçu ne doit être exécuté.

## Synchronisation cloud vers Mac

La `CloudIntakeInbox` est un tampon persistant chiffré, pas un cache navigateur. Les objets possèdent une clé de dossier non devinable, une taille maximale, un type autorisé, un hash, une date d'expiration et un statut de synchronisation. Le téléchargement vers le Mac exige une session cockpit authentifiée, des tokens courts, un curseur idempotent et une vérification de hash avant accusé de réception.

La suppression R2 est déclenchée uniquement après écriture locale atomique et validation du hash. Les erreurs, interruptions et divergences de hash conservent l'objet cloud et passent l'intake en `SYNC_RETRY` ou `SYNC_BLOCKED`; aucune suppression optimiste n'est autorisée. Un lifecycle de secours traite les objets orphelins après expiration.

## Décision consolidée — 27 août 2026

Les exigences documentaires MVP sont résolues autour de six barrières : validation serveur et limites, uploads isolés avec magic bytes, crawler fail-closed avec SSRF/DNS/revalidation, sorties échappées et outils explicitement autorisés, secrets hors navigateur/journaux, et ledger de budget avec arrêt avant consommation inconnue ou non autorisée. Les actions à effet externe restent séparées et soumises à autorisation humaine.

Le code local couvre désormais une partie vérifiable de ces barrières : upload image borné dans `src/dossiers/dossier-registry.mjs`, CSP et origine locale dans `src/http/server.mjs`, crawler borné dans `src/audit/site-crawler.mjs`, rapport échappé dans `src/audit/audit-report.mjs`, secrets absents des sorties provider et ledger dans `src/runs/cost-ledger.mjs`. Cela ne constitue pas une conformité générale ni une validation d’environnement.

Les contrôles runtime restent des gates séparés : DNS rebinding en environnement réel, sandbox/egress, rate limiting, anti-bot, restore, suppression et test d’intrusion. Ils ne sont ni simulés comme réussis ni nécessaires pour fermer la décision documentaire de ce ticket.
