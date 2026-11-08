# Architecture

## Cible

Le moteur d’audit complet fonctionne sur une infrastructure hébergée, sans dépendre du Mac ni de l’ouverture du cockpit : collecte, analyse, appels fournisseurs, journal de coûts, production HTML/PDF et récupération des résultats. Le cockpit pilote et consulte le service. Son format desktop ou web reste indépendant de cette exigence. [Décision](adr/0001-hosted-audit-engine.md).

## Runtime livré

Le programme est en JavaScript ESM, sur Node.js, sans dépendance externe. `src/server.mjs` assemble les services, attend leur initialisation puis sert `app/` et l’API sur `127.0.0.1`.

| Module | Responsabilité |
|---|---|
| `src/app.mjs` | Composition, injection des adaptateurs, seeds et migrations de configuration. |
| `src/http/` | Serveur, routes, contrôle Origin, corps JSON et réponses. |
| `src/public/` | Demandes publiques, rapports, préparation et transitions du pipeline. |
| `src/audit/` | Crawl borné, observations, qualification, AuditPacket, rendu HTML/PDF. |
| `src/config/` | Prompts, contrats, workflows, templates et profils CLI versionnés. |
| `src/providers/` | Adaptateurs fournisseurs, configuration et accès aux secrets. |
| `src/workflows/` | Validation de graphes, exécution, checkpoints et reprise. |
| `src/runs/` | Artefacts et ledger des coûts. |
| `src/dossiers/` | Dossiers établissement, menu et photos. |
| `src/geography/` | Autocomplétion et identité Google Places. |
| `src/internet/` | Recherche de domaines, sans achat. |
| `src/demo/` | Workbench de préparation et aperçu. |
| `src/demos/` | Publication temporaire des aperçus, expiration et révocation. |
| `src/simulation/` | Parcours synthétique de génération et QA. |
| `src/core/` | Stockage atomique, erreurs, IDs et validation JSON. |
| `src/system/` | Ouverture optionnelle de ressources du cockpit sur macOS. |

Les données et configurations actives sont sous `ANCRAGE_DATA_DIR`. Les fichiers de `fixtures/defaults/` initialisent les configurations ; ils ne constituent pas les données d’exécution. Les seeds et migrations reconnaissent les versions livrées pour préserver les brouillons personnalisés.

## Invariants

- Le Control Plane décide des états ; le navigateur affiche les réponses et ne simule pas la progression.
- Les appels réseau passent par des adaptateurs injectables ; tests et simulations utilisent des doubles.
- Chaque exécution conserve les versions de configuration utilisées. Modifier un brouillon n’altère pas un run lancé.
- Le ledger réserve les coûts avant appel, puis rapproche coût réel ou annulation. Une erreur réseau ne prouve pas la gratuité.
- Les rapports public HTML/PDF dérivent du même document et du packet d’audit ; statuts, chiffres et limites doivent rester cohérents.
- Les collectes restent bornées et protégées contre les cibles privées et redirections non autorisées. Absence de données et mesures nulles sont distinctes.
- Les secrets restent hors navigateur, prompts, données métier et journaux. En développement macOS, l’adaptateur Keychain est utilisé ; ailleurs, le magasin par défaut est volatil.
- Le stockage fichiers garde confinement des chemins, permissions restrictives, écriture temporaire, fsync, rename et préconditions par hash.

## Passage à l’hébergement

Le serveur livré regroupe les routes de consultation et de mutation du cockpit avec les routes publiques ; il ne doit pas être exposé tel quel. Les continuations d’audit sont en mémoire et les états utilisent des fichiers : un redémarrage ou plusieurs workers exigent une stratégie de reprise et de concurrence validée.

L’exécution du crawl dans Node n’impose pas un Mac : le libellé `local-crawl` désigne le processus de collecte, pas un besoin d’ordinateur opérateur. L’ouverture Finder reste une capacité optionnelle du cockpit.

Le choix du runtime, des jobs durables, des secrets serveur et du stockage de production reste à résoudre dans les [travaux actifs](../.scratch/hosted-audit/spec.md). La preuve attendue est un audit terminé depuis le site hébergé, Mac éteint, y compris après interruption puis reprise du worker.

## Publication Cloudflare appartenant au client

La publication commerciale d’un site client ne peut pas réutiliser un jeton Cloudflare opérateur. Le backend devra lier chaque projet à un compte Cloudflare autorisé par son propriétaire, limiter les scopes à Registrar et Pages, vérifier le domaine et le prix avant chaque achat, puis déployer uniquement un artefact de site validé. L’enregistrement facture le moyen de paiement par défaut du compte client; Ancrage ne collecte aucun paiement pour le domaine.

Cette intégration dépend d’une identité client et d’une persistance hébergée multi-tenant absentes du runtime actuel. Les routes actuelles et le stockage par fichiers sont pour le cockpit local; ils ne doivent pas être exposés comme API de provisioning client. Les artefacts de la simulation ne sont pas publiables comme sites commerciaux.
