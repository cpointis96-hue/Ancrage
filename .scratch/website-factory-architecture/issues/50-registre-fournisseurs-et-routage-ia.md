# Comment centraliser les fournisseurs IA et choisir le bon mode d'exécution ?

Parent: ../map.md
Type: prototype
Status: resolved

## Question

Concevoir un écran central du cockpit qui permet de déclarer, tester et désactiver les fournisseurs IA : API cloud directe, OpenRouter, fournisseur compatible OpenAI, Ollama, LM Studio et autres endpoints locaux.

Le système doit distinguer : étape déterministe sans IA ; IA locale préférée ; IA cloud autorisée ; modèle premium autorisé seulement sur validation/budget ; validation humaine obligatoire.

## Références stratégiques

Lire [83 — Catalogue des agents](../research/83-catalogue-agents-seo-website-factory.md) et [84 — Routage des providers IA](../research/84-routage-providers-ia-openai-openrouter-omniroute-ollama-mlx.md). L'index général est [88 — Index stratégie SEO et Website Factory](../research/88-index-strategie-seo-website-factory.md).

Pour chaque fournisseur : nom, type, endpoint, région, statut, capacités, modèles disponibles, coût, limites, santé de connexion et emplacement sécurisé du secret. Pour chaque modèle : contexte, vision, structured outputs, outils, latence, coût estimé, données autorisées et usages interdits.

Un agent doit référencer une politique de routage ou un profil de modèle, jamais une clé API copiée dans son prompt. Chaque exécution doit conserver fournisseur, modèle, version d'instructions, schéma, coût, latence, fallback et raison de sélection.

## Recommandation

Un registre unique `ProviderConnection` + `ModelProfile` + `AIRoutingPolicy`, avec un bouton « tester la connexion » et un bouton « utiliser pour cet agent ». Les secrets restent dans le bridge local ou le secret manager cloud ; ils ne sont jamais envoyés au JavaScript navigateur.

Le fallback automatique doit rester limité : local indisponible → fournisseur cloud explicitement autorisé ; aucun passage silencieux vers un modèle premium payant.

## Décision attendue

Valider la forme compacte de l'écran, les niveaux de permission, les règles de fallback et les confirmations nécessaires lorsqu'un changement peut augmenter le coût ou envoyer des données vers un fournisseur externe.

## Comments

## Decision

Le cockpit permet de modifier la description, le rôle, la position dans le workflow, le prompt, le fournisseur, le modèle, le budget, le schéma de sortie, les seuils et l'activation. Chaque changement crée une `AgentConfigurationVersion` ; les démos déjà lancées conservent leur version initiale.

## Decision proposée

Le fallback conserve le même niveau de capacité et de coût cible :

Le modèle de chaque étape IA est choisi explicitement par l’opérateur. Aucun basculement automatique de modèle.

Un MacBook Air avec 16 Go de RAM pourra utiliser un petit modèle local lorsque la tâche le permet. S'il est indisponible, le système choisira un modèle cloud économique équivalent — par exemple une classe “mini/haïku/sonnet léger” selon le fournisseur — sans basculer automatiquement vers un modèle premium plus puissant.

La sélection se fait par capacité requise, budget et politique de données, pas uniquement par le nom commercial du modèle. Chaque fournisseur devra déclarer ses capacités réelles et être testé avant activation.

## Answer

Le registre unique est composé de `ProviderConnection`, `ModelProfile` et `AIRoutingPolicy`. L'étape de workflow choisit explicitement sa capacité et sa classe de coût ; la configuration active est versionnée dans `AgentConfigurationVersion` et gelée par run. Le routage suit `déterministe → local → cloud approuvé de même classe → humain`, selon la politique de données et le budget.

Un provider n'est activé qu'après secret présent hors navigateur, test minimal réussi, capacités déclarées, politique de données et plafond vérifié. Chaque `AIExecutionRecord` conserve provider, modèle, policy, configuration, schéma, coût, durée, fallback et validation. Aucun fallback premium, fournisseur inconnu ou modèle implicite n'est autorisé.

Décision d'architecture résolue le 27 août 2026. La vérification des comptes et des coûts réels reste un gate d'exécution ; aucune clé n'est créée par cette décision.
