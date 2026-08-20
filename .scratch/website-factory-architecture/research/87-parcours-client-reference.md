# Parcours client de référence — Website Factory

Type: document de compréhension humain + IA
Statut: référence de parcours
Version: 1

## Règle de lecture

Ce fichier décrit la logique commerciale et l'ordre obligatoire des étapes. Une future IA, un agent ou une intégration API peut améliorer l'exécution, le coût ou la vitesse, mais ne doit pas inverser ces étapes ni demander un paiement avant la démo.

La promesse centrale est simple : le prospect reçoit d'abord une valeur visible, voit ensuite une démo de son propre site, puis décide éventuellement de payer pour la mise en production.

## Parcours en une ligne

`Nom + ville sélectionnée` → `Enrichissement` → `Formulaire progressif + 5 photos` → `Audit GMB visible` → `Audit SEO complet` → `Rapport final GMB + SEO` → `Préparer mon site` → `E-mail obligatoire` → `Génération du site` → `QA + validation opérateur` → `Lien de démo gratuit` → `Achat éventuel` → `Mise en production`.

## Les 6 règles IF / THEN

### IF 1 — Ville

**IF** le prospect commence à saisir une ville, **THEN** le système affiche des villes structurées avec pays et identifiant géographique.

La ville doit être sélectionnée dans la liste. Une ville écrite librement et non sélectionnée n'est pas une référence valide. Cela réduit les homonymes et évite de lancer un enrichissement sur la mauvaise zone.

### IF 2 — Identification de l'établissement

**IF** une seule fiche GMB correspond fortement au nom et à la ville sélectionnée, **THEN** le système affiche le nom, la fiche et une ou deux images disponibles, puis continue automatiquement.

**IF** plusieurs fiches correspondent, **THEN** le système affiche 2 à 3 candidats avec nom, adresse, téléphone et image si disponibles, puis attend la confirmation « C'est mon établissement ».

**IF** aucune fiche GMB fiable ne correspond, **THEN** le système ne redemande pas la ville et demande seulement l'adresse de l'établissement pour ouvrir la branche d'aperçu local.

### IF 3 — Dossier et première valeur

**IF** l'établissement est suffisamment identifié ou si la branche sans GMB possède une adresse, **THEN** le système lance l'enrichissement et le formulaire progressif.

Le dossier de génération doit contenir les informations critiques et cinq photos obligatoires : façade, deux plats signatures, intérieur/terrasse et équipe/propriétaires/service. Une information manquante ou contradictoire ne doit jamais être inventée.

Dans la branche où aucun site fiable et aucune fiche GMB ne sont confirmés, le parcours peut tout de même avancer vers la préparation du site lorsque le dossier minimal est suffisamment renseigné : nom de l'établissement, nom et prénom du contact ou propriétaire, informations métier essentielles, plats, prix et images autorisées. Les cinq photos obligatoires restent requises avant toute génération réelle.

### IF 4 — Audits et rapport progressif

**IF** l'audit GMB est terminé, **THEN** le système affiche immédiatement sa restitution au prospect et montre une ligne d'avancement indiquant que l'audit SEO complet continue.

**IF** l'audit SEO complet est terminé, **THEN** le système affiche un rapport final bien structuré qui réunit l'audit GMB et l'audit SEO.

Dans la branche sans GMB, le rapport indique clairement la limite et fournit un aperçu local borné : site officiel éventuellement trouvé, mots-clés et intentions locales, concurrents directs, comparaison de leurs présences et opportunités de SEO local.

### IF 5 — Préparation du site et e-mail

**IF** le rapport final est disponible et que le prospect clique sur « Préparer mon site », **THEN** une animation de préparation s'affiche et demande l'adresse e-mail.

La génération réelle du site ne commence pas tant qu'une adresse valide n'est pas fournie. L'animation ne doit pas prétendre qu'un site est déjà créé. L'e-mail sert à éviter les démos orphelines et à envoyer ensuite le lien privé.

