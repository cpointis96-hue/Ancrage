# Exigences de l’audit hébergé

Status: accepted requirement; implementation pending

Le moteur complet doit fonctionner sans Mac ni cockpit actif. Garder les contrats et résultats du moteur actuel, les statuts partiels explicites, la provenance, les plafonds et l’idempotence.

Acceptation : audit déclenché depuis le site hébergé, Mac éteint ; HTML/PDF récupérables et cohérents ; arrêt/redémarrage du worker puis reprise sans double facturation ; accès privés et secrets protégés ; résultats conservés durablement.

Travaux ouverts :

- [Runtime et persistance](issues/01-runtime-et-persistance.md).
- [Accès publics et privés](issues/02-acces-public-et-prive.md).
- [Validation en ligne](issues/03-validation-en-ligne.md).

Références : [architecture](../../docs/architecture.md), [parcours](../../docs/parcours.md), [décision d’hébergement](../../docs/adr/0001-hosted-audit-engine.md). Le format desktop ou web du cockpit reste indépendant du moteur.
