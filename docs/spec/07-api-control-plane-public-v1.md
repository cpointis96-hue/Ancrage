# Spécification API Control Plane public V1

Statut : contrat implémenté localement et vérifié par tests HTTP ; non commercialisable
Version : 1
Périmètre : création/reprise du parcours public, lecture des états et rapports, `ProgressiveIntake`, `DemoRequest` et checkpoints
Hors périmètre : credentials fournisseurs, paiement, compte client, domaine, publication et cockpit opérateur

Cette spec transforme les décisions de [`01-vertical-slice-public-ancrage-v1.md`](01-vertical-slice-public-ancrage-v1.md), [`02-audit-gmb-seo-borné.md`](02-audit-gmb-seo-borné.md), [`03-website-factory-global-v1.md`](03-website-factory-global-v1.md) et [`04-website-factory-demo-v1.md`](04-website-factory-demo-v1.md) en frontière HTTP. Elle ne constitue pas une preuve d'exécution et ne remplace pas le vertical slice réel de l'issue 73.

## 1. Autorité et invariants

Le Control Plane est l'autorité unique des états, transitions, permissions, budgets, preuves, expirations et décisions. Le frontend ne calcule pas de transition et ne simule pas de progression.

Les identifiants publics sont opaques. Les réponses exposent uniquement des champs autorisés, bornés et classifiés ; elles n'exposent ni secrets, payloads bruts, e-mail en clair, cookies, tokens fournisseurs, chemins locaux ni score interne de rapprochement.

Les transitions suivantes sont obligatoires :

- `MinimalRequest` valide → rapprochement et enrichissement ;
- identité suffisamment confirmée → GMB et SEO de base en parallèle lorsque leurs préconditions respectives sont réunies ;
- `GMB_REPORT_READY` → livraison du rapport GMB HTML sans attendre le SEO général ;
- rapport final → téléchargement HTML/PDF et CTA `Préparer mon site` ;
- CTA + e-mail valide → création ou reprise d'une `DemoRequest`, éventuellement `INCOMPLETE` ;
- checklist complète + droits connus → autorisation du `WebsiteFactoryPipelineRun` ;
- `AcceptanceReport` sans `BLOCK` + validation opérateur → livraison de la démo.

## 2. Surface publique minimale

| Méthode et route | Usage | Effet métier |
|---|---|---|
| `POST /api/public/requests` | créer une `MinimalRequest` | crée ou reprend un parcours idempotent |
| `GET /api/public/requests/:requestId` | relire l'état courant | retourne l'état, checkpoints, causes et prochaines actions |
| `POST /api/public/requests/:requestId/match-decision` | confirmer ou corriger le rapprochement | ouvre la branche autorisée, sans choisir silencieusement |
| `GET /api/public/requests/:requestId/reports` | lister les livrables disponibles | expose GMB intermédiaire, rapport final et états de modules |
| `GET /api/public/requests/:requestId/reports/:reportId` | lire un rapport HTML autorisé | vérifie portée, expiration, révocation et classification |
| `GET /api/public/requests/:requestId/reports/:reportId/pdf` | télécharger le PDF final | disponible seulement après `FINAL_REPORT_READY` |
| `POST /api/public/requests/:requestId/preparation` | enregistrer le CTA et l'e-mail | crée ou reprend `DemoRequest` après e-mail valide |
| `GET /api/public/demo-requests/:demoRequestId` | relire la préparation | retourne checklist, manques, conflits et statut de génération |
| `PUT /api/public/demo-requests/:demoRequestId/intake` | compléter les champs autorisés | met à jour la préparation sans démarrer de run prématuré |
| `POST /api/public/demo-requests/:demoRequestId/assets` | enregistrer un upload préparé | rattache hash, catégorie, taille et statut des droits |
| `POST /api/public/demo-requests/:demoRequestId/start` | demander le démarrage réel | démarre uniquement si toutes les gates sont validées |

Les routes de rapport utilisent un lien signé et expirant distinct du lien de démo. Le détail des routes opérateur et les endpoints de paiement appartiennent à d'autres specs.

## 3. Enveloppes JSON

Toute réponse métier contient au minimum :

```json
{
  "schemaVersion": "public-control-plane-v1",
  "requestId": "req_opaque",
  "state": "SEO_REPORT_IN_PROGRESS",
  "status": "PARTIAL",
  "updatedAt": "2026-08-28T00:00:00.000Z",
  "checkpoints": [],
  "nextAction": { "kind": "WAIT", "reasonCode": "SEO_MODULES_PENDING" },
  "warnings": [],
  "errors": []
}
```

`checkpoints` contient `key`, `status`, `validatedAt`, `evidenceRefs`, `progressLabel` et, lorsqu'il existe, `blockedReason`. Une progression numérique n'est exposée que si elle provient de checkpoints validés ; elle ne peut pas être produite par le client.

Les erreurs suivent une enveloppe stable : `code`, `message` compréhensible, `retryable`, `nextAction`, `requestId` et `fieldErrors` éventuelles. Le message ne révèle ni détail de sécurité exploitable ni secret. Une erreur provider, licence, quota, budget ou provenance est distincte d'une erreur de saisie.

