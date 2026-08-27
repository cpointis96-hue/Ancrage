# Quelles contraintes externes encadrent les domaines, le SEO et la concurrence ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Rechercher dans les sources officielles les APIs, conditions d'utilisation, quotas, prix, droits de conservation et limites de données pour la recherche/enregistrement de domaines, l'audit SEO déterministe et la découverte/synthèse de concurrents.

Déterminer quelles données peuvent être conservées, comment dater et citer leur provenance, et quelles opérations doivent être évitées ou validées humainement.

## Comments

## Decision

La recherche et la disponibilité d'un domaine peuvent être consultées avant paiement. L'enregistrement ou le transfert est déclenché uniquement après paiement et confirmation explicite. Le client reste propriétaire du domaine et doit pouvoir le transférer/exporter.

## Décision complémentaire — provider public prioritaire

DataForSEO devient le provider prioritaire pour les capacités publiques qu'il expose et qui sont utiles à l'audit : SERP Google, résultats Google Maps/local pack, Business Listings, mots-clés, intersections et données OnPage selon le périmètre activé. Les endpoints sont séparés par workflow, coût, quota, provenance et `CostEvent` ; aucun endpoint n'est considéré disponible sans test de compte réel.

L'API Google Business Profile n'est pas utilisée pour rechercher anonymement un établissement : elle est réservée aux fiches possédées ou gérées avec autorisation. Un futur mode propriétaire OAuth pourra l'ajouter, sans modifier le parcours public anonyme.

Vérification documentaire du 27 août 2026 : [DataForSEO Google Maps SERP](https://docs.dataforseo.com/v3/serp-google-maps-overview/), [DataForSEO Business Listings](https://docs.dataforseo.com/v3/business_data-business_listings-overview/), [Google Business Profile policies](https://developers.google.com/my-business/content/policies).

## Recherche consolidée — 27 août 2026

La note [`94-dataforseo-endpoints-prix-limites-provenance.md`](../research/94-dataforseo-endpoints-prix-limites-provenance.md) documente les endpoints retenus, le paiement à l'usage, le minimum public de 50 USD, les limites de requêtes/items/concurrence, les paramètres géographiques, les délais annoncés, la rétention déclarée et les limites de redistribution. Elle confirme la priorité technique de DataForSEO, mais aucun compte, credential, appel payant ou marché cible n'a été testé.

La décision est donc fermée au niveau architecture, pas au niveau activation : Basic Auth reste côté serveur, les paramètres et coûts sont versionnés, les résultats sont des observations datées et non une preuve d'exhaustivité, et les droits de restitution client Google/Maps/Business Listings doivent être obtenus par écrit avant commercialisation. Les gates de compte, couverture Sri Lanka/France/Australie, droits, sécurité et vertical slice restent ouverts.

## Progression technique — 27 août 2026

Les adapters DataForSEO couvrent désormais les chemins documentés retenus : SERP organique et Maps, Local Finder/local pack, Business Listings et catégories, volume/idées/aperçu de mots-clés, concurrents SERP, intersection de domaines, OnPage task et instant pages. Les tests utilisent un transport simulé et vérifient Basic Auth sans exposer le credential. Les appels restent inactifs tant qu'un workflow versionné, un budget et un compte autorisé ne les déclenchent pas.
