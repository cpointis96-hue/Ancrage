# Spécification fonctionnelle

## Vertical slice public Ancrage V1

Statut : spécification de travail, prête pour revue UX, frontend, backend et QA
Périmètre : parcours public Mobile First, de l'identification d'un établissement à l'accès à la démo
Hors périmètre : cockpit opérateur complet, production et paiement
Date : 25 août 2026

> Cette spécification ne constitue pas une autorisation d'implémenter la production. Elle définit le comportement vérifiable du vertical slice et les contrats nécessaires à une prochaine phase de construction.

## 1. Sources, statut et écarts du dépôt

La source normative de l'ordre commercial est [87, Parcours client de référence](../../.scratch/website-factory-architecture/research/87-parcours-client-reference.md). Cette spec ne peut pas inverser ses étapes ou demander un paiement avant une démo validée.

Sources techniques directes : [82, stratégie SEO](../../.scratch/website-factory-architecture/research/82-seo-strategy-website-factory.md), [83, catalogue des agents](../../.scratch/website-factory-architecture/research/83-catalogue-agents-seo-website-factory.md), [84, routage des providers](../../.scratch/website-factory-architecture/research/84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md), [85, pipeline audit vers site](../../.scratch/website-factory-architecture/research/85-pipeline-audit-vers-site-website-factory.md), [86, stack et cockpit](../../.scratch/website-factory-architecture/research/86-stack-seo-skills-et-cockpit.md) et [88, index de stratégie](../../.scratch/website-factory-architecture/research/88-index-strategie-seo-website-factory.md).

