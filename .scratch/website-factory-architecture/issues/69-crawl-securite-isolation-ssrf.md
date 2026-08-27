# Comment crawler des sites publics sans transformer l'audit en surface SSRF ?

Parent: ../map.md
Type: research
Status: resolved

## Périmètre

Vérifier les contrôles nécessaires avant et pendant un `CrawlRun` : parse stricte HTTP/HTTPS, résolution DNS, blocage des IP privées et réservées, protection DNS rebinding, redirections limitées et revalidées, ports autorisés, limites de taille/durée/CPU/RAM, isolation réseau, téléchargements compressés, JavaScript hostile, secrets dans les logs et nettoyage.

## Politique provisoire

Un domaine fourni ou découvert n'est jamais une autorisation d'accéder à un réseau interne. Le crawl est borné, isolé, identifiable, respecte `robots.txt` par défaut, ralentit sur 429/503 et échoue fermement si une cible devient ambiguë.

## Sortie attendue

Matrice de contrôles et tests négatifs : localhost, RFC1918, IPv6 locale, redirection publique-vers-privée, DNS changeant, URL avec credentials, boucle de paramètres, archive compressée et site anti-bot.

## Answer

Le crawler est fail-closed et n'est jamais une autorisation d'accès réseau. Avant chaque connexion et après chaque redirection, il valide le schéma, l'absence de credentials, le port, la résolution IPv4/IPv6 et le rejet des plages privées ou réservées. Une résolution différente, une redirection public-vers-privé, une ambiguïté DNS ou une limite dépassée produit `BLOCKED` ou `PARTIAL` sans nouvel appel non autorisé.

Le profil fige URLs, profondeur, workers, durée, taille compressée et décompressée, mémoire, téléchargements, scripts, archives, robots.txt, répertoire isolé et nettoyage. Les logs sont expurgés des secrets. Les tests négatifs de ce ticket deviennent des gates de la section 7 de `docs/spec/02-audit-gmb-seo-borné.md` et doivent être exécutés avant toute activation production.

Décision d'architecture résolue le 27 août 2026 ; la preuve d'exécution reste un gate de vertical slice, pas une autorisation implicite.
