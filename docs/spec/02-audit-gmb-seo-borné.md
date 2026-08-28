# Spec de travail : audit GMB puis SEO/concurrence borné

Statut : architecture acceptée ; activation commerciale conditionnée aux gates de validation
Périmètre : valeur d'audit publique, sans génération de site ni paiement
Références : `map.md`, tickets 25, 26, 67, 68, 69, 70, 71, 72, 73, recherches 89 et 94–97

## 1. Objectif et ordre obligatoire

Le parcours fournit une valeur d'audit local sourcée avant toute demande de paiement. Il suit cet ordre :

```text
nom + ville structurée
  -> rapprochement prudent
  -> confirmation ou branche locale
  -> domaine confirmé, si disponible
  -> audit GMB public
  -> audit SEO borné et concurrence locale
  -> rapport final
```

L'audit GMB est affiché dès que son checkpoint est validé. Les collectes techniques indépendantes peuvent être préparées après confirmation de l'identité et du domaine, mais l'audit SEO complet, la concurrence et les mots-clés démarrent après ce rapport GMB et consomment ses données avec celles du site et les autres sources autorisées. Le rapport final réunit ensuite les modules sans présenter une branche absente comme négative ou inexistante.

## 2. Entrées et branches

### Entrées minimales

- `name` non vide ;
- `cityId`, `cityLabel`, `country` issus d'une suggestion structurée ;
- adresse uniquement si l'identité GMB n'est pas confirmée ;
- domaine uniquement après confirmation suffisamment forte et provenance associée.

### Branches

| Situation | GMB | SEO | Concurrence locale |
| --- | --- | --- | --- |
| Fiche confirmée, domaine confirmé | audit public | crawl borné | cinq pistes maximum, trois intentions |
| Fiche confirmée, aucun domaine fiable | audit public | `SITE_NOT_CONFIRMED` | opportunités locales bornées |
| Fiche non confirmée, domaine confirmé | `GMB_NOT_CONFIRMED` | crawl borné | cinq pistes maximum, statut de source explicite |
| Ni fiche ni domaine confirmés | `GMB_NOT_CONFIRMED` | `SITE_NOT_CONFIRMED` | aperçu local borné seulement |

Une absence de résultat ne prouve jamais une absence réelle. Toute branche partielle expose les modules disponibles, manquants, cause, date et prochaine action.

## 3. Contrat de provenance

Toute observation ou affirmation exposée doit référencer un `EvidenceSnapshot` immuable contenant au minimum :

```text
id, sourceType, provider, canonicalUrl, observedAt,
requestParametersSansSecret, rawPayloadHash, ruleVersion,
licenseOrTermsRef, retentionClass, expiresAt
```

Les classes sont `OBSERVED`, `CALCULATED`, `AI_INTERPRETED`, `SUGGESTED`, `HYPOTHESIS`, `CONFLICT` et `UNKNOWN`. Une sortie IA ne peut pas promouvoir une classe vers `OBSERVED`. Une recommandation concurrentielle ou commerciale n'est publiée que si chaque fait sous-jacent est prouvé et si la politique de licence autorise sa restitution.

## 4. Modèle minimal d'exécution

Les entités minimales sont `EstablishmentMatch`, `SiteCandidate`, `AuditRun`, `GMBObservation`, `CrawlRun`, `SEOFinding`, `CompetitorCandidate`, `EvidenceSnapshot`, `CostEvent`, `ProgressCheckpoint`, `SEOReport` et `AcceptanceReport`.

Chaque run conserve : profil et règles versionnés, scope, deadline, budget, données autorisées, état, tentatives, erreurs expurgées, preuves, coûts et hash des artefacts. Une reprise crée un nouveau run lié à l'incident. Le run initial reste immuable.

## 5. Pipeline et gates

### Pipeline nominal

1. Valider `MinimalRequest` et ville structurée.
2. Produire `EstablishmentMatch` avec candidats, provenance, conflits et décision.
3. Demander confirmation si plusieurs candidats ou confiance insuffisante.
4. Découvrir et confirmer le `SiteCandidate`, sans inventer de domaine.
5. Lancer l'observation GMB publique si autorisée par la branche.
6. Préparer `CrawlRun` après les contrôles de sécurité et de budget.
7. Exécuter crawl HTML borné, mesures ciblées et règles déterministes.
8. Sélectionner les concurrents comme pistes, puis séparer faits et interprétations.
9. Faire intervenir l'IA uniquement sur les findings prouvés et autorisés.
10. Exécuter revue indépendante et composer le rapport progressif puis final.