Cette règle s'applique également à la branche sans site et sans GMB : dès que le dossier minimal et les cinq photos sont prêts, « Préparer mon site » est proposé ; le clic ouvre immédiatement la collecte de l'adresse e-mail, puis seulement le `WebsiteFactoryPipelineRun` peut démarrer.

Après l'e-mail, le `WebsiteFactoryPipelineRun` peut utiliser les informations collectées : contenu métier, mots-clés, étude locale, concurrents directs, assets, traduction éventuelle, `SiteSpec`, rendu déterministe et QA.

### IF 6 — Démo puis achat

**IF** la génération, les contrôles et la validation opérateur sont terminés, **THEN** le système envoie à l'adresse fournie un lien privé vers la démo gratuite.

La démo est consultable sans compte ni paiement pendant 7 jours après sa présentation. Elle reste protégée, révocable et `noindex`.

**IF** le prospect aime la démo et clique sur le CTA d'achat, **THEN** le parcours propose le paiement, puis seulement les confirmations de domaine et de mise en production.

## Ce qui ne doit jamais être inversé

- Ne jamais demander le paiement avant que le prospect ait vu sa démo.
- Ne jamais demander l'e-mail avant le clic « Préparer mon site ».
- Ne jamais lancer une génération réelle sans e-mail valide.
- Ne jamais cacher le premier audit GMB jusqu'à la fin de l'audit SEO.
- Ne jamais présenter une démo avant la validation opérateur.
- Ne jamais confondre l'aperçu local sans GMB avec la preuve que l'établissement n'a aucune fiche.
- Ne jamais transformer une suggestion SEO en fait vérifié.
- Ne jamais promettre une première position, un trafic garanti ou un délai de classement.

## Rôles techniques derrière le parcours

Les agents et APIs travaillent derrière ces états. Ils ne définissent pas le parcours commercial.

- `Control Plane` : source de vérité, états, budgets, checkpoints, provenance et transitions.
- `Agent Plane` : contributions spécialisées, structurées et validables.
- `ProgressCheckpoint` : seule source de la progression affichée au prospect.
- `EstablishmentMatch` : candidats, confiance, provenance et décision d'identité.
- `SEOAudit` / `SEOReport` : mesures, faits, recommandations, preuves et limites séparés.
- `WebsiteFactoryPipelineRun` : génération du contenu et du `SiteSpec` après clic et e-mail.
- `AcceptanceReport` : preuves QA et décision de validation opérateur avant présentation.

## Comment modifier ce parcours plus tard

Toute proposition future doit préciser :

1. l'étape concernée ;
2. la règle `IF / THEN` modifiée ;
3. la valeur client améliorée ;
4. la friction ajoutée ou retirée ;
5. l'impact sur les agents, APIs, coûts, consentements et QA ;
6. la raison pour laquelle l'ordre commercial reste cohérent.

Une modification technique ne vaut pas décision produit. Si elle déplace l'e-mail, le rapport, le CTA, la démo, le paiement ou la validation humaine, elle doit être discutée comme une modification de ce document.

## Sources de détail

- `map.md` — carte et décisions d'architecture.
- `issues/67-identification-etablissement-et-sources.md` — identité, ville, fiche GMB et branche sans GMB.
- `issues/70-modele-pipeline-audit-seo.md` — états et pipeline d'audit.
- `issues/77-progression-rapport-et-agents-paralleles.md` — audits parallèles et pipeline Website Factory.
- `issues/78-progression-reelle-cta-mobile.md` — progression et CTA Mobile First.
- `issues/04-frontiere-validation-humaine.md` — validation avant présentation.
- `issues/47-acces-demo-sans-friction.md` et `issues/48-duree-de-vie-demo.md` — accès et durée de la démo.
- `issues/50-registre-fournisseurs-et-routage-ia.md` à `issues/56-qa-independant-et-fail-closed.md` — agents, fournisseurs, budgets et QA.
