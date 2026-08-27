# Guide de reprise - prototypes cockpit Ancrage

> La fondation locale opérable est désormais dans `app/`, `src/` et `test/e2e/`. Le fichier `prototypes/ux-vertical-slice/cockpit-operator-v2.html` reste la référence visuelle historique préservée, pas la source des données de production.

Status: référence UX et handoff de fondation locale

## Objectif

La fondation locale opérable du cockpit Ancrage est maintenant implémentée dans `app/` et `src/`. Le cockpit doit permettre de suivre les runs locaux, comprendre leur étape réelle, inspecter les configurations et leurs versions, voir les providers et le routage, suivre les preuves, puis corriger, reprendre, contrôler et valider une simulation.

Le cockpit n’est pas une landing page et ne doit pas devenir un dashboard SaaS générique. Sa structure est celle d’un outil de travail dense : menu court à gauche, liste de dossiers ou de ressources au centre, inspecteur détaillé à droite, avec lecture mobile empilée.

## Références à conserver

- Direction visuelle publique : [`prototypes/sstr-direction/client-site.html`](../../prototypes/sstr-direction/client-site.html), avec l’image locale `assets/brand-rock.png`.
- Cockpit visuel de base : [`prototypes/sstr-direction/cockpit.html`](../../prototypes/sstr-direction/cockpit.html).
- Cockpit opérateur approfondi : [`prototypes/ux-vertical-slice/cockpit-operator-v2.html`](../../prototypes/ux-vertical-slice/cockpit-operator-v2.html).
- Parcours public E0 à E7 : [`prototypes/ux-vertical-slice/parcours-client-e0-e7.html`](../../prototypes/ux-vertical-slice/parcours-client-e0-e7.html).
- Architecture et règles : [`docs/ux/01-carte-surfaces-et-navigation.md`](01-carte-surfaces-et-navigation.md), [`docs/ux/02-cockpit-architecture-ux.md`](02-cockpit-architecture-ux.md), [`docs/ux/04-etats-et-regles-de-simplification.md`](04-etats-et-regles-de-simplification.md) et [`docs/ux/06-handoff-et-criteres.md`](06-handoff-et-criteres.md).

## Ce qui est déjà prototypé

### Page « À traiter »

Le V2 ouvre désormais sur cette page. Elle doit montrer les démos lancées et non seulement des tâches abstraites.

Pour chaque démo, afficher au minimum :

- nom et URL `www...` avec lien discret vers la démo ;
- état `ACTIF`, `WARN`, `BLOCK` ou équivalent textuel ;
- étape active et avancement réel ;
- dernier checkpoint ou âge ;
- cause du blocage ou de l’attente quand elle existe.

Dans l’inspecteur d’une démo, le prototype montre déjà :

- étape active ;
- progression réelle ;
- tokens observés ;
- coût observé ;
- provider et modèle ;
- configuration du run ;
- agents actifs ;
- checkpoints ;
- étapes du run ;
- tableau de consommation et de debug ;
- actions d’ouverture, contexte local et validation.

### Page « Configuration »

La page précédemment appelée « Agents » devient « Configuration ». Elle garde l'accès aux rôles, mais l'étape opérable est l'unité principale :

- **Étapes** : S0 à S10, dépendances, implémentation, entrées, sorties et reprise ;
- **Rôles** : les cinq contributions IA réellement conservées ;
- **Prompts** : étape propriétaire, modèle autorisé, édition, test et version ;
- **Contrats** : schémas et fichiers réutilisables entre étapes ;
- **Routage & outils** : scripts, APIs, CLI, modèles et approbations ;
- **Versions** : configurations activables pour les futurs runs.

Les anciens sous-onglets Workflow, Instructions, Contrat, Outils, Exécution, Budget et Runs sont fusionnés dans ces vues. Ils restent accessibles par leur contenu, sans répéter la même configuration dans neuf onglets.

Cette page est la référence pour la densité d’inspection : les paramètres avancés sont dans le détail, pas tous dans la liste.

## Menu à construire page par page

1. **À traiter** : décisions opérateur et contrôles qualité utiles jusqu’à la validation finale du site avant envoi au client.
2. **Runs** : toutes les exécutions, état, étape, checkpoints, logs, versions de configuration, tokens et coût par étape. Chaque étape est dépliable et expose son déclencheur, son implémentation, ses entrées, ses sorties exactes, ses dépendances, ses tentatives et son action de relance.
3. **Dossiers** : identité, sources, photos, droits, complétude, données manquantes, provenance et synchronisation.
4. **Configuration** : étapes, rôles, prompts, contrats et versions ; les tests contrôlés restent accessibles depuis les prompts et les rôles.
5. **Providers** : clés API, enregistrement et états des providers de modèles disponibles.
6. **Internet** : recherche de domaines et connexions registrar.

