# Parcours client complet Website Factory

Type : référence fonctionnelle transmissible à une IA  
Statut : consolidation des specs et décisions existantes  
Version : 1  
Date : 2026-08-26

## But

Cette référence décrit le parcours public complet, ses branches, ses états, ses données, ses décisions et ses sorties, depuis la première arrivée du prospect jusqu'à la démo puis à la mise en production éventuelle.

La source normative de l'ordre commercial est [87-parcours-client-reference.md](87-parcours-client-reference.md). Cette référence la détaille sans inverser ses étapes.

## Règles absolues

1. Le prospect commence avec seulement le nom de l'établissement et une ville structurée sélectionnée.
2. Une ville saisie librement mais non sélectionnée ne peut pas lancer le parcours.
3. Une correspondance multiple n'est jamais choisie silencieusement.
4. Une absence de fiche Google Business Profile n'est jamais présentée comme une preuve que l'établissement n'en possède aucune.
5. Aucune donnée critique, aucun prix, horaire, plat, droit ou photo n'est inventé.
6. L'audit GMB est affiché dès qu'il est prêt, même si l'audit SEO continue.
7. Le bouton Préparer mon site apparaît uniquement quand le rapport complet est arrivé, y compris le rapport local final de la branche sans site ou sans GMB.
8. Le PDF complet GMB + SEO est téléchargeable depuis le rapport final, sans e-mail, compte ou paiement.
9. L'adresse e-mail n'est demandée qu'après le clic sur Préparer mon site.
10. Aucune génération réelle ne commence sans adresse e-mail valide.
11. Aucune démo n'est envoyée avant QA et validation explicite de l'opérateur.
12. Le prospect voit la démo avant tout paiement.
13. L'achat, le domaine et la publication ne commencent qu'après consultation de la démo et décision explicite du prospect.

## Parcours complet en une ligne

~~~text
Nom + ville sélectionnée
-> enrichissement
-> identification établissement
-> site trouvé ou branche sans site
-> ProgressiveIntake des champs critiques
-> audit GMB visible
-> audit SEO ou aperçu local borné
-> rapport final + PDF
-> clic Préparer mon site
-> e-mail valide
-> génération Website Factory
-> QA
-> validation opérateur
-> lien privé de démo gratuit
-> achat éventuel
-> domaine et publication
~~~

## Schéma principal

