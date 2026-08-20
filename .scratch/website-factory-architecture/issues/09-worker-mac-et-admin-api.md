# Quelle architecture sûre relie le cockpit Mac au Control Plane cloud ?

Parent: ../map.md
Type: research
Status: open

## Question

Comparer, à partir de documentations officielles et de pratiques de sécurité reconnues, les architectures possibles pour `Browser -> localhost backend -> authenticated remote admin API -> cloud services`.

Établir les exigences pour authentification admin, stockage local des credentials, secrets fournisseurs, reconnexion, jobs repris après extinction du Mac, fallback cloud, cache local éventuel et évolution future vers un accès distant.

## Comments

## Decision

Le cockpit reste local sur le Mac et le service public/cloud reste opérationnel lorsque le Mac est éteint. Le Mac est un worker opportuniste pour les modèles locaux, Lighthouse, Playwright, builds et corrections Codex. Il ne doit pas être une dépendance de disponibilité ni contenir les secrets cloud dans le navigateur.

La connexion passe par un backend local authentifié vers une Admin API distante avec tokens courts et révocables.