## Ordre de reprise dans la prochaine conversation

La fondation locale couvre maintenant **À traiter**, **Runs**, **Dossiers**, **Configuration**, **Providers** et **Internet**. Les runs de simulation produisent des artefacts persistants et un rapport inspectable ; le parcours public E0-E7 et les intégrations externes restent des tranches distinctes à valider.

### Reprise effectuée — page « Runs »

La page Runs est maintenant prototypée dans `prototypes/ux-vertical-slice/cockpit-operator-v2.html` : quatre données de démonstration couvrent `ACTIF`, `PASS`, `WARN` et `BLOCK`, avec étape active, progression, checkpoints, configuration/version, provider, tokens et coût. L’inspecteur propose Vue, Étapes, Preuves, Coût, Versions et Journal ; chaque étape est dépliable et sa relance est accessible par une icône dédiée.

Validation observée : navigation Runs sans erreur JavaScript, inspection de `RUN-024` et `RUN-023`, inspection de `RUN-022` en mobile, absence de débordement horizontal global à 390 px, tableau défilable dans son propre conteneur et console sans erreur ni warning.

Décisions restantes : raccorder les actions locales à un Control Plane distant si ce produit est retenu et valider les comptes externes nécessaires.

### Reprise effectuée — fusion « À traiter » / « Qualité »

Les décisions opérateur et les contrôles qualité sont maintenant réunis dans « À traiter ». Chaque dossier expose son action suivante ; un site au statut `PASS` affiche l’action finale « Valider le site » avant l’envoi au client.

Validation statique à rejouer : navigation sans erreur JavaScript, contrôles utiles visibles dans le détail et absence de débordement horizontal global à 390 px.

Décisions restantes : définir les seuils de validation métier avant une publication distante.

### Reprise effectuée — page « Dossiers »

La page Dossiers est maintenant prototypée dans `prototypes/ux-vertical-slice/cockpit-operator-v2.html` : trois fixtures locales couvrent identité, sources, photos et droits, complétude, données manquantes, provenance et synchronisation. L’inspecteur expose Identité, Sources & médias et Synchronisation ; les actions Synchroniser et Contexte local produisent un retour visible sans exécuter de mutation réelle.

Validation observée : navigation Dossiers sans erreur JavaScript, inspection d’Atelier Noma et Bistro Sillage, action Synchroniser visible, inspection mobile de Maison Rive à 390 px, absence de débordement horizontal global et console sans erreur ni warning.

Décisions restantes : compléter les intégrations de synchronisation et de publication avant une utilisation multi-client distante.

### Reprise effectuée — page « Configuration »

La page Configuration expose les étapes S0 à S10, cinq rôles IA, les prompts propriétaires et les contrats de fichiers. Les prompts sont éditables dans le cockpit, testables sur des entrées isolées et versionnables sans modifier un run déjà lancé. Les crawlers, resolvers, composers et validateurs restent des scripts ou contrôles.

Validation observée : inspection de `PhotoRightsVerifier`, `SchemaContractValidator`, `LegacySEOReviewer` et `Copywriter`, test contrôlé visible, état `INACTIF` visible dans Versions, viewport mobile à 390 px sans débordement global et console sans erreur ni warning.

Décisions restantes : rejouer la revue croisée après chaque évolution de la fondation locale.

### Reprise effectuée — page « Système »

La page Système est maintenant finalisée avec sept registres : providers, profils de modèles, outils & MCP, routage, budgets, profils CLI et synchronisation. Chaque registre affiche son état, son périmètre, ses paramètres opérateur, ses permissions et la forme des secrets avec `[REDACTED_SECRET]`. Les actions Tester, Versions et Créer un brouillon donnent un retour local sans appeler de provider ni modifier une configuration réelle.

Validation observée : inspection d’Outils & MCP et Synchronisation, états `WARN` et `PARTIAL` lisibles, actions locales visibles, viewport mobile à 390 px sans débordement global et console sans erreur ni warning.

Décisions restantes : figer les autorisations et les comptes externes avant la spécification d’une exploitation distante.

### Reprise effectuée — spécialisation des registres Système V3

La partie Système est désormais intégrée dans [`prototypes/ux-vertical-slice/cockpit-operator-v2.html`](../../prototypes/ux-vertical-slice/cockpit-operator-v2.html), qui devient le cockpit unique de revue. Les anciennes variantes séparées ne sont plus la source de vérité.

