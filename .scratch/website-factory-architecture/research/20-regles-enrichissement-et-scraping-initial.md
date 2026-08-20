# Règles d’enrichissement et de scraping initial d’un restaurant

Date de vérification : 2026-08-17  
Type : research  
Périmètre : recherche initiale à partir d’un nom et d’une ville ; Google Business Profile/Places, OpenStreetMap/Nominatim, sites publics, robots/crawling, menus, photos, réseaux sociaux, provenance, conservation, droits d’usage, limites, désambiguïsation et conflits. Aucun ticket, aucune map et aucun code modifiés.

## Conclusion exécutive

Un nom et une ville ne constituent pas un identifiant suffisamment fiable. Le système peut automatiquement produire une liste de candidats, comparer des signaux et préparer un dossier d’enrichissement, mais il ne doit pas publier une fiche ou copier des médias/textes comme s’ils étaient validés.

La frontière recommandée est :

| Automatisable sous conditions | Confirmation humaine obligatoire |
|---|---|
| recherche de candidats via Places API, OSM ou site officiel ; normalisation du nom/ville/adresse ; récupération de `place_id`, d’un identifiant OSM et d’URLs de source ; lecture de données structurées publiques autorisées ; détection de doublons et de conflits ; conservation d’un instantané de provenance autorisé | choix du bon établissement quand plusieurs candidats existent ; rattachement d’un site ou réseau social au restaurant ; adresse, téléphone, horaires et statut publiables ; contenu du menu, allergènes, prix et disponibilité ; droits de chaque photo/texte ; résolution des contradictions ; validation de toute donnée à faible confiance |

Une donnée découverte doit rester `candidate` ou `needs_review` jusqu’à validation. Une attribution ou une licence d’API ne transforme pas automatiquement le contenu en propriété du produit.

## 1. Google : distinguer Places API et Google Business Profile API

### 1.1 Places API : découverte et affichage, pas base de données à copier

