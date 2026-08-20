# Où conserver les audits et rapports pour limiter les coûts ?

Parent: ../map.md
Type: grilling
Status: open

## Recommandation provisoire

Utiliser un stockage en trois niveaux :

## Direction validée

Cette séparation est retenue comme direction d'architecture pour limiter les coûts sans rendre le service dépendant du Mac. Les durées, le lifecycle R2, le chiffrement du miroir local et le coût maximal par audit restent des paramètres à spécifier.

## Décision archives locales

Les crawls et exports complets sont conservés localement sur le Mac opérateur sans suppression automatique. Une demande de suppression, une obligation légale, une compromission ou une action manuelle autorisée peut toutefois déclencher une purge. Le stockage local doit être chiffré, surveiller l'espace disponible et être sauvegardé selon une stratégie séparée.

1. **Neon** : métadonnées minimales, états, références, provenance, coûts, droits, résumé et index de recherche ; pas les CSV/HTML bruts.
2. **Cloudflare R2** : rapport web publié, PDF éventuel, exports compressés et artefacts nécessaires au support, avec durée de vie et suppression configurables.
3. **Mac opérateur** : copie locale chiffrée des exports lourds, crawls `.dbseospider`/`.seospider`, snapshots et sauvegardes de travail ; jamais la seule source de vérité.

Les données d'intake du prospect constituent un flux distinct des exports bruts d'audit. Elles peuvent rester temporairement dans `Cloudflare R2` lorsque le Mac est éteint, puis être téléchargées vers le Mac, vérifiées et supprimées explicitement de R2 après accusé de réception. Le lifecycle R2 ne sert que de filet de sécurité pour les objets orphelins.

## Raison

Le service public et les workflows doivent continuer lorsque le Mac est éteint. Les artefacts complets peuvent être téléchargés localement puis supprimés du cloud après la période utile, mais les métadonnées minimales et le rapport accessible doivent rester disponibles selon la politique de conservation.

## Décisions restantes

- conserver ou non les exports bruts après génération du rapport ;
- durée cloud du rapport et des exports ;
- chiffrement et sauvegarde du miroir Mac ;
- comportement si le Mac est éteint au moment d'une restauration ;
- coût maximal de stockage par audit.

## Synchronisation de l'intake

Pour un dossier courant de 10 à 20 Mo, `Neon` conserve l'état et les métadonnées ; `R2` conserve temporairement les fichiers. Le cockpit affiche les dossiers en attente, synchronisés, confirmés et purgés. La purge cloud intervient après hash vérifié et écriture locale confirmée ; elle ne concerne pas les rapports ou exports d'audit qui suivent leur propre politique de conservation.

## Décision confirmée — archive locale

Les exports bruts et archives lourdes restent dans l'archive locale chiffrée sans suppression automatique. Une purge manuelle peut être déclenchée en cas de demande, obligation légale, compromission ou manque d'espace, avec journal et confirmation. La sauvegarde et la restauration de cette archive restent à spécifier techniquement.

Décision HITL : choix 1, confirmé le 20 août 2026.

## Décision confirmée — sauvegarde de l'archive

L'archive locale chiffrée ne reçoit pas de sauvegarde supplémentaire dans le MVP. Après synchronisation vérifiée et purge R2, le contenu privé peut donc n'exister que sur le Mac opérateur. Cette décision constitue un risque accepté : une panne, perte ou compromission du Mac peut rendre ces fichiers irrécupérables ; les métadonnées, hashes, statuts et événements restent conservés dans le Control Plane selon leur propre politique.

Décision HITL : choix 2, confirmé le 20 août 2026.
