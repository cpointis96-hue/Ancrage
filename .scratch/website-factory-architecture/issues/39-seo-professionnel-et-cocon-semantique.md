# Comment garantir un SEO professionnel, vérifiable et durable ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Définir une barre de qualité SEO très élevée pour les sites restaurant : HTML rendu côté serveur, crawlabilité, indexation, architecture de pages, cocon sémantique, contenus utiles, données structurées `Restaurant`/`LocalBusiness`, titres, descriptions, canonicals, sitemap, robots, images, liens internes, performance mobile, accessibilité, sécurité et suivi Search Console.

Le « cocon sémantique » doit être traduit en architecture utile au visiteur, pas en pages artificielles destinées à manipuler les moteurs. Chaque page doit avoir une intention, une source, un CTA et une relation claire avec le restaurant.

## Gates attendus

Chaque version doit passer des contrôles déterministes et des revues indépendantes : données exactes, absence de contenu inventé, structure HTML, liens, données structurées, indexabilité, vitesse, responsive, accessibilité, copy, traduction et cohérence locale.

## Limite

Promettre une base SEO irréprochable et prête à être explorée est possible ; promettre un classement, un délai d'indexation ou une position est interdit.

## Comments

## Règles SEO à intégrer dans le produit

### Entité locale et fiche Google

- Une identité canonique par restaurant : nom commercial confirmé, adresse, téléphone, horaires, cuisine, URL officielle et menu.
- NAP et horaires cohérents entre le site, les sources autorisées et la fiche Google ; aucun changement automatique d'une source secondaire ne doit écraser une donnée validée.
- Catégorie Google la plus spécifique réellement justifiée, attributs utiles, photos réelles autorisées, menu et lien de réservation si disponibles.
- Aucune insertion de mots-clés dans le nom de l'établissement, faux avis, avis incités ou information non vérifiée.

### Architecture de contenu

- Pages cœur par défaut : accueil, menu, plats/signatures si les données sont assez riches, histoire/positionnement, visite/contact, réservation ou commande si un lien réel existe, et informations légales.
- Une page de plat n'est indexable que si elle possède une information propre et utile : description réelle, prix ou statut, photo autorisée, contexte culinaire, allergènes confirmés et CTA.
- Une page de commune/quartier n'est indexable que si le restaurant y a une relation réelle et utile : proximité, accès, service, événement, guide ou information locale originale. Sinon elle reste fusionnée, `noindex` ou n'est pas créée.
- Le nombre de pages n'est jamais un objectif SEO. La valeur, la preuve, la navigation et la conversion le sont.

### Données structurées et indexation

- JSON-LD `Restaurant`/`LocalBusiness` sur les pages concernées, avec seulement des champs vrais et visibles : nom, adresse, téléphone, horaires, cuisine, prix, menu, URL et images.
- `BreadcrumbList` lorsque la profondeur de navigation le justifie ; données structurées validées par Rich Results Test et contrôles de cohérence avec le contenu visible.
- `title`, `meta description`, H1, canonical, Open Graph, sitemap, robots et liens internes générés de manière déterministe.
- Démo : token expirant, `noindex`, protection d'accès adaptée ; production : indexabilité contrôlée après validation.
- Traduction : une URL par locale lorsque le multilingue est activé, `hreflang` cohérent, `x-default` si nécessaire, contenu localisé et validé ; jamais de traduction mécanique publiée sans contrôle.

### Performance, accessibilité et confiance

- HTML utilisable sans JavaScript pour le contenu principal ; JavaScript réservé à l'interaction.
- Images responsives, dimensions déclarées, formats modernes, compression, chargement différé sous la ligne de flottaison et priorité à l'image principale.
- Contrôles Lighthouse, Axe, Playwright mobile, liens, téléphone, carte, menu, horaires et CTA ; revue humaine de lisibilité et de crédibilité.
- Pages rapides, propres et lisibles avant toute optimisation de mot-clé.

### Mesure et promesse

- Search Console, sitemap et URL Inspection pour les sites autorisés ; baseline conservée avant publication et suivi des erreurs.
- Le rapport distingue mesure, observation sourcée, recommandation et hypothèse.
- La promesse commerciale est « base SEO locale techniquement solide et utile », jamais « première place » ou délai garanti d'indexation.

## Sources

- [Google — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google — Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google — Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google — LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google — AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Whitespark — 2026 Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/)
- [BrightLocal — Local SEO Handbook](https://www.brightlocal.com/learn/local-seo/)

Voir le [rapport de recherche complet](../research/39-seo-professionnel-et-cocon-semantique.md).

## Références stratégiques

Lire [82 — Stratégie SEO Website Factory](../research/82-seo-strategy-website-factory.md) pour la stratégie consolidée et [85 — Pipeline audit vers site](../research/85-pipeline-audit-vers-site-website-factory.md) pour son application dans le site généré.

## Nouvelle capacité : audit SEO automatisé

Les règles de ce ticket concernent la qualité SEO des sites générés. L'audit d'un site existant est un produit de données distinct : il doit utiliser `CrawlRun`, `SEOAudit`, `SEOFinding`, `SEORecommendation`, `SEOReport` et `ReportDelivery`, avec un périmètre affiché et des preuves conservées. Voir [70-modele-pipeline-audit-seo.md](70-modele-pipeline-audit-seo.md) et [71-perimetres-audit-et-prix.md](71-perimetres-audit-et-prix.md).
