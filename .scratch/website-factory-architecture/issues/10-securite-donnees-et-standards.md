# Quelles exigences de sécurité et de conservation doivent contraindre l'architecture ?

Parent: ../map.md
Type: research
Status: open

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

La contrainte financière est ajoutée aux gates : aucun fournisseur payant ne doit être activé sans budget explicite, suivi `CostEvent`, alerte et mécanisme d'arrêt ou de désactivation vérifié. Une limite d'alerte qui ne bloque pas réellement la consommation ne suffit pas à protéger le budget.

Les uploads acceptent uniquement des types et tailles autorisés, sont scannés et stockés isolément avec URLs temporaires. Les métadonnées sensibles peuvent être supprimées selon la politique choisie. Aucun fichier reçu ne doit être exécuté.

## Synchronisation cloud vers Mac

La `CloudIntakeInbox` est un tampon persistant chiffré, pas un cache navigateur. Les objets possèdent une clé de dossier non devinable, une taille maximale, un type autorisé, un hash, une date d'expiration et un statut de synchronisation. Le téléchargement vers le Mac exige une session cockpit authentifiée, des tokens courts, un curseur idempotent et une vérification de hash avant accusé de réception.

La suppression R2 est déclenchée uniquement après écriture locale atomique et validation du hash. Les erreurs, interruptions et divergences de hash conservent l'objet cloud et passent l'intake en `SYNC_RETRY` ou `SYNC_BLOCKED`; aucune suppression optimiste n'est autorisée. Un lifecycle de secours traite les objets orphelins après expiration.
