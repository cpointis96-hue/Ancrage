# Comment garder une arborescence claire, légère et modifiable ?

Parent: ../map.md
Type: prototype
Status: claimed

## Question

Prototyper l'arborescence des trois surfaces :

- site public et landing page ;
- cockpit opérateur local ;
- site client généré.

L'organisation doit minimiser le code spécifique, séparer clairement domaine métier, renderer, templates, contenu, configuration, intégrations et infrastructure, et permettre de modifier les offres, textes, règles, audits et paramètres depuis le cockpit sans éditer le code source.

## Principes attendus

- un `SiteSpec` commun et versionné ;
- des templates déterministes et réutilisables ;
- des contenus et offres en données/configuration ;
- des contrats structurés entre Control Plane et Agent Plane ;
- aucune logique métier cachée dans les prompts ;
- une navigation cockpit courte, orientée tâche ;
- des versions activables et restaurables ;
- le moins de dépendances et de code spécifique possible.

## Décision attendue

Définir la carte des dossiers, modules, surfaces et responsabilités avant implémentation, ainsi que les changements qu'un opérateur peut faire sans intervention de développement.

## Comments

## Decision provisoire

L'architecture s'organise autour d'un `SiteSpec` versionné, de templates déterministes, de contenus/offres configurables et d'un cockpit court orienté tâches. L'opérateur peut modifier les offres, textes, règles et paramètres activables sans éditer le code ; chaque version est restaurable. Le prototype d'arborescence reste à réaliser avant `to-spec`.

L'édition client après production est limitée aux horaires, téléphone, adresse, prix, plats, photos, textes courts et offres. Les changements de structure, template, SEO avancé ou nouvelle langue passent par une génération contrôlée.

Prototype : [cockpit-prototype.html](../prototypes/cockpit-prototype.html), variantes `?variant=a`, `?variant=b`, `?variant=c`.

## Exigence de cockpit ajoutée

Le cockpit opérateur doit comporter dans son menu latéral un onglet dédié, ouvrant une surface complète de pilotage des audits et de la création automatisée de sites. Cette surface est destinée au propriétaire/opérateur, pas au prospect public.

### Entrée et orchestration

- lancer une exécution à partir d'une URL fournie par l'opérateur, après validation du domaine, des redirections, de la politique SSRF et du périmètre autorisé ;
- déclencher un pipeline comprenant, selon la configuration activée, audit SEO, étude locale et concurrentielle bornée, analyse marketing, collecte/normalisation des données client, production du contenu, composition du `SiteSpec`, rendu et QA ;
- afficher chaque étape comme un checkpoint du `Control Plane`, avec statut, durée, coût, budget restant, entrées, sorties, erreurs, reprise et arrêt ;
- permettre une action explicite « créer le site » qui ne publie pas automatiquement et s'arrête à `READY_FOR_OWNER_REVIEW`.

### Réception quand le Mac est éteint

Le service public doit pouvoir recevoir les informations d'un prospect même lorsque le Mac opérateur et les modèles locaux sont arrêtés. Les données sont placées dans une `CloudIntakeInbox` persistante et chiffrée, avec statut, horodatage, provenance, consentements applicables, identifiant de dossier et version du schéma. Cette inbox n'est pas un cache navigateur et ne dépend d'aucun modèle IA.

Pour le MVP, `Cloudflare` fournit l'API d'entrée, l'asynchrone et `R2` pour les photos/fichiers ; `Neon` conserve les métadonnées, statuts, références et checkpoints. Aucun provider cloud supplémentaire n'est requis pour cette fonction. Les objets d'intake ciblent des tailles courantes de 10 à 20 Mo, avec Content-Type, taille, hash et clé de dossier enregistrés.

Les états minimaux sont `PENDING_SYNC`, `SYNCING`, `SYNC_RETRY`, `SYNC_BLOCKED`, `SYNCED` et `SYNCED_AND_PURGED`. Chaque transition est idempotente, horodatée et liée à un événement de synchronisation.

Dans le cockpit, un contrôle compact « Synchroniser » avec une icône de synchronisation permet à l'opérateur de déclencher une synchronisation manuelle vers le Mac :

- authentification locale et distante avant toute synchronisation ;
- aperçu du nombre de dossiers et de fichiers à importer ;
- téléchargement chiffré vers une zone locale isolée ;
- vérification de hash, de version et d'idempotence pour éviter les doublons ;
- accusé de réception cloud seulement après validation de l'import local ;
- reprise sur erreur avec curseur/checkpoint, sans perte ni double traitement ;
- journal de synchronisation visible dans le cockpit.

Après téléchargement local, vérification du hash, écriture locale atomique et validation du dossier, le backend local envoie un accusé de réception signé. Le Control Plane demande alors la suppression des objets R2 et marque l'intake `SYNCED_AND_PURGED`. Une règle lifecycle R2 de secours supprime les objets orphelins, mais ne remplace pas la suppression explicite après accusé de réception.

Après `SYNCED_AND_PURGED`, le Control Plane reste la source de vérité de l'état, de la provenance, du hash, des versions et des événements ; le fichier privé est conservé dans l'archive locale chiffrée selon la politique de sauvegarde locale. Cette distinction évite de prétendre que R2 conserve encore le contenu après purge.

