# Comment piloter le rapport SEO et le CLI depuis le cockpit ?

Parent: ../map.md
Type: grilling
Status: resolved

## Décision provisoire

Le cockpit opérateur doit permettre de modifier et versionner la structure du rapport, les textes, les priorités, les seuils d'affichage, les prompts de synthèse, les profils de crawl, les exports autorisés, les modèles d'e-mail et les analyses coûteuses activées. Les audits en cours restent attachés à la configuration utilisée au démarrage.

## Accès CLI

Le cockpit doit permettre de voir le profil exécuté, démarrer/suivre/suspendre/annuler un `CrawlRun`, consulter stdout/stderr et exports, ouvrir le dossier de travail ou le contexte Codex local, relancer avec un budget/profil contrôlé et vérifier le code de sortie.

## Frontière de sécurité

Le navigateur ne reçoit pas de shell arbitraire. Les commandes sont produites à partir de profils validés, d'une URL autorisée, de limites de ressources et d'un dossier isolé. Les secrets et fichiers d'authentification ne sont jamais affichés dans le rapport, les logs publics ou le JavaScript client.

## Décision

Le cockpit propose aussi un bouton d'ouverture du terminal local avec la commande préparée pour une intervention exceptionnelle. Le terminal s'ouvre uniquement sur le Mac opérateur, dans le dossier de travail isolé, avec la commande et le profil visibles avant exécution. Une confirmation est requise avant le lancement ; aucun terminal n'est exposé au prospect ni au JavaScript public.

## Références stratégiques

Les contrôles providers, agents et stack du cockpit sont consolidés dans [84 — Routage des providers IA](../research/84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md) et [86 — Stack SEO, skills et cockpit](../research/86-stack-seo-skills-et-cockpit.md).
