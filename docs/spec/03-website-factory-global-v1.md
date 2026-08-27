# Spécification globale Website Factory V1

Statut : architecture consolidée pour planification ; non commercialisable et non `production-ready`
Version : 1
Date : 27 août 2026
Périmètre : parcours public d'audit, génération de démo, validation opérateur et transition contrôlée vers la production

## 1. Autorité et sources

L'ordre commercial est normatif dans [`87-parcours-client-reference.md`](../../.scratch/website-factory-architecture/research/87-parcours-client-reference.md) et sa consolidation détaillée dans [`89-parcours-client-complet-arbres-decision.md`](../../.scratch/website-factory-architecture/research/89-parcours-client-complet-arbres-decision.md). Les contrats d'exécution sont alignés sur [`91-v1-workflow-contracts-cockpit.md`](../../.scratch/website-factory-architecture/research/91-v1-workflow-contracts-cockpit.md), la spec publique [`01-vertical-slice-public-ancrage-v1.md`](01-vertical-slice-public-ancrage-v1.md), la spec d'audit [`02-audit-gmb-seo-borné.md`](02-audit-gmb-seo-borné.md), [`CONTEXT.md`](../../CONTEXT.md) et les ADR [`0001`](../adr/0001-hybrid-local-first-control-plane.md), [`0002`](../adr/0002-files-first-configuration-snapshots.md) et [`0003`](../adr/0003-secrets-outside-browser-and-business-store.md).

Cette spec relie les tranches sans transformer une décision documentaire en preuve d'exploitation. Les prix, quotas, licences, comptes réels, RPO/RTO, sécurité d'exécution et suppression restent soumis aux gates indiqués en section 14.

## 2. Résultat et frontières

Website Factory doit permettre à un Prospect de :

1. saisir un `MinimalRequest` composé du nom et d'une ville structurée ;
2. obtenir un audit local sourcé, partiel si nécessaire, sans e-mail ni paiement ;
3. consulter un rapport final GMB + SEO, ou un aperçu local borné sans fiche/site confirmé ;
4. demander une démo via `Préparer mon site` et un e-mail valide ;
5. recevoir une démo privée après génération, QA et validation opérateur ;
6. décider ensuite d'un achat, d'un domaine et d'une publication contrôlés.

Le MVP est web uniquement, ciblé d'abord sur les restaurants indépendants généralistes, avec une seule langue de publication. La démo est gratuite avant paiement. Le paiement, la propriété du domaine, la publication et le `ProductionSite` sont des étapes distinctes et postérieures à la démo.

Hors périmètre : compte nécessaire pour la démo, paiement avant la démo, garantie de classement ou de revenus, action propriétaire Google sans OAuth, crawl illimité, accès authentifié au site, commande/réservation intégrée, visiteur multilingue, application native et cockpit public.

## 3. Autorité des données et rôles

Le `Control Plane` est la source de vérité des états, transitions, permissions, budgets, provenance, hashes et décisions. Le frontend ne porte pas la machine d'état et ne simule pas de progression.

Le `Agent Plane` produit des `AgentContribution` structurées. Il ne crée pas d'identité, de prix, d'horaire, de droit, de source ou d'autorisation et ne peut pas clore seul un checkpoint.

Le cockpit opérateur local communique avec le `Control Plane` via une frontière authentifiée. `LocalBridge`, Keychain/secret manager, stockage atomique, snapshots de configuration et moteur de workflows Ancrage restent inchangés par cette spec.

## 4. Modèle métier global

Les objets persistants minimums sont :

