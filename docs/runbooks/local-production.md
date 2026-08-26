# Ancrage local — runbook de démarrage

## Démarrer

Depuis la racine du dépôt :

```sh
npm test
npm run check
npm run dev
```

Le bridge écoute uniquement sur `http://127.0.0.1:4173` par défaut et sert le cockpit depuis `app/`. Le répertoire de données est `.ancrage/`, ou la valeur de `ANCRAGE_DATA_DIR`. Il est ignoré par Git.

Pour lancer le scénario client synthétique depuis le cockpit, ouvrir `Configuration` puis choisir `Simuler`. La même simulation peut injecter une interruption contrôlée par API :

```sh
curl -s -X POST http://127.0.0.1:4173/api/simulations/client-site \
  -H 'content-type: application/json' \
  -d '{"profile":{"name":"Maison Sillage","city":"Pattaya"},"fault":"site-build"}'
```

La réponse `FAILED` est attendue dans ce cas ; reprendre le `run.id` sur `/api/simulations/client-site/<run-id>/resume` avec `{}` doit produire `SUCCEEDED` et laisser le site ainsi que le rapport dans `runs/<run-id>/artifacts/`.

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
- La validation navigateur desktop/tablette/390 px, clavier et zoom 200 % doit être rejouée avec un runtime navigateur autorisé. Les contrôles statiques et le CSS responsive sont présents, mais ne constituent pas cette preuve.
- L’achat de domaine, l’envoi, la publication, la suppression distante et toute dépense restent hors du bridge et exigent une confirmation humaine.
