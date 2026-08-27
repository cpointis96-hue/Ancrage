# Audit 001 de l'existant Website Factory

Date : 27 août 2026
Référence Git : `main` sur `971cdf4` (`feat: secure provider adapters and domain lookup`)
Mode : lecture seule, aucun réglage ni code modifié pendant l'audit

## Conclusion

La fondation locale Ancrage est présente et doit être conservée. Elle couvre un cockpit local, un bridge loopback, le stockage atomique, les prompts et workflows versionnés, les secrets hors navigateur, le registre de providers, les runs avec artefacts et la simulation de reprise.

Elle ne constitue pas encore le produit public d'audit. Le dépôt ne contient pas de parcours public `Prospect`/`EstablishmentMatch`, d'observation GMB, de crawl SEO borné, de sélection de concurrents, de provenance d'audit, de `CostEvent` ni de gates d'audit. Le prochain travail justifié est donc documentaire et expérimental, pas une extension immédiate du code Ancrage.

## Preuves locales

| Élément | Preuve | Statut |
| --- | --- | --- |
| Référence de reprise | `git status --short --branch`, `HEAD -> main`, `971cdf4` | MESURÉ |
| Fondation locale | `src/app.mjs`, `src/core/atomic-store.mjs`, `src/config/`, `src/providers/`, `src/workflows/`, `src/http/`, `app/` | MESURÉ |
| Secrets | Keychain macOS prévu, store mémoire de test, aucune valeur renvoyée dans les réponses testées | MESURÉ pour le contrat, NON OBSERVABLE pour le Keychain réel |
| Providers | huit définitions, health check borné, activation conditionnelle, adapters HTTP et recherche de domaines | MESURÉ par tests simulés |
| Recherche Internet | workflow `domain-research`, quatre adapters registrar, fallback local `availability: unknown` | MESURÉ par tests simulés, non validé contre les comptes réels |
| Runs | DAG, hashes, snapshots de configuration, reprises et artefacts persistants | MESURÉ |
| Tests | `npm test` hors sandbox : 35 tests, 35 passés ; `npm run check` : succès | MESURÉ |

## Limites de la preuve

- Les tests providers utilisent un `fetch` simulé. Ils ne prouvent ni quotas, ni prix, ni permissions, ni conditions contractuelles réelles.
- Le test local dans la sandbox a produit `listen EPERM` sur `127.0.0.1`. La même suite relancée avec accès loopback autorisé est passée intégralement. Le premier résultat est classé limitation d'environnement, pas régression produit.
- La spec publique `docs/spec/01-vertical-slice-public-ancrage-v1.md` est une spec de travail, mais elle laisse ouvertes les seuils, le dépassement budget/timeout, les fournisseurs, SSRF, rétention, RPO/RTO, prototypes et vertical slice réel.
- `app/intake.html` reste un intake local de dossier avec une photo et une ville texte. Il ne réalise pas le parcours public spécifié avec ville structurée, rapprochement prudent, cinq catégories photo, audit progressif et e-mail au CTA.
- La route publique exposée par `src/http/router.mjs` concerne l'intake local, les dossiers, les runs, la simulation, les providers, les workflows et `internet/search`. Les routes publiques `/audit/:prospectId`, `/report`, `/prepare` et `/demo/:demoToken` ne sont pas implémentées.
- Le fallback local de domaine est explicitement inconnu. Il ne doit jamais devenir une autorisation de crawl ni une preuve d'association établissement/domaine.

## Réglages et surfaces à préserver

- Le registre de prompts, workflows et contrats versionnés.
- Le stockage atomique et les snapshots immuables de run.
- Le bridge local loopback et son contrôle d'origine.
- Le passage des secrets par `SecretStore`/Keychain, sans secret dans le navigateur, les logs, les prompts ou `.ancrage`.
- Les providers, leurs états `configured`, `health`, `enabled`, leurs adapters et la recherche Internet opérateur.
- Les surfaces cockpit, onglets, états de runs, artefacts, configuration, providers et Internet déjà raccordées.
- Les workflows existants et leurs versions. Aucune migration ou réécriture de réglage n'est justifiée par cet audit.

## Décisions bloquantes restantes

### Bloqueurs de spécification

1. **Contrat d'identité et de domaine** : sources autorisées, seuils explicables pour `AUTO_CONTINUE` et `ASK_CONFIRMATION`, branche sans GMB, et règle empêchant tout crawl avant domaine confirmé.
2. **Contrat GMB puis SEO/concurrence** : ordre, dépendances, états partiels, borne de cinq concurrents directs issus de trois intentions locales et séparation faits/calculs/interprétations/suggestions.
3. **Provenance** : snapshot de source, date, URL canonique, paramètres non secrets, hash du brut, licence/conditions, expiration et lien de chaque affirmation vers une preuve.
4. **Sécurité du crawl** : validation URL, résolution DNS et revalidation à chaque redirection, blocage réseaux privés/réservés, ports, credentials URL, rebinding, téléchargements, compression, isolation et nettoyage.
5. **Budgets et dépassements** : enveloppe préautorisée, unités locales/cloud, `CostEvent`, alertes 50/80/100 %, chemin essentiel, traitement des options et blocage dur sans fallback premium silencieux.
6. **Gates et livraison** : contrats de sortie, idempotence, partialité, revue indépendante, `AcceptanceReport`, validation opérateur et interdiction de présenter une sortie avec provenance critique manquante ou `BLOCK`.
7. **Preuves avant commercialisation** : sites de test autorisés, mesures coût/durée/exactitude, suppression et restauration, plus position écrite sur la licence Screaming Frog.

### Non-bloqueurs

Le polish visuel final, les fournisseurs secondaires, les langues après le périmètre décidé, les analytics avancées et les intégrations de commande/réservation peuvent rester hors de cette passe.

## Travail explicitement justifié ensuite

1. Valider et compléter `docs/spec/02-audit-gmb-seo-borné.md` avec les décisions manquantes, une par une si une préférence produit est requise.
2. Exécuter uniquement les recherches fournisseurs et juridiques prévues par les tickets ouverts.
3. Produire un prototype throwaway du rapport et du parcours public avant toute UI de production.
4. Construire un vertical slice de test séparé, avec sites autorisés et fixtures contrôlées, seulement après acceptation de la spec et des gates.

Tout travail de production non décrit par une spec validée reste hors périmètre.
