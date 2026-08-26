# Direction visuelle et système UX

## Deux expressions, une même exigence

### Cockpit : outil développeur macOS

- fond neutre et surfaces solides ;
- séparateurs fins ;
- densité compacte mais respirable ;
- typographie système lisible ;
- sidebar et panneaux redimensionnables ;
- icônes de système cohérentes ;
- accent couleur réservé à la sélection, à l'action principale et aux états critiques ;
- aucun gradient, halo ou effet de verre généralisé.

Le cockpit peut reprendre l'esprit d'une app macOS native, mais reste un MVP web local selon la carte Wayfinder.

### Site public : accueil pédagogique

- base claire et chaleureuse ;
- rythme plus ample que le cockpit ;
- une couleur d'accent identitaire ;
- titres distinctifs mais courts ;
- vraies captures ou placeholders honnêtes ;
- mascotte comme détail de marque, jamais comme remplissage ;
- composition guidée par le parcours réel, pas par un template de landing page.

## Tokens à verrouiller au design final

Le futur `design point.md` devra compléter, sans contredire cette architecture :

- palette sémantique claire et sombre ;
- couleurs texte/fond avec ratios de contraste vérifiés ;
- échelle typographique ;
- échelle d'espacement ;
- rayons et séparateurs ;
- états de sélection, focus, succès, warning, blocage et erreur ;
- règles d'icônes ;
- règles de mouvement réduit ;
- variantes mobile et desktop.

Le design final ne doit pas introduire une seconde logique de navigation ou de nouveaux objets métier.

## Usage encadré de `taste-design`

`taste-design` sera utilisé après le prototype, pour transformer la direction validée en `DESIGN.md` et en tokens lisibles par un agent de génération d'écrans. Il est particulièrement adapté au site public et à ses variantes visuelles.

Ses règles ne sont pas appliquées aveuglément :

- la motion permanente est refusée ; les animations restent ponctuelles, utiles et compatibles avec le mouvement réduit ;
- l'asymétrie est utilisée seulement lorsqu'elle améliore la lecture ;
- la créativité et la densité sont calibrées séparément pour le cockpit et le site public ;
- les layouts de type galerie, les cartes décoratives et les statistiques inventées restent interdits ;
- les règles UX, les invariants du parcours et l'accessibilité ont priorité sur les préférences esthétiques du skill.

## Stack d'interface retenue pour le prototype futur

- React + TypeScript + Vite pour les interfaces web ;
- primitives de composants sobres, avec une bibliothèque ajoutée seulement si elle respecte cette direction ;
- CSS variables pour les tokens ;
- prototype en mémoire, sans persistance métier ;
- Cloudflare/Neon/R2 et les providers hors du prototype visuel.

SwiftUI n'est pas la stack de l'application actuelle : le skill SwiftUI fournit ici les règles de qualité macOS, d'iconographie, de hiérarchie et de sobriété.
