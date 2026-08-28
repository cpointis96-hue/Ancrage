# Recherche : OpenSEO, DataForSEO et qualité du rapport SEO local

Date : 2026-08-29
Périmètre : lecture du dépôt `every-app/open-seo` et comparaison avec le workflow local de `business-site-factory`.
Mode : recherche uniquement. Aucun code de production modifié et aucun appel DataForSEO effectué pendant cette recherche.

## Verdict

Le problème observé est réel et il est principalement local au pipeline actuel, pas une fatalité de DataForSEO.

Le workflow local fabrique actuellement trois seeds fixes : `restaurant {ville}`, `restaurant {ville} menu` et `restaurant {ville} delivery`. Il envoie ces seeds à la recherche d’idées, au volume/overview et aux concurrents, puis conserve les 25 premiers résultats contenant un mot-clé. Il ne vérifie pas que le terme correspond à la catégorie réelle, à l’offre du restaurant, à la zone desservie, à la langue, à l’intention ou à la SERP locale. Cette logique explique qu’un établissement à Teyran puisse recevoir des suggestions comme Lyon, Paris 13 ou « monde ».

OpenSEO apporte les bons principes pour corriger cela : commencer par le contexte métier, utiliser peu de seeds distincts mais justifiés, enrichir une liste connue avec des métriques, examiner les SERP locales et organiques, distinguer concurrents commerciaux et concurrents SEO, puis restituer une shortlist priorisée avec ses preuves. Il ne faut pas copier OpenSEO tel quel : il faut reprendre son protocole de recherche et certains patterns de restitution dans le contrat déterministe du projet.

## 1. État constaté dans le projet local

### Génération et filtrage actuels

Dans `src/audit/public-audit-workflow.mjs` :

- la recherche de mots-clés est construite à partir de trois expressions génériques, indépendamment du contenu du menu, des catégories observées, des spécialités, des quartiers ou de la zone de service ;
- les trois appels de la branche `competitor-keywords` utilisent le même ensemble de seeds ;
- `normalizeKeywords()` prend les 25 premiers items et projette seulement keyword, volume, compétition, CPC et intention ;
- aucun filtre de pertinence métier ou géographique n’est appliqué ;
- aucune déduplication, canonicalisation, classification d’intention, validation de localité ou vérification de SERP n’intervient avant l’affichage ;
- `normalizeCandidates()` accepte un candidat dès qu’un des tokens suffisamment longs du nom apparaît quelque part dans le résultat. Ce rapprochement est trop faible pour qualifier un concurrent ou un établissement.

Le résultat peut donc être « techniquement observé » par le provider tout en étant inutilisable pour le restaurant. Le défaut est la sélection et l’interprétation de la liste, pas nécessairement la donnée brute.

### Restitution actuelle

`src/audit/audit-report.mjs` rend les mots-clés et concurrents sous forme de listes HTML simples. Le rapport n’expose pas, pour chaque ligne :

- la source de découverte ;
- la localité demandée et la localité observée ;
- l’intention ;
- le motif de sélection ;
- la requête SERP qui a corroboré le résultat ;
- le type de concurrent ;
- l’URL ou la position observée ;
- la distinction entre métrique absente et métrique nulle.

La feuille de route existante impose pourtant déjà de ne pas inventer de faits, de conserver la partialité et la provenance, et de séparer les étapes métier des endpoints provider (`docs/spec/02-audit-gmb-seo-borné.md`, `docs/adr/0004-progressive-gmb-seo-report-delivery.md`). La future amélioration doit rester dans ces limites.

## 2. Ce qu’OpenSEO fait de pertinent

### Recherche de mots-clés : une shortlist, pas une liste brute

La skill `keyword-research` d’OpenSEO demande d’abord le contexte du projet, puis recommande de normaliser les seeds en angles distincts, de mélanger les intentions, de lancer une recherche groupée, d’hydrater une liste connue avec les métriques et de retirer les termes hors activité, dupliqués, uniquement brandés ou hors intention. Elle privilégie l’adéquation métier et l’intention avant le volume.

