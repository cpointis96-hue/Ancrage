# Comment héberger les sites avec un coût presque nul sans visite ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Étudier une architecture où le coût marginal d'un site reste presque nul lorsqu'il n'a pas de trafic, puis augmente principalement avec les visites ou les opérations réellement consommées.

Comparer : fichiers pré-rendus + object storage + CDN ; PHP dynamique avec cache de page ; PHP serverless ou conteneur scale-to-zero ; séparation site public / API / formulaires / chatbot ; coûts de stockage, requêtes, bande passante, cold starts, logs, certificats, domaines et protection anti-abus.

Le choix doit rester compatible avec la contrainte PHP, le multi-tenant, les custom domains, les mises à jour versionnées et un site disponible même lorsque le Mac est éteint.

## Décision attendue

Déterminer si « site en PHP » signifie code source PHP, rendu PHP à la publication ou exécution PHP à chaque requête. Privilégier le mode qui conserve une expérience rapide et fiable tout en évitant de payer un serveur permanent par client.

## Recommandation provisoire

Pré-rendre et mettre en cache tout ce qui est stable ; réserver le calcul dynamique aux formulaires, au chatbot et aux fonctions réellement interactives. Le coût doit être mesuré par site, par visite et par opération, avec quotas et alertes.

## Decision

Les sites sont générés en PHP, mais principalement servis comme des pages pré-rendues et mises en cache. Le CDN sert les pages et les assets ; les fonctions dynamiques sont séparées et appelées uniquement lorsqu'elles sont nécessaires. Cette décision vise le meilleur compromis entre SEO, rapidité, rendu visuel et coût quasi nul sans trafic.

## Comments

## Decision

L'hébergement ne doit pas imposer un serveur mensuel par client. Le site utilise des artefacts pré-rendus, du stockage objet et du cache/CDN ; les fonctions dynamiques restent rares, mesurées et facturées à l'usage.
