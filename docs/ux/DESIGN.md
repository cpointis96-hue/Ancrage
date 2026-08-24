# Design System: Website Factory

## 1. Visual theme & atmosphere

Deux expressions d'un même système :

- **Cockpit** — outil de travail macOS, calme, précis, dense sans être comprimé. Atmosphère de poste développeur : surfaces solides, séparateurs fins, hiérarchie par la structure et non par la décoration.
- **Site public** — accueil clair, humain et pédagogique. Atmosphère plus ample, avec une touche de personnalité portée par la mascotte, sans transformer la page en spectacle.

Les deux surfaces partagent les mêmes règles de lisibilité et de statut, mais pas la même densité.

Calibration : cockpit density 8/10, public density 4/10, variance 3/10, motion 2/10. La motion permanente est interdite.

## 2. Color palette & roles

- **Canvas** `#F5F5F2` — arrière-plan général.
- **Surface** `#FFFFFF` — contenu actif et panneaux.
- **Ink** `#20211F` — texte principal.
- **Muted** `#6D706B` — métadonnées et aides secondaires.
- **Structural line** `#D9DBD5` — séparateurs et contours.
- **Single accent — Moss** `#326B58` — action principale, sélection, focus et réussite.
- **Accent soft** `#E2EEE8` — surface d'information positive.
- **Warning** `#8D641D` — warning accompagné d'un libellé.
- **Block** `#9A3F3F` — blocage ou erreur accompagné d'une explication.

Une seule couleur d'accent de marque est active par surface. Aucun dégradé bleu-violet, halo néon ou noir pur.

## 3. Typography rules

- **Interface** : police système Apple (`-apple-system`, `SF Pro` lorsque disponible).
- **Titres publics** : même famille système, grande taille contrôlée, chasse légèrement resserrée, jamais un titre crié.
- **Métadonnées** : 11–13 px, contraste suffisant, jamais utilisées pour cacher une information critique.
- **Chiffres et identifiants** : chiffres tabulaires ou monospace uniquement lorsqu'ils facilitent la comparaison.
- **Corps public** : 16–18 px, largeur de lecture confortable, ligne courte.

Pas de serif générique dans le cockpit, pas d'Inter imposé, pas de capitales décoratives ni de texte technique sans traduction.

## 4. Component styling

- **Bouton principal** : fond Moss, texte clair, rayon 7–8 px, retour tactile discret. Un seul par contexte.
- **Bouton secondaire** : surface blanche, bord structural, aucune ombre décorative.
- **Actions icon-only** : uniquement si le symbole est évident ; sinon libellé accessible obligatoire.
- **Panneaux** : surfaces solides séparées par une ligne ; les cartes ne servent que lorsqu'elles matérialisent une hiérarchie réelle.
- **Champs** : label au-dessus, aide courte sous le champ, erreur précise sous le champ.
- **Statuts** : texte + forme ou icône ; jamais couleur seule.
- **Chargement** : message indiquant l'étape ; squelette uniquement lorsqu'il reflète la géométrie réelle.
- **Vide** : cause et action qui permet de remplir la vue.
- **Erreur** : cause, conséquence et récupération possible.

## 5. Layout principles

- Cockpit : sidebar courte → file de travail → inspecteur contextuel.
- Site public : contenu mobile-first, une action principale, progression visible et champs progressifs.
- Panneaux redimensionnables sur grand écran ; empilement propre sur mobile.
- Une colonne sous 768 px ; aucun scroll horizontal obligatoire.
- Espacement fondé sur 4/8/12/16/24/32 px, ajusté par surface.
- Pas de grille de trois cartes égales, de tableau décoratif ou de section qui existe uniquement pour remplir un template.
- Le contenu reste dans une largeur maximale lisible ; aucun texte ne se superpose à une image.

## 6. Motion & interaction

- Motion 0–2 : transitions courtes, ciblées, non nécessaires à la compréhension.
- Aucun élément ne pulse, flotte ou shimmer en boucle.
- Respect obligatoire de `prefers-reduced-motion`.
- Focus visible sur chaque contrôle.
- Dialogues fermables au clavier avec Échap.
- Les états de synchronisation, progression, validation et erreur sont persistants dans le contenu ; ils ne dépendent pas d'une animation.

## 7. Responsive rules

- Mobile-first pour le site public.
- Cibles tactiles d'au moins 44 px.
- Le clavier mobile ne masque jamais le champ actif.
- Le PDF reste accessible sur mobile sans masquer le CTA principal.
- Le cockpit réduit d'abord la sidebar, puis empile la file et le détail.
- Le texte doit rester utilisable à 200 % de zoom.

## 8. Anti-patterns — NEVER DO

- Pas d'emoji fonctionnel.
- Pas de gradient bleu-violet ou de glow.
- Pas de statistiques inventées, flux fictifs ou métriques décoratives.
- Pas de badge « AI Powered ».
- Pas de flèche décorative sur tous les boutons.
- Pas de sidebar longue remplie de réglages rares.
- Pas de bouton sans conséquence réelle.
- Pas de statut indiqué par la couleur seule.
- Pas de mascotte en animation permanente.
- Pas de paiement avant la démo.
- Pas d'e-mail avant « Préparer mon site ».
- Pas de démo avant validation opérateur.