~~~mermaid
flowchart TD
  E0["Arrivée sur le site"] --> E1["Nom + ville"]
  E1 --> D1{"Ville sélectionnée ?"}
  D1 -- "Non" --> E1B["Suggestions structurées : pays + cityId"] --> E1
  D1 -- "Oui" --> E2["EnrichmentRun"]

  E2 --> D2{"Rapprochement"}
  D2 -- "Une fiche forte" --> M1["Afficher fiche + 1 ou 2 images"]
  M1 --> D3{"Ce n'est pas mon établissement ?"}
  D3 -- "Non" --> M4["Identité confirmée"]
  D3 -- "Oui" --> N1["Branche sans fiche confirmée"]
  D2 -- "Plusieurs fiches" --> M2["Afficher 2 ou 3 candidats"]
  M2 --> D4{"Choix explicite ?"}
  D4 -- "Oui" --> M4
  D4 -- "Non" --> N1
  D2 -- "Aucune fiche fiable" --> N1

  M4 --> D5{"Site officiel fiable ?"}
  D5 -- "Oui" --> P1["Lancer GMB + SEO de base en parallèle"]
  D5 -- "Non" --> P2["Lancer GMB si disponible, aucun crawl"]
  N1 --> N2["Demander uniquement l'adresse"]
  N2 --> N3["LOCAL_PREVIEW_WITHOUT_GMB"]
  N3 --> D6{"Site officiel fiable ?"}
  D6 -- "Oui" --> P1
  D6 -- "Non" --> P2

  P1 --> G1["Observation GMB si disponible"]
  P1 --> B1["Audit SEO de base si site confirmé"]
  P1 --> I1["ProgressiveIntake en parallèle"]
  P2 --> G1
  P2 --> I1
  I1 --> D7{"Dossier complet ?"}
  D7 -- "Non ou contradictoire" --> I2["ProgressiveIntake ciblé"]
  I2 --> D8{"Réponse reçue et cohérente ?"}
  D8 -- "Non" --> I2B["PARTIAL ou BLOCK : expliquer et attendre"] --> I2
  D8 -- "Oui" --> I3["Dossier complet"]
  D7 -- "Oui" --> I3

  G1 --> D_GMB{"Rapport GMB disponible ?"}
  D_GMB -- "Oui" --> G2["GMB_REPORT_READY : afficher maintenant"]
  D_GMB -- "Non" --> G5["Aperçu local borné sans GMB"]
  G2 --> G3["Audit SEO général\nGMB si disponible + SEO de base + concurrents + mots-clés"]
  B1 --> G3
  G3 --> G4["FINAL_REPORT_READY : rapport complet ou local borné"]
  G5 --> G3
  G4 --> R1["Rapport complet consultable"]
  R1 --> D9{"Rapport final arrivé ?"}
  D9 -- "Non, SEO continue" --> R1
  D9 -- "Oui" --> PDF["Petit bouton rond PDF\nRapport complet GMB + SEO"]
  PDF --> C0["CTA Préparer mon site"]
  C0 --> D_CTA{"Clic Préparer mon site ?"}
  D_CTA -- "Non" --> R1
  D_CTA -- "Oui" --> C1["Préparation honnête"]
  C1 --> C2["Demander e-mail"]
  C2 --> D_EMAIL{"E-mail valide ?"}
  D_EMAIL -- "Non" --> C2B["Erreur, aucun run"] --> C2
  D_EMAIL -- "Oui" --> C3["DemoRequest enregistrée, checklist de préparation"]
  C3 --> D_READY{"Dossier, photos et droits complets ?"}
  D_READY -- "Non" --> C4["Enregistrer et compléter"] --> I2
  D_READY -- "Oui" --> W1["WebsiteFactoryPipelineRun"]

  W1 --> W2["Snapshot, versions, budget"]
  W2 --> W3["Faits + findings + contenu"]
  W3 --> W4["Assets + langue + SiteSpec"]
  W4 --> W5["Rendu déterministe"]
  W5 --> Q1["QA + AcceptanceReport"]
  Q1 --> D11{"Avant T+1h et gates sûrs ?"}
  D11 -- "Non" --> T1["Timeout ou correction"]
  T1 --> T2["Intervention humaine / Codex"]
  T2 --> T3["Nouvelle génération explicite"] --> Q1
  D11 -- "Oui" --> O1["READY_FOR_OWNER_REVIEW"]
  O1 --> D12{"Validation opérateur ?"}
  D12 -- "Renvoyer" --> T2
  D12 -- "Abandonner" --> X1["Aucun envoi"]
  D12 -- "Valider" --> D2B["READY_FOR_PROSPECT"]
  D2B --> D13["Lien privé démo, 7 jours"]
  D13 --> D14{"Achat ?"}
  D14 -- "Non" --> X2["Expiration puis archive"]
  D14 -- "Oui" --> BUY1["Compte + paiement + domaine"]
  BUY1 --> BUY2["SiteApproval + nouvelle version"]
  BUY2 --> BUY3["Gates production puis publication"]
~~~

## 1. Première arrivée et identification

### E0, page d'accueil

La page répond à trois questions : ce que le prospect obtient, ce qu'il doit faire maintenant et ce qui se passe ensuite. Une seule action principale démarre le parcours. Aucun compte, e-mail, paiement ou détail technique n'est demandé.

Accroche décidée : **Votre restaurant mérite d'être trouvé.**

Sous-accroche décidée : **Votre site web professionnel, préparé pour vous avant de payer.**

### E1, MinimalRequest

Champs visibles :

- nom de l'établissement ;
- ville ou lieu.

La ville doit être choisie dans une liste structurée avec libellé, pays et identifiant géographique. Si le prospect n'effectue pas la sélection, aucun enrichissement ne démarre.

### E2, EnrichmentRun

La recherche autorisée collecte avec source, date et confiance :

- fiche Google Business Profile ou fiche locale publique ;
- site officiel et domaines candidats ;
- nom, adresse, téléphone, catégorie et horaires ;
- services, menu, plats et prix lorsqu'ils sont accessibles ;
- photos et statut du droit d'utilisation ;
- liens officiels et signaux locaux utiles à l'audit.

Le résultat est un EstablishmentMatch versionné avec candidats, confiance, provenance, contradictions et décision AUTO_CONTINUE, ASK_CONFIRMATION ou ASK_MORE_DATA.

### Arbre d'identification

