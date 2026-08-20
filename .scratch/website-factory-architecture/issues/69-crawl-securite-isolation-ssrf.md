# Comment crawler des sites publics sans transformer l'audit en surface SSRF ?

Parent: ../map.md
Type: research
Status: open

## Périmètre

Vérifier les contrôles nécessaires avant et pendant un `CrawlRun` : parse stricte HTTP/HTTPS, résolution DNS, blocage des IP privées et réservées, protection DNS rebinding, redirections limitées et revalidées, ports autorisés, limites de taille/durée/CPU/RAM, isolation réseau, téléchargements compressés, JavaScript hostile, secrets dans les logs et nettoyage.

## Politique provisoire

Un domaine fourni ou découvert n'est jamais une autorisation d'accéder à un réseau interne. Le crawl est borné, isolé, identifiable, respecte `robots.txt` par défaut, ralentit sur 429/503 et échoue fermement si une cible devient ambiguë.

## Sortie attendue

Matrice de contrôles et tests négatifs : localhost, RFC1918, IPv6 locale, redirection publique-vers-privée, DNS changeant, URL avec credentials, boucle de paramètres, archive compressée et site anti-bot.
