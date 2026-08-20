# La démo doit-elle être accessible sans compte ni paiement ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Après le nom + la ville et le dossier nécessaire, le prospect doit-il recevoir un lien de démo navigable sans créer de compte ni saisir de carte, ou faut-il imposer une identification avant l'accès ?

La démo doit rester protégée par un token expirant, `noindex`, quota et contrôle d'accès léger. L'objectif est de maximiser la découverte du site avant paiement sans transformer la protection en friction commerciale.

## Recommandation

Lien tokenisé sans compte ni carte pour la première consultation, avec email ou téléphone demandé seulement pour envoyer le lien, prévenir de l'expiration et permettre le suivi commercial. La création de compte complet intervient après achat.

## Décision attendue

Fixer le niveau de friction acceptable, la durée du lien, les événements de consultation et les données de contact nécessaires.

## Comments

## Decision

La première démo est accessible sans compte ni carte bancaire via un lien privé tokenisé. L'e-mail est demandé au clic sur « Préparer mon site », avant la création réelle, afin d'éviter de générer une démo orpheline ; il sert ensuite à envoyer directement le lien. Le lien est expirant, `noindex`, limité et révocable ; il reste accessible sept jours après présentation. Le compte complet et l'achat interviennent seulement si le prospect souhaite mettre le site en production.
