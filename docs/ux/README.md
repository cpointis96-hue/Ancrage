# UX Website Factory

## Objet

Cette documentation décrit l'architecture UX à remettre à un agent de prototype puis à un agent de spécification. Elle couvre uniquement :

1. le cockpit privé de l'opérateur ;
2. le site public d'audit et de démonstration.

La génération des sites clients et les templates commerciaux restent hors périmètre de cette phase.

## Ordre de lecture

1. [`00-brief-ux-et-perimetre.md`](00-brief-ux-et-perimetre.md)
2. [`01-carte-surfaces-et-navigation.md`](01-carte-surfaces-et-navigation.md)
3. [`02-cockpit-architecture-ux.md`](02-cockpit-architecture-ux.md)
4. [`03-site-public-architecture-ux.md`](03-site-public-architecture-ux.md)
5. [`04-etats-et-regles-de-simplification.md`](04-etats-et-regles-de-simplification.md)
6. [`05-direction-visuelle-et-systeme.md`](05-direction-visuelle-et-systeme.md)
7. [`DESIGN.md`](DESIGN.md)
8. [`06-handoff-et-criteres.md`](06-handoff-et-criteres.md)
9. [`08-reference-visuelle-sstr-friction-reduction.md`](08-reference-visuelle-sstr-friction-reduction.md)

## Méthode d'exécution

Les fichiers sont la source UX stable. Le prochain agent doit produire un prototype jetable et répondre à une question observable avant toute implémentation de production.

```text
architecture UX → wireframes → prototype comportemental → revue macOS/mobile → design visuel → to-spec
```

Le prototype ne doit pas ajouter de navigation, de bouton ou de données qui ne sont pas justifiés ici.

## Références obligatoires

- `.scratch/website-factory-architecture/map.md`
- `.scratch/website-factory-architecture/research/87-parcours-client-reference.md`
- `.scratch/website-factory-architecture/research/85-pipeline-audit-vers-site-website-factory.md`
- `.scratch/website-factory-architecture/research/86-stack-seo-skills-et-cockpit.md`
- `.scratch/website-factory-architecture/issues/42-arborescence-et-simplicite-systeme.md`
- `.scratch/website-factory-architecture/issues/43-architecture-ux-avant-implementation.md`

## Skills à appliquer ensuite

- `domain-modeling` pour conserver le vocabulaire de `CONTEXT.md` ;
- `prototype` pour tester un comportement ou une densité ;
- `swiftui-design-skill` comme référence de sobriété et de hiérarchie macOS, sans créer une app SwiftUI ;
- `impeccable` en mode `shape`, puis `critique` et `distill` ;
- `antislop`, `antislop-ui` et `antislop-human` pour supprimer les contrôles décoratifs et vérifier les états, le clavier, le contraste et le mobile ;
- `taste-design` lors de la phase visuelle, pour formaliser les tokens et règles dans un `DESIGN.md` compatible avec un générateur de screens ; ses defaults de motion permanente, de créativité et d'asymétrie sont subordonnés à cette documentation UX ;
- `to-spec` uniquement après validation du prototype.
