# Comment concevoir trois offres localisées, modifiables et honnêtes ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Le système doit permettre à l'opérateur de modifier depuis le cockpit les trois offres affichées sur le site public : nom, prix, devise, description, bénéfices, limites, ordre, badge recommandé, pays ciblés, langue, période de facturation et options. La sauvegarde doit créer une version et publier la nouvelle version sur la page commerciale après validation.

Le moteur produit doit rester commun, mais le catalogue doit pouvoir adapter la devise, les taxes, le vocabulaire, les exemples, les moyens de paiement et la promesse selon le marché. Le lancement envisagé est : Australie et Sri Lanka en anglais ; France ensuite en français ; singhalais ensuite avec traduction localisée et contrôle humain.

## Structure recommandée à tester

1. **Essentiel** : site rapide, menu, photos, horaires, contact, une langue, hébergement et SEO technique de base.
2. **Visibilité** — offre recommandée : tout l'Essentiel, audit Google plus clair, recommandations locales, suivi borné, traductions ou contenus supplémentaires selon le marché.
3. **Géré** : tout le niveau Visibilité, avec davantage de mises à jour, SEO actif, contenu, gestion de présence locale et support prioritaire.

Le niveau intermédiaire ne doit pas être un faux leurre. Il doit être le meilleur rapport valeur/prix pour la majorité des restaurants ; le niveau supérieur doit justifier son prix par un travail ou une capacité réellement supérieure. Le client doit pouvoir commencer par Essentiel et comprendre précisément ce qui débloque le niveau supérieur.

## Décision attendue

Définir les bénéfices et limites exacts des trois offres, puis le degré de localisation par pays et langue. Le prix ne doit pas être codé dans le renderer : il doit venir d'une version de catalogue validée et publiable.

## Comments

## Decision

Les trois offres sont définies par périmètre avant d'être définies par prix :

- `Essential` : site restaurant standardisé, une langue, pages principales, SEO technique et quotas stricts ;
- `Visibility` : offre recommandée, audit initial approfondi, contenu/local SEO renforcé et capacités supplémentaires bornées ;
- `Managed` : mises à jour, suivi, contrôles récurrents et interventions supplémentaires avec limites explicites.

Les prix, devises, taxes, options et remises sont localisés, versionnés et testés sur de vrais restaurants. Le plan intermédiaire doit être réellement le meilleur rapport valeur/prix, sans faux choix ni dark pattern.

L'automatisation peut réduire fortement le coût marginal, mais les erreurs, quotas fournisseurs, traduction sensible, support et responsabilité doivent rester visibles dans le Cost Ledger et dans les limites de chaque offre.

## Decision

Les trois offres gardent la même structure produit entre les marchés. Le système localise le prix, la devise, les taxes, le vocabulaire, les exemples, les moyens de paiement et la langue sans créer un produit différent par pays.
