# Livrer l'audit local en deux rapports progressifs

Status: accepted

## Decision

Le parcours d'audit produit deux livrables métier dans un même `AuditRun` : un `GMBAuditReport` dès que l'établissement est suffisamment confirmé, puis un `SEOReport` approfondi lorsque le domaine et les données nécessaires sont disponibles. Chaque livraison conserve son statut, sa durée, ses preuves, ses limites et sa référence d'artefact.

## Why

Le premier rapport apporte une valeur visible rapidement et peut être consulté depuis l'interface client pendant que l'analyse plus coûteuse continue. Le second rapport peut intégrer le crawl SEO, les mots-clés et les pistes concurrentielles sans retarder inutilement la première restitution.

## Rejected alternatives

- Un rapport unique monolithique : il retarde la première valeur et mélange des états de disponibilité différents.
- Une étape de workflow par endpoint provider : elle expose l'implémentation, complique les dépendances et rend l'interface illisible.

## Boundaries

Une absence de données ou un échec provider produit `PARTIAL` avec sa cause. Le rapport GMB ne constitue pas une preuve de propriété. Le rapport SEO ne démarre pas sans domaine suffisamment confirmé. La décision ne rend pas commerciales les capacités DataForSEO tant que les gates de coût, licence, quota et restitution ne sont pas fermées.
