# À qui appartient le domaine et que reste-t-il au client en cas d'arrêt ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir la propriété du domaine, des contenus, des photos validées, du `SiteSpec`, des traductions et du site publié lorsqu'un client annule son abonnement. Le client doit comprendre ce qu'il conserve, ce qui reste hébergé, ce qui peut être exporté et ce qui dépend du service.

## Recommandation

Le domaine doit être enregistré au nom du client après paiement, même si la plateforme gère techniquement DNS et publication. Les données et contenus validés doivent être exportables dans un format raisonnable. Les templates, outils internes et moteur de génération restent la propriété de la plateforme. Une période de grâce doit permettre de récupérer le domaine et les données sans pression artificielle.

## Comments

## Decision

Le domaine est enregistré au nom du client après paiement. La plateforme automatise autant que possible l'achat, la configuration DNS, le certificat, la publication et le renouvellement, mais conserve des confirmations explicites pour les dépenses et les actions irréversibles. Le client conserve son domaine et ses contenus validés ; la plateforme conserve son moteur, ses templates et ses outils.
