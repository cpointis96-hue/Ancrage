# L'audit SEO est-il une entrée produit indépendante ou une étape de la démo ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

La nouvelle fonctionnalité commence par le nom et la ville, puis produit progressivement un audit public du site officiel et de la fiche Google Business Profile lorsqu'ils peuvent être identifiés. L'e-mail est demandé seulement lorsque la démo du site est prête à être envoyée. Il faut décider si :

1. l'audit est une entrée indépendante de la landing page, avant ou à côté de la demande de démo ;
2. l'audit est automatiquement inclus dans le parcours de démo restaurant ;
3. l'audit sert de première valeur puis propose la démo comme suite naturelle.

## Recommandation provisoire

Faire de l'audit un parcours distinct mais relié : `Obtenir mon audit SEO` reste très simple, puis le résultat peut proposer une démo personnalisée. Les données d'établissement et l'enrichissement sont réutilisés, sans obliger chaque prospect à demander un site.

## Décision

L'audit SEO du site et l'audit de la fiche Google Business Profile sont regroupés dans le même parcours lorsque la fiche existe. Ils restent deux modules séparés dans les données et le rapport : chaque fait conserve sa source, sa date, sa confiance, ses limites et son autorisation. Si aucun site ou aucune fiche n'est identifié avec suffisamment de confiance, le système ne lance pas l'analyse correspondante et demande seulement l'information manquante.

## Branche sans site

Si aucun site officiel fiable n'est trouvé, le système n'affiche pas une erreur et ne lance aucun crawl. Il propose la démo Website Factory uniquement si le dossier enrichi atteint le seuil de génération déjà décidé. Si des données critiques manquent, le parcours ouvre le `ProgressiveIntake` existant ; les cinq photos obligatoires restent nécessaires avant toute génération de démo. Le prospect ne ressaisit pas les informations déjà obtenues.

## Décision e-mail et relation commerciale

L'adresse e-mail est demandée à la fin, après génération, QA et validation opérateur, comme `Contact` lié au `Prospect`, à la `Demo` et à la livraison de son lien privé. Elle ne devient pas un `Customer` avant achat. Le consentement marketing facultatif, les préférences de communication, les rebonds et les demandes de suppression sont stockés séparément. L'adresse n'est pas nécessaire pour voir la valeur d'audit dans le parcours ni pour lancer la préparation de la démo.

## Impact

Cette décision affecte le CTA de landing page, le consentement e-mail, les offres, les quotas gratuits, le modèle `SEOAudit`, la priorité des workflows et les métriques commerciales.

## Points à verrouiller ensuite

- affichage progressif de l'audit GMB puis rapport final GMB + SEO ;
- e-mail final avec lien direct vers la démo gratuite avant tout paiement ;
- relation entre `SEOAudit`, `DemoRequest` et `Demo` ;
- nombre d'audits par e-mail, domaine et adresse réseau ;
- transformation d'un audit en démo sans ressaisie.
