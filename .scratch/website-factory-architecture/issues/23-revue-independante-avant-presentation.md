# Quels contrôles indépendants doivent bloquer une démo ?

Parent: ../map.md
Type: grilling
Status: resolved

## Question

Stress-tester la promesse « site directement opérationnel, sans erreur ». Déterminer quelles revues spécialisées sont réellement nécessaires avant validation humaine : exactitude des informations, copy/conversion, SEO technique, accessibilité, performance, mobile, liens/CTA, traduction et sécurité.

Le mot « agents indépendants » ne doit pas créer un théâtre multi-agent : chaque revue doit avoir un périmètre, une entrée, une sortie structurée, des preuves et un seuil bloquant. Déterminer aussi quand une règle déterministe ou un test classique suffit et quand une IA apporte une vraie valeur.

## Décision attendue

Définir les gates obligatoires, les warnings acceptables, la séparation des données/faits et des suggestions, ainsi que le propriétaire de la décision finale avant présentation au prospect.

## Question actuelle — après le contrôle final

Si tu refuses une démo après l'avoir vérifiée, quelle action par défaut veux-tu ?

- retour automatique vers les agents avec une consigne de correction ;
- retour vers toi avec correction manuelle dans le cockpit ;
- abandon de la génération et nouvelle génération explicitement déclenchée.

## Decision

Si le propriétaire bloque une démo après sa vérification finale, aucune correction automatique ni relance payante ne démarre.

Le propriétaire ouvre la démo concernée dans le cockpit, consulte ses logs, puis clique sur l'action Codex prévue. Le système exporte dans un dossier local le contexte autorisé et le code de cette démo, crée ou ouvre le projet local dans Codex sur le Mac, sans transmettre implicitement de secrets ni publier quoi que ce soit.

Le propriétaire termine et teste la démo manuellement. Il revient ensuite dans l'onglet de cette démo, utilise une action d'upload contrôlée pour envoyer le fichier ou l'archive PHP validée, puis le système exécute les contrôles d'import, de sécurité et de rendu avant de remplacer la version candidate.

La démo ne peut être envoyée au prospect qu'après une nouvelle validation explicite du propriétaire. L'envoi utilise l'adresse email fournie par le prospect, affiche l'aperçu et le lien de démo, et reste une action traçable pouvant être annulée avant envoi.

Les fichiers importés sont versionnés, liés à la `DemoGeneration` et conservés avec leur hash, leur date, leur auteur et leur résultat de QA. L'import n'accepte pas de PHP exécutable arbitraire dans le cockpit ou dans le renderer sans sandbox et contrôles dédiés.

## Comments
