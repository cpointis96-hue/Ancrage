# Handoff réutilisable — Website Factory / Wayfinder

Copier le bloc ci-dessous dans une nouvelle conversation pour reprendre le travail sans repartir de zéro.

---

## Contexte

Nous travaillons dans le dépôt :

`/Users/aiomi/Documents/Programmes/business-site-factory`

Projet : Website Factory, une plateforme web local-first qui produit d'abord une valeur d'audit et une démonstration personnalisée pour un restaurant, puis éventuellement un site en production après paiement.

Le projet est encore en phase Wayfinder / architecture. Ne pas implémenter toute la production tant que la carte Wayfinder et les specs globales ne sont pas suffisamment fermées.

Communiquer en français. Conserver les identifiants techniques, noms de fichiers, commandes et noms d'API en anglais.

## Objectif global

Arriver au bout de Wayfinder pour l'ensemble de Website Factory :

1. fermer les décisions structurantes ;
2. compléter les specs ;
3. transformer les specs en plan d'implémentation ;
4. implémenter par tranches vérifiables ;
5. tester chaque tranche réelle ;
6. ne déclarer aucune capacité commerciale sans preuve correspondante.

Le statut `ready-for-to-spec` actuel ne concerne que la tranche documentaire audit GMB/SEO. Il ne signifie pas que tout Website Factory est prêt à construire.

## Règles non négociables

- Préserver la fondation Ancrage existante.
- Ne pas modifier, migrer ou réécrire les workflows Ancrage sans justification explicite par une spec.
- Ne pas inventer d'identité, de domaine, de prix, d'horaires, de plats, de droits ou de photos.
- Ne jamais crawler avant une identité et un domaine suffisamment fiables.
- Une absence de fiche GMB ne prouve pas l'absence réelle d'une fiche.
- Une correspondance multiple exige une confirmation explicite.
- `AUTO_CONTINUE` exige une fiche unique cohérente, une ville structurée, un signal corroborant et aucun conflit critique.
- Les agents IA ne sont jamais la source de vérité.
- Les règles déterministes précèdent l'IA.
- Chaque sortie IA doit être structurée, versionnée, validée et reliée à des preuves.
- Aucun fallback premium silencieux.
- Toute dépense cloud doit avoir une enveloppe préautorisée et un `CostEvent`.
- À 100 % du budget, les branches optionnelles s'arrêtent ; une branche essentielle ne continue que si son coût restant est connu et sous le plafond.
- Les états `PARTIAL`, `BLOCKED`, `WARN`, `PASS` et `WAITING_FOR_MAC` doivent rester explicites.
- Le frontend ne doit jamais simuler une progression indépendante des `ProgressCheckpoint` validés.
- Aucun rapport ne doit présenter une interprétation comme un fait observé.
- Aucune démo ne doit être envoyée avant QA et validation opérateur.
- La démo est gratuite avant paiement ; le paiement intervient seulement avant domaine, publication et production.
- Ne pas utiliser Screaming Frog comme dépendance commerciale sans autorisation écrite compatible avec le service multi-prospects.

## Fondation Ancrage déjà présente

Le dépôt contient déjà, et doit préserver :

- `LocalBridge` loopback ;
- stockage atomique ;
- prompts et workflows versionnés ;
- snapshots de configuration immuables ;
- registre Provider sans secret navigateur ;
- secrets via `SecretStore` / Keychain prévu ;
- moteur DAG avec runs, checkpoints, hashes et artefacts ;
- API JSON ;
- cockpit local raccordé ;
- recherche de domaines déterministe et adapters registrar ;
- tests de reprise et de non-divulgation des secrets.

Preuve actuelle : `npm test` passe avec 37 tests sur 37 hors limitation sandbox loopback. Dans la sandbox, six tests HTTP échouent uniquement sur `listen EPERM` de `127.0.0.1`.

## Parcours produit canonique

```text
nom + ville structurée
-> enrichissement traçable
-> EstablishmentMatch
-> confirmation ou branche locale sans GMB
-> domaine confirmé si disponible
-> audit GMB public si autorisé
-> audit SEO borné et concurrence locale
-> rapport GMB + SEO
-> téléchargement PDF sans e-mail
-> clic « Préparer mon site »
-> demande d'e-mail valide
-> WebsiteFactoryPipelineRun
-> génération déterministe + contributions IA contrôlées
-> QA
-> validation opérateur
-> lien privé de démo gratuite pendant 7 jours
-> décision du prospect
-> paiement
-> domaine et publication
```

