# CityIndex, observation GMB, concurrence et conservation

**Date de vérification : 27 août 2026**
**Périmètre :** Website Factory ; Sri Lanka, Australie, France ; parcours public `nom + ville` → confirmation progressive → audit borné → restitution.

La date ci-dessus borne l'état de la recherche. Les pages sources conservent leurs propres dates de publication ou de mise à jour ; aucune source n'est présentée comme publiée le 27 août lorsqu'elle ne le dit pas.

## Statuts

- **MESURÉ** : opération effectivement réalisée pendant cette recherche.
- **DOCUMENTÉ** : fait établi par une source primaire officielle citée.
- **NON OBSERVABLE** : la source publique ou le parcours sans autorisation ne permet pas de l'établir.
- **À TESTER** : vérification d'intégration, de schéma, de couverture ou de droit restant à faire ; ce n'est pas une preuve de disponibilité.

## Conclusion exécutive

1. **CityIndex commun : GeoNames est le candidat le plus directement redistribuable pour les trois marchés.** Son export public et ses fichiers pays sont sous CC BY 4.0, l'usage commercial et l'adaptation sont autorisés avec attribution. La couverture exacte, le choix des lignes « ville » et la synchronisation dans l'index Website Factory restent **À TESTER**.
2. **France : le Code officiel géographique (COG) d'INSEE est une source officielle forte**, sous Licence Ouverte 2.0, avec fichiers annuels et attribution. Il décrit des communes et circonscriptions administratives ; il ne garantit pas une liste sémantique de toutes les villes utilisées par les prospects. L'extraction et le mapping métier restent **À TESTER**.
3. **Australie : l'ABS est redistribuable lorsque la ressource est explicitement sous CC BY 4.0, mais n'est pas une solution suffisante seule.** L'ABS indique ne pas produire de liste officielle des « towns and cities » ; les UCL/SAL sont des géographies statistiques, avec un calendrier de mise à jour qui ne rend pas toutes les couches 2026 disponibles immédiatement. Usage comme enrichissement secondaire, pas comme CityIndex sémantique unique.
4. **Sri Lanka : aucune licence de redistribution adaptée n'est confirmable pour la source officielle Survey/NSDI sans revue juridique et/ou obtention/téléchargement autorisé de la ressource.** L'interface et les couches sont publiques, mais les conditions de redistribution, d'attribution et de mise à jour ne sont pas publiées de façon suffisante ; le portail NSDI affiche « All Rights Reserved ». Gate bloquant.
5. **GMB/Google Maps public :** la méthode compatible avec le parcours est une redirection humaine vers une URL Google Maps de recherche, puis une sélection/confirmation par l'utilisateur ou le propriétaire. Elle ne constitue pas un miroir de fiche ni une preuve d'absence. L'API Business Profile reste réservée aux profils auxquels l'utilisateur autorisé a accès ; Places est une branche payante et contractuellement contrainte, non activée ici.
6. **Pistes concurrentielles :** privilégier le domaine fourni ou confirmé par le prospect, le site officiel daté et, sous conditions ODbL, OSM. DataForSEO est un fournisseur possible pour une découverte interne, mais le droit de republier les données dans un rapport client n'est pas confirmé par les sources consultées. Google Maps et Screaming Frog ne sont pas des sources de redistribution par défaut.

## 1. Options CityIndex par marché

