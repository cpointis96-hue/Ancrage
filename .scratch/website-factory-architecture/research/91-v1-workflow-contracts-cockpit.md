# V1 — Workflow complet, contrats et cockpit opérateur

Type: architecture opérable et contrat de prototype
Status: proposé pour adaptation du cockpit
Version: 1

## Décision de simplification

Le parcours commercial reste celui de `87-parcours-client-reference.md`. Le cockpit ne présente plus un catalogue d'agents comme si chaque opération était un agent autonome.

- `Control Plane` garde les états, les transitions, les checkpoints, les budgets, la provenance et les reprises.
- Les scripts, fonctions et API exécutent les opérations prévisibles.
- Cinq rôles d'agent maximum produisent une contribution structurée lorsqu'une compréhension, un arbitrage ou une rédaction est réellement nécessaire.
- Une étape est l'unité opérable : elle possède un contrat, une configuration versionnée, une entrée, une sortie, un coût, un journal et une action de reprise.
- Une reprise réutilise les artefacts hashés du dernier checkpoint fiable. Elle ne recollecte pas et ne renvoie pas tout le dossier par défaut.

La surface précédemment appelée `Agents` devient `Configuration`. Elle conserve l'accès aux rôles, mais place l'étape et son prompt au centre, car c'est la question opérateur utile : « qu'est-ce qui s'exécute, avec quelles données et quel résultat ? »

## Règle d'actions et d'iconographie

Le cockpit privilégie les actions icon-only lorsqu'elles peuvent être représentées par un symbole immédiatement évident et intégré au contexte. Les actions secondaires de ligne ou d'inspecteur — ouvrir, copier, dupliquer, tester, modifier, consulter le journal ou relancer — utilisent donc une petite icône discrète plutôt qu'un bouton contenant du texte, avec une cible interactive d'au moins 44 px, un `aria-label` précis et un tooltip au survol ou au focus.

Cette règle ne s'applique pas aux actions principales, destructives, ambiguës ou à conséquence importante : leur libellé reste visible. Une icône seule ne doit jamais masquer la nature d'une décision opérateur, notamment `rejouer`, `reprendre`, `corriger puis tester` ou `bloqué`.

## Workflow de bout en bout

| ID | Étape et déclencheur | Exécution retenue | Entrées | Sorties persistées | Réutilisée par |
|---|---|---|---|---|---|
| S0 | Intake, dès `Nom + ville sélectionnée` ou nouvelle demande synchronisée | API, `CityResolver`, validation schéma | nom, ville ID, langue, contact si connu | `intake.json`, `city-selection.json` | S1, dossier cockpit |
| S1 | Identification automatique après S0 | `EstablishmentMatcher` seulement pour classer les candidats ambigus ; recherche déterministe avant | `city-selection.json`, nom, sources publiques | `establishment-match.json`, `candidate-sources.json` | S2, rapport |
| S2 | Dossier, après match fiable ou adresse fournie | API, `AddressResolver`, `SiteDiscoverer`, import R2, normalisation | match, adresse, formulaire progressif, 5 photos et droits | `business-facts.json`, `sources.json`, `assets-manifest.json`, `completeness.json` | S3, S4, S6 |
| S3 | Audit local visible dès que le dossier critique est disponible | `GMBObserver` et règles de provenance ; `AuditAnalyst` uniquement pour interprétation bornée | faits vérifiés, sources, match | `local-audit.json`, `local-report.json` | S5, S6 |
| S4 | Audit SEO, après URL autorisée ou branche sans GMB | `CrawlOrchestrator`, `TechnicalSEOAnalyzer`, `ContentSEOAnalyzer`, fonctions de mesure | URL, crawl profile, faits, pages, limites de collecte | `crawl/`, `technical-findings.json`, `content-findings.json`, `intent-evidence.json` | S5, S6 |
| S5 | Rapport final, quand S3 et S4 sont disponibles ou explicitement limités | `AuditReportComposer` déterministe, `ReportExplainer` si une formulation est nécessaire | audits, preuves, limites | `seo-report.json`, `seo-report.html`, `report.pdf` | S6, décision prospect |
| S6 | Préparation du site, seulement après clic prospect et e-mail valide | Control Plane, gel de snapshot et versions | rapport, e-mail, consentements, artefacts S0-S5 | `pipeline-input.json`, `run-manifest.json` | S7-S10 |
| S7 | Plan et contenu, après gel S6 | `ContentPlanner` et `Copywriter` ; modèle choisi explicitement dans l’étape | faits vérifiés, rapport, intentions, assets autorisés | `content-plan.json`, `copy-draft.json` | S8 |
| S8 | SiteSpec et rendu, après S7 | `AssetCurator`, `SiteSpecComposer`, renderer PHP/static | contenu approuvé, assets, règles SEO, template | `assets-selected.json`, `site-spec.json`, `build/` | S9 |
| S9 | QA, après build | scripts liens/HTML/accessibilité/mobile/sécurité/coût, `AcceptanceReviewer` pour les cas ambigus | build, SiteSpec, preuves et budget | `qa-results.json`, `acceptance-report.json` | S10, correction |
| S10 | Validation opérateur et livraison | Control Plane ; aucun agent | acceptance report, warnings, version, coût | `owner-decision.json`, `demo-manifest.json`, e-mail préparé | démo privée, puis paiement |

