# L'usage de Screaming Frog derrière un service automatisé est-il autorisé et rentable ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Vérifier directement auprès de Screaming Frog les droits applicables à une licence payante exécutée en CLI/headless sur un worker isolé pour produire des rapports pour plusieurs prospects : licence, nombre d'instances, exécution cloud, stockage d'exports, redistribution de résultats, limites de concurrence et activation du logiciel.

## Conception à conserver

Screaming Frog reste un composant interne. Le client ne reçoit ni interface, ni licence, ni configuration, ni clé. Les profils de crawl, limites d'URL, durée, taille, débit, robots.txt, user-agent, logs et nettoyage doivent être versionnés et attribués à un `CrawlRun`.

## Alternatives à comparer

- moteur HTTP/HTML déterministe interne pour l'aperçu ;
- Lighthouse/Playwright pour les mesures ciblées ;
- Screaming Frog uniquement pour un audit standard ou avancé ;
- autre crawler licencié ou open source si le modèle de service l'exige.

## Gate

Aucune promesse commerciale reposant sur Screaming Frog ne devient définitive sans confirmation écrite et calcul de coût par audit.

## Recherche capturée

Voir [74-screaming-frog-cli-reference.md](../research/74-screaming-frog-cli-reference.md) pour l'installation macOS, les commandes launcher/headless, les profils, les exports, les limites gratuites et le risque EULA.

Constat actuel : la version gratuite permet jusqu'à 500 URL par crawl, mais ses restrictions sur sauvegarde, configuration et fonctions avancées la rendent insuffisante comme hypothèse implicite du service complet.

## Answer

Screaming Frog est retiré du chemin commercial du MVP. La documentation et l'EULA capturées dans la recherche 93 ne permettent pas de considérer une licence standard comme autorisation d'un service automatisé multi-prospects. Le service utilise donc le crawler HTTP/HTML interne borné ; Lighthouse/Playwright restent des mesures ciblées contrôlées. Screaming Frog peut être lancé uniquement par l'opérateur, avec une licence et un profil explicitement vérifiés, sans exposer son interface, sa clé ou ses exports bruts au prospect.

La question d'une licence adaptée pourra être rouverte avec une réponse écrite du fournisseur, mais elle ne bloque plus la spécification du MVP puisqu'aucune promesse ni étape obligatoire n'en dépend.

Décision documentée le 27 août 2026 à partir de `research/93-sources-licences-identification-concurrence-crawler.md` et `research/74-screaming-frog-cli-reference.md`.
