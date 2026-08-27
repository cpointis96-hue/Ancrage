# Configurer les workflows et les prompts

## Ce qui commande un run

Un run utilise une version active de workflow. Cette version contient l’ordre des étapes, leurs dépendances, leurs entrées, leurs sorties, leurs contrats et, pour une étape IA, le prompt et le modèle choisis.

Au démarrage, le run conserve :

- le hash et la version du workflow ;
- la définition complète des étapes ;
- la version et le hash de chaque prompt utilisé ;
- le modèle choisi pour chaque étape IA ;
- les contrats de sortie.

Modifier un brouillon après le démarrage ne modifie donc jamais un run existant.

## Modifier ou créer un workflow

Dans `Configuration`, ouvrir `Workflows`.

1. Choisir un workflow existant ou utiliser l’icône `+`.
2. Donner un identifiant stable et un nom lisible.
3. Décrire chaque étape dans son ordre d’exécution.
4. Cliquer sur `Enregistrer`. Le brouillon est écrit dans `config/workflows/<id>.json`.
5. Utiliser l’icône de versions pour créer une version immuable.
6. Cliquer sur `Activer`. Seuls les futurs runs utiliseront cette version.

Pour chaque étape :

- `Dépend de` indique les étapes qui doivent être terminées avant elle ;
- `Entrées reçues` indique les sorties d’étapes injectées dans son exécution ;
- `Sorties produites` nomme les résultats attendus ;
- `Implémentation` indique le script ou l’adapter réellement exécuté ;
- `Prompt` et `Modèle` sont obligatoires uniquement pour une étape IA ;
- `Contrat de sortie` indique le JSON Schema qui valide le résultat ;
- `Timeout` et `Budget maximum` bornent l’exécution.

Créer une définition ne crée pas automatiquement son implémentation. Un workflow personnalisé devient exécutable quand chaque nom d’implémentation correspond à un script ou un adapter enregistré dans le moteur.

## Modifier ou créer un prompt

Dans `Configuration`, ouvrir `Prompts`.

1. Choisir un prompt existant ou utiliser l’icône `+`.
2. Renseigner son identifiant, son nom, son étape propriétaire et son contrat de sortie.
3. Modifier les instructions.
4. Cliquer sur `Enregistrer`. Le brouillon est écrit dans `config/prompts/<id>/draft.md`.
5. Utiliser l’icône de versions pour créer une version immuable.
6. Cliquer sur `Activer` pour que les futurs runs puissent l’utiliser.

Le modèle n’appartient pas au prompt. Il est choisi dans l’étape IA du workflow, ce qui permet d’utiliser le même prompt avec un autre modèle sans réécrire ses instructions.

## Formats de sortie

Les contrats vivent dans `config/contracts/*.schema.json`. Un prompt référence son contrat par identifiant, par exemple `copy-draft`. Une étape de workflow peut reprendre ce contrat ou en déclarer un autre. La création d’une version est refusée si le contrat indiqué n’existe pas.

Les versions actives servent aux futurs runs. Les brouillons restent modifiables sans effet immédiat.
