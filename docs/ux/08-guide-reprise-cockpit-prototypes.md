# Guide de reprise - prototypes cockpit Ancrage

Status: handoff de travail, prototype UX avant production

## Objectif

Construire l’ensemble du cockpit opérateur Ancrage avant toute implémentation de production. Le cockpit doit permettre de suivre les démos lancées, comprendre leur étape réelle, inspecter les agents et leurs versions, voir les providers et le routage, suivre les tokens et les budgets, puis corriger, reprendre, contrôler et valider une démo.

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

### Page « Agents »

Le V2 possède une page Agents avec sélection d’un rôle et onglets d’inspection :

- Rôle ;
- Workflow ;
- Instructions et prompt versionné ;
- Contrat d’entrée et de sortie ;
- Outils autorisés ;
- Exécution et routage ;
- Budget ;
- Versions ;
- Runs récents.

Cette page est la référence pour la densité d’inspection : les paramètres avancés sont dans le détail, pas tous dans la liste.

## Menu à construire page par page

1. **À traiter** : démos et décisions urgentes. Base déjà créée, à renforcer si un test révèle un trou.
2. **Runs** : toutes les exécutions, état, étape, checkpoints, logs, versions de configuration, tokens et coût par étape.
3. **Dossiers** : identité, sources, photos, droits, complétude, données manquantes, provenance et synchronisation.
4. **Agents** : base déjà créée. À compléter avec les états vide, brouillon, erreur, version inactive et test contrôlé.
5. **Qualité** : contrôles PASS/WARN/BLOCK, preuves, liens, responsive, accessibilité, secrets absents, décision de validation.
6. **Système** : providers, modèles, outils/MCP, politiques de routage, budgets, profils CLI, synchronisation et permissions.

## Ordre de reprise dans la prochaine conversation

Commencer par **Runs**, car c’est la page qui relie les démos visibles dans « À traiter » aux étapes et aux consommations demandées. Ensuite construire **Qualité**, puis **Dossiers**, puis compléter **Système**. Ne pas passer à une implémentation de production.

### Reprise effectuée — page « Runs »

La page Runs est maintenant prototypée dans `prototypes/ux-vertical-slice/cockpit-operator-v2.html` : quatre fixtures locales couvrent `ACTIF`, `PASS`, `WARN` et `BLOCK`, avec étape active, progression, checkpoints, configuration/version, provider, tokens et coût. L’inspecteur propose les onglets Vue d’ensemble, Étapes, Consommation et Logs ; les actions Reprendre, Inspecter le budget et Contexte local produisent un retour visible sans mutation durable.

Validation observée : navigation Runs sans erreur JavaScript, inspection de `RUN-024` et `RUN-023`, inspection de `RUN-022` en mobile, absence de débordement horizontal global à 390 px, tableau défilable dans son propre conteneur et console sans erreur ni warning.

Décisions restantes : définir les fixtures et statuts finaux de la page Qualité, puis raccorder les actions entre Runs, Dossiers et Qualité dans le prototype avant toute donnée réelle.

### Reprise effectuée — page « Qualité »

La page Qualité est maintenant prototypée dans `prototypes/ux-vertical-slice/cockpit-operator-v2.html` : trois fixtures locales couvrent `PASS`, `WARN` et `BLOCK`, avec contrôles de liens, responsive, accessibilité, secrets absents et provenance. L’inspecteur expose Résumé, Preuves et Contrôles ; les actions de validation et d’ouverture du rapport produisent un retour visible sans mutation durable.

Validation observée : navigation Qualité sans erreur JavaScript, inspection de `Maison Rive` et `Bistro Sillage`, action Rapport QA visible, absence de débordement horizontal global à 390 px et console sans erreur ni warning.

Décisions restantes : définir le contrat de preuve réel et les seuils de validation, puis construire la page Dossiers.

### Reprise effectuée — page « Dossiers »

La page Dossiers est maintenant prototypée dans `prototypes/ux-vertical-slice/cockpit-operator-v2.html` : trois fixtures locales couvrent identité, sources, photos et droits, complétude, données manquantes, provenance et synchronisation. L’inspecteur expose Identité, Sources & médias et Synchronisation ; les actions Synchroniser et Contexte local produisent un retour visible sans exécuter de mutation réelle.

