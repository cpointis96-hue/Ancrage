# Providers et clés API

Le bouton `Save` envoie la valeur au bridge local, qui teste d'abord la connexion. Sur macOS, le bridge l'enregistre ensuite dans le trousseau avec le service `com.ancrage.provider` et une référence distincte par provider. Une clé refusée n'est pas conservée. La clé n'est jamais renvoyée au navigateur, écrite dans `.ancrage`, un prompt, un run ou un journal.

Le test est borné dans le temps et ne conserve qu'un état (`healthy` ou `unhealthy`) et un code d'erreur générique. Le bouton on/off reste indépendant : il n'active un provider qu'après un test réussi.

## Formes acceptées

Une clé simple suffit pour OpenAI, Anthropic Claude, Google Gemini, OpenRouter, Dynadot et NameSilo. Les APIs composites acceptent aussi un JSON compact enregistré comme secret :

```json
{"token":"...","accountId":"..."}
```

pour Cloudflare, et :

```json
{"username":"...","token":"..."}
```

pour Name.com. Les valeurs complémentaires peuvent aussi rester dans `.env.local` : `CLOUDFLARE_ACCOUNT_ID` et `NAMECOM_USERNAME`. Ce fichier est ignoré par Git.

## Authentification et endpoints utilisés

| Provider | Authentification | Test | Recherche de domaine |
| --- | --- | --- | --- |
| OpenAI | `Authorization: Bearer` | `GET /v1/models` | n/a |
| Anthropic Claude | `x-api-key` et `anthropic-version` | `GET /v1/models` | n/a |
| Google Gemini | `x-goog-api-key` | `GET /v1beta/models` | n/a |
| OpenRouter | `Authorization: Bearer` | `GET /api/v1/models` | n/a |
| Cloudflare | `Authorization: Bearer` + account ID | Registrar extensions | Registrar domain search |
| Dynadot | clé `key` + `command` | API JSON search | API JSON search |
| NameSilo | clé `key` en query string | `getAccountInfo` | `checkRegisterAvailability` |
| Name.com | Basic username/token | `domains:checkAvailability` | `domains:checkAvailability` |

Les adapters registrar renvoient des résultats partiels avec la provenance du provider. Une erreur chez un registrar ne masque pas les résultats des autres. Si aucun registrar actif et sain n'est disponible, le générateur local conserve un résultat `availability: unknown`.

La recherche ne déclenche jamais d'achat. Cloudflare recommande de refaire une vérification temps réel immédiatement avant toute inscription ; l'inscription et toute opération facturable restent hors de cette intégration.

## Documentation officielle

- [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)
- [Gemini API keys et REST](https://ai.google.dev/gemini-api/docs/generate-content/api-key)
- [OpenRouter chat API et authentification](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)
- [Cloudflare Registrar API](https://developers.cloudflare.com/registrar/registrar-api/)
- [Dynadot Domain API](https://www.dynadot.com/domain/api-commands)
- [NameSilo Domain API](https://www.namesilo.com/api-reference)
- [Name.com Check Availability](https://docs.name.com/api/v1/reference/domains/check-availability)

Les tests automatisés utilisent un `fetch` simulé. Un test réel consomme les quotas et peut dépendre des permissions, de la facturation, du sandbox et des TLD supportés par chaque compte.