Places API (New) peut rechercher des candidats à partir d’une chaîne comme « nom + ville » et renvoyer des prédictions ordonnées par pertinence. Une requête de détails/recherche doit utiliser un `X-Goog-FieldMask` ; il faut demander seulement les champs nécessaires et contrôler les coûts/quotas. Sources : [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Places API reference](https://developers.google.com/maps/documentation/places/web-service/reference/rpc/google.maps.places.v1), [Usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing).

Les règles Places imposent notamment :

- ne pas pré-récupérer, mettre en cache ou stocker le contenu au-delà des exceptions prévues ; le `place_id` est l’exception explicitement conservable dans la durée ;
- afficher les attributions requises, le logo Google lorsque prévu et, sans carte, respecter les règles d’affichage correspondantes ;
- pour une photo ou une review, attribuer l’auteur et conserver l’accès direct au contenu source via `googleMapsUri` ;
- ne pas traiter la réponse comme une autorisation d’exporter un annuaire de restaurants, une base de listings ou un produit publicitaire ;
- appliquer les conditions et restrictions qui dépendent de la région de facturation, notamment les conditions EEA révisées.

Sources : [Places policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies), [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms), [EEA Places adjustments](https://developers.google.com/maps/comms/eea/places).

**Décision d’architecture** : utiliser Places pour proposer des candidats et retrouver/rafraîchir un identifiant, pas pour construire une copie persistante des champs, des photos, des reviews ou un annuaire commercial. Si un champ Places doit être affiché, le flux doit rester conforme aux attributions, aux restrictions de stockage et au mode d’affichage autorisé. Les détails de quota sont liés au projet et à la méthode : aucun quota universel ne doit être codé en dur ; surveiller les quotas de projet et traiter `429`/erreurs transitoires avec un retry borné.

### 1.2 Google Business Profile : accès du propriétaire ou mandataire

Les Business Profile APIs ne sont pas une API publique de découverte. Elles servent à créer, gérer et mesurer des fiches que l’appelant possède ou est autorisé à gérer pour le propriétaire. Même un projet approuvé ne permet pas d’interroger n’importe quelle fiche ; l’accès à la fiche concernée est requis. L’accès passe par OAuth et les APIs nécessitent une approbation du projet/une raison commerciale légitime. Sources : [Business Profile API policies](https://developers.google.com/my-business/content/policies), [GBP FAQ](https://developers.google.com/my-business/content/faq), [OAuth](https://developers.google.com/my-business/content/implement-oauth).

**Donc** : le produit peut demander au restaurateur de connecter son profil et importer/mettre à jour ses propres données avec son autorisation. Il ne doit pas utiliser GBP API pour enrichir automatiquement des restaurants tiers à partir d’un simple nom et d’une ville.

## 2. OpenStreetMap et Nominatim

Nominatim public est prévu principalement pour la recherche d’OpenStreetMap et ses serveurs sont de capacité limitée. La politique officielle impose :

- maximum absolu de **1 requête par seconde par site/application**, tous utilisateurs confondus ;
- `User-Agent` ou `Referer` valide identifiant l’application ;
- attribution OpenStreetMap visible ;
- données sous ODbL, avec obligations de licence/share-alike selon l’usage ;
- cache local et possibilité de basculer vers un autre service à la demande ;
- requêtes end-user déclenchées directement acceptables à trafic modéré, mais requêtes périodiques considérées comme du bulk et fortement déconseillées ;
- bulk régulier découragé ; pour un petit bulk ponctuel : une seule machine, un seul thread, cache local, et **4 requêtes/minute** si le script dure plus d’un jour ou est récurrent ;
- interdiction de l’autocomplete, des requêtes systématiques et de la collecte de listes complètes/POIs ; la page de détails ne doit pas être téléchargée automatiquement ; pas de revente de résultats de géocodage.

Source : [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/). Pour les droits et l’attribution : [OSMF Copyright and license](https://www.openstreetmap.org/copyright), [ODbL text](https://wiki.openstreetmap.org/wiki/Open_Database_License/ODbL-1.0.txt).

**Décision** : Nominatim peut servir à une recherche ciblée déclenchée par l’utilisateur ou à un petit job contrôlé, jamais à une collecte périodique de restaurants par ville ou à un autocomplete. Conserver la requête, la date, l’`osm_type`/`osm_id`, la réponse minimale utile et la licence ; préférer un extrait OSM ou une instance Nominatim propre si le besoin devient volumique.

## 3. Sites publics et crawling

### 3.1 `robots.txt` est une règle de crawl, pas une licence

Le [RFC 9309](https://datatracker.ietf.org/doc/html/rfc9309) formalise le Robots Exclusion Protocol : un crawler doit évaluer les groupes `User-agent`, `Allow` et `Disallow` applicables. Le fichier indique une politique de crawl pour les robots conformes ; il ne donne ni droit d’auteur, ni droit de réutilisation, ni garantie que le site autorise l’extraction. L’absence de `Disallow` ne vaut donc pas permission générale.

Avant toute collecte automatisée :

1. vérifier `https://domaine/robots.txt` et respecter le groupe de l’agent déclaré ;
2. lire les CGU, la licence, les mentions de copyright et la politique de confidentialité ;
3. limiter les URLs à celles nécessaires, ralentir les requêtes, honorer `Retry-After`, les erreurs et les demandes d’arrêt ;
4. ne pas contourner login, paywall, CAPTCHA, blocage, anti-bot, URL signée ou interface non documentée ;
5. s’identifier avec un User-Agent et une page de contact ;
6. ne pas lancer de crawl général quand une page officielle, une API ou des données structurées suffisent.

### 3.2 Données personnelles et minimisation

Une donnée publique n’est pas librement réutilisable comme donnée personnelle. La CNIL demande d’identifier la base légale, d’informer les personnes, de respecter leurs droits, de minimiser et de limiter la conservation ; elle vise explicitement les coordonnées, profils sociaux et scraping de sites publics. Sources : [CNIL — recommandations pour les réutilisateurs](https://www.cnil.fr/fr/recommandations-reutilisateurs-donnees-internet), [CNIL — focus intérêt légitime et moissonnage](https://www.cnil.fr/fr/focus-interet-legitime-collecte-par-moissonnage), [CNIL — collecte et gestion](https://www.cnil.fr/fr/tenir-compte-de-la-protection-des-donnees-dans-la-collecte-et-la-gestion-des-donnees-personnelles).

Le périmètre doit exclure les données de clients, reviewers, employés, comptes personnels, commentaires et identifiants individuels non nécessaires. Un numéro professionnel peut néanmoins être une donnée personnelle lorsqu’il renvoie à une personne : documenter la finalité et la base légale au lieu de supposer qu’il est librement copiable.

## 4. Menus, textes et photos : droits d’usage

Un menu, une description, une photo, un logo ou un post ne devient pas réutilisable parce qu’il est visible sans connexion. En droit français, toute reproduction ou représentation, même partielle, d’une œuvre sans consentement de l’auteur ou de ses ayants droit est en principe illicite ([CPI, art. L122-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278911)). Une base de données peut aussi protéger son producteur contre l’extraction ou la réutilisation d’une partie substantielle ([CPI, art. L342-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006279247)). Les CGU, la licence du site et les droits des contributeurs peuvent imposer des conditions supplémentaires.

Règles opérationnelles :

- **Faits structurés** : recopier uniquement les faits nécessaires, avec source et date ; ne pas recopier automatiquement des paragraphes marketing ou l’intégralité d’un menu.
- **Menu** : importer un PDF/texte uniquement si le propriétaire fournit le fichier ou confirme le droit d’usage ; sinon enregistrer l’URL comme source et demander la validation/copie autorisée.
- **Photo** : ne jamais télécharger et publier une photo trouvée sur Google, OSM, un site ou un réseau social sans licence ou autorisation explicite couvrant l’usage, la conservation et la transformation ; demander un upload du restaurateur ou conserver seulement un lien d’origine si les conditions l’autorisent.
- **Google photos/reviews** : appliquer les attributions, liens et restrictions Places ; ne pas les copier en cache permanent dans la fiche du produit.
- **OSM** : afficher l’attribution et respecter ODbL si des données OSM sont réutilisées ; ne pas confondre une licence de données cartographiques avec un droit sur les photos ou textes associés.
- **Transformation/IA/traduction** : une paraphrase ou traduction ne supprime pas automatiquement les droits sur l’œuvre source ; conserver la source et obtenir une base d’usage appropriée.

## 5. Réseaux sociaux officiels

Un lien vers `instagram.com`, Facebook, TikTok ou une autre plateforme est un **candidat** tant que son rattachement au restaurant n’est pas confirmé. Signaux utiles : lien réciproque depuis le domaine officiel, même téléphone/adresse, nom cohérent, compte revendiqué/verified, contenu et ville cohérents. Aucun signal isolé ne suffit.

Pour Instagram, l’API officielle vise les comptes professionnels et fonctionne avec accès/token/permissions ; la documentation Meta indique que l’API avec Facebook Login ne peut pas accéder aux comptes consommateurs, et que les usages dépendent du type de compte, des permissions et du niveau d’accès. Voir la [documentation Instagram API officielle de Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), publiée par Meta, et les [conditions Instagram](https://help.instagram.com/581066165581870).

**Règle** : intégrer un compte social par OAuth/permission du restaurateur ou par lien public affiché par le site officiel. Ne pas scraper un feed, des stories, des comptes privés, des commentaires ou des profils de personnes. Pour un post ou une image, conserver l’URL et l’identifiant de provenance ; publier une copie uniquement avec droit d’usage vérifié.

## 6. Provenance, conservation et statut des champs

Chaque valeur enrichie doit avoir son propre enregistrement de provenance, pas seulement une provenance au niveau de la fiche :

```text
restaurant_id
field
value
source_kind                # owner, official_site, Google_Places, OSM, social_api, public_page
source_url_or_provider_id
observed_at
retrieved_at
license_or_terms_snapshot
confidence                 # high, medium, low
status                     # candidate, needs_review, approved, rejected, expired
evidence                   # matching signals and raw reference, without unnecessary personal data
expires_at
reviewed_by / reviewed_at
```

Conserver séparément :

- la valeur canonique validée ;
- les valeurs candidates et leurs sources ;
- les contradictions et la décision ;
- les médias autorisés avec licence/autorisation et attribution ;
- un hash ou un identifiant de réponse si le fournisseur interdit le stockage du contenu ;
- la date d’observation et une date d’expiration adaptée au champ.

Ne pas conserver indéfiniment les snapshots de pages, reviews, photos, tokens OAuth, données de personnes ou réponses API lorsque les conditions ne l’autorisent pas. Les données Places sont particulièrement contraintes : `place_id` peut être conservé, le reste doit suivre les exceptions et règles de rafraîchissement de Google. Pour Nominatim, le cache est demandé par la politique mais les résultats ne doivent pas devenir un service de revente.

## 7. Désambiguïsation et conflits

### 7.1 Pipeline déterministe

1. normaliser Unicode, casse, ponctuation, translittération et suffixes juridiques ;
2. rechercher avec nom exact + ville, puis variantes contrôlées ;
3. regrouper les résultats par identifiants de fournisseur ;
4. comparer nom, adresse, coordonnées, téléphone, domaine, catégorie et liens réciproques ;
5. calculer un score explicable, mais bloquer si deux candidats restent proches ou si l’adresse est absente ;
6. proposer au restaurateur une sélection avec les preuves et les sources ;
7. ne publier qu’après confirmation ou preuve forte documentée par le propriétaire.

Un score élevé ne doit pas écraser une contradiction forte (deux villes, deux numéros, établissement fermé, chaîne avec plusieurs succursales). Pour une chaîne, l’unité à confirmer est la succursale, pas la marque.

### 7.2 Priorité des sources

La priorité suivante est une règle produit, non une garantie juridique universelle :

1. donnée saisie/confirmée par le propriétaire ;
2. site officiel de la succursale, avec page contact/menu et liens cohérents ;
3. API autorisée du propriétaire (GBP connecté, réseau social connecté) ;
4. Places/OSM pour identifier et contrôler la cohérence, avec leurs règles propres ;
5. annuaires et pages tierces comme signaux faibles seulement.

En cas de conflit : ne pas choisir silencieusement. Afficher les deux valeurs, leur date et leur source ; demander la confirmation du champ concerné ; marquer l’ancienne valeur `stale` ou `rejected`, sans la supprimer de l’historique d’audit.

## 8. Ce qui peut être automatisé maintenant

- recherche initiale nom + ville via Places API et une requête Nominatim ciblée, avec field mask, cache et limites conformes ;
- découverte du domaine officiel et extraction minimale de `Organization`/`LocalBusiness`, adresse, téléphone, `sameAs`, `menu` et horaires lorsqu’ils sont publiquement exposés ;
- lecture de `robots.txt`, CGU, licence et en-têtes, puis refus automatique si les règles ou l’accès ne sont pas compatibles ;
- normalisation et scoring de candidats ; détection de doublons ; contrôle de cohérence des téléphones, URLs, coordonnées, prix et unités ;
- enregistrement de provenance, date, licence présumée, expiration et niveau de confiance ;
- génération d’un brouillon et d’une liste de questions ciblées pour le restaurateur.

## 9. Ce qui doit reprendre la main humaine

- sélectionner le bon établissement quand l’identité n’est pas univoque ;
- confirmer l’adresse, les horaires, le téléphone, le site et les réseaux sociaux officiels ;
- approuver tout menu, allergène, prix, disponibilité ou traduction destinée à publication ;
- fournir ou autoriser les photos, logos, textes et fichiers de menu ;
- décider quoi faire d’une contradiction ou d’une fiche fermée/déménagée ;
- confirmer la base légale et la durée de conservation lorsque des données personnelles apparaissent ;
- approuver toute utilisation qui dépasse l’affichage conforme d’un fournisseur ou qui ressemble à un annuaire, une revente ou une republication de contenu.

## Sources primaires consultées

- [Google Places policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Places API usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Google Business Profile API policies](https://developers.google.com/my-business/content/policies)
- [Google Business Profile API FAQ](https://developers.google.com/my-business/content/faq)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap copyright and ODbL](https://www.openstreetmap.org/copyright)
- [RFC 9309 — Robots Exclusion Protocol](https://datatracker.ietf.org/doc/html/rfc9309)
- [Meta — Instagram API documentation](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [CNIL — recommandations pour les réutilisateurs](https://www.cnil.fr/fr/recommandations-reutilisateurs-donnees-internet)
- [CNIL — moissonnage et intérêt légitime](https://www.cnil.fr/fr/focus-interet-legitime-collecte-par-moissonnage)
- [Code de la propriété intellectuelle, art. L122-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278911)
- [Code de la propriété intellectuelle, art. L342-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006279247)

Les conditions et quotas de services sont susceptibles d’évoluer ; les URLs et les versions de politique doivent être revalidées avant implémentation ou mise en production.