| Objet | Contenu minimum | Autorité ou contrainte |
| --- | --- | --- |
| `Prospect` | id opaque, marché, locale, dates, état | pas `Customer` avant achat |
| `MinimalRequest` | nom, `cityId`, libellé, pays | `cityId` obligatoire |
| `EstablishmentMatch` | candidats, décision, conflits, preuves | `AUTO_CONTINUE`, `ASK_CONFIRMATION` ou `ASK_MORE_DATA` |
| `SiteCandidate` | domaine normalisé, sources, statut | aucun crawl avant confirmation |
| `ProgressiveIntake` | champs requis, raisons, sources, états | uniquement les manques/conflits |
| `PhotoAsset` | catégorie, hash, taille, source, consentement, droits | cinq catégories avant génération |
| `AuditRun` | profil, scope, budget, deadline, état, tentatives | immuable et versionné |
| `EvidenceSnapshot` | source, URL canonique, date, paramètres sans secret, hash, licence, rétention | preuve immuable et redistribuable selon la politique |
| `GMBObservation` | faits publics et preuves | aucune action propriétaire |
| `CrawlRun` | URL, limites, résolution, ressources, artefacts | HTTP/HTML borné et fail-closed |
| `SEOFinding` | règle, valeur, sévérité, classification, preuves, limites | déterministe avant interprétation |
| `CompetitorCandidate` | intention, source, site, date, niveau de piste | au plus cinq pistes issues de trois intentions |
| `CostEvent` | run, étape, provider, unité, quantité, coût, timestamp | avant/après chaque consommation |
| `ProgressCheckpoint` | clé, statut, preuves, date, texte | validé par le `Control Plane` |
| `SEOReport` | modules, scope, version, expiration, PDF | accès signé, expirant et révocable |
| `DemoRequest` | audit, contact e-mail, snapshot des entrées | créée après CTA + e-mail valide |
| `WebsiteFactoryPipelineRun` | versions, budget, étapes, artefacts, état | ne modifie pas le run source |
| `SiteSpec` | identité, pages, contenu, assets, SEO, locale, template | version immuable et rendable |
| `AcceptanceReport` | gates, preuves, warnings, blocks, décision | `BLOCK` interdit la présentation |
| `Demo` / `ProductionSite` | version, token/domaine, expiration, publication | objets distincts |

Chaque champ important porte une classification parmi `OBSERVED`, `CALCULATED`, `AI_INTERPRETED`, `SUGGESTED`, `HYPOTHESIS`, `CONFLICT` et `UNKNOWN`. Une classe IA n'est jamais promue en observation par le frontend.

## 5. États canoniques et transitions

Les noms publics sont ceux de la spec 01. Les noms internes historiques sont conservés par une table de correspondance, sans créer deux machines d'état.

| État canonique | État interne ou événement lié | Condition de sortie |
| --- | --- | --- |
| `NEW` | `RECEIVED` | requête reçue et schéma valide |
| `CITY_SELECTED` | `CITY_SELECTED` | suggestion structurée sélectionnée |
| `MATCHING` | `MATCHING` | recherche déterministe et rapprochement versionné |
| `MATCH_CONFIRMED` | `ESTABLISHMENT_CONFIRMED` | fiche unique corroborée ou choix explicite |
| `ASK_CONFIRMATION` | `CONFIRMATION_REQUIRED` | candidat sélectionné explicitement |
| `ASK_ADDRESS` | `LOCAL_PREVIEW_WITHOUT_GMB` en préparation | adresse reçue et validée |
| `ENRICHING` | `ENRICHMENT` | sources et manques calculés |
| `INTAKE_REQUIRED` / `INTAKE_PARTIAL` | `PROGRESSIVE_INTAKE` / `PARTIAL` | données critiques cohérentes |
| `AUDIT_IN_PROGRESS` | `SCHEDULED`, `CRAWLING`, `NORMALIZING`, `RULES_ANALYZED` | modules terminés ou bornés |
| `GMB_REPORT_READY` | `GMB_REPORT_READY` | checkpoint GMB validé |
| `SEO_REPORT_IN_PROGRESS` | `SEO_REPORT_IN_PROGRESS`, `QUALITY_REVIEW` | rapport final ou branche explicitement partielle |
| `FINAL_REPORT_READY` | `FINAL_REPORT_READY` | rapport, périmètre, preuves et limites présents |
| `PREPARING_SITE` / `EMAIL_REQUIRED` | `WEBSITE_FACTORY_REQUESTED` | CTA puis e-mail valide |
| `EMAIL_CONFIRMED` / `SITE_BUILDING` | `SCHEDULED`, `CRAWLING` ou étape S6-S9 | snapshot et budget gelés |
| `READY_FOR_OWNER_REVIEW` | `QUALITY_REVIEW` | artefact et `AcceptanceReport` produits |
| `READY_FOR_PROSPECT` | `DELIVERY_PENDING` | validation opérateur explicite |
| `DEMO_PRESENTED` | `DELIVERED` | lien envoyé ou présenté |
| `DEMO_EXPIRED` | `CANCELLED` ou événement d'expiration | token révoqué et lifecycle appliqué |

