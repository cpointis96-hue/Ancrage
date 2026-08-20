# Comment garantir zéro coût IA cloud par défaut ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Définir le comportement si aucun fournisseur cloud payant n'est activé. Le système doit-il continuer avec le local, mettre l'étape en attente, demander une validation, ou produire une version dégradée ?

Le stockage de données publiques dans le cloud ne doit pas déclencher une inférence cloud. Chaque appel externe doit avoir un fournisseur, un modèle, une politique de données, un budget et une autorisation explicites.

## Recommandation

Budget cloud par défaut à zéro. Le local est essayé en premier. Si le local est indisponible et qu'aucun fournisseur cloud gratuit approuvé n'est disponible, l'étape est mise en attente ou marquée `needs_intervention`, jamais facturée silencieusement. Le cockpit affiche clairement ce qui bloque et le coût potentiel avant activation.

## Comments

## Decision

Si le local est indisponible, le système peut choisir automatiquement un fournisseur cloud déjà configuré et approuvé, avec le modèle adéquat à la tâche, puis payer l'appel. Cette sélection reste limitée par la politique de données, la classe de capacité, le budget de l'étape, le budget de la génération et le plafond global. Aucun fournisseur inconnu, modèle premium ou dépassement de plafond ne peut être utilisé silencieusement.
