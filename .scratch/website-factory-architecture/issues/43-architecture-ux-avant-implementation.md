# Quel niveau de design faut-il décider maintenant ?

Parent: ../map.md
Type: prototype
Status: resolved

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
- La base documentaire UX avant prototype est maintenant regroupée dans [`docs/ux/README.md`](../../../docs/ux/README.md). Elle couvre le cockpit opérateur et le site public, en conservant le parcours de référence du document 87. Le prototype reste requis pour valider la densité, les états et les transitions.
- Un prototype jetable du vertical slice est disponible dans [`prototypes/ux-vertical-slice/`](../../../prototypes/ux-vertical-slice/). La syntaxe JavaScript, les étapes 1 à 6, les états `PARTIAL`, la synchronisation, la validation, le renvoi en correction et le téléchargement PDF sont vérifiés. Chromium a aussi validé le parcours public, l'erreur e-mail, le transfert cockpit, la synchronisation, la validation et l'absence de débordement horizontal à 390 px. Le backend et le rendu de production restent hors prototype.
- Deux prototypes visuels complémentaires sont disponibles dans [`prototypes/sstr-direction/`](../../../prototypes/sstr-direction/) : `client-site.html` teste une direction client éditoriale/immersive inspirée de SSTR ; `cockpit.html` teste son adaptation au cockpit sans transformer l'outil en page marketing. Le rendu desktop/mobile et les interactions principales du cockpit ont été vérifiés dans Chromium. Ils restent des prototypes jetables : aucune implémentation de production n'est autorisée par cette validation.

## Prototype pointers

Les prototypes templates/cockpit servent de base de comparaison structurelle. Le parcours public complet reste à prototyper avant `to-spec`.

## Answer

Le parcours prioritaire est `landing page → nom + ville → enrichissement → ProgressiveIntake → audit → rapport → préparation de démo`, complété par la revue cockpit et le site restaurant mobile-first. Les prototypes jetables déjà présents couvrent les écrans publics E0 à E7, les états `PARTIAL`, erreur e-mail, génération, démo, le cockpit de validation et la direction SSTR.

Le comportement retenu est une seule action primaire par état, une progression fondée sur les `ProgressCheckpoint`, un rapport GMB visible dès qu'il est prêt, un PDF seulement au rapport final, et une validation opérateur avant livraison. Le design final et les templates restent hors production jusqu'à une revue UI dédiée.

Décision de prototype résolue le 27 août 2026. Les validations navigateur historiques sont conservées comme preuves antérieures ; la vérification courante de cette reprise reste statique lorsque l'ouverture directe des fichiers est bloquée par la politique du navigateur.
