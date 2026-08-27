# Quelle architecture sûre relie le cockpit Mac au Control Plane cloud ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Comparer, à partir de documentations officielles et de pratiques de sécurité reconnues, les architectures possibles pour `Browser -> localhost backend -> authenticated remote admin API -> cloud services`.

Établir les exigences pour authentification admin, stockage local des credentials, secrets fournisseurs, reconnexion, jobs repris après extinction du Mac, fallback cloud, cache local éventuel et évolution future vers un accès distant.

## Comments

## Decision

Le cockpit reste local sur le Mac et le service public/cloud reste opérationnel lorsque le Mac est éteint. Le Mac est un worker opportuniste pour les modèles locaux, Lighthouse, Playwright, builds et corrections Codex. Il ne doit pas être une dépendance de disponibilité ni contenir les secrets cloud dans le navigateur.

La connexion passe par un backend local authentifié vers une Admin API distante avec tokens courts et révocables.

## Synchronisation de l'intake lorsque le Mac est éteint

Le service public dépose les formulaires et fichiers dans une `CloudIntakeInbox` persistante : métadonnées dans `Neon`, objets de 10 à 20 Mo ou autres fichiers autorisés dans `Cloudflare R2`. Aucun modèle IA ni worker Mac n'est requis pour cette réception.

Le cockpit local déclenche une synchronisation manuelle via le backend local authentifié. Le backend récupère un lot par curseur, vérifie l'identifiant de dossier, la version du schéma, la taille et le hash, écrit dans une zone locale chiffrée et idempotente, puis accuse réception. Le Control Plane ne supprime les objets R2 qu'après cet accusé de réception ; une relance reprend le même lot sans doublon. Une suppression lifecycle de secours traite les objets orphelins.

## Answer

La frontière retenue est un cockpit local servi par `LocalBridge`, avec authentification locale vers une Admin API distante au moyen de tokens courts et révocables. Le navigateur ne reçoit ni credential cloud, ni secret provider, ni accès shell. Le Control Plane reste disponible Mac éteint ; le Mac ne reprend que les lots et jobs compatibles avec ses capacités locales.

La synchronisation est manuelle et idempotente : curseur, identifiant opaque de dossier, version de schéma, taille et hash sont vérifiés avant écriture atomique locale. L'accusé de réception précède toute suppression R2. Une divergence devient `SYNC_BLOCKED`, une interruption devient `SYNC_RETRY`, et un besoin d'archive locale lorsque le Mac est éteint devient `WAITING_FOR_MAC`.

Décision d'architecture résolue le 27 août 2026. Les comptes, permissions minimales, tokens réels, reconnexion et restauration restent des gates de test, sans modifier la fondation Ancrage.