~~~mermaid
flowchart TD
  A["Nom + ville sélectionnée"] --> B{"Résultat"}
  B -- "Une fiche forte" --> C["Fiche + nom + images"]
  C --> D{"Le prospect dit que ce n'est pas son établissement ?"}
  D -- "Non" --> E["AUTO_CONTINUE"]
  D -- "Oui" --> F["Demander adresse"]
  B -- "Plusieurs fiches" --> G["2 à 3 candidats : nom, adresse, téléphone, image"]
  G --> H{"Le prospect choisit ?"}
  H -- "Oui, c'est mon établissement" --> E
  H -- "Non" --> F
  B -- "Aucune fiche fiable" --> F
  F --> I["LOCAL_PREVIEW_WITHOUT_GMB"]
~~~

Une fiche forte est affichée avant la poursuite automatique. Plusieurs fiches exigent un choix explicite. Une absence de fiche fiable ouvre la branche locale et ne redemande pas la ville.

## 2. Site trouvé, site absent et branche sans GMB

### Si un site fiable est trouvé

Le système crée un SiteCandidate et prépare un crawl borné. L'audit SEO de base peut démarrer en parallèle de l'observation GMB. L'audit SEO général, les mots-clés et la concurrence utilisent ensuite le rapport GMB dès qu'il est disponible, avec le site et les preuves de base. Le profil gratuit provisoire est de 50 URL maximum, 3 minutes et 25 Mo, en HTML et mesures ciblées, sans rendu JavaScript complet par défaut. Le rapport affiche son vrai périmètre, ses dates, ses preuves et ses limites.

### Si aucun site fiable n'est trouvé

L'état NO_SITE_FOUND ne lance aucun crawl. Le rapport peut afficher :

- site officiel éventuellement identifié ;
- intentions et mots-clés locaux ;
- concurrents directs ;
- comparaison limitée de leurs présences ;
- opportunités SEO local ;
- limite explicite sur l'absence de site confirmé.

### Si aucune fiche GMB fiable n'est confirmée

Le système demande uniquement l'adresse. Il ne redemande pas la ville et ne requiert pas d'abord un lien Google.

L'aperçu local borné remplace l'audit GMB. Il indique clairement que la fiche n'a pas été confirmée. La même branche peut préparer une démo si le dossier minimal atteint le seuil requis.

### Cas sans site et sans GMB

C'est une branche valide, pas un rejet automatique :

1. ville déjà sélectionnée ;
2. adresse demandée ;
3. aperçu local borné ;
4. nom, contact, informations métier, plats, prix et images autorisées complétés ;
5. cinq photos requises validées ;
6. rapport local final disponible ;
7. CTA Préparer mon site affiché à ce moment ;
8. e-mail demandé seulement après le clic ;
9. génération seulement après e-mail valide.

## 3. Dossier et ProgressiveIntake

La page d'accueil ne collecte pas directement un questionnaire long. Après enrichissement, le système calcule les RequiredInput manquants ou contradictoires et ne demande que ces éléments.

### Champs bloquants avant génération

- identité de l'établissement ;
- localisation ou adresse exploitable ;
- contact utile au suivi ;
- offre ou menu réel ;
- plats et prix vérifiables lorsqu'ils sont affichés ;
- photos fournies ou validées et utilisables ;
- cinq photos : façade, deux plats signatures, intérieur ou terrasse, équipe ou service ;
- langue de saisie et une seule langue de publication choisie au MVP.

Dans la branche sans fiche, le nom et prénom du contact ou propriétaire font partie des informations nécessaires au dossier.

Le guide photo prévoit une exception à confirmer : un logo peut remplacer la
photo d'équipe si le restaurant ne peut pas montrer de personnes. Tant que cette
exception n'est pas formellement arbitrée, l'IA doit signaler
`DECISION_REQUIRED` et ne pas la considérer comme une règle automatique.

### Champs recommandés

- horaires confirmés ;
- type de cuisine et services ;
- histoire du restaurant ;
- élément différenciant ;
- liens externes officiels ;
- réseaux sociaux officiels ;
- préférences de ton et contenu.

Une question libre facultative peut recueillir une histoire ou un élément différenciant avant la génération. Elle ne doit pas devenir une liste de catégories.

### Manque ou contradiction

Le système doit nommer le champ, expliquer son utilité, demander une correction, conserver les anciennes valeurs et leurs sources, puis recalculer la complétude. Il ne remplace jamais une donnée par une supposition.

Une démo partielle peut exister pour inspection interne, mais reste non présentable tant que les données critiques et la validation ne sont pas réunies.

## 4. Audit et progression

### Cycle d'audit

