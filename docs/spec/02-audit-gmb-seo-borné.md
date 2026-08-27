# Spec de travail : audit GMB puis SEO/concurrence borné

Statut : à compléter avant implémentation
Périmètre : valeur d'audit publique, sans génération de site ni paiement
Références : `map.md`, tickets 25, 26, 67, 68, 69, 70, 71, 72, 73 et recherche 89

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

L'audit GMB est affiché dès que son checkpoint est validé. L'audit SEO continue en parallèle seulement après identité et domaine suffisamment confirmés. Le rapport final réunit les modules sans présenter une branche absente comme négative ou inexistante.

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

## 10. Questions bloquantes à fermer

1. Quelle source et quelle licence autorisent la découverte des villes, établissements et concurrents dans chaque marché ?
2. Quelle position écrite autorise ou exclut Screaming Frog dans ce service automatisé ?
3. Quel protocole de suppression, rétention légale, backup et restauration est accepté pour les artefacts lourds ?
4. Quel jeu de sites autorisés constitue le vertical slice et quelles mesures déterminent le go/no-go commercial ?

Tant que ces questions ne sont pas résolues ou acceptées comme hypothèses testables, aucune implémentation de production de l'audit ne doit commencer.

## 11. Critères de sortie de la spec

La spec est prête pour planification lorsque chaque question bloquante possède soit une décision documentée, soit une hypothèse explicitement bornée avec test, responsable, preuve attendue et condition d'arrêt. Le prototype public et le prototype du rapport restent des artefacts séparés de la production.
