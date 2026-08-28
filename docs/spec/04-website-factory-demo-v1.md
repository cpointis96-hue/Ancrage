# Spécification Website Factory, génération de démo et livraison V1

Statut : spécification d'architecture prête pour planification, non commercialisable
Version : 1
Périmètre : rapport final, demande de préparation, génération de site, QA, validation opérateur et livraison de la démo
Hors périmètre : achat, paiement, enregistrement de domaine et publication en production

Cette spec complète [`01-vertical-slice-public-ancrage-v1.md`](01-vertical-slice-public-ancrage-v1.md), [`02-audit-gmb-seo-borné.md`](02-audit-gmb-seo-borné.md) et [`03-website-factory-global-v1.md`](03-website-factory-global-v1.md). Elle ne transforme ni le pré-slice local ni la simulation `client-site-simulation` en preuve de fonctionnement métier complet.

## 1. Autorité, objectifs et frontières

L'ordre commercial normatif est défini par [`87-parcours-client-reference.md`](../../.scratch/website-factory-architecture/research/87-parcours-client-reference.md), détaillé par [`89-parcours-client-complet-arbres-decision.md`](../../.scratch/website-factory-architecture/research/89-parcours-client-complet-arbres-decision.md) et corrigé pour la livraison progressive par [`90-handoff-correction-rapport-gmb-seo-pdf-email.md`](../../.scratch/website-factory-architecture/research/90-handoff-correction-rapport-gmb-seo-pdf-email.md).

Objectifs de cette tranche :

1. livrer le rapport GMB HTML dès `GMB_REPORT_READY` ;
2. laisser l'audit SEO de base démarrer en parallèle de GMB dès que l'identité et le domaine sont confirmés, puis déclencher son enrichissement général avec les données GMB, le site confirmé, les mots-clés, les concurrents et les autres sources autorisées ;
3. composer le rapport final HTML et son PDF après les résultats d'audit ;
4. ne rendre disponible le plan du site qu'après `FINAL_REPORT_READY` ;
5. lancer la génération seulement après le clic `Préparer mon site`, un e-mail valide et la checklist de génération complète ;
6. envoyer une démo seulement après rendu, QA et validation opérateur.

Frontières obligatoires :

- le rapport GMB intermédiaire est un livrable, mais ne donne ni PDF ni CTA de préparation ;
- le rapport final peut être téléchargé sans e-mail, compte ni paiement ;
- `DemoRequest` est créée ou reprise après le CTA et la validation de l'e-mail, même si la préparation reste incomplète ;
- `WebsiteFactoryPipelineRun` ne démarre qu'après complétude du dossier critique, des cinq catégories de photos et des droits requis ;
- le plan de contenu et le `SiteSpec` ne dépendent jamais du seul dossier initial ;
- la démo est distincte de `ProductionSite` et précède tout achat ;
- le paiement, le domaine et la publication sont une tranche ultérieure.

## 2. Acteurs, déclencheurs, préconditions et entrées

| Acteur | Responsabilité | Limite |
|---|---|---|
| Prospect | consulte les rapports, clique le CTA, fournit un e-mail et les corrections demandées | ne déclenche pas une dépense ou une publication de production |
| Control Plane | possède les états, dépendances, preuves, budgets, snapshots et transitions | seule autorité pour démarrer ou clore une étape |
| Agent Plane | produit des contributions structurées à partir de faits autorisés | ne crée pas de fait, de droit, d'identité ou d'autorisation |
| Scripts et services déterministes | composent les rapports, le `SiteSpec`, le rendu et les contrôles | ne contournent pas les contrats ou les gates |
| Opérateur | inspecte l'`AcceptanceReport`, corrige, rejette ou valide la démo | validation explicite obligatoire avant envoi |
| Service d'e-mail | remet le lien privé et les messages transactionnels | ne reçoit pas de secret de workflow ni de données non nécessaires |

Déclencheurs :

