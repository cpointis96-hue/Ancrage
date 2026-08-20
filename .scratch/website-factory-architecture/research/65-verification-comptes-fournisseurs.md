# Vérification réelle des comptes et fournisseurs

Date : 2026-08-20
Statut : comptes Cloudflare et Neon vérifiés ; token Cloudflare testé avec succès ; intégrations de déploiement complètes encore à tester

## Audit local effectué

Le repository ne contient actuellement ni configuration de fournisseur, ni `wrangler`, ni package applicatif, ni fichier de credentials/configuration Cloudflare, Neon, Stripe ou Registrar. Aucun secret n'a été lu ni affiché.

Conclusion : les deux comptes sont réellement accessibles dans le navigateur avec l'adresse fournie. Aucun mot de passe, token ou secret n'a été lu, stocké ou créé par l'agent. La vérification des APIs, quotas, coûts et permissions reste à faire dans des projets de test séparés.

## Vérification navigateur du 20 août 2026

- **Cloudflare** : session active ; tableau de bord du compte accessible ; sections `Compute`, `Storage & databases`, `Domains` et `Manage account` visibles.
- **Neon** : session active ; organisation `KAYOK` visible ; plan affiché `Free` ; un projet visible ; pages `Projects`, `People`, `Billing`, `Integrations` et `Settings` accessibles.
- **Non vérifié** : aucun Worker, bucket R2, queue/workflow ou branche de test n'a été créé ; aucun coût n'a été engagé.

## Test réel du token Cloudflare

Le token local `BSF-MVP-test` a été vérifié le 20 août 2026 sans afficher sa valeur :

- statut du token : `active` ; expiration : `2027-01-02T23:59:59Z` ;
- portée compte : un seul compte Cloudflare, `Cpointis96@gmail.com's Account` ;
- lecture de l'endpoint Workers : HTTP `200` ;
- lecture de l'endpoint R2 : HTTP `200` ;
- aucun secret n'a été écrit dans le repository, le terminal ou un artefact.

Cela confirme la validité du token et l'accès API aux surfaces Workers/R2. Cela ne prouve pas encore le déploiement d'un Worker, la création d'un bucket, ni l'accès aux Queues/Workflows.

## Matrice à vérifier

| Fournisseur | Vérifications minimales | Résultat actuel |
|---|---|---|
| Cloudflare Workers | compte, zone, API token limité, Workers, R2, Queues/Workflows, limites et facturation | `ACCOUNT_VERIFIED`; intégration à tester |
| Neon | projet PostgreSQL, région, branche, compute, stockage, connection string, spending alerts | `ACCOUNT_VERIFIED`; organisation/projet visibles; intégration à tester |
| Domaine | compte registrar, disponibilité API, transfert, propriété et renouvellement | à connecter |
| Paiement | pays supportés, moyens de paiement, taxes, webhooks, remboursements et factures | à connecter |
| IA cloud | fournisseur, modèle `small`, coût, données autorisées, budget et arrêt | à connecter |
| Email | domaine d'envoi, SPF/DKIM/DMARC, limites, bounces et désinscription | à connecter |

## Procédure de vérification

1. Connecter un compte fournisseur ou installer le connecteur approuvé.
2. Créer un projet de test séparé du projet de production.
3. Utiliser des tokens à permissions minimales et révocables.
4. Vérifier le quota gratuit, le coût à l'usage et le comportement au dépassement.
5. Exécuter une opération minimale et enregistrer le résultat dans `ProviderConnection`.
6. Tester la révocation, l'erreur de quota et la désactivation.
7. Ne jamais placer les secrets dans le navigateur ou dans un prompt agent.

## Décision de sécurité

Une intégration n'est pas considérée comme « disponible » parce que sa documentation existe. Elle devient `VERIFIED` uniquement après un test réel, un coût attribué, une politique de données acceptée et une capacité de désactivation vérifiée.

## Ce qui reste réellement à faire

1. Créer, manuellement par le propriétaire, un token Cloudflare à permissions minimales et révocables.
2. Créer un projet Neon de test ou confirmer que le projet existant peut servir uniquement au test, puis relever région, branche, compute, stockage et limites.
3. Exécuter un test minimal : migration/table temporaire côté Neon ; déploiement Worker et écriture R2 côté Cloudflare si les produits sont activés.
4. Vérifier les coûts/quotas et supprimer les ressources de test de manière réversible ou contrôlée.
5. Tester ensuite les fournisseurs domaine, paiement, email et IA ; ils ne sont pas encore connectés.

## Sources primaires

- [Neon API reference](https://api-docs.neon.tech/reference/getting-started-with-neon-api)
- [Neon spending limit](https://api-docs.neon.tech/reference/setorganizationspendinglimit)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