Branches obligatoires : `S1` peut produire `LOCAL_PREVIEW_WITHOUT_GMB`, `S2` peut rester `PARTIAL`, et `S9` peut être `BLOCK`. Ces branches conservent les mêmes contrats et n'inventent jamais une donnée absente.

## Contrat commun d'étape

Chaque étape expose dans `step-run.json` :

```json
{
  "stepId": "S4",
  "runId": "RUN-024",
  "status": "SUCCEEDED",
  "trigger": "checkpoint:S2",
  "implementation": {"kind": "script", "name": "crawl-and-audit", "version": "v1"},
  "promptRef": null,
  "inputRefs": ["business-facts.json", "sources.json"],
  "outputRefs": ["crawl/", "technical-findings.json"],
  "reusedRefs": ["establishment-match.json"],
  "nextSteps": ["S5"],
  "attempts": [{"number": 1, "startedAt": "...", "endedAt": "...", "status": "SUCCEEDED"}],
  "cost": {"mode": "local", "amount": 0, "currency": "EUR"},
  "error": null,
  "outputHash": "sha256:..."
}
```

`promptRef` est obligatoire uniquement pour une contribution IA. La version est gelée dans le `run-manifest.json`; modifier un prompt crée une nouvelle version et n'altère jamais un run en cours.

## Rôles réellement conservés

1. `EstablishmentMatcher` : classe les candidats ambigus après la recherche déterministe.
2. `AuditAnalyst` : interprète des faits et preuves déjà collectés, sans devenir la source de vérité.
3. `ContentPlanner` : transforme les opportunités vérifiées en plan de contenu borné.
4. `Copywriter` : rédige les textes à partir du plan et des faits approuvés.
5. `AcceptanceReviewer` : signale les cas ambigus ou les incohérences avant la décision opérateur.

Les anciens noms de collecteurs, crawlers, validateurs et composers restent des implémentations, fonctions ou contrôles dans les étapes. Ils ne sont pas des agents visibles séparés dans la V1.

## Organisation de Configuration

Onglets conservés :

- `Étapes` : catalogue opérable S0-S10, dépendances, scripts, entrées, sorties et relance.
- `Rôles` : les cinq contributions IA et leur frontière.
- `Prompts` : tous les prompts, étape propriétaire, schéma, modèle, version active, brouillon, test et diff.
- `Contrats` : schémas JSON et règles de validation entre étapes.
- `Routage & outils` : scripts, APIs, modèles autorisés, politique local → cloud approuvé → humain.
- `Versions` : versions activables et impact sur les futurs runs.

Les onglets `Workflow`, `Instructions`, `Contrat`, `Outils`, `Exécution`, `Budget` et `Runs` ne sont pas supprimés fonctionnellement : ils sont fusionnés dans les six vues ci-dessus afin d'éviter neuf inspecteurs qui répètent les mêmes données.

## Reprise et visibilité dans Runs

La liste affiche l'établissement, le run, l'étape, le statut textuel, le dernier checkpoint, le coût observé et l'action disponible. Le détail affiche une ligne par étape. Chaque ligne ouvre son contrat complet et possède une petite action `↻` avec le libellé accessible `Relancer S4 depuis son dernier checkpoint`.

Une reprise :

1. vérifie que les dépendances et hashes existent ;
2. réutilise les sorties valides ;
3. crée une nouvelle tentative liée au même run, ou un nouveau `DemoGeneration` après timeout selon la politique existante ;
4. gèle la configuration et le prompt utilisés ;
5. écrit les logs, erreurs, coûts et artefacts sans écraser la tentative précédente.

Le cockpit doit distinguer `rejouer`, `reprendre`, `corriger puis tester` et `bloqué`. Une icône seule ne porte jamais cette décision.

## Capacité déterministe `Internet`

La surface `Internet` s'inscrit dans le même contrat d'étape que les autres outils du cockpit. Elle ne constitue pas un agent et ne consomme aucun token IA.

Son workflow est décrit dans [92 — Workflow recherche domaines Internet](../issues/92-workflow-recherche-domaines-internet.md) : candidats, disponibilité, devis indépendants par registrar, provenance datée, ranking explicable, affichage partiel et achat externalisé. La configuration des connexions réutilise le registre sécurisé existant ; elle ne crée pas un second système de clés.

La recherche peut précéder le paiement. L'enregistrement ou le transfert reste hors du backend V1 et exige une action humaine explicite chez le registrar.
