# Prototype UX — vertical slice public → cockpit

Prototype jetable, sans backend et sans persistance. Il répond à la question :

> Un prospect peut-il comprendre le parcours et l'opérateur peut-il reprendre la main sans être noyé par des contrôles ?

## Lancer

Ouvrir [`index.html`](index.html) dans un navigateur.

Le sélecteur en haut permet de passer du site public au cockpit. Le bouton « Voir le cockpit opérateur » apparaît à la fin du parcours public.

## Parcours à essayer

1. Site public → « Commencer l'audit ».
2. Nom + ville → établissement identifié.
3. Rapport `PARTIAL` → « Préparer mon site ».
4. E-mail vide puis e-mail invalide : vérifier le retour d'erreur.
5. E-mail valide → dossier transmis au cockpit.
6. Cockpit → « Synchroniser ».
7. Ouvrir le run → valider, ouvrir le contexte local ou renvoyer en correction.
8. Revenir au rapport → bouton PDF toujours visible.

## Limites

- les données sont fictives et uniquement destinées au prototype ;
- aucun appel réseau, provider ou stockage n'est utilisé ;
- la validation navigateur couvre Chromium desktop et une viewport mobile de 390 px ;
- il s'agit toujours d'un prototype, pas d'une preuve de fonctionnement backend ou de production.
