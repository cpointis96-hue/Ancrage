# Ancrage V1 - Spécification de production local-first

Type: wayfinder:spec
Status: accepted
Version: 1

## Résultat attendu

Ancrage est un cockpit opérateur local relié à un moteur de workflows traçable. Il reçoit des dossiers, fige une configuration, exécute des étapes déterministes ou IA autorisées, conserve les artefacts et les preuves, puis exige une validation opérateur avant toute présentation ou publication.

La V1 est considérée opérable lorsqu'un parcours réel peut aller d'une configuration enregistrée à un run terminé sans donnée fictive, avec reprise depuis checkpoint, secrets hors navigateur et preuve de chaque sortie.

## Autorité des données

- Les fichiers locaux sont la source éditable des prompts, workflows, contrats et politiques.
- Une activation produit un `ConfigurationSnapshot` immuable, identifié par son hash.
- Le Control Plane conserve les états métier, autorisations, versions actives, hashes, coûts, événements et références d'artefacts.
- Un run fige son snapshot au démarrage. Modifier un brouillon n'altère jamais un run existant.
- Les secrets appartiennent au trousseau macOS ou au secret manager du déploiement. Ils ne sont jamais écrits dans un prompt, un manifeste de run, une base métier, un log ou une réponse navigateur.

## Topologie V1

```text
Site public
  -> Control Plane cloud minimal
  -> CloudIntakeInbox chiffrée
  -> synchronisation idempotente
  -> LocalBridge sur 127.0.0.1
  -> registre de configuration local
  -> moteur de workflows
  -> artefacts, QA et décision opérateur
```

Le cockpit est servi par le `LocalBridge`. Ouvrir directement le fichier HTML reste une compatibilité de prévisualisation, pas le mode opérable.

## Arborescence locale

Le répertoire de données est configurable par `ANCRAGE_DATA_DIR`. En développement, il vaut `.ancrage/` à la racine du projet et reste ignoré par Git.

```text
.ancrage/
  config/
    prompts/<prompt-id>/draft.md
    prompts/<prompt-id>/versions/<version-id>.md
    prompts/<prompt-id>/manifest.json
    workflows/<workflow-id>.json
    contracts/<contract-id>.schema.json
    contracts/<contract-id>/versions/<version-id>.schema.json
    contracts/<contract-id>/manifest.json
    cli-profiles/<profile-id>.json
    cli-profiles/<profile-id>/versions/<version-id>.json
    cli-profiles/<profile-id>/manifest.json
    providers/<provider-id>.json
    routing/<policy-id>.json
  runs/<run-id>/
    run-manifest.json
    events.jsonl
    steps/<step-id>/step-run.json
    artifacts/
  state/
    active-snapshots.json
    provider-status.json
```

Toutes les écritures remplacent un fichier temporaire du même dossier par renommage atomique. Les versions publiées et les artefacts de run sont immuables.

## Formats de configuration

### Prompt Markdown

Un prompt est lisible et modifiable comme fichier `.md`. Son frontmatter contient uniquement des références non secrètes.

```md
---
id: copywriter
name: Copywriter
ownerStep: S7
outputContract: copy-draft
---
Rédige uniquement à partir des faits autorisés.
```

`draft.md` est mutable. `Créer une version` valide le frontmatter et le contrat référencé, écrit une version immuable et retourne un diff. `Activer` publie cette version pour les futurs runs.

### Workflow JSON

Un workflow déclare un graphe acyclique d'étapes. Chaque étape possède `id`, `kind`, `trigger`, `dependsOn`, `inputRefs`, `outputRefs`, `implementation`, `promptRef`, `model`, `contractRef`, `timeoutMs`, `budget` et `approval`. Le modèle est choisi explicitement dans l’étape IA et n’est jamais imposé par le prompt.

Le moteur refuse un workflow avec identifiant dupliqué, dépendance absente, cycle, sortie ambiguë, prompt absent, contrat absent, timeout non borné ou budget cloud non explicite.

### Contrat JSON Schema

Chaque contribution IA et chaque frontière d'étape possède un JSON Schema versionné. Une sortie invalide ne devient jamais un checkpoint fiable.

Le brouillon est le fichier `contracts/<contract-id>.schema.json`. Son registre publie une version immuable puis une activation séparée. Un prompt doit référencer un contrat existant et une version de prompt ne peut être créée que si ce contrat possède une version active.

### Profil CLI

Un profil CLI versionné décrit uniquement une commande, ses arguments, son timeout, sa limite de sortie et ses origines autorisées. Il ne contient aucun secret et n'autorise pas à lui seul une exécution depuis le navigateur. Une étape peut référencer un profil CLI existant ; une version de workflow exige alors que ce profil soit actif.

Une étape IA doit référencer un prompt existant et son `contractRef` doit correspondre au `outputContract` du prompt. Une étape qui référence un contrat ou un profil CLI inexistant est refusée côté registre avant écriture.

## Sémantique des actions du cockpit

