# Fit fournisseurs cloud et QA pour le MVP

Type : research
Ticket source : `../issues/07-fit-fournisseurs-cloud-et-qa.md`
Vérifié le : 17 août 2026
Périmètre : uniquement documentations, dépôts et pages de tarifs officielles des projets étudiés.

## Conclusion exécutive

Le fit est bon pour une architecture en deux plans :

1. **Edge/control plane** : Cloudflare Workers avec Hono pour l’intake public et l’API, Turnstile pour réduire l’abus, Neon pour les données transactionnelles et R2 pour les artefacts. Cette partie peut continuer à recevoir les demandes lorsque le Mac est éteint.
2. **Durable job plane** : Cloudflare Workflows pour l’orchestration multi-étapes, les retries, la reprise et l’attente d’une validation humaine ; Queues seulement lorsque la frontière producteur/runner, le débit ou le fan-out le justifie.
3. **Runner de rendu/QA** : Playwright, Lighthouse et `@axe-core/playwright` dans un environnement Node disposant d’un navigateur. Ils ne constituent pas un moteur à exécuter directement dans un Worker edge. Le Mac seul ne satisfait donc pas la contrainte « Mac éteint » pour les jobs de rendu/QA : il faut soit un runner cloud/CI, soit accepter que ces jobs restent en attente.

Les tarifs ci-dessous sont des tarifs USD publiés par les fournisseurs à la date de vérification. Ils ne constituent pas une facture prévisionnelle : les volumes MVP (demandes, jobs, pages auditées, durée de runner et taille des artefacts) ne sont pas encore décidés.

## Hypothèses MVP utilisées pour juger le fit

- Web uniquement, mobile-first côté client.
- Démo personnalisée avant paiement ; le cockpit opérateur peut rester local.
- Le cloud est la source de vérité ; l’arrêt du Mac ne doit pas interrompre l’intake public.
- Pipeline attendu : demande publique → validation/intake → job asynchrone → génération/rendu → QA → revue humaine éventuelle → démo/production.
- Coût fixe et coût marginal faibles, avec limites explicites, retries, traçabilité et protection contre les boucles ou dépenses incontrôlées.
- `Axe` est interprété comme **axe-core**, et pour l’intégration de test comme `@axe-core/playwright`.

## Tableau de décision

