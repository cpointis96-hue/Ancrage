# Automatiser une recherche SEO locale utile aux restaurants

Date : 2026-08-29

## Décision proposée

Automatiser la chaîne de preuves et le triage, pas la décision commerciale finale. Le système peut découvrir des concurrents locaux, comparer leurs mots-clés à ceux du site audité, vérifier une shortlist dans les SERP locales et produire des recommandations justifiées. Il ne peut pas déduire sans preuve les spécialités, la zone réellement servie, la capacité de réservation ou la valeur commerciale d'une requête.

## Écart constaté sur le run local du 28 août

Le run `audit-run-20260828212535-1b904e0b` a bien observé trois établissements dans le Local Finder, mais les résultats normalisés ne contenaient aucun domaine ou URL de site public. Ils sont donc des concurrents **local-SERP observés**, pas encore des concurrents dont les mots-clés peuvent être comparés. Un pipeline de gap ne doit pas les compléter par devinette : il doit d’abord corroborer, pour chacun, un site officiel et l’identité de la fiche (nom, localité et statut d’activité). Sans ce lien, aucune requête `ranked_keywords` ne doit être envoyée pour ce concurrent.

## Ce que signifie « encore ouvert »

Google Places distingue `OPERATIONAL`, `CLOSED_TEMPORARILY`, `CLOSED_PERMANENTLY` et `FUTURE_OPENING`. `OPERATIONAL` veut dire que l'établissement existe et fonctionne, pas qu'il est ouvert à cet instant. Les horaires courants sont volatils et ne doivent servir qu'à contextualiser une recherche, jamais à conclure qu'un concurrent est durablement actif.

Sources :