- `GMB_REPORT_READY` déclenche la livraison du premier rapport HTML ;
- la fin de l'audit SEO ou de sa branche bornée déclenche la composition du rapport final ;
- `FINAL_REPORT_READY` autorise le CTA et le téléchargement du PDF complet ;
- le clic `Préparer mon site` ouvre la collecte d'e-mail ;
- un e-mail valide autorise la création ou la reprise de `DemoRequest` ; le `WebsiteFactoryPipelineRun` attend en plus la checklist complète ;
- la production de l'`AcceptanceReport` ouvre `READY_FOR_OWNER_REVIEW` ;
- la validation opérateur autorise `READY_FOR_PROSPECT` et l'envoi de la démo.

Préconditions de génération : rapport final présent, dossier critique complet, cinq catégories de photos satisfaites avec droits connus, langue de publication choisie, e-mail syntaxiquement valide et budget gelable. Une donnée contradictoire, un droit inconnu ou une preuve critique absente bloque la génération ou la restitution qui en dépend.

Entrées : `SEOReport` final, `GMBAuditReport` ou rapport local borné, `ProgressiveIntake`, `PhotoAsset`, `Contact`, langue de publication, configurations activées, profil de rendu, profil de QA et enveloppe budgétaire.

## 3. Sorties et artefacts persistés

| Étape | Sorties persistées | Condition de disponibilité |
|---|---|---|
| Rapport GMB | `gmb-report.html`, `GMBAuditReport`, `ReportDelivery` | checkpoint GMB validé |
| Audit SEO de base et général | `SEOAudit`, findings, mots-clés, `CompetitorCandidate`, preuves | base après identité/domaine ; enrichissement général après rapport GMB |
| Rapport final | `seo-report.html`, `report.pdf`, `SEOReport`, manifeste d'expiration | modules disponibles, périmètre, preuves et limites validés |
| Demande de préparation | `DemoRequest`, checklist, contact e-mail | CTA cliqué et e-mail valide, même si la checklist est incomplète |
| Plan et contenu | `content-plan.json`, contributions, `copy-draft.json` | rapport final et snapshot gelés |
| Site | `SiteSpec`, `SiteVersion`, build PHP ou statique | contenu et assets autorisés, schéma valide |
| QA | `qa-results.json`, `AcceptanceReport`, preuves de contrôle | build reproductible et contrôles exécutés |
| Démo | `demo-manifest.json`, lien privé, événement de livraison | validation opérateur explicite |

Les artefacts lourds et les payloads bruts suivent la politique de la spec 02. Le navigateur ne reçoit qu'une représentation autorisée, bornée et signée.

## 4. Séquence et machine d'état

La séquence obligatoire est :

```text
IDENTITY_AND_DOMAIN_CONFIRMED
 -> GMB_AUDIT_IN_PROGRESS || SEO_BASE_IN_PROGRESS || PROGRESSIVE_INTAKE
 -> GMB_REPORT_READY dès disponibilité
 -> SEO_REPORT_IN_PROGRESS avec GMB si disponible + SEO de base
 -> FINAL_REPORT_READY
 -> PREPARING_SITE
 -> EMAIL_REQUIRED
 -> EMAIL_CONFIRMED
 -> PREPARING_SITE / PARTIAL si des éléments manquent
 -> WEBSITE_FACTORY_RUNNING quand le dossier, les photos et les droits sont complets
 -> READY_FOR_OWNER_REVIEW
 -> READY_FOR_PROSPECT
 -> DEMO_PRESENTED
```

Pour une branche sans fiche confirmée, `LOCAL_PREVIEW_WITHOUT_GMB` remplace le rapport GMB mais ne supprime pas l'obligation d'un rapport local final avant le CTA. Pour une branche sans site, `SITE_NOT_CONFIRMED` interdit le crawl ; les mots-clés et concurrents ne sont rendus que comme pistes autorisées et qualifiées.

