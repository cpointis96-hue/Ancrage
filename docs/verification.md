# Vérification

## Commandes reproductibles

```sh
npm run check
npm test
npm run dev
```

Le contrôle couvre syntaxe des modules, JSON et liens locaux. Les tests couvrent stockage, budgets, versions, audits, provenance, dossiers, workflows, API, génération synthétique et reprise. Les tests HTTP nécessitent une écoute loopback autorisée.

## Résultats du 2026-11-07

- `npm test` : 195 tests réussis, aucun échec ni test ignoré, après relance avec écoute loopback autorisée le 7 novembre. La relance dans le bac à sable avait bloqué 13 tests avec `listen EPERM`.
- `npm run check` : 94 modules JavaScript, 21 fichiers JSON et 16 liens locaux vérifiés.
- `npm run dev` : démarrage vérifié sur un port temporaire, avec données isolées ; cockpit, intake, modules JavaScript, image, police et API répondent 200 ; Origin étranger refusé avec 403. Serveur de vérification arrêté et données temporaires supprimées.
- Un seul `AGENTS.md` principal ; consignes locales sous les modules. Aucun dossier de sauvegarde créé.
- Sorties générées, données runtime et secrets exclus du périmètre Git. Aucune modification publiée à distance.

## Limites

Les tests n’appellent aucun fournisseur payant. Ils ne prouvent ni l’hébergement en production, ni un audit disponible Mac éteint, ni les permissions de comptes réels. Le déploiement et la reprise durable restent décrits dans les travaux actifs.
