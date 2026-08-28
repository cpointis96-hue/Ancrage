# Wayfinder map — Architecture produit et technique de la Website Factory

Type: wayfinder:map
Status: ready-for-to-spec

Portée du statut : tranche documentaire audit GMB/SEO uniquement. L'architecture globale est consolidée dans [`docs/spec/03-website-factory-global-v1.md`](../../docs/spec/03-website-factory-global-v1.md), mais l'activation fournisseur, la revue juridique, le vertical slice et la commercialisation restent ouverts.

## Destination

Atteindre une architecture produit et technique suffisamment décidée, documentée et traçable pour passer à `to-spec` puis planifier la construction d'une plateforme web automatisée de démonstrations personnalisées et de sites en production pour restaurants et activités touristiques.

La carte est terminée lorsqu'il ne reste plus de décision structurante, de contrainte externe critique ou de frontière métier nécessaire avant une spécification propre — sans implémenter le produit pendant Wayfinder.

## Notes

- **Audit de reprise du 27 août 2026** — [`audit-001-existing-state.md`](audit-001-existing-state.md) sépare les preuves de la fondation Ancrage des capacités encore absentes. La spec ciblée [`docs/spec/02-audit-gmb-seo-borné.md`](../../docs/spec/02-audit-gmb-seo-borné.md) formalise le prochain périmètre documentaire : GMB, SEO/concurrence, provenance, sécurité crawl, budgets et gates.
- **Consolidation Wayfinder du 27 août 2026** — la spec `docs/spec/02-audit-gmb-seo-borné.md` distingue désormais décisions d'architecture, hypothèses calibrables et gates de commercialisation. Le socle Ancrage n'est pas étendu pendant cette passe.
- **Recherches officielles du 27 août 2026** — DataForSEO, Cloudflare/Neon, licences d'index géographique, GMB/concurrence/conservation et pricing/cadre légal sont capturés dans [94](research/94-dataforseo-endpoints-prix-limites-provenance.md), [95](research/95-cloudflare-neon-prix-limites-restauration.md), [96](research/96-cityindex-gmb-concurrence-conservation.md) et [97](research/97-pricing-et-cadre-legal-marches.md). Ces notes séparent `MESURÉ`, `DOCUMENTÉ`, `DÉDUIT`, `À TESTER` et `NON OBSERVABLE`.
- **Tranche locale audit du 27 août 2026** — les findings SEO déterministes portent maintenant un `EvidenceSnapshot` local hashé et le registre d’audits accepte une clé d'idempotence rejouable, avec conflit sur empreinte divergente. Les tests loopback confirment la reprise sans second crawl ; les comptes, droits de restitution, coûts provider, rétention cloud, restauration et sites autorisés restent des gates ouvertes.
- **Workflow public local du 27 août 2026** — `POST /api/audits/local` compose un run `public-audit-v1` avec recherche établissement/site, observation GMB, crawl SEO local, capacités DataForSEO pour OnPage/mots-clés/concurrence et stratégie déterministe. Les appels externes exigent santé provider, enveloppe et coût par endpoint ; les preuves sont hashées, les branches absentes restent `PARTIAL`/`BLOCKED`, et aucune activation réelle n'est déclarée.
- **Ordre canonique réaffirmé le 28 août 2026** — après validation du dossier et de l'identité, le système termine l'observation GMB, produit et expose le premier rapport HTML, puis déclenche l'audit SEO complet avec les données GMB, la concurrence, les mots-clés, le site et les autres données autorisées. Le rapport final HTML/PDF est composé ensuite ; le plan du site ne démarre qu'après ce rapport final. La simulation `client-site-simulation` ne respecte pas encore cet ordre et reste un écart d'implémentation à traiter dans une spec dédiée.
- **Profil et enveloppe standard du 27 août 2026** — le run utilise par défaut 50 URL, 25 Mo et 3 minutes sans rendu JavaScript, avec une enveloppe de pilotage estimée à 2 USD et des coûts d'appel de 0,10 à 0,30 USD selon la capacité. Ces montants servent au fail-closed local, ne prétendent pas remplacer la tarification DataForSEO et devront être recalibrés sur des coûts observés autorisés.
- **Fondation Ancrage V1 implémentée localement** — le dépôt contient maintenant un `LocalBridge` loopback, un stockage atomique, un registre de prompts versionnés, un registre Provider sans secret navigateur, un moteur DAG avec runs et artefacts persistants, une API JSON et un cockpit `app/` raccordé. La preuve automatisée est dans `test/e2e/local-vertical-slice.test.mjs`. Les intégrations externes, Keychain réel, restauration sur support et validation navigateur restent ouvertes et ne sont pas déclarées comme prouvées.
- **Configuration Workflows compacte — 27 août 2026** — Workflows devient le centre unique de configuration : étapes, acteurs, providers, modèles, prompts, profils d’exécution, budgets, contrats et templates de sortie sont liés au workflow. Les limites par défaut sont `50` URL, `3` minutes, `25` Mo et `2` USD, toutes modifiables. Les templates locaux suivent le même cycle brouillon → version immuable → activation, avec import, remplacement, suppression confirmée et resynchronisation explicite ; aucun provider réel ni credential n’est créé ou appelé par cette surface. La validation courante couvre persistance/versionnement et absence d’overflow à 390 px.

