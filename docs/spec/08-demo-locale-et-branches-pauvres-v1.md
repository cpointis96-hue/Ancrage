# Spécification démo locale et branches pauvres V1

Statut : spécification de démo opérateur ; non commerciale et non `production-ready`
Périmètre : essais sur plusieurs établissements, avec ou sans fiche GMB, avec ou sans site, et avec données initiales minimales
Hors périmètre : paiement, `Account`, documents juridiques, domaine acheté, publication et activation commerciale

Cette spec précise le comportement de la démo locale. Elle complète les specs 01, 02, 04 et 07 sans supprimer les étapes de production conservées pour plus tard.

## 1. Entrée minimale

Au départ, le prospect ou l’opérateur fournit seulement le nom de l’établissement et sélectionne une suggestion Google Places. La sélection conserve le `placeId` et récupère automatiquement le pays et la ville.

Si aucune suggestion ne correspond, la surface propose `Mon établissement n’est pas présent`. Un panneau inline demande alors l’adresse structurée, le code postal, la ville et le pays. La démo locale propose pour l’instant uniquement `FR` (France) et `LK` (Sri Lanka) dans cette branche manuelle. Le domaine n’est pas demandé à l’écran : une recherche configurée peut le retrouver ; sinon le résultat reste partiel et aucun domaine n’est inventé.

Le système ne demande pas encore le menu, les prix, les horaires détaillés, l’histoire, les coordonnées commerciales ou les photos. Ces informations appartiennent au `ProgressiveIntake` après le rapport final et le clic `Préparer mon site`.

Un nom libre seul ne suffit pas à lancer un audit : l’établissement doit être sélectionné dans Google Places ou l’adresse manuelle doit être complète. Le système ne choisit jamais silencieusement un établissement ou un domaine.

## 2. Décision d’identité

| Situation | État | Action |
|---|---|---|
| Une fiche unique, cohérente et corroborée est trouvée | `MATCH_CONFIRMED` | continuer automatiquement vers les branches disponibles |
| Plusieurs fiches ou un conflit important sont trouvés | `ASK_CONFIRMATION` | demander au prospect de choisir ou de corriger |
| Aucun établissement fiable n’est retrouvé | `ASK_ADDRESS` | demander uniquement l’adresse de l’établissement |
| Le prospect indique que la fiche proposée n’est pas la sienne | `LOCAL_PREVIEW_WITHOUT_GMB` | utiliser l’adresse fournie et ne pas présenter la fiche comme confirmée |

L’absence de résultat n’est jamais une preuve d’absence réelle de fiche GMB. Une identité non confirmée ne déclenche ni audit présenté comme définitif ni crawl arbitraire.

## 3. Quatre branches de données

### 3.1 GMB et site trouvés

Le rapport GMB et l’audit SEO de base peuvent démarrer en parallèle après confirmation suffisante de l’identité et du domaine. Le rapport GMB HTML est livré dès qu’il est validé. Le rapport SEO général attend ensuite les données nécessaires et compose le rapport final.

### 3.2 GMB trouvé, site absent

Le système livre le rapport GMB si ses preuves sont valides. Le module site reste `SITE_NOT_CONFIRMED` ; aucun crawl n’est lancé. Le rapport final indique clairement que l’analyse du site n’a pas été possible. Il ne transforme pas cette absence de domaine confirmé en défaut SEO observé.

La préparation du site peut ensuite être proposée après le rapport final. Le prospect pourra fournir un domaine ou continuer avec un site créé à partir des informations qu’il donnera dans l’intake.

### 3.3 Site fourni ou trouvé, GMB non confirmé

Le système peut auditer le domaine public confirmé. Le module GMB reste `PARTIAL`, `UNKNOWN` ou `NOT_CONFIRMED` selon la preuve disponible. Le rapport ne dit pas que l’établissement n’a pas de fiche ; il dit que la fiche n’a pas été confirmée dans le périmètre autorisé.

### 3.4 Ni GMB ni site retrouvés

Avec seulement le nom et la ville, le système demande l’adresse et reste dans `ASK_ADDRESS`. Il peut afficher une demande claire de précision, mais ne fabrique ni rapport GMB, ni audit SEO, ni concurrent, ni domaine.

Après réception d’une adresse valide, il ouvre `LOCAL_PREVIEW_WITHOUT_GMB` et produit uniquement les éléments locaux effectivement disponibles et sourcés. Si aucune source exploitable n’est disponible, le résultat reste explicitement `PARTIAL` avec la cause et la prochaine action.

Cette branche ne demande pas encore les photos, le menu ou les prix. Elle ne devient une préparation de site qu’après un rapport final local ou borné, puis le clic `Préparer mon site`.

## 4. Progression de l’intake

L’intake est en deux temps :

1. avant le rapport : nom, ville, confirmation d’identité, adresse si nécessaire et domaine si disponible ;
2. après le rapport final et `Préparer mon site` : e-mail, informations métier, menu, prix, horaires, histoire, langue, cinq catégories de photos et droits.

Un e-mail valide crée ou reprend une `DemoRequest` même si elle reste `INCOMPLETE`. Le `WebsiteFactoryPipelineRun` ne démarre qu’après complétude du dossier critique, des cinq catégories de photos et des droits connus.

## 5. Démo locale opérateur

La démo permet à l’opérateur de tester plusieurs établissements avec des données isolées et des états visibles. Elle peut utiliser un domaine public retrouvé et confirmé, ou un domaine public explicitement fourni par une surface opérateur ultérieure, pour exécuter l’audit SEO HTML borné. Elle peut produire une démo de site à partir des informations réellement fournies, sans paiement ni document juridique.

Chaque essai conserve : identité demandée, décision de rapprochement, domaine utilisé ou absence de domaine, modules disponibles, causes de partialité, preuves, rapport, données d’intake, assets, droits, version de configuration et artefacts produits.

Un résultat de démo porte la mention interne `DEMO_ONLY`. Il ne constitue ni une promesse commerciale, ni une validation juridique, ni une publication en production.

## 6. Critères d’acceptation

- [ ] nom + ville seuls ne déclenchent pas de crawl si aucun domaine fiable n’est confirmé ;
- [ ] l’absence de match ne devient jamais une affirmation d’absence GMB ;
- [ ] l’absence de site produit `SITE_NOT_CONFIRMED`, sans finding SEO inventé ;
- [ ] l’absence de GMB produit une branche `PARTIAL` ou `LOCAL_PREVIEW_WITHOUT_GMB`, sans conclusion définitive ;
- [ ] l’adresse seule débloque une branche locale bornée après absence de match ;
- [ ] menu, prix et photos ne sont demandés qu’au `ProgressiveIntake` de préparation ;
- [ ] la démo locale n’exige ni paiement ni validation juridique ;
- [ ] les gates e-mail, dossier critique, cinq catégories de photos, droits, QA et validation opérateur restent actives.
