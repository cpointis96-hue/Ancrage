# Quel niveau de design faut-il décider maintenant ?

Parent: ../map.md
Type: prototype
Status: open

## Question

Déterminer quelles surfaces doivent être prototypées avant `to-spec`, sans lancer le polish visuel final ni figer prématurément une identité graphique.

Les prototypes prioritaires devraient couvrir les décisions comportementales à risque :

- landing page nom + ville ;
- enrichissement puis formulaire progressif ;
- progression d'une démo et timeout ;
- cockpit de validation et revue des agents ;
- éditeur compact des trois offres ;
- site restaurant mobile-first avec menu, CTA et confiance locale.

## Recommandation

Commencer maintenant par l'UX structurelle et quelques prototypes jetables pour valider les parcours, états, densité d'information et erreurs. Reporter le design final, les templates définitifs et le polish visuel après les décisions de modèle commercial, contenu, QA et architecture de publication.

## Décision attendue

Choisir le premier parcours à prototyper et les critères d'observation. Le prototype doit répondre à une question de comportement ou de compréhension, pas devenir une implémentation de production.

## Comments

- Le premier prototype accepté est le parcours `landing page → nom + ville → enrichissement → formulaire progressif → démo`.

## Prototype pointers

Les prototypes templates/cockpit servent de base de comparaison structurelle. Le parcours public complet reste à prototyper avant `to-spec`.