### Gates bloquants

- identité/domaine non suffisamment confirmés ;
- URL non conforme ou cible réseau privée/réservée ;
- redirection ou DNS incohérent ;
- budget dur, timeout ou limite de ressources dépassé ;
- provenance critique absente, expirée ou non redistribuable ;
- conflit factuel non résolu ;
- contrat de sortie invalide ;
- rapport sans périmètre, date, limites ou preuves ;
- concurrence présentée comme fait établi sans vérification autorisée.

`WARN` reste visible dans `AcceptanceReport`. `PARTIAL` est un résultat explicite et utile, jamais un succès complet. Aucun agent ne peut clore seul un checkpoint : le Control Plane valide contrat, preuves et budget.

## 6. Profil provisoire et budget

Le profil standard provisoire est de 50 URLs, 3 minutes et 25 Mo, HTML sans rendu JavaScript complet. Ces valeurs ne deviennent commerciales qu'après le vertical slice et la vérification des fournisseurs.

Avant chaque run, le système fige :

- enveloppe cloud autorisée ;
- budget local en tokens, durée et ressources ;
- plafond global bloquant ;
- budgets par étape, agent, provider et période ;
- comportement de dégradation autorisé.

Les seuils 50/80/100 % produisent un événement et une notification. Le chemin essentiel peut continuer ; une option coûteuse est réduite ou marquée `PARTIAL`. Toute dépense non préautorisée, escalade premium, boucle ou violation sécurité/provenance bloque. Chaque consommation produit un `CostEvent` corrélé au run, à l'étape, au provider et à la configuration.

## 7. Sécurité du crawl à spécifier et tester

Avant connexion et à chaque redirection :

- accepter uniquement `http`/`https` selon le profil ;
- refuser credentials dans l'URL et ports non autorisés ;
- résoudre et revalider IPv4/IPv6 ;
- bloquer localhost, loopback, link-local, multicast, RFC1918, CGNAT, documentation et autres plages réservées ;
- détecter les changements DNS incompatibles avec la cible autorisée ;
- limiter profondeur, URLs, durée, taille décompressée, téléchargements, workers et mémoire ;
- isoler réseau et répertoire de travail ;
- ne jamais exécuter un téléchargement, script ou archive ;
- ne pas placer tokens, cookies ou headers sensibles dans les logs ;
- supprimer le workspace temporaire selon la politique de conservation.

Les tests négatifs obligatoires couvrent localhost, IPv6 locale, redirection public-vers-privé, DNS rebinding, URL avec credentials, compression expansive, boucle de paramètres, 429/503, anti-bot et site JavaScript hostile.

## 8. Décision de rapprochement

La confiance n'est pas affichée comme un score au prospect. Le moteur utilise des bandes internes explicables :

- `AUTO_CONTINUE` uniquement pour une fiche unique, avec nom normalisé et ville structurée cohérents, au moins un signal corroborant fiable (adresse, téléphone ou domaine officiel) et aucun conflit critique ;
- `ASK_CONFIRMATION` pour plusieurs candidats, un conflit ou toute correspondance qui n'atteint pas toutes les conditions de continuation automatique ;
- `ASK_MORE_DATA` lorsque l'identité reste insuffisante, avec demande de l'adresse uniquement ;
- aucun audit GMB ni crawl avant la décision autorisante correspondante.

Le seul cas de continuation automatique affiche une confirmation de lecture et un contrôle discret permettant de corriger. Les autres cas affichent une sélection explicite ou la branche locale. Les seuils numériques internes seront calibrés sur le vertical slice, sans score public ni changement silencieux de ces garanties.

## 9. Décision de dépassement de budget

Les seuils 50/80/100 % produisent une notification et un `CostEvent`. À 100 %, aucune nouvelle dépense optionnelle ne démarre. Une branche essentielle déjà engagée peut terminer uniquement si son coût restant est connu et reste sous le plafond dur ; sinon elle devient `PARTIAL` ou `BLOCKED` avant l'appel suivant. Les branches optionnelles sont arrêtées proprement avec leur cause et leurs résultats disponibles.

Une reprise exige une nouvelle enveloppe explicitement autorisée et un nouveau run. Il n'existe aucun fallback premium implicite, aucune boucle de relance et aucune hausse automatique de budget.

## 10. Décisions d'architecture arrêtées

### 10.1 Sources et identité