| Action | Conséquence réelle |
|---|---|
| `Enregistrer` | valide puis écrit le brouillon local sans l'activer |
| `Créer une version` | crée une version immuable et affiche son diff |
| `Activer` | remplace le snapshot actif pour les futurs runs après confirmation |
| `Modifier` | ouvre le brouillon dans l'éditeur du cockpit |
| `Ouvrir le fichier` | demande au LocalBridge d'ouvrir le fichier local autorisé |
| `Tester` | exécute une fixture isolée, sans mutation métier |
| `Dupliquer` | crée un nouveau brouillon avec un nouvel identifiant ; l'action est absente tant que cette conséquence n'est pas implémentée |
| `Relancer` | crée une nouvelle tentative depuis le dernier checkpoint fiable |
| `Enregistrer une clé` | écrit le secret dans le trousseau puis efface immédiatement le champ |
| `Tester la connexion` | effectue un appel minimal borné et persiste uniquement l'état, la date et l'erreur expurgée |

## LocalBridge

Le serveur local :

- écoute uniquement sur `127.0.0.1` ;
- refuse les origines autres que sa propre origine ;
- limite la taille et le type des requêtes ;
- sert le cockpit avec une Content Security Policy restrictive ;
- valide tous les identifiants avant résolution de chemin ;
- interdit les traversées de répertoire et les liens symboliques hors du répertoire autorisé ;
- ne retourne jamais une valeur secrète ;
- journalise les mutations avec identifiant, ressource, ancienne version, nouvelle version et résultat ;
- désactive les doubles soumissions et détecte les conflits par hash attendu.

## ProviderConnection

Une connexion expose `id`, `name`, `kind`, `capabilities`, `configured`, `enabled`, `health`, `lastCheckedAt` et `lastErrorCode`. Le secret est référencé par `secretRef` uniquement côté serveur.

Une clé seule n'active rien. L'activation exige : secret présent, test réussi, capacités déclarées, politique de données, budget et modèle autorisé.

## Moteur de workflows

Le moteur est déterministe. Il :

1. charge et valide le workflow actif ;
2. fige les versions dans `run-manifest.json` ;
3. calcule les étapes prêtes depuis les dépendances ;
4. exécute chaque implémentation avec timeout et budget ;
5. valide les sorties avant checkpoint ;
6. écrit événements, tentative, coût, erreur expurgée et hash ;
7. s'arrête sur `BLOCK`, budget atteint ou approbation requise ;
8. reprend sans écraser les tentatives précédentes.

Les statuts canoniques sont `QUEUED`, `RUNNING`, `WAITING_FOR_APPROVAL`, `SUCCEEDED`, `PARTIAL`, `FAILED` et `BLOCKED`.

## Capacité Internet

`Internet` est un workflow déterministe sans LLM. Les adapters Cloudflare, Dynadot, NameSilo et Name.com sont indépendants. Un échec produit un résultat `PARTIAL`, jamais de faux prix.

Chaque devis conserve provider, domaine normalisé, disponibilité, prix initial, renouvellement, devise, caractère premium, date, cache et provenance. L'achat reste externe et explicitement humain.

## Synchronisation cloud vers Mac

La synchronisation utilise un curseur, un identifiant de dossier non devinable, une version de schéma et un hash. Le LocalBridge écrit d'abord dans une zone temporaire, vérifie le hash, renomme atomiquement, puis accuse réception. La suppression cloud intervient uniquement après cet accusé.

Les conflits produisent `SYNC_BLOCKED`. Une reprise est idempotente et ne crée pas de doublon.

## Interface

Mode `Operate`, direction Ancrage existante, dials ENERGY 1 / RHYTHM 1 / MOTION 1.

- Une action principale par état.
- Icônes SVG cohérentes, trait 1.5 px, dessin utile de 14 à 16 px dans une cible de 44 px.
- Aucun bouton sans conséquence réelle.
- Aucun statut communiqué uniquement par la couleur.
- Les états vide, chargement, erreur, hors ligne, conflit et permission refusée indiquent la prochaine action.
- À 390 px, les actions principales restent visibles, les libellés restent dans leur conteneur et la page ne déborde pas horizontalement.

## Critères de production

La mention `production-ready` est interdite tant que les preuves suivantes ne sont pas réunies :

- tests unitaires du stockage atomique, validation, versioning, redaction et moteur ;
- tests d'intégration de toutes les routes mutantes ;
- test réel Keychain sans exposer le secret ;
- tests de reprise après interruption et conflit ;
- tests desktop, tablette, 390 px, clavier et zoom 200 % ;
- vertical slice public -> intake -> sync -> run -> QA -> validation -> démo ;
- tests fournisseurs avec comptes dédiés, permissions minimales, quotas et coûts observés ;
- restauration d'une sauvegarde testée ;
- aucune clé, donnée personnelle ou contenu privé dans Git, logs ou bundle navigateur.

## Décisions déléguées par le propriétaire

Le propriétaire délègue les décisions techniques et UX réversibles nécessaires à cette V1. Les actions payantes, publications, suppressions distantes, envois et traitements de données nouveaux conservent une confirmation explicite.
