# Website Factory

Glossaire du contexte commercial et produit de la plateforme de démonstrations personnalisées et de sites pour petites entreprises locales.

## Concepts commerciaux

**Prospect**:
Personne ou organisation qui demande à voir une proposition de site, sans avoir encore acheté.
_Avoid_: Customer, Client

**Business**:
Établissement ou activité locale représentée par un prospect et destinée à recevoir un site.
_Avoid_: Lead, Contact

**Contact**:
Personne et coordonnées associées à un prospect ou à un business.
_Avoid_: Business, Customer

**Customer**:
Business pour lequel un achat a été validé.
_Avoid_: Prospect, Lead

**Account**:
Identité de connexion permettant à un Customer d'acheter, gérer son abonnement et administrer son site ; elle n'est pas nécessaire pour consulter une Demo.
_Avoid_: Prospect, Contact, méthode de paiement

**AuthenticationIdentity**:
Identité email, Google ou autre fournisseur reliée à un `Account`, avec une provenance et une procédure de liaison contrôlées.
_Avoid_: adresse email seule, profil social non vérifié

## Démonstration et publication

**DemoRequest**:
Dossier de demande complet et autorisé à partir duquel une génération de démonstration peut être planifiée ; la demande initiale nom + ville est une `MinimalRequest` distincte.
_Avoid_: Lead, Demo

**MinimalRequest**:
Première demande volontaire contenant uniquement le nom d'un établissement et sa ville, utilisée pour démarrer l'enrichissement.
_Avoid_: dossier complet, DemoRequest complète

**EnrichmentRun**:
Tentative traçable de trouver et rapprocher des informations autorisées sur un business avant de demander des données supplémentaires au prospect.
_Avoid_: vérité automatique, scraping sans provenance

**ProgressiveIntake**:
Formulaire complémentaire qui demande uniquement les informations critiques restées manquantes ou contradictoires après enrichissement.
_Avoid_: questionnaire initial long

**Demo**:
Artefact commercial temporaire et navigable présenté avant paiement ; il peut avoir plusieurs versions et une expiration.
_Avoid_: ProductionSite, final site

**DemoGeneration**:
Tentative versionnée et traçable de production d'une `Demo`, avec sa deadline, son budget, ses artefacts, ses logs et son résultat d'acceptation.
_Avoid_: simple retry, Demo elle-même

**SiteVersion**:
Version immuable d'une représentation de site pouvant être évaluée, publiée ou remplacée par une nouvelle version.
_Avoid_: Demo, ProductionSite

**ProductionSite**:
Site durable publié pour un Customer après achat et validation de la version à mettre en ligne.
_Avoid_: Demo, Preview

**Restaurant**:
Business indépendant dont l'offre principale est un menu de plats ou boissons consommés sur place, à emporter ou livrés, et dont le site doit au minimum présenter l'identité, l'offre et les moyens de contact ou de visite.
_Avoid_: chaîne, activité touristique

**Menu**:
Présentation structurée et datée des plats, boissons, prix et informations associées fournie par le restaurant.
_Avoid_: contenu inventé, offre supposée

**TranslationReview**:
Validation du restaurateur ou de l'opérateur portant sur une traduction avant sa publication commerciale.
_Avoid_: garantie de traduction parfaite

**Locale**:
Combinaison d'une langue et d'un contexte régional ciblé, par exemple `fr-FR` ou `en-GB`.
_Avoid_: langue seule

**LanguageVersion**:
Version complète du site publiée ou préparée dans la langue choisie par le restaurateur.
_Avoid_: traduction isolée

**Translation**:
Contenu localisé depuis la langue de saisie du restaurateur vers la langue de publication choisie, dont l'état de validation doit être traçable.
_Avoid_: texte traduit publié automatiquement

**RestaurantProfile**:
Informations structurées et relativement stables d'un restaurant : identité, adresse, horaires, services, contacts et liens utiles.
_Avoid_: texte éditorial généré

**PhotoAsset**:
Photo fournie ou validée par le restaurant et autorisée pour être utilisée sur son site.
_Avoid_: image générée, image décorative non validée

