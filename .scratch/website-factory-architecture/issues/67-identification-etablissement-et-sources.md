# Comment identifier un établissement et son site officiel sans rapprochement fragile ?

Parent: ../map.md
Type: research
Status: open

## Question

Évaluer les sources autorisées pour rapprocher nom, ville, établissement, domaine, téléphone, catégorie, langue et profils publics : couverture Sri Lanka/Australie/France, quotas, coût, conditions d'utilisation, qualité des données, doublons et disponibilité d'une URL officielle.

## Exigence de conception

Le résultat doit être un `EstablishmentMatch` versionné, avec candidats, score de confiance explicable, provenance, contradictions et décision `AUTO_CONTINUE`, `ASK_CONFIRMATION` ou `ASK_MORE_DATA`. Aucun domaine ne doit être inventé ou audité avec une association faible.

## Cas à tester

- établissement unique et fiche publique cohérente ;
- homonymes dans la même ville ;
- plusieurs domaines ;
- fiche sans site ;
- site officiel trouvé ailleurs que dans la fiche ;
- établissement déplacé, fermé ou multilingue.

## Sortie attendue

Rapport primaire sur les sources et restrictions, suivi d'une recommandation de fournisseur ou d'une combinaison minimale de sources. Le scraping contraire aux conditions d'un fournisseur est exclu.

## Decision UX

Si plusieurs fiches correspondent au nom et à la ville, le parcours affiche 2 à 3 candidats avec leur nom, adresse, téléphone et photo lorsque disponibles. Le restaurateur confirme explicitement « C'est mon établissement » avant tout audit GMB, crawl ou enrichissement dépendant de cette identité. Aucun candidat n'est sélectionné silencieusement.

Lorsqu'une seule fiche présente une correspondance forte, le parcours affiche immédiatement le nom de l'établissement, la fiche et une ou deux images disponibles, puis continue automatiquement. Un contrôle discret « Ce n'est pas mon établissement » permet d'arrêter ce rapprochement et d'ouvrir une branche sans fiche confirmée.

La ville n'est jamais acceptée comme texte libre seul : après les premières lettres, le prospect doit sélectionner une ville proposée avec son pays et son identifiant géographique. Cette sélection devient la référence géographique du dossier et réduit les homonymes avant la recherche GMB.

Si aucune fiche GMB fiable ne correspond malgré une ville sélectionnée, le parcours ne redemande pas le nom de la ville. Il demande uniquement l'adresse de l'établissement, puis ouvre l'aperçu local : site officiel si trouvé, mots-clés de la zone, concurrents directs et opportunités SEO local. Le rapport indique explicitement que la partie GMB n'a pas pu être confirmée.

Pour un MVP à faible coût, l'autocomplétion de villes doit privilégier un index local de villes maintenu à partir d'un jeu de données géographiques autorisé. Google Places Autocomplete reste une option de couverture et d'UX, mais avec facturation, attribution et dépendance aux règles Google. L'instance publique Nominatim ne doit pas être utilisée pour l'autocomplétion client ; Pelias ou Photon peuvent être étudiés pour un service auto-hébergé ultérieur.

## Références stratégiques

Le parcours complet est défini dans [87 — Parcours client de référence](../research/87-parcours-client-reference.md). Les règles SEO et la branche locale sans GMB sont consolidées dans [82 — Stratégie SEO Website Factory](../research/82-seo-strategy-website-factory.md).
