# Handoff — correction du parcours rapport GMB + SEO

## Périmètre unique

Corriger le parcours public autour de l’audit GMB, de l’audit SEO, du rapport final, du téléchargement PDF et du CTA de préparation du site. Ne pas traiter le cockpit, les dossiers ou les autres écrans dans cette conversation.

## Règles validées

1. Dès que l’audit GMB est prêt, il est affiché au prospect, même si l’audit SEO continue.
2. Tant que le SEO n’est pas terminé, l’écran peut montrer la progression, mais il ne doit montrer ni bouton PDF ni bouton Préparer mon site.
3. Quand le rapport final complet GMB + SEO est disponible, afficher le rapport combiné.
4. À ce même moment seulement, afficher le bouton Préparer mon site et un petit bouton rond avec flèche pour télécharger le PDF complet.
5. Le PDF complet GMB + SEO est téléchargeable immédiatement, sans e-mail, compte ni paiement. Le bouton reste accessible pendant le scroll sur ordinateur et mobile, sans masquer le contenu ni le CTA.
6. Le clic sur Préparer mon site ouvre ensuite la demande d’adresse e-mail.
7. Une adresse e-mail valide est obligatoire avant tout lancement réel de génération.
8. Après génération, QA et validation opérateur, la démo est envoyée à cette adresse. Le paiement intervient seulement après la démo, selon le parcours existant.

## Séquence canonique

GMB_REPORT_READY → afficher le rapport GMB → SEO de base déjà lancé en parallèle, puis SEO général en cours et progression → FINAL_REPORT_READY (GMB + SEO) → afficher le rapport complet + bouton PDF + CTA Préparer mon site → clic CTA → demander l’e-mail → valider l’e-mail → lancer la génération → QA → validation opérateur → envoyer la démo.

## Correction explicite de l’ancien schéma

Ne pas créer de branche où le premier rapport GMB génère ou propose un PDF partiel. Le téléchargement doit être déclenché uniquement par l’état FINAL_REPORT_READY et doit contenir les deux rapports intégrés : GMB et SEO.

## Sources de référence

- `.scratch/website-factory-architecture/research/89-parcours-client-complet-arbres-decision.md`
- `.scratch/website-factory-architecture/research/87-parcours-client-reference.md`
- `.scratch/website-factory-architecture/issues/77-progression-rapport-et-agents-paralleles.md`
- `.scratch/website-factory-architecture/issues/78-progression-reelle-cta-mobile.md`
- `.scratch/website-factory-architecture/issues/60-moment-collecte-email-prospect.md`
- `docs/ux/03-site-public-architecture-ux.md`
- `docs/spec/01-vertical-slice-public-ancrage-v1.md`

Ce fichier est le contexte volontairement court pour la prochaine conversation.
