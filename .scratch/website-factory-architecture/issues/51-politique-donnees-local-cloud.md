# Quelles données peuvent être envoyées à un fournisseur cloud ?

Parent: ../map.md
Type: grilling
Status: open

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
