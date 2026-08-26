# Comment cadrer le workflow de recherche de domaines `Internet` ?

Parent: ../map.md
Type: task
Status: resolved

## Question

Définir le workflow déterministe, les providers, la configuration des clés, les états et la frontière d'achat de la surface opérateur `Internet`.

## Answer

La surface `Internet` est un outil opérateur de recherche, pas un checkout. Elle suit ce flux :

1. L'opérateur saisit des mots-clés.
2. Un provider de recherche autorisé produit des candidats et, si possible, leur statut de disponibilité.
3. Les candidats sont dédupliqués et normalisés.
4. Les adapters de registrars interrogent indépendamment la disponibilité et les prix d'inscription, de renouvellement et, si disponible, le caractère premium.
5. Le système conserve les réponses datées, les erreurs par provider et la provenance de chaque prix.
6. Un ranking déterministe classe les domaines selon pertinence, lisibilité, TLD, disponibilité, prix initial et coût estimé sur trois ans.
7. La surface affiche le meilleur devis avec les autres devis disponibles dans un détail compact.
8. Le bouton externe ouvre le registrar. Aucun achat, paiement ou checkout n'est exécuté par le backend V1.

### Configuration

- La surface centralise les quatre connexions prévues : `Cloudflare`, `Dynadot`, `NameSilo` et `Name.com`.
- Chaque connexion possède un état `non configuré`, `configuré`, `invalide`, `indisponible` ou `rate limited`.
- Les clés sont saisies dans le cockpit mais ne sont jamais envoyées au JavaScript navigateur, ni écrites dans un bundle ou un prompt.
- Le stockage réel doit réutiliser le bridge local ou le secret manager déjà retenu ; aucune écriture directe en fichier texte depuis le prototype.
- Une clé absente ou un provider en panne dégrade uniquement ce provider et ne bloque pas les autres devis.

### Contrats et états

La configuration est versionnée. Un run en cours conserve la version utilisée. Les états minimum sont `idle`, `loading`, `partial`, `succeeded`, `empty`, `provider_error`, `timeout` et `offline`.

La promesse « gratuit à 100 % » n'est jamais déduite d'un simple compte fournisseur : elle doit être vérifiée par provider avec quota, conditions, devise, prix initial, renouvellement et éventuelle obligation de paiement.

### Frontières

- Aucun LLM ni token IA au runtime.
- Aucune sélection silencieuse d'un domaine devenu indisponible.
- Aucun achat automatique.
- Toute action payante ou irréversible reste une action humaine externe au workflow V1.

## References

- [08 — APIs domaines, SEO, concurrence et provenance](08-apis-domaines-seo-concurrence-et-provenance.md)
- [27 — Registre de configuration et secrets](27-registre-configuration-agents-cockpit.md)
- [36 — Propriété du domaine et sortie](36-propriete-domaine-et-sortie.md)
- [91 — Workflow complet, contrats et cockpit opérateur](../research/91-v1-workflow-contracts-cockpit.md)
