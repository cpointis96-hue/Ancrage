# Référence Screaming Frog SEO Spider — CLI macOS et modèle d'audit

Date de vérification : 2026-08-20
Statut : recherche technique capturée ; usage commercial automatisé non validé contractuellement

## Ce que permet la version gratuite

Selon la documentation officielle, la version gratuite permet de crawler jusqu'à **500 URL par crawl**. Elle reste utilisable sur plusieurs sites et plusieurs crawls, mais elle ne donne pas accès à la configuration complète, à la sauvegarde/réouverture des crawls ni à plusieurs fonctions avancées, notamment le rendu JavaScript, les intégrations Google, le scheduling et certaines extractions.

Au moment de la vérification, la page officielle affichait la version `24.3` et un tarif de référence de `£199/an`, avec des montants localisés affichés séparément selon la devise. Ces prix sont à revalider avant achat.

Conséquence produit : la version gratuite peut servir à un test local ou à un aperçu très borné, mais elle ne doit pas être présentée comme le moteur complet de l'offre avant vérification du périmètre et des conditions de licence.

## Installation macOS

1. Télécharger la version adaptée à l'architecture du Mac depuis le site officiel.
2. Monter le `.dmg` et glisser `Screaming Frog SEO Spider.app` dans `/Applications`.
3. Lancer d'abord l'interface graphique si elle est disponible afin d'accepter l'EULA, saisir la licence et choisir le mode de stockage.
4. Vérifier le launcher :

```bash
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher --help
```

Le dossier de configuration macOS est :

```text
~/.ScreamingFrogSEOSpider/
```

Si l'interface n'est pas disponible, la documentation décrit notamment `licence.txt` dans ce dossier, avec le nom d'utilisateur sur la première ligne et la clé sur la seconde. Cette clé doit rester hors du repository, des logs et des artefacts client.

## Commandes de référence

Lancer l'interface :

```bash
open "/Applications/Screaming Frog SEO Spider.app"
```

Lancer le processus attaché au terminal :

```bash
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher
```

Lancer un crawl simple :

```bash
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher \
  --crawl "https://www.example.com/"
```

Lancer un crawl headless borné avec exports :

```bash
mkdir -p /tmp/seo-audit-run
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher \
  --crawl "https://www.example.com/" \
  --headless \
  --save-crawl \
  --output-folder "/tmp/seo-audit-run" \
  --export-tabs "Internal:All,Response Codes:Client Error (4xx)"
```

Charger un crawl et exporter un onglet :

```bash
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher \
  --headless \
  --load-crawl "/absolute/path/to/crawl.dbseospider" \
  --output-folder "/tmp/seo-audit-export" \
  --export-tabs "Internal:All"
```

Afficher les options spécialisées :

```bash
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher --help export-tabs
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher --help bulk-export
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher --help save-report
/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher --help export-custom-summary
```

## Options utiles pour l'architecture

Les options documentées incluent notamment :

- `--crawl` : URL de départ ;
- `--crawl-list` : liste d'URL ;
- `--headless` : exécution sans interface ;
- `--config` : profil `.seospiderconfig` ;
- `--auth-config` : configuration d'authentification ;
- `--save-crawl` : sauvegarde du crawl lorsque la licence et le mode le permettent ;
- `--load-crawl` : fichier `.seospider`, `.dbseospider` ou identifiant de crawl ;
- `--export-tabs` : exports de tabs et filtres ;
- `--project-name` et `--crawl-name` : rattachement logique des crawls ;
- `--config` : réutilisation d'un profil préparé dans l'interface.

Les limites de volume, profondeur, redirections et exclusions peuvent dépendre du profil de configuration plutôt que d'une option CLI dédiée. La liste exhaustive doit toujours être récupérée depuis `--help` de la version installée, car les options et libellés peuvent évoluer.

## Stockage et profils

La documentation recommande le stockage en base de données pour les crawls importants et l'usage d'un SSD. Les crawls peuvent être exportés en `.dbseospider` ou `.seospider`, mais l'import et la rapidité diffèrent selon le mode de stockage.

Les profils de configuration peuvent être préparés dans l'interface puis fournis au CLI avec `--config`. C'est préférable à une longue liste d'options construite dynamiquement par un agent.

Profil MVP proposé à tester :

1. crawl HTML interne ;
2. robots.txt respecté ;
3. débit modéré ;
4. limite d'URL stricte ;
5. limite de redirections ;
6. exclusion des ressources lourdes non nécessaires ;
7. exports Internal, Response Codes, Page Titles, Meta Description, H1, Canonicals, Directives et Images ;
8. rendu JavaScript désactivé par défaut ;
9. sortie dans un dossier temporaire isolé ;
10. normalisation et validation des exports avant toute analyse IA.

## Limites et décision d'architecture

Le crawler est utile pour collecter des faits, mais il ne doit pas être la source de vérité commerciale. Le pipeline reste :

`CrawlRun → validation des exports → normalisation → règles déterministes → findings → interprétation IA → rapport`

Le système doit conserver le périmètre réel du crawl : version de l'outil, mode, profil, limite d'URL, durée, code de sortie, exports présents, erreurs et coût.

## Licence et risque non résolu

Les pages officielles indiquent une licence par utilisateur et une tarification annuelle. L'EULA consultée autorise l'usage pour l'activité du licencié, son activité interne ou son usage privé/non commercial, mais interdit notamment de vendre, louer, fournir, distribuer ou redistribuer le logiciel ou la licence. Cela ne permet pas de conclure automatiquement qu'un service web qui produit des rapports pour des clients est autorisé.

La FAQ précise également qu'une licence est individuelle par utilisateur ; elle peut être installée sur plusieurs appareils du même utilisateur, mais ne devient pas une licence partagée pour plusieurs opérateurs.

Avant commercialisation : demander une confirmation écrite à Screaming Frog décrivant exactement l'usage envisagé : un utilisateur/opérateur, exécution CLI/headless, worker isolé éventuellement cloud, audits de sites de tiers avec autorisation implicite ou explicite, conservation d'exports et livraison de rapports interprétés.

## Sources officielles

- [SEO Spider General — installation, crawl, stockage et CLI](https://www.screamingfrog.co.uk/seo-spider/user-guide/general/)
- [SEO Spider FAQ — limites gratuites et licence](https://www.screamingfrog.co.uk/seo-spider/faq/)
- [SEO Spider Licence — prix et licences individuelles](https://www.screamingfrog.co.uk/seo-spider/licence/)
- [SEO Spider EULA](https://www.screamingfrog.co.uk/seo-spider/terms-conditions/)
- [SEO Spider Pricing — comparaison gratuite/payante](https://www.screamingfrog.co.uk/seo-spider/pricing/)
