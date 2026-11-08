# Ancrage
- Répondre en français. Utiliser `rtk`. Changer le minimum et vérifier le comportement.
- Lire uniquement les consignes du périmètre : `src/<module>/AGENTS.md`, `app/AGENTS.md`, `fixtures/defaults/AGENTS.md`, `test/AGENTS.md`, `scripts/AGENTS.md`, `docs/AGENTS.md`. Assemblage/démarrage : `src/AGENTS.md`.
- Audit cible : entièrement hébergé, aucune dépendance au Mac ni au cockpit ouvert.
- Travaux actifs : `.scratch/hosted-audit/{spec.md,issues/}` ; conventions : `docs/agents/issue-tracker.md`. Pas d’implémentation de production sans demande explicite.
- Domaine à consulter au besoin : `CONTEXT.md` ; architecture : `docs/architecture.md`.
- UI/copie : lire `.agents/skills/scope-locked-ui/SKILL.md` ; respecter strictement le périmètre demandé.
- Préférer le déterminisme ; vérifier les faits externes dans les sources primaires.
- Garder secrets et données runtime hors Git. Ne pas créer d’archives ou de copies obsolètes ; préserver les configurations et données actives. Confirmer toute destruction hors périmètre autorisé.
