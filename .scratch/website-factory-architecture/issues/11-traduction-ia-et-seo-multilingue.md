# Quelle stratégie de traduction IA pour la langue choisie du site de restaurant ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Le MVP ne gère pas la langue des clients ni un site multilingue avec changement automatique. Le restaurateur saisit ses informations dans sa langue, puis choisit une seule langue de publication pour sa démo et son site.

Vérifier les options de traduction IA pour produire cette langue choisie : qualité des menus et des noms de plats, glossaire par restaurant, langues supportables, coût, relecture humaine, conservation des textes source et traduits, corrections et régénérations.

Établir les contraintes SEO et UX pour un site publié dans une seule langue choisie : langue par défaut, métadonnées, données structurées, fallback si la traduction échoue et distinction entre traduction publiée et suggestion IA. Les sites multilingues pour les visiteurs sont hors du MVP actuel.

La recherche doit utiliser des sources primaires et indiquer ce qui doit rester validé par l'opérateur ou le restaurateur avant publication.

## Answer

Pour le MVP, la traduction IA reste limitée à une seule langue de publication choisie par le restaurateur. La langue saisie par le restaurateur est la source de référence ; la traduction vers la langue choisie est un brouillon versionné, jamais une publication automatique.

Le workflow recommandé est : langue source → traduction structurée avec glossaire et protection des noms propres, plats, prix et placeholders → contrôles déterministes → `TranslationReview` → validation du site → publication. Une modification du contenu source rend la traduction concernée « à réviser ».

Pour ce périmètre mono-langue, chaque site doit déclarer correctement sa langue, ses métadonnées et ses données structurées `Restaurant`. Les URLs par locale, `hreflang` et `x-default` deviennent nécessaires lorsque plusieurs langues visiteurs seront introduites, mais ne doivent pas alourdir le MVP actuel.

Voir le [rapport de recherche sourcé](../research/11-traduction-ia-et-seo-multilingue.md) pour les fournisseurs, quotas, coûts et extensions futures.

## Comments

## Decision

Le lancement utilise l'anglais pour les premiers marchés Sri Lanka et Australie. Le singhalais est ajouté pour le Sri Lanka, puis le français pour la France. L'architecture accepte d'autres langues, mais le MVP ne promet pas une qualité humaine parfaite dans toutes les langues.
## Comments