Contraintes et décisions détaillées utilisées : [67, identification](../../.scratch/website-factory-architecture/issues/67-identification-etablissement-et-sources.md), [19, complétude](../../.scratch/website-factory-architecture/issues/19-seuil-completude-dossier-restaurant.md), [20, enrichissement](../../.scratch/website-factory-architecture/issues/20-regles-enrichissement-et-scraping-initial.md), [60, e-mail](../../.scratch/website-factory-architecture/issues/60-moment-collecte-email-prospect.md), [70, modèle d'audit](../../.scratch/website-factory-architecture/issues/70-modele-pipeline-audit-seo.md), [71, périmètres](../../.scratch/website-factory-architecture/issues/71-perimetres-audit-et-prix.md), [77, progression](../../.scratch/website-factory-architecture/issues/77-progression-rapport-et-agents-paralleles.md) et [78, CTA mobile](../../.scratch/website-factory-architecture/issues/78-progression-reelle-cta-mobile.md).

Les sources UX et visuelles sont désormais regroupées dans [`docs/ux/README.md`](../ux/README.md), [`docs/ux/03-site-public-architecture-ux.md`](../ux/03-site-public-architecture-ux.md), [`docs/ux/04-etats-et-regles-de-simplification.md`](../ux/04-etats-et-regles-de-simplification.md), [`docs/ux/05-direction-visuelle-et-systeme.md`](../ux/05-direction-visuelle-et-systeme.md) et [`docs/ux/DESIGN.md`](../ux/DESIGN.md). Le prototype visuel de référence est [`client-site.html`](../../prototypes/sstr-direction/client-site.html), avec ses assets locaux. Le prototype [`public-ancrage-v1-prototype.html`](../../.scratch/website-factory-architecture/prototypes/public-ancrage-v1-prototype.html) reste un artefact fonctionnel de comparaison des états et de la hiérarchie des CTA ; il ne remplace pas le template visuel Ancrage.

## 2. Objectif et promesse

### Objectif

Prouver qu'un restaurateur peut obtenir une valeur locale immédiatement compréhensible, puis demander la préparation d'une démo personnalisée de son site sans compte ni paiement. Le slice doit rester utilisable lorsque le Mac opérateur est éteint et doit produire des états observables, traçables et récupérables.

### Promesse autorisée

Ancrage fournit un diagnostic local sourcé et une démo personnalisée avant toute décision d'achat. Il ne promet ni première position, ni trafic, ni revenus, ni indexation garantie.

### Périmètre V1

- restaurant indépendant généraliste comme segment initial ;
- langue de saisie et langue de publication choisie pour le dossier, sans visiteur multilingue ;
- nom et ville structurée en entrée ;
- identification prudente, branche avec ou sans fiche GMB, découverte de site ;
- enrichissement puis intake progressif des données critiques et des cinq photos ;
- audit GMB public quand une fiche est confirmée, audit SEO borné si un domaine fiable est disponible ;
- restitution progressive, rapport final web et export PDF pendant sept jours ;
- CTA `Préparer mon site`, collecte de l'e-mail à ce moment uniquement, puis `WebsiteFactoryPipelineRun` ;
- préparation d'une démo, QA et validation opérateur avant envoi du lien privé.

### Hors périmètre V1

- paiement, compte client, commande, réservation, domaine et publication production ;
- actions propriétaires dans Google Business Profile ou Search Console ;
- crawl illimité, rendu JavaScript complet par défaut, exports bruts publics ;
- promesse de classement ou de performance commerciale ;
- applications natives et cockpit public ;
- chatbot métier, intégrations complexes, étude générale de marché ;
- choix définitif des fournisseurs secondaires, tarifs définitifs et licences non vérifiées ;
- édition autonome de la structure, du template, du SEO avancé ou des langues.

## 3. Acteurs, préconditions, entrées et résultats

| Acteur | Responsabilité | Limite |
|---|---|---|
| Prospect / restaurateur | Saisir, confirmer, corriger, fournir les photos et l'e-mail, demander la démo | Ne valide pas une identité à sa place et ne voit pas les secrets internes |
| Service public | Rendre le parcours, recevoir l'intake, afficher les checkpoints et rapports | Ne dépend pas du Mac ni d'un agent IA pour recevoir |
| Control Plane | Source de vérité des états, permissions, budgets, preuves, provenance et hashes | Seul autorisé à avancer un checkpoint |
| Agent Plane | Contributions structurées spécialisées | Ne publie pas, n'envoie pas d'e-mail et ne mute pas la source de vérité |
| Opérateur | Contrôler la démo, les gates, les warnings et valider avant présentation | Toute intervention, relance ou dépense est explicite et tracée |

Préconditions : service public disponible, politique de données active, profil d'audit configuré, quotas serveur disponibles, stockage temporaire disponible. L'absence d'un provider d'inférence ne bloque pas l'audit déterministe ; elle bloque uniquement l'étape qui en dépend, avec état explicite.

Résultats possibles : rapport partiel GMB, rapport final GMB + SEO, aperçu local sans GMB, intake incomplet, demande de préparation reçue, démo en construction, démo prête à revue opérateur, démo présentée ou incident récupérable.

## 4. Arborescence et surfaces

Les routes sont indicatives et doivent rester stables après validation UX.

| Route | Surface | Fonction |
|---|---|---|
| `/` | public, mobile et desktop | Entrée nom + ville |
| `/audit/:prospectId` | public privé, mobile et desktop | Progression, identité, intake et audit |
| `/audit/:prospectId/report` | public privé, mobile et desktop | Rapport progressif, final et PDF |
| `/audit/:prospectId/prepare` | public privé | Confirmation e-mail et état de préparation |
| `/demo/:demoToken` | public privé, sans compte | Démo après validation opérateur |
| `/expired/:resourceToken` | public | Expiration, accès révoqué et contact |

La session navigateur ne constitue pas la source de vérité. Une reprise recharge l'état depuis le Control Plane via un identifiant opaque ou un lien signé, sans exposer de secret durable.

## 5. Parcours nominal

1. La landing explique en une phrase : « Voyez ce que votre présence locale peut améliorer, puis découvrez une démo de votre site. » Elle demande uniquement le nom de l'établissement et la ville.
2. La saisie de ville propose des valeurs structurées avec pays et identifiant géographique. Une valeur libre seule est refusée.
3. Après `Nom + ville sélectionnée`, le service crée un `Prospect` et un `EstablishmentMatch`, puis affiche une progression réelle fondée sur des `ProgressCheckpoint`.
4. L'enrichissement recherche les sources autorisées, les candidats, le site éventuel, les coordonnées, horaires, menu, prix, photos et conflits. Il ne transforme pas une source publique en fait validé sans provenance.
5. Une correspondance unique forte affiche la fiche et une ou deux images, puis continue automatiquement après un court temps de lecture. Un lien secondaire `Ce n'est pas le bon établissement` ouvre la branche de correction, sans créer un second bouton concurrent. Plusieurs correspondances affichent deux ou trois candidats sélectionnables, puis un seul bouton contextuel `Continuer avec cet établissement` apparaît après sélection.
6. Après identification suffisante, le formulaire progressif demande seulement les `RequiredInput` manquants ou contradictoires. Il collecte ensuite les cinq photos obligatoires : façade, deux plats signatures, intérieur ou terrasse, équipe, propriétaires ou service.
7. Si la fiche existe, l'audit GMB est lancé avec les seules informations publiques autorisées. Si un domaine fiable existe, l'audit SEO borné peut être lancé. Les branches indépendantes peuvent tourner en parallèle après validation d'identité et de domaine.
8. Dès `GMB_REPORT_READY`, l'interface montre les premières conclusions et indique honnêtement que l'audit SEO continue. Elle ne remplace pas le rapport GMB par un spinner.
9. Dès `FINAL_REPORT_READY`, le rapport rassemble GMB et SEO, sépare faits, calculs, interprétations, suggestions et limites, et expose son périmètre. Le PDF est disponible pour sept jours.
10. Le CTA `Préparer mon site` ne démarre rien avant le clic. Au clic, l'interface peut montrer une préparation, puis demande un e-mail valide. Le consentement marketing est séparé et facultatif.
11. Après e-mail valide, le système fige un snapshot de l'intake et des `AgentConfigurationVersion`, puis démarre le `WebsiteFactoryPipelineRun`. Il compose un `SiteSpec`, rend un artefact déterministe, exécute les gates et produit un `AcceptanceReport`.
12. La démo reste invisible au prospect jusqu'à `READY_FOR_OWNER_REVIEW`, puis validation explicite de l'opérateur. Après validation, l'e-mail transactionnel envoie un lien privé `noindex`, expirant et révocable, accessible sept jours après présentation.
13. La démo contient ses CTA de contact. Un éventuel CTA de mise en production est unique, clairement secondaire par rapport à la découverte de la démo, et le paiement et la production restent hors de ce slice.

## 6. Branches et intake progressif

### Établissement non trouvé ou non confirmé

Après `Ce n'est pas mon établissement`, ouvrir directement l'aperçu local et demander uniquement l'adresse. Ne pas redemander la ville sélectionnée et ne pas exiger un lien Google. L'aperçu peut présenter le site officiel éventuel, les intentions et mots-clés locaux, les concurrents directs et les opportunités locales. Il doit afficher : « La fiche GMB n'a pas été confirmée », jamais « l'établissement n'a pas de fiche ».

### Absence de site

Sans domaine fiable, aucun crawl ne démarre. Le rapport indique `SITE_NOT_CONFIRMED` et garde la valeur GMB ou locale disponible. La préparation de site reste possible si l'identité, localisation, contact, offre avec prix et photos autorisées sont suffisants.

### Absence de GMB et de site

Le parcours reste dans `LOCAL_PREVIEW_WITHOUT_GMB`. Le `ProgressiveIntake` demande les champs critiques manquants. Les cinq photos sont obligatoires avant toute génération réelle. Les données déjà collectées ne sont pas demandées une seconde fois.

### Contradictions

Une contradiction sur identité, adresse, téléphone, horaires, prix, menu ou droits photo est visible, datée et bloquante pour la génération si elle affecte la vérité commerciale. Le prospect peut corriger ou l'opérateur peut intervenir. Aucune IA ne tranche silencieusement.

### E-mail

Avant `Préparer mon site`, aucun e-mail n'est requis pour accéder à la valeur d'audit. Au CTA, le champ est obligatoire pour démarrer la génération et livrer la démo. Le système valide syntaxe, normalisation et anti-abus serveur, sans afficher ni conserver de mot de passe. Le consentement marketing est une donnée distincte.

## 7. Modèle d'état et machine à états

### États du dossier public

```text
NEW
  -> CITY_SELECTED
  -> MATCHING
  -> MATCH_CONFIRMED | ASK_CONFIRMATION | ASK_ADDRESS | MATCH_BLOCKED
  -> ENRICHING
  -> INTAKE_REQUIRED | INTAKE_PARTIAL | INTAKE_COMPLETE
  -> AUDIT_IN_PROGRESS
  -> GMB_REPORT_READY (branche disponible)
  -> SEO_REPORT_IN_PROGRESS | LOCAL_PREVIEW_WITHOUT_GMB
  -> FINAL_REPORT_READY
  -> PREPARING_SITE
  -> EMAIL_REQUIRED
  -> EMAIL_CONFIRMED
  -> SITE_BUILDING
  -> READY_FOR_OWNER_REVIEW
  -> READY_FOR_PROSPECT
  -> DEMO_PRESENTED
```

Depuis chaque état asynchrone, les états transverses sont `LOADING`, `EMPTY`, `PARTIAL`, `RETRYABLE_ERROR`, `BLOCKED`, `FAILED` et `RESUMABLE`. Un état d'interface ne remplace jamais l'état métier. `BLOCKED` exige une raison, une prochaine action et une preuve ou un ticket d'intervention.

### Transitions critiques

| Transition | Précondition | Effet interdit |
|---|---|---|
| `CITY_SELECTED -> MATCHING` | ville structurée valide | lancer sur texte libre |
| `MATCHING -> ENRICHING` | match fort ou confirmation | sélectionner un candidat ambigu |
| `ENRICHING -> INTAKE_REQUIRED` | required inputs calculés | demander un formulaire complet arbitraire |
| `AUDIT -> GMB_REPORT_READY` | checkpoint GMB validé | attendre l'audit SEO pour afficher GMB |
| `FINAL_REPORT_READY -> PREPARING_SITE` | clic prospect | lancer sans CTA |
| `PREPARING_SITE -> EMAIL_CONFIRMED` | e-mail valide | commencer la génération avant e-mail |
| `SITE_BUILDING -> READY_FOR_OWNER_REVIEW` | artefact et gates produits | publier ou envoyer directement |
| `READY_FOR_OWNER_REVIEW -> READY_FOR_PROSPECT` | validation opérateur explicite | présenter avec un BLOCK ou sans provenance |

### États d'erreur et reprise

- `LOADING` : message, dernière heure de mise à jour, aucun pourcentage inventé.
- `EMPTY` : expliquer qu'aucune donnée n'a été trouvée et proposer la branche suivante.
- `PARTIAL` : afficher les modules disponibles, les modules manquants et leurs limites.
- `RETRYABLE_ERROR` : bouton de reprise idempotente, tentative et coût éventuel visibles.
- `BLOCKED` : aucune relance automatique ; action humaine ou donnée attendue explicitée.
- `FAILED` : incident immuable, contexte conservé, reprise via nouveau run lié à l'incident.
- `RESUMABLE` : reprendre au dernier checkpoint fiable, sans effacer la tentative initiale.

## 8. Contrats de données et provenance

Les noms suivent [`CONTEXT.md`](../../CONTEXT.md). Les payloads ci-dessous sont fonctionnels, pas un schéma SQL.

| Entité | Champs minimum | Règles |
|---|---|---|
| `Prospect` | id opaque, createdAt, market, locale, status | jamais `Customer` avant achat |
| `MinimalRequest` | name, cityId, cityLabel, country | cityId obligatoire |
| `EstablishmentMatch` | candidates, confidence, provenanceRefs, conflicts, decision | `AUTO_CONTINUE`, `ASK_CONFIRMATION`, `ASK_MORE_DATA` |
| `RequiredInput` | field, reason, blocking, sourceRefs, status | seulement manquants ou contradictoires |
| `PhotoAsset` | objectRef, category, hash, rightsStatus, source, consent, size | cinq catégories requises, droits non inconnus |
| `AuditRun` | profileVersion, scope, startedAt, deadlineAt, status | un run immuable et versionné |
| `SEOFinding` | type, severity, evidenceRefs, classification, limits | faits et recommandations séparés |
| `ProgressCheckpoint` | key, status, evidenceRefs, completedAt, displayText | seul Control Plane autorise `completed` |
| `SEOReport` | modules, scope, generatedAt, expiresAt, pdfRef | accès signé et expirant |
| `DemoRequest` | prospectRef, auditRef, emailContactRef, inputSnapshotRef | créée après CTA et e-mail |
| `WebsiteFactoryPipelineRun` | configVersions, budgetRefs, checkpoints, status | aucune inférence non autorisée |
| `AcceptanceReport` | gates, PASS/WARN/BLOCK, evidenceRefs, operatorDecision | BLOCK empêche présentation |

Chaque donnée importante porte `classification` parmi `OBSERVED`, `CALCULATED`, `AI_INTERPRETED`, `SUGGESTED`, `HYPOTHESIS`, `CONFLICT` ou `UNKNOWN`, ainsi que source, date d'observation, confiance, droits et langue quand pertinent. `AI_INTERPRETED` n'est jamais promu en `OBSERVED` par le frontend.

### Agents et providers

Le vertical slice consomme les contrats de 83 et la politique de 84. Les branches déterministes sont prioritaires. `CityResolver`, `EstablishmentMatcher`, `GMBObserver`, `AddressResolver`, `SiteDiscoverer`, `CrawlOrchestrator`, `TechnicalSEOAnalyzer`, `ContentSEOAnalyzer`, `KeywordIntentAnalyzer`, `LocalCompetitorSelector`, `ProvenanceNormalizer` et `AuditReportComposer` sont les responsabilités pertinentes du slice.

Une exécution IA conserve provider, modèle, politique, version de configuration, schéma, données autorisées, coût, durée, fallback et validation. Les routes locales `Ollama` et `MLX` sont préférées lorsque la tâche le permet. `OpenAI`, `OpenRouter` et `OmniRoute` ne sont utilisables que s'ils sont configurés, approuvés, testés et plafonnés. Aucun provider ou modèle concret supplémentaire n'est inventé dans cette spec. Aucun fallback premium silencieux n'est admis.

## 9. Exigences écran par écran

### E0, landing

Affiche la promesse, le périmètre de l'audit, une limite honnête et le formulaire minimal. Actions : saisir le nom, rechercher une ville, sélectionner une suggestion, démarrer. Validation : nom non vide, ville structurée sélectionnée. Erreurs : ville non sélectionnée, service indisponible, rate limit.

### E1, recherche et identité

Affiche l'établissement recherché, la ville/pays, la progression et une provenance résumée. Cet écran ne présente jamais deux boutons d'identité côte à côte.

- Correspondance unique : la fiche est une confirmation de lecture, pas un choix à valider. Le parcours continue automatiquement après affichage. `Ce n'est pas le bon établissement` est un lien secondaire placé sous le résumé, visuellement calme et éloigné de l'action de continuation.
- Correspondances multiples : chaque fiche est une ligne ou une carte sélectionnable dans son ensemble, avec état radio explicite. Avant sélection, aucun bouton de confirmation n'est affiché. Après sélection, un seul bouton primaire apparaît en bas du bloc : `Continuer avec cet établissement`. La correction reste un lien secondaire `Je ne le vois pas` sous la liste, jamais un second bouton adjacent.
- Aucune correspondance fiable : aucun faux choix n'est affiché. Le seul bouton primaire est `Continuer avec mon adresse`, après le champ d'adresse. Le texte explique que la fiche n'a pas été confirmée, sans conclure à son inexistence.

La sélection d'une fiche produit un changement d'état visible, non une navigation ambiguë. Le bouton primaire est désactivé tant qu'aucun choix n'est sélectionné.

### E2, enrichissement et intake

Affiche les données trouvées avec badge de classification et source accessible, puis les champs critiques manquants. Chaque champ indique pourquoi il est demandé, s'il bloque, et s'il est déjà rempli. Upload : cinq catégories, aperçu, progression, taille/type, droits et suppression avant envoi. Un champ facultatif ne doit pas bloquer.

### E3, audit progressif

Affiche une barre de progression en cinq étapes, toujours dans le même ordre : `Identifier`, `Comprendre`, `Auditer`, `Préparer`, `Découvrir`. Chaque étape possède un état `terminée`, `en cours`, `à venir` ou `bloquée`, avec une phrase courte et la dernière mise à jour. La barre indique l'avancement réel des checkpoints, jamais un pourcentage estimé.

`GMB_REPORT_READY` montre le rapport GMB immédiatement et la continuation SEO. Un module sans source affiche une limite, pas une carte vide trompeuse. Chaque finding garde une preuve et une qualification. La progression reste compacte sur mobile : libellé de l'étape courante, nombre d'étapes terminées et détail développable. Sur desktop, les cinq étapes peuvent être visibles en ligne, sans transformer la barre en tableau de bord.

### E4, rapport final

Ordre : résumé actionnable, établissement et périmètre, GMB, SEO technique, contenu et intentions, concurrence bornée, opportunités, limites et sources. Une seule action primaire est visible : `Préparer mon site` lorsque le dossier est complet. `Télécharger le rapport PDF` est un lien secondaire placé près du titre du rapport. Si le rapport est partiel, l'action primaire devient `Compléter mon dossier` ; la reprise technique reste une action secondaire attachée au module en erreur. Aucun écran ne présente ces actions sous forme de deux boutons concurrents.

### E5, préparation et e-mail

Après clic sur `Préparer mon site`, ouvrir une étape dédiée qui explique calmement : « Nous utiliserons cette adresse uniquement pour vous envoyer le lien de votre démo après vérification. » Montrer les étapes `préparer les informations`, `construire`, `contrôler`, sans prétendre que le site existe déjà. Le formulaire ne contient qu'un champ e-mail, une mention de confidentialité et, séparément, une case marketing facultative. Une seule action primaire `Lancer la préparation` est disponible après validation. Annuler ou revenir au rapport est un lien secondaire, pas un bouton concurrent. Erreurs inline, pas de perte de rapport. Succès : état `EMAIL_CONFIRMED` puis progression du build.

### E6, attente de génération

Afficher la même barre de progression, focalisée sur `Préparer` puis `Découvrir`, les checkpoints confirmés, l'heure de dernière mise à jour et le délai cible configuré. Le contenu explique ce qui vient d'être fait et ce qui reste à vérifier. États retry, partial et blocked visibles. Ne jamais afficher une animation comme preuve d'avancement. En cas de succès, le seul CTA primaire est `Découvrir ma démo` après envoi du lien ; en cas de blocage, le seul CTA primaire correspond à la prochaine action réelle, par exemple `Corriger les informations` ou `Réessayer`, jamais les deux simultanément.

### E7, démo

Accessible via lien privé, sans compte ni paiement, après validation opérateur. Le premier écran de la démo sert la découverte : identité du restaurant, aperçu du site et CTA de contact utiles. Un seul CTA de conversion `Mettre mon site en ligne` peut apparaître après la découverte, dans une zone dédiée et non en concurrence avec `Appeler`, `Écrire` ou `Itinéraire`. Les actions de contact sont regroupées selon les données réellement disponibles, sans répéter le même numéro ou la même destination. Afficher l'expiration sans alarme agressive. `noindex`, révocation serveur, quota et limitation de débit. Aucun mécanisme anti-copie qui casse clavier, sélection ou accessibilité.

## 10. Règles UI/UX et responsive

- Mobile First : une seule colonne par défaut, largeur lisible, CTA principal persistant mais non obstructif, uploads utilisables au doigt, aucune table qui déborde.
- Compréhension en une seconde : à chaque écran, un titre répond à « où suis-je ? », une phrase répond à « pourquoi ? », une action principale répond à « que faire ? ».
- Hiérarchie des actions : une seule action primaire par écran et par état. Une action secondaire est un lien textuel, une option de liste ou une action dans le contexte du module. Deux boutons d'importance équivalente côte à côte sont interdits sur mobile et évités sur desktop.
- Choix exclusifs : lorsqu'il faut choisir un établissement, sélectionner une ligne ou une carte, puis confirmer avec une seule action. Ne jamais juxtaposer `C'est mon établissement` et `Ce n'est pas mon établissement` comme deux choix visuels de même poids.
- CTA et psychologie : le CTA décrit le prochain bénéfice concret, pas une opération interne. `Préparer mon site` signifie une intention ; `Lancer la préparation` confirme l'e-mail et déclenche réellement le travail ; `Découvrir ma démo` ouvre une valeur disponible. Ne pas employer `Continuer` seul lorsque l'étape peut être nommée.
- Progression : la barre de progression est une boussole persistante, pas une décoration. Elle montre cinq étapes métier, l'étape courante et la prochaine action. Elle ne promet ni durée précise ni pourcentage artificiel. Un texte d'état ne doit pas répéter le libellé de la barre : la barre donne où, le texte donne pourquoi et quoi faire.
- Barres d'action : sur mobile, le CTA primaire peut être placé dans une barre basse compacte avec respect de la safe area, uniquement quand une action est attendue. La barre ne contient jamais deux boutons concurrents et ne doit jamais masquer le dernier champ ou le dernier contenu.
- Desktop : rapport en colonne de lecture avec navigation latérale ou sommaire seulement si elle ne masque pas les preuves ; les panneaux ne doivent pas devenir un dashboard générique.
- Accessibilité : HTML sémantique, labels explicites, focus visible, clavier complet, contraste WCAG AA à vérifier, erreurs annoncées, `aria-live` réservé aux changements utiles, alternatives textuelles et aucune information portée uniquement par la couleur.
- Performance : HTML léger, chargement progressif, images redimensionnées côté serveur, pas de dépendance IA pour le premier rendu de l'état.
- Branding : la direction Ancrage est documentée dans [`docs/ux/DESIGN.md`](../ux/DESIGN.md) et matérialisée par [`prototypes/sstr-direction/client-site.html`](../../prototypes/sstr-direction/client-site.html), avec image et police JetBrains Mono locales. Le prototype fonctionnel `public-ancrage-v1-prototype.html` utilise une autre structure de test et ne doit pas être pris comme remplacement visuel. Les anciens prototypes `system-ui`, Georgia et `FACTORY` restent des références historiques de structure et d'états seulement.
- La cohérence avec le cockpit reste limitée à la séparation décisionnelle, aux statuts `PASS/WARN/BLOCK`, à la provenance et au Control Plane. Le cockpit n'est pas spécifié ici.

## 11. Audit, progression, PDF et anti-abus

Profil gratuit standard provisoire : un audit par établissement identifié, maximum 50 URL, 3 minutes, 25 Mo, crawl HTML et mesures ciblées, sans rendu JavaScript complet par défaut. Ces limites doivent être validées par le vertical slice et les fournisseurs avant activation commerciale.

Le rapport affiche le périmètre réel, ses dates, ses preuves, ses limites et son expiration. Le PDF est généré à partir du rapport versionné, ne contient pas de secret et expire avec le rapport public. Les exports bruts restent dans l'archive locale chiffrée selon la politique existante.

Anti-abus : quota serveur par établissement, domaine et signaux réseau, réutilisation d'un audit existant, rate limiting adaptatif, anti-bot proportionné, journalisation et révocation. Ne pas exiger e-mail ou géolocalisation avant la valeur d'audit. Les protections ne doivent pas prétendre empêcher captures, outils navigateur ou recopie.

## 12. Stockage, sécurité et confidentialité

`Cloudflare` fournit l'API et l'asynchrone, `Neon` les métadonnées et états, `R2` les fichiers temporaires et artefacts nécessaires. La `CloudIntakeInbox` permet la réception Mac éteint. Le cockpit synchronise par curseur, vérifie schéma, taille et hash, écrit dans l'archive locale chiffrée, accuse réception, puis demande la suppression R2. Aucune suppression avant accusé de réception vérifié.

V1 : données minimales, URLs signées et expirantes, objets isolés, types et tailles bornés, scan, suppression des métadonnées non nécessaires, protection SSRF et DNS rebinding pour tout crawl, aucun secret dans le navigateur ou un prompt, séparation des données personnelles et marketing, journaux d'accès et de transition.

V1 : les données publiques et commerciales nécessaires peuvent être routées vers un provider cloud approuvé selon politique. Secrets, credentials, paiement et informations internes sensibles sont bloqués. Le stockage cloud ne déclenche jamais automatiquement une inférence cloud.

Post-V1 ou à confirmer avant production : registre légal complet par marché, durées légales définitives, RPO/RTO testés, fournisseur d'autocomplétion final, licence crawler, politique de restauration et analytics avancées. Les sept jours de rapport et de démo sont la règle commerciale courante, pas une conclusion juridique générale.

## 13. Analytics et observabilité fonctionnelle

Émettre des événements sans contenu sensible en clair :

| Événement | Données minimales |
|---|---|
| `landing_viewed` | session opaque, locale, device class |
| `city_suggestion_shown` / `city_selected` | cityId, position, durée |
| `match_presented` / `match_confirmed` / `match_rejected` | matchId, decision, confidence band |
| `intake_started` / `required_input_completed` | field category, blocking, duration |
| `photo_upload_started` / `photo_uploaded` / `photo_rejected` | category, size, reason, hash ref |
| `audit_checkpoint_completed` | checkpoint, scope, duration, partial flag |
| `report_viewed` / `pdf_requested` | report version, module, result |
| `prepare_clicked` / `email_submitted` | prospect ref, validation result, no email in analytics |
| `pipeline_started` / `pipeline_checkpoint_completed` | run ref, checkpoint, config version |
| `operator_validation_recorded` | decision, gate summary |
| `demo_email_sent` / `demo_opened` / `demo_expired` | demo ref, delivery status, timestamps |
| `blocked` / `retry_requested` / `resumed` | state, reason code, run ref |

Chaque événement doit être idempotent, horodaté, corrélé à un run opaque, et ne pas servir de source de vérité à la place du Control Plane. Mesurer séparément conversion audit, complétude, clic CTA, e-mail valide, démo validée, livraison, ouverture et expiration.

## 14. Critères d'acceptation

### Fonctionnels

- [ ] Un texte de ville non sélectionné ne peut pas lancer le parcours.
- [ ] Une correspondance multiple ne peut pas être choisie silencieusement.
- [ ] `Ce n'est pas mon établissement` demande seulement l'adresse.
- [ ] Aucun crawl ne démarre sans domaine fiable et autorisé.
- [ ] Le formulaire après enrichissement ne demande que les champs critiques manquants ou contradictoires.
- [ ] La génération réelle ne démarre pas avant clic `Préparer mon site` et e-mail valide.
- [ ] L'e-mail marketing est séparé de la livraison transactionnelle.
- [ ] GMB est visible dès son checkpoint, sans attendre SEO.
- [ ] Le rapport final sépare GMB, SEO, preuves, classifications et limites.
- [ ] Un PDF versionné est disponible sept jours, avec accès expirant.
- [ ] Un BLOCK empêche la présentation de la démo.
- [ ] La démo est envoyée uniquement après validation opérateur.
- [ ] Aucun paiement ou création de compte n'est requis pour voir la démo.
- [ ] Une reprise conserve la tentative initiale et reprend depuis un checkpoint fiable.

### Technique et sécurité

- [ ] Le parcours réceptionne un dossier lorsque le Mac est éteint.
- [ ] Sync R2 vers archive locale vérifie hash, taille, schéma et idempotence avant suppression.
- [ ] Les URLs publiques sont signées, expirantes, révocables et `noindex`.
- [ ] Les uploads sont bornés, isolés, scannés et non exécutables.
- [ ] Le crawl bloque SSRF, redirections dangereuses, DNS rebinding et dépassement de budget.
- [ ] Chaque run enregistre provider, modèle, version, coût, durée, fallback et politique si IA utilisée.
- [ ] Un provider désactivé ou non vérifié bloque proprement l'étape concernée.

### UX et accessibilité

- [ ] Le prochain geste est identifiable en une seconde à 390 px.
- [ ] Aucun débordement horizontal à 320, 390, 768, 1024 et 1440 px.
- [ ] Le parcours est utilisable au clavier et avec VoiceOver ou lecteur équivalent.
- [ ] Les états loading, empty, partial, retry, error et blocked ont tous un message et une action.
- [ ] Chaque écran présente au maximum une action primaire ; les actions secondaires ne sont pas des boutons concurrents.
- [ ] Une sélection multiple utilise une ligne ou carte sélectionnable puis un seul bouton de confirmation, jamais deux boutons d'identité côte à côte.
- [ ] La barre de progression affiche les cinq étapes métier, l'étape courante et la prochaine action sans pourcentage artificiel ni texte répété.
- [ ] Le CTA visible exprime le bénéfice ou l'action réelle : `Préparer mon site`, `Lancer la préparation`, `Découvrir ma démo`.
- [ ] Les contrastes, focus, labels et annonces d'erreur sont vérifiés.
- [ ] La direction Ancrage/JetBrains Mono est validée par un prototype dédié avant implémentation.

## 15. Matrice de tests QA

| Domaine | Cas minimum | Preuve attendue |
|---|---|---|
| Entrée | nom valide, ville libre, ville ambiguë, service indisponible | état et message, aucun run incorrect |
| Match | unique, multiple, aucun, rejet, conflit | transitions et sources |
| Branche locale | adresse, sans GMB, sans site, sans GMB/site | rapport borné, aucune affirmation absolue |
| Intake | champ absent, contradiction, cinq photos, photo refusée, reprise upload | required inputs, hashes, droits |
| Audit | GMB rapide, crawl 50 URL, timeout 3 min, 25 Mo, branche partielle | checkpoints, limites, coût |
| Rapport | GMB précoce, SEO final, PDF, expiration, URL révoquée | rendu et accès |
| CTA | clic sans e-mail, e-mail invalide, e-mail valide, consentement marketing absent | aucun pipeline prématuré |
| Build | provider local, provider cloud désactivé, budget atteint, fallback autorisé | route et blocage tracés |
| QA démo | PASS, WARN, BLOCK, validation, rejet, nouvelle version | `AcceptanceReport`, visibilité correcte |
| Résilience | refresh, fermeture navigateur, Mac éteint, réseau interrompu, retry | reprise idempotente |
| Sécurité | SSRF, upload non autorisé, token expiré, rate limit, injection dans source | refus, logs sans secret |
| Responsive | 320/390/768/1024/1440, clavier, lecteur d'écran | captures, rapport d'accessibilité |

## 16. Checklist de revue avant handoff

- UX confirme l'ordre 87, les branches et les états mobiles.
- Frontend confirme les routes, le rendu des états et l'absence de logique métier locale.
- Backend confirme les transitions Control Plane, l'idempotence et les contrats de provenance.
- QA confirme les gates, limites, reprises, expiration et scénarios négatifs.
- Sécurité confirme SSRF, uploads, tokens, rétention et séparation des secrets.
- Opérateur confirme la revue `AcceptanceReport`, la validation manuelle et l'absence d'envoi prématuré.
- Product confirme que le slice montre une preuve avant paiement, sans figer prix ou promesse non vérifiés.
- Design confirme le prototype public Ancrage, la police JetBrains Mono, les composants et les décisions de responsive.

## 17. Décisions, hypothèses et questions ouvertes

### Décisions reprises

- ordre commercial de 87 ;
- nom + ville seulement au départ ;
- ville structurée obligatoire ;
- confirmation multiple et branche locale sans GMB ;
- audits séparés dans les données et réunis dans le rapport ;
- cinq photos obligatoires avant génération ;
- e-mail au clic `Préparer mon site` ;
- démo sans compte ni paiement, sept jours, tokenisée et `noindex` ;
- validation opérateur avant présentation ;
- déterministe d’abord ; pour chaque étape IA, modèle choisi explicitement et budget approuvé ;
- Cloudflare/R2/Neon et archive locale selon 85/86, sans inference obligatoire sur l'intake.

### Hypothèses explicites pour ce slice

- le profil gratuit standard provisoire est 50 URL, 3 minutes et 25 Mo ;
- le frontend public consulte un API Control Plane et ne porte pas la machine d'état ;
- le rapport et la démo utilisent des liens privés distincts, même si une implémentation peut partager un service de token ;
- les seuils de confiance sont exposés comme bandes et raisons, pas comme un chiffre marketing ;
- la direction visuelle Ancrage et JetBrains Mono sont maintenant présentes dans `docs/ux/` et `prototypes/sstr-direction/` ; leur intégration en production reste hors de cette spec.

### Questions réellement ouvertes

- seuils mesurés de confiance pour `AUTO_CONTINUE` et `ASK_CONFIRMATION` ;
- comportement exact au dépassement de budget ou timeout d'une branche ;
- fournisseurs, quotas, prix, licence crawler et autocomplétion après vérification ;
- protocole SSRF, rétention légale, RPO/RTO et restauration testée ;
- prototype public Ancrage et prototype du rapport avant gel des composants ;
- décision documentée issue du ticket 45 sur le niveau précis de protection anti-aspiration ;
- test réel du vertical slice sur quelques restaurants autorisés.

Ces questions ne rouvrent pas les décisions verrouillées. Elles définissent les preuves à obtenir avant une implémentation de production.

## 18. Handoff vers la prochaine spec

1. `Spec UX public Ancrage` : prototypes des écrans E0 à E7, direction JetBrains Mono, états mobiles, rapport et accessibilité.
2. `Spec API Control Plane public` : contrats JSON, transitions, idempotence, tokens, événements et erreurs.
3. `Spec audit borné` : profils, SSRF, crawler, preuves, budgets, PDF et lifecycle.
4. `Spec intake média` : uploads, droits, scan, R2, synchronisation et suppression accusée.
5. `Spec Website Factory pipeline` : `SiteSpec`, renderer, gates, `AcceptanceReport`, revue opérateur et livraison.

L'implémentation ne doit commencer qu'après résolution ou acceptation testable des questions ouvertes ci-dessus et validation du prototype public. Cette spec est complète pour cadrer le vertical slice fonctionnel, mais elle ne prétend pas clôturer les vérifications fournisseurs, sécurité ou design que la carte Wayfinder garde ouvertes.
