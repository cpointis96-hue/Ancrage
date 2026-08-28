# Validation live DataForSEO du 28 août 2026

## Première tentative isolée

Un nouveau processus lancé dans l’environnement isolé ne pouvait pas lire le credential `provider:dataforseo` du Keychain macOS. Cette tentative a donc été bloquée avant tout appel DataForSEO.

Dans ce processus isolé, le registre local retournait après revalidation :

```text
configured: false
enabled: false
health: unknown
readiness: not-configured
```

L’ancien état persistant `healthy/enabled` n’est pas retenu lorsqu’aucun credential n’est présent dans le processus qui lit le registre.

## Observations effectuées

- `createApp().providers.testConnection('dataforseo')` s’arrête sur `Secret absente.` avant la construction d’une requête HTTP.
- Le compte Keychain attendu sous le service `com.ancrage.provider` n’a pas été trouvé par ce processus isolé.
- Le navigateur DataForSEO aboutit à `https://app.dataforseo.com/signin` et affiche l’écran de connexion. Aucune session existante n’était disponible.
- Le test équivalent Google Places était également impossible dans ce processus isolé. Aucun `Place Details` et aucune coordonnée n’y ont donc été validés.

## Audit public borné

Un run local a été tenté pour `Le Midi-Teyranais`, ville `Teyran`, pays `FR`, avec une enveloppe maximale de `0,50 USD`.

- Run : `audit-run-20260828164936-669b2153`
- Résultat : `BLOCKED`
- Cause de l’étape d’établissement : `DATAFORSEO_NOT_CONFIGURED`
- Exécution : `not-run`
- Dépense retournée : `0 USD`
- Réservation restante : `0,50 USD`
- Résultats provider observés : aucun

Les resolvers gratuits prévus (`serp/google/locations`, `serp/google/languages`, `business_data/business_listings/locations` et `dataforseo_labs/locations_and_languages`) n’ont pas été appelés pendant ce run bloqué. Les endpoints payants, Google Places Details et l’audit GMB réel n’ont pas été appelés pendant ce run.

## Correction appliquée

`provider-registry` masque désormais les états `healthy`, `enabled`, `lastCheckedAt` et `lastErrorCode` devenus obsolètes lorsque le credential a disparu. `public-audit-workflow` ne tente la garde de résolution de localisation qu’après validation de l’état `ready`, afin de retourner la cause réelle `DATAFORSEO_NOT_CONFIGURED`.

Ce document ne contient aucun credential, payload d’authentification, résultat inventé ou coordonnée non observée.

## Validation live après correction

Le resolver `business_data/business_listings/locations` a d’abord répondu `status_code: 20000` avec `tasks_error: 1`, tâche `40402 Invalid Path`, lorsque le code ajoutait `/fr`. Le chemin sans suffixe pays a été retenu, conformément à la documentation officielle DataForSEO, et la sélection du pays reste faite localement sur le résultat retourné.

Un second run réel a ensuite été exécuté après rechargement du checkout actuel :

- Run : `audit-run-20260828165741-6567165a`
- Identité Google Places : `ChIJj-PLEjSmthIR1i_bLLVY5sM`
- Coordonnées utilisées : `43.681978,3.9226489`
- Budget maximum : `0,50 USD`
- Résultat : `PARTIAL`
- Dépense réellement retournée : `0,05743 USD`
- Réservation en cours : `0 USD` ; disponible dans la limite : `0,44257 USD`
- GMB : `SUCCEEDED`, candidat `Le Midi-Teyranais` trouvé
- SEO : `PARTIAL`, 50 pages analysées, 34 terminées, 16 bloquées, limite atteinte
- Mots-clés : 25 idées retournées
- Concurrents : 5 domaines retournés

Les endpoints payants exécutés par ce run sont `serp/google/maps/live/advanced`, `serp/google/organic/live/advanced`, `business_data/business_listings/search/live`, `on_page/instant_pages`, `dataforseo_labs/google/keyword_ideas/live`, `dataforseo_labs/google/keyword_overview/live` et `dataforseo_labs/google/serp_competitors/live`. Les preuves persistées contiennent leurs URL canoniques, paramètres de tâche et hashes de payload.

Le ledger a enregistré les coûts réels suivants : Maps `0,002 USD`, Organic `0,002 USD`, Business Listings `0,01236 USD`, OnPage `0,00015 USD`, Keyword Ideas `0,015 USD`, Keyword Overview `0,01212 USD`, SERP Competitors `0,0138 USD`. Le gate applicatif n’a accepté que des réponses portant le code provider attendu `20000`; le payload brut n’est pas conservé pour chaque module, seulement les hashes de preuve et les champs nécessaires au rapport. Le payload brut conservé pour Keyword Overview expose `20000` et aucune erreur de tâche.

Documentation provider : https://docs.dataforseo.com/v3/business_data-business_listings-locations/
