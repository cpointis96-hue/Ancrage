# Comment livrer le rapport rapidement et coordonner les agents parallèles ?

Parent: ../map.md
Type: grilling
Status: resolved

## Parcours provisoire

`MinimalRequest (nom + ville sélectionnée)` → enrichissement et intake progressif (photos en parallèle) → audit GMB || audit SEO de base → rapport GMB dès disponibilité → rapport SEO complet → clic sur le CTA de préparation du site → animation de préparation et demande d'e-mail → complétion du dossier/photos/droits → génération réelle → QA → envoi du lien de démo validée.

Le navigateur n'est pas le stockage : il consulte un rapport hébergé dans R2 derrière une URL privée signée et expirante. Les exports lourds restent dans l'archive locale opérateur selon le ticket 76.

## Parallélisation retenue

Après validation suffisante de l'identité et du domaine lorsqu'il est nécessaire, lancer en parallèle les branches disponibles. Le `ProgressiveIntake` et les photos peuvent continuer sans bloquer ces audits :

- observation GMB publique ;
- audit SEO de base du site, avec crawl HTML borné et mesures déterministes.

Les sondes de disponibilité, la préparation du crawl, les mesures, la provenance et les coûts peuvent être préparés dans ces branches. L'observation GMB produit `GMB_REPORT_READY` dès que son rapport HTML est validé et le rend visible au prospect. L'audit SEO général poursuit alors son enrichissement avec les données GMB, le site, les résultats de base, la concurrence et les mots-clés DataForSEO autorisés. Le rapport final est composé après cette étape ; le plan de contenu ne peut démarrer qu'après `FINAL_REPORT_READY`.

Après normalisation, exécuter en parallèle les règles déterministes par famille : indexabilité, contenu, liens, images, données structurées, performance et local. Les agents ne reçoivent que les findings pertinents ; une synthèse finale attend les preuves et le contrôle de cohérence.

## Extension Website Factory

Une fois le rapport final disponible et le prospect ayant cliqué sur le CTA puis fourni un e-mail valide, une `DemoRequest` de préparation peut être créée ou reprise, même si sa checklist est incomplète. Le second `PipelineRun` ne lance les contributions nécessaires au site qu'après complétude du dossier critique, des cinq catégories de photos et des droits : profil métier, contenu, traduction et sélection d'assets à partir des résultats d'audit déjà produits, puis composition du `SiteSpec`, rendu déterministe et QA. Les études générales de marché restent hors du MVP ; seules les recherches utiles à cet établissement alimentent sa démo.

Si aucune fiche GMB fiable n'est confirmée, le pipeline d'audit ne s'arrête pas : après collecte de l'adresse de l'établissement, il produit un aperçu local borné avec site officiel si disponible, intentions de recherche, mots-clés observés, concurrents directs et opportunités SEO local. La même branche peut ensuite proposer « Préparer mon site » sans demander une nouvelle fois les informations déjà fournies.

Le frontend reçoit les `ProgressCheckpoint` du Control Plane. Un agent ne peut pas déclarer à lui seul qu'une étape est terminée : l'étape devient visible comme terminée après validation du contrat, de la sortie et de ses preuves.

## Routage coût/vitesse

- code classique pour découverte, parsing, règles et agrégations ;
- petits modèles rapides pour classification et reformulation simple ;
- modèle plus capable seulement pour les cas ambigus ou la synthèse finale ;
- aucun agent supplémentaire si une règle déterministe suffit ;
- budget et timeout par branche ; état partiel explicite si une branche échoue.

## Contradiction à résoudre

La règle existante exige une validation du propriétaire avant de présenter une `Demo`. Le rapport peut être livré automatiquement, mais le CTA vers le site doit-il lancer la génération sans action supplémentaire, ou demander une confirmation au prospect ?

## Decision

Le rapport est rendu progressivement. Dès que l'audit GMB est terminé, il est affiché au prospect avec une ligne d'avancement indiquant que l'audit SEO complet continue. Quand cet audit est terminé, un rapport final réunit proprement les résultats GMB et SEO. Le clic sur son CTA affiche une animation de préparation et demande l'e-mail ; la `DemoRequest` peut rester incomplète pendant la collecte des photos et informations, et le second `PipelineRun` Website Factory ne démarre qu'après réception d'une adresse valide et complétude de la checklist. Après génération, QA et validation opérateur, le lien de la démo gratuite est envoyé. Le paiement n'est requis qu'ensuite, si le prospect veut mettre le site en production.

## Références stratégiques

Le parcours invariant est [87 — Parcours client de référence](../research/87-parcours-client-reference.md). Les rôles d'agents et le pipeline complet sont dans [83 — Catalogue des agents](../research/83-catalogue-agents-seo-website-factory.md) et [85 — Pipeline audit vers site](../research/85-pipeline-audit-vers-site-website-factory.md).

## Answer

La coordination retenue est bornée par les dépendances : l'identité et le domaine sont validés avant les collectes qui les nécessitent ; l'observation GMB et l'audit SEO de base démarrent en parallèle ; le `ProgressiveIntake` peut progresser en parallèle ; le rapport GMB est livré dès son checkpoint ; l'audit général réunit ensuite GMB, site, base SEO, concurrence et mots-clés ; les règles déterministes précèdent toute interprétation IA ; le rapport final attend les preuves et la revue de cohérence. Chaque branche publie son propre `ProgressCheckpoint`, budget, timeout et état `PARTIAL` éventuel. Le frontend ne déduit jamais la progression d'une animation.

Le rapport GMB peut être livré dès son checkpoint, mais le PDF et `Préparer mon site` attendent le rapport final. Ce CTA demande ensuite un e-mail valide et ouvre une préparation qui peut rester incomplète ; le second `PipelineRun` attend en plus le dossier, les cinq photos et les droits requis. QA et validation opérateur précèdent toujours l'envoi de la démo. La décision résout la contradiction de séquencement ; l'implémentation et la mesure de latence restent couvertes par le vertical slice.

Décision consolidée le 27 août 2026 dans les sections 1, 4 et 13 de `docs/spec/02-audit-gmb-seo-borné.md`.
