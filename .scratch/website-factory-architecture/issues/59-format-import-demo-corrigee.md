# Quel format doit accepter l'import manuel d'une démo corrigée ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Après une correction locale dans Codex, quel est le format minimal que le cockpit doit accepter pour remplacer la version candidate d'une démo ?

## Options

- **Archive de build validée** : un `.zip` contenant uniquement les fichiers statiques/rendus nécessaires et un manifeste ; plus sûr et reproductible.
- **Dossier de projet PHP** : plus simple pour toi, mais nécessite une liste blanche stricte et un build contrôlé côté serveur.
- **URL externe** : déconseillée ; elle crée une dépendance, un risque SSRF et une source de vérité hors du cockpit.

## Recommandation

Accepter uniquement une archive de build contrôlée, avec manifeste, hash, taille maximale, fichiers autorisés, scan, rendu en sandbox et nouvelle QA avant remplacement. Le dashboard peut proposer un bouton « Importer la démo corrigée » sans exposer la complexité technique.

Le PHP source complet ne doit pas être exécuté directement dans le service public. L'URL externe ne doit pas être acceptée dans le MVP.

## Décision attendue

Choisir entre l'archive de build contrôlée et le dossier PHP simplifié, en sachant que le second exige davantage de garde-fous.

## Decision

Le MVP accepte uniquement une archive de build contrôlée via le bouton « Importer la démo corrigée ». Le dossier PHP brut et l'URL externe ne sont pas acceptés.

L'archive est versionnée, contrôlée, scannée, rendue en sandbox puis soumise à la QA avant de devenir la version candidate. Elle ne remplace jamais directement la version déjà validée.
