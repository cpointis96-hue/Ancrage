# Cloudflare + Neon — prix, limites et restauration pour l'intake Mac éteint

Date d'observation : 2026-08-27
Périmètre : Website Factory, uniquement les surfaces Cloudflare Workers, R2, Queues, Workflows, Turnstile, rate limiting et Neon PostgreSQL.
Méthode : documentation et pages tarifaires officielles uniquement. Aucun compte, clé, ressource distante, appel payant ou configuration fournisseur n'a été créé ou modifié.

## Statut de preuve

- **MESURÉ** : le fichier cible était absent avant cette recherche ; aucun test de runtime, aucune création de ressource et aucun appel authentifié n'ont été effectués.
- **DOCUMENTÉ** : fait explicitement présent dans une source officielle liée ci-dessous.
- **NON OBSERVABLE** : ne peut pas être confirmé depuis une page publique sans accès au compte, au plan, à la facture ou à une ressource réelle.
- **À TESTER** : comportement à vérifier dans un projet de test autorisé, sans le déduire de la documentation.

Les prix sont en USD et les quotas sont ceux visibles dans les sources officielles au 27 août 2026. Une page plus récente ou un plan contractuel peut prévaloir.

## Résumé décisionnel

**DOCUMENTÉ** : la topologie compatible avec un Mac éteint est un Control Plane Cloudflare qui reçoit l'intake, écrit les métadonnées minimales dans Neon, dépose les objets dans R2, puis déclenche une file ou un workflow cloud. Le Mac ne doit intervenir qu'ensuite pour la synchronisation locale et le traitement opportuniste.

**DOCUMENTÉ** : le seuil de coût fournisseur n'est pas un coupe-circuit suffisant. Cloudflare documente des alertes de budget ; Neon documente une limite de spending qui envoie des alertes à 80 % et 100 %, mais l'API précise que les compute ne sont pas suspendus lorsque la limite est atteinte. Le Control Plane doit donc avoir son propre budget bloquant, ses `CostEvent` et un arrêt avant appel optionnel.

**À TESTER avant `to-spec`** : upload direct vers R2, validation Turnstile, rate limiting de l'endpoint public, idempotence Queue, reprise après expiration/DLQ, démarrage Neon après scale-to-zero, restauration Neon, conservation/purge R2 et latence depuis les marchés ciblés.

## 1. Cloudflare Workers

### Prix et quotas

**DOCUMENTÉ** — [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) :

- Free : 100 000 requêtes par jour ; 10 ms de CPU par invocation.
- Paid/Standard : minimum de 5 USD par mois et par compte ; 10 millions de requêtes incluses par mois, puis 0,30 USD par million ; 30 millions de millisecondes CPU incluses, puis 0,02 USD par million de millisecondes CPU.
- Paid : durée sans limite de facturation séparée ; maximum de 5 minutes de CPU par invocation, par défaut 30 secondes ; invocation Cron ou Queue Consumer jusqu'à 15 minutes.
- Les sous-requêtes émises par un Worker ne sont pas facturées comme des requêtes Internet supplémentaires. Le trafic sortant et la bande passante n'ajoutent pas de coût Workers selon cette page.

**DOCUMENTÉ** — [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) :

- mémoire : 128 MB ; connexions sortantes simultanées : 6 ; taille du script : 3 MB Free / 10 MB Paid ; sous-requêtes : 50 Free / 10 000 Paid par invocation, avec possibilité d'augmentation documentée ; démarrage : 1 seconde ; 100 Workers Free / 500 Paid.
- taille de requête entrante selon le plan Cloudflare du compte : 100 MB Free/Pro, 200 MB Business, 500 MB par défaut Enterprise.
- le dépassement de la limite quotidienne Free peut renvoyer l'erreur 1027 ; le mode fail-open/fail-closed doit être choisi selon le caractère critique de la route.

**Implication intake** : les fichiers de 10 à 20 MB envisagés tiennent dans la limite HTTP Free documentée, mais le Worker ne doit pas devenir l'archive ni bufferiser inutilement le fichier. La cible reste un objet R2 et un enregistrement Neon ; les limites d'upload direct et de reprise doivent être testées.

## 2. Cloudflare R2

### Prix