États transverses : `PARTIAL`, `RETRYABLE_ERROR`, `BLOCKED`, `FAILED`, `RESUMABLE`, `NEEDS_CORRECTION`, `DEMO_TIMEOUT` et `WAITING_FOR_MAC`. Chaque état conserve cause, prochaine action, références de preuve et run concerné.

Transitions interdites :

- `GMB_REPORT_READY` vers PDF ou `Préparer mon site` ;
- rapport final vers plan de contenu sans `FINAL_REPORT_READY` ;
- clic CTA vers génération sans e-mail valide ou checklist complète ;
- e-mail valide vers génération sans snapshot, budget et contrats gelés ;
- build vers livraison sans `AcceptanceReport` ;
- `BLOCK` ou absence de provenance critique vers validation positive ;
- validation opérateur vers paiement, domaine ou publication, qui appartiennent à la tranche suivante.

## 5. Contrats de tranche

### 5.1 Rapport progressif

`GMBAuditReport` contient au minimum l'identité observée, le périmètre GMB, les faits, les limites, les `EvidenceSnapshot`, la version de règle, les dates et l'état de restitution. Il ne revendique pas la propriété de la fiche.

`SEOReport` final contient les modules effectivement exécutés, le site et son périmètre, les findings, les mots-clés, au maximum cinq pistes concurrentielles issues de trois intentions locales, les recommandations, les limites, les preuves, l'expiration et une référence vers le PDF complet.

Les classes de données restent `OBSERVED`, `CALCULATED`, `AI_INTERPRETED`, `SUGGESTED`, `HYPOTHESIS`, `CONFLICT` ou `UNKNOWN`. Les recommandations ne sont publiées que si leurs faits sources sont prouvés et redistribuables.

### 5.2 `DemoRequest` et snapshot

`DemoRequest` référence le `Prospect`, l'audit, le contact e-mail, les consentements séparés et un `inputSnapshotRef` qui reste nullable tant que la préparation est incomplète. Le snapshot est créé et gelé au démarrage du run ; il contient les versions de configuration, règles, prompts, templates, sources, droits d'assets et budget utilisés par le run.

Une même clé d'idempotence avec la même empreinte retourne la même demande ou le même résultat. Une empreinte différente sur une clé existante est refusée. Une `DemoRequest` peut rester `INCOMPLETE` après l'e-mail tant que la checklist n'est pas satisfaite ; elle ne déclenche aucun run de génération dans cet état. Une nouvelle génération après incident utilise une nouvelle clé, un nouveau `DemoGeneration`, une nouvelle deadline et une nouvelle QA ; l'incident initial reste immuable.

### 5.3 Étape de workflow

Chaque étape conserve : `stepId`, `runId`, déclencheur, dépendances, implémentation et version, entrées et sorties, références réutilisées, tentatives, durée, coût, erreur expurgée et hash d'artefact. `promptRef` et `AIExecutionRecord` sont obligatoires uniquement lorsqu'une contribution IA est utilisée.

Le plan de contenu dépend au minimum du `SEOReport` final, du dossier critique et des assets autorisés. Il ne peut pas être déclenché par `dossier-validation` seul.

## 6. Génération Website Factory

Après e-mail valide et checklist complète, le pipeline de génération :

1. gèle les entrées, versions et budgets ;
2. normalise les faits vérifiés et findings ;
3. sélectionne les opportunités de pages ayant une intention et une valeur réelles ;
4. écarte les pages locales artificielles ou sans preuve ;
5. produit le plan et le brouillon de contenu ;
6. sélectionne uniquement les `PhotoAsset` `OWNED`, `AUTHORIZED` ou `LICENSED` pour une version transférable ;
7. traduit seulement vers la langue de publication choisie, avec `TranslationReview` ;
8. compose un `SiteSpec` versionné ;
9. rend un artefact PHP ou statique déterministe ;
10. exécute les gates et crée l'`AcceptanceReport`.

La démo comprend au minimum identité, offre ou menu avec les prix disponibles, horaires, adresse, photos autorisées, coordonnées et un canal de contact réellement disponible. Les pages supplémentaires sont conditionnées par les données et l'intention. Aucune donnée critique n'est inventée.

