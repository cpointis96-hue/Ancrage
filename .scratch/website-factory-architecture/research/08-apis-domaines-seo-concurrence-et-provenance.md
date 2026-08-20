# APIs domaines, SEO déterministe, concurrence et provenance

**Type :** recherche Wayfinder — issue 08  
**Date de consultation :** 2026-08-17 (Asia/Bangkok)  
**Périmètre :** sources officielles uniquement ; aucun ticket ni code modifié.  
**Statut :** faits sourcés à revalider avant un choix fournisseur ou une mise en production.

## Résumé exécutable

1. **Domaine :** la disponibilité doit être traitée comme un état volatile. Une recherche de suggestions n'est pas une preuve ; il faut refaire un check autoritatif immédiatement avant toute dépense, afficher le prix d'enregistrement et de renouvellement, puis demander une validation humaine explicite. L'enregistrement est irréversible ou non remboursable selon le fournisseur.
2. **SEO déterministe :** le socle doit être un crawler contrôlé et versionné — HTTP, `robots.txt`, sitemap, statut, canonical, `hreflang`, meta, données structurées, liens, Lighthouse local — avec des règles et seuils appartenant au produit. Search Console et URL Inspection sont des compléments de vérité Google pour les propriétés vérifiées, pas un audit public illimité.
3. **Concurrence :** pour la concurrence locale, Google Places est techniquement pertinent mais impose une facturation par SKU et interdit la conservation générale du contenu retourné ; seul le `place_id` est explicitement conservable sans limite. Pour la découverte web, Google Custom Search JSON API ne doit pas être retenue pour un nouveau MVP : elle est fermée aux nouveaux clients et annoncée en arrêt au 1er janvier 2027. OpenStreetMap est une alternative ouverte pour les POI, sous ODbL et avec des limites opérationnelles fortes sur les services publics.
4. **Provenance :** chaque observation doit être un snapshot daté, avec fournisseur, endpoint, paramètres non secrets, version de règle, horodatage fourni par la source si disponible, URL canonique, empreinte du payload brut et classe de conservation. Une synthèse de concurrent doit rester une observation sourcée, jamais une affirmation factuelle non vérifiée.
5. **À ne pas automatiser sans validation :** achat/renouvellement de domaine, changement DNS/nameservers, publication d'une conclusion concurrentielle, suppression ou conservation longue de données Google Places, et toute action qui suppose qu'un résultat Google est exhaustif ou stable.

## 1. Décisions et recommandations de cadrage

### 1.1 Architecture recommandée pour le MVP

| Besoin | Source primaire recommandée | Rôle | Décision de conservation |
|---|---|---|---|
| Suggestions de domaines | Cloudflare Registrar API ou GoDaddy Domains v3 | Générer des candidats et des prix indicatifs | Conserver un snapshot court, daté et non présenté comme disponibilité finale |
| Disponibilité et prix d'achat | Check Cloudflare ou disponibilité + quote GoDaddy | Confirmer juste avant l'achat | Conserver le résultat, le prix, le timestamp et l'identifiant de quote ; revalider avant dépense |
| Enregistrement | Cloudflare Registrar ou GoDaddy | Opération payante après paiement et accord humain | Conserver preuve de consentement, fournisseur, domaine, période, prix, statut final et identifiant d'opération |
| État public d'un domaine | RDAP du registre/registrar | Vérifier statut, dates, nameservers et registrar | Conserver les champs nécessaires à l'audit ; minimiser les données de contact |
| SEO structurel public | Crawler HTTP déterministe + parsing local | Évaluer ce qui est observable sur un site public | Conserver les faits techniques, l'URL, le statut, le hash du contenu utile et la date ; éviter de stocker le contenu éditorial complet |
| Indexation/performance d'une propriété cliente | Search Console API, URL Inspection, Lighthouse local | Compléter l'audit avec des données autorisées | Autorisation par propriété ; snapshots datés et limités aux besoins du service |
| Performance reproductible | Lighthouse CLI local, version épinglée | Mesurer selon une configuration connue | Conserver JSON, configuration, version Chrome/Lighthouse, machine/environnement et date ; comparer des séries, pas un score isolé |
| Concurrence locale | Google Places API (New) ou extraction OSM contrôlée | Trouver des établissements dans une zone | Avec Places : conserver principalement `place_id` et observations minimales ; avec OSM : conserver sous ODbL avec attribution/share-alike si applicable |
| Découverte web | Crawl direct autorisé et contrôlé ; CSE seulement si compte existant | Trouver des sites et pages à vérifier | Conserver URL, titre/extrait minimal, date et preuve ; ne pas faire du résultat de recherche une vérité exhaustive |

