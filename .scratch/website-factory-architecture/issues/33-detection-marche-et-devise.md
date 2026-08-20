# Comment choisir le marché et la devise affichés sur la page des offres ?

Parent: ../map.md
Type: prototype
Status: resolved

## Question

Tester l'affichage des trois offres pour un visiteur en Australie, au Sri Lanka ou en France. Comparer une détection automatique du pays, un sélecteur manuel, une préférence mémorisée et une combinaison des trois.

La devise et la fiscalité affichées doivent être compréhensibles et ne pas changer de manière surprenante à cause d'un VPN, d'un voyage ou d'un réseau mobile. La page doit toujours permettre de voir le pays, la devise, la périodicité, les taxes incluses ou non et ce qui est payé séparément.

## Recommandation

Détection automatique comme proposition initiale, sélecteur manuel toujours visible, préférence mémorisée et confirmation du marché au checkout. Ne jamais cacher le prix de référence ni modifier une offre déjà souscrite.

## Decision

Le site détecte le marché comme proposition initiale, mais laisse toujours le visiteur choisir manuellement son pays/devise. La sélection est mémorisée et confirmée avant paiement ; une souscription existante conserve son marché et son prix contractuel.

## Comments