**Provenance**:
Origine, date, statut de vérification et conditions d'utilisation associés à une donnée, un contenu ou un asset.
_Avoid_: simple URL, vérité automatique

**SEOPage**:
Page publiée ou préparée avec une intention utilisateur, une relation locale ou éditoriale, des données sourcées et une décision d'indexation explicite.
_Avoid_: page créée seulement pour un mot-clé, page locale dupliquée

**SEOAcceptanceGate**:
Ensemble versionné de contrôles déterministes et de revues qui vérifie crawlabilité, exactitude, structure, performance, accessibilité, contenu, données structurées et décision d'indexation avant publication.
_Avoid_: score SEO unique, garantie de classement

**LocalSearchEntity**:
Représentation canonique et sourcée d'un établissement local, reliant identité, adresse, téléphone, horaires, cuisine, menu, URL et profils externes autorisés.
_Avoid_: simple fiche Google copiée, agrégat de sources contradictoires

**EstablishmentMatch**:
Résultat versionné du rapprochement entre une demande minimale, un établissement candidat, un domaine et des sources publiques, avec niveau de confiance, preuves, contradictions et décision de continuer ou demander confirmation.
_Avoid_: établissement deviné, URL choisie arbitrairement

**SEOAudit**:
Analyse versionnée et bornée d'un site identifié, composée de faits observés, métriques calculées, preuves, problèmes, recommandations, limites et livrables.
_Avoid_: score SEO opaque, export brut d'un crawler, garantie de classement

**CrawlRun**:
Exécution isolée et traçable d'une exploration d'un site, avec profil, périmètre, règles, ressources consommées, progression, statut et artefacts récupérés.
_Avoid_: simple requête HTTP, crawl sans limites

**SEOFinding**:
Problème ou observation rattaché à une règle, des valeurs observées, des URL, des preuves, une sévérité, une confiance et une date de détection.
_Avoid_: affirmation IA non sourcée, anomalie sans preuve

**SEORecommendation**:
Action proposée à partir d'un ou plusieurs `SEOFinding`, explicitant impact, effort, priorité, limites et niveau de confiance.
_Avoid_: conseil générique sans fait associé

**SEOReport**:
Livrable consultable présentant un `SEOAudit` dans un langage compréhensible, avec résumé, priorités, preuves, périmètre et limites.
_Avoid_: CSV livré sans interprétation, rapport culpabilisant

**ReportDelivery**:
Livraison contrôlée d'un `SEOReport` par lien signé, e-mail ou téléchargement, avec consentement, expiration, statut de livraison et demande de suppression.
_Avoid_: rapport public permanent, e-mail non traçable

**PipelineRun**:
Exécution versionnée d'un parcours métier composé d'étapes déterministes et de contributions d'agents, avec état, budget, deadline, preuves et transitions récupérables.
_Avoid_: pourcentage visuel sans état réel, conversation d'agents comme workflow

**ProgressCheckpoint**:
État mesurable et horodaté d'une étape de `PipelineRun`, exposable au frontend avec libellé compréhensible, statut, dépendances, progression déterminée et éventuelle anomalie.
_Avoid_: barre animée indépendante du travail réel

**AgentContribution**:
Sortie structurée et versionnée d'un agent attachée à une étape et à des preuves, qui peut être validée, rejetée ou ignorée par le Control Plane.
_Avoid_: agent maître, sortie non attribuée

**DomainOwnershipVerification**:
Preuve de contrôle d'un domaine requise uniquement pour les fonctions d'audit qui dépassent les données publiques, avec méthode, date, portée et expiration.
_Avoid_: accès privé supposé, audit Search Console sans autorisation

## Offre commerciale

**Plan**:
Offre commerciale décrivant un prix, un périmètre et des conditions d'utilisation.
_Avoid_: Subscription, prix seul

**Subscription**:
Souscription active ou historique d'un Customer à un Plan.
_Avoid_: Plan, simple paiement

**Entitlement**:
Droit ou limite accordé par un Plan ou une Subscription, par exemple le nombre de sites, langues ou régénérations.
_Avoid_: fonctionnalité implicite

**SiteApproval**:
Validation d'une `SiteVersion` par le restaurant avant sa publication en production.
_Avoid_: TranslationReview, simple aperçu

