# Quel seuil exact rend le dossier d'un restaurant complet ?

Parent: ../map.md
Type: grilling
Status: resolved
Blocked by: 05-donnees-insuffisantes-ou-contradictoires.md

## Question

Combien faut-il au minimum de données avant de démarrer la génération dans la fenêtre d'une heure ?

À préciser : identité, adresse/localisation, contact, horaires, nombre de plats et prix, nombre de photos, langue source, liens externes, type de cuisine et services. Distinguer les champs bloquants, les champs recommandés et les champs facultatifs.

Recommandation : une checklist courte et compréhensible, avec un dossier bloqué si l'identité, la localisation, le contact, l'offre/prix ou les photos essentielles manquent ; les détails supplémentaires enrichissent le site sans bloquer la demande.

## Answer

La page d'accueil ne demande que deux informations :

- nom de l'établissement ;
- ville.

Cette `MinimalRequest` déclenche une phase d'enrichissement automatique : recherche du site existant, fiches publiques, menus, coordonnées, horaires, photos et autres sources autorisées. Les informations découvertes sont conservées avec leur provenance et leur niveau de confiance.

Après l'enrichissement, le système calcule les `RequiredInput` réellement manquants ou contradictoires. Il ouvre alors un formulaire progressif qui ne demande que ces éléments, au lieu d'imposer un long questionnaire dès la page d'accueil.

Le seuil de complétude concerne donc le dossier **après enrichissement**, pas la première saisie. Pour être présentable, le dossier devra finalement disposer de l'identité, de la localisation, d'un contact exploitable, d'une offre/menu avec prix vérifiables et de photos utilisables — obtenus par scraping autorisé, saisie du restaurateur ou validation opérateur.

## Comments

- Décision du propriétaire : homepage avec uniquement nom + ville ; enrichissement automatique ; formulaire complémentaire seulement pour les informations critiques manquantes.
## Comments
