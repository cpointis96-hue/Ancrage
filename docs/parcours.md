# Parcours et règles produit

## Audit

1. Recueillir le nom et la ville ; confirmer l’identité sélectionnée ou demander l’adresse si aucune correspondance fiable n’existe.
2. Collecter uniquement les sources autorisées et corroborer le domaine avant crawl.
3. Livrer le rapport de présence locale disponible, puis le rapport final avec HTML/PDF et limites.
4. Proposer la préparation du site après le rapport final ; demander alors l’e-mail et les informations métier nécessaires.

La sélection Google Places ne prouve ni la propriété d’une fiche ni sa corroboration par un fournisseur d’audit. Aucun domaine, établissement, concurrent, chiffre ou défaut SEO n’est inventé. Une branche indisponible porte sa cause ; l’autre peut continuer si les preuves l’autorisent.

| Données disponibles | Comportement |
|---|---|
| Identité et site confirmés | Analyser présence locale et site dans le périmètre autorisé. |
| Présence locale sans site confirmé | Restituer les observations disponibles ; aucun défaut SEO supposé. |
| Site confirmé sans fiche corroborée | Analyser le site ; expliciter la limite de présence locale. |
| Aucune identité fiable | Demander l’adresse ; ne pas choisir silencieusement une entreprise. |

Les budgets et limites du programme font foi : profil dans `src/audit/audit-profile.mjs`, modèles et enveloppes IA dans `fixtures/defaults/workflows/`. Ces valeurs sont des paramètres techniques, pas des tarifs commerciaux ni une garantie de dépenses. Les résultats distinguent mesures, interprétations et suggestions ; une recommandation de remplacement de site exige des éléments qui la justifient.

## Démonstration de site

La cible initiale est l’entreprise locale, avec les restaurants indépendants comme premier segment. L’objectif est de montrer une démo personnalisée avant achat ; aucun classement SEO n’est garanti.

Après le rapport final, un e-mail valide crée ou reprend une préparation même incomplète. Le lancement de génération exige : identité et coordonnées, histoire/offre, menu et prix si concernés, horaires, langue choisie, confirmation et droits sur les photos. Les catégories attendues sont façade, deux plats signature, intérieur/terrasse et équipe/service.

Le pipeline respecte : dossier confirmé → plan de contenu → construction → contrôles qualité → validation opérateur → présentation. Le site de démonstration présente identité, offre/menu, horaires, adresse, photos et contact dans une langue choisie. Une traduction doit être validée avant publication. Les intégrations complexes et le multilingue visiteur ne font pas partie de la première promesse.

Les états PASS/WARN/BLOCK et l’AcceptanceReport bornent la présentation. Un résultat bloquant empêche la livraison. L’opérateur valide avant présentation ; une simulation réussie ne prouve pas une production réelle. Les liens de rapport et de démo expirent selon leur politique (sept jours dans le runtime courant).

## Production commerciale à valider

La génération synthétique est implémentée ; elle ne constitue pas un service de génération commerciale autonome. Paiement, compte client, achat de domaine, publication durable, offre et tarifs sont à spécifier et à valider avant activation.

### Publication du site chez le client

La cible produit est un achat direct par le client auprès de Cloudflare, sans paiement, commission ni avance de fonds par Ancrage. Le client reste propriétaire du compte et titulaire du domaine. Aucun jeton Cloudflare global appartenant à Ancrage ne doit acheter ou publier sur le compte de l’entreprise.

Après génération et validation d’un vrai site de production, le client choisit son domaine dans Ancrage et connecte son compte Cloudflare par OAuth. S’il s’agit de son premier achat, Cloudflare lui demande de vérifier son compte, d’ajouter son moyen de paiement, de renseigner le titulaire et d’accepter l’accord d’enregistrement. Ancrage vérifie ensuite à nouveau le domaine et son prix, demande une confirmation explicite, puis appelle Cloudflare dans le compte sélectionné par le client. Après confirmation de l’enregistrement, Ancrage publie le site déjà généré dans le projet Pages de ce compte et relie le domaine. Le client reçoit l’adresse publique et un lien vers son tableau de bord Cloudflare.

Ancrage ne doit jamais présenter le domaine comme acheté avant confirmation de Cloudflare. Un refus, une indisponibilité, un prix modifié ou une étape Cloudflare requise arrête le flux et indique la prochaine action. Les coûts d’hébergement doivent être affichés selon les composants réellement activés : Pages peut être gratuit pour un site statique; les fonctions dynamiques peuvent déclencher une facturation Workers. Le domaine, son prix de renouvellement et le renouvellement de l’hébergement restent distincts et visibles.

Cette cible n’est pas livrée. L’activation est bloquée jusqu’à l’existence d’un runtime hébergé avec authentification client et isolation des comptes, stockage sûr des autorisations OAuth, publication durable et génération commerciale réelle. Le client ne doit pas être envoyé seul dans le tableau de bord Cloudflare pour créer un projet ou téléverser le site.

La cible de démo est une production bornée en temps et en coût, avec conservation du dernier checkpoint fiable et décision de reprise explicite en cas d’incident. Ni timeout ni erreur fournisseur n’autorisent une relance payante illimitée. Les conditions légales, licences, attributions, conservation des données, restauration et droits fournisseurs restent des validations préalables au lancement commercial ; aucun ancien prix de recherche n’est considéré comme acquis.