- Communication avec l'utilisateur en français.
- **Document de compréhension du parcours client** — la logique commerciale de référence, ses six règles `IF / THEN` et les étapes qui ne doivent pas être inversées sont résumées dans [87-parcours-client-reference.md](research/87-parcours-client-reference.md).
- **Dossier numéroté de stratégie SEO et Website Factory** — les synthèses réutilisables et transmissibles aux agents sont regroupées dans [82-seo-strategy-website-factory.md](research/82-seo-strategy-website-factory.md), [83-catalogue-agents-seo-website-factory.md](research/83-catalogue-agents-seo-website-factory.md), [84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md](research/84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md), [85-pipeline-audit-vers-site-website-factory.md](research/85-pipeline-audit-vers-site-website-factory.md), [86-stack-seo-skills-et-cockpit.md](research/86-stack-seo-skills-et-cockpit.md) et [88-index-strategie-seo-website-factory.md](research/88-index-strategie-seo-website-factory.md). Elles consolident les tickets sans fermer artificiellement les vérifications externes restantes.
- Une seule question HITL est discutée à la fois ; chaque question existe comme ticket Markdown modifiable et commentable.
- Les choix techniques ou UX à faible risque et fortement déterminés par les invariants existants sont tranchés par l'agent ; une question HITL n'est posée que si la décision peut réellement modifier le produit, l'offre, la confidentialité ou la direction visuelle.
- Les tickets `grilling` portent les choix du modèle commercial ou les préférences de l'utilisateur.
- Les tickets `research` portent les faits externes, limites de fournisseurs, standards, prix et contraintes techniques.
- Les tickets `prototype` seront utilisés lorsqu'une décision UX/UI ou comportementale sera mieux tranchée par un artefact concret.
- Les tickets `task` seront réservés aux actions nécessaires pour débloquer une décision.
- MVP web uniquement ; aucune application Android, iOS ou macOS native.
- Les interfaces destinées au client sont Mobile First.
- Le parcours de saisie destiné au restaurateur doit être compréhensible dans sa langue.
- Pour le MVP, le restaurateur choisit une seule langue de publication pour sa démo et son site ; la langue de ses clients n'est pas gérée.
- La démo existe avant paiement ; l'achat/enregistrement d'un domaine intervient seulement après validation et paiement.
- Le cockpit opérateur peut rester local sur le Mac en MVP ; le service public doit continuer à fonctionner Mac éteint.
- Le Control Plane cloud reste la source de vérité pour l'état, la provenance, les hashes et les autorisations ; après synchronisation et purge R2, le contenu privé réside dans l'archive locale chiffrée sauvegardée. Le Control Plane reste déterministe et l'Agent Plane subordonné, probabiliste et validable.
- **Intake cloud synchronisable hors ligne Mac** — lorsque le Mac est éteint, `Cloudflare`/`R2` reçoit temporairement les fichiers et `Neon` conserve les métadonnées ; le cockpit synchronise ensuite vers un stockage local chiffré, vérifie les hashes et déclenche la suppression R2 après accusé de réception, sans modèle IA ni provider supplémentaire.
- Priorité de décision : coût fixe et coût marginal très faibles, traçabilité des sources et des coûts, récupérabilité des workflows, frontières permettant l'évolution sans complexité prématurée.
- Compétences à consulter selon le ticket : `grilling`, `domain-modeling`, `research`, `prototype`.

## Decisions so far