Un asset `DEMO_ONLY_UNVERIFIED` peut uniquement servir à une démo interne ou explicitement non transférable, avec expiration et purge. Il bloque la conversion en production.

## 7. QA, `AcceptanceReport` et validation opérateur

Les contrôles versionnés couvrent :

- vérité, provenance et cohérence métier ;
- SEO déterministe, liens, données structurées et indexation ;
- intention locale, contenu et absence de pages artificielles ;
- copy, traduction, assets et confiance ;
- rendu visuel, mobile, clavier, accessibilité et parcours ;
- sécurité, permissions, noindex, expiration et budget.

Chaque contrôle produit `PASS`, `WARN` ou `BLOCK`, une preuve, une version de règle et le coût associé. Un `BLOCK` empêche `READY_FOR_PROSPECT`. Un `WARN` est visible et exige la décision de l'opérateur ; il ne disparaît pas automatiquement.

L'`AcceptanceReport` réunit aperçu, versions, sources, droits, coûts, durée, résultats QA, anomalies, screenshots ou preuves de rendu, et décision. L'opérateur peut valider, renvoyer en correction ou abandonner. Une correction crée une nouvelle version ou un nouveau run selon l'impact, puis repasse tous les contrôles nécessaires.

Le hard timeout de génération est d'une heure à partir du démarrage réel. À échéance, le run devient immuable, aucune démo n'est envoyée et une reprise exige une nouvelle enveloppe, une nouvelle deadline et une nouvelle QA.

## 8. Erreurs, partialité, sécurité et provenance

Une branche d'audit indisponible produit un rapport `PARTIAL` ou `BLOCKED` selon la criticité. La branche disponible reste consultable si ses preuves et limites sont valides. Une erreur de provider, de licence, de quota, de sécurité ou de contrat ne devient jamais une donnée synthétique. L'échec du GMB ne doit pas empêcher l'audit SEO de base autorisé, mais l'audit général doit indiquer l'absence du module et rester borné. L'intake peut rester incomplet pour la livraison du rapport ; il bloque toutefois la génération du site tant que les données critiques et les cinq catégories de photos ne sont pas réunies.

Le Control Plane bloque les domaines non confirmés, les sources non redistribuables, les secrets, les assets sans droits, les budgets dépassés et les transitions hors séquence. Les secrets restent hors navigateur, prompts, logs et Git. Les liens de rapport et de démo sont signés, expirants, révocables et `noindex`.

Le rendu ne reçoit que des données autorisées du snapshot. Les contributions IA citent leurs preuves et restent distinguées des observations. Les événements fonctionnels sont idempotents et ne contiennent pas l'e-mail en clair ni les payloads bruts.

## 9. Budget, dépendances et conservation

Le pipeline dépend de la sortie de l'audit final, du dossier complet, du registre de configuration, des templates, du stockage, du service d'e-mail et des contrôles QA. Les providers sont optionnels par capacité et doivent être approuvés, sains, versionnés et budgétés avant appel.

Le `BudgetEnvelope` fige plafond global, budgets par étape et provider, unités locales/cloud, délai et dégradation autorisée. Chaque appel produit un `CostEvent`. Les seuils 50/80/100 % sont observables. À 100 %, aucune option coûteuse ou fallback premium ne démarre ; une branche essentielle ne termine que si son coût restant est connu et sous le plafond dur.

Le rapport HTML et le PDF suivent leur expiration commerciale de sept jours. La démo est accessible sept jours après présentation. Les métadonnées, preuves, coûts, logs, snapshots et incidents suivent des classes séparées. Les exports lourds restent dans l'archive locale chiffrée selon la spec 02. La durée légale finale, la suppression et la restauration par marché restent soumises au ticket 40 et aux gates d'exécution.

## 10. Critères d'acceptation de la tranche

