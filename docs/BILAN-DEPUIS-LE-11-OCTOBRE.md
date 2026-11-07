# Ancrage — bilan depuis le 11 octobre 2026

État établi le 7 novembre 2026. Ce document explique les évolutions entre la dernière version publiée le 11 octobre et le programme actuellement présent dans le dossier de travail.

## Point de départ et méthode

Le point de départ est le commit GitHub `772c38d7319b382ca28ee4b271def462970d2075`, « docs: neutraliser la présentation du lecteur », du 11 octobre 2026. Cette version présentait le cockpit, la saisie client, les workflows et une simulation de production de site. La visite guidée, les arbres de décision et les exemples Maison Sauge illustraient le projet avec des données fictives ; ils ne prouvaient pas une prestation réelle.

Le bilan repose sur la comparaison de cet état Git avec les fichiers actuels, les contrats et les tests. Certaines évolutions locales n'ont pas été enregistrées dans des commits datés : leur date exacte de réalisation n'est donc pas reconstituée. Des fonctions issues de branches de travail peuvent également avoir été écrites avant le 11 octobre tout en étant absentes de la version publiée ce jour-là. Ce document décrit les différences constatées, sans attribuer une chronologie non vérifiée à chaque modification.

La publication de ce bilan sur GitHub ne synchronise pas, à elle seule, tout le code local décrit ici.

## 1. Identification de l'établissement et entrée dans l'audit

Le formulaire public a été raccordé à la recherche de lieux :

- suggestions pour le nom de l'établissement et pour la ville ;
- récupération des détails de l'établissement sélectionné, avec remplissage de la ville lorsque disponible ;
- navigation au clavier dans les suggestions, annulation des recherches précédentes et traitement des réponses tardives ;
- message explicite lorsque la recherche est indisponible ;
- passage de l'établissement sélectionné au parcours d'audit, à la place de la seule ouverture du formulaire de dossier montrée dans la version du 11 octobre.

Ces fonctions dépendent de Google Places lorsqu'elles l'utilisent. L'absence de clé OpenAI n'annule pas les éventuelles conditions d'accès et de facturation de ce service distinct. La sélection d'une fiche ne prouve ni sa propriété ni sa corroboration par un autre fournisseur.

Fichiers concernés : `app/intake.mjs`, `app/intake.html`, `app/intake.css`, `app/api.mjs`, `app/demo.mjs`, `src/geography/google-places-autocomplete.mjs`.

## 2. Un audit par observations publiques, sans obligation DataForSEO

Un parcours d'audit fondé sur les pages publiques a été ajouté. Il collecte le site confirmé, établit des observations techniques, puis peut utiliser un analyste IA et une recherche web lorsque le fournisseur correspondant est configuré.

Ce parcours permet de préparer un diagnostic sans rendre DataForSEO obligatoire. Cela ne signifie pas qu'il produit gratuitement ou sans IA toutes les analyses disponibles : l'analyste actuel utilise un adaptateur de fournisseur, et la recherche web dépend de celui-ci. Sans analyste disponible, les observations collectées sont conservées et le résultat doit rester explicitement partiel.

Les contrôles ajoutés portent notamment sur :

- les sources associées aux conclusions, priorités et concurrents ;
- le refus des citations inventées et des URLs absentes des sources admises ;
- l'exclusion du site audité de la liste de ses propres concurrents ;
- la distinction entre un site absent, une collecte bloquée et un échantillon limité ;
- la possibilité de recommander de conserver un site lorsque les éléments observés le justifient ;
- l'absence de défaut technique supposé lorsqu'aucun site n'a été fourni ;
- la livraison progressive du rapport local puis du rapport final, avant la préparation du site.

Fichiers principaux : `src/audit/observation-audit.mjs`, `src/audit/observation-analyst.mjs`, `src/audit/html-text.mjs`, `src/audit/public-audit-workflow.mjs`, et les nouveaux prompt, workflow et contrat `public-observation-*`.

## 3. Recherche SEO et concurrence mieux qualifiées

Le parcours enrichi par des fournisseurs reste présent. La préparation des recherches exploite davantage les données effectivement observées : identité, catégorie, localité et domaine. Le choix des requêtes, leurs intentions et les pages visées sont davantage encadrés.