| Source | Marché | Ce qui est documenté | Licence / attribution | Mises à jour | Décision au 27/08/2026 |
|---|---|---|---|---|---|
| [GeoNames export](https://www.geonames.org/export/) et [readme officiel](https://download.geonames.org/export/dump/readme.txt) | Sri Lanka, Australie, France | Exports quotidiens, fichiers pays, identifiant, nom, coordonnées, codes, population et date de modification ; flux de modification/suppression documentés | CC BY 4.0 ; usage commercial autorisé ; crédit GeoNames avec lien/référence ; données « as is » sans garantie | Export quotidien et flux de modification documentés | **DOCUMENTÉ** comme candidat commun ; couverture utile, normalisation et test de redistribution Website Factory **À TESTER** |
| [INSEE — Code officiel géographique](https://www.data.gouv.fr/datasets/code-officiel-geographique-cog) et [fichiers annuels](https://www.insee.fr/fr/information/2560452) | France | Codes et libellés annuels des communes, départements, régions, collectivités et territoires | Licence Ouverte 2.0 : copie, adaptation, réutilisation commerciale et redistribution ; attribution du producteur et indication de la source/mise à jour | Fichiers annuels ; fiche data.gouv mise à jour le 19/08/2026, fichiers 2026 visibles | **DOCUMENTÉ** comme source française principale ; choix du fichier, import, mapping des variantes et test de restitution **À TESTER** |
| [ABS ASGS — dernière édition](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard/asgs/latest-release), [accès/téléchargements](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard/asgs/edition-4-july-2026-june-2031/access-and-downloads) | Australie | ASGS, UCL, SAL et autres structures statistiques ; les SAL approchent des banlieues/localités reconnues ; UCL = concentration urbaine statistique | Contenu ABS explicitement marqué CC BY 4.0 redistribuable avec attribution ; exceptions possibles : logo, marques, microdonnées, tiers | Édition 4 2026–2031 progressive ; certaines géographies sont annoncées pour octobre 2026 et au-delà ; l'ancienne couche UCL n'est plus planifiée pour mise à jour | **DOCUMENTÉ** comme enrichissement secondaire ; **NON OBSERVABLE** : une liste officielle exhaustive de villes ; utiliser GeoNames ou une autre source licenciée comme entrée CityIndex |
| [ABS — UCL et urban centres/localities](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard/asgs/edition-3-july-2021-june-2026/significant-urban-areas-urban-centres-and-localities/urban-centres-and-localities) | Australie | Les UCL servent à l'analyse statistique ; l'ABS déclare ne pas produire de liste officielle de towns and cities | Voir licence ABS ci-dessus ; ne pas transformer la géographie statistique en promesse de nomenclature commerciale | Dépend de l'édition et de la géographie | **DOCUMENTÉ** : limite fonctionnelle ; gate de mapping métier **À TESTER** |
| [Survey Department — Geographical Names Information System](https://app.survey.gov.lk/geoname/), [couche officielle NSDI](https://gisapps.nsdi.gov.lk/server/rest/services/SLNSDI/Survey_50K/MapServer/4), [page GIS Survey](https://survey.gov.lk/sdweb/pages_service_geo_information.php?id=df658590-0a01-4c48-8500-8de7f7d9d0b0) | Sri Lanka | Noms géographiques, towns/places/villages, noms Sinhala/Tamil, années de création/révision et sources dans une couche ArcGIS ; consultation publique | Conditions de redistribution, attribution et garanties non trouvées sur les pages officielles consultées ; [NSDI](https://nsdi.gov.lk/location) affiche « All Rights Reserved » | Une date de mise à jour NSDI est affichée pour les ressources de localisation ; politique de cadence et de version exportable non établie | **NON OBSERVABLE** pour une redistribution commerciale sûre ; ne pas intégrer avant licence écrite/revue juridique et test autorisé |
| [Sri Lanka Open Data](https://data.gov.lk/) et [politique de partage](https://data.gov.lk/about-data-sharing) | Sri Lanka | Portail public et indication générale de disponibilité des jeux de données | « Disponible gratuitement » ne suffit pas à démontrer un droit de redistribution dérivée ; certaines fiches affichent « License Not Specified » | Par jeu de données | **NON OBSERVABLE** sans fiche de licence et conditions propres à la ressource ; ne remplace pas une licence Survey/NSDI |

### Lecture de licence

**DOCUMENTÉ — GeoNames :** la [licence CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permet partage, adaptation et usage commercial, sous attribution et sans restriction supplémentaire. Elle impose toutefois de vérifier les autres droits éventuels et ne garantit ni exactitude ni actualité. La licence du dataset ne prouve donc pas encore que chaque ligne répond au sens produit de « ville ».

**DOCUMENTÉ — France et Australie :** la [Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0) et les [conditions ABS](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer) autorisent la réutilisation lorsque la ressource est bien marquée par cette licence, avec attribution. Les logos, marques, microdonnées et contenus de tiers restent hors de ce périmètre.

**NON OBSERVABLE — Sri Lanka :** aucune licence de redistribution adaptée n'est confirmable pour Survey/NSDI sans revue juridique ou téléchargement/obtention autorisé. « Public », « consultable », « JSON » ou « disponible gratuitement » ne valent pas autorisation de republier une base dérivée.

## 2. Méthode publique GMB/Google Maps compatible avec le parcours

### Parcours retenu

```text
CityIndex (nom + ville)
        ↓
URL Google Maps de recherche
        ↓
sélection humaine de l'établissement exact
        ↓
confirmation/correction par prospect ou propriétaire
        ↓
audit public borné + site officiel
```

**DOCUMENTÉ :** [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) permettent une URL sans clé, notamment `https://www.google.com/maps/search/?api=1&query=...`; un `query_place_id` peut renforcer la précision lorsqu'il est déjà connu. Google indique que la recherche d'une entreprise par nom et ville se fait dans Search/Maps, mais que les résultats dépendent des algorithmes et peuvent évoluer : [aide Google Business Profile](https://support.google.com/business/answer/145585?hl=fr).

**Méthode compatible :** générer la recherche à partir du nom et de la ville confirmés, laisser l'utilisateur sélectionner la fiche, puis recueillir explicitement le nom, l'adresse, le téléphone, le domaine et le lien qu'il confirme. Conserver au minimum la provenance, l'horodatage et le statut de confirmation. En cas de plusieurs candidats, afficher une courte sélection et une correction ; en cas d'absence, restituer `NON_CONFIRMED`, jamais « absence de fiche ».

| Branche | Ce qui peut être observé | Ce qui ne doit pas être déduit ou conservé par défaut | Statut |
|---|---|---|---|
| URL Maps + sélection humaine | L'utilisateur a ouvert la recherche et confirmé ou corrigé une identité | Pas une preuve exhaustive de présence/absence ; pas de copie DOM, capture, avis, photos ou miroir de fiche | **DOCUMENTÉ** pour l'URL ; résultat du parcours **À TESTER** |
| Places API, recherche ciblée ID-only | Un `place_id` et une correspondance limitée, avec field mask ; les IDs peuvent être conservés et rafraîchis | Pas une base locale de fiches ; coût, clé, quota, attribution, conditions de cache et conditions EEE restent applicables | **DOCUMENTÉ** par la [politique Places](https://developers.google.com/maps/documentation/places/web-service/policies) ; activation et coût **À TESTER** |
| Business Profile API | Données de profils auxquels l'utilisateur autorisé a accès | Pas de requête anonyme générale des profils publics ; pas d'audit propriétaire sans OAuth/consentement | **DOCUMENTÉ** par [OAuth](https://developers.google.com/my-business/content/implement-oauth) et la [FAQ Business Profile](https://developers.google.com/my-business/content/faq) |

### Limites contractuelles Google à respecter

**DOCUMENTÉ :** les [conditions Google Maps Platform](https://cloud.google.com/maps-platform/terms) interdisent notamment l'extraction/scraping, le téléchargement en masse, le préchargement, l'indexation, la republication et la création d'une base de données de contenu Maps. Places impose attribution, field masks et règles de conservation ; un `place_id` bénéficie d'une exception de stockage, avec rafraîchissement recommandé si l'ID a plus de douze mois : [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id). Pour un compte facturé en France, les [conditions EEE](https://cloud.google.com/terms/maps-platform/eea) et leurs conditions de service spécifiques doivent être relues avant activation.

La méthode publique retenue est donc une **observation interactive et ponctuelle**, pas une collecte automatisée de GMB. Un audit de métriques, d'avis, d'horaires ou de complétude sans accès autorisé est **NON OBSERVABLE** dans le périmètre sûr.

## 3. Sources autorisées pour les pistes concurrentielles

Une piste est un candidat daté, pas un concurrent établi. Le rapport sépare mesure, observation sourcée, interprétation, suggestion et hypothèse ; il conserve au plus cinq candidats issus de trois intentions locales conformément au périmètre Website Factory déjà documenté.

| Source | Usage autorisé dans le parcours | Provenance / restitution | Statut |
|---|---|---|---|
| Domaine fourni ou confirmé par le prospect/propriétaire | Source première pour nom, offre, zone, contact et pages publiques | URL canonique, date de consultation, faits séparés des inférences ; ne pas recopier du contenu long | **DOCUMENTÉ** comme source première ; actualité des faits **À TESTER** |
| Site officiel découvert puis confirmé | Vérifier l'identité d'un candidat et ses éléments publics | URL officielle + date + éléments minimaux ; un résultat de moteur n'est pas une preuve durable seul | **DOCUMENTÉ** pour l'observation ; confirmation **À TESTER** |
| OSM / Nominatim | Découverte ou géocodage limité déclenché par l'utilisateur, avec attribution | ODbL, attribution OpenStreetMap, lien licence ; revue du share-alike si une base dérivée est redistribuée | **DOCUMENTÉ** sous [politique Nominatim](https://operations.osmfoundation.org/policies/nominatim/) et [règles OSMF](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) ; usage exact **À TESTER** |
| Google Maps public / Places | Lien de handoff ou correspondance ponctuelle compatible avec les conditions Google | Pas de liste concurrentielle durable ni copie de noms/adresses/avis ; attribution et conditions Google si affichage | **DOCUMENTÉ** comme handoff ; redistribution **NON OBSERVABLE / non autorisée par défaut** |
| DataForSEO Business Listings / SERP Maps | Découverte interne potentielle de candidats, sous compte, coût et contrat | Le contrat et les droits de redistribution client doivent être obtenus ; ne pas republier par défaut | Capacité [documentée par le fournisseur](https://docs.dataforseo.com/v3/business_data-business_listings-overview/) ; droit de restitution **NON OBSERVABLE**, activation **À TESTER** |
| Annuaires, réseaux sociaux, agrégateurs non confirmés | Aucun usage comme preuve de concurrence ou de licence de contenu | Sauf autorisation/conditions propres publiées et revue de la source | **NON OBSERVABLE** |

Les règles [robots.txt de Google](https://developers.google.com/search/docs/crawling-indexing/robots/intro) et le [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) encadrent le comportement des crawlers ; ils ne constituent pas une licence de copie, de redistribution ou de réutilisation commerciale du contenu.

## 4. Réévaluation des limites déjà documentées

Cette section réévalue les constats antérieurs de Website Factory par lecture documentaire actualisée ; elle ne les présente pas comme de nouvelles mesures runtime.

### Google Places

**DOCUMENTÉ — constat confirmé, pas une nouvelle mesure :** Places est facturé à la requête/SKU, piloté par field mask et quotas ; il requiert une configuration de projet et des conditions d'attribution/cache. Les résultats ne doivent pas devenir une base locale de fiches. `place_id` est le seul identifiant de conservation durable explicitement documenté, avec contrôle de fraîcheur. **À TESTER :** coût réel, quota du projet, exactité des champs ID-only et comportement du parcours après configuration autorisée.

### Google Business Profile

**DOCUMENTÉ — constat confirmé, pas une nouvelle mesure :** l'API n'est pas un annuaire public anonyme ; OAuth et accès au profil concerné sont nécessaires. Le mode public Website Factory reste une sélection humaine via Maps. **NON OBSERVABLE :** données privées, modifications, réponses aux avis ou exhaustivité d'une fiche sans autorisation du propriétaire.

### OSM / Nominatim

**DOCUMENTÉ — constat confirmé, pas une nouvelle mesure :** Nominatim public impose notamment un User-Agent/Referer identifiable, une cadence maximale d'une requête par seconde, l'attribution et l'absence d'autocomplete ou de collecte systématique de listes de villes/POI. OSM est sous ODbL ; une redistribution d'une base dérivée peut déclencher partage à l'identique ou offre des données. **À TESTER :** classification juridique de l'extrait réellement conservé et acceptation du texte d'attribution dans chaque restitution.

### Screaming Frog

**DOCUMENTÉ — constat confirmé, pas une nouvelle mesure :** l'offre gratuite est limitée à 500 URLs par crawl ; le logiciel est licencié par utilisateur et les conditions interdisent de l'utiliser pour créer un outil/service automatisé accessible à d'autres utilisateurs que l'utilisateur autorisé. **Décision :** crawler HTTP/HTML interne par défaut ; Screaming Frog seulement dans un environnement opérateur, avec licence et confirmation écrite compatible avec le service. **À TESTER :** licence commerciale exacte, nombre d'utilisateurs et périmètre d'automatisation avant tout usage prospect.

Sources : [conditions Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/terms-conditions/), [guide général et limites](https://www.screamingfrog.co.uk/seo-spider/user-guide/general/).

## 5. Provenance, conservation et restitution

### Contrat minimal de provenance

Chaque observation ou sortie doit porter, quand le droit le permet :

- source et URL canonique ;
- type de source (`CITY_DATASET`, `USER_CONFIRMED`, `OFFICIAL_SITE`, `OSM`, `GOOGLE_HANDOFF`, `PROVIDER_API`) ;
- date de publication/mise à jour connue et date de récupération ;
- dataset, version, licence et texte d'attribution applicables ;
- statut de confirmation et date d'expiration ou de revalidation ;
- faits/mesures distincts des calculs, interprétations, suggestions et hypothèses ;
- hash d'un artefact seulement si la licence et la durée de conservation autorisent sa conservation.

**DOCUMENTÉ :** les licences ouvertes exigent l'attribution et interdisent de présenter une source/date de façon trompeuse ; ODbL impose ses obligations lorsqu'une base dérivée est redistribuée ; Google impose ses propres restrictions de contenu et de stockage. **À TESTER :** implémentation effective de ces champs et contrôle automatique avant restitution.

### Conservation par type de donnée

| Donnée | Règle de conservation proposée | Fondement / statut |
|---|---|---|
| Identité saisie et confirmée par l'utilisateur | Conserver seulement pour la finalité annoncée, avec provenance et correction | Principes de finalité/minimisation et absence de durée universelle : [CNIL — durées](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees) et [finalité](https://www.cnil.fr/fr/passer-laction/definir-une-finalite). **DOCUMENTÉ** comme principe ; durée produit **À TESTER** |
| CityIndex sous licence ouverte | Version, source, licence, attribution, date et statut de remplacement ; ne pas écraser silencieusement une version | Exigence de traçabilité déduite des licences et du besoin de revalidation. **À TESTER** dans l'import |
| Google | Par défaut, aucun payload Maps/Places, avis, photo, capture ou copie de fiche dans la base de restitution ; garder seulement ce qui est explicitement permis, notamment l'ID Places quand la branche est activée, ou un handoff ponctuel | Conditions Google. **DOCUMENTÉ** comme contrainte ; durée du lien de handoff **À TESTER** |
| OSM/Nominatim | Attribution visible, licence ODbL et classification de l'extrait/derivé avant export client | [ODbL et FAQ juridique OSMF](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ). **DOCUMENTÉ** ; décision juridique d'un cas concret **À TESTER** |
| Crawl public du site officiel | Rapport et extraits minimaux utiles à la finalité ; brut lourd local chiffré, accès restreint, durée limitée | Décision d'architecture Website Factory. **À TESTER** opérationnellement et juridiquement par marché |
| Données personnelles Sri Lanka / Australie / France | Finalité, minimisation, accès restreint, suppression ou anonymisation lorsque la finalité cesse ; traiter les obligations locales applicables | [OAIC APP 11](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information), [Sri Lanka PDPA](https://www.dpa.gov.lk/acts/Data%20Protection%20Act%20SL%20-%20English%20%282%29.pdf), CNIL ci-dessus. **DOCUMENTÉ** comme obligations générales ; qualification et durée exactes **À TESTER** |

Les durées internes proposées précédemment (démonstration et rapport temporaire, exports lourds locaux chiffrés) sont des **décisions produit à tester**, pas des durées légales universelles. Une suppression doit viser les copies et sauvegardes pertinentes lorsque l'obligation s'applique ; l'événement de suppression peut rester sous forme de journal minimal non personnel.

### Restitution et restauration

Avant restitution, le système doit bloquer ou réduire la sortie si la licence, la provenance, la fraîcheur, l'attribution ou le droit de conservation est manquant/expiré. Le paquet client ne contient que les données du client et les éléments redistribuables ; les payloads Google et les bruts de fournisseur non autorisés restent exclus.

**À TESTER — gate de restauration :** reconstituer une sortie à partir de la version de source, de l'identifiant, de l'horodatage, de l'attribution, du hash autorisé et de l'objet conservé ; signaler explicitement `WAITING_FOR_MAC` si un brut local chiffré est indispensable. L'existence d'un lien HTTP ou d'un objet cloud ne prouve pas à elle seule que la restauration métier est possible.

## 6. Conclusion et gates

| Gate | Condition de passage | État au 27/08/2026 |
|---|---|---|
| G1 — licence CityIndex | Licence et droit de dériver/redistribuer confirmés pour chaque source et marché | GeoNames/INSEE/ABS **DOCUMENTÉS** sous conditions ; Sri Lanka Survey/NSDI **BLOQUÉ / NON OBSERVABLE** |
| G2 — couverture | Import autorisé, schéma, variantes linguistiques, doublons, frontières et villes réellement attendues testés | **À TESTER** ; aucun téléchargement de dataset effectué |
| G3 — handoff Maps | URL nom+ville, sélection humaine, correction et statut `NON_CONFIRMED` testés sans scraping | Modèle **DOCUMENTÉ** ; parcours runtime **À TESTER** |
| G4 — Places | Projet, clé, facturation, quotas, field mask, attribution, conditions France/EEE et rétention approuvés | **NON ACTIVÉ / À TESTER** |
| G5 — Business Profile | OAuth explicite et accès au profil concerné, séparés du mode public | **DOCUMENTÉ** ; non applicable au parcours anonyme |
| G6 — concurrence | Candidat limité, source officielle datée, domaine confirmé, licence de restitution claire | OSM sous conditions ; DataForSEO **NON OBSERVABLE** pour redistribution ; Maps handoff seulement |
| G7 — conservation | Finalité, durée, accès, suppression/anonymisation, sauvegardes et journal de provenance implémentés par marché | Principes **DOCUMENTÉS** ; implémentation **À TESTER** |
| G8 — Screaming Frog | Licence par utilisateur et périmètre d'automatisation compatibles avec le service | **À TESTER** ; ne pas l'activer par défaut |
| G9 — restitution/restauration | Contrôle de licence avant export, attribution, version, hash autorisé et test de restauration | **À TESTER** |

**Décision :** poursuivre l'architecture avec GeoNames comme candidat CityIndex commun et INSEE COG comme enrichissement français ; utiliser ABS uniquement comme enrichissement géographique ; garder Survey/NSDI sri-lankais en consultation bloquée tant qu'une licence écrite ou une licence de ressource explicite n'est pas obtenue et revue. Pour GMB, implémenter le handoff humain Maps et la confirmation progressive ; ne pas créer de miroir public Google. Les branches Places, Business Profile, DataForSEO et Screaming Frog restent hors activation tant que leurs gates propres ne sont pas passés.

## Opérations réalisées et non réalisées

**MESURÉ :** consultation des pages officielles citées et rédaction de ce fichier uniquement.
**MESURÉ :** aucun téléchargement de dataset, appel API, création de clé ou compte, dépense, publication distante, suppression distante ou modification d'Ancrage n'a été effectué.
**NON OBSERVABLE :** couverture réelle, coût/quota, résultat de correspondance Places, capacité de restauration et droit de redistribution Sri Lanka sans test/autorisation complémentaire.
