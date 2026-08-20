# Recherche — autocomplétion de ville et branche sans fiche GMB

Date : 2026-08-20
Statut : recherche Wayfinder

## Conclusion

Le produit doit accepter une ville uniquement après sélection d'une suggestion structurée. Pour un MVP à faible coût, un index local de villes issu d'un jeu de données géographiques autorisé est plus simple qu'un appel fournisseur à chaque frappe. GeoNames propose des services d'autocomplétion et des exports de données de lieux ; ses services gratuits sont adaptés au prototypage et aux petits usages, tandis que la continuité professionnelle doit être vérifiée séparément : https://www.geonames.org/export/web-services.html et https://www.geonames.org/services.html

Google Places Autocomplete fournit exactement le comportement de saisie progressive, avec filtrage par type `(cities)`, pays, biais géographique et restriction géographique. L'API impose cependant des règles d'affichage/attribution et fonctionne selon un modèle d'usage ; les sessions et les champs demandés doivent être maîtrisés : https://developers.google.com/maps/documentation/places/web-service/place-autocomplete et https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

L'API publique Nominatim n'est pas adaptée à cette autocomplétion produit : sa politique interdit explicitement l'auto-complétion côté client et limite fortement l'usage. Un service Nominatim auto-hébergé est une autre situation, mais ajoute une responsabilité d'exploitation : https://operations.osmfoundation.org/policies/nominatim/

Pelias documente un endpoint d'autocomplétion avec limitation de débit et possibilité de focaliser les résultats ; Photon est un géocodeur open source basé sur les données OpenStreetMap. Ils sont pertinents pour un service auto-hébergé, pas comme dépendance publique gratuite non contrôlée : https://github.com/pelias/documentation/blob/master/autocomplete.md et https://github.com/komoot/photon/blob/master/docs/api-v1.md

## Parcours sans fiche GMB

Une ville sélectionnée donne une référence géographique fiable, mais ne prouve pas l'existence ni l'absence d'une fiche GMB. Si aucune fiche n'est confirmée, l'adresse de l'établissement devient le seul complément obligatoire. Le rapport doit alors fournir un aperçu local borné : site officiel éventuellement identifié, mots-clés et intentions de recherche, concurrents directs et opportunités de SEO local. Il doit signaler clairement la limite GMB et ne pas promettre une étude de marché exhaustive.
