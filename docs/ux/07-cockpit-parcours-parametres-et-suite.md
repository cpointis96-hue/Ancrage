# Cockpit — parcours opérateur, paramètres et suite Wayfinder

Status: prototype UX approfondi, avant `to-spec`

## Base validée

Le parcours public E0–E7 constitue l'entrée du système. Le cockpit ne le remplace pas : il reçoit un dossier après l'e-mail et prend le relais pour synchroniser, exécuter, inspecter, corriger, contrôler et valider la démo.

Prototype de travail : [`prototypes/ux-vertical-slice/cockpit-operator-v2.html`](../../prototypes/ux-vertical-slice/cockpit-operator-v2.html). L'ancien prototype reste conservé pour comparaison : [`cockpit-operator-e0-e7.html`](../../prototypes/ux-vertical-slice/cockpit-operator-e0-e7.html).

## Procédure complète jusqu'à la fin du projet

1. **Recevoir** — afficher les dossiers de `CloudIntakeInbox`, vérifier le hash, importer de façon idempotente et conserver les erreurs reprenables.
2. **Qualifier** — confirmer l'établissement, les sources, les photos, les droits, les champs manquants et le périmètre autorisé.
3. **Préparer** — figer les versions d'agents, prompts, schémas, politiques de données, profils de crawl et budgets attachés au run.
4. **Exécuter** — lancer les étapes déterministes puis les agents autorisés ; suivre les checkpoints, les fallbacks, les coûts et les limites.
5. **Reprendre ou corriger** — traiter `PARTIAL`, `WARN`, `BLOCK` et les erreurs sans relancer inutilement les étapes déjà validées.
6. **Contrôler** — vérifier provenance, liens, rendu, accessibilité, contenu obligatoire, secrets absents et rapport QA.
7. **Décider** — `Valider`, `Renvoyer en correction` ou `Abandonner`. La validation opérateur est un gate distinct.
8. **Remettre** — seulement après validation, rendre le lien privé disponible et envoyer l'e-mail prévu.
9. **Convertir** — après achat et validation explicite, créer la version de production ; domaine, contenus, export et nouvelle validation restent séparés de la démo.

## Surfaces du cockpit

| Surface | Décision principale | Contrôles avancés dans le détail |
|---|---|---|
| À traiter | quoi faire maintenant | sync, blocage, cause, âge, reprise |
| Runs | quel run inspecter ou reprendre | étapes, preuves, coût, versions, journal |
| Dossiers | le dossier est-il exploitable ? | sources, photos, droits, complétude, provenance |
| Agents | quelle version d'un rôle peut être activée ? | prompts, contrats, outils, exécution, budgets, versions |
| Qualité | peut-on présenter la démo ? | PASS/WARN/BLOCK, QA, limites, décision opérateur |
| Système | le socle partagé est-il fiable ? | providers, modèles, MCP, politiques, budgets, sync, profils CLI |

## Paramètres modifiables par l'opérateur

Les paramètres sont modifiables uniquement via un brouillon versionné et prévisualisable. Un run en cours conserve sa configuration de départ.

- **Dossier** : identité, adresse, coordonnées, photos, droits, sources, périmètre, données autorisées et durée de conservation.
- **Rapport** : ordre des sections, textes, priorités, seuils d'affichage, statut `PARTIAL`, résumé, actions prioritaires, exports et modèle d'e-mail.
- **Agent** : rôle, étape, données acceptées, prompt, schéma de sortie, seuils, validation humaine, activation et version.
- **Provider / modèle** : endpoint, région, capacités, vision, structured outputs, outils, latence, coût, données permises, usages interdits, état de santé et secret stocké hors navigateur.
- **Routage** : déterministe, local préféré, cloud autorisé, fallback de capacité équivalente, modèle premium sur confirmation uniquement.
- **Crawl** : profil, URL, limites de durée/taille/CPU/RAM, redirections, ports, exports, commande préparée et dossier isolé.
- **Budget** : appel, agent, étape, génération, prospect, fournisseur, jour, mois, plafond global ; alertes 50/80/100 % et arrêt dur à 100 %.
- **Qualité** : checks obligatoires, seuils, règles de provenance, liens, responsive, accessibilité, secrets, contenu et critères de validation.
- **Système** : synchronisation, sauvegarde, conservation, restauration, logs, bridge local, état cloud, mode hors ligne et permissions.

## Ce qui manque encore avant la production

1. Résoudre les décisions métier restantes : contenu exact de la démo, nombre de pages, durée du lien, régénérations, plans, domaine et sortie production.
2. Fermer la carte Wayfinder et les tickets encore ouverts sur providers, données, crawl, sécurité, coûts et QA.
3. Valider les contrats réels du `Control Plane` : objets, événements, idempotence, reprise et frontières local/cloud.
4. Remplacer les données fictives du prototype par des fixtures traçables, puis tester les états vide, chargement, partiel, warning, bloqué, erreur et hors ligne sur chaque surface.
5. Produire la spec d'interface et les tokens à partir de la référence visuelle, avec clavier, zoom 200 %, contraste, lecteurs d'écran et mouvement réduit.
6. Construire le vertical slice technique public → intake → sync → run → QA → validation → démo, sans construire encore tout le catalogue de sites clients.
7. Tester sur données synthétiques et fixtures locales avant toute connexion externe ; ensuite seulement valider Cloudflare, Neon, R2 et les providers.

Le passage à `to-spec` n'est pas encore justifié tant que les décisions métier et les contrats de contrôle ne sont pas fermés. Le nouveau prototype sert précisément à examiner les choix d'interface et à révéler les trous restants.