| Composant | Fit MVP | Coût publié actuel | Limite/contrainte qui compte | Décision provisoire |
|---|---|---|---|---|
| Cloudflare Workers | **Oui** pour intake/API légère | Free ; Paid **5 USD/mois minimum par compte**, puis usage | Paid : 10 M requêtes/mois incluses, 30 M ms CPU/mois incluses ; 128 MB mémoire, 10 MB script, 10 000 sous-requêtes/requête ; CPU max 5 min par invocation | Garder l’API publique et le control plane sur Workers ; ne pas y mettre le navigateur |
| Hono | **Oui** comme framework | Pas de service hébergé ; package open source MIT (inférence de coût : pas de ligne de facturation Hono) | Adaptateur officiel Cloudflare Workers ; dépend des API et limites du runtime cible | Utiliser pour le routage, validation et middleware, sans lui attribuer un coût cloud propre |
| Workflows | **Oui, recommandé** pour le pipeline durable | Inclus Free/Paid ; après le 10 août 2026 : steps/storage facturés selon usage | Free : 100 000 exécutions/jour partagées, 3 000 steps/jour, 1 GB d’état ; Paid : 10 M invocations/mois, 500 000 steps/mois, 1 GB storage/mois inclus | Orchestration principale, retries, checkpoints, attente de revue humaine |
| Queues | **Oui en complément** | Free : 10 000 opérations/jour ; Paid : 1 M/mois inclus puis **0,40 USD/million** | Message 128 KB, batch 100 ou 256 KB, backlog 25 GB/queue, rétention Paid jusqu’à 14 jours ; retries consomment des reads | Frontière vers runner externe, fan-out/back-pressure ou traitement indépendant ; pas le remplacement de Workflows |
| R2 | **Oui** pour images, rapports, bundles et artefacts | 10 GB-month + 1 M Class A + 10 M Class B gratuits/mois ; puis Standard 0,015 USD/GB-month, 4,50 USD/M Class A, 0,36 USD/M Class B ; egress Internet gratuit | Objet jusqu’à 5 TiB ; upload simple 5 GiB, multipart jusqu’à 4,995 TiB | Stocker les gros artefacts et ne persister dans Workflow que des références |
| Turnstile | **Oui** pour l’intake public | Free ; Enterprise sur devis | Free : 20 widgets, 10 hostnames/widget, challenges illimités ; token 5 min, usage unique, validation serveur obligatoire | Activer sur formulaire + Siteverify côté Worker ; ajouter rate limiting/idempotence applicative |
| Neon | **Oui** pour la source de vérité transactionnelle | Free : 0 USD, 100 projets, 100 CU-h/projet/mois, 0,5 GB/projet ; Launch : 0,106 USD/CU-h + 0,35 USD/GB-month | Scale-to-zero Free après 5 min ; driver serverless HTTP/WebSocket ; les connexions WebSocket ne survivent pas à une requête Worker | Utiliser Neon via `@neondatabase/serverless`, requêtes HTTP pour one-shot ; vérifier le cold start et les limites de branches |
| Playwright | **Oui** pour E2E/navigation/rendu, mais dans un runner | Package Apache-2.0 ; pas de coût de service Playwright publié | Nécessite Node et des binaires Chromium/Firefox/WebKit ; plusieurs centaines de MB pour les navigateurs ; ressources CPU/RAM du runner à payer ailleurs | Runner séparé Node/CI/cloud ; limiter à Chromium au début, workers maîtrisés |
| Lighthouse | **Oui** pour performance, accessibilité, SEO et best practices | Open source Apache-2.0 ; pas de coût de service pour le CLI/Node | Exécution locale ; throttling par défaut et variabilité des scores ; le résultat est un signal, pas une garantie SEO | QA de qualité et régression, avec configuration/version/environnement figés et plusieurs runs si seuil strict |
| axe-core / `@axe-core/playwright` | **Oui** pour l’accessibilité automatisable | axe-core et intégration MPL-2.0 ; pas de coût de service Deque pour ces packages open source | Analyse le contenu rendu ; régions cachées et parcours clavier/modal doivent être activés/testés séparément ; résultats `incomplete` à revue humaine | Ajouter à Playwright ; bloquer sur violations choisies, conserver les éléments incomplets et prévoir une revue manuelle |

## 1. Cloudflare Workers et Hono

### Workers : coût et enveloppe

La page tarifaire Workers publiée par Cloudflare indique :

- Free : 100 000 requêtes/jour et 10 ms de CPU par invocation.
- Paid/Standard : minimum 5 USD/mois par compte, 10 millions de requêtes/mois incluses puis 0,30 USD/million ; 30 millions de millisecondes CPU/mois incluses puis 0,02 USD/million de millisecondes CPU.
- Le Paid autorise jusqu’à 5 minutes de CPU par invocation (30 secondes par défaut) et jusqu’à 15 minutes de CPU pour une invocation Cron ou un consumer de Queue.
- Il n’y a pas de frais supplémentaires de data transfer/egress ou de throughput dans ce modèle Workers.

