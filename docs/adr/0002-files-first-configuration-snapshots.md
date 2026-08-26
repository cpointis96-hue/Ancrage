# Éditer des fichiers locaux et exécuter des snapshots immuables

Status: accepted

Les prompts, workflows, contrats et politiques ont une représentation canonique lisible sur disque ; leur activation crée un `ConfigurationSnapshot` immuable gelé dans chaque run. Une base seule aurait masqué les changements au propriétaire, tandis que des fichiers mutables utilisés directement auraient rendu les runs non reproductibles.
