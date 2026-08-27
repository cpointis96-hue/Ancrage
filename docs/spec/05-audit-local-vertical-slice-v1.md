# Audit local vertical slice V1

Statut : pré-slice déterministe implémenté ; vertical slice réel et commercialisation non autorisés
Date : 27 août 2026

## Objectif

Fournir le premier contrat exécutable de l’audit SEO local : valider une cible publique, capturer un petit nombre borné de pages HTML, appliquer des règles déterministes, produire des findings avec preuve datée et rendre un rapport HTML échappé.

## Contrat

`validatePublicTarget(target)` vérifie la politique de cible publique. `crawlSite({ target, fetchImpl, lookup, maxPages, maxBytes, timeoutMs })` capture uniquement du HTML même-origin, avec limites de pages/octets et blocage des cibles privées ou redirections interdites. `analyzeSeoAudit({ target, pages, observedAt, maxPages })` applique ensuite les règles aux pages capturées. Une page contient `url`, `status`, `html` et `crawlStatus`.

Le résultat contient `schemaVersion`, `ruleVersion`, `target`, `observedAt`, `status`, `summary`, les pages analysées et les findings. Chaque finding porte `classification: CALCULATED` et un `EvidenceSnapshot` avec identifiant déterministe, URL canonique, date, paramètres sans secret, hash SHA-256 du payload capturé, règle et classe de rétention. Le HTML brut n’est jamais inclus dans le résultat persisté.

## Règles V1

- `MISSING_TITLE`
- `MISSING_META_DESCRIPTION`
- `MISSING_VIEWPORT`
- `MISSING_CANONICAL`
- `MISSING_HTML_LANG`
- `MISSING_STRUCTURED_DATA`
- `MULTIPLE_H1`
- `MISSING_IMAGE_ALT`
- `CRAWL_BLOCKED`
- `PAGE_LIMIT_REACHED`
- `NO_PAGES_CAPTURED`

Les résultats de règles sont des observations calculées. Ils ne concluent ni à un classement, ni à une absence commerciale, ni à une conformité.

## États

- `SUCCEEDED` : les pages reçues ont été analysées dans la limite du profil ; des warnings peuvent rester présents.
- `PARTIAL` : une page est bloquée, la limite de pages est atteinte ou aucune page n’a été capturée.
- `BLOCKED` : réservé aux contrôles d’autorisation de niveau supérieur ; le crawler local représente les erreurs de capture par des pages bloquées et l’audit agrégé par `PARTIAL`.

## Pré-slice couvert

Les tests couvrent sept profils synthétiques : site statique, WordPress, multilingue, JavaScript non rendu, erreurs SEO volontaires, crawl bloqué et absence de données structurées. Le crawler et le service sont testés avec des dépendances réseau injectées. Le rapport est généré par `renderSeoAuditReport(audit)` sans script.

Preuve : `test/audit/seo-audit.test.mjs` et `test/audit/vertical-slice.test.mjs`.

## Intégration Control Plane locale

Le registre `createSeoAuditRegistry` persiste chaque résultat et son rapport séparé sous `audits/<auditId>/`. Une requête peut fournir une clé `Idempotency-Key` (ou `idempotencyKey` dans le JSON) : une reprise avec la même empreinte retourne le même audit sans nouveau crawl ; une empreinte différente est refusée. Les routes locales sont :

- `POST /api/audits/seo` pour lancer un audit borné ;
- `GET /api/audits/seo` pour lister les audits persistés ;
- `GET /api/audits/seo/<auditId>` pour relire le JSON sans HTML brut ;
- `GET /api/audits/seo/<auditId>/report` pour servir le rapport HTML.

Cette intégration ne déclenche rien au démarrage : le crawl n’a lieu qu’à la requête POST. Elle utilise le contrôle d’origine déjà présent sur le serveur local et ne fournit aucune activation DataForSEO, GMB ou livraison client.

## Limites explicites

La résolution DNS/SSRF, le crawl HTTP borné et le même-origin sont couverts au niveau unitaire avec dépendances injectées ; leur validation intégrée sur une cible réelle reste ouverte. La persistance locale du résultat, du rapport et de la clé d’idempotence est couverte ; elle ne constitue pas encore une politique complète de rétention ou de suppression vérifiée. Cette tranche ne réalise pas le rendu JavaScript, Lighthouse, Axe, DataForSEO, GMB, `CostEvent` d’un appel provider, la persistance R2/Neon, la suppression, la restauration ou l’envoi e-mail. Elle ne remplace donc pas le vertical slice autorisé de l’issue 73 et ne constitue pas une capacité commercialisable.
