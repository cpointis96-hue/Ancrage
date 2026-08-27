# Ancrage local — runbook de démarrage

## Démarrer

Depuis la racine du dépôt :

```sh
npm test
npm run check
npm run dev
```

Le bridge écoute uniquement sur `http://127.0.0.1:4173` par défaut et sert le cockpit depuis `app/`. Le répertoire de données est `.ancrage/`, ou la valeur de `ANCRAGE_DATA_DIR`. Il est ignoré par Git.

Pour lancer le scénario client synthétique depuis le cockpit, ouvrir `Configuration` puis choisir `Lancer un test`. La même simulation peut injecter une interruption contrôlée par API :

```sh
curl -s -X POST http://127.0.0.1:4173/api/simulations/client-site \
  -H 'content-type: application/json' \
  -d '{"profile":{"name":"Maison Sillage","city":"Pattaya"},"fault":"site-build"}'
```

La réponse `FAILED` est attendue dans ce cas ; reprendre le `run.id` sur `/api/simulations/client-site/<run-id>/resume` avec `{}` doit produire `SUCCEEDED` et laisser le site ainsi que le rapport dans `runs/<run-id>/artifacts/`.

## Parcours dossier de bout en bout

`app/intake.html` est l’entrée publique locale. Le premier CTA identifie l’établissement et ouvre l’enrichissement progressif ; le dossier n’est créé qu’après `Enregistrer mon dossier`. La validation de `POST /api/intake/dossiers` crée alors un dossier sous `.ancrage/dossiers/<dossier-id>/` avec `dossier.json`, `story.md`, `menu.json` et les médias reçus. Le registre l’indexe dans `dossiers/index.json`; le cockpit le voit dans `Dossiers` et `À traiter` sans import manuel.

Depuis le cockpit, `Lancer la création` appelle `POST /api/dossiers/<dossier-id>/runs`. Le moteur persiste les étapes, les reprises et les artefacts dans `.ancrage/runs/<run-id>/`. Le site et le rapport sont consultables par les liens d’artefacts, puis l’opérateur peut valider ou demander des corrections. `Ouvrir le dossier` ouvre uniquement le répertoire local validé.

Le scénario client synthétique reprend le nom, le lieu, l’histoire, le menu, le contact et la première image du dossier dans le site généré. Le site est responsive, autonome et sans ressource externe ; le rapport conserve les éléments fournis et la provenance locale. Le quality gate vérifie la présence des artefacts, du viewport mobile, d’une règle responsive, du contenu d’identité et de la provenance du rapport avant de marquer le run comme réussi.

## Données et configurations

Les prompts, workflows et contrats éditables vivent dans `config/` sous le répertoire de données. Un brouillon doit être enregistré, versionné puis activé ; un run conserve ses références de configuration dans son manifest. Les écritures passent par le stockage atomique et les versions de prompt sont immuables.

## Secrets

Sur macOS, les secrets sont stockés dans le trousseau via `security`, service `com.ancrage.provider`, sous le compte normalisé du provider. Le cockpit ne reçoit que `configured`, `health`, `enabled` et les codes d’erreur expurgés. Les tests utilisent `createMemorySecretStore` et ne doivent jamais recevoir une vraie clé.

Providers V1 déclarés : OpenAI, Anthropic Claude, Google Gemini, OpenRouter, Cloudflare, Dynadot, NameSilo et Name.com. Aucun provider Mistral n’est déclaré. Une clé seule n’active pas un provider : le test de connexion doit réussir.

## Sauvegarde et restauration

Arrêter le bridge, copier le répertoire de données vers une sauvegarde chiffrée, puis restaurer dans un nouveau `ANCRAGE_DATA_DIR`. Vérifier ensuite :

```sh
ANCRAGE_DATA_DIR=/chemin/restaure npm test
```

La restauration opérationnelle doit encore être exercée sur un support de sauvegarde réel avant toute mention de production.

## Vérifications et limites

- `npm test` couvre le stockage, le versioning, la non-divulgation, le DAG, l’API et le vertical slice de redémarrage.
- `npm run check` vérifie le point d’entrée du bridge.
- Le test Keychain macOS réel n’est pas exécuté automatiquement ; le contrat est injecté et testé en mémoire.
- Les APIs Cloudflare, Dynadot, NameSilo, Name.com et les APIs IA réelles ne sont pas validées ici : comptes dédiés, permissions, quotas, coûts et conditions restent à exercer.
- Le parcours navigateur desktop/tablette/390 px, navigation clavier et absence de débordement est validé dans le runtime local; le zoom 200 % reste une vérification manuelle à refaire sur la machine cible.
- La recherche Internet produit des candidats locaux et indique explicitement que disponibilité et prix restent à vérifier tant qu’aucun registrar actif n’est configuré.
- L’achat de domaine, l’envoi, la publication, la suppression distante et toute dépense restent hors du bridge et exigent une confirmation humaine.
