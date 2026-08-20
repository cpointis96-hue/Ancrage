# Quelle solution gratuite ou quasi gratuite pour le chatbot de landing page ?

Parent: ../map.md
Type: research
Status: open

## Question

Rechercher des solutions réellement utilisables pour un chatbot d'aide public à coût nul ou très faible : widget auto-hébergé, modèle local via worker disponible, fournisseur cloud avec quota gratuit et options sans compte visiteur.

Comparer : coût et limites du quota, confidentialité des conversations, entraînement éventuel sur les données, contrôle du prompt et des documents, protection contre l'abus, disponibilité, accessibilité, intégration mobile-first, export des logs et possibilité de changer de fournisseur.

Le contenu fourni au chatbot doit être une documentation versionnée et validée. Les pages prospect et les données brutes découvertes sur des établissements ne doivent pas être injectées automatiquement dans sa base de connaissance sans décision séparée.

## Décision attendue

Choisir le mode de déploiement du chatbot du MVP et fixer un budget plafond explicite. « Gratuit » devra être défini comme absence de coût attendu dans le trafic cible, avec comportement clair en cas de quota dépassé.

## Comments

## Decision

Le chatbot public reste une aide documentaire gratuite pour le prospect. Le routage vers local ou cloud suit le registre IA central, avec budget et modèle autorisé ; aucune conversation ne devient une source de vérité métier.