~~~text
RECEIVED
-> CITY_SELECTED
-> MATCHING
-> CONFIRMATION_REQUIRED ou AUTO_CONTINUE
-> LOCAL_PREVIEW_WITHOUT_GMB si nécessaire
-> ENRICHMENT
-> SCHEDULED
-> GMB observation || audit SEO de base || ProgressiveIntake, selon les préconditions de chaque branche
-> GMB_REPORT_READY si GMB disponible
-> SEO_REPORT_IN_PROGRESS avec GMB, site, mots-clés et concurrence autorisés
-> CRAWLING / NORMALIZING / RULES_ANALYZED
-> AI_INTERPRETATION si utile
-> QUALITY_REVIEW
-> FINAL_REPORT_READY
~~~

Les checkpoints affichés viennent du Control Plane. La barre de progression ne doit pas être une animation indépendante du travail réel. Le rapport GMB est livré dès son checkpoint ; l'audit SEO général poursuit ensuite son enrichissement sans attendre inutilement la fin de toutes les autres branches.

Après identité et domaine confirmés lorsqu'ils sont nécessaires, l'observation GMB et l'audit SEO de base sont lancés en parallèle selon leurs préconditions respectives. Le `ProgressiveIntake` et les photos peuvent continuer sans bloquer les audits. Le rapport GMB est livré dès son checkpoint. L'audit SEO général démarre ou poursuit alors son enrichissement avec la sortie GMB, le crawl et les mesures de base, les mots-clés et la concurrence autorisés. Après normalisation, les règles peuvent être traitées par famille : indexabilité, contenu, liens, images, données structurées, performance et local.

### Restitution

1. **GMB_REPORT_READY** : afficher l'audit GMB immédiatement.
2. **SEO_REPORT_IN_PROGRESS** : afficher l'avancement réel et les modules terminés, partiels ou bloqués.
3. **FINAL_REPORT_READY** : réunir GMB et SEO, ou GMB et aperçu local borné sans site.

Chaque résultat garde séparés faits observés, calculs, hypothèses, interprétations, recommandations, sources, dates, confiance et limites.

Le rapport suit l'ordre résumé, cinq priorités, preuves, périmètre et limites.
Le premier audit GMB est affiché dès qu'il est prêt, mais cette étape
intermédiaire ne montre ni bouton PDF ni CTA de préparation. Le PDF n'est
proposé qu'une fois le rapport final complet GMB + SEO disponible. À ce moment,
un petit bouton rond avec une flèche de téléchargement reste accessible pendant
la lecture et le scroll, sur mobile comme sur ordinateur, sans recouvrir le
contenu ni le CTA. Ce PDF complet est téléchargeable sans adresse e-mail, compte
ou paiement.
Le rapport web et son PDF restent accessibles sept jours selon le lien privé de
rapport, mais cette durée ne crée aucune obligation de fournir un e-mail.

La concurrence du MVP est bornée à cinq concurrents directs, sélectionnés à
partir de trois intentions de recherche locales principales. La comparaison
porte sur distance, cuisine, prix, présence web, fiche locale, contenu et
opportunités. Chaque élément reste marqué comme mesure, observation sourcée,
interprétation, suggestion ou hypothèse.

## 5. CTA et e-mail

Le CTA Préparer mon site n'est pas affiché au simple moment où l'audit GMB est
prêt. Il apparaît quand le rapport complet est arrivé : GMB + SEO, ou le rapport
local final borné dans la branche sans site ou sans GMB.

Le téléchargement PDF est indépendant du CTA, mais les deux contrôles
deviennent visibles ensemble lorsque le rapport final complet GMB + SEO est
disponible. Le prospect peut alors lire le rapport, faire défiler les sections
et télécharger le PDF sans donner aucune information de contact. Le premier
rapport GMB seul ne donne accès à aucun téléchargement PDF. Seul le clic sur
Préparer mon site ouvre la collecte d'e-mail, car cet e-mail sert uniquement à
livrer la future démo.

Séquence :

~~~mermaid
sequenceDiagram
  participant P as Prospect
  participant U as Site public
  participant C as Control Plane
  P->>U: Consulte le rapport
  U->>P: Préparer mon site
  P->>U: Clique
  U->>P: Préparation honnête
  U->>P: Où envoyer votre démo ?
  P->>U: E-mail
  U->>C: Validation de l'adresse
  alt invalide
    C-->>U: Erreur
    U-->>P: Corriger, aucun run
  else valide
    C->>C: Démarrer WebsiteFactoryPipelineRun
  end
~~~