- [ ] Le rapport GMB HTML est visible dès `GMB_REPORT_READY`.
- [ ] Le rapport GMB intermédiaire n'expose ni PDF ni `Préparer mon site`.
- [ ] L'audit SEO de base démarre en parallèle de GMB lorsque l'identité et le domaine sont confirmés, sans attendre les cinq photos.
- [ ] L'audit SEO général attend le rapport GMB ou la résolution explicite de sa branche en `PARTIAL`/`BLOCKED`, réutilise la base et reçoit les données GMB lorsqu'elles existent, ainsi que le site, la concurrence et les mots-clés autorisés.
- [ ] Le rapport final HTML réunit les modules et expose son périmètre réel, ses preuves et ses limites.
- [ ] Le PDF complet GMB + SEO est disponible dès le rapport final, sans e-mail, compte ou paiement.
- [ ] Le plan de contenu ne démarre qu'après `FINAL_REPORT_READY`.
- [ ] Un clic CTA sans e-mail valide ne crée aucun `DemoRequest` exécutable et aucun run de génération.
- [ ] Un e-mail valide peut créer une `DemoRequest` `INCOMPLETE`, mais aucun `WebsiteFactoryPipelineRun` ne démarre avant les données critiques, les cinq photos et les droits requis.
- [ ] Le snapshot, la configuration, le budget et les droits sont gelés avant génération.
- [ ] Un build reproductible produit un `SiteSpec`, un rendu et un `AcceptanceReport`.
- [ ] Un `BLOCK` interdit la présentation et un `WARN` impose une revue opérateur.
- [ ] La démo n'est envoyée qu'après validation opérateur explicite.
- [ ] La démo est privée, `noindex`, révocable, expirante et consultable sans compte ni paiement.
- [ ] Une reprise conserve l'incident initial et ne relance pas silencieusement une dépense.
- [ ] La simulation `client-site-simulation` est identifiée comme non probante tant que son graphe ne respecte pas cette séquence.

## 11. Gates avant planification et production

Avant une implémentation de production, il faut :

1. valider les contrats JSON et la table des transitions dans un vertical slice autorisé ;
2. tester la production du rapport GMB, la dépendance du SEO, le rapport final et le PDF expirant ;
3. vérifier les droits de restitution GMB, DataForSEO, mots-clés et concurrents par marché ;
4. tester idempotence, partialité, budgets, timeout, reprise et conservation ;
5. tester uploads, assets, secrets, tokens, `noindex`, rate limiting et SSRF ;
6. vérifier le rendu mobile, clavier, accessibilité, liens et contenu sur des données autorisées ;
7. exécuter le vertical slice réel de l'issue 73 ;
8. obtenir la revue juridique par marché de l'issue 40 avant toute copy contractuelle ou activation commerciale.

Ces gates sont des preuves à obtenir. Elles ne sont pas remplacées par le pré-slice local ni par la simulation client.

## 12. Écart connu et prochaine tranche

`src/simulation/client-site-simulation.mjs` fait actuellement dépendre `content-plan` de `dossier-validation`, construit le site avant `seo-competition-report`, puis vérifie la qualité après coup. Cette simulation prouve seulement des artefacts synthétiques, une reprise locale et des contrôles de test. Elle ne prouve pas l'ordre métier public, la livraison progressive, l'e-mail, les droits, les providers, la validation opérateur ni la démo avant paiement.

Correction ultérieure séparée : remplacer le graphe de simulation par `identité/domaine → (rapport GMB || audit SEO de base) avec intake en parallèle → audit SEO/concurrence général alimenté par GMB et la base → rapport final → clic + e-mail → complétion du dossier/photos/droits → plan de contenu → SiteSpec/rendu → QA → validation opérateur`, puis ajouter les contrats public-facing et les tests correspondants. Cette correction ne fait pas partie de la présente passe documentaire.

La tranche suivante couvrira l'achat après démo, l'`Account`, le paiement, la `DomainOwnershipVerification`, la `SiteApproval`, la nouvelle `SiteVersion` et la publication `ProductionSite`, avec ses propres gates juridiques et fournisseurs.
