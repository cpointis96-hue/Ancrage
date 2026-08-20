# Handoff vers Codex après timeout d’une Demo

Date de recherche : 2026-08-17  
Périmètre : documentation officielle OpenAI/Codex actuelle uniquement.  
Contrainte respectée : aucune modification de `map.md`, des tickets ou du code.

## Réponse courte

Oui, une web app locale peut déclencher une intervention Codex avec un contexte prérempli si elle s’intègre à un processus Codex local : la voie la plus directe et la mieux adaptée est `Codex App Server` (JSON-RPC), éventuellement via le `Codex SDK`. Le contexte de la Demo peut être transmis dans `turn/start` et le même thread peut être repris avec `thread/resume`; un nouveau thread dérivé peut être créé avec `thread/fork`.

La documentation officielle ne décrit pas de deep link public permettant à une web app de remplir directement une nouvelle intervention dans l’interface ChatGPT/Codex desktop ou web. Elle documente des intégrations par protocole, SDK, CLI et MCP. L’absence d’un deep link dans les pages consultées ne prouve pas qu’aucun schéma privé n’existe : elle signifie seulement que ce mécanisme n’est pas établi comme API publique supportée.

## Possibilités officiellement supportées

### 1. App Server : option recommandée pour le handoff local

La page officielle décrit `codex app-server` comme l’interface utilisée par des clients riches, avec authentification, historique de conversations, approbations et événements d’agent streamés. Elle indique explicitement qu’il est destiné à une intégration profonde dans son propre produit.

Le protocole expose notamment :

- `initialize`, puis `initialized` pour établir la connexion ;
- `thread/start` pour démarrer un thread ;
- `thread/resume` pour rouvrir un thread existant par son identifiant ;
- `thread/fork` pour copier l’historique vers un nouveau thread ;
- `turn/start` pour envoyer le prompt/context de la Demo ;
- notifications `item/*`, `turn/*` et `thread/*` pour suivre l’intervention.

La documentation donne aussi des champs permettant de fixer le `cwd`, le modèle, la politique d’approbation, le sandbox et la personnalité. Pour un timeout, le schéma supporté est donc :

1. persister côté Demo le `threadId`, le `turnId` utile, le `cwd` et un résumé de l’état ;
2. après timeout, appeler `thread/resume` avec le `threadId` si l’on veut continuer la conversation ;
3. appeler `turn/start` avec un prompt explicite de reprise et le contexte de timeout ;
4. utiliser `thread/fork` si l’on veut isoler la tentative de reprise de l’historique original.

L’App Server peut fonctionner en `stdio`, WebSocket ou socket Unix. La page officielle qualifie le transport WebSocket d’expérimental et non supporté pour la production. Elle précise aussi que les requêtes WebSocket portant un header `Origin` sont rejetées (`403`).

Conséquence d’architecture : une web app navigateur ne doit pas être supposée capable de parler directement au WebSocket `codex app-server`. C’est une inférence opérationnelle à partir de la restriction `Origin`, pas une phrase de la documentation disant “browser interdit”. Le montage robuste est un petit bridge local contrôlé par l’utilisateur, ou un serveur local qui lance/relaye l’App Server ; la web app parle à ce bridge selon un protocole local à définir.

