# RPO/RTO cibles du MVP

Date : 2026-08-20

Ces valeurs sont des objectifs internes de conception, pas des garanties contractuelles avant test des fournisseurs.

| Surface | RPO cible | RTO cible | Stratégie |
|---|---:|---:|---|
| Site production publié | ≤ 1 h | ≤ 2 h | artefact statique versionné, copie objet, bascule vers dernière version valide |
| Control Plane / dossiers | ≤ 1 h | ≤ 4 h | événements structurés, sauvegardes, restauration Neon testée |
| Cost Ledger / audit | ≤ 1 h | ≤ 4 h | écritures append-only et export périodique |
| Démo en construction | ≤ 24 h | régénération contrôlée | la démo n'est pas une donnée durable ; incident et génération restent traçables |
| Cockpit local | cache local non critique | ≤ 1 jour | le cloud reste la source de vérité |

## Règles

- Une version publiée ne doit jamais être écrasée sans version précédente restaurable.
- Une restauration rétablit d'abord une version connue comme valide, puis déclenche une QA.
- Si le RPO/RTO réel d'un fournisseur est inconnu, le système l'affiche comme `UNVERIFIED` et ne le vend pas comme garantie.
- Les tests de restauration doivent être exécutés périodiquement avant la production commerciale.