**DOCUMENTÉ** — [R2 pricing](https://developers.cloudflare.com/r2/pricing/) (page mise à jour le 7 août 2026) :

| Élément | Standard | Infrequent Access |
|---|---:|---:|
| Stockage | 0,015 USD/GB-month | 0,010 USD/GB-month |
| Class A | 4,50 USD/million | 9,00 USD/million |
| Class B | 0,36 USD/million | 0,90 USD/million |
| Retrieval | aucun | 0,01 USD/GB |
| Egress R2 direct | gratuit | gratuit |

Le Free tier mensuel Standard comprend 10 GB-month, 1 million d'opérations Class A et 10 millions Class B. L'Infrequent Access n'utilise pas ce Free tier. La facturation arrondit à l'unité supérieure ; les opérations non autorisées en HTTP 401 ne sont pas facturées.

### Limites, rétention et intégrité

**DOCUMENTÉ** — [R2 limits](https://developers.cloudflare.com/r2/platform/limits/) : stockage et objets par bucket illimités ; jusqu'à 1 000 000 buckets par compte ; clé 1 024 bytes ; métadonnées 8 192 bytes ; objet jusqu'à 5 TiB ; upload mono-partie jusqu'à 4,995 GiB et multipart jusqu'à 4,995 TiB, 10 000 parts ; une écriture concurrente par seconde sur une même clé. L'API REST de gestion est limitée à 1 200 requêtes par cinq minutes par compte ; les opérations objet à haut volume doivent utiliser l'API Workers ou S3.

**DOCUMENTÉ** — [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/) : read-after-write, mise à jour de métadonnées, suppression et listing sont fortement cohérents. Deux écritures sur la même clé suivent le dernier writer terminé ; une clé doit donc être immuable par version/hash pour éviter l'écrasement.

**DOCUMENTÉ** — [R2 durability](https://developers.cloudflare.com/r2/reference/durability/) : durabilité conçue à 99,999999999 % par an et écriture confirmée après persistance ; cela ne garantit ni disponibilité ni protection contre une suppression accidentelle.

**DOCUMENTÉ** — [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) : règle de transition ou de suppression par préfixe ; maximum 1 000 règles ; un objet supprimé n'est plus facturable ; les suppressions interviennent typiquement dans les 24 heures de l'expiration ; un multipart incomplet expire par défaut après 7 jours.

**DOCUMENTÉ** — [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) : règles de rétention de durée fixe, date ou indéfinie ; maximum 1 000 règles ; les locks s'appliquent aux objets nouveaux et existants et priment sur le lifecycle.

**NON OBSERVABLE** : la documentation consultée ne fournit pas une garantie de backup externe ou de restauration point-in-time d'un bucket R2 comparable au PITR Neon. Durabilité, bucket lock et lifecycle ne sont pas un backup récupérable après suppression logique.

**À TESTER** : la politique MVP doit écrire sous des clés versionnées avec hash, conserver l'objet jusqu'à l'accusé de réception local, utiliser un lifecycle de secours et tester une restauration d'un objet/version sans supprimer l'original. Aucun bucket n'a été créé pour cette recherche.

## 3. Cloudflare Queues

### Prix et limites

**DOCUMENTÉ** — [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/) (mise à jour le 21 avril 2026) : une opération compte chaque tranche de 64 KB écrite, lue ou supprimée ; un message de 65 KB compte donc deux opérations. Free : 10 000 opérations par jour. Paid : 1 million d'opérations par mois incluses, puis 0,40 USD par million. Il n'y a pas de coût egress/throughput. Un parcours nominal consomme souvent write + read + delete ; les retries et DLQ ajoutent des opérations.

**DOCUMENTÉ** — [Queues limits](https://developers.cloudflare.com/queues/platform/limits/) :

- 10 000 queues par compte ; message 128 KB ; 100 retries maximum ; batch consommateur 100 messages ; `sendBatch` 100 messages ou 256 KB ; attente batch maximale 60 secondes ; 5 000 messages/seconde par queue ; backlog 25 GB ; 250 invocations de consommateurs concurrentes en push ; consumer wall time 15 minutes et CPU configurable jusqu'à 5 minutes.
- rétention maximale 14 jours ; Free fixe à 24 heures ; Paid 4 jours par défaut et configurable jusqu'à 14 jours ; `delaySeconds` jusqu'à 24 heures.

**DOCUMENTÉ** — [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) : livraison **at least once** par défaut, donc doublon possible. [Dead Letter Queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/) : sans DLQ, un message arrivé à la limite de retries est supprimé ; une DLQ sans consommateur conserve ses messages quatre jours.

**Implication intake** : la Queue ne doit contenir qu'un pointeur compact (`intake_id`, version de schéma, clé R2, hash, idempotency key), jamais le fichier ni la source de vérité. Neon/R2 persistent l'intake ; Queue ne fait que lisser le traitement. Les écritures de statut doivent être idempotentes par identifiant unique.

**À TESTER** : expiration Free/Paid, doublon, retry de batch, DLQ et reprise d'un consommateur indisponible. Le Mac éteint ne bloque pas la réception si le producteur et le consommateur sont cloud, mais aucun runtime n'a été exécuté.

## 4. Cloudflare Workflows

### Prix et limites

**DOCUMENTÉ** — [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/) (mise à jour le 21 juillet 2026) : Workflows est inclus dans les plans Workers Free et Paid, mais les étapes et le stockage sont facturables depuis le 10 août 2026. Les unités sont les requêtes, CPU, stockage persistant et étapes :

| Unité | Workers Free | Workers Paid |
|---|---:|---:|
| Requêtes | 100 000/jour, partagé avec Workers | 10 M/mois inclus, puis 0,30 USD/M |
| CPU | 10 ms par invocation | 30 M ms/mois inclus, puis 0,02 USD/M ms |
| Stockage d'état | 1 GB | 1 GB inclus, puis 0,20 USD/GB-month |
| Étapes | 3 000/jour | 500 000/mois inclus, puis 0,80 USD/100 000 |

Une étape en attente d'I/O ou de `step.sleep` ne consomme pas de CPU, mais l'état reste du stockage facturable selon la rétention.

**DOCUMENTÉ** — [Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/) : résultat non-stream et payload d'événement 1 MiB ; état maximal par instance 100 MB Free / 1 GB Paid ; `step.sleep` jusqu'à 365 jours ; maximum d'étapes 1 024 Free / 10 000 Paid par défaut, configurable jusqu'à 25 000 ; exécutions Free 100 000/jour partagé, Paid illimité ; instances concurrentes 100 Free / 50 000 Paid ; queue d'instances 100 000 Free / 2 000 000 Paid ; création 100/s Free, 300/s par compte et 100/s par workflow Paid ; sous-requêtes 50 Free / 10 000 Paid par défaut, configurable jusqu'à 10 millions.

Les instances en attente ne consomment pas la limite de concurrence active. Une étape peut avoir une durée murale illimitée, mais reste soumise à la limite CPU.

**Implication intake** : Workflows convient à une orchestration cloud reprenable et à des attentes longues ; il ne convient pas au stockage de photos, PDF ou exports lourds. R2 conserve les binaires et Neon l'état minimal ; le workflow ne conserve qu'une référence et un état borné.

## 5. Cloudflare Turnstile

### Prix et limites

**DOCUMENTÉ** — [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) (mise à jour le 14 août 2026) : Free = gratuit, jusqu'à 20 widgets par compte, types de widget inclus, challenges/vérifications illimités, 10 hostnames par widget, analytics avec rétrospection maximale de 7 jours. Enterprise = prix sur devis, widgets illimités et analytics 30 jours.

**DOCUMENTÉ** — [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) : le token a une longueur maximale de 2 048 caractères, expire après 300 secondes et ne peut être validé qu'une seule fois. Le backend doit appeler `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` avec la clé secrète et le token ; le widget client seul ne protège pas le formulaire.

**Implication intake** : Turnstile réduit l'abus automatisé, mais ne remplace ni l'authentification, ni l'idempotence, ni le rate limiting. La vérification doit être effectuée avant l'écriture durable ou l'émission d'un upload autorisé.

**NON OBSERVABLE** : aucun widget/sitekey/secret n'a été créé ni lu ; l'intégration réelle, le hostname et la réponse Siteverify ne sont donc pas vérifiés.

## 6. Cloudflare rate limiting

**DOCUMENTÉ** — [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) (mise à jour le 25 août 2026) : une règle définit une expression, une caractéristique de comptage, une période, un nombre de requêtes et une durée de mitigation. La matrice publique indique :

| Plan de zone Cloudflare | Règles | Période de comptage | Mitigation maximale |
|---|---:|---:|---:|
| Free | 1 | 10 s | 10 s |
| Pro | 2 | jusqu'à 1 min | jusqu'à 1 h |
| Business | 5 | jusqu'à 10 min | jusqu'à 1 jour |
| Enterprise avec app security | 100* | jusqu'à 65 535 s | jusqu'à 1 jour |

Les nouvelles règles sont incluses dans les plans Cloudflare ; l'ancienne API/add-on de rate limiting, facturée à l'usage, n'est plus disponible. Voir [l'avis de migration officiel](https://developers.cloudflare.com/waf/reference/legacy/old-rate-limiting/upgrade/). Le comptage peut avoir un retard de quelques secondes ; la règle n'est pas conçue pour garantir un nombre précis de requêtes qui atteint l'origine.

**Implication intake** : une règle courte par IP/route peut limiter `/intake`, mais une limite métier exacte doit rester dans le Control Plane/Neon. Le rate limiting edge et Turnstile sont des protections anti-abus, pas une garantie de budget ni une file durable.

**NON OBSERVABLE** : le plan de zone, le nombre de règles disponibles et le comportement de mitigation du compte Website Factory n'ont pas été consultés.

## 7. Cloudflare spending et paiements

**DOCUMENTÉ** — [Cloudflare billing overview](https://developers.cloudflare.com/billing/) : Cloudflare propose un tableau d'usage facturable et des alertes par e-mail lorsqu'un seuil de dépense usage-based est franchi. [La page de création du profil de facturation](https://developers.cloudflare.com/billing/get-started/create-billing-profile/) indique qu'un moyen de paiement est requis pour acheter des produits et services Cloudflare.

**NON OBSERVABLE** : une alerte de budget ne prouve pas une suspension automatique des Workers, R2, Queues ou Workflows. Le montant, le moyen de paiement, les taxes, l'état de facturation et un éventuel mode contractuel du compte ne peuvent pas être vérifiés sans accès au compte.

**GATE** : aucun plan Paid, moyen de paiement, clé ou ressource Cloudflare ne doit être activé pour l'architecture avant un budget interne bloquant, une alerte fournisseur et un test de dépassement sur un compte/projet explicitement autorisé.

## 8. Neon PostgreSQL

### Prix et quotas

**DOCUMENTÉ** — [Neon pricing](https://neon.com/pricing), recoupé avec le [fichier officiel des limites Free](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md) mis à jour le 1er juin 2026 :

| Plan | Prix / limites utiles |
|---|---|
| Free | 0 USD ; 100 projets ; 10 branches/projet ; 100 CU-hours/projet/mois ; 0,5 GB de stockage/projet ; jusqu'à 2 CU, environ 8 GB RAM ; 5 GB de transfert public/projet/mois ; scale-to-zero fixe après 5 min |
| Launch | usage-based ; 0,106 USD/CU-hour ; 0,35 USD/GB-month de stockage ; jusqu'à 16 CU/64 GB ; 10 branches incluses, puis environ 0,002 USD/branch-hour ; restore window jusqu'à 7 jours |
| Scale | usage-based ; 0,222 USD/CU-hour ; 0,35 USD/GB-month ; jusqu'à 56 CU/224 GB ; 25 branches incluses, puis environ 0,002 USD/branch-hour ; restore window jusqu'à 30 jours |

La page tarifaire documente aussi 0,20 USD/GB-month pour l'historique/instant restore sur les plans payants, sur le volume de changements conservé, et 0,09 USD/GB-month pour le stockage des snapshots depuis le 1er mai 2026 via [la documentation snapshots](https://neon.com/docs/ai/ai-database-versioning). Les plans payants sont présentés comme usage-based ; aucun minimum mensuel ne doit être supposé sans vérifier le plan réellement attaché au compte.

**DOCUMENTÉ** — [augmentation du transfert public payant](https://neon.com/blog/more-data-transfer-on-paid-plans) : depuis le 1er juin 2026, les plans payants incluent 500 GB/mois, puis le transfert excédentaire est facturé selon la tarification applicable.

**CONFLIT DOCUMENTAIRE À NE PAS MASQUER** : la documentation snapshots dédiée consultée affiche encore 10 snapshots manuels inclus sur les plans payants, tandis que la liste officielle des changements Neon du 22 mai 2026 indique 100 snapshots manuels par projet, les snapshots des sauvegardes planifiées n'étant pas comptés dans ce plafond. Pour le 27 août 2026, retenir **100 comme information la plus récente datée**, mais marquer la limite comme `À TESTER` dans le compte avant de la promettre ; lien de recoupement : [changelog officiel Neon](https://neon.com/blog/category/changelog).

### Scale-to-zero et délais

**DOCUMENTÉ** — [Neon Scale to Zero](https://neon.com/docs/introduction/scale-to-zero/) : le compute s'arrête après 5 minutes d'inactivité et se réactive automatiquement en quelques centaines de millisecondes. Free ne permet pas de désactiver ce réglage ; les plans payants peuvent maintenir un compute actif. [Manage computes](https://neon.com/docs/manage/endpoints/) confirme que la latence de réveil disparaît en mode always-active mais que la consommation augmente.

**Implication Mac éteint** : l'API publique peut interroger Neon sans le Mac. Il faut toutefois accepter un cold start sur une première écriture/lecture après inactivité, dimensionner les timeouts et utiliser le pooling adapté ; la latence réelle depuis les régions Website Factory est `À TESTER`.

### Stockage, backups, snapshots et restauration

**DOCUMENTÉ** — [Neon project management](https://neon.com/docs/manage/projects/) : l'historique conservé par projet sert à l'instant restore, aux requêtes Time Travel et aux branches depuis un état passé ; étendre la fenêtre augmente le stockage d'historique. Les nouveaux projets ont un défaut Free de 6 heures et un défaut paid d'un jour selon le [changelog officiel](https://neon.com/docs/changelog/2025-10-17).

**DOCUMENTÉ** — le Free couvre jusqu'à 6 heures d'historique ou 1 GB de changements, selon la première limite atteinte ; Launch permet jusqu'à 7 jours et Scale jusqu'à 30 jours selon [Neon pricing](https://neon.com/pricing). Ce mécanisme est un historique WAL/instant restore, pas une copie locale indépendante.

**DOCUMENTÉ** — [Point-in-time restore](https://neon.com/blog/announcing-point-in-time-restore) : la restauration d'une branche prend typiquement quelques secondes et provoque une brève perte de connectivité pendant le redémarrage du compute. [Snapshots](https://neon.com/docs/ai/ai-database-versioning) : un snapshot peut être restauré sur la branche active en conservant la chaîne de connexion si `finalize_restore: true`, mais l'identifiant de branche change, l'ancienne branche devient orpheline et les opérations doivent être pollées avant toute reconnexion.

**DOCUMENTÉ** — [project recovery](https://neon.com/docs/changelog/2025-12-19) : un projet supprimé peut être récupéré pendant 7 jours, avec restauration de ses branches, endpoints, configurations, settings, collaborateurs et snapshots, sans coût de stockage/récupération pendant cette fenêtre. Cela ne remplace pas une procédure de sauvegarde testée.

**NON OBSERVABLE** : aucune branche, table, snapshot, backup planifié ou restauration n'a été créé(e) ; les délais réels, l'état du compte, la région, la rétention effective, les droits et le résultat d'une restauration ne sont pas confirmés.

### Spending limits

**DOCUMENTÉ** — [Neon API — set organization spending limit](https://api-docs.neon.tech/reference/setorganizationspendinglimit) : la limite mensuelle est un montant positif en cents, disponible aux administrateurs des organisations Launch et Scale ; alertes à 80 % et 100 % ; les compute ne sont pas suspendus lorsque la limite est atteinte. La limite peut être modifiée ou supprimée.

**DOCUMENTÉ** — [Neon — organization spending limits](https://neon.com/blog/introducing-organization-spending-limits) : Neon vérifie la dépense environ toutes les 15 minutes ; le blog présente la suspension automatique comme future, alors que la référence API actuelle précise explicitement qu'elle n'a pas lieu.

**Décision** : ne jamais utiliser le spending limit Neon comme coupe-circuit. Il faut limiter `max autoscaling`, garder scale-to-zero sur les branches non critiques, couper localement les appels optionnels à 80 % ou avant le plafond interne, puis traiter l'alerte fournisseur comme signal secondaire.

## 9. Architecture intake recommandée, bornée par ces preuves

```text
Visiteur
  -> Worker /intake
       -> rate limiting edge
       -> validation Turnstile côté serveur
       -> Neon : dossier, statut, hash, clé R2, expiration
       -> R2 : fichier privé sous clé versionnée
       -> Queue ou Workflow : pointeur idempotent, jamais le fichier
  -> Mac éteint : réception et état cloud continuent
  -> Mac rallumé : synchronisation vérifiée, accusé de réception, archive locale chiffrée
```

**DOCUMENTÉ** : cette séparation respecte les tailles et les garanties publiées : Worker pour la route courte, R2 pour les binaires, Neon pour les métadonnées, Queue/Workflow pour la reprise asynchrone.

**À TESTER** :

1. soumettre un fichier de la taille maximale métier depuis chaque marché ; mesurer statut HTTP, hash et délai d'apparition R2/Neon ;
2. couper le Mac avant et après réception, puis vérifier que l'intake reste récupérable ;
3. rejouer exactement le même événement et vérifier zéro doublon métier ;
4. forcer un échec consommateur, observer retry/DLQ/expiration sans perte silencieuse ;
5. vérifier le cold start Neon, le timeout applicatif et la reconnexion après restore ;
6. restaurer Neon sur un environnement isolé, vérifier les `CostEvent`, le branch ID et la connexion ;
7. restaurer un objet R2 versionné sans dépendre de la disponibilité du Mac ;
8. relever le coût réel après une opération minimale seulement après autorisation séparée.

## Conclusion et gates

### Conclusion

**DOCUMENTÉ** : Cloudflare Free/usage-based et Neon serverless peuvent porter la réception d'un intake lorsque le Mac est éteint, à condition que le cloud conserve l'état minimal durable et que les objets ne transitent pas par une Queue. R2 est le meilleur candidat pour les fichiers grâce à l'egress direct gratuit, mais sa durabilité et ses locks ne constituent pas à eux seuls une stratégie de backup/restauration. Neon apporte scale-to-zero, historique et restauration point-in-time, mais sa limite de spending est alert-only.

**MESURÉ** : aucune preuve runtime de cette architecture n'existe dans cette recherche ; aucun fournisseur n'a été activé ou facturé.

### Gates bloquants

- **G1 — compte et plan** : relever sans modifier les ressources le plan Cloudflare/Neon, la région, les limites effectives, les alertes et la possibilité de désactivation ; sinon `NON OBSERVABLE`.
- **G2 — budget** : définir un plafond interne bloquant et prouver son déclenchement avant tout appel payant ; Cloudflare et Neon restent des alertes non suffisantes.
- **G3 — intake** : prouver upload borné, Turnstile validé côté serveur, rate limiting et idempotence avec Mac éteint.
- **G4 — reprise** : prouver Queue/Workflow retry, DLQ, expiration et reprise après interruption sans perte ni doublon.
- **G5 — restauration** : prouver Neon restore/snapshot et R2 récupération d'objet versionné ; mesurer RPO/RTO réels, sans les déduire des pages tarifaires.
- **G6 — conflit snapshots** : résoudre dans le compte ou auprès du support autorisé l'écart 10/100 avant toute promesse ou dimensionnement.
- **G7 — autorisation** : aucune clé, ressource, compte, dépense ou test payant ne doit être créé sans confirmation explicite et périmètre isolé.

## Sources officielles directes

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [R2 limits](https://developers.cloudflare.com/r2/platform/limits/) · [consistency](https://developers.cloudflare.com/r2/reference/consistency/) · [durability](https://developers.cloudflare.com/r2/reference/durability/) · [lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) · [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [Cloudflare Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/) · [limits](https://developers.cloudflare.com/queues/platform/limits/) · [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) · [DLQ](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/)
- [Cloudflare Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/) · [limits](https://developers.cloudflare.com/workflows/reference/limits/)
- [Cloudflare Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) · [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) · [migration de l'ancien modèle](https://developers.cloudflare.com/waf/reference/legacy/old-rate-limiting/upgrade/) · [billing](https://developers.cloudflare.com/billing/)
- [Neon pricing](https://neon.com/pricing) · [Free limits officiel](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md) · [scale-to-zero](https://neon.com/docs/introduction/scale-to-zero/) · [compute](https://neon.com/docs/manage/endpoints/)
- [Neon project management](https://neon.com/docs/manage/projects/) · [point-in-time restore](https://neon.com/blog/announcing-point-in-time-restore) · [snapshots](https://neon.com/docs/ai/ai-database-versioning) · [changelog snapshots](https://neon.com/blog/category/changelog) · [project recovery](https://neon.com/docs/changelog/2025-12-19)
- [Neon spending limit API](https://api-docs.neon.tech/reference/setorganizationspendinglimit) · [spending limits](https://neon.com/blog/introducing-organization-spending-limits) · [paid transfer](https://neon.com/blog/more-data-transfer-on-paid-plans)