Les évolutions comprennent le filtrage de requêtes génériques ou hors sujet, un repli déterministe borné, le rapprochement des concurrents par domaine et la conservation de leurs mots-clés et positions lorsqu'ils sont fournis. Une présence dans des résultats SEO reste distinguée d'un concurrent métier confirmé.

La distinction entre une donnée absente et une valeur mesurée nulle est conservée. Aucun volume de recherche, classement ou concurrent réel ne peut être déduit du seul succès des tests synthétiques.

Fichiers principaux : `src/audit/seo-research-planner.mjs`, `src/audit/seo-qualification.mjs`, `src/audit/seo-audit.mjs`, `src/providers/http-adapters.mjs` et les contrats SEO.

## 4. Rapports HTML/PDF et dossier de preuves commun

Une représentation commune du rapport alimente les restitutions HTML et PDF. Les sections du document sont : « L'essentiel », « Actions prioritaires », « Observations utiles » et « Sources et périmètre ».

Les changements visent à garder les mêmes statuts, chiffres et limites d'un support à l'autre, à fusionner les constats et actions répétés et à conserver les références de preuve. Le PDF prend en charge les caractères français et les liens. Les données internes du programme ne doivent pas apparaître dans les documents destinés au lecteur.

L'`AuditPacket` rassemble un instantané structuré des faits, qualifications, sources et limites. Il est validé et hashé ; sa projection sert de base cohérente aux rapports et au cockpit. Un instantané incompatible avec son contrat est refusé.

Les nouveaux modules `report-document.mjs`, `report-sections.mjs`, `report-html.mjs` et `report-pdf.mjs` regroupent cette restitution. Les anciens modèles de rapports et les tests associés ont été adaptés.

## 5. Collecte réseau, budgets et persistance locale renforcés

La collecte du site est bornée en pages, octets et durée. Les redirections sont traitées explicitement, avec vérification des cibles et refus des destinations privées ou hors du périmètre autorisé. La lecture des réponses est interrompue lorsque les limites sont atteintes. Les pages utiles, telles que contact, carte/menu ou réservation, peuvent être prioritaires.

Le journal des coûts a été renforcé : relecture des événements persistés, validation du journal, réservations avant appel, verrouillage des écritures et rapprochement après réponse. Un timeout ou un coût inconnu ne permet pas de déclarer arbitrairement un appel gratuit et de recommencer sans limite.

Le stockage atomique prend désormais aussi en charge des écritures binaires, notamment pour les PDF. Les écritures temporaires, permissions, vérifications de chemins et préconditions par hash restent des protections du stockage local. Elles ne constituent pas une solution de stockage partagé pour plusieurs instances hébergées.

La validation des contrats a également été étendue, notamment pour les références locales de schéma, les types, formats et bornes utilisés par le projet. Les versions de prompts, workflows et contrats sont conservées par exécution. Les migrations de configurations livrées préservent les personnalisations reconnues.

## 6. Préparation de site et garde-fous du parcours

Le contrôle du parcours public a été renforcé pour la préparation du dossier et le démarrage d'une génération : validation des données, idempotence, réservation du démarrage, gestion de baux et rapprochement après interruption. Le programme évite de présenter une progression qui n'a pas été confirmée par le moteur.

Le parcours cible reste : dossier confirmé → plan de contenu → construction → contrôles qualité → validation opérateur → présentation. Des informations indispensables ou un rapport qualité bloquant empêchent la livraison.

La génération de site présente dans le runtime reste synthétique. Ses artefacts permettent de vérifier l'organisation du processus ; ils ne constituent pas une génération commerciale autonome déjà éprouvée.

## 7. Nettoyage du projet et documentation actuelle

Le dossier local a été recentré sur `app/`, `src/`, `fixtures/defaults/`, `scripts/`, `test/` et une documentation plus courte. Des prototypes, anciens plans, recherches et consignes d'agents ont été retirés de l'état de travail ; une partie de ces éléments appartenait à l'historique local et n'était pas présente dans la version publique du 11 octobre.

La documentation actuelle comprend un README de démarrage, une architecture, les règles du parcours, les guides de configuration et une référence de vérification. Les travaux d'hébergement sont regroupés dans `.scratch/hosted-audit/`. Les données d'exécution, secrets, logs et sorties générées sont exclus du périmètre Git par les règles d'ignorance.