Source : [Codex App Server](https://developers.openai.com/codex/app-server) (page actuellement redirigée vers la documentation `learn.chatgpt.com`, sections protocol, lifecycle, thread APIs et WebSocket).

### 2. Codex SDK : intégration applicative sans parler directement JSON-RPC

La documentation officielle du Codex SDK indique qu’il peut être intégré dans ses propres outils et applications. Le SDK TypeScript permet de démarrer, continuer et reprendre des threads locaux ; l’exemple officiel utilise `startThread()`, `thread.run(...)` et `resumeThread(threadId)`.

Le SDK TypeScript est documenté comme server-side et nécessite Node.js 18 ou plus. Il est donc adapté à un backend local de la web app, pas à du JavaScript exécuté directement dans le navigateur.

La documentation présente aussi un SDK Python qui contrôle l’App Server local via JSON-RPC. Il expose un démarrage de thread et l’exécution de prompts, avec des presets `read_only`, `workspace_write` et `full_access`.

Source : [Codex SDK](https://developers.openai.com/codex/codex-sdk).

### 3. MCP Server : possible, mais plutôt comme orchestration ou bridge

La documentation officielle permet de lancer Codex comme serveur MCP avec :

```text
codex mcp-server
```

Le serveur expose deux outils :

- `codex()` démarre une conversation avec un prompt initial et des overrides (`cwd`, `model`, `sandbox`, `approval-policy`, instructions, etc.) ;
- `codex-reply()` continue une conversation à partir d’un `threadId` et d’un prompt.

Cette voie est officiellement adaptée à un client MCP, notamment un workflow construit avec l’OpenAI Agents SDK. Elle peut servir de bridge si la web app possède un backend MCP client, mais elle ne constitue pas un deep link vers l’UI Codex. Le `threadId` doit être conservé pour le reply après timeout.

La page précise que l’installation locale de Codex CLI est requise et que l’exemple Agents SDK utilise une clé API OpenAI stockée localement. Il faut donc distinguer ce parcours d’une reprise authentifiée dans l’application desktop avec un compte ChatGPT : la documentation MCP citée décrit le serveur MCP/CLI et ses prérequis, pas une conversion automatique entre une session UI et une session MCP.

Source : [Use Codex with the Agents SDK / MCP Server](https://developers.openai.com/codex/mcp-server).

### 4. CLI : supporté pour lancer un travail local, pas pour un deep link web

La documentation CLI décrit l’usage de `codex` depuis un répertoire de projet et de `codex exec` pour les workflows répétables et les pipelines. Elle indique que le répertoire courant, ou `--cd`/`-C`, sert de projet local pour le chat CLI.

La page “Projects and chats” précise que le CLI ne présente pas la vue ChatGPT Projects. Elle précise aussi que le projet CLI est le répertoire depuis lequel Codex est lancé. Cela permet de transmettre une partie du contexte par le `cwd` et des fichiers locaux, mais ne donne pas à une web app une API officielle pour ouvrir ou préremplir l’UI desktop/web.

Source : [Codex CLI](https://developers.openai.com/codex/cli) et [Projects and chats](https://learn.chatgpt.com/docs/projects).

### 5. Projets, chats et fichiers : contexte organisationnel, pas mécanisme de handoff local documenté

La documentation Projects indique que les projets regroupent chats, fichiers, instructions et sources dans ChatGPT. Elle distingue les projets ChatGPT des projets locaux utilisés par le CLI et l’extension IDE. Elle indique également que le CLI ne présente pas la vue ChatGPT Projects.

Ces primitives peuvent aider à organiser un contexte, mais les pages consultées ne documentent pas :

- une URL publique de type `codex://...` ou `chatgpt://...` avec un prompt prérempli ;
- une URL HTTP ChatGPT/Codex avec paramètres de texte, fichier, `threadId` ou `projectId` officiellement garantis ;
- une API publique permettant à une web app locale de créer directement un chat dans la vue Projects ;
- une API de transfert automatique d’un thread App Server vers un chat visible dans l’UI ChatGPT/Codex.

Source : [Projects and chats](https://learn.chatgpt.com/docs/projects).

## Ce qui est seulement hypothétique ou non établi

| Mécanisme | État documentaire | Conclusion pour l’architecture |
|---|---|---|
| Deep link `codex://`, `chatgpt://` ou URL avec prompt | Non trouvé dans la documentation officielle consultée | Ne pas en faire un contrat produit. Peut rester une piste expérimentale à vérifier séparément. |
| Ouverture directe de l’UI Codex depuis un bouton web | Non documentée | Un bouton peut ouvrir une page connue, mais le préremplissage et la sélection d’un thread ne sont pas garantis par OpenAI Docs. |
| Browser → WebSocket App Server direct | Non recommandé comme hypothèse | Le transport WS est expérimental/non supporté en production et les requêtes avec `Origin` sont rejetées ; prévoir un bridge local. |
| Injection de contexte via fichier local | Supportée indirectement par le `cwd` et les capacités de travail local | À utiliser comme contexte durable, avec un prompt de reprise qui référence le fichier ; cela ne crée pas un deep link UI. |
| Reprise d’un chat ChatGPT Projects depuis CLI/App Server/MCP | Non établie | Ne pas supposer que `threadId` des surfaces est interchangeable sans preuve de l’API utilisée. |
| Utilisation d’une API OpenAI Responses/Conversations à la place de Codex | Ce sont des APIs OpenAI distinctes | Possible pour construire un agent applicatif, mais ce n’est pas une reprise de l’intervention Codex locale et cela changerait le produit demandé. |

## Recommandation bornée pour le projet

Pour le handoff après timeout, conserver un enregistrement de reprise contenant au minimum :

```text
demoRunId
codexTransport       # app-server, SDK ou MCP
threadId             # si un thread Codex existe
lastTurnId           # si utile pour fork/diagnostic
cwd
repoOrWorkspace
demoStateSummary
timeoutReason
nextAction
artifactPaths
```

Le chemin officiellement le plus direct est :

```text
web app locale
  -> bridge/backend local
  -> Codex App Server ou Codex SDK
  -> thread/resume (ou resumeThread)
  -> turn/start / thread.run avec contexte de reprise
```

Si la priorité est l’orchestration par un agent déjà MCP-compatible, utiliser `codex mcp-server` et `codex-reply(threadId, prompt)`. Si la priorité est une UI riche de suivi, des approbations et des événements streamés, préférer App Server/SDK.

Cette recommandation n’autorise pas à modifier l’architecture actuelle : elle constitue uniquement le résultat de la recherche demandée. Les détails de sécurité du bridge local, de l’authentification, de la gestion des secrets et de la persistance devront être spécifiés avant implémentation.

## Limite et niveau de confiance

Confiance élevée pour les capacités App Server, SDK, MCP Server, CLI et Projects citées ci-dessus : elles sont décrites dans les pages officielles consultées le 2026-08-17. Confiance limitée concernant les deep links et la compatibilité exacte des identifiants entre surfaces : les documents officiels consultés ne l’établissent pas.

## Vérification actualisée de la documentation officielle — 2026-08-17

Cette section précise les preuves relevées dans les pages OpenAI/Codex actuelles, afin d’éviter de confondre une intégration Codex locale avec un deep link vers l’interface graphique.

### Ce qui est officiellement supporté

* **App Server** est explicitement présenté comme l’interface à intégrer dans son propre produit, avec historique de conversation, approbations et événements streamés. Son cycle officiel est `initialize` → `thread/start` ou `thread/resume`/`thread/fork` → `turn/start`, avec des notifications de progression. `thread/start` accepte notamment `cwd`; `turn/start` accepte une liste d’items texte et des images locales. C’est le contrat le plus proche d’un handoff depuis une web app locale, à condition d’avoir un processus local côté serveur/bridge. ([App Server](https://learn.chatgpt.com/docs/app-server), sections « Core primitives », « Lifecycle overview », « Start or resume a thread » et « Turns ».)
* **Codex SDK** est officiellement prévu pour être intégré dans des outils et applications. Le SDK TypeScript est server-side et expose `startThread()`, `thread.run(...)` et `resumeThread(threadId)`; le SDK Python contrôle l’App Server local via JSON-RPC. ([Codex SDK](https://learn.chatgpt.com/docs/codex-sdk).)
* **MCP Server** est officiellement lançable par `codex mcp-server`. L’outil `codex` reçoit un `prompt` initial et des overrides comme `cwd`, `model` et `sandbox`; `codex-reply` reprend une conversation avec `threadId` et un nouveau `prompt`. C’est donc une voie documentée pour un backend MCP/orchestrateur, pas une ouverture de l’UI Codex. ([Use Codex with the Agents SDK](https://learn.chatgpt.com/docs/mcp-server).)
* **CLI** permet le travail local dans le répertoire courant ou via `--cd`/`-C`, et `codex exec` accepte un prompt en argument ainsi que du contexte supplémentaire sur stdin. C’est supporté pour lancer une intervention locale ou un pipeline, mais la documentation ne décrit pas de commande qui ouvre le composer de l’application desktop/web. ([Codex CLI](https://learn.chatgpt.com/docs/codex/cli), [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).)
* **Projets/chats/fichiers** sont documentés comme surfaces d’organisation et de contexte. Le CLI considère son répertoire de lancement comme projet local et n’expose pas la vue ChatGPT Projects; les fichiers peuvent être utilisés via le répertoire de travail ou comme contexte d’un prompt. ([Projects and chats](https://learn.chatgpt.com/docs/projects), [Work with files](https://learn.chatgpt.com/docs/artifacts-viewer).)

### Ce qui n’est pas établi par la documentation officielle consultée

* aucun schéma public `codex://` ou `chatgpt://` documenté pour transmettre un prompt, un `threadId`, un `projectId` ou des fichiers depuis une web app;
* aucune URL HTTP documentée pour créer un chat Codex/ChatGPT dans l’UI avec un composer prérempli;
* aucune garantie documentée que les identifiants de thread d’App Server, SDK, MCP, CLI et UI ChatGPT soient interchangeables;
* aucune procédure officielle documentée pour transférer automatiquement un thread local dans un chat visible dans la vue Projects de ChatGPT.

Ces points sont des **limites de preuve**, pas la preuve qu’un mécanisme privé ou non publié n’existe pas. Ils ne doivent donc pas devenir un contrat d’architecture.

### Conséquence recommandée pour la Demo timeoutée

Le contrat d’architecture défendable est :

```text
web app locale
  -> backend/bridge local contrôlé par l’utilisateur
  -> App Server ou Codex SDK
  -> thread/resume (si un thread existe)
  -> turn/start avec résumé timeouté + chemins d’artefacts
```

Alternative documentée si l’orchestrateur est MCP : `codex mcp-server`, conservation du `threadId`, puis `codex-reply(threadId, prompt)`. Le bouton web peut ouvrir une page ou une application de façon générique, mais le **préremplissage de l’interface Codex** reste une hypothèse non documentée et doit être explicitement traité comme tel.
