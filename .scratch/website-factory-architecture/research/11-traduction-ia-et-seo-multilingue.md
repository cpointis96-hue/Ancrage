# Traduction IA et SEO multilingue pour un site de restaurant

Date de vérification : 2026-08-17  
Type : research  
Périmètre : contraintes officielles de traduction automatique/IA, menus, conservation, validation, régénération et SEO multilingue. Aucun ticket, aucune map et aucun code modifiés.

## Conclusion exécutive

La traduction automatique doit être traitée comme un brouillon contrôlé, pas comme une autorité éditoriale suffisante pour un menu public. Les documentations des fournisseurs proposent des glossaires, du contexte, du balisage et parfois des modèles personnalisés, mais elles ne fournissent pas une garantie générale de justesse sur les noms de plats, les références culturelles, les ingrédients ou les formulations sensibles. Microsoft indique explicitement que la traduction machine ne remplace pas le traducteur humain ; Google propose un workflow séparé de post-édition humaine dans Translation Hub. Sources : [Azure Translator FAQ](https://learn.microsoft.com/en-us/azure/ai-services/translator/faq), [Google Translation Hub](https://cloud.google.com/translation-hub).

Pour ce produit, la frontière robuste est donc :

1. conserver le contenu source et chaque version traduite séparément ;
2. traduire des champs structurés plutôt qu’un HTML ou un PDF opaque ;
3. protéger les noms propres, noms de plats, marques, unités, prix, URLs et variables par glossaire ou balises non traduisibles ;
4. soumettre le menu à des contrôles déterministes puis à une validation humaine avant publication ;
5. régénérer une nouvelle version après correction, sans écraser une version approuvée ;
6. publier une URL indexable par locale, avec `hreflang` réciproque et un `x-default` explicite.

Les prix et quotas ci-dessous sont ceux publiés ou exposés dans la documentation officielle consultée le 17 août 2026. Les prix susceptibles de dépendre d’une région, d’un compte ou d’un devis restent signalés comme tels.

## 1. Ce que les APIs garantissent — et ce qu’elles ne garantissent pas

### 1.1 Pas de classement universel de qualité

Les sources officielles documentent des modèles et des mécanismes d’amélioration, pas un classement indépendant et universel de qualité entre fournisseurs. Google distingue NMT, Translation LLM, modèles personnalisés et Adaptive Translation ; DeepL expose notamment le contexte, les glossaires, le type de modèle, les règles de style et les instructions ; Azure permet d’entraîner un modèle Custom Translator avec des données propres au domaine ; AWS propose terminologie personnalisée et données parallèles. Ces fonctions peuvent améliorer la cohérence ou l’adaptation au domaine, mais elles ne prouvent pas qu’une sortie donnée est correcte pour un menu particulier. Sources : [Google API overview](https://docs.cloud.google.com/translate/docs/api-overview), [DeepL Translate API](https://developers.deepl.com/api-reference/translate/request-translation), [Azure Custom Translator](https://learn.microsoft.com/en-us/azure/ai-services/translator/custom-translator/concepts/customization), [Amazon Translate customization](https://docs.aws.amazon.com/translate/latest/dg/customizing-translations.html).

**Conséquence** : le produit doit mesurer la qualité sur un jeu de menus représentatif et faire approuver les chaînes à risque ; il ne doit pas transformer une préférence marketing du fournisseur en garantie produit.

### 1.2 Le contexte est une contrainte de qualité

Les fragments courts sont ambigus. DeepL précise que le paramètre `context` aide à choisir le bon sens, le genre ou le nombre, sans être lui-même traduit ni facturé ; son exemple montre qu’un même mot peut changer selon le paragraphe environnant. Les tags HTML/XML ne remplacent pas toujours ce contexte : avec des fragments isolés, il peut encore être nécessaire d’ajouter du contexte. Source : [DeepL — context parameter](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/how-to-use-context-parameter).

**Conséquence menu** : envoyer `name`, `description`, ingrédients et catégorie avec une structure qui donne le contexte utile, mais ne pas envoyer toute la base du restaurant à chaque requête. Un intitulé isolé comme « mousse », « pickle », « brousse » ou « royal » ne doit pas être traduit sans contexte éditorial.

### 1.3 La taille et le découpage changent la sortie

Google recommande des requêtes de texte de 5 000 caractères au maximum pour limiter la latence ; Advanced accepte au plus 30 000 code points par requête. DeepL signale que le découpage XML peut produire une mauvaise traduction lorsqu’une phrase est séparée entre plusieurs tags ; il faut alors configurer les tags non séparateurs ou revoir la structure. AWS limite la traduction temps réel à 10 000 bytes d’entrée et les documents batch à 1 000 000 caractères. Sources : [Google quotas and limits](https://docs.cloud.google.com/translate/quotas), [DeepL structured XML](https://developers.deepl.com/docs/xml-and-html-handling/structured-content), [Amazon Translate quotas](https://docs.aws.amazon.com/translate/latest/dg/what-is-limits.html).

**Règle** : segmenter par unité éditoriale stable — plat, description, allergène, catégorie — avec un identifiant immuable ; éviter de couper une phrase au milieu d’un élément de menu ou d’un composant HTML.

## 2. Coûts, quotas et limites publiés

Les montants sont en USD et les caractères sont comptés selon les règles propres à chaque service. Une traduction vers plusieurs langues peut multiplier le coût : Google compte les caractères source par langue cible en batch ; Azure compte chaque traduction séparément ; AWS facture les caractères traités. Sources : [Google pricing](https://cloud.google.com/translate/pricing), [Azure Translator FAQ](https://learn.microsoft.com/en-us/azure/ai-services/translator/faq), [Amazon Translate pricing](https://aws.amazon.com/translate/pricing/).

| API | Coût ou crédit officiellement publié | Quotas/limites qui comptent pour un restaurant | Conservation annoncée |
|---|---|---|---|
| **Google Cloud Translation** | NMT : premier 500 000 caractères/mois crédités, puis **20 USD / million**. Translation LLM : **10 USD / million de caractères en entrée + 10 USD / million en sortie**. Adaptive Translation : **25 USD / million en entrée + 25 USD / million en sortie**. Document NMT : **0,08 USD/page**. | Général : **6 M caractères/minute** par projet et par utilisateur ; recommandé **5 000 caractères/requête**, maximum Advanced **30 000** ; Translation LLM **30 000** par requête ; document **2 400 pages/minute**. | Le texte est gardé brièvement en mémoire pour servir la requête ; Google dit ne pas l’utiliser pour entraîner/améliorer ses fonctionnalités. Endpoint global : pas de garantie de traitement dans une région précise ; Advanced propose des endpoints régionalisés. |
| **DeepL API** | Le plan Developer permet **1 M de caractères au total**. Growth inclut des caractères dans un prix mensuel/annuel, facture le dépassement à l’usage et limite l’usage à **50 M caractères/mois** ; le prix exact est présenté par le compte DeepL. API Free et API Pro ne peuvent plus être achetées selon la page de plans actuelle. | Requête totale **128 KiB**, en-têtes **16 KiB**. Limite publiée Free : **500 000 caractères/mois** ; documents HTML : jusqu’à **5 MB / 500 000 caractères** en Free et **5 MB / 1 M** en Pro dans la documentation de limites. | Growth annonce la suppression immédiate des textes après traduction/amélioration. La garantie doit être vérifiée pour le plan réellement souscrit ; ne pas déduire la politique d’un autre plan. |
| **Azure Translator** | Le niveau **F0** offre **2 M caractères/mois** pour la combinaison traduction standard et entraînement custom. Le prix S1 et les engagements sont affichés selon région/compte dans la page de tarification et le calculateur ; la page consultée expose les champs régionaux comme variables, donc aucun montant universel fiable n’est reporté ici. | Requête Translate **50 000 caractères** ; F0 **2 M caractères/heure**, S1/S2/C2 **40 M/heure**, S3/C3 **120 M/heure**, S4/C4 **200 M/heure** ; latence maximale documentée **15 s** standard et **120 s** custom. | Microsoft indique que le texte n’est pas conservé ; les documents sont stockés temporairement pendant le traitement puis supprimés. |
| **Amazon Translate** | Standard et batch document : **15 USD / million de caractères** ; Active Custom Translation : **60 USD / million**. Free Tier : **2 M caractères/mois pendant 12 mois** pour les services éligibles ; le temps réel document HTML n’a pas de Free Tier. | Temps réel : **10 000 bytes** d’entrée. Batch : **1 M caractères/document**, **10 langues cibles**, **10 jobs concurrents**, **1 000 jobs en file**. Terminologie : **20 MB**, **30 langues cibles**, **1 fichier par requête**. | AWS indique pouvoir stocker les données pour améliorer ses modèles ; une demande de suppression et de non-stockage futur doit passer par AWS Support et peut réduire la qualité des traductions. |

Sources de vérification : [Google pricing](https://cloud.google.com/translate/pricing), [Google quotas](https://docs.cloud.google.com/translate/quotas), [Google data usage](https://docs.cloud.google.com/translate/data-usage), [DeepL plans](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans), [DeepL usage limits](https://developers.deepl.com/docs/resources/usage-limits), [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/), [Azure service limits](https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits), [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/translator/data-privacy-security), [AWS pricing](https://aws.amazon.com/translate/pricing/), [AWS quotas](https://docs.aws.amazon.com/translate/latest/dg/what-is-limits.html).

### 2.1 Budgeter les traductions sans surprise

- Compter les caractères par couple source-cible avant l’appel ; compter aussi espaces, ponctuation et balises lorsque le fournisseur les inclut.
- Dédupliquer les segments inchangés et mettre en cache par hash du texte source, langue cible, modèle et version du glossaire.
- Ne pas régénérer toutes les langues lorsqu’un seul plat change : invalider les segments dépendants uniquement.
- Réserver un budget avant l’appel, appliquer un plafond par job/restaurant/mois et interrompre proprement lorsque le plafond est atteint.
- Prévoir les retries : selon le fournisseur, un appel répété peut être facturé à nouveau ; Azure documente explicitement que le texte répété est compté même s’il est identique.

## 3. Menus, noms propres et éléments à ne pas traduire

### 3.1 Modèle de contenu recommandé

Le menu doit être stocké comme données structurées, et non comme une chaîne HTML unique :

```text
menu_item_id
source_locale
category_key
name_source
description_source
ingredients_source[]
allergens_source[]
dietary_labels_source[]
price
currency
availability
proper_names[]
translation[locale].{name, description, ingredients, allergens, status, version}
```

Les prix, monnaies, identifiants, URLs, quantités, unités et états de disponibilité doivent rester des champs contrôlés. Les textes traduisibles sont envoyés séparément, puis réassemblés par le serveur dans un schéma validé. C’est une recommandation d’architecture dérivée des limites de balisage, de glossaire et de comptage des caractères documentées par les fournisseurs.

### 3.2 Glossaires pour les marques, plats et termes spécialisés

- **Google** décrit explicitement les glossaires comme un moyen de traiter les entités nommées, les noms de produits, les mots ambigus et les emprunts culturels ; `bouillabaisse` est donné comme exemple. Les correspondances sont sensibles à la casse par défaut, certains stopwords sont ignorés, un terme peut dépasser 1 024 bytes mais est alors ignoré, et Google recommande de conserver le fichier source car les ressources de glossaire ne sont pas versionnées pour rollback. Source : [Google glossaries](https://docs.cloud.google.com/translate/docs/advanced/glossary).
- **DeepL** exige un `source_lang` et une paire de langues compatible pour un glossaire ; l’API offre aussi `ignore_tags`, `tag_handling=html/xml`, `context`, `style_id` et `custom_instructions`. Les tags Mustache ne sont pas reconnus nativement : DeepL recommande de les transformer en tags XML uniques avant l’appel, puis de les restaurer, en avertissant que l’absence de contexte peut dégrader la qualité. Sources : [DeepL Translate API](https://developers.deepl.com/api-reference/translate/request-translation), [DeepL placeholders](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/placeholder-tags).
- **Azure** permet un glossaire où la même valeur source et cible signifie « ne pas traduire » pour une marque ; la correspondance est sensible à la casse. Source : [Azure document glossaries](https://learn.microsoft.com/en-us/azure/ai-services/translator/document-translation/how-to-guides/create-use-glossaries).
- **AWS** accepte une terminologie personnalisée pour les marques, noms de personnages et contenus uniques, mais précise que l’utilisation du terme cible n’est pas garantie dans chaque traduction ; la source est sensible à la casse et doit correspondre exactement. Sources : [AWS custom terminology](https://docs.aws.amazon.com/translate/latest/dg/how-custom-terminology.html), [AWS terminology creation](https://docs.aws.amazon.com/translate/latest/dg/creating-custom-terminology.html).

**Politique proposée pour un restaurant** : chaque entrée doit déclarer `translate`, `keep`, `transliterate` ou `review`. Les noms commerciaux, noms de restaurants, chefs, domaines, marques, appellations protégées et noms de plats signatures commencent en `keep` ou `review`, jamais en traduction automatique implicite. Un plat culturel peut conserver son nom original et recevoir une explication localisée ; cette décision est éditoriale et doit être validée par le propriétaire du restaurant.

### 3.3 HTML, placeholders et mise en page

Google traduit le texte entre les tags HTML et conserve les tags autant que possible, mais indique que les autres langages de balisage comme XML ont un résultat indéfini. DeepL et AWS disposent de mécanismes dédiés HTML/XML ou de tags « do not translate », mais leur segmentation peut modifier l’ordre des mots ou déplacer des tags. Sources : [Google text translation](https://docs.cloud.google.com/translate/docs/translate-text), [DeepL structured XML](https://developers.deepl.com/docs/xml-and-html-handling/structured-content), [AWS customization](https://docs.aws.amazon.com/translate/latest/dg/customizing-translations.html).

**Décision pratique** : ne pas faire traduire le DOM complet d’une page pour produire le menu. Extraire des champs textuels, protéger les placeholders par tokens contrôlés, vérifier que chaque token est présent une seule fois dans la sortie, puis rendre le HTML côté application.

## 4. Conservation et provenance des textes

La conservation fournisseur ne remplace pas la conservation applicative. Même lorsqu’un fournisseur supprime rapidement la requête, le produit doit garder la source, la sortie, la version, le statut et la preuve de validation nécessaires au fonctionnement du site.

Pour chaque segment traduit, conserver au minimum :

- `source_text` et `source_hash` ;
- `source_locale`, `target_locale`, `content_id` et `content_version` ;
- fournisseur, modèle, région/endpoint, date et identifiant de requête ;
- version du glossaire, du contexte et des règles de style ;
- sortie machine, corrections humaines et version publiée séparément ;
- statut `draft`, `needs_review`, `approved`, `published` ou `superseded` ;
- motif de rejet/correction et auteur de la validation.

Les faits fournisseur à ne pas mélanger : Google dit que le texte est gardé brièvement en mémoire et non utilisé pour entraîner ses fonctionnalités ; Azure dit ne pas conserver le texte et supprimer définitivement les documents après traitement ; AWS dit pouvoir stocker les données et demande un contact Support pour opt-out ; DeepL annonce la suppression immédiate pour Growth. Ces politiques sont différentes : le choix doit être inscrit dans la décision fournisseur et confirmé dans les conditions applicables au compte. Sources : [Google data usage](https://docs.cloud.google.com/translate/data-usage), [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/translator/data-privacy-security), [AWS quotas/privacy](https://docs.aws.amazon.com/translate/latest/dg/what-is-limits.html), [DeepL API plans](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans).

## 5. Validation humaine et contrôle avant publication

### 5.1 Ce qui doit être bloquant

Un menu ne doit pas être publié automatiquement si la sortie :

- modifie un nombre, une unité, une devise, un prix ou une disponibilité ;
- traduit ou altère un nom déclaré `keep` ;
- perd un ingrédient, un allergène, une restriction alimentaire ou une quantité ;
- ajoute un ingrédient non présent dans la source ;
- casse un placeholder, une URL, une balise ou la structure JSON ;
- dépasse la longueur d’affichage du design ;
- n’a pas de traducteur ou propriétaire identifié pour la validation.

Les contrôles de présence, égalité des nombres, tokens, URLs, balises et champs sont déterministes. Ils ne jugent pas à eux seuls la naturalité, l’appétence commerciale ni la sécurité sémantique d’un allergène : ces points nécessitent une revue humaine. Cette séparation est une recommandation d’architecture, cohérente avec l’avertissement Microsoft que la machine ne remplace pas le traducteur humain.

### 5.2 Post-édition documentée par les sources

Google Translation Hub Advanced inclut un flux Human in the Loop, la post-édition, la mémoire de traduction et les scores de prédiction de qualité ; le tarif publié est **0,50 USD/page/langue** pour Advanced et **0,15 USD/page/langue** pour Basic. Un traducteur peut revoir et éditer la sortie ; les modifications peuvent être enregistrées dans une mémoire si elle a été sélectionnée au départ. Source : [Translation Hub pricing and workflow](https://cloud.google.com/translation-hub).

Ce service document n’est pas une preuve qu’une API de texte dynamique fournit une validation humaine native. Pour un site web, il faut donc un écran ou un workflow équivalent dans le produit : diff source/sortie, affichage du contexte, signalement des champs à risque, commentaire, approbation et historique.

### 5.3 Régénération et correction

Une correction humaine ne doit pas être perdue lors d’une nouvelle génération. Le workflow recommandé est :

1. créer une nouvelle version de la source ou du glossaire ;
2. marquer les traductions dépendantes `needs_review` ;
3. relancer uniquement les segments concernés avec un nouvel idempotency key ;
4. comparer l’ancienne version approuvée et la nouvelle sortie ;
5. repasser les contrôles déterministes et la validation humaine ;
6. publier la nouvelle version et conserver l’ancienne comme historique.

Les corrections récurrentes doivent enrichir le glossaire ou la mémoire de traduction, jamais être ajoutées silencieusement comme une exception locale. Google recommande de conserver les fichiers de glossaire pour pouvoir restaurer une version ; DeepL expose une mémoire de traduction et un seuil de correspondance ; Translation Hub peut enregistrer les post-éditions dans la mémoire sélectionnée. Sources : [Google glossary versioning](https://docs.cloud.google.com/translate/docs/advanced/glossary), [DeepL translation memory fields](https://developers.deepl.com/api-reference/translate/request-translation), [Translation Hub post-editing](https://cloud.google.com/translation-hub).

## 6. SEO multilingue officiel

### 6.1 Une URL indexable par variante

Google recommande des URLs différentes pour chaque version de langue plutôt que des cookies ou préférences navigateur qui changeraient le contenu de la même URL. Les options officielles sont notamment domaine pays, sous-domaine ou sous-répertoire ; les paramètres d’URL sont déconseillés dans le guide de sites multirégionaux. Google avertit que la détection par IP, `Accept-Language` ou redirection automatique peut empêcher l’exploration et l’indexation de toutes les variantes. Sources : [Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages).

**Option MVP lisible** : `https://restaurant.example/fr/`, `https://restaurant.example/en/`, `https://restaurant.example/th/`, avec des chemins parallèles pour les pages équivalentes (`/fr/menu/`, `/en/menu/`, `/th/menu/`). La préférence de langue peut être mémorisée pour l’expérience utilisateur, mais elle ne doit pas être la seule manière d’accéder à une variante indexable.

### 6.2 `hreflang` : règles qui comptent

Google accepte trois méthodes équivalentes : balises HTML, en-têtes HTTP ou sitemap XML. Il n’y a pas d’avantage SEO à implémenter les trois ; une méthode correctement générée et testée est préférable. Chaque version doit se déclarer elle-même et déclarer les autres versions ; les liens doivent être réciproques, absolus et pleinement qualifiés. Si la réciprocité manque, les annotations peuvent être ignorées. Sources : [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [Google sitemap localized versions](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Exemple minimal dans chaque version :

```html
<link rel="alternate" hreflang="fr" href="https://restaurant.example/fr/menu/">
<link rel="alternate" hreflang="en" href="https://restaurant.example/en/menu/">
<link rel="alternate" hreflang="th" href="https://restaurant.example/th/menu/">
<link rel="alternate" hreflang="x-default" href="https://restaurant.example/">
```

`x-default` est le fallback officiel pour une langue non listée, particulièrement adapté à une page de sélection langue/pays ou à une page d’accueil qui ne cible pas une locale précise. Il ne doit pas être utilisé pour masquer une traduction absente sur une page qui prétend être localisée.

Google précise que `hreflang` et l’attribut HTML `lang` ne servent pas à détecter la langue ; la langue est déterminée par des algorithmes, notamment le contenu visible. Il faut donc réellement traduire le contenu principal, définir `<html lang="fr">` correctement pour la plateforme et l’accessibilité, et ne pas considérer `lang` comme un substitut à une page localisée. Source : [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions).

### 6.3 Langue par défaut et fallback produit

Google ne prescrit pas une langue commerciale par défaut. Le produit doit décider d’une locale source, par exemple `fr`, puis publier explicitement les autres locales. La racine peut être :

- une page de sélection stable, annotée `x-default` ; ou
- la locale par défaut, si elle est également une vraie page indexable et si ce choix est cohérent avec le marché principal.

Dans les deux cas, éviter un redirect permanent basé uniquement sur IP ou `Accept-Language`. Le sélecteur doit rester accessible par lien et chaque page locale doit fonctionner directement.

### 6.4 Données structurées restaurant et menu

Google documente `Restaurant` comme sous-type de `LocalBusiness` et son exemple JSON-LD comprend `name`, adresse, horaires, `servesCuisine`, `url` et une URL pleinement qualifiée dans `menu`. Schema.org définit `hasMenu` comme le menu structuré, textuel ou accessible via une URL. Sources : [Google LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Schema.org Restaurant](https://schema.org/Restaurant).

Pour chaque URL locale :

- générer un JSON-LD cohérent avec le contenu visible de cette locale ;
- utiliser l’URL locale dans `url` et dans `hasMenu`/`menu` si le menu est localisé ;
- garder les faits stables exacts : adresse, téléphone, coordonnées, horaires, prix réels et identifiants ;
- localiser les champs éditoriaux lorsqu’ils sont présentés comme texte, sans inventer de valeur ;
- valider le JSON-LD et tester plusieurs pages rendues.

Google indique que les données structurées doivent représenter le contenu visible, être accessibles au robot et ne garantissent pas l’apparition d’un résultat enrichi. Source : [general structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

### 6.5 Détection, canonicals et règles de crawl

Les pages adaptatives par locale peuvent ne pas toutes être explorées, car Googlebot peut utiliser une IP apparaissant aux États-Unis et ne pas envoyer `Accept-Language`. Les règles `robots.txt` et `noindex` doivent rester cohérentes entre les locales. Source : [Google locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages).

Les versions de langue doivent être reliées par `hreflang`, pas déclarées comme des représentations alternatives via `rel="canonical"` avec des attributs de langue : Google indique que les annotations canonical qui suggèrent des versions alternatives sont ignorées et renvoie vers `rel="alternate" hreflang` pour la langue/région. Source : [Google canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

## 7. Garde-fous d’architecture à inscrire dans la spécification

### Traduction

- Source canonique immuable par version ; aucun aller-retour de traduction vers une autre langue comme nouvelle source sans approbation.
- Segments structurés, identifiés et cachés par hash ; cache par modèle, fournisseur, langue et glossaire.
- Glossaire versionné dans le dépôt de contenu ou la base métier, avec rollback ; catégories `keep`, `translate`, `transliterate`, `review`.
- Plafond de caractères et de coût avant appel ; retry borné et idempotent ; journal de consommation.
- Conservation de sortie machine, correction humaine et publication comme versions distinctes.

### Menu

- Contrôle déterministe des prix, unités, quantités, URLs, placeholders, balises, allergènes et noms protégés.
- Revue humaine obligatoire pour les nouveaux plats, les ingrédients/allergènes, les noms propres et les sorties qui échouent à un contrôle.
- Pas de publication d’un segment `needs_review` ; un menu partiellement traduit doit afficher une locale complète validée ou rester sur le fallback explicite.

### SEO

- Une URL stable et directement accessible par locale ; pas de traduction uniquement injectée côté client si elle doit être indexée.
- `hreflang` auto-référent et réciproque, URLs absolues, `x-default` contrôlé.
- Sitemap localisé ou balises HTML, avec un test de cohérence qui vérifie chaque graphe de variantes.
- JSON-LD `Restaurant`/`LocalBusiness` par page, cohérent avec le contenu visible et l’URL du menu de la locale.
- Vérification après rendu : statut HTTP, indexabilité, `lang`, contenu principal traduit, canonical local, alternates, JSON-LD et absence de redirect opaque.

## Sources primaires consultées

- [Google Cloud Translation — pricing](https://cloud.google.com/translate/pricing), [quotas](https://docs.cloud.google.com/translate/quotas), [data usage](https://docs.cloud.google.com/translate/data-usage), [glossaries](https://docs.cloud.google.com/translate/docs/advanced/glossary), [text translation](https://docs.cloud.google.com/translate/docs/translate-text).
- [DeepL API — plans](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans), [usage limits](https://developers.deepl.com/docs/resources/usage-limits), [translate reference](https://developers.deepl.com/api-reference/translate/request-translation), [context](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/how-to-use-context-parameter), [placeholders](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/placeholder-tags).
- [Azure Translator — FAQ](https://learn.microsoft.com/en-us/azure/ai-services/translator/faq), [service limits](https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits), [pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/), [data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/translator/data-privacy-security), [glossaries](https://learn.microsoft.com/en-us/azure/ai-services/translator/document-translation/how-to-guides/create-use-glossaries).
- [Amazon Translate — pricing](https://aws.amazon.com/translate/pricing/), [quotas](https://docs.aws.amazon.com/translate/latest/dg/what-is-limits.html), [custom terminology](https://docs.aws.amazon.com/translate/latest/dg/how-custom-terminology.html), [terminology creation](https://docs.aws.amazon.com/translate/latest/dg/creating-custom-terminology.html).
- [Google Search Central — localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- [Schema.org — Restaurant](https://schema.org/Restaurant).
