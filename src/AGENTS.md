# Assemblage et démarrage
Périmètre : app.mjs et server.mjs ; déléguer la logique métier aux consignes du module.
Entrée : dataDir, secretStore, adapters, opener, runners injectés ; PORT au démarrage. Sortie : services + ready, serveur loopback.
Préserver injection, API et migrations des configurations actives. Aucun seed ne doit écraser un brouillon personnalisé.
Cible audit : exécution entièrement hébergée, indépendante du cockpit ; bootstrap de développement distinct du déploiement.
Vérifier démarrage, tests HTTP et e2e.
