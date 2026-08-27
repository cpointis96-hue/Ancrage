# DataForSEO — endpoints, prix, limites et provenance

**État documentaire : 27 août 2026 — Asia/Bangkok**
**Périmètre :** vérifier DataForSEO comme provider prioritaire pour Website Factory : Google SERP, Google Maps/local pack, Business Listings, mots-clés, concurrence, intersections de domaines et OnPage.
**Source policy :** uniquement documentation, pages de prix, aide et conditions officielles DataForSEO.
**Compte réel :** aucun compte créé, aucune clé créée ou copiée, aucun appel API exécuté, aucune dépense engagée.

## Légende de preuve

- **MESURÉ** : observation réalisée pendant cette recherche, sans compte DataForSEO ni appel API payant.
- **DOCUMENTÉ** : fait déclaré par une source officielle DataForSEO, avec lien direct.
- **NON OBSERVABLE** : la source publique ne permet pas de conclure, ou le fait dépend d’un compte non consulté.
- **À TESTER** : vérification à faire ultérieurement dans le Sandbox ou un compte de test explicitement autorisé ; elle n’a pas été faite ici.

## 1. Résultat de cadrage

**DOCUMENTÉ** — DataForSEO expose bien les familles nécessaires sous des APIs distinctes. Les appels sont pay-as-you-go ; les endpoints de données publiques restent soumis à une localisation, une langue, une profondeur/limite et un mode de restitution précis.

**DÉDUCTION** — DataForSEO est un provider prioritaire techniquement plausible pour l’audit public Website Factory, mais il ne peut pas encore être déclaré activé commercialement. Les gates bloquants sont :

1. vérifier dans un compte autorisé les tarifs effectivement appliqués et les limites remontées par les en-têtes/rates ;
2. vérifier la présence des marchés cibles et des langues dans les listes de locations ;
3. obtenir une interprétation écrite des droits de conservation, de réutilisation et de redistribution des résultats Google/Maps dans un rapport client ;
4. tester les délais, erreurs, remboursements et coûts réels sur des requêtes Sandbox puis, si autorisé, sur un compte de test ;
5. maintenir le credential côté serveur et séparer chaque appel d’un `CostEvent` Website Factory.

## 2. MESURÉ pendant cette recherche

- **MESURÉ** — date de vérification : 2026-08-27 ; fuseau de travail : Asia/Bangkok.
- **MESURÉ** — appels API DataForSEO : `0`.
- **MESURÉ** — compte DataForSEO créé ou ouvert : `0`.
- **MESURÉ** — clé/credential créé, lu ou copié : `0`.
- **MESURÉ** — paiement, dépôt, auto-recharge ou ressource distante créée : `0`.
- **MESURÉ** — le fichier cible n’existait pas dans l’état local visible ; ce fichier est créé à l’emplacement demandé uniquement.
- **NON OBSERVABLE** — solde, limites propres au compte, prix négociés, permissions effectives, statut d’abonnement et disponibilité runtime ne sont pas connus.

## 3. Endpoints officiels utiles

Les URLs ci-dessous sont les chemins API officiels documentés par DataForSEO. Les appels réels doivent utiliser la base `https://api.dataforseo.com/` et non un credential côté navigateur.