## 4. Création et idempotence

`POST /api/public/requests` exige un `Idempotency-Key` et un corps contenant uniquement `name`, `cityId`, `cityLabel` et `countryCode`. La ville libre seule est refusée.

Le serveur calcule une empreinte canonique du corps, de la version de schéma et du périmètre. Une reprise avec la même clé et la même empreinte retourne la ressource existante sans relancer l'enrichissement. Une même clé avec une empreinte différente retourne `IDEMPOTENCY_CONFLICT` et ne modifie rien.

Les actions de décision, préparation, intake, upload et démarrage utilisent la même règle. Une répétition réseau sûre retourne le dernier résultat persistant ; elle ne crée pas de second run, ne double pas une dépense et ne remplace pas un artefact immuable.

## 5. Contrats de préparation

`POST /api/public/requests/:requestId/preparation` exige `email`, `marketingConsent` facultatif et `Idempotency-Key`. Un e-mail invalide retourne une erreur de champ et ne crée aucune `DemoRequest`.

Un e-mail valide crée ou reprend une `DemoRequest` liée au `Prospect` et à l'audit. La réponse peut être `INCOMPLETE` et liste seulement les manques utiles : dossier critique, langue, catégories de photos, droits, contradictions et correction attendue. Aucun `WebsiteFactoryPipelineRun`, plan de contenu ou `SiteSpec` n'est créé dans cet état.

`POST .../start` ne réussit que si le rapport final existe, le dossier critique est cohérent, les cinq catégories sont présentes, chaque asset requis a des droits connus, la langue est choisie, les contrats sont activés et le budget est gelable. Sinon, la réponse est `PREPARATION_INCOMPLETE` ou `BLOCKED` avec la cause exacte et la prochaine action.

## 6. Rapports et partialité

`GET /reports` peut retourner simultanément un rapport GMB livré et un audit SEO en cours. `GMB_REPORT_READY` autorise le rapport GMB HTML mais jamais le PDF final ni `Préparer mon site`.

Un rapport `PARTIAL` contient ses modules disponibles, ses limites, ses causes, ses dates et ses preuves. L'API n'aplatit pas une branche absente en résultat négatif et ne transforme pas `UNKNOWN`, `CONFLICT` ou `AI_INTERPRETED` en `OBSERVED`.

Le PDF final et le CTA ne sont exposés qu'après `FINAL_REPORT_READY`. Le rapport et le PDF portent une expiration, une révocation possible et une référence de provenance ; le navigateur ne reçoit pas les payloads sources non redistribuables.

## 7. Sécurité, uploads et accès

Les routes publiques appliquent validation de schéma, taille, type, débit, anti-abus proportionné et corrélation par identifiant opaque. Les réponses sont `no-store` lorsqu'elles contiennent une donnée personnelle ou un statut temporaire.

Un upload est préparé par une autorisation bornée puis confirmé par hash, taille, type détecté, scan et catégorie. Un fichier refusé ne devient jamais un `PhotoAsset` autorisé. La suppression d'un asset est explicite et idempotente ; elle ne supprime pas la preuve immuable de la décision.

Les liens de rapports et de démo sont signés, expirants, révocables, `noindex` et séparés des secrets de workflow. L'API ne reçoit aucun secret fournisseur et ne renvoie jamais de token réutilisable côté serveur.

## 8. Tests et gates de planification

La tranche d'implémentation locale vérifie déjà :

1. schéma, ville structurée, erreurs de champ et messages sans secret ;
2. création, reprise et conflit d'idempotence ;
3. identité ambiguë, branche sans GMB et branche sans domaine ;
4. livraison GMB immédiate pendant SEO en cours ;
5. impossibilité d'exposer PDF/CTA avant le rapport final ;
6. création `DemoRequest` incomplète après e-mail valide ;
7. impossibilité de démarrer un run avant dossier, cinq catégories et droits ;
8. reprise après refresh, timeout, erreur provider et budget atteint ;
9. expiration, révocation, `noindex`, rate limiting et absence de secret ;
10. absence de logique de progression locale dans le frontend.

Les tests HTTP loopback prouvent le parcours local, les états, les rapports, les assets image et la validation opérateur. Ils ne ferment pas encore l'intégration provider réelle sur un run autorisé, la sécurité opérationnelle complète, ni l'issue 73.

## 9. Non-décisions et suite

Cette spec ne choisit pas le fournisseur d'e-mail, le stockage cloud, les credentials, les quotas publics, la rétention juridique, le mécanisme de paiement ou l'authentification `Account`. Ces choix restent soumis aux gates des specs 02–04, du ticket 40 et du vertical slice de l'issue 73.

La prochaine tranche est la validation runtime provider autorisée et la fermeture des gates de production. Le mode démo local reste sans paiement ni activation juridique ; `src/simulation/client-site-simulation.mjs` est corrigé pour son graphe local mais demeure explicitement déterministe.