Les états transverses `LOADING`, `EMPTY`, `PARTIAL`, `RETRYABLE_ERROR`, `BLOCKED`, `FAILED`, `RESUMABLE` et `WAITING_FOR_MAC` exigent une cause, une prochaine action et une preuve ou référence d'intervention.

Transitions interdites : ville libre vers enrichissement, identité ambiguë vers audit, domaine non confirmé vers crawl, GMB seul vers PDF/CTA, CTA sans e-mail vers génération, artefact non contrôlé vers envoi, `BLOCK` vers présentation, paiement vers domaine/publication sans les gates dédiés.

## 6. Pipeline d'audit public

Le pipeline A est :

```text
S0 MinimalRequest
 -> S1 EstablishmentMatch
 -> S2 ProgressiveIntake + SiteCandidate
 -> S3 GMBObservation / aperçu local
 -> S4 CrawlRun + SEOFinding + CompetitorCandidate
 -> S5 SEOReport
```

DataForSEO est prioritaire pour les capacités publiques qu'il couvre : Google SERP, Google Maps/local pack, Business Listings, données de mots-clés, concurrence, intersections de domaines et OnPage. Chaque famille reste séparée par endpoint, version, budget, provenance, quota et `CostEvent`. L'API Google Business Profile reste réservée à un mode propriétaire OAuth et n'est pas utilisée pour la recherche publique anonyme.

Le crawler commercial standard est interne, HTTP/HTML, non authentifié, sans exécution JavaScript, archive ni téléchargement. Lighthouse/Playwright sont des mesures ciblées contrôlées. Screaming Frog reste hors chemin commercial tant qu'une autorisation écrite compatible n'existe pas.

Une fiche GMB confirmée produit son rapport dès que son checkpoint est validé. Un domaine fiable autorise ensuite l'audit SEO après validation SSRF et budget. Sans fiche confirmée, le système demande uniquement l'adresse et produit `LOCAL_PREVIEW_WITHOUT_GMB`. Sans domaine confirmé, il produit `SITE_NOT_CONFIRMED` et ne crawl pas.

## 7. Pipeline de génération de démo

Le pipeline B ne commence qu'après `FINAL_REPORT_READY`, clic `Préparer mon site` et e-mail valide.

| Étape | Entrées | Sortie et gate |
| --- | --- | --- |
| S6 Préparer | rapport, e-mail, consentements | snapshot d'intake, versions et budget gelés |
| S7 Planifier et rédiger | faits, findings, intentions, langue | `content-plan.json`, `copy-draft.json`, schémas valides |
| S8 Composer et rendre | contenu approuvé, assets, règles, template | `SiteSpec` et rendu PHP/statique déterministe |
| S9 Contrôler | build, `SiteSpec`, preuves, budget | QA et `AcceptanceReport` |
| S10 Valider et livrer | rapport d'acceptation, warnings, version | décision opérateur puis lien privé |

Le contenu minimal est limité aux informations vérifiées : identité, menu, prix réellement fournis, horaires, adresse, coordonnées, photos autorisées et CTA réellement disponibles. La cible de 6 à 8 pages est indicative et conditionnée par les données et la valeur. Les pages locales supplémentaires ne sont indexables que si elles ont une intention réelle, des preuves, une valeur originale, un lien utile et une décision `index` explicite.

La traduction ne vise qu'une seule langue de publication au MVP. Toute `Translation` est versionnée et soumise à `TranslationReview` avant publication. Les assets non `OWNED`, `AUTHORIZED` ou `LICENSED` bloquent la conversion production ; un asset temporaire de démonstration ne devient jamais un asset production par défaut.

## 8. QA, validation et livraison

Les gates versionnés couvrent vérité/provenance, SEO déterministe, contenu/local, copy/traduction/assets, mobile/accessibilité/visuel, sécurité/permissions/noindex et budget. Chaque résultat est `PASS`, `WARN` ou `BLOCK`, avec preuve, version de règle et coût.