L'e-mail sert à livrer le lien privé et les messages transactionnels nécessaires. Le consentement marketing est séparé. L'e-mail n'est jamais demandé avant la valeur d'audit et le clic d'intention.

## 6. Pipeline Website Factory

Après e-mail valide :

1. figer le snapshot, les versions, la configuration et le budget ;
2. normaliser les faits vérifiés et les findings ;
3. sélectionner le positionnement à partir des faits ;
4. choisir les opportunités de pages et rejeter les pages locales artificielles ;
5. produire contenu et copywriting à partir des données validées ;
6. sélectionner les assets fournis ou autorisés ;
7. traduire seulement vers la langue choisie ;
8. composer un SiteSpec versionné ;
9. rendre PHP ou statique de façon déterministe ;
10. exécuter les contrôles SEO, contenu, accessibilité, visuel, mobile, sécurité, liens et coûts ;
11. créer l'AcceptanceReport ;
12. arrêter le run en READY_FOR_OWNER_REVIEW.

### Contenu minimal de la démo

La démo est navigable et Mobile First, dans une seule langue, avec :

- accueil et identité ;
- menu ou offre avec informations et prix disponibles ;
- horaires ;
- adresse et localisation ;
- photos fournies ou validées ;
- coordonnées ;
- contact ou réservation vers un canal réellement disponible.

Le contrat vise 6 à 8 pages utiles si les données les justifient : accueil, menu, plats signatures, galerie, à propos, contact/localisation, horaires et réservation ou contact. Commande, livraison, paiement, POS, réservation avancée et visiteur multilingue sont hors contrat initial.

## 7. QA, timeout et correction

### Gates QA

Chaque gate produit PASS, WARN ou BLOCK avec preuves, version de règle, coût et entrées :

1. vérité et provenance ;
2. SEO déterministe ;
3. SEO éditorial et local ;
4. copy, traduction et confiance ;
5. visuel, mobile et parcours ;
6. sécurité, permissions, uploads, noindex et coûts.

Les BLOCK empêchent la présentation. Les WARN sont visibles et soumis à la revue opérateur.

### Hard timeout

T+0 commence quand le dossier est complet et que la génération démarre. À T+1h :

- le run s'arrête et devient immuable ;
- aucune démo incomplète n'est envoyée ;
- le cockpit expose l'étape, les logs, erreurs, durée et coûts ;
- aucune relance automatique ne consomme de budget.

### Après timeout ou blocage

L'opérateur peut consulter, annoter, corriger les données, demander une information, ouvrir Codex, abandonner ou déclencher explicitement une nouvelle génération.

La reprise ne réouvre jamais le run initial. Elle crée une nouvelle DemoGeneration liée au même incident, avec nouvelle deadline, budget, logs, artefacts et AcceptanceReport.

Codex peut modifier et tester localement le contexte autorisé. Publication, envoi, achat, dépense, suppression, mutation métier et clôture de l'incident exigent confirmation explicite du propriétaire.

## 8. Validation et envoi

La démo passe en READY_FOR_OWNER_REVIEW. L'opérateur vérifie aperçu, gates, contenu, provenance, photos, droits, versions, coût, durée, screenshots, accessibilité, performance, liens, traduction et CTA.

Décisions :

| Décision | Suite |
|---|---|
| Valider et préparer l'envoi | READY_FOR_PROSPECT, puis envoi explicite |
| Renvoyer en correction | correction locale, Codex ou nouvelle génération explicite |
| Abandonner | aucun envoi, incident conservé |

Après validation, un lien privé tokenisé, révocable, noindex et expirant est envoyé à l'e-mail fourni. Le prospect n'a ni compte ni carte à saisir pour consulter la démo.

## 9. Démo, expiration et achat

La démo reste accessible sept jours après présentation. Une extension éventuelle est manuelle depuis le cockpit. À l'expiration, l'accès public est fermé et l'archive interne est conservée selon la politique prévue.

Si le prospect veut acheter :

1. compte par lien magique e-mail ou Google OAuth ;
2. paiement ;
3. confirmation de propriété ou rattachement du domaine ;
4. confirmation des droits des contenus et photos ;
5. SiteApproval ;
6. nouvelle SiteVersion de production ;
7. gates de publication ;
8. ProductionSite publié.

La démo n'est pas confondue avec le site de production. Toute modification importante repasse par les contrôles.

## 10. Cas limites

