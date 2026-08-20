# Quel modèle et pipeline pour un audit SEO traçable ?

Parent: ../map.md
Type: grilling
Status: resolved

## Modèle candidat

`MinimalRequest` → `EnrichmentRun` → `EstablishmentMatch` → `SiteCandidate` → `CrawlRun` → `SEOAudit` → `SEOFinding` → `SEORecommendation` → `SEOReport` → `ReportDelivery`.

Le parcours public expose deux niveaux de restitution : `GMBReportReady` affiche l'audit GMB dès qu'il est validé, pendant que le crawl et les sous-agents SEO continuent ; `FinalReportReady` réunit ensuite l'audit GMB et l'audit SEO dans une présentation complète. Le clic sur le CTA de `FinalReportReady` demande l'e-mail avant de déclencher réellement un `WebsiteFactoryPipelineRun` ; une animation de préparation peut précéder cette demande. L'e-mail sert ensuite à livrer le lien de `Demo` après QA et validation opérateur.

Une branche `LOCAL_PREVIEW_WITHOUT_GMB` est autorisée lorsque la ville a été sélectionnée mais qu'aucune fiche GMB fiable n'est confirmée. Elle exige l'adresse de l'établissement et produit un rapport borné sur le site officiel éventuellement trouvé, les mots-clés locaux, les concurrents directs et les opportunités SEO de la zone. Elle ne présente jamais l'absence de fiche comme une preuve que l'établissement n'en possède pas.

Les relations `Page`, `Resource`, `Link`, `Evidence`, `Metric`, `AgentRun`, `CostEvent` et `AuditEvent` restent séparées. Les données observées, les calculs, les interprétations IA et les limites ne sont jamais écrasés dans une seule ligne ou un texte libre.

## États candidats

`RECEIVED`, `MATCHING`, `CITY_SELECTED`, `CONFIRMATION_REQUIRED`, `LOCAL_PREVIEW_WITHOUT_GMB`, `NO_SITE_FOUND`, `SCHEDULED`, `CRAWLING`, `NORMALIZING`, `RULES_ANALYZED`, `AI_INTERPRETATION`, `QUALITY_REVIEW`, `GMB_REPORT_READY`, `SEO_REPORT_IN_PROGRESS`, `FINAL_REPORT_READY`, `WEBSITE_FACTORY_REQUESTED`, `DELIVERY_PENDING`, `DELIVERED`, `PARTIAL`, `FAILED`, `CANCELLED`.

## Décisions encore ouvertes

- seuils de confiance et transition automatique.

## Décision confirmée

L'audit SEO possède un cycle de vie séparé, lié au `Prospect`. Il peut être produit et livré comme valeur d'acquisition sans créer de site. Une future `DemoRequest` référence ensuite l'audit existant pour alimenter le `WebsiteFactoryPipelineRun`.

Décision HITL : choix 1, confirmé le 20 août 2026.

Le rapport est rattaché au `Prospect` et accessible au demandeur autorisé. Cette attribution ne transfère pas la propriété des données publiques utilisées comme sources ; les droits, corrections et demandes de suppression applicables restent séparés.

Décision HITL : choix 1, confirmé le 20 août 2026.

Chaque audit est immuable et versionné. Une comparaison n’est autorisée qu’entre audits utilisant le même profil, les mêmes règles et un périmètre comparable ; sinon le rapport présente les résultats séparément avec leurs différences de contexte.

Décision HITL : choix 1, confirmé le 20 août 2026.

Les exports bruts sont conservés dans l’archive locale opérateur chiffrée, sans suppression automatique. Le cloud conserve uniquement les artefacts nécessaires au rapport et au support pendant 7 jours, avec lifecycle configurable. Les métadonnées, findings, preuves essentielles et coûts suivent leur propre politique de conservation.

Décision HITL : choix 1, confirmé le 20 août 2026.

## Références stratégiques

Lire [85 — Pipeline audit vers site](../research/85-pipeline-audit-vers-site-website-factory.md) pour les transitions complètes et [83 — Catalogue des agents](../research/83-catalogue-agents-seo-website-factory.md) pour les contrats d'agents.

## Answer

Le modèle d'audit est confirmé : l'audit SEO possède un cycle de vie séparé lié au `Prospect`, ses versions sont immuables et comparables uniquement à périmètre équivalent, et son rapport est accessible au demandeur autorisé. Les exports bruts restent dans l'archive locale chiffrée ; le cloud ne conserve que les artefacts nécessaires pendant 7 jours. Les transitions automatiques sont fail-closed : elles exigent une correspondance forte, une provenance suffisante et l'absence de conflit ; sinon le système demande confirmation, produit un état partiel ou bloque.

Décisions HITL confirmées : choix 1 pour chacun des cinq points, le 20 août 2026.