- **MVP web uniquement** — les applications natives Android, iOS et macOS ne font pas partie de cette destination.
- **Mobile First côté client** — les interfaces destinées aux prospects et clients doivent être conçues Mobile First.
- **Démo avant paiement** — une démonstration personnalisée navigable est produite avant tout achat.
- **Achat de domaine après paiement** — la recherche et le check sont possibles avant paiement, mais l'enregistrement payant est explicitement validé après paiement.
- **Cockpit opérateur local en MVP** — le dashboard peut tourner sur le Mac de l'opérateur sans exposer nécessairement cette interface sur Internet.
- **Cloud source de vérité** — l'arrêt du Mac ne doit pas interrompre la réception publique des demandes.
- **Séparation Control Plane / Agent Plane** — les agents ne sont pas la source de vérité et leurs sorties doivent être structurées et validables autant que possible.
- [**Résultat commercial du MVP**](issues/01-resultat-commercial-unique-du-mvp.md) — prouver qu'une petite entreprise accepte de payer après avoir vu une démo personnalisée produite rapidement et à coût plafonné ; la différenciation est la preuve avant paiement, pas la promesse d'être le moins cher.
- [**Segment prioritaire initial**](issues/02-segment-prioritaire-initial.md) — commencer par les restaurants indépendants généralistes, dont les données sont standardisables et le bénéfice immédiatement visible.
- [**Contrat de la démo MVP**](issues/03-contrat-de-demo.md) — dossier complet et photos, démo gratuite mobile autour d'une heure, publication après acceptation à partir d'environ 10 €/mois, avec une seule langue de publication choisie.
- [**Traduction IA du MVP**](issues/11-traduction-ia-et-seo-multilingue.md) — traduction versionnée et validée avant publication ; le multilingue visiteur est différé.
- [**Contenu minimal de la démo**](issues/12-contenu-minimal-de-la-demo.md) — accueil, menu, horaires, adresse, photos, coordonnées et CTA contact/réservation dans une seule langue ; les intégrations complexes sont hors promesse initiale.
- [**Critère d'acceptation et hard timeout**](issues/13-critere-acceptation-demo.md) — la démo doit passer les gates de qualité avant T+1h ; sinon le workflow s'arrête, alerte le cockpit, conserve les logs et ouvre une voie d'intervention.
- [**Politique de reprise après timeout**](issues/15-politique-reprise-timeout.md) — chaque reprise crée une nouvelle `DemoGeneration` liée à l'incident, avec deadline, budget, logs et QA propres ; la tentative initiale reste immuable.
- [**Point de reprise après timeout**](issues/16-point-de-reprise-apres-timeout.md) — reprise depuis le dernier checkpoint fiable et idempotent, avec confirmation humaine, nouvelle deadline, nouveau budget et nouvelle QA.
- [**Handoff Codex après timeout**](issues/14-handoff-codex-apres-timeout.md) — bridge local vers App Server/SDK ou MCP ; aucun deep link public supposé, aucun secret ni relance automatique transmis.
- [**Limites de relance et budget après timeout**](issues/17-limites-relance-et-budget-timeout.md) — zéro relance automatique ; le propriétaire reprend manuellement dans Codex, toute nouvelle action payante étant explicitement déclenchée et tracée.
- [**Frontière d'intervention Codex**](issues/18-frontiere-intervention-codex.md) — modifications et tests locaux autorisés ; publication, dépenses, suppressions, envois et mutations métier exigent confirmation explicite du propriétaire.
- [**Validation humaine avant présentation**](issues/04-frontiere-validation-humaine.md) — aucune `Demo` n'est présentée au prospect avant validation explicite du propriétaire ; les contrôles en amont peuvent être automatisés.
- [**Données minimales d'une demande de démo**](issues/05-donnees-insuffisantes-ou-contradictoires.md) — identité/contact, plats, prix et photos sont requis ; aucune donnée critique n'est inventée et la richesse des informations n'est pas vendue comme garantie de classement.
- [**Seuil de complétude et intake progressif**](issues/19-seuil-completude-dossier-restaurant.md) — la homepage demande seulement nom + ville ; l'enrichissement trouve le reste et un formulaire ne demande ensuite que les champs critiques manquants.
- [**Règles d'enrichissement et de scraping initial**](issues/20-regles-enrichissement-et-scraping-initial.md) — recherche et normalisation automatisables, mais droits, identité finale, données critiques et conflits nécessitent provenance et confirmation adaptées.
- [**Runtime PHP et performance**](issues/21-runtime-php-et-performance.md) — PHP est conservé comme runtime cible, avec cache/pré-rendu/CDN à privilégier ; la vitesse doit être mesurée, pas supposée.
- [**Chatbot d'aide de landing page**](issues/24-chatbot-multi-fournisseurs.md) — aide gratuite visible via la mascotte, limitée à la documentation validée du service et du site ; aucune action métier ni promesse SEO.
- [**Pricing des marchés et modèle récurrent**](issues/30-pricing-marches-et-modele-recurrent.md) — les prix observés séparent présence essentielle, visibilité locale et croissance gérée ; le plan d'entrée bas doit être strictement borné et localisé par marché.
- [**SEO professionnel et cocon sémantique**](issues/39-seo-professionnel-et-cocon-semantique.md) — entité locale cohérente, fiche Google, menu, réputation, pages utiles, données structurées, performance et gates de publication ; pas de contenu local artificiel ni de garantie de classement.
- **Registre IA central** — les agents choisissent une politique de routage versionnée ; fournisseurs, modèles, coûts, capacités, secrets et fallbacks sont configurés une seule fois et tracés par exécution.
- **Fallback par classe de capacité** — un modèle local `small` peut être remplacé par un modèle cloud `small` autorisé et plafonné ; aucun fallback silencieux vers un modèle premium.
- Classification des données par politique de routage : cloud autorisé, local obligatoire, anonymisation ou blocage avant chaque exécution IA.
- Zéro coût IA cloud par défaut : stockage cloud minimal autorisé, inférence cloud désactivée tant qu'un fournisseur et un budget ne sont pas activés explicitement.
- Fallback cloud autorisé si un fournisseur approuvé, un modèle adapté et des plafonds de coût sont configurés ; les appels sont attribués et tracés, sans fournisseur inconnu ni escalade premium silencieuse.
- Budgets configurables par agent, étape, `DemoGeneration`, prospect, fournisseur et période ; plafond global bloquant et `CostEvent` obligatoire.
- Budgets par défaut, alertes et comportement à 50/80/100 % ; toute hausse exige une confirmation.
- Budgets initiaux conservateurs, recalibrés sur les coûts observés ; aucune augmentation silencieuse.
- Frontière d'approbation des sorties IA : brouillon, validation déterministe, revue agentique indépendante ou approbation humaine selon le risque.
- **Boucle humaine minimale mais obligatoire** — le propriétaire ne voit que le livrable final et son `AcceptanceReport`, puis doit explicitement valider chaque démo avant présentation ; aucun livrable n'est présenté si un gate bloquant échoue, si une provenance critique manque ou si un droit est inconnu.
- [**Comment automatiser la QA sans multiplier les agents inutilement ?**](issues/56-qa-independant-et-fail-closed.md) — seuls les problèmes critiques bloquent ; les `WARN` sont visibles dans l'`AcceptanceReport` et nécessitent la validation explicite du propriétaire.
- **Images de test séparées de la production** — une démo peut utiliser des assets temporaires non vérifiés avec provenance, expiration et purge ; aucune conversion production ne passe avec un asset non autorisé.
- **Guide photo restaurant** — collecte priorisée de façade, plats signatures, intérieur, équipe et expérience ; tri par vision, mais faits et droits séparés des scores visuels.
- **Minimum visuel obligatoire** — cinq photos avant génération : façade, deux plats signatures, intérieur/terrasse et équipe/propriétaires/service ; le logo reste facultatif.
- **Rejet et reprise manuelle** — un rejet final bloque la démo ; le propriétaire ouvre son contexte dans Codex local, corrige et teste, réimporte une version PHP contrôlée, puis doit valider à nouveau avant l'envoi email au prospect.
- **Écran de validation final** — aperçu, gates `PASS/WARN/BLOCK`, provenance, versions, coûts, preuves QA et actions séparées de validation, ouverture Codex, abandon et envoi.
- **Templates différés** — les trois familles restent une hypothèse structurelle, mais les prototypes visuels actuels sont rejetés ; la direction UI sera reprise séparément avec un agent UI et ne bloque pas l'architecture.
- **Offre d'entrée bornée** — site standardisé pré-rendu, une langue, quotas limités, audit initial et support documentaire ; travail humain, traductions et fonctions complexes séparés.
- **Pilote marché** — Sri Lanka en premier si l'accès commercial direct est confirmé ; réplication Australie puis France après mesure du workflow.
- **Audit GBP initial** — faits, incohérences, opportunités et actions prioritaires dans un langage simple, sans garantie de classement.
- **Concurrence MVP** — 5 concurrents directs issus de 3 intentions locales, avec séparation stricte entre faits, interprétations et suggestions.
- [**Quel modèle et pipeline pour un audit SEO traçable ?**](issues/70-modele-pipeline-audit-seo.md) — audit séparé lié au `Prospect`, versions immuables, exports bruts conservés localement chiffrés, accès autorisé et transitions automatiques fail-closed.
- [**Quels périmètres d'audit et quelles limites commerciales ?**](issues/71-perimetres-audit-et-prix.md) — audit standard gratuit une fois par établissement, limites prudentes, budgets hybrides, branche sans site/GMB autorisée avec dossier minimal, rapport et PDF accessibles 7 jours.
- [**Quelles données peuvent être envoyées à un fournisseur cloud ?**](issues/51-politique-donnees-local-cloud.md) — cloud approuvé pour les données publiques/commerciales nécessaires, données personnelles limitées ou anonymisées, secrets et paiements bloqués ; intake cloud chiffré sans inférence obligatoire.
- [**Comment identifier un établissement et son site officiel sans rapprochement fragile ?**](issues/67-identification-etablissement-et-sources.md) — après « Ce n'est pas mon établissement », ouvrir directement l'aperçu local et demander uniquement l'adresse ; ne pas redemander la ville ni exiger un lien Google.
- **Catalogue à trois niveaux** — `Essential`, `Visibility`, `Managed`, structure commune et localisation des prix/limites ; montants finaux encore à tester.
- **Conversion démo-production** — la démo validée devient la base d'une `ProductionSite`/`SiteVersion`, avec domaine et publication après paiement et validation.
- **Pages locales conditionnelles** — contenu large possible en démo, indexation production réservée aux pages utiles, originales, prouvées et pertinentes.
- **Arborescence structurée** — `SiteSpec`, templates déterministes, configuration éditable et versions restaurables ; un profil de cockpit Ancrage V1 et son prototype sont maintenant disponibles, mais les états métier, contrats et gates de validation restent à spécifier.
- **Conservation provisoire** — 7 jours public, purge rapide des médias non retenus, archivage interne limité et logs conservés pour audit ; durées légales encore à rechercher.
- **Langues de lancement** — anglais pour Sri Lanka/Australie, singhalais ensuite pour Sri Lanka, français ensuite pour France ; autres langues extensibles mais non promises au MVP.
- **Démo standard** — 6 à 8 pages utiles, pages supplémentaires conditionnées par les données et la valeur réelle.
- **Édition client bornée** — données courantes et offres éditables ; structure, template, SEO avancé et langues passent par une génération contrôlée.
- **Audit GBP sans accès** — observation publique uniquement ; toute action propriétaire exige autorisation explicite.
- **Sauvegarde** — versions immuables, backup quotidien, réplication médias, restauration testée et restauration de version depuis le cockpit ; RPO/RTO à préciser.
- **Zéro abonnement fixe obligatoire** — les services doivent rester gratuits ou facturés à l'usage ; Neon PostgreSQL serverless est le candidat relationnel, Cloudflare fournit l'API, le stockage et l'asynchrone ; chaque coût doit être plafonné et traçable.
- **Hébergement pré-rendu usage-based** — PHP généré, cache/CDN et fonctions dynamiques rares ; aucun serveur mensuel par client.
- **Domaine après paiement** — recherche libre avant paiement, enregistrement après paiement et confirmation ; propriété et export client garantis.
- **Facturation client** — mensuel ou annuel remisé, sans engagement long par défaut, taxes/options/conditions d'arrêt explicites.
- **Chatbot mascotte documentaire** — aide gratuite, documentation validée, aucun accès métier ni promesse SEO.
- Analytics des sites clients : minimum respectueux de la vie privée à définir ; pas de tracker lourd obligatoire par défaut.
- **Analytics minimales** — visites, pages vues, clics téléphone/email/itinéraire/contact ; pas de profilage publicitaire lourd par défaut.
- **Registre agents éditable** — configuration versionnée par agent, fournisseur, modèle, prompt, schéma, budget et seuil ; les démos en cours restent figées.
- **Provenance compréhensible** — sources détaillées au cockpit, résumé sourcé côté audit client, séparation faits/hypothèses/suggestions.
- **Uploads isolés** — types/taille limités, scan, stockage séparé, URLs temporaires, suppression des métadonnées si nécessaire, aucune exécution.
- **Critère `to-spec`** — parcours, domaine, QA, coûts, sécurité, offres, langues, stack et frontières humaines décidés ; seuls les détails d'implémentation restent ouverts.
- **Capacité `Internet`** — le workflow de recherche de domaines, ses quatre connexions registrars, ses états, sa provenance, son ranking déterministe et sa frontière d'achat externalisé sont cadrés dans [92 — Workflow recherche domaines Internet](issues/92-workflow-recherche-domaines-internet.md). La validation officielle des APIs, quotas, prix et conditions reste un bloqueur de recherche avant intégration réelle.
- **Objectifs RPO/RTO MVP** — site publié ≤1 h/≤2 h, Control Plane ≤1 h/≤4 h, démo régénérable sous 24 h ; objectifs à vérifier par tests fournisseurs.
- **Offres définies par périmètre** — `Essential`, `Visibility`, `Managed` ; prix localisés et testés, pas inventés comme décisions définitives.
- **Test commercial réel** — 10 à 15 restaurants exploratoires au Sri Lanka, mesure dossier complet, coût, temps humain, démo vue, paiement et marge.
- **Vérification comptes fournisseurs** — les comptes Cloudflare et Neon sont maintenant vérifiés visuellement dans le navigateur ; aucun secret n'a été lu ou stocké. Les APIs, permissions minimales, quotas, coûts et désactivation restent à tester dans des projets séparés. Domaine, paiement, IA et email restent `à connecter`.
- **Import manuel de démo corrigée** — uniquement une archive de build contrôlée ; scan, sandbox, hash, versioning et QA avant remplacement, sans dossier PHP brut ni URL externe.
- **Moment de collecte de l'e-mail** — au clic sur « Préparer mon site », pendant une animation de préparation ; aucune génération réelle ne démarre avant la fourniture d'une adresse valide. L'e-mail sert ensuite à envoyer le lien de démo ; aucun e-mail ni paiement ne bloque l'accès à la valeur d'audit ; consentement marketing séparé.
- **Nouvelle capacité — audit SEO automatisé** — ajoutée comme capacité à cadrer séparément : identification prudente d'un établissement et d'un domaine, crawl borné, findings sourcés, rapport web et livraison e-mail ; aucun crawl si l'association est incertaine.
- **Modèle audit SEO provisoire** — `EstablishmentMatch` → `CrawlRun` → `SEOAudit` → `SEOFinding` → `SEORecommendation` → `SEOReport` → `ReportDelivery`, avec faits, calculs, IA, preuves et limites séparés.
- **Audit SEO fail-closed** — seuil de confiance, validation de domaine, protections SSRF, limites de crawl, budget et statut partiel doivent bloquer ou demander confirmation plutôt que deviner.
- **Dépassement de budget audit** — à 100 %, aucune dépense optionnelle ne démarre ; une branche essentielle ne termine que si son coût restant connu reste sous le plafond dur, sinon elle devient `PARTIAL` ou `BLOCKED`. Toute reprise exige une nouvelle enveloppe et un nouveau run ; aucun fallback premium ou relance implicite.
- **Sources et licences vérifiées** — la recherche 93 établit que Places est payant et soumis à attribution/conservation, Business Profile exige OAuth propriétaire, Nominatim public est exclu de l'autocomplétion et l'EULA Screaming Frog exclut par défaut un service automatisé multi-utilisateurs. Le MVP privilégie `CityIndex` local, observation Google transitoire seulement si approuvée, pistes concurrentielles sourcées et crawler HTTP/HTML interne.
- **Provider SEO DataForSEO** — un seul credential structuré login/mot de passe API couvre SERP Google, Maps/local pack, Business Listings, données de mots-clés, concurrents, intersections de domaines et OnPage. Les adapters et leurs chemins sont testés sans réseau réel ; les appels restent déclenchés par des workflows versionnés avec budget et `CostEvent`; aucune clé n'est créée ou copiée automatiquement.
- **DataForSEO prioritaire pour l'audit public** — DataForSEO couvre par défaut les capacités publiques disponibles de SERP, Google Maps/local pack et Business Listings ; l'API Google Business Profile reste exclue de la recherche anonyme et réservée à un futur mode propriétaire OAuth.
- **Index géographique et restitution** — GeoNames est le candidat commun sous CC BY 4.0 ; INSEE COG est la source française sous Licence Ouverte 2.0 ; ABS est secondaire ; la redistribution d'une source officielle Sri Lanka n'est pas confirmée. Google Maps public reste un handoff humain, OSM est conditionné à attribution/ODbL, et la redistribution DataForSEO reste `NON OBSERVABLE` avant confirmation écrite.
- **Prix et cadre légal** — le relevé 97 interdit toute promesse mondiale « moins cher » et sépare prix initial, prépaiement, renouvellement, taxes, domaine, support, SEO, propriété et export. Les offres `Essential`, `Visibility`, `Managed` restent structurées mais leurs montants sont à tester par marché ; aucune CGV ou conformité n'est conclue sans revue locale.
- **Arborescence globale** — le ticket [42](issues/42-arborescence-et-simplicite-systeme.md) est résolu au niveau architecture par `SiteSpec`, templates déterministes, configuration versionnée et cockpit orienté tâches ; le polish et les tests d'exécution restent hors décision Wayfinder.
- **Parcours audit groupé** — l'audit du site et l'analyse de la fiche Google Business Profile sont proposés ensemble lorsque les deux sources existent ; leurs données, autorisations et preuves restent séparées.
- **Rapport audit gratuit** — le prospect reçoit un rapport web complet dans le périmètre annoncé, avec preuves et limites ; les exports bruts, le volume illimité et les fonctions avancées restent distincts du rapport interprété.
- **Branche sans site** — si aucun domaine fiable n'est trouvé, aucun crawl n'est lancé ; une démo est proposée seulement si le seuil de génération est atteint, sinon le `ProgressiveIntake` demande les champs critiques manquants et les cinq photos obligatoires avant génération.
- **Base contacts audit** — l'e-mail est conservé comme `Contact` lié à un `Prospect`, un audit et une livraison ; il ne devient pas un `Customer` avant achat. Livraison, consentement marketing, préférences, rebonds et suppression restent distincts.
- **Stockage audit à trois niveaux — provisoire** — Neon conserve les métadonnées minimales, R2 les rapports et artefacts nécessaires avec lifecycle, et le Mac une copie locale chiffrée des exports lourds ; le Mac ne devient jamais la seule source de vérité ([76](issues/76-stockage-audits-local-cloud.md)).
- **Archives locales** — les crawls et exports complets restent sur le Mac sans suppression automatique, sauf suppression demandée, obligation légale, compromission ou action manuelle ; chiffrement, sauvegarde et alerte d'espace sont obligatoires.
- **Expérience rapport continue** — après nom/ville et enrichissement, l'audit GMB est affiché dès qu'il est prêt avec une progression vers l'audit SEO complet ; le rapport final réunit GMB et SEO. Le clic de préparation affiche une animation puis demande l'e-mail avant toute génération réelle ; le navigateur affiche ensuite la démo via une URL cloud privée, gratuite et accessible sept jours avant toute décision de paiement.
- **Parallélisation bornée** — après l'identité autorisée, la découverte technique indépendante peut préparer ses données, mais l'audit SEO complet, la concurrence et les mots-clés ne démarrent qu'après validation et production du premier rapport GMB ; ils consomment alors les données GMB avec les données du site et les autres sources autorisées. Le rapport final attend ces résultats ; le plan du site attend le rapport final. Les règles déterministes précèdent les agents, les petits modèles sont privilégiés et chaque branche possède budget, timeout et état partiel ([77-progression-rapport-et-agents-paralleles.md](issues/77-progression-rapport-et-agents-paralleles.md)).
- **Deux pipelines coordonnés** — après l'audit, un `PipelineRun` Website Factory peut lancer les sous-agents nécessaires au contenu, à la traduction, aux assets et au `SiteSpec`, puis un renderer déterministe et les QA ; les études concurrentielles et de marché restent des pipelines futurs.
- **Progression fondée sur des checkpoints** — la barre et le CTA du frontend reflètent les `ProgressCheckpoint` validés par le Control Plane ; un agent ne peut pas falsifier l'avancement.
- **CTA audit vers Website Factory** — le rapport est affiché automatiquement après une progression réelle, mais le second `PipelineRun` ne démarre qu'après confirmation explicite du prospect via un CTA ; le site reste invisible jusqu'à `READY_FOR_OWNER_REVIEW` puis validation du propriétaire.
- **Dernière précision avant génération** — juste avant le second `PipelineRun`, le prospect peut ajouter librement une information complémentaire utile au site ou au SEO ; le champ reste facultatif et l'interface épurée, sans catégories supplémentaires.
- **Comparaison de prix prudente** — la promesse « moins cher du marché » reste interdite tant qu'un comparatif daté et homogène n'est pas établi ; le ticket [79](issues/79-comparatif-prix-et-promesse-marche.md) doit fournir les preuves.
- **Pilotage cockpit de l'audit** — le propriétaire peut versionner contenu, règles d'affichage, priorités, prompts de synthèse, profils de crawl et e-mails ; il peut suivre et relancer le CLI Screaming Frog via profils contrôlés, sans shell arbitraire exposé au navigateur.
- **Terminal local d'intervention** — le cockpit peut ouvrir sur le Mac opérateur un terminal avec commande Screaming Frog préparée, profil et dossier isolé visibles ; confirmation obligatoire avant exécution, aucun terminal public.
- **IA audit SEO subordonnée** — règles et métriques déterministes d'abord ; l'IA explique, regroupe et priorise seulement des findings prouvés, avec sortie structurée et reviewer indépendant.
- **Screaming Frog hors chemin commercial** — le MVP s'appuie sur le crawler HTTP/HTML interne ; le CLI Screaming Frog reste une intervention opérateur conditionnée à une licence compatible vérifiée par écrit.
- **Crawl fail-closed** — validation DNS/IP avant connexion et après redirection, limites de ressources, isolation, absence d'exécution/téléchargement et logs expurgés sont des gates bloquants ; la preuve d'exécution appartient au vertical slice.
- **Stockage audit borné** — Neon pour les métadonnées, R2 pour le rapport/PDF pendant sept jours par défaut, archive locale chiffrée pour les exports lourds sans réplication supplémentaire acceptée au MVP ; une restauration Mac éteint reste `WAITING_FOR_MAC`.
- **Orchestration audit** — `GMB_REPORT_READY` est le premier livrable client ; `SEO_REPORT_IN_PROGRESS` est déclenché ensuite avec la sortie GMB ; `FINAL_REPORT_READY` réunit les deux ; `content-plan` et toute génération Website Factory sont bloqués jusqu'à ce rapport final et au clic de préparation suivi d'un e-mail valide.

## Gates restantes après `to-spec`

La direction produit et l'architecture de l'audit sont décidées. Les éléments ci-dessous ne sont plus des choix structurants à inventer dans la map ; ce sont des validations d'exécution, des prototypes ou des preuves externes à traiter après passage en specs :

### Gates d'exécution après `to-spec`

- **Prototype templates** : différé ; reprendre avec l'agent UI, hors chemin critique de l'architecture.
- **Prototypes public/cockpit/templates** : validation statique effectuée le 27 août 2026 et consignée dans [09-validation-prototypes-wayfinder-2026-08-27.md](../../docs/ux/09-validation-prototypes-wayfinder-2026-08-27.md). Les prototypes restent jetables ; une nouvelle vérification navigateur est `NON OBSERVABLE` dans cette session car le navigateur intégré a refusé `file://`.
- **Prototype parcours public** : les écrans E0–E7, l'e-mail invalide, le PDF, la partialité, la validation opérateur et le CTA sont présents ; l'intégration backend et le vertical slice réel restent ouverts.
- **Recherche fournisseurs** : la documentation officielle est consolidée dans [94](research/94-dataforseo-endpoints-prix-limites-provenance.md) et [95](research/95-cloudflare-neon-prix-limites-restauration.md) ; restent à tester compte, permissions, coûts effectifs, quotas, restauration et désactivation, sans activation automatique.
- **Sécurité et données** : la décision documentaire est résolue dans le ticket [10](issues/10-securite-donnees-et-standards.md) ; les tests runtime de sandbox/egress, rate limiting, backups, restore et suppression restent des gates d'exécution.
- **RPO/RTO** : tester les objectifs du document [63-rpo-rto-mvp.md](research/63-rpo-rto-mvp.md).
- **Pricing réel** : le relevé officiel [97](research/97-pricing-et-cadre-legal-marches.md) interdit une revendication « moins cher » ; exécuter ensuite le protocole [64-protocole-test-prix-restaurants.md](research/64-protocole-test-prix-restaurants.md) avant de fixer les montants.
- **Catalogue final** : renseigner les prix, taxes, limites, options et conditions dans les trois offres après les tests.
- **Vertical slice réel** : produire quelques démos avec de vrais restaurants, mesurer coût, délai, qualité et temps opérateur.
- **Audit SEO — entrée produit** : décision déjà résolue dans [66](issues/66-entree-audit-seo-et-promesse.md) ; le pré-slice Control Plane local est implémenté, tandis que l'intégration publique réelle reste ouverte.
- **Identification établissement/domaine** : les options et licences sont documentées dans [96](research/96-cityindex-gmb-concurrence-conservation.md) ; rester en `À TESTER` pour couverture, import, mapping et runtime, avec `CityIndex` versionné et handoff Maps humain.
- **Confirmation d'identité** — `AUTO_CONTINUE` est réservé à une fiche unique cohérente et corroborée sans conflit critique ; plusieurs candidats, un conflit ou une correspondance insuffisante déclenchent `ASK_CONFIRMATION`, et l'absence d'identité fiable déclenche `ASK_MORE_DATA` avec l'adresse uniquement. Aucun audit ne démarre avant la décision autorisante.
- **Correspondance unique forte** — afficher le nom, la fiche et une ou deux images, puis continuer automatiquement ; proposer un contrôle discret « Ce n'est pas mon établissement » pour basculer vers une branche sans fiche confirmée.
- **Ville structurée obligatoire** — la ville est choisie dans des suggestions structurées après saisie des premières lettres, avec pays et identifiant géographique ; une valeur libre n'est pas acceptée comme ville de référence.
- **Branche sans GMB confirmé** — si aucune fiche fiable ne correspond malgré la ville validée, demander uniquement l'adresse de l'établissement puis produire un aperçu local borné : site officiel éventuel, mots-clés, concurrents directs et opportunités SEO local. La même préparation de site reste proposée sans ressaisie.
- **Autocomplétion géographique MVP** — privilégier un index local de villes pour limiter coûts et dépendances ; Google Places Autocomplete est une option à vérifier pour couverture/UX et règles d'attribution ; l'instance publique Nominatim est exclue pour l'autocomplétion client ; Pelias/Photon restent des options auto-hébergées à étudier.
- **Licence crawler** : le ticket [68](issues/68-licence-screaming-frog-et-cli-cloud.md) est résolu par le retrait de Screaming Frog du chemin commercial ; une éventuelle licence opérateur reste optionnelle.
- **Référence Screaming Frog** : la documentation CLI macOS, les limites gratuites, le launcher, les profils `.seospiderconfig`, les exports et le risque EULA sont capturés dans [74-screaming-frog-cli-reference.md](research/74-screaming-frog-cli-reference.md).
- **Sécurité crawler** : les contrôles sont spécifiés et le ticket [69](issues/69-crawl-securite-isolation-ssrf.md) résolu ; l'exécution des tests reste un gate.
- **Modèle et états audit** : valider les entités, transitions, idempotence, conservation et comparabilité ([70](issues/70-modele-pipeline-audit-seo.md)).
- **Périmètres/prix audit** : aligner aperçu, standard et avancé avec les trois offres, budgets durs et affichage honnête du périmètre ([71](issues/71-perimetres-audit-et-prix.md)).
- **Rapport audit** : hiérarchie et états sont décidés dans [72](issues/72-prototype-rapport-audit-seo.md) ; le prototype throwaway reste à relire avant UI de production.
- **Cockpit audit/CLI** : décider le niveau d'accès local au launcher, les profils autorisés et la frontière entre pilotage et terminal exceptionnel ([75](issues/75-cockpit-rapport-et-cli-screaming-frog.md)).
- **Vertical slice audit** : exécuter un jeu de sites explicitement autorisés et mesurer exactitude, coût, délai, qualité et suppression ([73](issues/73-vertical-slice-audit-seo.md)) ; aucune cible réelle ni donnée externe n'a été ajoutée pendant cette passe.
- **Pré-slice audit local** : le crawler, le service, le registre immuable, les routes API et le rapport échappé sont implémentés et testés sur sept fixtures synthétiques ; le ledger de coûts et les adapters DataForSEO sont testés séparément, sans fermer le gate réel.
- **Écart de séquencement à corriger dans l'implémentation** : la simulation `client-site-simulation` doit être alignée sur `dossier → gmb-report → audit SEO/concurrence avec sortie GMB → rapport final → plan de contenu → site → QA`; son plan de contenu ne doit plus dépendre directement de la seule validation du dossier.
- **Juridique par marché** : le ticket [40](issues/40-cadre-legal-cgv-par-pays.md) reste ouvert comme validation externe ; les textes contractuels, la juridiction et la conformité doivent être revus avant production, sans bloquer la rédaction des specs techniques.

### État de fermeture Wayfinder

| Domaine | État | Ce qui est fixé | Ce qui reste hors de la map |
|---|---|---|---|
| Parcours commercial | fermé | audit GMB visible, audit SEO ensuite, rapport final, CTA, e-mail, démo avant paiement | mesure de conversion réelle |
| Workflow d'audit | fermé pour `to-spec` | dépendances, rapports, branches, provenance, partialité, budgets et gates | comptes, coûts et quotas réellement observés |
| Workflow Website Factory | fermé au niveau architecture | génération après rapport final et e-mail, contenu après audit, rendu, QA, validation opérateur | implémentation et vertical slice |
| Sécurité et données | fermé au niveau décision | SSRF, secrets, provenance, conservation, suppression et séparation cloud/local | tests runtime, restauration et revue juridique |
| Offre et marché | cadré, non commercialisé | segment initial, offre bornée, langues et limites de promesse | prix finaux, CGV, test marché |
| Preuve d'exécution | ouverte par nature | pré-slice synthétique documenté | ticket [73](issues/73-vertical-slice-audit-seo.md), sites autorisés et go/no-go |

### Non-bloqueurs pouvant rester ouverts

- choix détaillé des fournisseurs secondaires ;
- polish visuel final ;
- extension à d'autres verticales que les restaurants ;
- langues supplémentaires après anglais/singhalais/français ;
- analytics avancées ;
- fonctions de commande, réservation et intégrations complexes.

### Frontière `to-spec`

Le projet peut passer à `to-spec` pour la tranche d'audit GMB/SEO et pour la coordination audit → Website Factory : aucun choix produit fondamental de ce périmètre ne reste implicite. Les tickets [40](issues/40-cadre-legal-cgv-par-pays.md) et [73](issues/73-vertical-slice-audit-seo.md) restent des gates de production et de commercialisation, pas des raisons de réouvrir l'architecture déjà décidée. La construction et la commercialisation ne sont pas déclarées réalisées par la présente carte.

## Out of scope

- Implémentation du produit ou d'une production application pendant cette carte.
- Applications natives Android, iOS ou macOS pour le MVP.
- Exposition publique obligatoire du cockpit opérateur pendant le MVP.