| Capacité Website Factory | Endpoint API nécessaire | Ce que le résultat permet de documenter | Statut |
|---|---|---|---|
| Google SERP organique | `POST /v3/serp/google/organic/task_post` puis `GET /v3/serp/google/organic/tasks_ready` et `GET /v3/serp/google/organic/task_get/{function}/{id}` ; alternative `POST /v3/serp/google/organic/live/advanced` | Résultats Google localisés par mot-clé, langue, location, device et profondeur ; l’Advanced expose les éléments SERP, dont `local_pack` lorsqu’il est présent. [Task POST](https://docs.dataforseo.com/v3/serp/google/organic/task_post/) · [SERP overview](https://docs.dataforseo.com/v3/serp-overview/) · [Live Advanced](https://docs.dataforseo.com/v3/serp-se-type-live-advanced/) | DOCUMENTÉ |
| Google Maps | `POST /v3/serp/google/maps/task_post` puis récupération Standard, ou `POST /v3/serp/google/maps/live/advanced` | Jusqu’à 100 résultats Maps desktop par SERP selon la profondeur ; `search_this_area` doit rester activé pour une recherche géographique dans la zone affichée. [Task POST](https://docs.dataforseo.com/v3/serp/google/maps/task_post/) · [Live Maps Advanced](https://docs.dataforseo.com/v3/serp-maps-live-advanced/) | DOCUMENTÉ |
| Google local pack / Local Finder | `POST /v3/serp/google/organic/live/advanced` avec l’élément `local_pack`, ou `POST /v3/serp/google/local_finder/live/advanced` pour le Local Finder | Observation d’un pack local ou de résultats Local Finder ; ne pas confondre ces résultats avec une fiche propriétaire Google Business Profile. [SERP Advanced](https://docs.dataforseo.com/v3/serp-se-type-live-advanced/) · [Local Finder](https://docs.dataforseo.com/v3/serp-google-local_finder-live-advanced/) | DOCUMENTÉ |
| Business Listings — recherche | `POST /v3/business_data/business_listings/search/live` | Recherche de listings issus de la base Business Listings DataForSEO, avec adresse, contacts, rating, horaires et autres champs selon le résultat. [Search Live](https://docs.dataforseo.com/v3/business_data-business_listings-search-live/) · [Overview](https://docs.dataforseo.com/v3/business_data-business_listings-overview/) | DOCUMENTÉ |
| Business Listings — catégories | `POST /v3/business_data/business_listings/categories_aggregation/live` | Agrégation des catégories et nombres d’entités pour une location. [Overview](https://docs.dataforseo.com/v3/business_data-business_listings-overview/) | DOCUMENTÉ |
| Mots-clés — idées | `POST /v3/dataforseo_labs/google/keyword_ideas/live` | Idées liées à des mots-clés graines, volume mensuel, tendance sur 12 mois, CPC, compétition et métriques associées. [Keyword Ideas](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/) | DOCUMENTÉ |
| Mots-clés — aperçu ponctuel | `POST /v3/dataforseo_labs/google/keyword_overview/live` | Volume, CPC, compétition payante, intention, recherches mensuelles et informations SERP/backlinks pour des mots-clés spécifiés. [Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/) | DOCUMENTÉ |
| Concurrence par mots-clés | `POST /v3/dataforseo_labs/google/serp_competitors/live` | Domaines qui se positionnent sur les mots-clés fournis, positions, rating, trafic estimé et visibilité DataForSEO. [SERP Competitors](https://docs.dataforseo.com/v3/dataforseo_labs/google/serp_competitors/live/) | DOCUMENTÉ |
| Concurrence par domaine | `POST /v3/dataforseo_labs/google/competitors_domain/live` | Domaines concurrents et données de rankings/traffic basées sur l’index DataForSEO ; vérifier le chemin exact dans la spécification actuelle avant intégration. [Google Labs overview](https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/) · [Competitor Research](https://dataforseo.com/apis/dataforseo-labs-api/competitor-research) | DOCUMENTÉ / À TESTER |
| Intersection de domaines | `POST /v3/dataforseo_labs/google/domain_intersection/live` | Mots-clés pour lesquels deux domaines apparaissent dans la même SERP, avec métriques de mot-clé et éléments SERP ; `item_types` accepte notamment `organic`, `paid`, `featured_snippet` et `local_pack`. [Domain Intersection](https://docs.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live/) | DOCUMENTÉ |
| OnPage — crawl | `POST /v3/on_page/task_post`, puis récupération via `tasks_ready`/endpoints de résultat, notamment `summary`, `pages`, `links`, `non_indexable`, `redirect_chains`, `waterfall` et éventuellement `raw_html` | Crawl configurable avec plus de 60 contrôles on-page, liens, HTML, doublons, réponses et données de performance. [OnPage overview](https://docs.dataforseo.com/v3/on_page-overview/) · [Task POST](https://docs.dataforseo.com/v3/on_page/task_post/) | DOCUMENTÉ |
| OnPage — page unique | `POST /v3/on_page/instant_pages` | Contrôle immédiat d’une page ; utile pour un aperçu borné sans lancer un crawl complet. [OnPage overview](https://docs.dataforseo.com/v3/on_page-overview/) | DOCUMENTÉ |

### 3.1 Limite d’interprétation

**DOCUMENTÉ** — un résultat DataForSEO est une observation située dans une location, une langue, un device, un instant et un index. Il ne prouve ni l’exhaustivité du marché, ni la propriété d’une fiche, ni une position stable, ni l’existence d’un concurrent commercial au sens juridique.

**DÉDUCTION** — Website Factory doit conserver `source`, endpoint, paramètres non secrets, `observedAt`, `last_updated_time` si fourni, identifiant de tâche, coût, version de règle et limites ; la synthèse doit rester `CompetitorCandidate`/observation jusqu’à corroboration par le site officiel et une date d’observation.

## 4. Tarifs publics, minimums et délais

Les prix ci-dessous sont les prix publics affichés au 27 août 2026 dans les pages officielles consultées. Ils ne sont pas des mesures de compte réel.

### 4.1 Minimum global et modèle de paiement

- **DOCUMENTÉ** — modèle pay-as-you-go : le client paie les services consommés ; la page de prix indique un **minimum de paiement de 50 USD**. Les fonds déposés restent sur le solde jusqu’à consommation selon l’aide officielle. [Pricing](https://dataforseo.com/pricing) · [Minimum payment](https://dataforseo.com/help-center/minimum-payment) · [Dashboard/billing](https://dataforseo.com/help-center/dfs-dashboard-how-to-find-everything)
- **DOCUMENTÉ** — la page SERP annonce un essai avec 1 USD crédité après inscription et aucun abonnement mensuel pour cette API. Cela ne constitue pas une autorisation de créer un compte dans cette recherche. [SERP pricing](https://dataforseo.com/apis/serp-api/pricing)
- **DOCUMENTÉ** — les limites de dépense journalière peuvent être fixées globalement ou par API/endpoint ; au dépassement, les nouvelles tâches renvoient `40203` jusqu’à la prochaine fenêtre UTC de 24 heures. [Payment limits](https://dataforseo.com/help-center/limit-my-payments) · [Errors](https://docs.dataforseo.com/v3/appendix/errors/)
- **NON OBSERVABLE** — minimum négocié, solde, budget de compte, prix personnalisés, auto-recharge et droits du compte Website Factory.

### 4.2 Grille publique par capacité

| Famille / mode | Prix public | Délai public annoncé | Unité de facturation / limites principales | Statut |
|---|---:|---|---|---|
| Google Organic SERP — Standard normal | `0,0006 USD` par SERP de base de 10 résultats | 5 min en moyenne ; cible publique de 45 min, avec traitement prolongé possible | `depth` par défaut 10, maximum 700 ; au-delà de 10 résultats, coûts additionnels possibles | DOCUMENTÉ |
| Google Organic SERP — Standard high | `0,0012 USD` par SERP de base de 10 résultats | jusqu’à 1 min en moyenne | même unité et limites ; la priorité high majore le coût | DOCUMENTÉ |
| Google Organic SERP — Live | `0,002 USD` par SERP de base de 10 résultats | jusqu’à 6 s en moyenne | un seul task par appel Live ; paramètres payants possibles | DOCUMENTÉ |
| Google Maps SERP — Standard normal | `0,0006 USD` par page de 100 résultats | 5 min en moyenne ; traitement prolongé possible | `depth` par défaut 100, maximum 700 ; facturation par tranche de 100 résultats | DOCUMENTÉ |
| Google Maps SERP — Standard high | `0,0012 USD` par page de 100 résultats | jusqu’à 1 min en moyenne | même unité et limites | DOCUMENTÉ |
| Google Maps SERP — Live | `0,002 USD` par page de 100 résultats | jusqu’à 6 s en moyenne | desktop : jusqu’à 100 résultats ; mobile : 20 résultats par SERP selon la documentation de l’endpoint | DOCUMENTÉ |
| Business Listings Search / Categories Aggregation — Live | `0,012 USD` par task + `0,00036 USD` par item | jusqu’à 2 s en moyenne | maximum 1 000 items retournés par task ; exemple public : 1 M items = 372 USD en exécutant 1 000 tasks | DOCUMENTÉ |
| DataForSEO Labs Google — Keyword Ideas, SERP Competitors, Domain Intersection et autres endpoints ordinaires | `0,012 USD` par task + `0,00012 USD` par item | jusqu’à 2 s en moyenne | la page tarifaire regroupe ces endpoints sous “all other endpoints” ; maximum usuel de sortie : 1 000 items selon l’endpoint | DOCUMENTÉ |
| OnPage — basic | `0,00015 USD` par page effectivement crawlée, soit `0,15 USD` par 1 000 pages | aucun délai chiffré public retenu pour le crawl complet | plus de 60 contrôles, HTML, liens internes, doublons, page-speed insights, non-indexable et `custom_js` | DOCUMENTÉ |
| OnPage — `load_resources` | `0,00045 USD` par page | non chiffré publiquement | images, CSS, scripts, éléments cassés et pages par ressource ; surcharge par page | DOCUMENTÉ |
| OnPage — `enable_javascript` | `0,0015 USD` par page | non chiffré publiquement | surcharge par page | DOCUMENTÉ |
| OnPage — `enable_browser_rendering` | `0,0051 USD` par page | non chiffré publiquement | inclut les coûts `load_resources` et `enable_javascript`, mesure les Core Web Vitals | DOCUMENTÉ |
| OnPage — `calculate_keyword_density` | `0,0003 USD` par page | non chiffré publiquement | surcharge par page | DOCUMENTÉ |
| OnPage — Instant Pages / Content Parsing | `0,00015 USD` par page selon la page de prix OnPage | réponse Live ; durée réelle non mesurée | page unique, sans crawl complet | DOCUMENTÉ / À TESTER |
| OnPage — Page Screenshot | `0,0048 USD` par page selon la page de prix OnPage | réponse Live ; durée réelle non mesurée | URL de screenshot DataForSEO accessible un jour après l’appel selon l’aide | DOCUMENTÉ |

Sources tarifaires directes : [SERP pricing](https://dataforseo.com/apis/serp-api/pricing), [Google Maps SERP pricing](https://dataforseo.com/pricing/google-serp/google-maps-serp-api), [Business Listings pricing](https://dataforseo.com/pricing/business-data/business-listings-api), [DataForSEO Labs Google pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api), [OnPage pricing](https://dataforseo.com/help-center/cost-of-onpage-api-parameters), [OnPage API](https://dataforseo.com/apis/on-page-api).

### 4.3 Provenance des prix et conflits de pages

- **DOCUMENTÉ** — DataForSEO a annoncé une révision tarifaire au **1er juillet 2026** : +20 % pour tous les endpoints DataForSEO Labs, +20 % pour Business Listings Search et Categories Aggregation, et +20 % pour la plupart des endpoints OnPage. [Pricing update — 1 July 2026](https://dataforseo.com/update/pricing-update-in-dataforseo-apis)
- **DOCUMENTÉ** — une ancienne page de présentation Business Listings affiche encore `0,01 USD` par task + `0,0003 USD` par ligne, tandis que la page de prix courante affiche `0,012 USD` + `0,00036 USD` après la révision. [Ancienne présentation](https://dataforseo.com/apis/business-data-api/business-listings-api) · [Page de prix courante](https://dataforseo.com/pricing/business-data/business-listings-api)
- **DOCUMENTÉ** — une page de présentation OnPage peut annoncer un prix “starting at 0,000125 USD”, alors que la page tarifaire détaillée actuelle chiffre le basic à `0,00015 USD` par page. [Présentation OnPage](https://dataforseo.com/apis/on-page-api) · [Coût détaillé OnPage](https://dataforseo.com/help-center/cost-of-onpage-api-parameters)
- **DÉDUCTION** — le registre fournisseur doit conserver l’URL de la grille utilisée, sa date de consultation et la règle de priorité entre une page de marketing ancienne et une page tarifaire détaillée postérieure à la mise à jour. Pour un `CostEvent`, prendre le coût retourné par la réponse de tâche comme fait de facturation, sous réserve d’un compte réel.
- **NON OBSERVABLE** — le montant réellement appliqué par un compte particulier et toute remise de volume.

## 5. Limites de requête et de payload

### 5.1 Limites communes

- **DOCUMENTÉ** — limite générale : jusqu’à **2 000 requêtes par minute** ; une augmentation doit être négociée avec le support. Les en-têtes `X-RateLimit-Limit` et `X-RateLimit-Remaining` exposent la limite et le restant par endpoint. [Rate/request limits](https://dataforseo.com/help-center/rate-limits-and-request-limits) · [API overview](https://docs.dataforseo.com/v3/)
- **DOCUMENTÉ** — les endpoints basés sur les bases de données, dont DataForSEO Labs et OnPage, sont limités à **30 requêtes simultanées**. Le nombre effectif de requêtes/minute dépend du temps de réponse.
- **DOCUMENTÉ** — les endpoints Live DataForSEO Labs acceptent un seul task par appel ; SERP Standard et OnPage `task_post` acceptent jusqu’à 100 tasks par POST, mais le dépassement renvoie `40006`. Les endpoints Live n’acceptent pas tous plusieurs tasks.
- **DOCUMENTÉ** — les endpoints `tasks_ready` sont limités à 20 appels/minute ; les callbacks peuvent éviter un polling excessif.
- **À TESTER** — comportement exact des en-têtes, `429`/`40203`, concurrence et ordre de remboursement dans un compte de test ; aucune simulation réelle n’a été exécutée.

### 5.2 Google SERP / Maps

- **DOCUMENTÉ** — `keyword` accepte jusqu’à 700 caractères ; les opérateurs Google tels que `site:` ou `intitle:` peuvent multiplier le coût par 5 chacun.
- **DOCUMENTÉ** — Google Organic : `depth` par défaut 10, maximum 700 ; Google Maps : `depth` par défaut 100, maximum 700.
- **DOCUMENTÉ** — Google Maps accepte `location_code`, `location_name` ou `location_coordinate` au format latitude, longitude, zoom ; latitude/longitude ont au plus 7 décimales, zoom de 3z à 21z.
- **DOCUMENTÉ** — `search_this_area` vaut `true` par défaut ; le désactiver peut faire remonter des listings hors zone affichée. Pour une preuve locale, le laisser activé et conserver les paramètres géographiques.
- **DOCUMENTÉ** — Google Maps desktop et mobile ne sont pas équivalents : la documentation indique jusqu’à 100 résultats Maps et seulement 20 résultats pour un device mobile dans cette famille d’endpoint.
- **DOCUMENTÉ** — les positions dépendent des paramètres indiqués ; DataForSEO ignore les préférences et l’historique de recherche personnalisés. [Maps overview](https://docs.dataforseo.com/v3/serp-google-maps-overview/) · [Maps Task POST](https://docs.dataforseo.com/v3/serp/google/maps/task_post/) · [Maps Live Advanced](https://docs.dataforseo.com/v3/serp-maps-live-advanced/)
- **À TESTER** — cohérence entre Google Organic `local_pack`, Local Finder et Maps pour une même location ; la documentation ne promet pas une équivalence de résultat.

### 5.3 Business Listings

- **DOCUMENTÉ** — `categories` accepte jusqu’à 10 catégories ; `title` et `description` jusqu’à 200 caractères chacun.
- **DOCUMENTÉ** — `location_coordinate` utilise un rayon en kilomètres, minimum 1 et maximum 100 000 ; une recherche peut être bornée par filtres.
- **DOCUMENTÉ** — jusqu’à 8 filtres par requête et jusqu’à 3 règles de tri ; `limit` vaut 100 par défaut et 1 000 au maximum.
- **DOCUMENTÉ** — `offset` est recommandé jusqu’à 10 000 résultats ; au-delà, utiliser `offset_token`. La documentation recommande ce token pour éviter les timeouts lors de volumes très importants.
- **DOCUMENTÉ** — Business Listings ne propose que le mode Live et facture le task ainsi que les items ; il s’agit de la base Business Listings DataForSEO, pas d’un accès propriétaire à une fiche Google Business Profile. [Overview](https://docs.dataforseo.com/v3/business_data-business_listings-overview/) · [Search Live](https://docs.dataforseo.com/v3/business_data-business_listings-search-live/) · [Filters](https://docs.dataforseo.com/v3/business_data/business_listings/filters/)
- **À TESTER** — couverture et qualité de chaque catégorie de restaurant dans les marchés cibles ; la liste de catégories n’est pas une preuve de présence locale.

### 5.4 Mots-clés, concurrence et intersections

- **DOCUMENTÉ** — `Keyword Ideas` accepte au maximum 200 mots-clés graines ; `limit` vaut 700 par défaut et 1 000 au maximum.
- **DOCUMENTÉ** — `SERP Competitors` accepte au maximum 200 mots-clés ; `limit` vaut 100 par défaut et 1 000 au maximum ; `item_types` peut inclure `organic`, `paid`, `featured_snippet` et `local_pack`.
- **DOCUMENTÉ** — `Domain Intersection` exige `target1`, `target2`, une location et une langue ; `limit` vaut 100 par défaut et 1 000 au maximum ; la requête ne renvoie pas de résultats si le nombre d’intersections dépasse 10 millions.
- **DOCUMENTÉ** — `Domain Intersection` peut inclure le clickstream ; ce paramètre double le prix. Les données de cet endpoint sont annoncées comme mises à jour chaque semaine, avec l’heure de mise à jour disponible via l’endpoint Status.
- **DOCUMENTÉ** — les métriques de volume, CPC, compétition, ETV, visibilité et difficulté sont des métriques DataForSEO/Google Ads/SERP selon le champ ; elles ne sont pas des mesures Website Factory.
- **À TESTER** — pagination complète, stabilité des `offset_token`, présence d’un domaine local dans l’index et comparabilité des métriques entre marchés.

### 5.5 OnPage

- **DOCUMENTÉ** — `target` et `max_crawl_pages` sont requis ; `max_crawl_pages` borne le nombre de pages et la facturation porte sur le nombre effectivement crawlé. Si le site contient moins de pages que la limite, la différence est remboursée après fin de tâche.
- **DOCUMENTÉ** — `crawl_delay` vaut 2 000 ms par défaut ; `priority_urls` accepte jusqu’à 20 URLs appartenant au domaine cible.
- **DOCUMENTÉ** — `store_raw_html` est désactivé par défaut ; `enable_javascript`, `load_resources`, `enable_browser_rendering` et `calculate_keyword_density` entraînent des coûts additionnels.
- **DOCUMENTÉ** — la documentation permet un `custom_robots_txt` et un mode `override` qui ignore les restrictions du site. **DÉDUCTION / gate produit :** Website Factory doit conserver le mode `merge` par défaut et interdire `override` au workflow commercial sauf décision humaine documentée.
- **DOCUMENTÉ** — les IP de crawler DataForSEO et le User-Agent par défaut `Mozilla/5.0 (compatible; RSiteAuditor)` sont publiés dans l’overview ; le User-Agent peut être personnalisé.
- **NON OBSERVABLE** — garantie de délai pour un crawl complet, taux de succès sur les sites de Website Factory, comportement face aux protections, et adéquation avec les règles de crawl de chaque site.
- **À TESTER** — crawl borné sur un site autorisé, redirections, robots, sitemap, JavaScript, limites SSRF côté Website Factory et suppression des exports bruts.

## 6. Marchés, locations et langues

- **DOCUMENTÉ** — les endpoints de location et de langue sont gratuits et exposent des identifiants utilisables par les tasks : [Google SERP locations](https://docs.dataforseo.com/v3/serp/google/locations/) · [Business Listings locations](https://docs.dataforseo.com/v3/business_data/business_listings/locations/) · [locations/languages DataForSEO Labs](https://docs.dataforseo.com/v3/dataforseo_labs/locations_and_languages/).
- **DOCUMENTÉ** — DataForSEO publie des CSV de locations supportées ; les pages consultées indiquent une dernière mise à jour au **6 août 2026**. [Google locations CSV](https://cdn.dataforseo.com/v3/locations/locations_serp_google_2026_08_06.csv) · [Business Listings locations CSV](https://cdn.dataforseo.com/v3/locations/locations_business_data_business_listings_2026_08_06.csv)
- **DOCUMENTÉ** — la documentation indique que les locations de Russie et de Biélorussie ne sont plus supportées par les services DataForSEO.
- **DOCUMENTÉ** — le prix SERP ne dépend pas de la location fournie dans le POST, mais le volume de résultats et les capacités peuvent différer selon le moteur, la location, la langue et le device. [SERP pricing FAQ](https://dataforseo.com/apis/serp-api/pricing)
- **NON OBSERVABLE** — présence exacte, granularité ville, langue disponible, densité d’index et qualité de données pour **Sri Lanka, France et Australie** n’ont pas été établies par une requête de location ; aucun appel API n’a été fait.
- **À TESTER** — pour chaque marché : récupérer les locations par API/CSV, confirmer les villes prioritaires, les codes de langue, les catégories Business Listings, le résultat Google Maps et la densité des mots-clés ; enregistrer le payload et le timestamp sans envoyer de donnée personnelle.
- **DOCUMENTÉ** — les conditions DataForSEO interdisent l’utilisation du service aux entités/personnes localisées, incorporées ou résidentes notamment en Russie, Biélorussie, Cuba, Iran, Syrie, Myanmar, Corée du Nord et territoires ukrainiens occupés listés dans les conditions. Le Sri Lanka, la France et l’Australie ne figurent pas dans cette liste publique, sans que cela prouve la couverture de données ni l’éligibilité d’un compte particulier. [Terms of Service](https://dataforseo.com/terms-of-service)

## 7. Authentification, sécurité opérationnelle et callbacks

- **DOCUMENTÉ** — l’authentification API est **Basic Authentication** dans l’en-tête `Authorization`; le login et le mot de passe API doivent être encodés en Base64. Il n’existe pas d’appel d’authentification séparé et les credentials ne doivent pas être passés dans l’URL. [Authentication](https://docs.dataforseo.com/v3/auth/)
- **DOCUMENTÉ** — le mot de passe API est distinct du mot de passe du dashboard et les credentials sont obtenus dans l’onglet API Access du compte. [Authentication](https://docs.dataforseo.com/v3/auth/)
- **DÉDUCTION** — le credential doit rester dans le Control Plane/worker serveur, jamais dans le navigateur, les démos, les logs, les prompts ou les fichiers de recherche ; les paramètres et coûts peuvent être journalisés sans secret.
- **DOCUMENTÉ** — `tag` est disponible sur les tasks et peut servir d’identifiant de projet ; il est limité à 255 caractères et répercuté dans les réponses/callbacks. La documentation d’aide précise que DataForSEO ne produit pas de ventilation de dépense par tag : Website Factory doit capturer son propre couple `tag` + coût. [Tag/usage](https://dataforseo.com/help-center/how-to-track-api-usage-with-tag)
- **DOCUMENTÉ** — les callbacks `pingback_url`/`postback_url` sont possibles ; si le serveur ne répond pas en 10 secondes, la connexion est interrompue et la tâche est transférée à `Tasks Ready`. [SERP Task POST](https://docs.dataforseo.com/v3/serp/google/organic/task_post/)
- **À TESTER** — callback signé ou non, retries, rejeu des postbacks, suppression des URLs temporaires et résistance à un callback malveillant ; ces contrôles doivent appartenir au worker Website Factory.

## 8. Conservation, réutilisation et droits de diffusion

### 8.1 Conservation par DataForSEO

- **DOCUMENTÉ** — en mode Standard, les résultats de tâche sont conservés **30 jours** ; le `task_get` est disponible pendant cette période.
- **DOCUMENTÉ** — en mode Live, DataForSEO indique ne pas conserver les résultats ; exceptions importantes : les résultats JSON du SERP peuvent être conservés 30 jours et les résultats HTML SERP 7 jours.
- **DOCUMENTÉ** — pour les APIs Live-only comme DataForSEO Labs, les résultats ne sont pas conservés par DataForSEO ; Website Factory doit persister immédiatement les faits nécessaires à son audit si cette conservation est autorisée.
- **DOCUMENTÉ** — l’URL de stockage d’un screenshot de page ne reste accessible qu’un jour après l’appel du endpoint Page Screenshot ; l’aide recommande de récupérer le fichier le jour même si sa conservation est nécessaire. [Task result retention](https://dataforseo.com/help-center/how-long-do-you-keep-results) · [API overview](https://docs.dataforseo.com/v3/)
- **DOCUMENTÉ** — la Privacy Policy indique que les données de tasks API DataForSEO sont stockées 365 jours et que les données de plus de 365 jours sont définitivement supprimées ; elle prévoit aussi un export CSV/JSON sur demande sous cinq jours ouvrés. [Privacy Policy](https://dataforseo.com/privacy-policy)
- **NON OBSERVABLE** — la relation exacte entre la rétention endpoint de 30 jours/Live non stockée et la rétention de 365 jours des données de tasks du compte n’est pas suffisamment détaillée pour définir seule une politique Website Factory.

### 8.2 Réutilisation et redistribution

- **DOCUMENTÉ** — les Terms of Service incluent les données et résultats produits par l’API dans le “Content” du service et imposent l’acceptation des conditions ; ils interdisent d’utiliser des données SERP obtenues via le service pour concurrencer ou affecter négativement les intérêts des moteurs de recherche dont les données proviennent. [Terms of Service, sections 1 et 7](https://dataforseo.com/terms-of-service)
- **NON OBSERVABLE** — les pages publiques consultées ne fournissent pas une licence générale, claire et spécifique autorisant la redistribution durable à des clients finaux de snapshots Google SERP/Maps, de listings, de numéros de téléphone, de photos, d’avis ou de HTML.
- **NON OBSERVABLE** — elles ne précisent pas si un rapport client payant, une base multi-clients, un cache durable, une exportation CSV/JSON ou un affichage public constitue une réutilisation permise pour chaque famille de données.
- **DÉDUCTION / règle provisoire** — sans confirmation écrite, conserver uniquement les champs minimaux nécessaires à une observation versionnée : endpoint, paramètres, timestamp, identifiant de tâche, résultat dérivé, URL/source, hash du payload et classe de conservation. Ne pas constituer un miroir durable de Google Maps ni exposer un export brut.
- **À TESTER** — demander à DataForSEO, avant activation commerciale, une confirmation écrite couvrant : rapport Website Factory remis au Prospect/Customer, conservation interne, cache/réexécution, export brut, affichage de listings/contacts, photos/avis, multi-client, sous-traitance et suppression à la demande. Cette démarche n’a pas été faite ici pour respecter l’absence de contact/ressource externe.

## 9. Qualité, actualité et provenance des données

- **DOCUMENTÉ** — Google SERP Standard est collecté au moment de la création de la tâche, pas au moment du `task_get`; récupérer une tâche 25 jours plus tard ne la rend pas fraîche. [Task retention](https://dataforseo.com/help-center/how-long-do-you-keep-results)
- **DOCUMENTÉ** — DataForSEO Labs s’appuie sur ses bases Keywords/SERPs ; les données de mots-clés suivent une mise à jour mensuelle liée au cycle Google Ads, tandis que la mise à jour SERP varie selon popularité et location. [Update frequency](https://dataforseo.com/help-center/how-often-is-dataforseo-api-data-updated) · [Google Labs overview](https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/)
- **DOCUMENTÉ** — l’endpoint `Domain Intersection` annonce une mise à jour hebdomadaire et expose une date d’actualisation dans le résultat/Status ; `Keyword Ideas` expose `last_updated_time` pour les données SERP associées lorsqu’elles existent.
- **NON OBSERVABLE** — fraîcheur réelle d’un mot-clé local rare, exhaustivité des concurrents, couverture d’un restaurant indépendant, stabilité d’une position et exactitude d’un téléphone/horaires sans observation réitérée.
- **DÉDUCTION** — un `SEOFinding` ou `CompetitorCandidate` doit conserver la provenance DataForSEO et la date ; le rapport ne doit pas présenter “concurrent”, “premier”, “meilleur”, “exhaustif” ou “classé” sans qualification et preuve indépendante.

## 10. Gates de validation avant activation Website Factory

### Gates bloquants

- **GATE 1 — credential** : compte et credential fournis ou autorisés par le propriétaire ; Basic Auth côté serveur ; aucun secret au navigateur ou dans le repo.
- **GATE 2 — coût** : minimum de 50 USD accepté séparément ; limites quotidiennes globales et par endpoint configurées ; plafond Website Factory plus strict que le solde ; chaque task doit produire un `CostEvent` avec coût retourné.
- **GATE 3 — marchés** : locations et langues validées séparément pour Sri Lanka, France et Australie ; villes prioritaires, catégories et densité de données consignées par marché.
- **GATE 4 — droits** : réponse écrite sur réutilisation, conservation et redistribution des résultats Google/Maps/Business Listings ; sans elle, pas d’export brut ni de miroir durable.
- **GATE 5 — fraîcheur** : `observedAt`, `last_updated_time`, mode, device, langue, location et profondeur obligatoires dans le snapshot ; un résultat Standard ancien ne doit pas être présenté comme actuel.
- **GATE 6 — sécurité** : worker isolé, timeouts, limite de concurrence 30, rate limiter, idempotence logique, gestion de `40200`/`40203`/`429`, absence de retry aveugle et secrets absents des logs.
- **GATE 7 — OnPage** : cible autorisée, SSRF/DNS/IP validés par Website Factory, `max_crawl_pages` borné, `crawl_delay` conservé, `robots_txt_merge_mode=merge`, `store_raw_html=false` par défaut, `override` interdit par défaut.
- **GATE 8 — qualité** : une concurrence issue de SERP/Labs reste une piste ; corroboration par domaine officiel et observation datée avant synthèse commerciale.

### Tests autorisés ultérieurement

- **À TESTER** — Sandbox gratuit : valider le schéma de chaque payload, les endpoints, les erreurs et la pagination sans compte payant.
- **À TESTER** — Compte de test explicitement autorisé : exécuter un seul scénario par endpoint, mesurer coût, latence, codes, headers, remboursement, rétention observée et couverture des marchés.
- **À TESTER** — OnPage sur un domaine autorisé : 1 page basic, puis un petit crawl borné ; comparer résultats DataForSEO à un contrôle HTTP local sans considérer l’un comme vérité absolue.
- **À TESTER** — refaire la vérification des prix et conditions juste avant activation ; cette note est une photographie documentaire du 27 août 2026, pas un contrat ni une garantie de stabilité.

## Conclusion

**Conclusion au 27 août 2026 :** DataForSEO couvre les capacités publiques prioritaires de Website Factory avec des endpoints officiellement documentés pour Google SERP, Maps, local pack/Local Finder, Business Listings, mots-clés, concurrence, intersections et OnPage. Les prix publics sont lisibles et principalement à l’usage ; le minimum de paiement public est de 50 USD. Les limites structurantes sont connues : 2 000 requêtes/minute en général, 30 requêtes simultanées pour les APIs basées sur des bases, limites de tasks/items par endpoint et coûts additionnels selon profondeur ou paramètres.

**Décision de provider :** `PRIORITAIRE / NON ACTIVÉ`. Cette décision est technique et documentaire uniquement. Elle ne prouve ni qu’un compte Website Factory existe, ni que les marchés cibles sont couverts, ni que les droits de redistribution sont acquis, ni que les délais annoncés seront tenus dans le parcours réel.

**Condition de passage à l’intégration :** tous les gates de la section 10 doivent être fermés avec des preuves datées. Tant que les droits d’usage et la couverture des marchés ne sont pas confirmés, Website Factory peut poursuivre la conception des contrats/provenances mais ne doit pas activer d’appel payant, de compte, de clé ou de diffusion commerciale DataForSEO.

## Sources primaires consultées

- [DataForSEO API v3 overview](https://docs.dataforseo.com/v3/)
- [Authentication](https://docs.dataforseo.com/v3/auth/)
- [DataForSEO pricing](https://dataforseo.com/pricing)
- [SERP API pricing](https://dataforseo.com/apis/serp-api/pricing)
- [Google Maps SERP pricing](https://dataforseo.com/pricing/google-serp/google-maps-serp-api)
- [Business Listings pricing](https://dataforseo.com/pricing/business-data/business-listings-api)
- [DataForSEO Labs Google pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)
- [OnPage pricing](https://dataforseo.com/help-center/cost-of-onpage-api-parameters)
- [Pricing update — 1 July 2026](https://dataforseo.com/update/pricing-update-in-dataforseo-apis)
- [Rate and request limits](https://dataforseo.com/help-center/rate-limits-and-request-limits)
- [Payment limits](https://dataforseo.com/help-center/limit-my-payments)
- [Task result retention](https://dataforseo.com/help-center/how-long-do-you-keep-results)
- [Update frequency](https://dataforseo.com/help-center/how-often-is-dataforseo-api-data-updated)
- [Privacy Policy — last modified 24 July 2026](https://dataforseo.com/privacy-policy)
- [Terms of Service — updated 12 June 2026](https://dataforseo.com/terms-of-service)
- [Google Organic SERP Task POST](https://docs.dataforseo.com/v3/serp/google/organic/task_post/)
- [Google Maps overview](https://docs.dataforseo.com/v3/serp-google-maps-overview/)
- [Google Maps Task POST](https://docs.dataforseo.com/v3/serp/google/maps/task_post/)
- [Google Maps Live Advanced](https://docs.dataforseo.com/v3/serp-maps-live-advanced/)
- [Google Local Finder Live Advanced](https://docs.dataforseo.com/v3/serp-google-local_finder-live-advanced/)
- [Business Listings overview](https://docs.dataforseo.com/v3/business_data-business_listings-overview/)
- [Business Listings Search Live](https://docs.dataforseo.com/v3/business_data-business_listings-search-live/)
- [Business Listings filters](https://docs.dataforseo.com/v3/business_data/business_listings/filters/)
- [Business Listings locations](https://docs.dataforseo.com/v3/business_data/business_listings/locations/)
- [Keyword Ideas](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/)
- [Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/)
- [SERP Competitors](https://docs.dataforseo.com/v3/dataforseo_labs/google/serp_competitors/live/)
- [Domain Intersection](https://docs.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live/)
- [Google Labs overview](https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/)
- [Competitor Research](https://dataforseo.com/apis/dataforseo-labs-api/competitor-research)
- [OnPage overview](https://docs.dataforseo.com/v3/on_page-overview/)
- [OnPage Task POST](https://docs.dataforseo.com/v3/on_page/task_post/)
