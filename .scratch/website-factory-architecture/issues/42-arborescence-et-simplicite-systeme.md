# Comment garder une arborescence claire, légère et modifiable ?

Parent: ../map.md
Type: prototype
Status: claimed

## Question

Prototyper l'arborescence des trois surfaces :

- site public et landing page ;
- cockpit opérateur local ;
- site client généré.

L'organisation doit minimiser le code spécifique, séparer clairement domaine métier, renderer, templates, contenu, configuration, intégrations et infrastructure, et permettre de modifier les offres, textes, règles, audits et paramètres depuis le cockpit sans éditer le code source.

## Principes attendus

- un `SiteSpec` commun et versionné ;
- des templates déterministes et réutilisables ;
- des contenus et offres en données/configuration ;
- des contrats structurés entre Control Plane et Agent Plane ;
- aucune logique métier cachée dans les prompts ;
- une navigation cockpit courte, orientée tâche ;
- des versions activables et restaurables ;
- le moins de dépendances et de code spécifique possible.

## Décision attendue

Définir la carte des dossiers, modules, surfaces et responsabilités avant implémentation, ainsi que les changements qu'un opérateur peut faire sans intervention de développement.

## Comments

## Decision provisoire

L'architecture s'organise autour d'un `SiteSpec` versionné, de templates déterministes, de contenus/offres configurables et d'un cockpit court orienté tâches. L'opérateur peut modifier les offres, textes, règles et paramètres activables sans éditer le code ; chaque version est restaurable. Le prototype d'arborescence reste à réaliser avant `to-spec`.

L'édition client après production est limitée aux horaires, téléphone, adresse, prix, plats, photos, textes courts et offres. Les changements de structure, template, SEO avancé ou nouvelle langue passent par une génération contrôlée.

Prototype : [cockpit-prototype.html](../prototypes/cockpit-prototype.html), variantes `?variant=a`, `?variant=b`, `?variant=c`.
