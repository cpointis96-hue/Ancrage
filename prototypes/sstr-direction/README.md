# Prototypes — direction SSTR

Deux prototypes visuels destinés à trancher la direction avant implémentation.

## Ouvrir

- `client-site.html` — site public de la marque `Repère`, porte d’entrée de l’audit local et du parcours vers la démo.
- `cockpit.html` — cockpit Wayfinder, pensé comme un outil opérateur dense et lisible.

Depuis ce dossier, ouvrir l’un des fichiers directement dans un navigateur. Aucun serveur, compte ou fournisseur externe n’est requis : les liens de démo sont représentatifs et les actions du cockpit sont locales au prototype.

## Ce que l’on teste

Le site public de `Repère` reprend les qualités observées dans la référence [SSTR — Friction Reduction sur Awwwards](https://www.awwwards.com/sites/sstr-friction-reduction) : contraste profond, grande typographie, matière organique, cadrage fin, asymétrie contrôlée et lecture mobile dédiée. Son contenu est celui du point d’entrée Website Factory : nom de l’établissement, lieu, audit, explication du parcours et préparation de la suite — pas celui d’un site client généré.

La typographie du site est `JetBrains Mono`, intégrée localement depuis le dépôt officiel [JetBrainsMono](https://github.com/JetBrains/JetBrainsMono). Le prototype utilise sa police variable et conserve un interlignage plus généreux pour préserver la lisibilité sur mobile.

Le cockpit ne copie pas la page marketing. Il reprend seulement sa matière, son contraste et sa profondeur pour donner une identité au produit, tout en conservant une organisation d’outil : navigation latérale, file de projets, état de run, étapes explicites, validation et lien direct vers la démo.

## Limites assumées

Ces fichiers sont des prototypes UX/UI, pas l’application de production. Il n’y a ni persistance, ni authentification, ni exécution d’agents. Les données affichées sont fictives. Le formulaire du site public confirme en mémoire la prochaine étape ; il ne lance pas encore d’audit réel. Le prototype sert à valider la hiérarchie, l’atmosphère, les états et le comportement responsive avant de choisir la stack d’implémentation.
