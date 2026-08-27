# Quelle solution gratuite ou quasi gratuite pour le chatbot de landing page ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Rechercher des solutions réellement utilisables pour un chatbot d'aide public à coût nul ou très faible : widget auto-hébergé, modèle local via worker disponible, fournisseur cloud avec quota gratuit et options sans compte visiteur.

Comparer : coût et limites du quota, confidentialité des conversations, entraînement éventuel sur les données, contrôle du prompt et des documents, protection contre l'abus, disponibilité, accessibilité, intégration mobile-first, export des logs et possibilité de changer de fournisseur.

Le contenu fourni au chatbot doit être une documentation versionnée et validée. Les pages prospect et les données brutes découvertes sur des établissements ne doivent pas être injectées automatiquement dans sa base de connaissance sans décision séparée.

## Décision attendue

Choisir le mode de déploiement du chatbot du MVP et fixer un budget plafond explicite. « Gratuit » devra être défini comme absence de coût attendu dans le trafic cible, avec comportement clair en cas de quota dépassé.

## Comments

## Decision

Le chatbot public reste une aide documentaire gratuite pour le prospect. Le routage vers local ou cloud suit le registre IA central, avec budget et modèle autorisé ; aucune conversation ne devient une source de vérité métier.

## Answer

Le MVP commence sans coût d'inférence obligatoire : aide documentaire versionnée, réponses limitées à la documentation validée et aucune action métier. Le budget par défaut est nul (`0` coût cloud autorisé) ; un provider cloud ne peut être activé que par une enveloppe explicite, une politique de données, un modèle approuvé et un `CostEvent`. Si le mode autorisé n'est pas disponible, l'interface reste une aide documentaire ou indique son indisponibilité, sans fallback premium silencieux.

Les conversations ne servent ni de source de vérité ni de base d'entraînement implicite. Les logs sont minimisés, expurgés des secrets et soumis à la politique de rétention. Turnstile/rate limiting restent des contrôles d'anti-abus à activer seulement après mesure.

Décision d'architecture résolue le 27 août 2026 ; les quotas et coûts d'un éventuel provider actif restent des gates séparés.
