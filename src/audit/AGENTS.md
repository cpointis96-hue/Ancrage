# audit
Périmètre : ce dossier et ses enfants immédiats. Collecte, qualification SEO, observations, AuditPacket, rapports HTML/PDF.
Entrée : entreprise, ville, URL confirmée, profil, budget, adaptateurs injectés. Sortie : run, preuves datées, packet hashé/versionné, rapports ; SUCCEEDED/PARTIAL/BLOCKED.
Exécuter le moteur côté serveur ; aucune dépendance au Mac opérateur. Garder bornes crawl, protection SSRF, provenance, idempotence et réservations de coûts. Distinguer faits, interprétations et indisponibilité ; jamais inventer des mesures. Faire dériver HTML/PDF du même document.
Vérifier : `rtk proxy node --test test/audit/*.test.mjs` si présent ; sinon sélectionner les tests consommateurs.
