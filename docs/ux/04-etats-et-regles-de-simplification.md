# États, erreurs et règles de simplification

## Matrice minimale obligatoire

Chaque écran de donnée doit définir ces états :

| État | Ce que l'utilisateur doit comprendre | Action affichée |
|---|---|---|
| Vide initial | pourquoi rien n'existe encore | créer, synchroniser ou commencer |
| Chargement | ce qui est en train d'être chargé | attendre, avec étape nommée |
| En cours | quelle étape progresse réellement | consulter le détail ou quitter sans perdre |
| Réussi | ce qui est terminé et utilisable | ouvrir le résultat |
| Partiel | ce qui manque et pourquoi | reprendre ou consulter le disponible |
| Warning | ce qui est acceptable mais à surveiller | voir la preuve |
| Bloqué | la condition qui interdit la suite | corriger ou demander l'intervention requise |
| Erreur | ce qui a échoué, sans ambiguïté | réessayer, reprendre ou ouvrir le contexte |
| Hors ligne | ce qui reste local et ce qui attend le réseau | synchroniser plus tard |

Un état n'est jamais indiqué par la couleur seule. Il comporte un texte et, si utile, une icône cohérente.

## Règle des actions

Avant d'ajouter un bouton, répondre :

1. quelle décision permet-il ?
2. l'action est-elle différente d'une action existante ?
3. peut-elle être une sélection de ligne, un raccourci clavier ou un menu contextuel ?
4. que se passe-t-il après le clic, y compris en erreur ?

Si aucune réponse n'est claire, le bouton n'existe pas.

## Règle de densité

- une action principale par surface ;
- au maximum deux actions secondaires visibles ;
- les actions destructives ou rares dans un menu confirmé ;
- pas de bouton « détails » si la ligne est déjà inspectable ;
- pas de badge décoratif ;
- pas de chiffres inventés ;
- pas de texte qui répète le libellé d'une icône évidente ;
- pas d'icône seule lorsque son sens n'est pas certain.

## Accessibilité et interaction

- clavier complet sur le cockpit et le site ;
- ordre de tabulation identique à l'ordre visuel ;
- focus visible et contrasté ;
- dialogues fermables avec Échap ;
- contraste vérifié, jamais estimé à l'œil ;
- tailles tactiles adaptées au mobile ;
- les erreurs expliquent la cause et la prochaine action ;
- les animations sont brèves, utiles et désactivables.

## Anti-patterns explicitement interdits

- grille de cartes statistiques sans décision associée ;
- graphiques décoratifs ;
- activité fictive ;
- boutons avec flèche décorative partout ;
- badges « AI Powered » ;
- gradients bleu-violet par défaut ;
- emoji comme icônes fonctionnelles ;
- mascotte animée en boucle ;
- écran d'erreur « Une erreur est survenue » sans récupération.
