# Peut-on réutiliser les photos et avis d'une fiche Google ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Quelles photos, notes et citations peuvent être affichées sur le site d'un restaurant, avec quelle autorisation, attribution, conservation et structure SEO ?

## Findings

Pour découvrir des restaurants à faible coût, l'alternative la plus intéressante est **OpenStreetMap + Overpass** : les données sont ouvertes avec attribution, et Overpass permet des recherches géographiques en lecture seule. Ce n'est toutefois pas une base complète ni garantie : la couverture, les horaires, les menus et les photos varient selon les contributeurs. Les services publics doivent être utilisés avec leurs limites ; pour un usage commercial régulier, il faudra envisager un miroir/extrait contrôlé plutôt que sur-solliciter les instances publiques. [OpenStreetMap](https://www.openstreetmap.org/about/legal), [politique API OSM](https://operations.osmfoundation.org/policies/api/)

**Nominatim** peut servir à géocoder un nom et une ville, mais ce n'est pas un moteur de découverte massif. Il est soumis à une politique d'utilisation et ne doit pas être interrogé en boucle pour constituer une base commerciale. [Nominatim](https://nominatim.osm.org/ui/about.html)

Pour les images réellement réutilisables, une source sous licence explicite comme Wikimedia Commons peut être utilisée avec contrôle de licence et attribution, mais elle fournit rarement les photos authentiques d'un restaurant précis. Elle convient plutôt aux images de contexte : ville, plage, monument, paysage ou cuisine générale. [Wikimedia Commons — réutilisation](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)

La découverte automatique d'une fiche Google peut aider à identifier l'établissement et à proposer des sources, mais Computer Use ou un scraping visuel ne donne aucun droit de republication. « Je peux techniquement prendre l'image » et « je peux légalement la publier sur un site commercial » sont deux choses différentes.

Si des photos ou avis sont obtenus via Places API, Google impose notamment l'attribution de l'auteur, un accès direct à la source Google Maps et des contraintes de stockage/affichage. Les avis traduits doivent être signalés comme traduits. Les règles et les champs peuvent évoluer.

Google indique aussi que le propriétaire ou représentant autorisé doit contrôler les informations de l'établissement et que le contenu du site doit être détenu et géré par le propriétaire. L'utilisation de photos fournies par le restaurant, ou explicitement autorisées par leur titulaire, est donc la voie par défaut.

Les avis ne doivent jamais être présentés comme des témoignages collectés par notre service, ni être modifiés pour changer leur sens. Les données structurées `Review`/`AggregateRating` ne doivent pas servir à fabriquer des étoiles SEO : Google exclut notamment les avis auto-contrôlés par l'entreprise de certaines fonctionnalités d'avis locaux.

## Politique provisoire

- Découverte de restaurants : OSM/Overpass en première source ouverte, puis sources officielles du restaurant et fournisseurs autorisés si nécessaire.
- Sélection visuelle : un agent de vision peut noter netteté, cadrage, authenticité apparente, pertinence du plat, cohérence avec l'établissement et valeur pour l'intention de recherche ; il ne peut pas décider seul du droit de publication.
- Photos authentiques prioritaires : celles fournies par le restaurant ou autorisées par le titulaire ; les images générées par IA ne doivent pas représenter un plat ou un lieu réel comme s'il s'agissait d'une photo authentique.
- Photo Google découverte : référence/provenance seulement, pas publication automatique.
- Photo fournie ou autorisée par le restaurant : publication possible après contrôle de droits et de réalité.
- Avis Google : affichage uniquement avec voie autorisée, attribution, lien source et règles applicables ; sinon synthèse factuelle non présentée comme un avis.
- Aucun faux signal de confiance, aucune copie massive, aucune modification silencieuse.

## Decision — mode de démonstration interne

Pour accélérer les tests commerciaux, le pipeline peut créer un asset temporaire `DEMO_ONLY_UNVERIFIED` à partir d'une image découverte sur une fiche Google ou une autre source, uniquement dans une démo expirante et explicitement marquée comme non transférable en production.

Cet asset doit conserver sa source, son URL, sa date de collecte, l'agent qui l'a sélectionné et son statut de droits. La démo doit être privée, `noindex`, limitée dans le temps, éventuellement filigranée, et l'asset doit être purgé à l'expiration ou à l'abandon.

La conversion vers `PRODUCTION` bloque toute image dont le statut n'est pas `AUTHORIZED`, `OWNED` ou `LICENSED`. Le restaurant doit alors fournir ses propres images ou confirmer une autorisation exploitable. Ce mode permet de tester la valeur visuelle sans transformer automatiquement un contenu tiers en actif commercial permanent.

L'agent de vision peut sélectionner les images les plus nettes, authentiques, pertinentes pour les plats et utiles à l'intention locale. Il ne doit pas altérer une photo réelle de manière trompeuse ni présenter une image générée comme une photo du restaurant.

## Sources primaires

- [Places API — policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Business Profile — ownership guidelines](https://support.google.com/business/answer/13763036)
- [Business Profile — photo guidelines](https://support.google.com/business/answer/6123536)
- [Google Search — LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google Search — review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)

## Decision attendue

Choisir si le MVP interdit toute publication automatique de média/avis provenant de Google tant qu'une autorisation exploitable n'est pas enregistrée.