- `CityIndex` local versionné est la source de suggestion de ville du MVP. GeoNames est le candidat commun sous CC BY 4.0 ; le COG INSEE est la source française sous Licence Ouverte 2.0 ; ABS peut compléter l'Australie ; la redistribution d'une source officielle Sri Lanka reste non confirmée. Chaque import doit conserver identifiant, libellé, pays, version, provenance, attribution et statut de licence. Aucun dataset n'est activé avant le gate du marché ciblé.
- DataForSEO est le provider prioritaire pour les capacités publiques qu'il expose : SERP Google, Google Maps/local pack et Business Listings pour la découverte, le rapprochement initial et les pistes concurrentielles. Chaque famille d'endpoint reste versionnée, budgétée et soumise à sa propre vérification de couverture, prix, quota et conditions.
- Une API Google Places ne constitue qu'une solution de repli ou de comparaison pour une confirmation interactive bornée, avec facturation, attribution, `FieldMask`, politique de conservation et coût par appel approuvés. Elle ne devient pas une base locale de fiches.
- Google Business Profile API n'est pas un mécanisme de recherche anonyme : elle reste réservée à un compte propriétaire autorisé. Elle est exclue du parcours public anonyme et ne pourra être activée que dans un mode propriétaire OAuth distinct, après autorisation et politique de conservation vérifiées.
- Un résultat cartographique ou un nom de domaine ne constitue pas seul une preuve d'identité ni de concurrence. `AUTO_CONTINUE` suit exclusivement les conditions de la section 8.

### 10.2 SEO et concurrence

- Le chemin commercial standard est le crawler HTTP/HTML interne, sans exécution de JavaScript, téléchargement de fichiers, exécution d'archives ni accès authentifié.
- Lighthouse/Playwright sont des mesures ciblées et contrôlées, pas un accès général au navigateur du prospect.
- DataForSEO est le provider prioritaire pour SERP, Google Maps/local pack, Business Listings, mots-clés, concurrence, intersections et OnPage. La documentation du 27 août 2026 indique notamment un minimum public de paiement de 50 USD, des limites générales de requêtes/concurrence et des coûts variables par endpoint/paramètre ; elle ne suffit pas à établir les droits de restitution client. Il ne peut être activé qu'après vérification de compte, marchés, budget, quota, conditions et `CostEvent`. Une panne ou un refus de provider produit `PARTIAL`, jamais une donnée inventée.
- Les concurrents sont des `CompetitorCandidate` jusqu'à corroboration par une source autorisée, un site officiel et une date. Le rapport ne présente au maximum que cinq pistes issues de trois intentions locales explicites.
- Screaming Frog n'est pas une dépendance du MVP. Tant qu'une autorisation écrite compatible avec un service multi-prospects n'existe pas, son CLI reste réservé à une intervention opérateur hors promesse commerciale.

### 10.3 Provenance et restitution

Chaque champ exposé possède une classe de preuve et au moins un `EvidenceSnapshot`. Une preuve expirée, non redistribuable ou en conflit critique bloque uniquement la restitution qui en dépend et rend le rapport `PARTIAL` ou `BLOCKED` selon la criticité. Les URLs et données visibles côté prospect sont une sélection autorisée ; les payloads bruts restent hors du navigateur.

La chaîne minimale est :

```text
source -> EvidenceSnapshot -> observation/calcul -> SEOFinding
       -> SEORecommendation -> SEOReport -> AcceptanceReport
```

Une `AI_INTERPRETED` ne peut citer que des findings déterministes validés. L'IA ne crée ni identité, ni prix, ni horaire, ni droit d'utilisation, ni preuve concurrentielle.

### 10.4 Stockage et restauration

- Neon conserve les métadonnées minimales, statuts, hashes, coûts, preuves et références.
- R2 conserve le rapport publié et le PDF pendant leur durée de livraison, par défaut sept jours ; les objets temporaires ont un lifecycle de secours.
- Les crawls et exports lourds restent dans l'archive locale chiffrée. Le MVP accepte explicitement l'absence de réplication supplémentaire de cette archive ; cette perte potentielle est un risque accepté, pas une garantie de restauration.
- Une restauration d'archive locale lorsque le Mac est éteint passe en `WAITING_FOR_MAC` et n'est jamais simulée comme terminée. Toute suppression est journalisée, confirmée et précédée d'une vérification de hash lorsqu'elle concerne un objet synchronisé.

### 10.5 Budget et consommation

Avant le premier appel, le Control Plane fige un `BudgetEnvelope` : plafond global, budgets par étape/provider, unités cloud et locales, seuils 50/80/100 %, délai et comportement de dégradation. Chaque consommation écrit un `CostEvent` avec run, étape, provider, configuration, unité, quantité, coût connu ou estimé et horodatage.