| Cas | Décision et suite |
|---|---|
| Ville non sélectionnée | bloquer et afficher les suggestions |
| Une fiche forte | afficher la preuve, poursuivre, laisser Ce n'est pas mon établissement |
| Plusieurs fiches | demander un choix explicite parmi 2 ou 3 |
| Aucune fiche fiable | demander seulement l'adresse, ouvrir l'aperçu local |
| Fiche sans site | audit GMB, pas de crawl |
| Site sans fiche confirmée | audit SEO + aperçu local, limite GMB affichée |
| Aucun site et aucune fiche | dossier minimal + cinq photos avant génération |
| Contact, menu, prix ou photos manquants | ProgressiveIntake, génération bloquée |
| Données contradictoires | demander correction, ne pas choisir silencieusement |
| Photo trouvée sur Google | provenance seulement, publication bloquée sans autorisation |
| Audit GMB prêt, SEO en cours | afficher GMB maintenant et la progression réelle |
| E-mail invalide | erreur, aucun run démarré |
| Timeout | run immuable, cockpit, aucune relance automatique |
| QA BLOCK | pas de présentation |
| QA WARN | revue opérateur obligatoire |
| Prospect sans clic CTA | rester sur le rapport, aucune génération |
| Prospect sans achat | démo jusqu'à expiration, puis archive |
| Prospect acheteur | compte, paiement, domaine et publication contrôlée |

## 11. Modèle YAML transmissible

~~~yaml
journey:
  source_of_truth: ControlPlane
  commercial_order:
    - intake_minimal
    - establishment_matching
    - enrichment
    - progressive_intake
    - public_audit
    - final_report
    - prepare_site_cta
    - email_collection
    - website_generation
    - qa
    - operator_validation
    - private_demo_delivery
    - optional_purchase
    - production_publication
  public_states:
    - LANDING
    - CITY_REQUIRED
    - CITY_SELECTED
    - MATCHING
    - CONFIRMATION_REQUIRED
    - ESTABLISHMENT_CONFIRMED
    - ASK_ADDRESS
    - LOCAL_PREVIEW_WITHOUT_GMB
    - ENRICHMENT
    - PROGRESSIVE_INTAKE
    - PARTIAL
    - BLOCKED_MISSING_DATA
    - GMB_REPORT_READY
    - SEO_BASE_IN_PROGRESS
    - SEO_REPORT_IN_PROGRESS
    - FINAL_REPORT_READY
    - PREPARING_SITE
    - EMAIL_REQUIRED
    - EMAIL_INVALID
    - SITE_BUILDING
    - READY_FOR_PROSPECT
    - DEMO_EXPIRED
  internal_states:
    - RECEIVED
    - CRAWLING
    - NORMALIZING
    - RULES_ANALYZED
    - AI_INTERPRETATION
    - QUALITY_REVIEW
    - READY_FOR_OWNER_REVIEW
    - NEEDS_CORRECTION
    - SUSPENDED
    - DEMO_TIMEOUT
    - ABANDONED
    - DELIVERED
    - CONVERTED
  invariants:
    email_before_generation: true
    payment_before_demo: false
    operator_validation_before_demo_delivery: true
    city_must_be_selected: true
    invent_critical_facts: false
    automatic_retry_after_timeout: false
~~~

## 12. Machine d'états canonique et écrans E0 à E7

La séquence publique canonique issue de la spec V1 est :

~~~text
NEW
 -> CITY_SELECTED
 -> MATCHING
 -> MATCH_CONFIRMED | ASK_CONFIRMATION | ASK_ADDRESS | MATCH_BLOCKED
 -> ENRICHING
 -> AUDIT_IN_PROGRESS || PROGRESSIVE_INTAKE
 -> GMB_REPORT_READY et SEO_BASE_IN_PROGRESS en parallèle si leurs préconditions sont satisfaites
 -> SEO_REPORT_IN_PROGRESS ou LOCAL_PREVIEW_WITHOUT_GMB
 -> FINAL_REPORT_READY
 -> PREPARING_SITE
 -> EMAIL_REQUIRED
 -> EMAIL_CONFIRMED
 -> SITE_BUILDING si dossier, photos et droits complets
 -> PREPARING_SITE / PARTIAL si des éléments manquent
 -> READY_FOR_OWNER_REVIEW
 -> READY_FOR_PROSPECT
 -> DEMO_PRESENTED
~~~

Les états transverses sont `LOADING`, `EMPTY`, `PARTIAL`,
`RETRYABLE_ERROR`, `BLOCKED`, `FAILED` et `RESUMABLE`. Chaque état bloqué
doit nommer la cause, la prochaine action et la preuve ou le ticket attendu.

