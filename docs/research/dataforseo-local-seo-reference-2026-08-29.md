# Références DataForSEO pour l'audit SEO local

Date : 2026-08-29

## Conclusion

Il existe des implémentations réutilisables. Elles ne fournissent pas un prompt magique pour tous les restaurants, mais convergent vers le même découpage : identité et coordonnées factuelles, SERP locale pour la visibilité, métriques de mots-clés à l'échelle réellement supportée, puis interprétation séparée.

La correction à appliquer au runtime est de ne plus présenter les sorties DataForSEO Labs comme des données communales. Les Labs servent à découvrir et mesurer des thèmes au niveau pays/langue. La visibilité locale et les concurrents locaux doivent venir du Maps/Local Finder ciblé par coordonnées.

## Sources primaires et implémentations inspectées

| Référence | Élément retenu | Décision pour ce projet |
| --- | --- | --- |
| DataForSEO, Local SEO solution, `serp/google/maps/live/advanced` | Une requête Maps accepte un mot-clé et des coordonnées ; les résultats sont un classement local observé. | Utiliser les coordonnées Google Places validées pour une recherche de visibilité locale bornée. |
| DataForSEO, `keyword_ideas/live` | Les idées de mots-clés exigent une paire location/langue résolue ; le coût est renvoyé dans la réponse. | Résoudre gratuitement la paire avant tout appel payant et enregistrer le coût réellement retourné. |
| OpenSEO, skill `local-seo` | Les concurrents locaux se comparent après un Local Finder au point de l'établissement ; les grilles coûtent un appel par point. | L'audit initial fait une seule requête locale, jamais de grille automatique. |
| OpenSEO, skill `keyword-research` | Les seeds sont restreints, les métriques hydratent ensuite une shortlist ; adéquation métier et intention priment sur le volume. | Planifier 1 à 6 seeds, mesurer seulement une shortlist et qualifier chaque terme. |
| SEO Playground | Les Labs ne ciblent que les pays pris en charge, alors que SERP/Business Data peuvent utiliser ville ou coordonnées ; les recherches identiques sont dédupliquées pendant 60 secondes. | Séparer explicitement `country-metrics` et `local-serp`, et dédupliquer une relance identique. |

## Flux recommandé pour un restaurant

1. Google Places Details fournit `placeId`, nom, adresse, coordonnées et catégorie primaire. La catégorie primaire est un fait observé ; les types génériques Google ne deviennent pas des catégories éditoriales.
2. L'IA, avec un prompt versionné, reçoit seulement le nom, la ville et une liste fermée de catégories autorisées. Elle retourne au plus six requêtes de départ, pas des volumes ni des concurrents.
3. DataForSEO Labs `keyword_ideas/live` reçoit ces seeds avec la paire pays/langue. Ses sorties sont des idées et métriques de marché, pas des preuves de demande dans la commune.
4. Le moteur élimine doublons, termes hors activité et villes explicitement concurrentes. Il garde aussi les termes métier pertinents sans nom de ville, mais les marque `marché national` plutôt que `local`.
5. DataForSEO Maps ou Local Finder reçoit le mot-clé principal et les coordonnées validées. Les résultats donnent les concurrents locaux observés, distincts des domaines concurrents nationaux.
6. `keyword_overview` ne mesure qu'une petite shortlist. Aucun concurrent ni chiffre absent n'est complété par IA.
7. Le rapport sépare : profil observé, visibilité locale observée, opportunités de marché, hypothèses de contenu et limites.

## Budget et latence

- Les endpoints de résolution location/langue sont exécutés avant les appels facturés.
- Une exécution idempotente doit réutiliser son résultat récent au lieu de re-facturer un double clic.
- Le budget de DataForSEO est un plafond de run de 0,50 USD. Chaque endpoint réserve une estimation, puis le ledger règle avec le champ `cost` de la réponse.
- Pas de grille locale automatique : une grille 3x3 représente déjà neuf recherches payantes. Elle doit être une action ultérieure avec coût annoncé.
- Le plan IA est un seul appel JSON court, avec limite de sortie. Il aide au choix des seeds, mais ne remplace aucune source.

## Exemples de requêtes, pas de conclusions métier

Pour une fiche déjà observée comme restaurant à Assas, les requêtes candidates peuvent être `restaurant Assas`, `restaurant Assas menu`, `restaurant Assas réservation` et `Nom de l'établissement Assas`. Elles restent des seeds. Elles ne prouvent ni que le restaurant sert une cuisine particulière, ni que chaque idée retournée est locale.

## Sources

- https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_ideas-live/
- https://dataforseo.com/solutions/local-seo
- https://docs.dataforseo.com/v3/serp-google-local_finder-task_post/
- https://github.com/every-app/open-seo/tree/main/plugins/openseo/skills/local-seo
- https://github.com/every-app/open-seo/tree/main/plugins/openseo/skills/keyword-research
- https://github.com/paulmassen/seo-playground