À 100 %, aucune branche optionnelle ne démarre. Une branche essentielle ne termine que si son coût restant est connu et sous le plafond ; sinon elle devient `PARTIAL` ou `BLOCKED` avant l'appel suivant. Une reprise exige une nouvelle enveloppe et un nouveau run. Aucun fallback premium, retry ou dépassement silencieux n'est autorisé.

### 10.6 Sécurité du crawl

Le crawler applique la validation avant chaque connexion et après chaque redirection : schéma `http`/`https` autorisé par profil, absence de credentials, ports explicites autorisés, résolution IPv4/IPv6, rejet des IP loopback, link-local, multicast, RFC1918, CGNAT, documentation et autres plages réservées, puis revalidation de la résolution. Un changement de cible ou une ambiguïté DNS produit `BLOCKED`.

Chaque run possède un répertoire isolé, un budget de durée, URLs, profondeur, workers, mémoire, taille compressée et taille décompressée. Les corps non nécessaires, archives, téléchargements et scripts sont refusés. Les logs sont expurgés des credentials, cookies et tokens ; le nettoyage suit la classe de rétention. Les tests négatifs listés en section 7 sont des gates avant activation.

## 11. Gates restantes à fermer

1. Confirmer le `CityIndex` effectivement redistribuable pour chaque marché : GeoNames/INSEE/ABS doivent passer le test d'import et de couverture ; Sri Lanka reste bloqué sans licence ou revue autorisée.
2. Obtenir la confirmation DataForSEO couvrant conservation, cache, rapport client, export et affichage des résultats Google/Maps/Business Listings ; le compte, les marchés et les coûts restent non observables.
3. Finaliser le protocole de suppression, rétention légale, backup et restauration pour les artefacts lourds ; le choix d'architecture ne vaut pas preuve d'exécution.
4. Sélectionner un jeu de sites autorisés pour le vertical slice et mesurer le go/no-go commercial.

Tant que ces questions ne sont pas résolues ou acceptées comme hypothèses testables, aucune implémentation de production de l'audit ne doit commencer.

## 12. Critères de sortie de la spec

La spec est prête pour planification de la tranche d'audit lorsque les décisions des sections 1 à 10 sont respectées et que chaque question externe restante possède un propriétaire, une preuve attendue et une condition d'arrêt. Elle n'autorise pas encore la commercialisation.

## 13. Gates avant implémentation de production

1. `CityIndex` sélectionné par marché, licence/attribution archivée et couverture testée.
2. Provider d'identité/GMB choisi, attribution et conservation vérifiées, ou branche publique désactivée.
3. Moteur interne testé sur les cas SSRF et limites de section 7.
4. Rétention R2, demande de suppression et état `WAITING_FOR_MAC` testés.
5. `CostEvent`, alertes 50/80/100 % et blocage à 100 % observés sur un run contrôlé.
6. Contrats JSON, idempotence, partialité, revue indépendante et `AcceptanceReport` vérifiés.
7. Prototype du rapport et du parcours public relus sur mobile, puis vertical slice autorisé exécuté.
8. Aucune copy commerciale ne cite Screaming Frog, un prix provider, un quota ou une garantie de classement sans preuve correspondante.

## 14. Vertical slice obligatoire avant commercialisation

Le jeu de test doit contenir au minimum : restaurant vitrine, WordPress, site multilingue, site JavaScript, erreurs SEO volontaires, blocage du crawl et site sans données structurées. Chaque cible doit avoir une autorisation écrite, un identifiant de fixture, un hash de configuration, un budget et une politique de suppression.

Le pré-slice local déterministe est documenté dans [`05-audit-local-vertical-slice-v1.md`](05-audit-local-vertical-slice-v1.md). Il valide le contrat de règles HTML, de preuves et de partialité sur fixtures synthétiques, mais ne remplace pas le vertical slice autorisé sur des sites réels.

Le go/no-go exige, pour chaque cas : rapprochement correct ou branche prudente, findings déterministes attendus retrouvés, absence d'affirmation sans preuve, état final explicable (`SUCCEEDED`, `PARTIAL` ou `BLOCKED`), coût/durée observés, revue humaine mesurée, rapport compris lors d'une revue ciblée, livraison expirée et suppression vérifiée. Un échec de sécurité, de provenance ou de budget bloque la commercialisation même si le rapport est visuellement réussi.