Un vrai point d'entrée `src/server.mjs` démarre le serveur de développement. Les scripts disponibles sont `dev`, `start`, `check`, `test` et `preview:audits`. Le programme repose sur Node.js 22 ou supérieur, sans dépendance npm externe à installer dans l'état actuel.

## 8. Décisions confirmées le 7 novembre

### IA par abonnement

Aucune clé API OpenAI ne sera configurée à ce stade. L'intention est d'utiliser l'abonnement IA de l'opérateur pour les tâches de création et d'analyse : audits, contenus et sites.

Cette décision doit être distinguée du raccordement technique. Le fournisseur exact, le mode de connexion et les droits applicables devront être confirmés avant intégration. Le runtime actuel ne branche pas automatiquement cet abonnement sur ses workflows ; les adaptateurs IA existants ne deviennent pas actifs du seul fait que l'opérateur est abonné.

Pour ChatGPT, la documentation officielle décrit un usage du forfait via une intégration autorisée, ainsi qu'une intégration à Codex app-server. L'accès dépend de l'éligibilité, du consentement, des scopes et du type de projet. Cela ne prouve pas que le compte de l'opérateur ou le futur service hébergé Ancrage dispose déjà de cet accès. Il faudra vérifier un appel réel autorisé et la compatibilité avec l'exécution hébergée, sans dépendance au Mac.

Sources officielles consultées le 7 novembre 2026 : [Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart), [usage dans une application open source](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt), [Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server).

### GitHub et nom du projet

Le projet s'appelle **Ancrage**. Le dépôt initialement fourni était `cpointis96-hue/business-site-factory` ; le nom [cpointis96-hue/Ancrage](https://github.com/cpointis96-hue/Ancrage) est désormais visible sur GitHub et a été vérifié dans le navigateur. Ce changement de nom ne vaut pas déploiement et ne prouve pas la synchronisation du code local.

### Vercel

Le futur déploiement est prévu dans l'espace [cpointis96-hue's projects](https://vercel.com/cpointis96-hues-projects), au moment où le programme sera prêt, en utilisant les skills Vercel appropriés. Aucun déploiement n'est réalisé au titre de ce bilan.

L'objectif reste un audit complet exécuté sur une infrastructure hébergée, Mac et cockpit éteints. Le choix de Vercel pour le site impose encore de valider où s'exécutent les tâches longues et où sont conservés leurs états, résultats et secrets.

## 9. Vérifications et limites

Le contrôle `npm run check` a réussi le 7 novembre : syntaxe de 94 modules JavaScript, 21 fichiers JSON et 16 liens locaux avant l'ajout du présent bilan. `git diff --check` n'a signalé aucune erreur d'espacement lors de la revue initiale.

Lors de la première relance de `npm test`, 195 tests ont été exécutés : 182 réussis et 13 échecs `listen EPERM` dus au refus de l'écoute locale dans le bac à sable. La relance avec l'écoute autorisée a ensuite réussi : **195 tests réussis, aucun échec, aucun test ignoré**, en environ 40 secondes. Les échecs initiaux provenaient donc de la restriction de l'environnement de vérification.

Les tests automatisés utilisent des réponses synthétiques et ne prouvent ni un audit commercial réel, ni les autorisations des comptes fournisseurs, ni une publication durable de site client.

## 10. Ce qui reste avant les vrais tests hébergés

1. Raccorder et vérifier le mode IA par abonnement choisi, avec ses limites et ses autorisations.
2. Séparer et authentifier les accès publics, opérateur et clients ; appliquer l'isolation des données et les quotas nécessaires.
3. Mettre en place stockage durable, secrets serveur et exécution reprenable des audits ; éprouver la concurrence et l'absence de double facturation.
4. Revoir puis synchroniser le code destiné à GitHub, en préservant son historique et en excluant secrets et données actives.
5. Préparer un environnement Vercel de test avec le skill de déploiement, puis vérifier le parcours navigateur → API → collecte → traitement → rapports HTML/PDF.
6. Effectuer un audit réel autorisé, Mac éteint, puis interrompre et reprendre le worker pour vérifier la conservation des résultats et des coûts.

Paiement, achat de domaine, autorisations Cloudflare du client et publication commerciale restent des cibles à construire et à valider. Leur description dans les règles produit ne constitue pas une intégration livrée.
