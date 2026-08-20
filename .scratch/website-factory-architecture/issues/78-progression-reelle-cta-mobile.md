# Comment rendre la progression et le CTA honnêtes, rapides et Mobile First ?

Parent: ../map.md
Type: prototype
Status: open

## Parcours cible

Le parcours utilise une page Mobile First avec une progression issue de `ProgressCheckpoint`, pas une animation décorative. Les étapes visibles doivent être compréhensibles par un restaurateur : recherche de l'établissement, enrichissement, audit GMB affiché, audit SEO en cours, rapport final GMB + SEO, préparation du site, contrôle qualité, validation opérateur, e-mail et accès à la démo.

## États de CTA candidats

- `GMB_REPORT_READY` : « Votre audit GMB est prêt — votre audit SEO complet continue » ;
- `SEO_REPORT_READY` : « Votre audit SEO est prêt — découvrez le rapport complet » ;
- `REPORT_READY` après rapport : CTA explicite de confirmation, par exemple « Préparer mon site » ; il ne lance pas le pipeline avant le clic du prospect ;
- `SITE_BUILDING` : « Votre site personnalisé est en préparation » ;
- `READY_FOR_OWNER_REVIEW` : « Votre site est prêt à être vérifié » ;
- `READY_FOR_PROSPECT` : demande d'e-mail puis « Découvrir votre site » ;
- `CONVERTED` : « Mettre votre site en ligne ».

Les textes définitifs doivent rester humains, courts, orientés bénéfice et ne pas faire croire que le site est visible avant l'approbation propriétaire déjà décidée.

## Decision partielle

L'audit GMB est affiché dès qu'il est prêt, tandis qu'une ligne d'avancement explique que l'audit SEO complet continue. À la fin, un rapport final réunit les deux audits. Au clic sur « Préparer mon site », une animation de préparation s'affiche et demande l'e-mail ; aucune création réelle ne commence avant la fourniture d'une adresse valide. La génération démarre ensuite ; après QA et validation opérateur, le lien direct de la démo gratuite est envoyé. Aucun paiement n'est requis pour consulter la démo.

Avant le lancement, une dernière question simple permet au prospect d'ajouter librement une information utile qui n'aurait pas été collectée — par exemple l'histoire du restaurant ou un élément différenciant. La réponse est facultative ; aucune liste de catégories ni étape complexe n'est ajoutée.

## Prototype attendu

Trois variantes mobiles du rapport avec barre d'étapes, état en cours, état partiel, erreur récupérable et CTA au-dessus de la ligne de flottaison. Tester lisibilité, compréhension et clic sans supposer des statistiques universelles de regard.

## Références stratégiques

Le parcours commercial invariant est [87 — Parcours client de référence](../research/87-parcours-client-reference.md) ; la stratégie SEO et le pipeline technique sont [82 — Stratégie SEO Website Factory](../research/82-seo-strategy-website-factory.md) et [85 — Pipeline audit vers site](../research/85-pipeline-audit-vers-site-website-factory.md).
