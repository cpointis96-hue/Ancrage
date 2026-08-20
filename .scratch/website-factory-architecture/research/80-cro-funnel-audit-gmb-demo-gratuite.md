# Recherche CRO — audit visible puis démo gratuite

Date : 2026-08-20
Statut : note de recherche pour Wayfinder

## Question

Le parcours « audit GMB visible → audit SEO complet → démo gratuite par lien e-mail → proposition de mise en production » limite-t-il suffisamment la friction et crée-t-il une bonne progression de valeur ?

## Constats de sources

- Les formulaires mobiles doivent réduire le nombre de champs visibles et éviter les questions qui ne servent pas directement le service. Baymard rapporte que la complexité perçue et le nombre de champs pèsent davantage que le simple nombre d'étapes dans ses tests de checkout : https://baymard.com/blog/checkout-flow-average-form-fields
- Les champs facultatifs doivent être clairement identifiés et, lorsque possible, masqués ou différés ; des champs inutiles augmentent l'hésitation et les abandons : https://baymard.com/blog/required-optional-form-fields
- Le GOV.UK Service Manual recommande de ne demander que les informations nécessaires, d'expliquer leur usage et de séparer les consentements : https://www.gov.uk/service-manual/design/collecting-personal-information-from-users
- Le même guide recommande une question ou une décision à la fois, ce qui soutient un parcours progressif et lisible sur mobile : https://www.gov.uk/service-manual/design/form-structure
- Les e-mails transactionnels doivent répondre à un besoin utilisateur, rester courts et contenir une action claire : https://www.gov.uk/service-manual/design/sending-emails-and-text-messages

## Évaluation du funnel proposé

Le funnel est cohérent pour une offre de preuve avant achat :

1. nom + ville donnent un démarrage très léger ;
2. l'enrichissement évite de faire ressaisir les informations déjà trouvées ;
3. l'audit GMB visible rapidement fournit une première preuve de valeur ;
4. la progression vers le grand audit SEO rend l'attente compréhensible ;
5. le rapport final réunit les deux audits et donne une raison claire de demander la préparation du site ;
6. l'e-mail demandé au clic de préparation, après la valeur d'audit et juste avant le coût de génération, évite de créer des démos orphelines tout en retardant la friction jusqu'à une intention explicite ;
7. le lien direct vers la démo évite un e-mail intermédiaire sans valeur ;
8. le paiement intervient seulement après consultation de la démo, ce qui respecte la promesse « avant paiement ».

## Limites et tests obligatoires

Cette architecture est une bonne hypothèse CRO, pas une preuve de conversion. Le vertical slice doit mesurer séparément : abandon après nom/ville, abandon pendant l'intake/photos, audit GMB affiché, rapport SEO final consulté, clic sur « Préparer mon site », démo générée, e-mail demandé, e-mail ouvert, démo consultée, clic de mise en production et paiement.

Le CTA final doit parler de préparation et de découverte du site. Il ne doit pas laisser croire que la mise en production est gratuite ou déjà effectuée : l'achat et la publication restent une étape ultérieure, après consultation de la démo.
