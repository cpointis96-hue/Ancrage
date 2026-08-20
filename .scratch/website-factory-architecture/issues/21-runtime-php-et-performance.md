# PHP est-il le meilleur runtime pour les sites générés ?

Parent: ../map.md
Type: research
Status: resolved

## Question

L'utilisateur demande que les sites de restaurant soient toujours en PHP pour privilégier la rapidité. Vérifier les compromis réels entre PHP dynamique, PHP avec OPcache et cache de page, pré-rendu de pages PHP, génération de fichiers statiques et éventuel runtime hybride.

Comparer : temps de réponse, coût, simplicité de déploiement multi-tenant, custom domains, SEO technique, mises à jour, observabilité, risque opérationnel et compatibilité avec le renderer `SiteSpec`.

La recherche doit distinguer la vitesse perçue du site, la vitesse du pipeline de génération et la vitesse du serveur. Elle doit aussi vérifier que le serveur PHP choisi est adapté à la production ; le serveur intégré PHP ne doit pas être confondu avec une architecture de production.

## Décision attendue

Déterminer si PHP est une contrainte ferme, un format de rendu, ou une préférence remplaçable par du pré-rendu statique servi depuis un CDN. Documenter le choix sans partir de l'hypothèse « PHP est automatiquement plus rapide ».

## Sources à privilégier

Documentation officielle PHP, documentation officielle du fournisseur d'hébergement/CDN retenu et mesures reproductibles sur un prototype minimal si les documents ne suffisent pas.

## Comments

## Decision

Les sites restent générés en PHP, mais sont servis principalement sous forme de pages pré-rendues, cache et CDN. Les fonctions dynamiques sont séparées et déclenchées seulement à la demande afin que le coût d'hébergement suive autant que possible le trafic réel.

La décision retenue pour Wayfinder est : **PHP reste le runtime cible demandé pour les sites**, mais la performance ne sera pas attribuée au simple fait d'utiliser PHP. Le renderer devra pouvoir produire des pages principalement cacheables et, lorsque possible, pré-rendues ou servies avec cache/CDN. OPcache est une exigence de déploiement à vérifier ; la mesure de référence devra porter sur TTFB, LCP, poids média, cache hit ratio et coût par site.

Le serveur intégré de développement PHP est explicitement hors architecture de production. Une preuve reproductible reste nécessaire avant de figer l'hébergement et le mode de cache.

Voir le [rapport de recherche sourcé](../research/21-runtime-php-et-performance.md).
