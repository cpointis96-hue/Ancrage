# Quelles règles encadrent l'enrichissement automatique à partir du nom et de la ville ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Rechercher les sources officielles, APIs et conditions applicables pour enrichir automatiquement un restaurant à partir de son nom et de sa ville : site public, fiches locales, menus, coordonnées, horaires, photos, réseaux sociaux et autres sources autorisées.

Déterminer : ordre des sources, désambiguïsation lorsque plusieurs établissements ont le même nom, provenance et date d'observation, droits de conservation des données et médias, limites de crawling/rate limiting, consentement, traitement des contradictions et moment où le formulaire progressif doit reprendre la main.

Le système ne doit pas contourner les protections des sites ni présenter une donnée découverte comme un fait validé sans provenance et contrôle adapté.

## Answer

L'enrichissement peut automatiser la recherche de candidats, la normalisation, la désambiguïsation assistée, la lecture de données structurées publiques, la vérification de `robots.txt`, la provenance et la détection de conflits.

Les sources ne sont pas interchangeables : Google Places peut aider à identifier des candidats mais limite fortement le stockage et la réutilisation ; Google Business Profile nécessite une fiche administrée avec autorisation ; Nominatim impose notamment une limite de requêtes, un User-Agent et l'attribution OSM/ODbL ; `robots.txt` encadre le crawl sans constituer une licence de réutilisation.

Menus, textes, logos et photos ne doivent être conservés ou publiés que si les droits ou l'autorisation sont suffisamment établis. La confirmation humaine reste obligatoire lorsque l'identité finale, les horaires, les prix, les allergènes, le menu, les photos, les réseaux sociaux officiels ou un conflit entre sources peuvent affecter la vérité commerciale ou les droits d'usage.

Voir le [rapport de recherche sourcé](../research/20-regles-enrichissement-et-scraping-initial.md).

## Comments

## Extension audit SEO

L'enrichissement ne peut pas choisir silencieusement un domaine à crawler. Pour l'audit SEO, il produit un `EstablishmentMatch` avec candidats, confiance, provenance et contradictions ; le crawl n'est autorisé qu'après le seuil prévu ou une confirmation simple. Voir [67-identification-etablissement-et-sources.md](67-identification-etablissement-et-sources.md) et [69-crawl-securite-isolation-ssrf.md](69-crawl-securite-isolation-ssrf.md).

## Decision

Les sources détaillées restent visibles dans le cockpit. Les audits présentés au restaurateur affichent un résumé compréhensible, la date/source des faits importants et leur niveau de confiance. Les faits, hypothèses, interprétations et suggestions restent séparés.

- La homepage ne demande que le nom et la ville. L'enrichissement doit donc être conçu comme une collecte de candidats et de preuves, jamais comme une validation silencieuse.
- Une source officielle ou administrée par le restaurateur est prioritaire pour les données commerciales finales. Les sources publiques secondaires servent à compléter ou signaler un conflit, pas à écraser une donnée validée.