**Publication**:
Mise en ligne d'une `SiteVersion` validée comme version exploitable d'un `ProductionSite`.
_Avoid_: génération, sauvegarde

**DemoTimeout**:
Interruption contrôlée d'une `DemoGeneration` qui n'a pas atteint un état présentable avant sa limite de temps.
_Avoid_: simple retard, expiration commerciale

**DeadlinePolicy**:
Règle versionnée qui fixe la durée maximale autorisée pour une `DemoGeneration`, ici une heure sans prolongement implicite.
_Avoid_: estimation de durée, notification

**TimeoutEvent**:
Fait immuable constatant qu'une génération n'a pas atteint son état attendu avant sa `deadlineAt`, avec l'étape et les horodatages concernés.
_Avoid_: alerte seule, log non contextualisé

**DemoIncident**:
Événement documenté affectant la génération ou la qualité d'une démo, avec étape, preuves, impact et décision de suite.
_Avoid_: log technique isolé

**OperatorIntervention**:
Action explicitement prise par un opérateur pour inspecter, corriger, relancer ou abandonner une démo interrompue.
_Avoid_: retry automatique

**CodexHandoff**:
Transmission traçable du contexte nécessaire d'une démo interrompue vers une intervention Codex, sans transfert implicite de secrets ni autorisation automatique d'actions irréversibles.
_Avoid_: exécution autonome dans Codex

**AcceptanceReport**:
Rapport immuable réunissant les preuves, anomalies, warnings, revue humaine et décision d'acceptation d'une génération ou d'une version.
_Avoid_: log, score isolé, simple statut

**RecoveryAction**:
Action explicite et traçable destinée à inspecter, reprendre, rejouer, corriger ou abandonner une génération interrompue.
_Avoid_: retry automatique, effacement de l'incident

## Agents et orchestration

**AgentDefinition**:
Rôle configuré d'un agent dans un workflow, avec sa description, sa place, ses entrées, ses sorties et ses règles attendues.
_Avoid_: modèle seul, conversation libre

**AgentConfigurationVersion**:
Version activable d'une `AgentDefinition`, incluant ses instructions, son fournisseur, son modèle, ses limites et ses paramètres autorisés.
_Avoid_: modification invisible, configuration globale mutable

**AgentRun**:
Exécution tracée d'une `AgentConfigurationVersion` pour un workflow, avec ses entrées, sorties, validations, erreurs, durée et coût.
_Avoid_: réponse LLM isolée, source de vérité

**ProviderConnection**:
Configuration sécurisée et testable d'un fournisseur IA ou d'un endpoint local, sans exposer son secret aux interfaces clientes.
_Avoid_: clé API dans un prompt, fournisseur implicite

**ModelProfile**:
Description versionnée des capacités, coûts, limites et usages autorisés d'un modèle accessible par une `ProviderConnection`.
_Avoid_: nom de modèle non documenté, modèle magique

**AIRoutingPolicy**:
Règle versionnée qui choisit si une étape reste déterministe, utilise le local, peut utiliser le cloud ou exige une validation humaine, avec budget et fallback explicites.
_Avoid_: fallback premium silencieux, choix au hasard

**AIExecutionRecord**:
Trace d'une exécution IA comprenant fournisseur, modèle, politique, version d'instructions, schéma, données autorisées, coût, durée, résultat, fallback et validation.
_Avoid_: conversation non attribuée, coût inconnu

**QualityGate**:
Contrôle versionné et bloquant ou non bloquant, fondé sur des règles déterministes, une preuve ou une revue spécialisée, qui produit `PASS`, `WARN` ou `BLOCK` avant une transition de workflow.
_Avoid_: score global opaque, consensus d'agents

**ReviewerRun**:
Exécution traçable d'un contrôle spécialisé ou d'un reviewer indépendant sur un artefact, avec règles, entrées, preuves, résultat, version et coût.
_Avoid_: relecture IA sans preuve, agent superviseur tout-puissant

## Promesse produit

**Preuve avant paiement**:
Principe commercial selon lequel le prospect peut voir une Demo personnalisée avant de décider d'acheter la mise en production.
_Avoid_: free trial illimité, garantie de résultats SEO
