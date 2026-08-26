# Conserver les secrets hors du navigateur et des données métier

Status: accepted

Les credentials locaux sont stockés dans le trousseau macOS et les déploiements distants utilisent un secret manager ; le cockpit ne reçoit que leur état de configuration. Ce choix empêche qu'une clé soit copiée dans un prompt, un fichier versionné, une base métier, un log ou un bundle client, au prix d'un bridge serveur obligatoire pour enregistrer et tester une connexion.
