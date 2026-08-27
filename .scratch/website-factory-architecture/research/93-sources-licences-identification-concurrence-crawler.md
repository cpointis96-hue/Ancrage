# Sources, licences et limites pour l'identification locale

Date de vérification : 27 août 2026
Périmètre : villes, établissements, GMB/Google Maps, concurrence locale et crawler

## Décision de cadrage

Le MVP ne doit pas dépendre d'un scraping Google ni de Screaming Frog pour produire sa valeur publique.

Pour les données SERP, mots-clés et concurrence, DataForSEO devient le provider candidat intégré au registre. Il fournit des endpoints distincts pour SERP Google, recherche de mots-clés, concurrents et intersections de domaines ; chaque famille reste soumise à son coût et à son budget.

- **Ville** : index local versionné provenant d'un jeu de données dont la licence de redistribution est explicitement compatible avec le service. Le fournisseur exact reste à choisir par marché.
- **Établissement et GMB** : observation transitoire via une API Google autorisée uniquement si facturation, attribution, politique de conservation et obligations d'affichage sont acceptées. L'API Business Profile n'est pas une source publique de recherche : elle exige OAuth et l'autorisation du propriétaire.
- **Concurrence** : pistes issues d'une source autorisée, jamais concurrent établi par une seule présence cartographique. OSM peut fournir une piste avec attribution et licence ODbL ; le site officiel et la date d'observation doivent confirmer les faits restitués.
- **Crawl SEO** : moteur HTTP/HTML interne borné comme chemin standard. Screaming Frog reste au mieux un outil opérateur exceptionnel, après confirmation écrite de la licence, et ne doit pas être une dépendance commerciale du MVP.

## Faits vérifiés

### Google Places API

Google indique que Places API est facturée à l'usage et nécessite un projet avec facturation et authentification. Les champs demandés doivent être limités par `FieldMask` pour contrôler le coût.

Les résultats Places ne peuvent pas être préchargés, mis en cache ou conservés au-delà des exceptions prévues. Le `place_id` est l'exception explicitement conservable. Les données affichées exigent l'attribution Google Maps ; photos et avis exigent attribution de l'auteur et accès direct au contenu source. Toute restitution persistante doit donc conserver principalement un identifiant autorisé, une référence et une date de revalidation, pas un miroir durable de la fiche.

Conséquence : Places peut alimenter une confirmation interactive et transitoire, mais ne peut pas être traité comme une base métier durable sans revue juridique et de conservation. Le coût doit être préautorisé par run et chaque champ doit être justifié.

### Google Business Profile APIs

Les appels Business Profile exigent un token OAuth 2.0. La documentation suppose que l'utilisateur est connecté, a accordé son consentement et qu'un refresh token a été obtenu. Les données de localisation concernent donc un compte autorisé, pas la recherche anonyme d'un établissement quelconque.

Conséquence : aucune action propriétaire, lecture privée, modification ou vérification de propriété ne doit être ajoutée au parcours public. Le module GMB public doit rester une observation de données autorisées, avec une source et une limite explicites.

### Nominatim et OpenStreetMap

La politique Nominatim publique impose une charge maximale absolue d'une requête par seconde, un `User-Agent` ou `Referer` valide, une attribution claire et la possibilité de basculer de service. Elle déconseille les usages lourds et le géocodage en masse. Les données OSM sont sous ODbL, avec obligation de partage à l'identique selon le cas.

Conséquence : l'instance publique Nominatim est exclue de l'autocomplétion client. Un index local ou une instance contrôlée peut être étudié, avec licence, attribution, mise à jour et plan de remplacement documentés. OSM ne transforme pas une présence cartographiée en preuve de concurrence active.

### Screaming Frog SEO Spider

La documentation CLI exige une première configuration de licence/EULA et fournit un mode headless. L'EULA interdit toutefois l'utilisation du logiciel pour créer un outil ou service automatisé accessible à une personne autre que l'utilisateur autorisé par le licencié.

Conséquence : la licence commerciale et le modèle d'accès du MVP ne sont pas compatibles par défaut avec une exécution multi-prospects exposée comme service. Le crawler interne borné est le chemin de référence ; Screaming Frog ne peut être réintroduit qu'après accord écrit spécifique.

## Architecture recommandée

1. `CityIndex` local pour les suggestions de ville, avec pays, identifiant, source, version et licence.
2. `EstablishmentMatch` alimenté par des sources autorisées, avec `EvidenceSnapshot` transitoire et décision fail-closed.
3. `GMBObservation` séparé, sans prétention d'accès propriétaire et sans copie durable interdite.
4. `CompetitorCandidate` conservé comme piste tant que le site officiel, la date et la source ne corroborent pas le fait.
5. `CrawlRun` interne, HTTP/HTML uniquement par défaut, avec les contrôles SSRF et budgets de la spec 02.
6. `ProviderConnection` Google uniquement après budget, attribution, conditions et conservation approuvés ; aucun secret dans le navigateur.

## Blocages restant à fermer

- sélectionner le jeu de données `CityIndex` pour Sri Lanka, Australie et France et vérifier ses droits de redistribution ;
- décider si le coût et les restrictions Places sont acceptables pour la confirmation interactive ;
- définir la source autorisée de pistes concurrentielles par marché ;
- obtenir une réponse écrite de Screaming Frog si son usage opérateur multi-prospects reste souhaité ;
- tester le moteur interne sur le vertical slice autorisé.

## Sources primaires

- [Google Places API, politiques et attributions](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Places API, usage et facturation](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Google Business Profile, implémentation OAuth](https://developers.google.com/my-business/content/implement-oauth)
- [Google Business Profile, données de localisation](https://developers.google.com/my-business/content/location-data)
- [OSMF, politique Nominatim](https://operations.osmfoundation.org/policies/nominatim/)
- [Screaming Frog, guide général et CLI](https://www.screamingfrog.co.uk/seo-spider/user-guide/general/)
- [Screaming Frog, EULA](https://www.screamingfrog.co.uk/seo-spider/terms-conditions/)

## Statut des preuves

Les règles et restrictions ci-dessus sont vérifiées dans les documents officiels consultés le 27 août 2026. Les prix exacts, quotas de compte, licences de datasets locaux et conditions propres aux marchés ne sont pas encore mesurés. Ils restent des bloqueurs avant activation commerciale.