`READY_FOR_OWNER_REVIEW` est le dernier état interne avant décision. L'opérateur voit l'aperçu, les warnings, les blocks, les sources, les versions, les coûts, les screenshots, les droits photos, les liens, l'accessibilité et le périmètre. Il peut valider, renvoyer en correction ou abandonner. Aucune relance payante automatique n'est autorisée.

Après validation, la `Demo` est privée, `noindex`, tokenisée, révocable et disponible sept jours après présentation. Le lien est envoyé par e-mail transactionnel uniquement à l'adresse fournie. Le téléchargement et la consultation ne nécessitent ni compte ni paiement. Les protections ne prétendent pas empêcher capture, outils navigateur ou recopie.

## 9. Transition vers l'achat et la production

La conversion suit :

```text
DEMO_PRESENTED
 -> décision d'achat
 -> Account / authentification contrôlée
 -> paiement confirmé
 -> DomainOwnershipVerification ou rattachement de domaine
 -> droits contenus/assets confirmés
 -> SiteApproval
 -> nouvelle SiteVersion
 -> gates production
 -> ProductionSite publié
```

Le domaine reste la propriété du client et doit être exportable/transférable. L'enregistrement, le transfert, le paiement et la publication sont des actions humaines ou explicitement autorisées, séparées de l'audit et de la démo. Une erreur de paiement, de domaine, de droits ou de QA bloque la transition et conserve les versions précédentes.

## 10. Contrats d'exécution, coût et reprise

Chaque étape conserve son déclencheur, implémentation, entrées, sorties, dépendances, versions, tentatives, durée, coût, erreur expurgée, hash et `reusedRefs`. Une reprise réutilise les sorties du dernier checkpoint fiable, conserve l'incident initial et crée une nouvelle tentative ou un nouveau run selon la politique.

Avant chaque run, le `Control Plane` fige un `BudgetEnvelope` avec plafond global, budgets par étape/provider, unités locales/cloud, délai et dégradation autorisée. Les seuils 50/80/100 % produisent des événements et notifications. À 100 %, aucune branche optionnelle ne démarre ; une branche essentielle ne termine que si le coût restant est connu et sous le plafond dur. Sinon elle devient `PARTIAL` ou `BLOCKED` avant l'appel suivant. Aucun fallback premium silencieux, retry infini ou dépassement automatique n'est permis.

Les appels IA suivent `AIRoutingPolicy` : déterministe, local, cloud approuvé de même classe, puis intervention humaine seulement si explicitement autorisée. Une exécution conserve provider, modèle, policy, configuration, schéma, données autorisées, coût, durée, fallback et validation. Une clé seule n'active jamais un provider.

Le timeout de génération est d'une heure à compter du démarrage réel du pipeline. Le run devient immuable à l'échéance, aucune démo n'est envoyée et toute reprise demande une nouvelle deadline, enveloppe, QA et validation opérateur.

## 11. Sécurité et données

Les uploads sont limités en type, taille et nombre, isolés, scannés, non exécutables et accessibles par URL temporaire. Les métadonnées inutiles peuvent être supprimées selon la politique active. Les secrets restent dans Keychain/secret manager et ne paraissent ni dans le navigateur, ni dans les prompts, ni dans les logs, ni dans Git.

Le crawler valide chaque URL et chaque redirection : schéma, credentials absents, ports autorisés, résolution IPv4/IPv6 et blocage loopback, link-local, multicast, RFC1918, CGNAT, documentation et autres plages réservées. Il revalide la cible après résolution pour limiter le DNS rebinding, impose des limites de profondeur, URLs, workers, mémoire, durée, taille compressée/décompressée et refuse scripts, archives, téléchargements et accès authentifié.

L'intake cloud fonctionne Mac éteint : métadonnées minimales dans Neon, objets temporaires dans R2, puis synchronisation idempotente vers l'archive locale chiffrée, hash vérifié et accusé de réception avant suppression R2. Une panne ou divergence conserve l'objet et produit `SYNC_RETRY`, `SYNC_BLOCKED` ou `WAITING_FOR_MAC`.

## 12. Conservation, suppression et restauration