L'audit GMB doit être affiché dès qu'il est prêt, même si le SEO continue. Le PDF et « Préparer mon site » n'apparaissent qu'après le rapport final complet.

## Décisions produit déjà prises

- MVP web uniquement.
- Interfaces client Mobile First.
- Segment initial : restaurants indépendants généralistes.
- Démo avant paiement.
- Domaine et publication après paiement.
- Cockpit opérateur local sur Mac en MVP.
- Control Plane cloud comme source de vérité pour états, provenance, hashes, coûts et autorisations.
- Agent Plane subordonné au Control Plane.
- Une seule langue de publication au MVP.
- Cinq photos avant génération : façade, deux plats signatures, intérieur/terrasse, équipe ou service ; logo facultatif.
- Audit GMB et audit SEO regroupés dans un même parcours, mais séparés dans les données et le rapport.
- Branche sans GMB : demander uniquement l'adresse et produire un aperçu local borné.
- Branche sans site : aucun crawl ; produire seulement les éléments locaux disponibles.
- Cinq concurrents maximum issus de trois intentions locales.
- Rapport compréhensible d'abord : résumé, cinq actions prioritaires, puis preuves, métriques et détails.
- Rapport partiel explicitement marqué `PARTIAL`.
- E-mail demandé seulement après le clic sur « Préparer mon site ».
- Aucune génération réelle avant e-mail valide.
- Validation opérateur obligatoire avant livraison de la démo.
- Prix localisés par marché ; aucune promesse « moins cher du marché » sans comparatif daté et homogène.

## Décision fournisseurs

DataForSEO est le provider prioritaire pour toutes les capacités publiques qu'il couvre :

- Google SERP ;
- Google Maps / local pack ;
- Business Listings ;
- mots-clés ;
- concurrents ;
- intersections de domaines ;
- données OnPage.

Chaque famille d'endpoint doit rester séparée par workflow, budget, quota, provenance et `CostEvent`.

DataForSEO ne remplace pas l'API officielle Google Business Profile pour les fonctions propriétaires. L'API GBP est réservée aux fiches possédées ou gérées avec autorisation OAuth. Elle est exclue de la recherche publique anonyme.

Screaming Frog est hors du chemin commercial par défaut. Le crawler standard doit être un moteur HTTP/HTML interne borné. Lighthouse/Playwright servent uniquement aux mesures ciblées et contrôlées.

## Specs et artefacts de référence

Lire en premier :

1. `.scratch/website-factory-architecture/map.md`
2. `.scratch/website-factory-architecture/audit-001-existing-state.md`
3. `.scratch/website-factory-architecture/spec.md`
4. `docs/spec/01-vertical-slice-public-ancrage-v1.md`
5. `docs/spec/02-audit-gmb-seo-borné.md`
6. `CONTEXT.md`
7. `docs/adr/`

Références fonctionnelles :

- `research/87-parcours-client-reference.md`
- `research/89-parcours-client-complet-arbres-decision.md`
- `research/90-handoff-correction-rapport-gmb-seo-pdf-email.md`
- `research/91-v1-workflow-contracts-cockpit.md`
- `research/93-sources-licences-identification-concurrence-crawler.md`

## Spec d'audit GMB/SEO actuelle

`docs/spec/02-audit-gmb-seo-borné.md` est maintenant acceptée comme architecture, mais son activation commerciale reste conditionnée à des gates.

Elle fixe notamment :

- `EstablishmentMatch` ;
- `SiteCandidate` ;
- `AuditRun` ;
- `GMBObservation` ;
- `CrawlRun` ;
- `SEOFinding` ;
- `CompetitorCandidate` ;
- `EvidenceSnapshot` ;
- `CostEvent` ;
- `ProgressCheckpoint` ;
- `SEOReport` ;
- `AcceptanceReport` ;
- provenance immuable ;
- séparation observation / calcul / interprétation IA / suggestion ;
- sécurité SSRF et DNS rebinding ;
- budget et dépassement ;
- stockage Neon / R2 / archive locale ;
- statut `PARTIAL` ;
- vertical slice obligatoire avant commercialisation.

## Ce qui reste à faire avant l'implémentation de production

### 1. Terminer la fermeture Wayfinder globale

Reprendre les tickets encore ouverts et distinguer : décision d'architecture, preuve externe, prototype, recherche commerciale ou travail différé.

Tickets restant réellement ouverts :

- `40-cadre-legal-cgv-par-pays.md`
- `73-vertical-slice-audit-seo.md`

