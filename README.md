# Ancrage

Outil d’audit de visibilité locale et de préparation de sites pour petites entreprises. Il comprend une entrée publique, un cockpit opérateur, un moteur d’audit et un parcours de démonstration de site.

Le [bilan depuis le 11 octobre 2026](docs/BILAN-DEPUIS-LE-11-OCTOBRE.md) décrit les évolutions constatées, les vérifications et les décisions pour l’IA et l’hébergement.

## Démarrer

Node.js 22 ou supérieur. Aucune dépendance npm à installer.

```sh
npm run check
npm test
npm run dev
```

- Cockpit : <http://127.0.0.1:4173/>
- Entrée publique : <http://127.0.0.1:4173/intake.html>
- `PORT` change le port ; `ANCRAGE_DATA_DIR` change le répertoire de données (défaut : `.ancrage/`).
- Ctrl+C arrête le serveur de développement.

Les fournisseurs se configurent dans le cockpit. Le serveur de développement écoute uniquement sur la boucle locale. L’ouverture de l’interface ne lance pas un audit payant.

## Fonctionnement

Le moteur collecte des pages publiques, calcule des observations SEO, peut enrichir le diagnostic via les fournisseurs configurés et produit des rapports HTML/PDF avec sources, limites et budget. Les parcours synthétiques de génération de site sont identifiés comme des simulations.

La cible retenue est un **moteur d’audit intégralement hébergé**, utilisable quand le Mac et le cockpit sont éteints. Le runtime livré reste un environnement de développement : authentification des routes privées, jobs durables, secrets serveur et stockage de production sont encore à mettre en place. Voir [l’architecture](docs/architecture.md) et [le travail restant](.scratch/hosted-audit/spec.md).

## Organisation

```text
app/                 Interfaces et ressources visuelles
src/                 Services métier et serveur de développement
fixtures/defaults/   Configuration initiale versionnée
scripts/             Contrôles et prévisualisation
test/               Tests et données synthétiques
docs/               Architecture, parcours, guides et vérification
.scratch/            Décisions et tickets actifs
.agents/skills/      Outils de travail des agents
```

Un seul [AGENTS.md](AGENTS.md) principal oriente vers les consignes de chaque module. Le [glossaire](CONTEXT.md) définit les objets du programme. Le [parcours](docs/parcours.md) fixe les règles métier.

## Vérification et prévisualisation

`npm run check` contrôle la syntaxe JavaScript, les fichiers JSON et les liens Markdown locaux. `npm test` exécute les tests synthétiques sans fournisseur payant ; certains tests ouvrent un port loopback. Voir [les résultats de vérification](docs/verification.md).

`npm run preview:audits` produit des rapports synthétiques dans `outputs/audits/`, ignoré par Git. Le script `scripts/verify-audit-live.mjs` est réservé aux essais réels explicitement autorisés et bornés en budget.

## Configuration et données

Voir [les workflows et prompts](docs/guides/configurer-workflows-prompts.md) et [les fournisseurs](docs/guides/providers-api.md).

Les secrets, `.ancrage/`, les sorties générées et les logs sont exclus de Git. `.env.example` ne contient que les variables consommées par le programme ; `.env.local` n’est pas chargé automatiquement par `npm run dev`. Les clés enregistrées depuis le cockpit passent par le trousseau macOS en développement ; le magasin par défaut sur les autres systèmes reste en mémoire.
