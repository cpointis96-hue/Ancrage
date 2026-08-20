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

## Raison

Le service public et les workflows doivent continuer lorsque le Mac est éteint. Les artefacts complets peuvent être téléchargés localement puis supprimés du cloud après la période utile, mais les métadonnées minimales et le rapport accessible doivent rester disponibles selon la politique de conservation.

## Décisions restantes

- conserver ou non les exports bruts après génération du rapport ;
- durée cloud du rapport et des exports ;
- chiffrement et sauvegarde du miroir Mac ;
- comportement si le Mac est éteint au moment d'une restauration ;
- coût maximal de stockage par audit.