La politique commerciale courante est sept jours pour le rapport public et la démo après présentation. Elle ne constitue pas une durée légale universelle. Les photos non retenues sont supprimées rapidement ; les dossiers non convertis, données de production, coûts, logs, preuves et backups suivent des classes distinctes définies par finalité et juridiction.

Neon conserve les métadonnées minimales, états, hashes, coûts, preuves et références. R2 conserve les rapports/PDF et les objets temporaires selon leur lifecycle. Les crawls et exports lourds restent dans l'archive locale chiffrée au MVP, sans promesse de restauration supplémentaire. Une restauration avec Mac éteint reste `WAITING_FOR_MAC`.

Toute suppression est authentifiée, autorisée, journalisée et vérifiée. La suppression d'un objet synchronisé exige l'écriture locale atomique et le hash confirmé. Les objectifs provisoires RPO/RTO ne deviennent contractuels qu'après test de sauvegarde et restauration. La rétention légale et les CGV par marché exigent validation compétente avant publication commerciale.

## 13. Observabilité et événements

Les événements fonctionnels sont idempotents, horodatés et corrélés par identifiant opaque. Ils mesurent séparément : ville sélectionnée, rapprochement, complétude, upload/rejet, checkpoints GMB/SEO, rapport/PDF, clic CTA, e-mail valide, pipeline, QA, validation, livraison, ouverture, expiration, blocage et reprise.

Les analytics ne contiennent pas l'e-mail en clair, les secrets, les photos ni les payloads bruts. Les événements décrivent l'observation du parcours, mais ne remplacent pas la vérité des transitions du `Control Plane`.

## 14. Gates avant implémentation et commercialisation

Avant toute implémentation de production de cette spec :

1. archiver les licences des datasets `CityIndex` choisis pour chaque marché ;
2. confirmer par compte de test les endpoints DataForSEO réellement nécessaires, leurs coûts, quotas, délais, droits et `CostEvent` ;
3. confirmer les limites/prix et le comportement des budgets Cloudflare/Neon, sans confondre alerte fournisseur et arrêt garanti ;
4. choisir et documenter la méthode GMB publique, son attribution, sa conservation et sa restitution ;
5. exécuter les tests SSRF, DNS rebinding, uploads, anti-abus, budget, partialité et idempotence ;
6. tester écriture, synchronisation, suppression et restauration avec l'état `WAITING_FOR_MAC` ;
7. relire les prototypes publics, rapport et cockpit sur mobile, clavier, zoom et états d'erreur ;
8. exécuter le vertical slice autorisé couvrant vitrine, WordPress, multilingue, JavaScript, erreurs SEO, blocage crawl et absence de données structurées ;
9. mesurer coût, durée, exactitude du rapprochement, findings attendus, liens preuve/affirmation, revue humaine, livraison, expiration et suppression ;
10. faire relire les documents légaux par juridiction avant toute copy commerciale correspondante.

Un échec de sécurité, provenance, budget, restauration ou suppression bloque le go commercial, même si le rendu visuel est convaincant. Cette spec n'autorise ni création de clé, ni dépense, ni publication, ni suppression distante, ni envoi.

## 15. Traceabilité des recherches et limites actuelles

Les recherches fournisseurs, provenance, marchés et pricing sont regroupées dans [`94-dataforseo-endpoints-prix-limites-provenance.md`](../../.scratch/website-factory-architecture/research/94-dataforseo-endpoints-prix-limites-provenance.md), [`95-cloudflare-neon-prix-limites-restauration.md`](../../.scratch/website-factory-architecture/research/95-cloudflare-neon-prix-limites-restauration.md), [`96-cityindex-gmb-concurrence-conservation.md`](../../.scratch/website-factory-architecture/research/96-cityindex-gmb-concurrence-conservation.md) et [`97-pricing-et-cadre-legal-marches.md`](../../.scratch/website-factory-architecture/research/97-pricing-et-cadre-legal-marches.md). Les décisions déjà consolidées restent dans `map.md` et les tickets numérotés.

Au 27 août 2026, aucune capacité ne doit être annoncée comme commercialisable sur la seule base de cette spec. Les comptes réels, quotas, coûts observés, licences de datasets, rétention juridique, restauration et vertical slice sont encore des preuves à obtenir.
