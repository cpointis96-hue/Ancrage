# Quelles données peuvent être envoyées à un fournisseur cloud ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir une classification des données avant routage IA : données publiques du restaurant, contenus fournis par le prospect, coordonnées personnelles, photos, secrets, données de paiement, prompts internes, résultats d'audit et informations confidentielles.

Chaque `AIRoutingPolicy` doit indiquer si une catégorie peut rester locale, être envoyée à un fournisseur cloud approuvé, être anonymisée ou être bloquée. Le choix du modèle ne doit donc pas dépendre seulement du coût et de la capacité.

## Recommandation

Autoriser le cloud pour les informations publiques et commerciales nécessaires, sous réserve du fournisseur approuvé et d'une conservation maîtrisée. Garder localement les secrets, tokens, données de paiement, credentials, informations personnelles non nécessaires et éléments internes sensibles. Bloquer par défaut tout ce qui n'a pas de classification.

## Comments

## Clarification de coût

Le stockage cloud de petites données structurées et l'inférence IA cloud sont deux décisions différentes. Les données publiques minimales peuvent être conservées dans la base centrale pour que le service public fonctionne lorsque le Mac est éteint, sans être automatiquement envoyées à un modèle cloud.

La politique MVP recommandée est : modèle local d'abord ; fournisseur cloud désactivé par défaut ; budget cloud à zéro tant qu'un fournisseur et un plafond ne sont pas activés explicitement ; aucune donnée envoyée à un fournisseur simplement parce qu'elle est stockée dans le cloud.

Les credentials restent dans le trousseau macOS/bridge local ou un secret manager adapté, jamais dans la base métier ni dans le navigateur. Le cloud conserve le minimum nécessaire : données structurées, provenance, versions, statuts, coûts et références vers les médias.

## Clarification d'architecture

Le cloud peut recevoir et conserver temporairement les données d'intake lorsque le Mac est éteint, sans les envoyer à un modèle IA. Une `CloudIntakeInbox` chiffrée sert de tampon persistant ; le cockpit déclenche ensuite une synchronisation manuelle et vérifiée vers l'archive locale. Le stockage cloud et l'inférence cloud restent deux décisions distinctes.

## Answer

La politique MVP autorise les providers cloud approuvés uniquement pour les données publiques et commerciales nécessaires. Les données personnelles sont limitées au strict nécessaire ou anonymisées avant routage ; les secrets, credentials, données de paiement et informations internes sensibles restent bloqués hors des prompts et des providers cloud. La `CloudIntakeInbox` peut stocker temporairement l'intake chiffré pour permettre la réception lorsque le Mac est éteint, sans déclencher d'inférence IA.

Décision HITL : choix 1, confirmé le 20 août 2026.

## Clarification de périmètre fournisseur

Cette décision concerne le stockage et le transit minimaux de l'intake, pas l'activation d'un provider d'inférence IA supplémentaire. Pour le MVP, la `CloudIntakeInbox` peut utiliser uniquement l'infrastructure déjà retenue : `Cloudflare` pour l'API, la réception, l'asynchrone et le stockage objet si nécessaire, et `Neon` pour les métadonnées structurées et les statuts. Aucun autre provider cloud ne doit être ajouté pour ces petits volumes sans décision explicite et vérification préalable des quotas, coûts et conditions. Le faible volume ne dispense pas de vérifier les tarifs et limites actuels.