- [Google Places business status](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
- [Google Places Details](https://developers.google.com/maps/documentation/places/web-service/place-details)

## Réalité SEO locale

Google indique que les résultats locaux dépendent principalement de la pertinence, de la distance et de la notoriété. Une métrique de mots-clés ne prouve donc ni une demande dans une commune précise, ni une position Maps. Les résultats localisés et les métriques de marché doivent rester séparés.

Source : [Google Business Profile, local ranking](https://support.google.com/business/answer/7091)

## Pipeline automatisable

### 1. Verrouiller les faits

Avant toute recherche payante : établissement choisi, `placeId`, statut d'activité, coordonnées, catégorie primaire, site officiel, ville, pays et langue. Les services, spécialités, réservations, livraison et zone élargie restent `UNKNOWN` tant qu'une source autorisée ne les confirme pas.

### 2. Construire trois à cinq intentions locales

Les intentions ne viennent pas librement d'une IA. Elles proviennent de la catégorie observée et des preuves site/Places disponibles :

- catégorie + ville ;
- marque + ville ;
- service ou spécialité observée + ville ;
- intention transactionnelle observée, par exemple réservation, menu ou horaires ;
- commune voisine uniquement si la zone est déclarée ou corroborée.

Une IA peut classer les intentions et rejeter le bruit, mais elle ne peut ni ajouter une cuisine ni élargir une zone sans preuve.

### 3. Découvrir les concurrents locaux

Pour chaque intention retenue, utiliser Google Maps ou Local Finder DataForSEO avec coordonnées et langue résolues. La liste est une liste de `CompetitorCandidate`, pas des concurrents confirmés. Conserver seulement les candidats récurrents, de même catégorie ou d'offre comparable lorsqu'elle est observée, avec un site vérifiable si disponible.

Le filtre `open_now` peut aider à explorer un paysage à un instant donné. Il ne doit pas exclure durablement une entreprise, car DataForSEO avertit que Google peut retourner des résultats ne respectant pas exactement ce filtre.

Sources :

- [DataForSEO Google Maps Live Advanced](https://docs.dataforseo.com/v3/serp-maps-live-advanced/)
- [DataForSEO Local Finder Live Advanced](https://docs.dataforseo.com/v3/serp-google-local_finder-live-advanced/)

### 4. Produire le keyword gap

Pour le site audité et les trois à cinq candidats validés, appeler `dataforseo_labs/google/ranked_keywords/live`. Cet endpoint retourne les mots-clés sur lesquels un domaine, sous-domaine ou URL se classe, avec position et données SERP. Le système construit ensuite trois ensembles :

- requêtes déjà couvertes par le site audité ;
- requêtes couvertes par au moins un concurrent validé mais absentes ou plus faibles côté audité ;
- requêtes de marque, annuaires, villes hors zone, offres non prouvées ou intentions non compatibles à écarter.

Le résultat est une liste de candidats, jamais une liste de pages à générer automatiquement.

Sources :

- [DataForSEO Ranked Keywords](https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/)
- [DataForSEO SERP Competitors](https://docs.dataforseo.com/v3/dataforseo_labs-google-serp_competitors-live/)
- [DataForSEO Labs filters](https://docs.dataforseo.com/v3/dataforseo_labs-filters/)

### 5. Vérifier la shortlist

Mesurer seulement les cinq à quinze candidats les plus plausibles :

- métriques de marché et intention via `keyword_overview` ;
- présence organique locale via SERP Google avec coordonnées ;
- visibilité locale via Maps ou Local Finder ;
- position des concurrents ou du site cible seulement lorsqu'elle est effectivement retournée.

Les appels SERP Live sont facturés par SERP et la profondeur peut augmenter le coût. La sélection doit donc avoir lieu avant cette étape.

Source : [DataForSEO Google Organic Live Advanced](https://docs.dataforseo.com/v3/serp-se-type-live-advanced/)

### 6. Interpréter avec une IA sous contrat

L'IA reçoit uniquement : faits observés, candidats qualifiés, exclusions, portée géographique des métriques, résultats SERP et inventaire des pages du site. Elle retourne pour chaque terme `KEEP`, `REJECT` ou `NEEDS_EVIDENCE`, avec une raison parmi un vocabulaire fermé. Elle ne peut pas créer de mot-clé, concurrent, spécialité, zone ou chiffre.

Sa sortie doit être validée contre un contrat JSON et les règles déterministes restent prioritaires.

### 7. Formuler des actions

Une action doit correspondre à une preuve :

- enrichir une page existante si l'offre est confirmée mais peu visible ;
- créer une page seulement si le sujet correspond à une offre réelle et apporte une information utile au visiteur ;
- compléter une fiche Google Business Profile seulement dans un futur mode propriétaire OAuth ;
- demander une confirmation humaine si l'offre, la zone ou le concurrent est ambigu.

Google recommande du contenu utile pour des personnes, et non du contenu produit principalement pour manipuler les résultats de recherche.

Source : [Google Search Central, helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## Providers à configurer

| Provider | Rôle | Autorisation | Décision |
| --- | --- | --- | --- |
| Google Places | identité, coordonnées, statut d'activité, catégorie | clé existante | obligatoire avant toute analyse locale |
| DataForSEO | SERP locale, Maps, Local Finder, mots-clés classés, keyword gap | credential existant, budget par étape | obligatoire pour le pipeline public borné |
| Search Console | vraies impressions, clics, requêtes et pages du site client | OAuth propriétaire explicite | optionnel, mais meilleur signal pour prioriser un site déjà actif |
| Crawl HTTP/HTML | inventaire des pages et faits publiés | site public autorisé | obligatoire lorsque le site existe |
| Google Business Profile | données propriétaire et performance de la fiche | OAuth propriétaire explicite | hors parcours public anonyme |

Search Console peut retourner les données de recherche groupées par requête, page, pays et appareil, mais requiert une autorisation et ne garantit pas l'exhaustivité de toutes les lignes. Il devient la source prioritaire dès que le propriétaire relie son compte.

Source : [Search Console Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)

## Ce qui reste humain

- validation d'une offre ou spécialité ambiguë ;
- accord du propriétaire avant création ou publication d'une page ;
- décision sur une zone de service non déclarée ;
- qualification commerciale finale d'un concurrent ;
- validation des recommandations et de leur priorisation.

## Incrément produit recommandé

Ajouter une branche `competitor-keyword-gap` configurée et bornée : statut Google Places de l'établissement, trois intentions locales justifiées, trois à cinq concurrents corroborés, `ranked_keywords` pour le domaine cible et les concurrents, puis validation locale d'une shortlist. Ne pas ajouter une génération automatique de pages dans cette même tranche.