Les tickets précédemment listés sont résolus dans leurs fichiers. Leurs preuves d'exécution, tests fournisseurs, revue juridique ou validation commerciale restent des gates de production et ne doivent pas être confondues avec des décisions Wayfinder ouvertes.

### 2. Priorité immédiate : recherche fournisseurs

Vérifier avec documentation officielle et comptes de test :

- DataForSEO : endpoints réellement nécessaires, prix, quotas, délais, conditions, conservation et limites par marché ;
- Cloudflare Workers, R2, Queues/Workflows, Turnstile et rate limiting ;
- Neon PostgreSQL : coût, scale-to-zero, sauvegarde, restauration et limites de spending ;
- source et licence du `CityIndex` ;
- méthode d'observation publique GMB compatible avec le parcours ;
- source autorisée des pistes concurrentielles ;
- hébergement, domaine, paiement, e-mail et stockage.

Ne créer aucune clé et ne lancer aucune dépense sans confirmation explicite, budget et test isolé.

### 3. Sécurité et données

Compléter les contrats pour :

- uploads et scan ;
- prompt injection ;
- SSRF ;
- DNS rebinding ;
- isolation du crawl ;
- secrets ;
- rate limiting ;
- accès admin ;
- rétention ;
- suppression ;
- backups ;
- restauration ;
- RPO/RTO ;
- données par marché et obligations légales.

### 4. Prototypes comportementaux

Réaliser puis relire avant UI de production :

- parcours public nom + ville → enrichissement → rapport ;
- rapport GMB puis SEO ;
- état `PARTIAL`, erreur récupérable et timeout ;
- CTA « Préparer mon site » ;
- cockpit de validation finale ;
- affichage mobile à 390 px.

Les prototypes sont jetables. Ne pas les promouvoir automatiquement en production.

### 5. Spec globale Website Factory

Après fermeture des décisions, produire une spec globale qui relie :

- audit ;
- intake ;
- `DemoRequest` ;
- génération de démo ;
- contenu ;
- traduction ;
- assets ;
- `SiteSpec` ;
- renderer déterministe ;
- QA ;
- validation opérateur ;
- livraison ;
- paiement ;
- domaine ;
- publication ;
- pricing ;
- juridique ;
- support et sortie client.

Cette spec doit définir modèles, contrats, transitions, permissions, budgets, erreurs, reprises et preuves de validation.

## Vertical slice obligatoire

Avant toute commercialisation de l'audit, tester des sites autorisés couvrant au minimum :

- restaurant vitrine ;
- WordPress ;
- site multilingue ;
- site JavaScript ;
- erreurs SEO volontaires ;
- blocage du crawl ;
- absence de données structurées.

Mesurer :

- exactitude du rapprochement ;
- durée et coût ;
- taux de crawl complet ou partiel ;
- findings attendus et détectés ;
- liens entre affirmations IA et preuves ;
- temps de revue humaine ;
- compréhension du rapport ;
- livraison ;
- expiration ;
- suppression ;
- restauration ou état honnêtement bloqué.

Un échec sécurité, provenance ou budget bloque le go commercial même si le rapport paraît correct.

## Ordre recommandé de reprise

1. Lire les fichiers de référence et vérifier `git status`.
2. Ne pas toucher au code Ancrage.
3. Finir la recherche DataForSEO / Cloudflare / Neon / CityIndex / GMB.
4. Mettre à jour les tickets et la spec avec les preuves et limites.
5. Fermer les décisions Wayfinder réellement résolues.
6. Terminer les prototypes public, rapport et validation.
7. Écrire la spec globale Website Factory.
8. Faire une revue de cohérence de toutes les specs.
9. Passer officiellement à `to-spec`.
10. Implémenter d'abord le vertical slice audit GMB/SEO borné.
11. Vérifier ce vertical slice avec des sites autorisés.
12. Étendre ensuite vers la génération de démo, puis paiement et publication.

## Prochaine action exacte

La prochaine action n'est pas encore de coder le produit complet.

Commencer par une passe de recherche et décision sur les fournisseurs, avec DataForSEO comme choix prioritaire : vérifier ses endpoints publics SERP/Maps/Business Listings/SEO, ses coûts, quotas et droits ; vérifier en parallèle Cloudflare, Neon, `CityIndex` et la méthode GMB. Reporter chaque résultat dans les tickets et la spec. Puis seulement fermer Wayfinder global et produire la spec globale.

Ne déclarer `production-ready`, `commercialisable` ou `audit validé` qu'après le vertical slice réel et les gates de la spec.

---
