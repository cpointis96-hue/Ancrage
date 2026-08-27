# Validation des prototypes Wayfinder — 27 août 2026

## Portée

Cette validation porte sur les prototypes jetables existants. Elle ne modifie pas la fondation Ancrage, n'active aucun provider et ne constitue pas une preuve backend, navigateur de production ou capacité commercialisable.

## Résultats statiques

Les scripts inline ont été extraits et analysés avec `vm.Script` sans erreur pour :

- `.scratch/website-factory-architecture/prototypes/public-ancrage-v1-prototype.html` — 3 variantes (`A`, `B`, `C`) et 6 états (`landing`, `match`, `report`, `email`, `building`, `demo`) ;
- `.scratch/website-factory-architecture/prototypes/cockpit-prototype.html` — 3 variantes de cockpit ;
- `.scratch/website-factory-architecture/prototypes/templates-prototype.html` — 3 familles de templates ;
- `prototypes/ux-vertical-slice/parcours-client-e0-e7.html` — écrans `E0` à `E7`, validation d'e-mail, rapport/PDF et CTA ;
- `prototypes/ux-vertical-slice/cockpit-operator-v2.html` — cockpit opérateur, états de contrôle et vue mobile déclarée dans son parcours.

Le prototype public E0–E7 contient bien les branches documentées : valeur GMB précoce, rapport partiel, rapport final, PDF avant e-mail, e-mail invalide sans génération, validation opérateur et démo privée. Le cockpit expose des états `PASS`, `WARN`, `BLOCK` et des actions de reprise/validation dans les fixtures.

## Vérification navigateur

La README du prototype conserve la preuve historique d'un parcours Chromium desktop et d'une viewport mobile de 390 px. Une nouvelle ouverture du fichier local dans le navigateur intégré le 27 août 2026 a été refusée par la politique de sécurité `file://`; aucune alternative ni contournement n'a été utilisé. Le statut courant est donc : statique `MESURÉ`, navigateur frais `NON OBSERVABLE` dans cette session.

## Décision

Les prototypes répondent aux questions Wayfinder d'enchaînement, partialité, CTA, validation humaine, rapport et densité mobile. Ils restent des références de spécification et doivent être remplacés par des tests d'intégration autorisés avant toute promesse produit. Le vertical slice d'audit SEO réel reste ouvert dans [issue 73](../../.scratch/website-factory-architecture/issues/73-vertical-slice-audit-seo.md).
