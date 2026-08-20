# Quel critère permet de déclarer une démo suffisamment bonne ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 12-contenu-minimal-de-la-demo.md

## Question

Quelle checklist fixe permet de déclarer une `Demo` livrable au restaurateur dans le délai cible ?

Recommandation : vérifier la présence des éléments promis, la lisibilité Mobile First, l'exactitude des données fournies, l'affichage correct des photos, le fonctionnement du CTA contact/réservation, l'absence de liens cassés et un minimum d'accessibilité et de performance. Une réservation en ligne réelle et un SEO avancé ne doivent pas être requis pour la première démo.

À préciser : seuils objectifs, données manquantes acceptables, validation humaine ou automatique, screenshots attendus, statut d'échec, retry et décision de montrer ou suspendre la démo.

## Proposition de définition « parfaite pour présentation »

La démo ne devient `presentable` que si elle passe les gates obligatoires et qu'un `AcceptanceReport` conserve les preuves, les exceptions et la décision. Le délai cible d'une heure mesure le traitement ; il ne doit jamais autoriser la présentation d'une démo défectueuse.

### Gates bloquants

#### 1. Fidélité des données et provenance

- identité, adresse, horaires, coordonnées et offre/menu cohérents avec les données fournies ou validées ;
- aucun plat, prix, service, horaire, label, récompense ou argument commercial inventé ;
- les éléments inconnus sont omis ou explicitement marqués « à confirmer » ;
- les photos sont disponibles, lisibles et autorisées selon le dossier fourni.

#### 2. Intégrité du contenu

- aucun lorem ipsum, texte de remplissage, placeholder visible ou mélange de langues involontaire ;
- menu lisible, hiérarchisé et fidèle ;
- prix, unités, accents, noms de plats et coordonnées préservés ;
- titres, descriptions et CTA compréhensibles par un client réel et au dessus de la ligne de flotaison;
- aucune promesse SEO, commerciale ou de réservation que le produit ne peut pas tenir.

#### 3. Parcours et fonctionnement

- navigation principale fonctionnelle ;
- aucun lien cassé ;
- CTA contact/réservation ouvrant exactement le canal prévu ;
- téléphone, email, URL externe et adresse vérifiés au minimum syntaxiquement ;
- aucun bouton qui simule une réservation, commande ou paiement non disponible ;
- états de chargement, erreur et absence de données compréhensibles.
- CRO best practice

#### 4. Mobile First et rendu visuel

- aucun débordement horizontal, texte coupé, image étirée ou composant superposé ;
- hiérarchie claire dès le premier écran ;
- menu et CTA utilisables au pouce ;
- photos correctement cadrées et cohérentes avec le restaurant ;
- contrastes, espacements, typographie et composants cohérents sur les pages ;
- vérification par screenshots sur les dimensions mobiles principales, puis contrôle tablette et desktop ;
- aucune impression de template cassé, de page vide ou de contenu assemblé sans direction.

#### 5. Accessibilité et performance de base

- structure sémantique et langue de page correctes ;
- navigation clavier et focus visibles ;
- labels, alt text et messages d'erreur présents là où nécessaires ;
- aucun défaut d'accessibilité critique ou sérieux non traité ;
- chargement sans écran bloqué ni erreur console critique ;
- images dimensionnées et optimisées ;
- contexte et date conservés pour chaque mesure de performance.

#### 6. SEO technique cocon semantique de laurent bourelly, meilleur technique seo

- titre et description cohérents avec le restaurant ;
- URL, canonical et langue cohérents ;
- données structurées `Restaurant` uniquement à partir d'informations vérifiées ;
- robots, sitemap et indexabilité conformes à l'état `Demo` ;
- preview protégée contre l'indexation publique si la politique de démo le décide.

#### 7. Traduction

- une seule langue de publication choisie ;
- traduction IA identifiée comme dérivée de la langue source ;
- noms propres, plats, prix et placeholders protégés ;
- `TranslationReview` effectuée avant présentation d'une version traduite ;
- aucune traduction partiellement mélangée avec la langue source sans signalement.

### Warnings acceptables

Un warning peut rester uniquement s'il ne touche ni l'exactitude, ni la compréhension, ni le parcours commercial, et s'il est visible dans l'`AcceptanceReport` interne. Exemples : photo secondaire manquante, section optionnelle absente, recommandation SEO non prioritaire.

### Revue humaine obligatoire

Avant présentation au prospect, un opérateur valide au minimum : exactitude des informations, qualité du menu, ton des textes, crédibilité des photos, cohérence visuelle, traduction, CTA et absence de promesse trompeuse. `/impeccable` intervient ensuite comme revue esthétique et UX approfondie ; il ne remplace ni les contrôles de données, ni l'accessibilité, ni la sécurité, ni l'approbation métier.

### Décision et preuves

Chaque version doit conserver : `SiteVersion`, sources et provenance, résultats automatisés, screenshots, anomalies, warnings acceptés, avis humain, date, reviewer et décision `presentable`, `needs_correction` ou `suspended`.

## Answer

Le délai d'une heure est un **hard timeout**, pas une cible souple :

- `T+0` commence lorsque le dossier est déclaré complet et que la `DemoGeneration` démarre ;
- à `T+1h`, le workflow s'arrête et ne consomme plus de ressources de génération ;
- une démo qui n'a pas franchi les gates obligatoires avant cette limite ne devient pas `presentable` ;
- la démo passe dans un état de timeout/intervention et le prospect ne reçoit pas silencieusement un résultat incomplet ;
- le cockpit reçoit une alerte et affiche la démo concernée, l'étape bloquée, les logs, les erreurs, la durée, les coûts et les actions possibles ;
- un bouton d'intervention avancée permet d'ouvrir le contexte de la démo dans Codex, sous réserve de définir ultérieurement le mécanisme sûr de handoff ;
- la qualité minimale reste obligatoire, mais elle doit être obtenue avant la limite : le système ne prolonge pas automatiquement le délai pour atteindre la qualité.

La checklist précédente devient donc une condition de présentation **avant T+1h**. Après timeout, la décision est `suspended`/`needs_intervention`, jamais `presentable` par défaut.

## Comments

- Décision du propriétaire : « 1h max ; si ça dépasse, ça stoppe, m'envoie un signal dans la web app, expose les logs et permet d'ouvrir l'avancé du site dans Codex ».
- La qualité doit être obtenue avant `T+1h`; après cette limite, aucun prolongement implicite ni présentation automatique n'est autorisé.

## Decision — écran de validation propriétaire

L'écran final du cockpit affiche de façon compacte :

- aperçu navigable de la démo ;
- checklist des gates `PASS/WARN/BLOCK` ;
- erreurs et warnings avec explication simple ;
- sources et provenance des informations critiques ;
- versions de SiteSpec, templates, agents et modèles utilisés ;
- durée, coût estimé/réel et éventuels fallbacks ;
- screenshots mobile/desktop, accessibilité, performance et liens ;
- boutons `Valider et préparer l'envoi`, `Bloquer et ouvrir dans Codex` et `Abandonner`.

La validation ne montre jamais directement la démo au prospect : elle prépare seulement l'envoi. L'envoi reste une action explicite séparée.
