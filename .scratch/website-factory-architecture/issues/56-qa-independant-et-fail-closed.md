# Comment automatiser la QA sans multiplier les agents inutilement ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Quelle architecture de contrôles permet de livrer automatiquement un site fiable, sans faire semblant qu'une pyramide d'agents garantit la perfection ?

## Recommandation

Organiser la QA en gates indépendants et spécialisés, pas en une hiérarchie illimitée de sous-agents :

1. **Vérité et provenance** — identité, adresse, téléphone, horaires, prix, plats, allergènes et droits des médias.
2. **SEO déterministe** — HTML rendu, titres, canonicals, sitemap, robots, données structurées cohérentes avec le visible, liens, performance et accessibilité.
3. **SEO éditorial/local** — intention, ville réellement desservie, utilité de chaque page et absence de pages quasi dupliquées.
4. **Copy et confiance** — clarté, absence de promesse invérifiable, traduction et cohérence des appels à l'action.
5. **Visuel et parcours** — screenshots, mobile, navigation, états vides/erreurs et régression visuelle.
6. **Sécurité et conformité opérationnelle** — secrets, URLs externes, uploads, noindex de la démo, permissions et coût.

Chaque gate produit `PASS`, `WARN` ou `BLOCK`, des preuves, sa version de règle, son coût et les entrées examinées. Un second reviewer peut challenger une sortie IA, mais ne remplace ni la provenance ni les tests déterministes.

## Decision attendue

Valider les gates bloquants, les warnings acceptables et le contenu exact du livrable final présenté au propriétaire.

## Clarification de la décision déjà prise

Aucune démo n'est présentée automatiquement au prospect. Même si tous les contrôles passent et qu'il ne reste que des `WARN`, le workflow s'arrête dans l'état `READY_FOR_OWNER_REVIEW` et attend la validation explicite du propriétaire.

Les `WARN` servent à préparer cette revue finale : ils peuvent être acceptés, corrigés ou transformés en blocage par le propriétaire. Les `BLOCK`, eux, empêchent toujours l'approbation tant qu'ils ne sont pas résolus.

Le système automatise donc la construction et la QA, mais pas la décision commerciale finale de montrer la démo.

## Risque à trancher

Un système avec trop d'agents coûtera plus cher, sera plus lent et pourra créer un faux consensus. Le nombre d'agents doit rester inférieur au nombre de responsabilités réellement indépendantes.

## Answer

Les gates critiques bloquent la démo : vérité/provenance essentielle, droits, sécurité, rendu inutilisable, liens majeurs et dépassement dur non autorisé. Les problèmes mineurs produisent des `WARN` visibles dans l'`AcceptanceReport` et sont soumis à la validation explicite du propriétaire. Aucun `WARN` ne disparaît silencieusement et aucune démo n'est présentée avant cette validation.

Décision de cadrage appliquée par l'agent, le 20 août 2026.
