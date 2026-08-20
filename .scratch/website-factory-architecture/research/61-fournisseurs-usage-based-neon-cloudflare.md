# Validation fournisseurs usage-based — Neon + Cloudflare

Date de recherche : 2026-08-20

## Conclusion

Neon est un bon candidat pour la base relationnelle PostgreSQL du MVP : il expose une API de gestion, des projets/branches/compute et des métriques de consommation. Il convient à une architecture mutualisée et serverless, mais il ne faut pas confondre « usage-based » avec « risque financier automatiquement nul ».

La documentation Neon indique que le spending limit envoie des notifications à 80 % et 100 %, mais ne suspend pas les compute lorsque la limite est atteinte. Le Control Plane doit donc posséder son propre budget bloquant et pouvoir désactiver les appels avant d'atteindre la limite fournisseur.

## Architecture provisoire

- API et orchestration : Cloudflare Workers + Hono ;
- données relationnelles : Neon PostgreSQL mutualisé ;
- médias, screenshots et exports : stockage objet ;
- queues/workflows : services asynchrones usage-based ;
- chaque opération : `CostEvent`, budget, fournisseur, modèle et décision d'autorisation ;
- aucun fournisseur payant activé sans plafond interne et test de comportement au dépassement.

## Sources primaires

- [Neon — API reference](https://api-docs.neon.tech/reference/getting-started-with-neon-api)
- [Neon — consommation par branche](https://api-docs.neon.tech/reference/getconsumptionhistoryperbranchv2)
- [Neon — spending limit](https://api-docs.neon.tech/reference/setorganizationspendinglimit)

## Décisions encore nécessaires

- vérifier le niveau gratuit et ses limites actuelles au moment de créer le compte ;
- tester un arrêt interne avant la limite Neon ;
- mesurer le coût d'une démo réelle ;
- définir le comportement si un fournisseur refuse ou modifie ses quotas.
