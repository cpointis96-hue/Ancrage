# Quels périmètres d'audit et quelles limites commerciales ?

Parent: ../map.md
Type: grilling
Status: resolved

## Recommandation provisoire

Trois niveaux alignés sur les offres existantes, sans prétendre que l'aperçu limité est complet :

## Décision

Le prospect reçoit gratuitement un rapport web complet dans le périmètre annoncé. « Complet » signifie que toutes les règles et sources activées pour ce périmètre sont expliquées avec leurs preuves, limites et exemples ; cela ne signifie pas un crawl illimité ni la remise brute de tous les exports du crawler.

- aperçu gratuit : identification, petit crawl HTML, problèmes majeurs, synthèse courte ;
- audit standard : périmètre supérieur, règles déterministes complètes et rapport web détaillé ;
- audit avancé : rendu JavaScript conditionnel, comparaison, sources propriétaires autorisées et recommandations approfondies.

## Décisions nécessaires

- nombre d'URL, durée, taille, fréquence, exports et rendu JS par niveau ;
- politique de suppression des rapports et artefacts déjà cadrée par les décisions de conservation ;

## Règle

Le périmètre réel doit toujours être affiché dans le rapport et l'e-mail. Une analyse limitée ne doit jamais être présentée comme un audit complet.

## Décision confirmée

L'audit gratuit est accessible à tous les prospects, à raison d'un audit par établissement identifié. Une nouvelle tentative portant sur le même établissement réutilise le rapport existant au lieu de relancer inutilement le crawl. La protection contre l'abus repose sur des contrôles serveur, des quotas et un anti-bot adaptatif ; elle ne nécessite ni e-mail ni activation de la géolocalisation avant l'audit.

Décision HITL : choix 1, confirmé le 20 août 2026.

Le rapport d'audit est rendu progressivement lorsque ses checkpoints sont validés. Le rapport final et son export PDF restent accessibles pendant 7 jours ; les métadonnées, findings, preuves essentielles, coûts et journaux suivent une conservation séparée, tandis que les exports bruts restent dans l'archive locale chiffrée.

Décision HITL : choix 1, confirmé le 20 août 2026.

## Answer

Le périmètre commercial est fixé : audit gratuit accessible une fois par établissement identifié, niveau standard gratuit avec profil prudent de 50 URL, 3 minutes et 25 Mo, sans rendu JavaScript complet ; politique budgétaire hybride avec suivi local/cloud et dégradation contrôlée ; branche sans site et sans GMB autorisée après dossier minimal et cinq photos ; rapport progressif, final et PDF accessibles 7 jours. Les limites réelles restent à valider par le vertical slice et les fournisseurs.

Lorsqu'aucun site fiable et aucune fiche GMB ne sont trouvés, le parcours peut tout de même préparer le site si le dossier minimal est suffisamment renseigné : nom de l'établissement, nom et prénom du contact ou propriétaire, informations métier essentielles, plats, prix et images autorisées, avec les cinq photos requises avant génération. Le bouton « Préparer mon site » reste disponible après ce seuil ; son clic ouvre immédiatement la collecte d'une adresse e-mail valide. Aucune génération réelle ne commence avant cet e-mail.

Décision HITL : confirmée, le 20 août 2026.

## Clarification opérateur à intégrer

Le budget est d'abord un instrument de mesure et de pilotage : l'opérateur peut allouer un budget par étape ou ne pas en allouer, lancer l'audit complet d'un restaurant, observer les coûts réels liés aux prompts, agents, étapes et providers, puis ajuster les périmètres et budgets à partir des données constatées. Le run ne doit pas être interrompu silencieusement au premier dépassement ; le comportement exact au dépassement reste le point HITL suivant.

## Décision confirmée — politique budgétaire

Utiliser une politique hybride : enveloppe préautorisée avant le run, suivi monétaire des providers cloud, suivi en tokens/durée/ressources pour les modèles locaux, notifications à 50/80/100 %, et dégradation automatique vers le chemin essentiel le moins coûteux autorisé. Le run continue sans intervention pour produire l'audit principal ; seules les étapes optionnelles peuvent être réduites ou marquées `PARTIAL`. Un plafond dur de sécurité bloque uniquement les dépenses non autorisées, les escalades premium, les boucles et les violations de sécurité/provenance.

Décision HITL : validée, le 20 août 2026.

Le niveau gratuit est l'audit standard : crawl plus large, règles SEO déterministes complètes et rapport web détaillé. L'audit avancé reste distinct et peut ajouter le rendu JavaScript conditionnel, la comparaison et les sources propriétaires autorisées.

Décision HITL : choix 2, confirmé le 20 août 2026.

## Décision opérationnelle — dépassement de budget

Les seuils 50/80/100 % produisent une notification et un `CostEvent`. À 100 %, aucune nouvelle dépense optionnelle ne démarre. Une branche essentielle déjà engagée peut terminer uniquement si son coût restant est connu et reste sous le plafond dur ; sinon elle devient `PARTIAL` ou `BLOCKED` avant l'appel suivant. Les branches optionnelles sont arrêtées proprement avec leur cause et leurs résultats disponibles.

Une reprise exige une nouvelle enveloppe explicitement autorisée et un nouveau run. Aucun fallback premium, aucune boucle de relance et aucune hausse automatique de budget ne sont permis.

Pour le MVP, l'audit standard gratuit utilise le profil prudent : 50 URL maximum, 3 minutes, 25 Mo, crawl HTML et mesures ciblées, sans rendu JavaScript complet. Ces valeurs restent à valider par le vertical slice et les limites fournisseurs avant activation commerciale.

Décision HITL : choix 1, confirmé le 20 août 2026.