Sources : [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

Les limites opérationnelles pertinentes pour l’intake sont 128 MB de mémoire, 10 MB de script sur Paid, 10 000 sous-requêtes par requête sur Paid, 6 connexions sortantes simultanées par requête et une taille de body HTTP dépendant du plan Cloudflare (100 MB Free/Pro, 200 MB Business, 500 MB Enterprise par défaut). Un formulaire public ne devrait pas envoyer les gros fichiers dans le Worker : il doit envoyer des métadonnées et, si nécessaire, utiliser un upload contrôlé vers R2.

### Hono : rôle et coût

La documentation Hono fournit un template `cloudflare-workers` et un adaptateur `workerd`/Cloudflare Workers ; Hono expose aussi des helpers pour les bindings et les API propres au runtime. Le `package.json` officiel déclare une licence MIT et un adaptateur `cloudflare-workers`.

Sources : [Hono Getting Started](https://hono.dev/docs/getting-started/basic), [Hono Adapter Helper](https://hono.dev/docs/helpers/adapter), [package.json officiel Hono](https://github.com/honojs/hono/blob/main/package.json).

**Lecture architecture** : Hono est un choix de framework, pas un fournisseur d’exécution. Son coût direct est donc nul dans le modèle étudié ; le coût vient des Workers, des bindings et des services appelés. Le runtime Workers reste un runtime JavaScript web/V8 avec seulement un sous-ensemble de Node.js. La compatibilité `nodejs_compat` ne transforme pas Workers en serveur Node complet : `node:child_process` est documenté comme un stub non fonctionnel, ce qui est incompatible avec le lancement d’un navigateur local par un Worker.

Source : [Node.js compatibility dans Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

## 2. Workflows et Queues

### Workflows : meilleur ajustement pour le job métier

Cloudflare décrit Workflows comme une exécution durable multi-étapes : chaque `step.do()` persiste son résultat, reprend au dernier step réussi après interruption, et accepte un retry configurable. `step.sleep` permet de suspendre sans consommer du CPU actif ; `step.waitForEvent` permet d’attendre une approbation humaine ou un webhook. Le wall-clock d’un step est illimité, mais son CPU reste soumis aux limites.

Sources : [Workflows overview](https://developers.cloudflare.com/workflows/), [Build your first Workflow](https://developers.cloudflare.com/workflows/get-started/guide/), [events and parameters](https://developers.cloudflare.com/workflows/build/events-and-parameters/), [sleeping and retrying](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/).

#### Tarifs et limites actuels

La facturation Workflows est actuellement composée de quatre dimensions, en plus du modèle Workers pour requêtes et CPU : invocations, CPU, état stocké et steps. Cloudflare indique que la facturation des steps et du storage commence le 10 août 2026.

| Dimension | Free | Paid |
|---|---:|---:|
| Invocations/requêtes | 100 000/jour, partagé avec Workers | 10 M/mois inclus, puis 0,30 USD/M |
| CPU | 10 ms par invocation | 30 M ms/mois inclus, puis 0,02 USD/M ms |
| État | 1 GB | 1 GB/mois inclus, puis 0,20 USD/GB-month |
| Steps | 3 000/jour | 500 000/mois inclus, puis 0,80 USD/100 000 |

Les limites d’exécution sont à intégrer au design : résultat non-streamé d’un step et payload d’événement de 1 MiB, état persistant maximal de 100 MB Free/1 GB Paid par instance, 1 024 steps Free/10 000 Paid par instance (extensible à 25 000), 100 instances concurrentes Free/50 000 Paid, et maximum 100 000 exécutions/jour Free contre illimité Paid. Le stockage des pages, screenshots, traces et bundles doit donc rester dans R2, avec seulement des clés, checksums, statuts et petits résumés dans Workflows/Neon.

Sources : [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/), [Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/).

### Queues : frontière de transport et de débit

Queues compte les opérations par tranches de 64 KB écrites, lues ou supprimées ; un message de moins de 64 KB consommé normalement coûte en général trois opérations (write + read + delete). Les retries ajoutent des reads et un DLQ ajoute des writes. Il n’y a pas de frais d’egress ou de throughput Queues.

Tarifs : Free 10 000 opérations/jour ; Paid 1 million d’opérations/mois inclus puis 0,40 USD/million. Sur Paid, la rétention est de 4 jours par défaut et configurable jusqu’à 14 jours ; Free est limité à 24 heures.

Sources : [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/), [Queues limits](https://developers.cloudflare.com/queues/platform/limits/), [batching/retries](https://developers.cloudflare.com/queues/configuration/batching-retries/).

Limites importantes : 128 KB par message, 100 messages ou 256 KB par `sendBatch`, batch consumer jusqu’à 100 messages, 5 000 messages/seconde par queue, backlog de 25 GB par queue, 250 consumers concurrents en push, 15 minutes de wall-clock par consumer et CPU configurable jusqu’à 5 minutes. Un consumer pull peut être un service HTTP situé hors de Workers, avec une visibilité maximale de 12 heures.

Source : [Pull consumers](https://developers.cloudflare.com/queues/configuration/pull-consumers/).

**Lecture architecture** : Workflows doit porter l’état métier et la reprise du pipeline ; Queues peut transporter des commandes idempotentes vers un runner Node externe. Queues ne résout toutefois pas à elle seule la contrainte Mac éteint : un consumer pull ou push doit encore exister dans une infrastructure disponible. Sans runner cloud/CI, les messages peuvent être conservés mais le rendu/QA ne progressera pas pendant l’arrêt du Mac.

## 3. R2 et Turnstile

### R2 : stockage adapté aux artefacts

R2 Standard comprend chaque mois 10 GB-month gratuits, 1 million d’opérations Class A et 10 millions Class B. Au-delà, le tarif publié est 0,015 USD/GB-month, 4,50 USD/million Class A et 0,36 USD/million Class B. L’egress Internet direct depuis R2 est gratuit ; une autre ressource Cloudflare ou un service tiers éventuellement facturé doit être distingué de l’egress R2.

Sources : [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 limits](https://developers.cloudflare.com/r2/platform/limits/).

La limite d’objet est 5 TiB ; un upload single-part est limité à 5 GiB et le multipart va jusqu’à 4,995 TiB, avec 10 000 parts maximum. Pour le MVP, les limites ne sont pas un risque technique ; le risque réel est l’accumulation d’artefacts de démos, screenshots, traces et versions. Il faut donc définir une rétention et un garbage collection explicites, avec checksum et référence depuis Neon.

### Turnstile : protection de l’intake, pas contrôle d’abus complet

Le plan Free Turnstile est gratuit, autorise jusqu’à 20 widgets par compte, 10 hostnames par widget et un nombre illimité de challenges/verification requests. Il peut être utilisé sans proxy Cloudflare ni autre service Cloudflare.

Source : [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/).

Le widget émet un token de 2 048 caractères maximum ; le token expire après 300 secondes et ne peut être validé qu’une seule fois. La validation serveur via Siteverify est obligatoire : le widget client seul ne protège pas un endpoint. Il faut aussi contrôler côté Worker l’action, l’hostname, l’idempotency key, le rate limit, la taille du formulaire et le coût maximal du job déclenché.

Sources : [Turnstile getting started](https://developers.cloudflare.com/turnstile/get-started/), [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## 4. Neon

### Coût et enveloppe

La page de tarifs Neon actuelle indique :

- **Free** : 0 USD, pas de limite de durée, 100 projets, 100 CU-hours mensuels par projet, 0,5 GB de storage par projet, compute jusqu’à 2 CU/8 GB RAM ; le compute scale-to-zero après 5 minutes d’inactivité.
- **Launch** : usage-based, typiquement 15 USD/mois selon l’exemple de charge affiché ; 0,106 USD/CU-hour, 0,35 USD/GB-month, compute jusqu’à 16 CU/64 GB RAM.
- **Scale** : 0,222 USD/CU-hour, 0,35 USD/GB-month, compute jusqu’à 56 CU/224 GB RAM, avec des capacités réseau/support supplémentaires.
- Les paid plans facturent aussi l’historique de restauration à 0,20 USD/GB-month selon la fenêtre configurée, et le réseau public au-delà du volume inclus affiché par le plan.

Source : [Neon pricing](https://neon.com/pricing).

La base est adaptée au control plane : les demandes, états de jobs, versions, décisions de validation et références R2 sont de petits enregistrements transactionnels. La capacité de branches et le coût d’historique ne doivent pas être utilisés comme stockage de screenshots ou bundles.

### Accès depuis Workers

Le driver officiel `@neondatabase/serverless` supporte les environnements serverless/edge via HTTP ou WebSockets, sans TCP brut. HTTP convient aux requêtes one-shot et aux transactions non interactives ; WebSockets convient aux sessions ou transactions interactives. Dans un environnement serverless comme Cloudflare Workers, Neon précise que les connexions WebSocket ne peuvent pas survivre à une requête : un `Pool`/`Client` doit être connecté, utilisé et fermé dans le handler. Pour le MVP, les requêtes courtes via HTTP sont donc la voie la plus simple ; les transactions interactives doivent être isolées et testées.

Sources : [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver), [Neon scale-to-zero](https://neon.com/docs/introduction/scale-to-zero).

**Risque à mesurer** : le scale-to-zero économise le coût mais ajoute une reprise de compute de l’ordre de quelques centaines de millisecondes selon la documentation Neon. Ce n’est pas un blocage pour l’intake, mais il faut mesurer le délai perçu sur la première requête et ne pas confondre ce réveil avec un échec de Worker.

## 5. Playwright, Lighthouse et axe

### Playwright : QA E2E et rendu navigable

La documentation officielle Playwright indique que chaque version doit installer ses binaires de navigateurs ; Chromium, Firefox et WebKit sont pris en charge, ainsi que des navigateurs de marque et des profils d’appareils. Les binaires représentent plusieurs centaines de MB dans l’exemple officiel. Playwright Test exécute les fichiers en parallèle par défaut, peut limiter le nombre de workers et peut sharder une suite sur plusieurs machines.

Sources : [Playwright browsers](https://playwright.dev/docs/browsers), [parallelism](https://playwright.dev/docs/test-parallel), [CI](https://playwright.dev/docs/ci).

Le package officiel déclare Apache-2.0 dans son `package.json`. Playwright n’est pas un service de browser managé dans le périmètre étudié : il n’y a donc pas de prix par test à ajouter, mais il faut payer/assumer l’environnement qui exécute Node, le navigateur, les dépendances système, le CPU, la RAM, le disque et éventuellement la CI.

Source : [package.json officiel Playwright](https://github.com/microsoft/playwright/blob/main/package.json).

**Limite architecturale** : Playwright est documenté autour de Node.js et de binaires de navigateur installés sur un OS ; Workers est un runtime edge V8 qui ne fournit qu’un sous-ensemble de Node.js et expose `node:child_process` comme stub non fonctionnel. La conclusion « Playwright complet ne tourne pas directement dans le Worker » est une inférence à partir de ces deux documentations officielles. Le placement recommandé est un runner Node séparé, appelé par Workflows/Queues.

### Lighthouse : qualité de page et régressions

Lighthouse est décrit officiellement comme un outil open source automatisé, exécutable dans DevTools, via CLI ou comme module Node. Il audite notamment performance, accessibilité, best practices et SEO ; les résultats CLI sont traités localement et ne sont pas envoyés à un serveur distant par Lighthouse.

Sources : [Lighthouse overview](https://developer.chrome.com/docs/lighthouse/), [Lighthouse introduction](https://developer.chrome.com/docs/lighthouse/overview), [README officiel](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md).

Le package officiel déclare Apache-2.0 : aucun coût de licence ou de requête Lighthouse n’est à prévoir. Le coût est celui du runner Chrome/Node. Lighthouse applique par défaut une émulation réseau/CPU et ses scores varient selon l’environnement ; les seuils doivent donc être testés avec version, machine/container, viewport, throttling et nombre de runs contrôlés. Le README Lighthouse CI documente `numberOfRuns` pour réduire l’effet des fluctuations.

Sources : [Lighthouse package.json](https://github.com/GoogleChrome/lighthouse/blob/main/package.json), [throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), [Lighthouse CI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md).

**Position MVP** : utiliser Lighthouse comme signal QA versionné (par exemple performance/SEO/accessibilité avec seuils souples et rapports conservés dans R2), pas comme preuve automatique qu’un site est « bon SEO » ni comme unique test d’accessibilité.

### axe-core et `@axe-core/playwright` : accessibilité automatisée

axe-core est une engine d’accessibilité pour tests web automatisés, distribuée sous MPL-2.0. L’API `axe.run` fonctionne localement, sans connexion obligatoire à un serveur tiers, retourne notamment `violations`, `incomplete`, `passes` et `inapplicable`, et peut cibler des tags WCAG ou des règles précises.

Sources : [axe-core officiel](https://github.com/dequelabs/axe-core), [axe-core API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md).

L’intégration officielle `@axe-core/playwright` injecte axe dans la page et les frames et expose `AxeBuilder({ page }).analyze()`. Elle est donc un bon complément direct de Playwright et ne crée pas de service distant ni de coût par scan dans ce périmètre. Le package est distribué sous MPL-2.0.

Source : [README officiel `@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md).

Limites à respecter : axe analyse le contenu rendu ; une région cachée (menu inactif, modal non ouvert, états clavier) doit être rendue visible et testée séparément. Les éléments `incomplete` sont des candidats à revue humaine, pas des succès. La documentation signale qu’une page de plus de 50 000 éléments peut dépasser 10 secondes sur un CPU correct ; pour les pages normales du MVP, ce n’est pas une limite de volume mais cela renforce l’intérêt de limiter le scope et de conserver les résultats structurés.

**Position MVP** : lancer axe dans le même runner Playwright, bloquer sur une liste de violations déterminées, conserver les `incomplete` et compléter avec tests de parcours (clavier, menu, modal, formulaire) et validation humaine.

## 6. Coût minimal observable et formule de budget

### Socle sans runner cloud

Sous les quotas Free, le socle théorique peut être :

- Workers Free : 0 USD ; Workers Paid : 5 USD/mois minimum si les limites Paid sont nécessaires.
- Hono : 0 USD de service, package MIT.
- Workflows : inclus dans Workers ; surveiller les quotas Free et, depuis le 10 août 2026, steps/storage sur les seuils publiés.
- Queues : 0 USD sous 10 000 opérations/jour Free.
- R2 : 0 USD sous 10 GB-month, 1 M Class A et 10 M Class B Standard par mois.
- Turnstile : 0 USD sur Free, sous les limites de widgets.
- Neon : 0 USD sous les quotas Free d’un projet.
- Playwright/Lighthouse/axe : 0 USD de licence/service, hors machine/CI et stockage des rapports.

Ce n’est pas une garantie de facture nulle : le dépassement d’un quota, un plan Cloudflare requis pour un autre produit, le runner de rendu/QA, l’IA, les APIs externes et le réseau d’autres services peuvent créer des coûts.

### Formules à brancher sur le contrat commercial

Pour une première estimation déterministe, définir :

- `D` = demandes publiques/mois ;
- `W` = invocations Workflows/mois ;
- `S` = steps exécutés/mois, retries inclus ;
- `Q` = messages Queues de taille ≤ 64 KB, avec `r` reads supplémentaires de retry ;
- `R_A`, `R_B` = opérations R2 Class A/B ; `GB_R2` = GB-month Standard ;
- `GB_DB`, `CUh_DB` = storage et CU-hours Neon facturés ;
- `P` = pages/URLs auditées ; `n` = nombre de runs Lighthouse par URL ;
- `T` = minutes-heures de runner Node/Chrome, à tarifer chez le fournisseur de runner choisi.

Les coûts variables Cloudflare hors quotas peuvent alors être approchés par :

```text
Workers = 5 USD/mois si Paid
        + max(0, requêtes - 10 M) / 1 M × 0,30
        + max(0, CPU_ms - 30 M) / 1 M × 0,02

Workflows = max(0, W - 10 M) / 1 M × 0,30
          + max(0, CPU_ms - 30 M) / 1 M × 0,02
          + max(0, S - 500 000) / 100 000 × 0,80
          + max(0, GB-month - 1) × 0,20

Queues = max(0, opérations - 1 M) / 1 M × 0,40
opérations ≈ 3 × Q + reads de retry + opérations DLQ,
avec multiplication par ceil(taille / 64 KB)

R2 Standard = max(0, GB_R2 - 10) × 0,015
            + max(0, R_A - 1 M) / 1 M × 4,50
            + max(0, R_B - 10 M) / 1 M × 0,36

Neon Launch = CUh_DB × 0,106 + GB_DB × 0,35
             + historique de restauration/réseau selon usage du plan

QA = coût du runner pour T ;
     Lighthouse ≈ P × n exécutions, axe/Playwright dans ces exécutions.
```

La formule Queues doit être calculée sur les octets réellement sérialisés et les métadonnées ; la formule Workflows doit inclure les retries et les steps de compensation/rollback selon les règles de facturation publiées. Les unités `GB`/`GB-month` de Cloudflare et Neon ne sont pas à mélanger sans conversion explicite.

## 7. Décisions et questions à reporter dans l’architecture

### Décisions suffisamment étayées

1. **Workers + Hono** pour intake/API et control plane : fit élevé, faible coût, service public indépendant du Mac.
2. **Turnstile + validation serveur + idempotence/rate limiting** pour l’intake : Turnstile seul ne constitue pas une politique de dépense ni un anti-abus complet.
3. **Neon** pour l’état métier structuré et **R2** pour les blobs : ne pas mettre les artefacts lourds dans l’état Workflow.
4. **Workflows** comme orchestrateur durable, avec `waitForEvent` pour les validations humaines et des steps idempotents.
5. **Queues** comme frontière optionnelle vers un runner externe, avec DLQ et clés d’idempotence.
6. **Playwright + axe + Lighthouse** dans un runner Node dédié ; versionner le runner, les navigateurs, les configs et les rapports.

### Décisions encore bloquantes

- Quel runner cloud/CI fournit Node + navigateur lorsque le Mac est éteint, et quel est son tarif ? Les outils QA étudiés ne fournissent pas ce compute.
- Quel est le nombre maximal de pages, screenshots, traces et régénérations par démo ? Sans cela, le coût R2/runner ne peut pas être borné.
- Quel délai est acceptable pour le premier réveil Neon et pour la file de rendu/QA ?
- Quels seuils QA sont bloquants, et lesquels déclenchent seulement une revue humaine ?
- Quelle rétention des démos, rapports et données personnelles permet de contenir le storage et le risque ?
- Le pipeline a-t-il besoin à la fois de Workflows et Queues au premier vertical slice, ou Workflows peut-il appeler directement un runner HTTP idempotent ?

## Sources officielles consultées

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Cloudflare Workflows overview](https://developers.cloudflare.com/workflows/)
- [Cloudflare Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/)
- [Cloudflare Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/)
- [Cloudflare Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/)
- [Cloudflare Queues limits](https://developers.cloudflare.com/queues/platform/limits/)
- [Cloudflare Queues batching/retries](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Cloudflare Queues pull consumers](https://developers.cloudflare.com/queues/configuration/pull-consumers/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 limits](https://developers.cloudflare.com/r2/platform/limits/)
- [Cloudflare Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)
- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Hono Getting Started](https://hono.dev/docs/getting-started/basic)
- [Hono Adapter Helper](https://hono.dev/docs/helpers/adapter)
- [Hono package.json](https://github.com/honojs/hono/blob/main/package.json)
- [Neon pricing](https://neon.com/pricing)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Neon scale-to-zero](https://neon.com/docs/introduction/scale-to-zero)
- [Playwright browsers](https://playwright.dev/docs/browsers)
- [Playwright parallelism](https://playwright.dev/docs/test-parallel)
- [Playwright CI](https://playwright.dev/docs/ci)
- [Playwright package.json](https://github.com/microsoft/playwright/blob/main/package.json)
- [Lighthouse overview](https://developer.chrome.com/docs/lighthouse/)
- [Lighthouse README](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md)
- [Lighthouse throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Lighthouse CI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)
- [Lighthouse package.json](https://github.com/GoogleChrome/lighthouse/blob/main/package.json)
- [axe-core repository](https://github.com/dequelabs/axe-core)
- [axe-core API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
- [`@axe-core/playwright` README](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md)
