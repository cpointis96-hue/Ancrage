# Fournisseurs et secrets

## Configuration

Dans le cockpit, ouvrir Configuration puis Fournisseurs. Enregistrer la clé, tester la connexion puis activer le fournisseur. L’état de configuration et de santé est visible ; le secret n’est pas renvoyé au navigateur.

En développement macOS, les secrets utilisent le trousseau (`com.ancrage.provider`). Sur les autres systèmes, le magasin par défaut reste en mémoire. Un service hébergé doit injecter son magasin de secrets ; les données et rapports ne doivent jamais contenir les clés.

| Fournisseur | Secret attendu |
|---|---|
| OpenAI, Anthropic, Gemini, OpenRouter, Google Places, Dynadot, NameSilo | Clé simple. |
| DataForSEO | JSON `{"login":"…","password":"…"}`. |
| Cloudflare | JSON `{"token":"…","accountId":"…"}` ; accountId peut venir de CLOUDFLARE_ACCOUNT_ID. |
| Name.com | JSON `{"username":"…","token":"…"}` ; username peut venir de NAMECOM_USERNAME. |

Les variables complémentaires doivent être fournies au processus serveur. `.env.local` est ignoré par Git, mais n’est pas chargé automatiquement par le lanceur. `.env.example` liste les variables consommées.

## Capacités

`src/providers/http-adapters.mjs` définit les endpoints effectivement utilisés : modèles et génération IA, recherche web OpenAI, autocomplétion/détails Google Places, collecte DataForSEO et disponibilité de domaines.

Le registre contrôle activation et santé avant utilisation. Une indisponibilité produit un état et une cause ; elle ne doit pas être remplacée par un résultat inventé. Sans registrar utilisable, un candidat de domaine conserve `availability: unknown`. La recherche n’achète pas de domaine.

Les appels d’audit doivent passer par le budget et le ledger. Les modèles, enveloppes et références de prix résident dans les workflows versionnés ; revalider prix, droits, quotas et comportement fournisseur avant activation commerciale. Une réponse réseau ambiguë ne permet pas d’annuler arbitrairement une réservation.

Les tests automatisés injectent des réponses synthétiques. Un essai réel exige des comptes configurés et une autorisation explicite couvrant les appels et leur budget.
