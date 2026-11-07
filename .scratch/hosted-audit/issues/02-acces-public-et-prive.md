# Séparer les accès publics et opérateur

Type: task
Status: open

## Question

Comment séparer et authentifier les accès opérateur, publics et clients, avec isolation stricte des données par client ? Définir autorisations, accès aux rapports, quotas et limites d’appels. Le flux Cloudflare doit demander au client une autorisation OAuth révocable, limitée à son compte, Registrar et Pages ; aucun jeton global d’Ancrage ni secret Cloudflare ne doit arriver dans le navigateur. Le serveur loopback ne doit pas être exposé tel quel.