La synchronisation importe les données et les fichiers, mais ne lance pas automatiquement un modèle local ni une génération coûteuse sauf si l'opérateur l'autorise. Les données restent stockées selon la politique de conservation et de chiffrement du Control Plane ; l'absence du Mac ne doit jamais faire perdre une demande publique.

### Agents, fichiers et prompts

- afficher la liste des agents par étape, leur rôle, leurs dépendances, leur schéma de sortie, leur version, leur modèle et leur provider ;
- ouvrir les fichiers de configuration autorisés de chaque agent : instructions, prompts versionnés, schémas, seuils, budgets, timeouts et règles de validation ;
- permettre à l'opérateur de modifier, prévisualiser, dupliquer, activer, désactiver et restaurer une configuration ;
- figer la version de configuration au démarrage d'un run afin qu'une modification ultérieure ne change pas une exécution en cours ;
- montrer les entrées/sorties structurées et les preuves associées, sans présenter une sortie IA comme une vérité non vérifiée.

### Providers et routage

- configurer par étape le mode déterministe, local, cloud approuvé, OmniRoute ou OpenRouter ;
- afficher les capacités, données autorisées, santé, latence, coût estimé, quota, fallback et raison de sélection ;
- autoriser un fallback uniquement vers une classe de capacité et de coût approuvée ;
- demander confirmation avant tout changement qui augmente le coût ou envoie des données vers un provider externe ;
- ne jamais afficher ni stocker les secrets dans le navigateur et ne jamais donner au cockpit public un shell arbitraire.

### Pilotage budgétaire et mesure réelle

Le propriétaire doit pouvoir allouer, ou laisser volontairement non alloué, un budget à chaque niveau : restaurant, `PipelineRun`, pipeline d'audit, étape, agent, prompt/configuration, provider et période. Le cockpit doit distinguer clairement :

- budget prévu et budget réservé avant exécution ;
- coût estimé avant appel ;
- coût réel après appel ;
- coût cumulé du restaurant et du pipeline ;
- coût par agent, étape, prompt/configuration et provider ;
- durée, nombre d'appels, tokens ou unités facturées, retries et fallbacks ;
- écart entre budget et coût observé.

Au démarrage, l'opérateur peut lancer un audit complet avec un budget de suivi. Le cockpit doit ensuite permettre d'observer le coût réel d'un restaurant de bout en bout, d'identifier les prompts ou étapes coûteux, puis de réduire les audits, les limites ou les budgets sur la base de mesures réelles. Les versions de prompts et de configurations doivent rester liées à chaque `CostEvent` pour que cette comparaison soit fiable.

L'objectif par défaut d'un run est d'aller jusqu'à l'audit complet et de rendre explicite toute étape partielle. Une alerte budgétaire ne doit pas interrompre silencieusement un run ; toute interruption, continuation au-delà du budget ou modification de périmètre doit être visible et autorisée selon la politique choisie par l'opérateur.

### Politique budgétaire recommandée

La politique recommandée est hybride et fail-safe :

- avant le lancement, le `Control Plane` calcule une estimation, réserve une enveloppe maximale et vérifie qu'un chemin de complétion existe ; l'opérateur n'a pas à intervenir au milieu d'un run normal ;
- le local ne consomme pas de budget monétaire fournisseur, mais chaque appel reste tracé avec tokens, durée, modèle, mémoire/ressource et éventuellement un coût interne indicatif ;
- le cloud consomme un coût monétaire mesuré par `CostEvent`, avec budget par run, étape, agent, prompt/configuration, provider et période ;
- les seuils 50/80/100 % déclenchent des notifications et une adaptation automatique, pas un arrêt brutal ;
- les étapes essentielles sont distinguées des étapes optionnelles ; au dépassement, le système termine d'abord le chemin essentiel avec le mode déterministe ou le provider autorisé de même classe le moins coûteux ;
- aucune escalade silencieuse vers un modèle premium, aucun nouveau provider et aucun dépassement d'enveloppe maximale sans politique préautorisée ;
- une étape optionnelle coûteuse peut être réduite, différée ou marquée `PARTIAL`, tandis que l'audit principal continue jusqu'à un rapport livrable ;
- un `BLOCK` reste obligatoire pour une violation de sécurité, de droits, de provenance critique ou de plafond dur explicitement défini ;
- le cockpit affiche après chaque run le coût réel, le coût local mesuré en unités, les alertes déclenchées, les adaptations effectuées et les économies possibles.

Cette architecture évite qu'un client soit abandonné pour quelques centimes de dépassement, tout en empêchant une boucle, un fallback incontrôlé ou une dépense premium silencieuse.

### Direction d'interface

L'interface doit rester compacte, claire et épurée : navigation latérale courte, tableau de pipeline lisible, panneau de détail contextuel, actions explicites, statuts `PASS/WARN/BLOCK`, versions visibles et aucun dashboard décoratif inutile. Le prototype doit tester cette page de pilotage avant toute implémentation de production.
