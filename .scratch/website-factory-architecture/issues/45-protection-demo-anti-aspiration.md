# Comment protéger une démo sans promettre l'impossible ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Étudier les protections réalistes d'une démo publique avant paiement : URL tokenisée et expirante, `noindex`, watermark discret, limitation de débit, détection d'aspiration, quotas, journalisation, séparation des assets et révocation rapide.

Documenter explicitement les limites : un visiteur peut toujours photographier ou capturer son écran, utiliser les outils du navigateur ou recopier ce qui est affiché. Les désactivations de clic droit, sélection ou raccourcis sont des frictions faibles et ne doivent pas dégrader l'accessibilité ni donner un faux sentiment de sécurité.

## Décision attendue

Choisir le niveau de protection acceptable pour préserver la valeur commerciale et les contenus propriétaires sans casser la navigation de la démo.

## Comments

## Answer

Le niveau retenu est une protection de contrôle d'accès, pas une promesse anti-copie : token opaque signé et révocable côté serveur, expiration après sept jours, `noindex`, quotas et rate limiting côté serveur, journalisation minimale et séparation des assets de démo. Un lien R2 présigné est traité comme un bearer token et reçoit une durée plus courte que la démo ; les credentials R2 ne quittent jamais le backend. Une protection par mot de passe serait nécessaire pour une confidentialité forte ; `noindex` seul ne rend pas une URL secrète.

Turnstile peut être ajouté au formulaire si l'anti-abus observé le justifie, avec validation serveur du token. Les contrôles ne désactivent ni la sélection, ni le clavier, ni les raccourcis, ni l'accessibilité. Ils ne prétendent pas empêcher une capture d'écran, les outils du navigateur ou une recopie manuelle.

Décision d'architecture résolue le 27 août 2026. La configuration réelle des tokens, quotas et règles Cloudflare reste une preuve de déploiement à obtenir avant activation.

## Sources primaires vérifiées

- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) : opération ciblée, durée d'expiration et caractère bearer token.
- [Google Search Central, contrôle du contenu partagé](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share) : `noindex` et nécessité d'une autre protection pour le contenu confidentiel.
- [Cloudflare Turnstile, démarrage](https://developers.cloudflare.com/turnstile/get-started/) : sitekey publique, secret serveur et validation côté serveur.