- `ProviderConnection` V1 : liste compacte de providers, activation individuelle et ajout direct `provider + clé API`. Les détails d’endpoint, capacités et versions sont retirés de cette surface tant qu’ils ne soutiennent pas une action opérateur réelle. Le prototype masque la clé et ne la persiste pas.
- `ModelProfile` : identifiant exact, classe de capacité, contexte, usages autorisés et agents associés.
- `Outils & MCP` : registre des outils, permissions d’action, approbations, manifest éditable et création locale d’un fichier `.md`.
- `AIRoutingPolicy` : ordre déterministe → local → cloud approuvé → humain, matrice agent/modèle, simulation et versions.
- `Budgets` : limites par run et étape, seuils 50/80/100 %, `CostEvents` et arrêt dur.
- `Profils CLI` : exécutable, commande préparée, sandbox, timeout, sortie de preuves et point `.md` de runbook.
- `Synchronisation` : intake, hashes, écriture locale atomique, reprise `PARTIAL`, conservation et journal ; aucune inférence IA.

Le lien agent ↔ modèle est rendu visible dans la matrice de routage et dans les usages autorisés des profils. Les actions restent locales et observables : elles préparent un brouillon, valident un manifest ou simulent une route sans appeler de provider ni modifier une configuration réelle.

Validation observée : V3 ouverte dans Helium, navigation des sept registres, inspection de `ModelProfile`, `Outils & MCP`, `AIRoutingPolicy`, `Profils CLI` et `Synchronisation`, action « Valider le manifest » avec retour visible, JavaScript inline syntaxiquement valide et capture desktop lisible. Playwright CLI n’a pas pu être exécuté car aucun navigateur Playwright n’est installé dans l’environnement ; la validation navigateur Playwright reste donc à refaire après installation autorisée du runtime.

### Revue croisée finale — cockpit V2

Les six entrées du menu (`À traiter`, `Runs`, `Dossiers`, `Configuration`, `Providers`, `Internet`) sont couvertes par l’application locale et conservent le prototype comme référence visuelle. La validation a été rejouée dans le navigateur local à 1440, 900 et 390 px : navigation, actions principales, absence de débordement global et console propre sur une session fraîche.

Écart conservé pour la suite : les comptes providers, registrars, l’authentification, la publication distante et le Control Plane cloud ne sont pas validés par cette fondation locale.

### Ajustement de navigation

Les six entrées du menu utilisent des icônes SVG distinctes et cohérentes avec le thème : file, runs, dossiers, configuration, providers et internet. En lecture mobile, le libellé reste visible à côté de l’icône. Le bouton « a » / ANCRAGE est l’accès explicite à l’accueil « À traiter », avec `title` et `aria-label` « Accueil Ancrage ».

## Règles d’interface

- Une action primaire claire par surface ou état.
- Aucun bouton décoratif ou sans conséquence observable.
- Aucun chiffre présenté comme réel s’il s’agit d’une fixture : le contexte prototype doit rester explicite.
- Les états `PARTIAL`, `WARN`, `BLOCK`, erreur, chargement, vide et hors ligne doivent être lisibles par du texte, pas seulement par la couleur.
- Les onglets d’inspection doivent défiler horizontalement sur mobile sans élargir la page entière.
- Les tables peuvent défiler dans leur propre conteneur, jamais provoquer un débordement horizontal global.
- Les secrets ne sont jamais affichés ; les paramètres montrent leur forme et leur état, avec `[REDACTED_SECRET]` si nécessaire.
- La densité doit rester native macOS/Codex : séparateurs fins, panneaux sobres, hiérarchie d’outil, pas de cartes statistiques décoratives.
- La fondation locale persiste les dossiers, runs, événements et artefacts sur disque ; elle ne stocke pas les secrets dans le navigateur et ne prétend pas avoir validé les providers ou registrars réels.

## Validation attendue à chaque page

Pour chaque entrée du menu :

1. ouvrir la page dans le preview local ;
2. vérifier desktop et viewport mobile ;
3. vérifier qu’il n’existe pas de débordement horizontal global ;
4. sélectionner au moins deux lignes et inspecter le détail ;
5. vérifier les états et actions principales ;
6. lire la console et corriger toute erreur introduite ;
7. mettre à jour ce guide avec la page terminée et les décisions restantes.

La validation navigateur doit être distinguée de la validation syntaxique ou statique.

## Hors périmètre

- Control Plane cloud, authentification et paiement ;
- comptes providers et registrars externes ;
- lancement réel d’agents ;
- suppression ou purge de données ;
- publication distante de sites clients ;
- passage à `to-spec` pour une exploitation distante avant validation des comptes, permissions et contrats.
