# Ancrage — bilan depuis le 11 octobre 2026

Dernière mise à jour le 24 novembre 2026. Le [commit du 11 octobre](https://github.com/cpointis96-hue/Ancrage/commit/772c38d7319b382ca28ee4b271def462970d2075) présentait le cockpit, le parcours client et une simulation illustrée avec Maison Sauge. Le [comparatif GitHub](https://github.com/cpointis96-hue/Ancrage/compare/772c38d7319b382ca28ee4b271def462970d2075...main) montre les changements intégrés depuis cette version, y compris le travail préparé sur d’autres branches avant sa publication.

| Domaine | Évolutions intégrées |
| --- | --- |
| Hébergement | Parcours public et cockpit sur Vercel. Stockage durable sur Neon, reprise des audits par le worker hébergé, accès opérateur authentifié et isolation des demandes publiques. |
| Identification | Recherche d’établissement et de ville par Google Places, détails de la fiche sélectionnée et saisie manuelle en cas d’absence de correspondance. Le domaine est vérifié avant collecte. |
| Audit | Collecte des pages et des sitemaps, contrôle SEO par page, analyse de la fiche Google quand les données sont disponibles et recherche de visibilité locale. DataForSEO reste optionnel pour le parcours par observations publiques. Les constats et citations sont qualifiés et les résultats incomplets gardent leurs limites. |
| Rapport et cockpit | Instantané d’audit versionné et contrôlé, rapports HTML/PDF issus du même document, section SEO par page et téléchargements dans le cockpit. Les preuves concurrentielles restent internes. |
| Parcours gratuit | Un constat étayé, une amélioration et son bénéfice, avec la capture correspondante si disponible. L’e-mail est demandé ensuite pour préparer la démo. Les rapports complets sont accessibles depuis le cockpit. |
| Démo | Collecte des informations métier et des photos, adaptation des contenus au métier, contrôles avant génération et validation opérateur avant remise par lien privé. |
| Exploitation | Prompts, workflows et contrats versionnés. Collecte et coûts bornés, démarrages et reprises protégés contre les doublons. |

Le workflow par observations embarque `gpt-6.1-terra` par défaut et utilise le fournisseur configuré côté serveur. L’usage d’un abonnement IA avait été envisagé le 7 novembre et reste à valider séparément.

Le parcours de démo utilise toujours le pipeline de simulation du projet pour générer le site. L’envoi automatique par e-mail, la publication commerciale, le paiement et l’achat du domaine restent à construire. La rentabilité du parcours gratuit reste à mesurer. Les tests automatisés utilisent des données de test.

Voir les [règles du parcours](parcours.md), l’[architecture](architecture.md) et la [référence de vérification](../VERIFICATION.md).
