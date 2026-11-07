# Workflows et prompts

Un run utilise une version active du workflow et conserve les versions/hashes des prompts, contrats et modèles requis. Modifier un brouillon ne modifie pas un run existant.

## Configurer

Dans le cockpit, ouvrir Configuration et choisir Workflows, Prompts, Formats de sortie ou Profils d’outils. Enregistrer le brouillon, créer une version puis l’activer pour les prochains runs. Un workflow ne peut utiliser qu’une implémentation enregistrée ; une définition seule ne crée pas son moteur.

Une étape définit son identifiant, dépendances, entrées/sorties, implémentation, contrat, timeout et budget. Une étape IA ajoute fournisseur, modèle et prompt ; le modèle appartient au workflow, pas au prompt. L’activation valide les références.

## Audits

- `public-observation-audit` : analyse par observations publiques et recherche web via le fournisseur configuré ; sortie validée par `public-observation-analysis`.
- `local-seo-research` : préparation bornée des requêtes à partir du nom, de la localité, de la catégorie et des éléments observés ; sortie `seo-research-plan`.
- Les limites et modèles sont définis dans les fichiers de `fixtures/defaults/workflows/` pour une installation neuve, puis dans les versions actives sous le répertoire de données.

Les métriques fournisseurs et conclusions IA conservent leur provenance et leurs limites. Une sortie invalide ou indisponible ne doit jamais produire de mesures inventées.

## Stockage

Les brouillons vivent dans `config/` sous le répertoire de données ; les versions restent immuables. `fixtures/defaults/` contient les configurations livrées. Les migrations reconnaissent les anciennes configurations livrées, sans écraser une personnalisation active. Ces migrations sont du code utile tant que des données actives peuvent les nécessiter.
