# Quelle base centrale pour payer presque rien avec peu de données ?

Parent: ../map.md
Type: research
Status: resolved

## Question

Comparer une base SQL serverless mutualisée et quasi gratuite pour les données de contrôle : restaurants, demandes, versions, offres, coûts, audits, jobs et provenance.

Comparer notamment : D1/SQLite serverless, Neon/PostgreSQL scale-to-zero, Supabase free tier et une base locale répliquée vers le cloud. Vérifier : coût sans trafic, quotas, pause/scale-to-zero, sauvegardes, restauration, transactions, migrations, indexation, multi-tenant, sécurité, export et évolution future.

Les photos, screenshots, logs volumineux et artefacts ne doivent pas être stockés dans la base : ils doivent aller dans object storage avec métadonnées et références en base.

## Recommandation provisoire

Une seule petite base centrale mutualisée est préférable à une base par restaurant. Les données structurées restent compactes ; les médias et artefacts sont externalisés. Le MVP doit commencer sur un quota gratuit avec alertes et plafond de dépense, puis migrer sans changer le modèle métier si la charge augmente.

## Comments

## Decision provisoire

La base centrale doit être mutualisée, minimale et sans abonnement fixe obligatoire. Neon PostgreSQL devient le candidat privilégié pour conserver un vrai modèle relationnel, avec compute/serverless et facturation à l'usage lorsque le niveau gratuit ne suffit plus. Les médias, screenshots et gros artefacts restent dans du stockage objet.

Le système doit configurer des plafonds, alertes et budgets internes. La limite de dépense Neon doit être vérifiée car la documentation API indique que le spending limit déclenche des notifications mais ne suspend pas nécessairement les compute.

## Clarification de périmètre

Pour l'intake public lorsque le Mac est éteint, aucune base ou plateforme cloud supplémentaire n'est souhaitée par défaut : `Cloudflare` reste la couche d'entrée, de stockage objet et d'asynchrone ; `Neon` reste la couche relationnelle minimale candidate. Les petits volumes seront mesurés, mais les quotas, coûts et limites actuels devront être vérifiés avant activation.

## Answer

La recherche officielle du 27 août 2026 confirme ce choix au niveau architecture : Neon PostgreSQL est la base relationnelle mutualisée candidate, avec scale-to-zero et historique/restauration selon le plan ; R2 conserve les binaires ; Cloudflare porte l'entrée et l'asynchrone. Les limites Free/Paid, le cold start, l'historique et les spending limits sont documentés dans [`95-cloudflare-neon-prix-limites-restauration.md`](../research/95-cloudflare-neon-prix-limites-restauration.md).

Le spending limit Neon est une alerte et non un arrêt automatique ; le plafond bloquant doit rester dans Website Factory. La région, le compte, les permissions, la restauration réelle, le coût effectif et le comportement de purge ne sont pas mesurés et restent des gates avant activation.
