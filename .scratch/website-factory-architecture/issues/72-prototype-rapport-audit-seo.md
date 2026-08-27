# Quel rapport SEO un propriétaire comprend-il immédiatement ?

Parent: ../map.md
Type: prototype
Status: resolved

## Question UX

Prototype throwaway de trois variantes Mobile First, sans production code, pour comparer :

- résumé exécutif et cinq actions prioritaires ;
- séparation faits / calculs / recommandations / limites ;
- preuves et exemples d'URL ;
- périmètre du crawl ;
- accès au rapport complet et téléchargement ;
- état partiel ou échec ;
- audit GMB affiché dès qu'il est prêt, progression de l'audit SEO, puis rapport final réunissant les deux ;
- e-mail final court avec lien direct vers la démo gratuite après validation opérateur.

## Contraintes

Le rapport doit inspirer confiance et performance, pas afficher un export technique ni un score magique. Les nombres et URL viennent de données immuables ; l'IA ne peut que reformuler ou prioriser dans un schéma validé.

Le prototype doit aussi montrer le point d'entrée cockpit permettant de modifier la configuration du rapport, prévisualiser une version et voir le profil/CLI Screaming Frog utilisé, sans exposer une console shell publique.

## Exigence UX ajoutée

Le rapport comporte un petit bouton flottant toujours visible pendant le défilement, avec une icône de téléchargement et un libellé accessible « Télécharger le rapport PDF ». Il reste discret, ne masque pas le contenu ni le CTA principal, et exporte la version validée du rapport avec son périmètre, sa date et ses limites.

## Décision UX confirmée

Le rapport final commence par un résumé compréhensible et les cinq actions prioritaires, avant les preuves, exemples d'URL, métriques et détails techniques. Cette hiérarchie éditoriale est versionnée et modifiable depuis le cockpit sans modifier les données sources ni les règles de calcul.

Décision HITL : choix 1, confirmé le 20 août 2026.

## Décision de cadrage appliquée par l'agent

Un rapport partiel est affiché avec le statut `PARTIAL`, les résultats disponibles, les éléments manquants et leur cause. Il ne peut jamais être présenté comme complet. Le cockpit conserve les actions de reprise ou de relance, tandis que le prospect reçoit une restitution utile et honnête sans attendre silencieusement une branche bloquée.

## Answer

Les variantes A, B et C de [`public-ancrage-v1-prototype.html`](../prototypes/public-ancrage-v1-prototype.html), ainsi que le parcours public E0 à E7, couvrent la comparaison de structure, le rapport GMB précoce, le rapport final, l'état `PARTIAL`, l'e-mail, la construction, la démo et le téléchargement PDF. Le cockpit associé montre la configuration du rapport, les preuves, les coûts, les étapes et la frontière d'intervention locale.

La hiérarchie retenue est : résumé compréhensible, cinq priorités lorsque les findings disponibles le permettent, preuves et exemples, périmètre, limites, puis détails techniques. Les nombres et URLs d'un prototype restent des fixtures et ne sont pas des résultats commerciaux. Le PDF est un téléchargement local de démonstration, pas une preuve de génération côté serveur.

Décision de prototype résolue le 27 août 2026. La validation navigateur historique reste distincte d'une validation de production ; l'ouverture directe des fichiers n'a pas pu être rejouée dans le navigateur courant à cause de sa politique d'URL.
