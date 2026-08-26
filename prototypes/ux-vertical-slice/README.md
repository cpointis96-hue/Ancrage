# Prototype UX — vertical slice public → cockpit

Prototype jetable, sans backend et sans persistance. Il répond à la question :

> Un prospect peut-il comprendre le parcours et l'opérateur peut-il reprendre la main sans être noyé par des contrôles ?

## Lancer

Ouvrir [`index.html`](index.html) dans un navigateur.

Le parcours complet E0 à E7 est disponible dans [`parcours-client-e0-e7.html`](parcours-client-e0-e7.html). Ce fichier est le prototype UX de référence pour parcourir les écrans du parcours client avant toute implémentation.

Le cockpit approfondi est disponible dans [`cockpit-operator-e0-e7.html`](cockpit-operator-e0-e7.html). Il reste un prototype en mémoire : il sert à vérifier la navigation opérateur, les états, les onglets d'inspection et les paramètres de configuration avant la spécification de production.

La version de travail V1, issue de la refonte V2, est disponible dans [`cockpit-operator-v2.html`](cockpit-operator-v2.html). Elle conserve le design du cockpit V2, mais remplace le catalogue d'agents par une Configuration centrée sur les étapes S0 à S10, les cinq rôles IA, les prompts, les contrats et le routage.

La partie Système est intégrée dans [`cockpit-operator-v2.html`](cockpit-operator-v2.html), qui devient le cockpit unique pour la revue globale. Elle contient les six onglets du cockpit et les registres Système avec une interface de connexion provider compacte.

Le sélecteur en haut permet de passer du site public au cockpit. Le bouton « Voir le cockpit opérateur » apparaît à la fin du parcours public.

Dans `Runs`, ouvre une étape pour voir son déclencheur, son implémentation, ses entrées, ses sorties, les étapes suivantes et la reprise. L'icône circulaire permet de préparer une relance depuis le dernier checkpoint. Dans `Configuration > Prompts`, chaque prompt est rattaché à son étape, éditable, testable et versionnable.

## Parcours à essayer

1. Site public → « Commencer l'audit ».
2. Nom + ville → établissement identifié.
3. Rapport `PARTIAL` → « Préparer mon site ».
4. E-mail vide puis e-mail invalide : vérifier le retour d'erreur.
5. E-mail valide → dossier transmis au cockpit.
6. Cockpit → « Synchroniser ».
7. Ouvrir le run → valider, ouvrir le contexte local ou renvoyer en correction.
8. Revenir au rapport → bouton PDF toujours visible.

## Parcours complet E0 à E7

Le prototype dédié couvre : entrée, identité, dossier, audit progressif, rapport, e-mail, attente de génération et démo. Le sélecteur permet de revenir à n’importe quel écran pour examiner sa hiérarchie et ses états.

La direction visuelle immersive avec l’image roche/mousse reste dans [`../sstr-direction/client-site.html`](../sstr-direction/client-site.html). Elle ne doit pas être remplacée par le prototype fonctionnel du parcours.

## Limites

- les données sont fictives et uniquement destinées au prototype ;
- aucun appel réseau, provider ou stockage n'est utilisé ;
- la validation navigateur couvre Chromium desktop et une viewport mobile de 390 px ;
- la V3 a été parcourue dans Helium sur desktop ; Playwright CLI n’a pas pu démarrer faute de navigateur Playwright installé dans l’environnement ;
- il s'agit toujours d'un prototype, pas d'une preuve de fonctionnement backend ou de production.
