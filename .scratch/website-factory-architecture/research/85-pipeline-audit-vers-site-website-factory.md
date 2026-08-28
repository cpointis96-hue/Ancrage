# Audit to Site Pipeline

Type: workflow and transition reference
Status: architecture reference

## 0. Public intake lorsque le Mac est éteint

Le site public reçoit les informations et fichiers sans dépendre d'un modèle IA ni du Mac opérateur. `Cloudflare` fournit l'API et l'asynchrone, `Neon` conserve les métadonnées et états, et `Cloudflare R2` conserve temporairement les fichiers autorisés, notamment les lots courants de 10 à 20 Mo.

Le cockpit local propose « Synchroniser ». Le backend local télécharge les lots par curseur, vérifie leur schéma, taille et hash, les écrit dans une zone chiffrée et accuse réception. Après confirmation, le Control Plane supprime explicitement les objets R2 et marque le dossier `SYNCED_AND_PURGED`. Les erreurs restent récupérables et ne déclenchent jamais une suppression avant vérification.

## 1. Pipeline A — Audit and acquisition value

`CITY_SELECTED` → `MATCHING` → `GMB observation || SEO base` selon les préconditions → `GMB_REPORT_READY` when available → `SEO_REPORT_IN_PROGRESS` → `FINAL_REPORT_READY`.

If no reliable GMB match exists after the city and address are known, use `LOCAL_PREVIEW_WITHOUT_GMB` instead of fabricating a GMB result. The local preview can still include site discovery, keywords, direct competitors, and local SEO opportunities.

The report is displayed progressively. The first GMB result is not discarded while the base and full SEO audit continue. The final report combines the GMB and SEO modules, with sources, dates, confidence, findings, recommendations, and limits kept distinct. The base SEO branch does not wait for the GMB report or the five photos; the general SEO branch waits for the base results and the explicit resolution of the GMB branch.

## 2. Transition to Pipeline B

At `FINAL_REPORT_READY`, the prospect may click `Préparer mon site`.

The UI may show a preparation animation, but real generation is blocked until a valid e-mail is supplied. This is the anti-orphan rule. Marketing consent is separate from transactional delivery consent.

## 3. Pipeline B — Website Factory

After e-mail confirmation, the pipeline runs:

1. freeze input snapshot and configuration versions;
2. normalize verified business facts;
3. combine audit findings and local intent evidence;
4. select page opportunities and reject artificial local pages;
5. draft business positioning and copy from verified facts;
6. select authorized supplied assets;
7. translate only the chosen publication language when required;
8. compose versioned `SiteSpec`;
9. render deterministic PHP/static output;
10. run SEO, copy, accessibility, visual/mobile, security, links, and cost gates;
11. create `AcceptanceReport`;
12. stop at `READY_FOR_OWNER_REVIEW`.

## 4. Audit-to-Site mapping

| Audit output | Site use | Guardrail |
|---|---|---|
| verified name/address/phone/hours | identity, contact, structured data | source and conflict required |
| GMB category and local signals | positioning and local context | never keyword-stuff the name |
| keyword intent | page titles, headings, content priorities | intent must be useful to visitors |
| competitor gap | content and conversion opportunities | no copying and no unsupported claims |
| market/tourism context | visit guidance and relevant local pages | real relationship required |
| technical findings | renderer and QA requirements | measurements before AI explanation |
| supplied history/story | about/positioning copy | never invent missing history |
| supplied photos | hero/menu/interior/team assets | rights and provenance required |

## 5. Human boundary

The owner sees the candidate site, gates, warnings, sources, versions, costs, and evidence. The owner must validate before the demo is sent. Rejection does not trigger paid automatic retry. The owner may use the Codex/local correction path, import a controlled build, rerun checks, and validate again.

## 6. Demo and production

After owner validation, send the private demo link by e-mail. No account or payment is required to view it. The demo is private, `noindex`, revocable, and available for 7 days after presentation.

Only after the prospect chooses the purchase CTA do payment, domain ownership confirmation, production publication, and production-specific rights gates occur.
