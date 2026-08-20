# Recherche — PHP et performance des sites générés

Date : 2026-08-17

## Conclusion

PHP est compatible avec l'objectif de sites rapides, mais « PHP = plus rapide » n'est pas une règle suffisante. La bonne décision pour ce produit est de conserver PHP comme runtime cible si c'est une contrainte produit, tout en concevant le renderer pour minimiser le travail par requête : pages cacheables, pré-rendu lorsque possible, cache CDN et images optimisées.

## Faits vérifiés

- La documentation officielle PHP indique qu'OPcache conserve le bytecode précompilé en mémoire partagée et évite de charger et parser les scripts à chaque requête : [PHP OPcache](https://www.php.net/manual/en/book.opcache.php).
- La configuration OPcache distingue notamment l'activation, la mémoire, le nombre de fichiers accélérés et la validation des timestamps ; un déploiement versionné devra donc définir explicitement l'invalidation du cache : [OPcache runtime configuration](https://www.php.net/manual/en/opcache.configuration.php).

## Conséquence architecture

Le `SiteSpec` reste indépendant du renderer. Le renderer PHP peut produire une page dynamique, un artefact PHP optimisé ou un ensemble de sorties pré-rendues selon l'hébergement. Cela évite d'enfermer la promesse de performance dans un framework ou dans un serveur partagé particulier.

## Ce qui doit encore être mesuré

- TTFB et LCP sur mobile réel ou émulation reproductible ;
- poids et dimensions des photos ;
- taux de cache et invalidation après publication ;
- coût mensuel par volume de sites ;
- temps de génération et temps de publication ;
- comportement sur domaine personnalisé et après mise à jour d'une version.

## Limite importante

Le serveur intégré de PHP est un outil de développement, pas une preuve d'architecture de production. Le choix final de l'hébergement, du serveur HTTP, de PHP-FPM éventuel et du CDN reste à traiter dans le ticket fournisseur/cloud.
