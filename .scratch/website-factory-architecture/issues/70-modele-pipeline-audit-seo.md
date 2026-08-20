# Quel modèle et pipeline pour un audit SEO traçable ?

Parent: ../map.md
Type: grilling
Status: open

## Modèle candidat

`MinimalRequest` → `EnrichmentRun` → `EstablishmentMatch` → `SiteCandidate` → `CrawlRun` → `SEOAudit` → `SEOFinding` → `SEORecommendation` → `SEOReport` → `ReportDelivery`.

Le parcours public expose deux niveaux de restitution : `GMBReportReady` affiche l'audit GMB dès qu'il est validé, pendant que le crawl et les sous-agents SEO continuent ; `FinalReportReady` réunit ensuite l'audit GMB et l'audit SEO dans une présentation complète. Le clic sur le CTA de `FinalReportReady` demande l'e-mail avant de déclencher réellement un `WebsiteFactoryPipelineRun` ; une animation de préparation peut précéder cette demande. L'e-mail sert ensuite à livrer le lien de `Demo` après QA et validation opérateur.

Une branche `LOCAL_PREVIEW_WITHOUT_GMB` est autorisée lorsque la ville a été sélectionnée mais qu'aucune fiche GMB fiable n'est confirmée. Elle exige l'adresse de l'établissement et produit un rapport borné sur le site officiel éventuellement trouvé, les mots-clés locaux, les concurrents directs et les opportunités SEO de la zone. Elle ne présente jamais l'absence de fiche comme une preuve que l'établissement n'en possède pas.

Les relations `Page`, `Resource`, `Link`, `Evidence`, `Metric`, `AgentRun`, `CostEvent` et `AuditEvent` restent séparées. Les données observées, les calculs, les interprétations IA et les limites ne sont jamais écrasés dans une seule ligne ou un texte libre.

## États candidats

`RECEIVED`, `MATCHING`, `CITY_SELECTED`, `CONFIRMATION_REQUIRED`, `LOCAL_PREVIEW_WITHOUT_GMB`, `NO_SITE_FOUND`, `SCHEDULED`, `CRAWLING`, `NORMALIZING`, `RULES_ANALYZED`, `AI_INTERPRETATION`, `QUALITY_REVIEW`, `GMB_REPORT_READY`, `SEO_REPORT_IN_PROGRESS`, `FINAL_REPORT_READY`, `WEBSITE_FACTORY_REQUESTED`, `DELIVERY_PENDING`, `DELIVERED`, `PARTIAL`, `FAILED`, `CANCELLED`.

## Décisions encore ouvertes

- audit séparé ou rattaché à `DemoRequest` ;
- conservation des exports bruts et durée ;
- version et comparabilité des audits ;
- propriété d'un rapport lorsqu'un tiers demande l'analyse ;
- seuils de confiance et transition automatique.

## Références stratégiques

Lire [85 — Pipeline audit vers site](../research/85-pipeline-audit-vers-site-website-factory.md) pour les transitions complètes et [83 — Catalogue des agents](../research/83-catalogue-agents-seo-website-factory.md) pour les contrats d'agents.