| Écran | Affichage principal | Action principale |
|---|---|---|
| E0 Landing | promesse, périmètre honnête, nom + ville | commencer |
| E1 Identification | établissement recherché, ville/pays, provenance, correspondance | sélectionner ou continuer avec l'adresse |
| E2 Enrichissement | données trouvées, classification, sources, champs critiques, upload photos | compléter le dossier |
| E3 Audit progressif | cinq étapes `Identifier`, `Comprendre`, `Auditer`, `Préparer`, `Découvrir` | consulter le module prêt ou corriger |
| E4 Rapport final | résumé, priorités, preuves, périmètre, limites, PDF direct | télécharger le PDF ou préparer mon site |
| E5 Préparation | usage de l'e-mail, étapes préparer / construire / contrôler | lancer après e-mail valide |
| E6 Génération | checkpoints réels, dernière mise à jour, état partiel ou erreur | découvrir la démo ou corriger |
| E7 Démo | site navigable, identité, contact, expiration | mettre le site en ligne |

### Contrats de transition

| Transition | Précondition | Interdit |
|---|---|---|
| `CITY_SELECTED -> MATCHING` | cityId valide | lancer sur texte libre |
| `MATCHING -> ENRICHING` | match fort ou confirmation | choisir un candidat ambigu |
| `ENRICHING -> INTAKE_REQUIRED` | champs manquants calculés | afficher un long questionnaire arbitraire |
| `AUDIT -> GMB_REPORT_READY` | checkpoint GMB validé | attendre SEO pour afficher GMB |
| `AUDIT -> SEO_BASE_IN_PROGRESS` | domaine confirmé et contrôles d'accès passés | attendre le rapport GMB ou les cinq photos pour commencer |
| `GMB_REPORT_READY -> SEO_REPORT_IN_PROGRESS` | rapport GMB livré et base SEO disponible ou explicitement partielle | publier l'audit général sans sortie GMB |
| `FINAL_REPORT_READY -> PREPARING_SITE` | clic du prospect sur le CTA | lancer la génération sans checklist |
| `PREPARING_SITE -> EMAIL_CONFIRMED` | e-mail valide | générer avant e-mail |
| `EMAIL_CONFIRMED -> SITE_BUILDING` | dossier critique, cinq photos et droits complets | lancer avec des éléments manquants ou non autorisés |
| `SITE_BUILDING -> READY_FOR_OWNER_REVIEW` | artefact et gates produits | publier ou envoyer directement |
| `READY_FOR_OWNER_REVIEW -> READY_FOR_PROSPECT` | validation opérateur | présenter avec BLOCK ou provenance critique absente |

### Contrat de données minimal

| Objet | Champs fonctionnels minimum |
|---|---|
| `MinimalRequest` | name, cityId, cityLabel, country, market, locale |
| `EstablishmentMatch` | candidats, confiance, sources, contradictions, décision |
| `RequiredInput` | champ, raison, blocking, sources, état |
| `PhotoAsset` | catégorie, hash, taille, source, consentement, rightsStatus |
| `AuditRun` | profil, périmètre, dates, deadline, statut |
| `SEOFinding` | type, sévérité, preuves, classification, limites |
| `ProgressCheckpoint` | clé, statut, preuves, date, libellé affichable |
| `SEOReport` | modules, périmètre, génération, expiration, PDF |
| `DemoRequest` | prospect, audit, contact e-mail, snapshot d'intake |
| `AcceptanceReport` | gates, preuves, warnings, décision opérateur |

Chaque donnée importante est classée `OBSERVED`, `CALCULATED`,
`AI_INTERPRETED`, `SUGGESTED`, `HYPOTHESIS`, `CONFLICT` ou `UNKNOWN`.
Une interprétation IA ne devient jamais un fait observé par simple affichage.

## 13. Divergences documentaires à ne pas masquer

Ces points ont été trouvés dans les fichiers existants. Ils doivent rester
visibles jusqu'à décision, plutôt que d'être résolus silencieusement par une
IA :

1. **Noms d'états** : l'issue 70 utilise `RECEIVED`, `SCHEDULED`, `CRAWLING`
   et `DELIVERED`, tandis que la spec V1 utilise `NEW`, `EMAIL_REQUIRED`,
   `READY_FOR_OWNER_REVIEW` et `DEMO_PRESENTED`. Une table de correspondance
   technique est encore nécessaire.
2. **Photo d'équipe** : le guide photo prévoit une exception possible par un
   logo dans certains cas, alors que le parcours de référence présente les
   cinq catégories comme obligatoires. La règle produit doit préciser si cette
   exception bloque ou non la génération.
