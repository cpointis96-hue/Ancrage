# Séparer les accès publics et opérateur

Type: task
Status: open

## Avancement — 7 novembre 2026

`src/http/hosted-handler.mjs` limite les routes à celles du parcours client. Les listes de demandes, le cockpit, les réglages, la validation opérateur et les fichiers source sont refusés. Chaque demande/préparation utilise un cookie signé HttpOnly/Secure/SameSite ; l’accès à un autre identifiant est refusé. Origin est vérifié. Le worker exige CRON_SECRET. Tests directs passés pour accès croisés, signature altérée, routes privées, worker non autorisé et ressources publiques.

L’entrée `api/index.mjs` utilise le bootstrap Neon et waitUntil pour le traitement après réponse ; vercel.json prépare un passage quotidien de récupération. Restent à vérifier au déploiement : variables serveur, domaine/origine, routage/bundle, cookies réels, limites d’abus et accès opérateur hébergé.

## Question

Comment séparer et authentifier les accès opérateur, publics et clients, avec isolation stricte des données par client ? Définir autorisations, accès aux rapports, quotas et limites d’appels. Le flux Cloudflare doit demander au client une autorisation OAuth révocable, limitée à son compte, Registrar et Pages ; aucun jeton global d’Ancrage ni secret Cloudflare ne doit arriver dans le navigateur. Le serveur loopback ne doit pas être exposé tel quel.