Source : [OpenSEO keyword-research skill](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/keyword-research/SKILL.md) et [documentation OpenSEO sur la recherche de mots-clés](https://github.com/every-app/open-seo/blob/main/web/content/docs/skills/keyword-research.mdx).

Son outil `research_keywords` accepte de 1 à 5 seeds par appel, avec marché/localité/langue par seed et un résultat groupé jusqu’à 150 lignes. Son outil `get_keyword_metrics` hydrate ensuite jusqu’à environ 700 mots-clés connus.

Sources : [`research-keywords.ts`](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/mcp/tools/research-keywords.ts) et [`keyword-metrics.ts`](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/lib/dataforseo/keyword-metrics.ts).

Point important pour le local : lorsqu’une localité est fournie, OpenSEO utilise le volume et le CPC Google Ads local, puis la difficulté et l’intention Labs au niveau pays. Il ne remplace pas silencieusement une métrique locale manquante par un volume national.

Son mode automatique tente les sources dans l’ordre `related → suggestions → ideas`, s’arrête lorsqu’il obtient suffisamment de résultats distincts et expose le diagnostic de fallback. La clé de cache inclut notamment le projet, les seeds, la localité, la langue, la limite, le mode et le clickstream. Ce sont des garde-fous de coût et de traçabilité ; ils ne remplacent pas la porte de pertinence métier.

Pour Google Ads, les champs que la source ne fournit pas restent explicitement inconnus, au lieu d’être complétés par une autre source sans le signaler. Cette discipline est importante pour notre rapport : `null` ou « non disponible » ne signifie jamais zéro.

Source : [OpenSEO keyword research service](https://github.com/every-app/open-seo/blob/main/src/server/features/keywords/services/research/research.ts) et [normalisation des données de recherche](https://github.com/every-app/open-seo/blob/main/src/server/features/keywords/services/research/research-data.ts).

### Local SEO : coordonnées et identifiant avant le nom seul

Les outils locaux d’OpenSEO acceptent des coordonnées et un rayon borné. Pour identifier l’établissement, ils privilégient exactement un `placeId` ou un `cid`, avec le nom en solution de repli. Les lignes provider sont ensuite projetées vers un petit contrat de champs utiles au lieu de restituer les payloads volumineux.

Sources : [`local-seo-shared.ts`](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/mcp/tools/local-seo-shared.ts) et [`local-seo-tools.ts`](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/mcp/tools/local-seo-tools.ts).

OpenSEO sépare aussi trois opérations qui ne doivent pas être confondues :

1. découvrir des entreprises locales autour des coordonnées ;
2. observer une SERP locale pour une requête précise ;
3. mesurer le rang local d’un établissement connu sur une grille de points.

La grille locale commence par des points autour d’un centre et privilégie la correspondance exacte par `cid` ou `placeId`. Cette séparation est directement utile pour éviter de qualifier comme « concurrent » n’importe quel domaine renvoyé par une recherche nationale.

### Concurrence : paysage, preuve et typologie

La skill `competitive-landscape` demande un petit jeu de 5 à 10 requêtes représentatives avec intentions mixtes. Pour le local, elle recommande d’appeler d’abord les sources Maps/locales autour des coordonnées, puis de compléter avec les SERP organiques. Elle distingue les entreprises concurrentes, les éditeurs, annuaires, marketplaces, communautés et sites de contenu.

La skill `competitor-analysis` ajoute une vérification du domaine, des mots-clés réellement classés, des pages et des backlinks. Elle avertit explicitement qu’un mot-clé classé par un concurrent n’est pas automatiquement une bonne cible pour l’entreprise auditée.

Sources : [OpenSEO competitive-landscape skill](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/competitive-landscape/SKILL.md) et [OpenSEO competitor-analysis skill](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/competitor-analysis/SKILL.md).

Dans le code, `find_serp_competitors` prévoit des filtres comme `minSearchVolume`, `maxRank`, `excludeBrandTerms`, `resultTypes`, ainsi qu’une localité et une langue. `get_ranked_keywords` permet également de limiter la position, le volume, les marques et les types de résultats.

Source : [`dataforseo-research-tools.ts`](https://github.com/every-app/open-seo/blob/main/src/server/mcp/tools/dataforseo-research-tools.ts).

### Client DataForSEO : séparation des capacités et du coût

OpenSEO regroupe les capacités DataForSEO derrière un client central, charge les modules à la demande et entoure les appels d’un mécanisme de mesure/attribution. Le code sépare notamment recherche de mots-clés, métriques, SERP organique, SERP locale, Business Listings, Labs, domaine et backlinks.

Source : [`client.ts`](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/lib/dataforseo/client.ts).

Le pattern intéressant pour le projet est la séparation des étapes de données et la conservation d’un coût par capacité. Il ne justifie pas d’augmenter aveuglément le nombre de requêtes : chaque appel doit rester dans l’enveloppe autorisée et être arrêté avant tout dépassement.

### Rapport : hiérarchie, états honnêtes et exploration

Pour l’audit de site, l’interface OpenSEO combine :

- un bandeau de statistiques synthétiques ;
- des onglets distincts pour problèmes, pages et performance ;
- un avertissement explicite quand le crawl est bloqué ou partiel ;
- des tableaux triables et filtrables ;
- des exports structurés CSV, JSON et Sheets ;
- une table de problèmes avec sévérité, URL, détail et correction ;
- une table de pages avec statut, title, H1, volume de mots, images, alt manquants et temps de réponse.

Sources : [`ResultsView.tsx`](https://raw.githubusercontent.com/every-app/open-seo/main/src/client/features/audit/results/ResultsView.tsx), [`ResultsTables.tsx`](https://raw.githubusercontent.com/every-app/open-seo/main/src/client/features/audit/results/ResultsTables.tsx), [`PagesTable.tsx`](https://raw.githubusercontent.com/every-app/open-seo/main/src/client/features/audit/results/PagesTable.tsx) et [`export.ts`](https://github.com/every-app/open-seo/blob/main/src/client/features/audit/results/export.ts).

Ce sont des patterns de mise en page et d’exploration, pas une preuve qu’OpenSEO produit toujours un audit éditorial complet. Le dépôt contient aussi une note de recherche plus ancienne qui décrit un crawler et Lighthouse sans moteur d’issues complet à cette date ; il faut donc distinguer la proposition produit historique du code actuel.

Source : [OpenSEO site-audit PM research](https://raw.githubusercontent.com/every-app/open-seo/main/docs/site-audit-pm-research.md).

## 3. Pipeline recommandé pour le projet

Le prochain chantier devrait être une amélioration déterministe de la qualification, avant toute ambition IA.

### Étape A — verrouiller le contexte observé

Construire un contexte versionné à partir des faits déjà confirmés :

- établissement exact, `placeId`/coordonnées si disponibles ;
- ville et pays structurés ;
- catégories Google observées ;
- nom, adresse, site confirmé et langue ;
- services, spécialités et entités réellement présentes sur le site/menu ;
- zone de service explicitement déclarée, si elle existe.

Une donnée absente reste `UNKNOWN`. Elle ne doit pas être remplacée par une catégorie ou une spécialité supposée.

### Étape B — produire une matrice de seeds justifiés

Limiter chaque recherche à 1–5 seeds réellement distincts, mais les choisir dans des angles observés :

- catégorie principale + Teyran ;
- spécialité ou plat effectivement observé + Teyran ;
- service ou occasion effectivement observé + Teyran ;
- quartier ou commune voisine uniquement si le périmètre est déclaré ou si la requête locale le justifie ;
- marque séparée des requêtes génériques.

Il faut supprimer les seeds génériques comme `restaurant Teyran menu` lorsqu’ils ne représentent aucune proposition de valeur supplémentaire. « Menu » peut rester une intention de page, mais ne doit pas devenir automatiquement le meilleur axe métier.

### Étape C — rechercher puis hydrater

Faire une recherche d’idées groupée avec les seeds qualifiés, puis dédupliquer et canonicaliser les résultats. Hydrater ensuite uniquement la liste réduite avec les métriques.

Pour chaque métrique, enregistrer sa portée : localité, pays, source, date et état. Une absence de volume local doit rester visible comme inconnue ; elle ne doit pas devenir un volume national présenté comme local.

### Étape D — appliquer une porte de pertinence

Avant l’affichage, chaque terme doit passer des règles explicables :

1. adéquation avec l’offre ou la catégorie observée ;
2. adéquation avec Teyran ou la zone explicitement servie ;
3. intention utile : découverte, visite, réservation, menu, livraison ou information selon les capacités réelles ;
4. exclusion des villes hors périmètre, des termes sans rapport et des termes brandés concurrents ;
5. déduplication et regroupement par thème ;
6. confirmation par SERP pour les termes ambigus ou prioritaires.

Le rapport devrait pouvoir expliquer « retenu parce que… » et « exclu parce que… » dans la donnée interne. Les exclusions ne doivent pas être transformées en recommandations.

Un score de priorité peut exister en interne, mais il doit être calculé à partir de composantes affichables ou auditables — adéquation métier, proximité, intention, métriques connues, difficulté et preuve SERP — et ne doit pas masquer une absence de données.

### Étape E — observer la concurrence locale puis organique

Pour un petit ensemble de requêtes prioritaires :

1. observer la SERP locale autour des coordonnées ;
2. comparer par `placeId`/`cid` quand l’établissement est connu ;
3. utiliser une grille locale limitée pour mesurer la visibilité géographique, si le budget le permet ;
4. observer séparément la SERP organique ;
5. réconcilier les résultats récurrents ;
6. classer les domaines en concurrent direct, annuaire, média, marketplace, communauté ou éditeur ;
7. inspecter seulement les 3–5 domaines réellement récurrents et pertinents.

Un domaine n’est donc pas un concurrent commercial parce qu’il apparaît une fois. Il devient une piste corroborée lorsqu’il réapparaît sur des requêtes pertinentes et que son activité/localité sont vérifiables.

### Étape F — rapporter les résultats comme des décisions

La section mots-clés devrait être un tableau de shortlist :

| Mot-clé | Intention | Localité | Source | Volume/CPC | Difficulté | Priorité | Pourquoi |
| --- | --- | --- | --- | --- | --- | --- | --- |

La section concurrence devrait distinguer :

| Domaine/établissement | Type | Requêtes observées | Position/URL | Pourquoi retenu | Angle à étudier |
| --- | --- | --- | --- | --- | --- |

Une métrique indisponible doit apparaître comme non disponible, jamais comme zéro. Les résultats non corroborés, les hypothèses et les recommandations doivent rester séparés des faits observés.

## 4. Template de rapport à reprendre

La meilleure direction visuelle n’est pas une longue liste décorée. C’est une page de décision compacte :

1. en tête : établissement, zone, date, état du rapport et périmètre ;
2. synthèse : meilleure opportunité observée, principal blocage, prochaine décision ;
3. mots-clés : shortlist filtrable, regroupée par intention et thème ;
4. local : requêtes, coordonnées, résultat Maps/local, position de l’établissement quand mesurable ;
5. concurrence : domaines classés par type, preuves et requêtes récurrentes ;
6. site : findings triés par sévérité, pages affectées et correction ;
7. limites : branches non exécutées, données absentes, coût et refus ;
8. export : CSV/JSON pour les données, PDF/HTML pour la lecture.

Les patterns OpenSEO à réutiliser sont donc les stats synthétiques, les onglets par objet, les tableaux explorables, les exports et les callouts d’état. Le projet doit conserver son contrat de provenance et ne pas exposer les payloads bruts ni les identifiants techniques inutiles au prospect.

## 5. Limites et décisions à ne pas prendre maintenant

- Une recherche plus large n’améliore pas mécaniquement la pertinence. Elle augmente surtout le besoin de filtrage et le coût.
- Les outils OpenSEO actuels évoluent ; les notes de PM historiques ne sont pas toutes des garanties du code de `main`.
- Les métriques locales et nationales ne sont pas interchangeables.
- Les SERP Maps et organiques répondent à des questions différentes.
- Un classement concurrentiel n’est pas une preuve de concurrence commerciale.
- Une IA pourrait aider à regrouper ou rédiger, mais elle ne doit ni choisir silencieusement une ville, ni inventer une catégorie, ni convertir une hypothèse en observation.
- Le rapport actuel contient également un rendu PDF minimal ; le rendre plus beau devra rester un chantier séparé de la pertinence des données.

## 6. Proposition de suite, non implémentée

Créer un ticket de conception puis une tranche testée portant uniquement sur :

1. le contexte métier/local et les seeds observés ;
2. la normalisation, le filtrage et le clustering déterministes ;
3. la séparation Maps/local, SERP organique et concurrence ;
4. les contrats de métriques locales et nationales ;
5. le nouveau template de rapport et ses états `SUCCEEDED`/`PARTIAL`/`BLOCKED`.

Cette tranche devra être testée d’abord avec des réponses provider figées, puis avec un run live borné et explicitement budgété. Elle ne doit pas lancer de nouvelles requêtes payantes avant que les seeds et les gates de pertinence soient validés.

## Sources principales

- [OpenSEO README](https://github.com/every-app/open-seo)
- [Configuration DataForSEO d’OpenSEO](https://raw.githubusercontent.com/every-app/open-seo/main/docs/DATAFORSEO_API_KEY.md)
- [MCP et outils OpenSEO](https://github.com/every-app/open-seo/blob/main/web/content/docs/mcp.md)
- [OpenSEO keyword research](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/keyword-research/SKILL.md)
- [OpenSEO competitive landscape](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/competitive-landscape/SKILL.md)
- [OpenSEO competitor analysis](https://raw.githubusercontent.com/every-app/open-seo/main/.agents/skills/competitor-analysis/SKILL.md)
- [OpenSEO research keywords tool](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/mcp/tools/research-keywords.ts)
- [OpenSEO local SEO tools](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/mcp/tools/local-seo-tools.ts)
- [OpenSEO keyword metrics](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/lib/dataforseo/keyword-metrics.ts)
- [OpenSEO DataForSEO client](https://raw.githubusercontent.com/every-app/open-seo/main/src/server/lib/dataforseo/client.ts)
- [OpenSEO audit results UI](https://raw.githubusercontent.com/every-app/open-seo/main/src/client/features/audit/results/ResultsView.tsx)
- [OpenSEO audit export](https://github.com/every-app/open-seo/blob/main/src/client/features/audit/results/export.ts)
