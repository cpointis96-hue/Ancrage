# Quelles authentifications proposer au moment de l'achat ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

La consultation de la démo ne nécessite pas de compte, mais l'achat et la gestion du site nécessitent un compte. Décider les méthodes proposées : email avec lien magique ou mot de passe, Google OAuth, téléphone/SMS, WhatsApp, ou combinaison progressive.

Il faut éviter de bloquer la démo avec une inscription tout en gardant une identité fiable pour le paiement, le domaine, les factures et le support. Les identités doivent pouvoir être liées sans créer de doublons et sans exposer de secrets au navigateur.

## Recommandation

MVP : email avec lien magique comme méthode universelle et Google comme option rapide. WhatsApp doit d'abord servir de canal de contact, de notification ou éventuellement d'OTP après recherche et consentement explicite ; ne pas promettre un « Login with WhatsApp » tant que la disponibilité, les coûts et les règles du fournisseur ne sont pas confirmés.

## Décision attendue

Choisir si WhatsApp est un canal de notification/contact au MVP ou une méthode d'authentification, et définir les moments où une identité est créée ou reliée.

## Comments

## Decision

Le MVP propose un lien magique par email et Google OAuth. WhatsApp reste un canal de contact ou de notification ; aucune authentification WhatsApp n'est promise avant validation de ses contraintes, coûts et règles.
