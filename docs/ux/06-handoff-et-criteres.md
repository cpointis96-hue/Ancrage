# Handoff UX et critères d'acceptation

## Livrables du prochain agent UX

Le prochain agent doit lire `CONTEXT.md`, `docs/ux/` et les invariants Wayfinder, puis fournir :

1. une carte des surfaces et des routes ;
2. les parcours cockpit et public ;
3. les wireframes des écrans du vertical slice ;
4. la matrice complète des états ;
5. l'inventaire des actions et la justification de chacune ;
6. les règles responsive ;
7. les règles de copie, mascotte et accessibilité ;
8. un prototype jetable permettant d'observer les transitions ;
9. une liste de décisions restantes, sans réouvrir les décisions déjà fixées.

## Critères d'acceptation UX

### Compréhension

- un nouvel opérateur sait quoi traiter en moins d'un écran ;
- chaque écran possède une question principale ;
- les états `PARTIAL`, `WARN` et `BLOCK` sont compréhensibles sans consulter le journal ;
- le prospect sait toujours ce qui a été trouvé, ce qui manque et ce qui se passe ensuite.

### Sobriété

- aucune action visible sans justification ;
- aucune carte ou statistique décorative ;
- les informations avancées sont accessibles mais non imposées ;
- la navigation principale reste courte ;
- le cockpit et le site public n'ont pas le même niveau de densité.

### Fidélité produit

- le parcours de `87-parcours-client-reference.md` est respecté ;
- le bouton PDF du rapport reste accessible sans masquer le contenu ;
- la synchronisation cloud/local est représentée comme une action contrôlée et reprenable ;
- la validation opérateur précède toujours la présentation de la démo ;
- les sites clients générés ne sont pas mélangés avec les outils internes.

### Accessibilité

- clavier et focus visibles ;
- contraste vérifié ;
- états non dépendants de la couleur ;
- formulaire utilisable avec clavier mobile ;
- contenu lisible avec zoom à 200 % ;
- mouvement réduit respecté.

## Gate avant `to-spec`

Le passage à `to-spec` est autorisé seulement si :

- le prototype a été parcouru sur desktop et mobile ;
- le vertical slice ne contient aucun écran sans état vide/chargement/erreur ;
- les actions principales et leurs conséquences sont explicites ;
- aucune contradiction avec `map.md` ou `87-parcours-client-reference.md` n'est ouverte ;
- les décisions restantes sont des détails d'implémentation, pas des choix d'architecture UX.

## Ce qui reste volontairement à faire plus tard

- design des templates clients ;
- direction artistique de chaque marché ;
- optimisation fine des audits et des coûts ;
- tests de conversion réels ;
- validation de comptes Cloudflare/Neon et des accès externes.