3. **Statut des tickets 77 et 78** : ils contiennent déjà une décision de
   parcours et sont résolus. Leurs preuves d'exécution restent des gates ; la
   décision de 87 reste la référence commerciale.
4. **Portée** : la spec V1 cadre le vertical slice public et exclut le cockpit
   complet et la production, tandis que la doc UX 07 décrit le parcours cible
   jusqu'à la conversion. Il faut distinguer parcours cible, vertical slice et
   périmètre implémentable.
5. **Seuils de confiance et champs exacts** : les règles de branche sont fixées,
   mais les seuils numériques et certaines substitutions de champs restent à
   décider.

## 14. Décisions encore ouvertes

Une IA ne doit pas transformer ces points en règles déjà validées :

- seuils numériques exacts de confiance pour AUTO_CONTINUE ;
- fournisseur final d'autocomplétion ;
- limites de crawl de production ;
- nombre exact de pages par type d'établissement ;
- régénérations gratuites et reprise commerciale ;
- plans, prix, taxes et périodicité définitifs ;
- paiement, domaine et publication finaux ;
- conservation légale par marché ;
- périmètre définitif des audits avancés ;
- contrat technique final du Control Plane et de ses événements.

Toute proposition sur ces points doit être marquée DECISION_REQUIRED.

## Sources consolidées

- [87, parcours client de référence](87-parcours-client-reference.md)
- [80, recherche CRO](80-cro-funnel-audit-gmb-demo-gratuite.md)
- [81, autocomplétion et branche sans GMB](81-autocomplete-ville-et-branche-sans-gmb.md)
- [85, pipeline audit vers site](85-pipeline-audit-vers-site-website-factory.md)
- [issue 03, contrat de démo](../issues/03-contrat-de-demo.md)
- [issue 04, validation humaine](../issues/04-frontiere-validation-humaine.md)
- [issue 05, données insuffisantes](../issues/05-donnees-insuffisantes-ou-contradictoires.md)
- [issue 06, conversion production](../issues/06-frontiere-conversion-demo-production.md)
- [issue 12, contenu minimal](../issues/12-contenu-minimal-de-la-demo.md)
- [issue 13, acceptation démo](../issues/13-critere-acceptation-demo.md)
- [issue 15, reprise timeout](../issues/15-politique-reprise-timeout.md)
- [issue 16, point de reprise](../issues/16-point-de-reprise-apres-timeout.md)
- [issue 17, limites de relance](../issues/17-limites-relance-et-budget-timeout.md)
- [issue 18, intervention Codex](../issues/18-frontiere-intervention-codex.md)
- [issue 19, complétude](../issues/19-seuil-completude-dossier-restaurant.md)
- [issue 20, enrichissement](../issues/20-regles-enrichissement-et-scraping-initial.md)
- [issue 23, QA indépendante](../issues/23-revue-independante-avant-presentation.md)
- [issue 25, audit GMB](../issues/25-audit-google-business-profile-et-valeur.md)
- [issue 44, CTA landing](../issues/44-cta-principal-landing-page.md)
- [issue 47, accès démo](../issues/47-acces-demo-sans-friction.md)
- [issue 48, durée démo](../issues/48-duree-de-vie-demo.md)
- [issue 49, compte et achat](../issues/49-compte-et-authentification-achat.md)
- [issue 56, QA fail-closed](../issues/56-qa-independant-et-fail-closed.md)
- [issue 57, droits médias](../issues/57-droits-photos-avis-google.md)
- [issue 60, moment e-mail](../issues/60-moment-collecte-email-prospect.md)
- [issue 66, entrée audit SEO](../issues/66-entree-audit-seo-et-promesse.md)
- [issue 67, identification](../issues/67-identification-etablissement-et-sources.md)
- [issue 70, pipeline audit](../issues/70-modele-pipeline-audit-seo.md)
- [issue 71, périmètres](../issues/71-perimetres-audit-et-prix.md)
- [issue 77, progression](../issues/77-progression-rapport-et-agents-paralleles.md)
- [issue 78, CTA mobile](../issues/78-progression-reelle-cta-mobile.md)
- [docs UX du site public](../../../docs/ux/03-site-public-architecture-ux.md)
- [états et règles de simplification](../../../docs/ux/04-etats-et-regles-de-simplification.md)
- [parcours cockpit](../../../docs/ux/07-cockpit-parcours-parametres-et-suite.md)
- [glossaire produit](../../../CONTEXT.md)
