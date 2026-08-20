# Que devient exactement une démo lorsqu'un prospect achète ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 01-resultat-commercial-unique-du-mvp.md, 03-contrat-de-demo.md

## Question

Après paiement, convertit-on la `Demo` ou une `SiteVersion` existante en production, ou génère-t-on une nouvelle version de production ?

Préciser aussi l'unité commerciale achetée, le moment où apparaît le `Customer`, la relation avec `ProductionSite`, la propriété des contenus et du domaine, et ce qui nécessite une nouvelle validation avant publication.

## Comments

## Decision

Après paiement, la démo validée devient la base d'une `ProductionSite` et d'une nouvelle `SiteVersion` de production. Le client reste propriétaire du domaine et de ses contenus ; le domaine est enregistré ou rattaché seulement après paiement et validation explicite. Toute modification importante repasse par les gates avant publication.