**Inférence d'architecture :** cette séparation évite de confondre quatre états différents : *candidat*, *disponible selon un fournisseur*, *acheté*, et *observé publiquement*. Les APIs et politiques citées ne garantissent pas la stabilité du premier ou du deuxième état.

## 2. Domaines : API, quotas, prix et conditions

### 2.1 Cloudflare Registrar API

La documentation officielle expose un flux de recherche, de check et d'enregistrement via l'API Registrar : [Registrar API](https://developers.cloudflare.com/registrar/registrar-api/) et [référence API Registrar](https://developers.cloudflare.com/api/resources/registrar/).

| Sujet | Fait officiel | Conséquence produit |
|---|---|---|
| Authentification et prérequis | Compte Cloudflare, token avec permissions Registrar, moyen de paiement par défaut, contact registrant par défaut et acceptation du Domain Registration Agreement sont requis pour le flux documenté. | Le token et la facturation restent côté serveur ; la démo ne doit pas avoir le pouvoir d'enregistrer. |
| Recherche | La recherche est rapide, basée sur des données mises en cache et limitée aux extensions supportées par le beta API ; ses résultats sont non autoritatifs et peuvent être périmés. | Jamais de bouton d'achat directement branché sur la recherche. |
| Check | Le check interroge directement le registre, reflète son état courant et doit être exécuté immédiatement avant l'enregistrement ; la requête accepte jusqu'à 20 domaines. | Utiliser le check comme étape obligatoire et rendre son timestamp visible dans le dossier de commande. |
| Prix | La réponse expose `currency`, `registration_cost` et `renewal_cost`, en prix annuels. Le prix retourné reflète le tarif courant du registre ; les prix premium peuvent être nettement supérieurs et l'enregistrement premium n'est pas actuellement supporté par cette API. | Afficher séparément première année et renouvellement ; ne jamais afficher un prix mémorisé sans date. |
| Enregistrement | L'opération est facturée au profil de paiement par défaut ; une réussite n'est pas remboursable. Le guide API documente `auto_renew` à `false` par défaut et `privacy_mode` à `redaction` si le TLD le permet. | Consentement humain explicite, confirmation du domaine/prix, puis journal de l'opération ; vérifier le comportement exact du compte avant déploiement. |
| Prix catalogue | Cloudflare indique vendre et renouveler les domaines au coût du registre, sans marge ; les tarifs précis restent ceux renvoyés par le check. | Le budget doit être fondé sur la réponse live, pas sur le slogan « at cost ». |
| Quota | La limite globale de l'API Cloudflare est de 1 200 requêtes par période de 5 minutes par utilisateur ; en dépassement, les appels sont bloqués pendant les 5 minutes suivantes avec `429`. Des limites spécifiques peuvent s'ajouter ; les en-têtes `Ratelimit` et `retry-after` doivent être respectés. [Rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/) | Rate limiter local, backoff, métriques de quota et aucune boucle de retry sur un POST d'achat. |
| Noms et IDN | Les noms sont renvoyés en FQDN punycode pour les IDN. | Conserver la saisie utilisateur et la forme canonique punycode ; faire valider l'équivalence affichée. |

**Prix de référence observé :** Cloudflare affiche un « starting at $7.85 » sur sa page de plans, mais ce n'est pas un prix universel. Pour l'architecture, seul `registration_cost`/`renewal_cost` retourné pour le domaine précis fait foi : [Cloudflare pricing](https://www.cloudflare.com/plans/) et [API Registrar](https://developers.cloudflare.com/api/resources/registrar/).

**Limite opérationnelle additionnelle :** Cloudflare Registrar impose l'usage de ses nameservers dans le cas général ; la FAQ indique qu'il faut transférer le domaine à un autre registrar si des nameservers différents sont nécessaires : [Registrar FAQ](https://developers.cloudflare.com/registrar/faq/). Ce point doit être vérifié avant de choisir Cloudflare pour un client qui veut conserver un DNS externe.

### 2.2 GoDaddy Domains v3

GoDaddy documente un modèle **discover → quote → register → poll** dans [Domains v3](https://developer.godaddy.com/en/docs/references/rest/domains/v3) et [Register a domain](https://developer.godaddy.com/en/docs/api-users/purchase-domains/register).

| Sujet | Fait officiel | Conséquence produit |
|---|---|---|
| Disponibilité | `GET /v3/domains/check-availability` retourne une disponibilité et des prix indicatifs. | Ce résultat est une proposition, pas encore un prix verrouillé. |
| Quote | `POST /v3/domains/registration-quotes` verrouille le prix et fournit un `quoteToken` avec expiration courte ; la réponse expose aussi les accords requis. | Le quote doit être généré au dernier moment et son expiration doit être visible dans l'état métier. |
| Achat | `POST /v3/domains/registrations` exécute l'enregistrement avec le token, une période concordante, un consentement ICANN et un `Idempotency-Key`. L'écriture est asynchrone et doit être suivie jusqu'à `COMPLETED` ou `FAILED`. | Utiliser l'idempotence et le polling ; ne jamais resoumettre aveuglément un POST après timeout. |
| Facturation et réversibilité | L'enregistrement charge le moyen de paiement du compte et n'est pas réversible selon le guide officiel. Un contact registrant complet et un moyen de paiement sont nécessaires. | Validation humaine obligatoire avant exécution. |
| Quota | La documentation Domains v1/v3 indique 60 requêtes par minute par credential ; un dépassement retourne `429` avec `Retry-After`. | Budgeter recherche, quote, achat et polling dans un quota partagé par credential. |
| Retry | Les GET sont sûrs à retenter ; l'achat v1 n'est pas idempotent ; v3 exige `Idempotency-Key`. | Politique de retry par méthode, jamais une politique générique. |

GoDaddy n'est pas présenté comme « au coût » : le prix utile doit venir de la réponse de disponibilité puis du quote verrouillé. La documentation fournit un exemple en cents USD, mais cela ne constitue pas un tarif de catalogue pour tous les TLD.

### 2.3 Namecheap : capacité observée, mais documentation insuffisante pour en faire le choix MVP

La documentation officielle [namecheap.domains.check](https://www.namecheap.com/support/api/methods/domains/check/) expose la disponibilité, les indicateurs premium et les prix d'enregistrement/renouvellement ; un appel `check` accepte au maximum 50 domaines. Elle indique aussi que l'enregistrement de domaines premium pendant l'EAP n'est pas supporté par l'API.

La page [Domain API methods](https://www.namecheap.com/support/api/methods/domains/) confirme les opérations `check`, `create`, `renew`, contacts, verrouillage et informations. La recherche présente ne suffit pas à confirmer un quota public actuel, une politique de conservation API et un modèle de prix global. **Décision prudente :** ne pas sélectionner Namecheap pour le MVP sans une vérification contractuelle et un test de compte séparé.

### 2.4 RDAP et politique ICANN

RDAP est le protocole standardisé destiné à remplacer WHOIS, avec accès aux données d'enregistrement courantes : [ICANN RDAP](https://www.icann.org/rdap/). Les données publiques sont susceptibles d'être redigées et l'existence d'une donnée RDAP ne constitue pas une autorisation de contacter ou de profiler une personne.

La [Registration Data Policy](https://www.icann.org/resources/pages/registration-data-policy-2024-02-21-en/) impose notamment aux registrars de collecter certains éléments d'enregistrement et de conserver les éléments nécessaires aux procédures TDRP au moins 15 mois après la fin du sponsoring ou un changement d'enregistrant. Cette obligation pèse sur le registrar ; elle ne donne pas au produit le droit de conserver toutes les données personnelles retournées.

Le [lookup ICANN](https://lookup.icann.org/lookup/listing) précise que les résultats viennent en temps réel des registries/registrars et qu'ICANN ne génère, ne collecte, ne conserve ni ne stocke les données associées à une requête RDAP normale ; un fallback WHOIS peut toutefois être conservé pendant la durée transitoire nécessaire à la réponse. **Règle produit :** conserver par défaut le nom de domaine, l'état, le registrar, les dates, les nameservers, le timestamp et l'URL RDAP ; exclure nom, email, téléphone et adresse de l'enregistrant sauf nécessité documentée et base légale validée.

## 3. SEO déterministe : sources autorisées et limites

### 3.1 Crawler public et règles observables

Le socle déterministe peut être exécuté sans API payante : requêtes HTTP bornées, suivi des redirections, parsing HTML et tests de règles versionnées. Il doit lire `robots.txt` avant le crawl. Google indique que `robots.txt` sert à gérer le crawl, **pas** à sécuriser ni à garantir l'absence d'indexation : [Introduction robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

La spécification d'interprétation Google fixe une limite de 500 KiB pour le fichier `robots.txt` : [How Google interprets robots.txt](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec). Le crawler doit donc :

- respecter les règles applicables à son User-Agent et documenter la décision allow/deny ;
- limiter la profondeur, le nombre d'URLs, la taille des réponses et le temps par domaine ;
- ne jamais utiliser `robots.txt` comme preuve qu'un contenu est privé ou non indexé ;
- fournir un User-Agent identifiable et un mécanisme d'arrêt.

Pour les sitemaps, Google documente une limite de 50 Mo non compressés ou 50 000 URLs par fichier, en UTF-8, avec URLs absolues : [Build and submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Le crawler peut donc tester la conformité structurelle sans dépendre du classement Google. Un sitemap suggère des URLs ; il ne garantit ni crawl ni indexation.

### 3.2 Search Console API

La [Search Console API](https://developers.google.com/webmaster-tools) est destinée aux propriétés du compte autorisé et expose Search Analytics, Sitemaps, Sites et URL Inspection : [API reference](https://developers.google.com/webmaster-tools/v1/api_reference_index). Son usage est gratuit : [Pricing](https://developers.google.com/webmaster-tools/pricing).

Quotas officiels actuellement documentés :

| Ressource | Quota par site | Quota par utilisateur/projet | Limite de données |
|---|---:|---:|---|
| Search Analytics | 1 200 QPM par site | 1 200 QPM utilisateur ; 40 000 QPM et 30 000 000 QPD par projet | Maximum 50 000 lignes par jour et par type de recherche ; réponses triées par clics et potentiellement incomplètes |
| URL Inspection | 600 QPM et 2 000 QPD par site | 15 000 QPM et 10 000 000 QPD par projet | Une inspection d'une URL donnée et d'une propriété autorisée ; ce n'est pas un index public arbitraire |
| Autres ressources | — | 20 QPS et 200 QPM par utilisateur ; 100 000 000 QPD par projet | À confirmer dans la console pour le projet réel |

Source : [Usage limits](https://developers.google.com/webmaster-tools/limits) et [Getting your performance data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data). Search Analytics expose les données disponibles du rapport Performance sur une fenêtre historique de 16 mois selon la documentation Google : [Search Central announcement](https://developers.google.com/search/blog/2018/06/new-url-inspection-tool-more-in-search). La documentation précise que l'API ne garantit pas toutes les lignes, mais les meilleures lignes soumises à ses limites internes : [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

**Conservation conseillée :** ne pas reconstruire artificiellement un historique au-delà de la fenêtre réellement renvoyée. Stocker chaque extraction avec `property`, période, dimensions, filtres, `rowLimit`, `startRow`, date de collecte et quota consommé. Les requêtes quotidiennes d'une journée sont préférables aux gros replays, conformément aux recommandations officielles.

### 3.3 URL Inspection et Indexing API : frontière importante

URL Inspection est adapté à un contrôle post-publication autorisé. L'[Indexing API quota/pricing](https://developers.google.com/search/apis/indexing-api/v3/quota-pricing) est gratuit mais limité à des pages contenant `JobPosting` ou `BroadcastEvent` dans un `VideoObject`; le quota initial documenté est de 200 demandes de publication par jour et par projet, 180 demandes de métadonnées par minute et 380 demandes par minute. **Il ne faut pas l'utiliser pour forcer l'indexation de pages commerciales ordinaires.** Pour le MVP, la soumission de sitemap et le suivi Search Console sont la voie normale.

### 3.4 PageSpeed Insights API et Lighthouse local

PageSpeed Insights appelle Lighthouse pour les données de laboratoire et peut renvoyer du CrUX pour les données de terrain : [Get Started with PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) et [runPagespeed](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed). Les catégories disponibles incluent performance, accessibility, best-practices et SEO ; la réponse contient notamment `analysisUTCTimestamp`, l'URL finale et la version Lighthouse.

La documentation Google annonce la fin prévue de l'inclusion des données de terrain CrUX dans cette API et recommande le CrUX API/History API pour la suite. La page officielle consultée ne publie pas un quota fixe universel comparable à Search Console : la clé est recommandée pour des requêtes automatisées fréquentes et les quotas doivent être vérifiés dans le projet Google réel. **Ne pas budgéter PSI avec un quota supposé.**

Pour un audit déterministe de structure, préférer le [Lighthouse CLI officiel](https://github.com/GoogleChrome/lighthouse) exécuté localement : le projet indique que le rapport est produit localement et n'est pas envoyé à un serveur distant. La configuration permet de sélectionner les audits et catégories : [Lighthouse configuration](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md). Les résultats de performance restent variables ; la documentation recommande plusieurs runs et une médiane : [Lighthouse variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).

**Règle de reproductibilité :** épingler la version Lighthouse/Chrome, le profil mobile ou desktop, le throttling, la locale, le User-Agent, les catégories, la configuration et le nombre de runs ; conserver le JSON complet et le sous-ensemble de faits utilisé par la règle. Un score unique ne doit jamais être présenté comme une propriété stable d'un concurrent.

## 4. Découverte et synthèse de concurrents

### 4.1 Google Custom Search JSON API : à écarter pour un nouveau client

La [documentation officielle](https://developers.google.com/custom-search/v1/overview) indique que l'API :

- est fermée aux nouveaux clients ;
- laisse aux clients existants une transition jusqu'au 1er janvier 2027 ;
- offre 100 requêtes gratuites par jour ;
- coûte ensuite 5 USD pour 1 000 requêtes, avec un maximum de 10 000 requêtes par jour ;
- requiert une API key et un Programmable Search Engine ID ;
- ne renvoie que les 100 premiers résultats au maximum dans la pagination.

Les requêtes sont limitées à 2 048 caractères : [Use REST](https://developers.google.com/custom-search/v1/using_rest). L'API est également soumise aux [Additional Terms of Service](https://developers.google.com/custom-search/terms), qui prévoient facturation, taxes, modification des frais avec préavis et possibilité de discontinuation.

**Décision :** ne pas bâtir une nouvelle dépendance dessus. Si un compte existant est utilisé temporairement, conserver seulement l'URL, le titre, l'extrait minimal, la requête, les paramètres de localisation/langue, la date et l'URL de provenance ; faire relire les règles de cache et de redistribution dans les conditions applicables avant toute conservation longue ou exposition client.

### 4.2 Google Places API (New) : découverte locale, mais cache très contraint

Places fournit Text Search, Nearby Search, Place Details et des identifiants de lieu : [Places REST reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places). Le service est pay-as-you-go, exige la facturation activée et un API key ou OAuth ; les demandes sont facturées par SKU et les field masks limitent les champs demandés : [Usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing).

La [grille tarifaire officielle](https://developers.google.com/maps/billing-and-pricing/pricing) consultée indique notamment, pour Places API (New), un palier gratuit de 10 000 pour `Place Details Essentials` et 10 000 pour les SKU de recherche/détails correspondants, tandis que les SKU **IDs Only** de Place Details et Text Search sont affichés sans coût dans la grille consultée. Les prix sont par SKU et peuvent évoluer ; un calcul de coût doit être refait sur la page de pricing avant de signer une architecture.

Les quotas Places sont par méthode et par minute au niveau du projet pour Places API (New) ; les valeurs opérationnelles doivent être consultées dans Google Cloud Quotas, et atteindre une limite stoppe les réponses : [Usage limits](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) et [Reporting/monitoring](https://developers.google.com/maps/documentation/places/web-service/report-monitor).

La contrainte la plus structurante est la conservation : il est interdit de pré-extraire, mettre en cache ou stocker le contenu Places au-delà des exceptions autorisées ; le `place_id` est explicitement exempté et peut être conservé indéfiniment : [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) et [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id). Les applications doivent aussi afficher les attributions requises ; les photos et avis ont des exigences de lien et d'auteur.

**Flux recommandé :** Text Search en `IDs Only` pour la découverte, conservation du `place_id` et de la requête/zone/date ; récupération à la demande des champs minimaux pour un écran ou une décision ; ne pas construire une base historique durable des horaires, avis, photos ou coordonnées Google sans vérifier l'exception applicable.

### 4.3 OpenStreetMap : alternative ouverte, mais services publics non garantis

Pour une découverte locale contrôlée, OSM offre une base ouverte sous [ODbL](https://www.openstreetmap.org/copyright/en?locale=en-GB). L'attribution est obligatoire et une base dérivée publiée peut déclencher les obligations share-alike ; la conservation et la redistribution doivent donc garder la licence, la date d'extraction et la provenance.

Le service public Nominatim impose un maximum absolu d'une requête par seconde, un User-Agent ou Referer identifiable et l'attribution ; les requêtes périodiques, le bulk régulier, l'autocomplete, les requêtes systématiques et le téléchargement de tous les POI d'une zone sont interdits ou déconseillés selon le cas : [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/). Cette politique précise également que les applications commerciales doivent pouvoir changer de service à la demande et que la politique peut changer sans préavis.

Overpass est mieux adapté à une extraction ciblée de POI, mais les instances publiques restent des services partagés. La documentation indique, pour l'instance principale, une marge de sécurité d'environ 10 000 requêtes par jour et moins de 1 Go téléchargé par jour, ainsi que des limites de temps/mémoire par requête : [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) et [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL). Pour un usage récurrent ou important, installer une instance ou utiliser un fournisseur dédié après vérification de son contrat.

**Décision :** OSM peut fournir une liste initiale de concurrents locaux avec licence explicite, mais les résultats doivent être marqués « présence cartographiée dans OSM à la date X », pas « concurrent actif vérifié ». Une vérification humaine ou une source directe du commerce est nécessaire avant une synthèse commerciale.

## 5. Provenance et conservation des données

### 5.1 Schéma minimal d'un snapshot

Chaque observation externe devrait avoir au minimum :

```text
observation_id
source_provider              # cloudflare, godaddy, rdap, search_console, lighthouse, places, osm, ...
source_endpoint              # URL canonique et méthode HTTP
source_document_url          # page officielle qui décrit l'API ou la règle
retrieved_at                 # UTC
source_last_updated_at       # si publié par la source, sinon null
request_fingerprint          # paramètres non secrets, domaine/URL, zone, locale, device
response_timestamp           # timestamp de la réponse/du rapport si fourni
payload_sha256               # empreinte du payload brut conservé séparément ou du sous-ensemble
parser_or_rule_version       # version du parseur et de la règle produit
license_or_retention_class   # owned_property, provider_restricted, ODbL, public_minimal, ...
evidence_status               # observed, inferred, human_verified, stale, conflicting
human_review                  # id, décision et date si une validation est requise
```

Ne jamais écrire les API keys, tokens, contacts registrants ou données personnelles dans `request_fingerprint`, les URLs de logs ou les messages d'erreur publics.

### 5.2 Classes de conservation proposées

| Classe | Exemples | Politique |
|---|---|---|
| `owned_property` | Search Console, URL Inspection d'un client autorisé | Conserver les snapshots nécessaires au service et à la comparaison ; documenter la propriété autorisée et respecter la fenêtre réellement disponible. |
| `volatile_quote` | disponibilité/prix de domaine | Conserver pour audit de commande, mais marquer périmé après un délai court ; ne jamais réutiliser pour acheter. |
| `provider_restricted` | contenu détaillé Google Places, CSE à confirmer | Stocker le minimum permis ; privilégier identifiant, provenance et cache à durée limitée ; aucune copie durable par défaut. |
| `public_minimal` | URL, statut HTTP, headers utiles, titres/meta, RDAP public | Conserver les faits techniques et l'empreinte ; éviter le corps éditorial complet, les données personnelles et les extraits longs. |
| `odbl_dataset` | extraction OSM/Overpass | Conserver version/date d'extraction, attribution, licence et transformation ; évaluer les obligations share-alike avant publication d'une base dérivée. |
| `local_artifact` | JSON Lighthouse exécuté localement | Conserver la configuration, la version, l'environnement, la date et le résultat ; le comparer comme mesure expérimentale, non comme vérité permanente. |

### 5.3 Citation et rendu utilisateur

Une fiche de concurrent devrait afficher, pour chaque assertion :

- la formulation exacte de l'observation (« le site expose X à l'URL Y ») ;
- la date/heure de collecte et le fuseau normalisé UTC ;
- le lien vers la page observée ou l'identifiant de la source ;
- le fournisseur et l'endpoint ayant produit la donnée ;
- un statut `observed`, `inferred`, `human_verified` ou `unverified` ;
- une date d'expiration ou de revalidation lorsque la donnée est volatile.

**Inférence de conservation :** les sources étudiées publient des règles d'accès et parfois des exceptions de cache, mais ne constituent pas une autorisation générale de republier tout contenu tiers. Tant que les conditions d'un fournisseur ne sont pas explicites, appliquer la politique la plus restrictive : metadata minimale, lien source, pas de copie longue, pas d'entraînement ou de synthèse présentée comme fait sans relecture humaine.

## 6. Opérations à interdire ou à soumettre à validation humaine

### Toujours validation humaine

- achat, renouvellement, transfert ou suppression d'un domaine ;
- confirmation d'un prix et d'une durée de domaine ;
- modification de nameservers, DNS, auto-renew ou contact registrant ;
- utilisation d'une donnée personnelle RDAP/WHOIS ou demande de divulgation ;
- publication d'un score ou d'une comparaison concurrentielle dans une proposition client ;
- toute décision « ce commerce est un concurrent » fondée seulement sur une présence OSM, Places ou une page de résultats ;
- export ou partage d'un rapport contenant avis, photos, coordonnées ou contenu tiers sous licence restrictive.

### À interdire techniquement

- retry aveugle d'un POST d'enregistrement après un timeout ;
- utilisation de résultats de recherche de domaines comme preuve finale ;
- utilisation de robots.txt comme mécanisme de sécurité ou comme preuve de non-indexation ;
- appels Google Indexing API pour des pages commerciales ordinaires ;
- scraping systématique de Google Search ou de pages Google Maps à la place d'une API autorisée ;
- préchargement et cache longue durée de contenu Google Places non couvert par une exception ;
- autocomplete, grille géographique, téléchargement massif de POI ou bulk périodique sur le Nominatim public ;
- conclusion SEO à partir d'un seul run Lighthouse/PSI ou d'une seule date Search Console ;
- conservation de secrets dans les logs de provenance.

## 7. Questions restant à trancher avant `to-spec`

1. Le MVP veut-il uniquement **suggérer** un domaine, ou doit-il aussi orchestrer l'achat après paiement ? La seconde option impose un coffre de secrets, une étape de consentement et une machine d'état de dépense.
2. Cloudflare Registrar est-il acceptable malgré la contrainte de nameservers Cloudflare, ou faut-il conserver GoDaddy/une autre option pour les clients ayant un DNS externe ?
3. La concurrence locale doit-elle être une liste de pistes internes ou une donnée affichée au client ? La seconde option augmente fortement les contraintes Places/ODbL/provenance.
4. Quel budget mensuel et quel nombre de sites/concurrents bornent le crawler et les appels Places ? Sans ce budget, les quotas et la conservation ne peuvent pas être dimensionnés honnêtement.
5. Quelle politique de rétention est retenue pour les snapshots publics, les rapports Lighthouse et les données Search Console, et quel mécanisme efface les données expirées ?
6. Quel niveau de preuve est nécessaire avant d'écrire « promesse SEO » : conformité technique observée, indexation Search Console vérifiée, ou performance historique mesurée ? Les APIs ne justifient pas automatiquement une promesse de classement.

## 8. Registre des sources officielles consultées

Les pages ci-dessous sont les sources primaires utilisées pour les faits de cette note. Les pages de prix et de quotas sont susceptibles d'évoluer ; `retrieved_at` ci-dessus est donc obligatoire dans toute implémentation.

- [Cloudflare Registrar overview](https://developers.cloudflare.com/registrar/) — prix au coût du registre.
- [Cloudflare Registrar API guide](https://developers.cloudflare.com/registrar/registrar-api/) — recherche, check, enregistrement, prix et prérequis.
- [Cloudflare Registrar API reference](https://developers.cloudflare.com/api/resources/registrar/) — schémas, prix annuels, tiers, raisons d'indisponibilité.
- [Cloudflare API rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/) — 1 200 requêtes/5 minutes/utilisateur et réponses `429`.
- [Cloudflare Registrar FAQ](https://developers.cloudflare.com/registrar/faq/) — nameservers imposés dans le cas général.
- [GoDaddy Domains v3 reference](https://developer.godaddy.com/en/docs/references/rest/domains/v3) — flux quote/exécution/polling.
- [GoDaddy register a domain](https://developer.godaddy.com/en/docs/api-users/purchase-domains/register) — consentement, paiement, non-réversibilité.
- [GoDaddy Domains v1](https://developer.godaddy.com/en/docs/references/rest/domains/v1) — 60 requêtes/minute/credential et idempotence.
- [Namecheap domains.check](https://www.namecheap.com/support/api/methods/domains/check/) — check jusqu'à 50 domaines et prix premium.
- [ICANN RDAP](https://www.icann.org/rdap/) — protocole et données courantes.
- [ICANN Registration Data Policy](https://www.icann.org/resources/pages/registration-data-policy-2024-02-21-en/) — collecte, publication et rétention réglementaire des registrars.
- [ICANN Lookup terms/context](https://lookup.icann.org/lookup/listing) — comportement de conservation de l'outil ICANN.
- [Google Search Console API limits](https://developers.google.com/webmaster-tools/limits) — quotas Search Analytics, URL Inspection et autres ressources.
- [Google Search Console API pricing](https://developers.google.com/webmaster-tools/pricing) — usage gratuit.
- [Google Search Console data extraction](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data) — 50 000 lignes/jour/type.
- [Google Search Console query reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) — résultats non exhaustifs.
- [Google Indexing API quotas/pricing](https://developers.google.com/search/apis/indexing-api/v3/quota-pricing) — périmètre JobPosting/BroadcastEvent.
- [Google robots.txt introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro) et [specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) — rôle et limite 500 KiB.
- [Google sitemap guide](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — 50 Mo/50 000 URLs.
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) — PSI, Lighthouse, CrUX et évolution annoncée.
- [Lighthouse repository](https://github.com/GoogleChrome/lighthouse) et [variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) — exécution locale et plusieurs runs.
- [Google Custom Search JSON API overview](https://developers.google.com/custom-search/v1/overview) — fermeture aux nouveaux clients, fin annoncée, prix et quotas.
- [Google Custom Search REST](https://developers.google.com/custom-search/v1/using_rest) — paramètres, 2 048 caractères, 100 résultats.
- [Google Custom Search additional terms](https://developers.google.com/custom-search/terms) — conditions tarifaires et de service.
- [Google Places usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) — pay-as-you-go, SKU, field masks et quotas.
- [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing) — grille SKU observée.
- [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) et [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) — restrictions de cache et exception `place_id`.
- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright/en?locale=en-GB) — ODbL et attribution.
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) — 1 requête/s, bulk, cache, User-Agent et interdictions.
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) et [Overpass QL limits](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) — limites de charge et de requête.