Validation observée : navigation Dossiers sans erreur JavaScript, inspection d’Atelier Noma et Bistro Sillage, action Synchroniser visible, inspection mobile de Maison Rive à 390 px, absence de débordement horizontal global et console sans erreur ni warning.

Décisions restantes : compléter les états Agents demandés, puis finaliser Système avant la revue croisée des pages.

### Reprise effectuée — page « Agents »

La page Agents couvre maintenant les états `VIDE`, `BROUILLON`, `ERREUR`, `INACTIF` et `ACTIF`, avec une version inactive visible dans l’onglet Versions. Le test contrôlé, l’activation, la préparation d’un brouillon, la simulation de coût et l’ouverture du diff produisent des retours locaux observables ; aucune exécution réelle n’est lancée.

Validation observée : inspection de `PhotoRightsVerifier`, `SchemaContractValidator`, `LegacySEOReviewer` et `Copywriter`, test contrôlé visible, état `INACTIF` visible dans Versions, viewport mobile à 390 px sans débordement global et console sans erreur ni warning.

Décisions restantes : finaliser la page Système, puis réaliser une revue croisée de toutes les pages et de leurs états.

### Reprise effectuée — page « Système »

La page Système est maintenant finalisée avec sept registres : providers, profils de modèles, outils & MCP, routage, budgets, profils CLI et synchronisation. Chaque registre affiche son état, son périmètre, ses paramètres opérateur, ses permissions et la forme des secrets avec `[REDACTED_SECRET]`. Les actions Tester, Versions et Créer un brouillon donnent un retour local sans appeler de provider ni modifier une configuration réelle.

Validation observée : inspection d’Outils & MCP et Synchronisation, états `WARN` et `PARTIAL` lisibles, actions locales visibles, viewport mobile à 390 px sans débordement global et console sans erreur ni warning.

Décisions restantes : réaliser la revue croisée finale des six entrées du menu et figer les écarts avant passage éventuel à une étape de spécification.

### Reprise effectuée — spécialisation des registres Système V3

La V3 est disponible dans [`prototypes/ux-vertical-slice/cockpit-operator-v3.html`](../../prototypes/ux-vertical-slice/cockpit-operator-v3.html). Elle conserve la V2 comme comparaison et corrige le défaut de page générique répétée : chaque registre possède maintenant une décision, des champs et des modules adaptés.

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

Les six entrées du menu (`À traiter`, `Runs`, `Dossiers`, `Agents`, `Qualité`, `Système`) ont été parcourues sur desktop et à 390 px. Les six surfaces se rendent, aucune ne provoque de débordement horizontal global et la console finale reste sans erreur ni warning.

Écart conservé pour la suite : les données, preuves, coûts, providers et actions restent des fixtures locales ; aucune mutation durable ni intégration réelle n’est validée par ce prototype.

### Ajustement de navigation

Les six entrées du menu utilisent désormais des icônes SVG distinctes et cohérentes avec le thème : file, runs, dossiers, agents, qualité et système. En lecture mobile, le libellé reste visible à côté de l’icône. Le bouton « a » / ANCRAGE est l’accès explicite à l’accueil « À traiter », avec `title` et `aria-label` « Accueil Ancrage ».

## Règles d’interface

- Une action primaire claire par surface ou état.
- Aucun bouton décoratif ou sans conséquence observable.
- Aucun chiffre présenté comme réel s’il s’agit d’une fixture : le contexte prototype doit rester explicite.
- Les états `PARTIAL`, `WARN`, `BLOCK`, erreur, chargement, vide et hors ligne doivent être lisibles par du texte, pas seulement par la couleur.
- Les onglets d’inspection doivent défiler horizontalement sur mobile sans élargir la page entière.
- Les tables peuvent défiler dans leur propre conteneur, jamais provoquer un débordement horizontal global.
- Les secrets ne sont jamais affichés ; les paramètres montrent leur forme et leur état, avec `[REDACTED_SECRET]` si nécessaire.
- La densité doit rester native macOS/Codex : séparateurs fins, panneaux sobres, hiérarchie d’outil, pas de cartes statistiques décoratives.
- Le prototype reste local, sans base de données, sans provider réel et sans mutation durable.

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

- backend réel ;
- authentification, paiement et providers externes ;
- lancement réel d’agents ;
- suppression ou purge de données ;
- production de sites clients ;
- passage à `to-spec` avant revue complète des pages et des états.
