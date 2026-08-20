# Sécurité, données et standards — exigences MVP

Date de vérification : 2026-08-17  
Périmètre : plateforme web publique, génération de démos/sites, Control Plane déterministe, Agent Plane probabiliste, worker éventuellement séparé et cockpit opérateur local.  
Statut : recherche ; aucune modification de ticket ni implémentation.

## Position de départ

Le niveau 1 d’[OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/blob/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json) est le plancher raisonnable du MVP. ASVS précise que L1 représente les exigences minimales de sécurité ; cela ne signifie pas que le produit est « conforme ASVS » sans vérification de chaque exigence applicable. Les identifiants ci-dessous sont préfixés `v5.0.0-` car OWASP indique qu’ils peuvent changer entre versions.

Les contrôles « bloquants » sont ceux qui doivent être décidés dans la spécification avant toute exposition publique ou tout appel d’agent capable de consommer une ressource, modifier une donnée ou déclencher une dépense. Les contrôles « différables » restent nécessaires, mais peuvent suivre un MVP strictement borné.

## Exigences bloquantes avant spécification

### 1. Formulaires et entrées utilisateur

- Chaque champ doit avoir une règle côté serveur : type, longueur, encodage canonique, format et contrainte métier. Décoder/déséchapper une seule fois avant validation ; ne jamais considérer la validation client comme une frontière de sécurité. C’est l’application de `v5.0.0-1.1.1`, `v5.0.0-2.1.1`, `v5.0.0-2.1.3` et de l’[OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).
- Utiliser des listes d’autorisation pour les valeurs structurées ; borner les tailles, le nombre d’éléments, la profondeur JSON et les répétitions. Rejeter proprement les entrées hors limite sans divulguer de détail interne.
- Pour toute mutation authentifiée par cookie, mettre en place une protection CSRF côté serveur ; limiter précisément CORS et les méthodes acceptées. Voir [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- Ne jamais placer secret, token de session, donnée sensible ou contenu personnel dans l’URL/query string ; éviter leur présence dans les logs et traces. Référence : [ASVS V14 Data Protection](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md), notamment `14.2.1`.
- Les messages d’inscription, de connexion et de récupération doivent éviter l’énumération de comptes ; les tentatives répétées doivent être ralenties ou challengées. Référence : [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### 2. Uploads

Le MVP doit définir, par fonctionnalité, une matrice explicite : types acceptés, extension attendue, taille du fichier et de la requête, taille décompressée, nombre de fichiers, quota par utilisateur/tenant et comportement en cas de rejet.

- N’autoriser que les extensions nécessaires ; ne pas faire confiance au `Content-Type` fourni par le client ; vérifier la signature/magic bytes et le contenu avec une bibliothèque adaptée. Références : `v5.0.0-5.1.1`, `v5.0.0-5.2.1`, `v5.0.0-5.2.2` et [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Générer un identifiant de stockage interne ; ne jamais utiliser directement le nom ou le chemin fourni. Stocker hors webroot, dans un bucket privé ou derrière un handler autorisé, avec permissions minimales. Le contenu uploadé ne doit pas pouvoir être exécuté comme code serveur : `v5.0.0-5.3.1` et `v5.0.0-5.3.2`.
- Pour ZIP/DOCX/archives : vérifier taille décompressée et nombre de fichiers avant extraction, empêcher zip slip et refuser les symlinks sauf besoin documenté ; `v5.0.0-5.2.3`, `v5.0.0-5.2.5`, `v5.0.0-5.3.3`.
- Autoriser l’upload uniquement après contrôle d’autorisation. Scanner les fichiers obtenus de sources non fiables avant de les servir (`v5.0.0-5.4.3`) ; utiliser antivirus/sandbox ou CDR lorsqu’approprié. Les fichiers non vérifiés doivent rester privés/quarantainés.
- Les téléchargements doivent passer par un identifiant interne, un `Content-Disposition` sûr et une réponse qui n’exécute pas le contenu. Ajouter quotas et limites de téléchargement pour éviter le remplissage du stockage ou un DoS.

### 3. URLs fournies par l’utilisateur et SSRF

Une URL saisie, extraite d’un document ou proposée par un agent est une entrée non fiable. Pour toute requête sortante :

- préférer une allowlist de protocoles, domaines, ports et chemins connus ; parser/canonicaliser avec une bibliothèque URL fiable ; refuser `file:`, `gopher:`, `ftp:`, `data:`, `javascript:` et toute forme non nécessaire ; appliquer `v5.0.0-1.2.2` et `v5.0.0-1.3.6` ;
- désactiver les redirections automatiques ou revalider chaque destination ; bloquer localhost, loopback, plages privées/link-local, endpoints de métadonnées cloud, IPv4/IPv6 encodés et résolutions DNS vers des réseaux internes ;
- appliquer une défense réseau indépendante : egress proxy/pare-feu, deny-by-default, timeouts, taille maximale de réponse et absence de transmission brute de la réponse au client ;
- isoler le fetcher du Control Plane et de la base ; aucune URL utilisateur ne doit devenir un appel réseau privilégié ou un outil agent sans validation déterministe.

Référence principale : [OWASP Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) et `v5.0.0-1.3.6`. Pour les redirections, voir [OWASP Unvalidated Redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html).

### 4. Injections et sorties

- Encoder/échapper en fonction du contexte au dernier moment : HTML, attribut, URL, JavaScript/JSON, en-têtes et contenu de téléchargement (`v5.0.0-1.2.1` à `1.2.3`). Utiliser une CSP comme défense en profondeur ; voir [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) et [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
- Utiliser des requêtes paramétrées/ORM sûrs pour SQL, NoSQL et autres moteurs ; aucun compte applicatif ne doit être DBA/admin : `v5.0.0-1.2.4` et [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- Éviter les commandes OS. Si un outil système est indispensable, appeler un binaire fixe avec argv typés, allowlist stricte, utilisateur non privilégié, timeout et sandbox ; ne jamais concaténer une commande avec une entrée utilisateur. Références : `v5.0.0-1.2.5` et [OWASP OS Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html).
- Interdire `eval`/templates dynamiques non maîtrisés, protéger les regex contre ReDoS et neutraliser l’injection CSV/formules (`v5.0.0-1.3.7`, `v5.0.0-1.2.9`, `v5.0.0-1.2.10`).

### 5. Prompt injection et sorties de modèles

OWASP décrit les prompt injections directes et indirectes, y compris dans les sites, fichiers et sorties d’outils, et précise que RAG/fine-tuning ne les suppriment pas : [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) et [LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

Exigences MVP :

- marquer explicitement tout contenu utilisateur, web, document, mémoire et sortie d’outil comme donnée non fiable ; ne jamais le fusionner avec les instructions de confiance ;
- ne jamais faire de la sortie du modèle une décision d’autorisation, un chemin de fichier, une requête SQL, une commande shell ou une dépense ; revalider côté serveur avec schéma, allowlist, état métier et tenant ;
- séparer planification et exécution ; les actions à effet externe (publication, envoi, suppression, enregistrement de domaine, achat, accès à un secret) exigent une règle déterministe et, au minimum pour le MVP, une validation humaine explicite ;
- réduire les données accessibles au modèle et ne jamais injecter secrets, tokens ou contexte d’un autre tenant ; filtrer/redacter avant appel et contrôler la sortie avant affichage ou stockage ;
- conserver un signal d’audit lorsqu’une injection, une violation de schéma ou une tentative d’outil est bloquée. Les prompts système sont une défense utile mais ne sont pas une frontière d’autorisation.

Compléments : [LLM02 Sensitive Information Disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/), [LLM05 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) et [LLM06 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).

### 6. Outils d’agents et permissions

Le catalogue d’outils doit être une surface d’autorisation explicite, pas une liste que le modèle peut étendre.

- allowlist versionnée d’outils minimaux, schémas d’arguments stricts, validation serveur et scope par tenant/ressource ; séparer `read`, `write`, `publish`, `send`, `delete` et `spend` ;
- ne pas exposer d’interpréteur shell, accès réseau arbitraire, filesystem hôte, accès direct à la base ou capacité de supprimer dans un outil généraliste ;
- les permissions viennent du service appelant et de l’utilisateur autorisé, pas du texte du prompt ni d’un argument produit par le modèle ;
- rendre les opérations idempotentes, prévisualisables/dry-run et annulables lorsque possible ; demander confirmation pour toute action irréversible ou financière ;
- journaliser identité, tenant, outil, version, arguments redacted, décision d’autorisation, résultat, coût, durée et corrélation de job.

Ces exigences traduisent les causes d’« excessive agency » identifiées par OWASP — fonctionnalité, permissions et autonomie excessives — ainsi que les recommandations de l’[OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) et de l’[OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html) : contrôle strict des outils, permissions minimales, validation des schémas, confirmation humaine, limitation des sources non fiables et journalisation.

### 7. Sandboxing et limites d’exécution

Tout traitement de code, document complexe, outil système ou contenu non fiable doit s’exécuter hors du processus web principal et hors du cockpit Mac.

- worker isolé, utilisateur non root/rootless, aucun montage du host, aucun socket Docker, aucun mode privileged, filesystem racine en lecture seule et répertoire de travail éphémère ;
- seccomp/AppArmor/SELinux ou équivalent, capacités Linux minimales, `allowPrivilegeEscalation=false`, egress réseau deny-by-default et allowlistée ; références [Kubernetes kernel security constraints](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/) et [Docker rootless](https://docs.docker.com/engine/security/rootless/) ;
- limites explicites CPU, mémoire, disque, processus, taille des sorties, durée maximale, nombre de téléchargements et appels réseau. Docker rappelle qu’un conteneur sans limites peut consommer les ressources de l’hôte : [resource constraints](https://docs.docker.com/engine/containers/resource_constraints/) ;
- révoquer les credentials à la fin, détruire/réinitialiser l’environnement entre jobs et conserver uniquement les artefacts nécessaires, après scan et contrôle d’accès.

### 8. Budgets, consommation et rate limiting

OWASP LLM10 classe la consommation non bornée parmi les risques : DoS, « denial of wallet », surcharge et extraction. Il recommande rate limiting, quotas, timeouts, sandbox, limites d’actions, monitoring et dégradation contrôlée : [LLM10:2025 Unbounded Consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/).

Le MVP doit donc avoir, avant chaque job :

- budget maximal par requête, job, utilisateur/tenant et période : tokens/longueur, appels modèle, appels d’outils, durée, CPU/mémoire, stockage, réseau et coût monétaire ;
- ledger de consommation avec réservation avant dépense externe, plafond dur, arrêt fail-closed, limites de retries/backoff et kill switch opérateur ;
- quotas distincts pour formulaire, upload, fetch, génération et publication ; queue bornée et expiration des jobs ;
- rate limiting multi-clés : IP, session, identité, tenant et endpoint. Utiliser token bucket ou sliding window ; pour login, appliquer au minimum un bucket par compte et un par IP. Référence : [OWASP Bot Management and Anti-Automation](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html) et `v5.0.0-6.1.1` ; répondre `429` sans divulguer le compteur interne.

### 9. Admin et autorisation

- cockpit non public en MVP si possible : réseau local/VPN/bastion ; l’API publique ne doit jamais constituer un raccourci vers l’admin ;
- authentification forte, MFA pour les opérations sensibles, sessions courtes/révocables et aucun compte partagé ;
- RBAC/ABAC documenté, contrôle fonctionnel, objet et champ côté service de confiance ; jamais de décision reposant uniquement sur le client, un ID fourni ou une permission du modèle. Références `v5.0.0-8.1.1`, `v5.0.0-8.2.1`, `v5.0.0-8.2.2`, `v5.0.0-8.3.1` et [ASVS V8 Authorization](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md) ;
- step-up/confirmation pour publication, domaine, achat, suppression, rotation de secrets et restauration ; séparation des rôles lorsque possible.

### 10. Audit trail

L’audit doit être conçu avant les workflows. Journaliser au minimum : authentifications réussies/échouées, changements de rôles, accès admin, uploads et rejets, fetch SSRF, prompts/sorties redacted, appels d’outils, décisions d’autorisation, injections bloquées, budgets/rate limits, publication, dépenses, suppression, backups/restores et erreurs de sécurité.

Chaque événement doit avoir horodatage synchronisé, acteur/service, tenant, action, cible, résultat, raison/code, request/job/correlation ID et version de l’outil ou du workflow. Ne pas écrire mots de passe, tokens, clés, prompts contenant des secrets ni PII inutile. Centraliser les logs, restreindre leur lecture/écriture, détecter arrêt, altération ou suppression et définir une durée de conservation. Références : [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), le chapitre `V16 Security Logging and Error Handling` d’ASVS 5.0 et `v5.0.0-14.1.2` pour la classification/protection des données.

### 11. Secrets

- aucun secret en dépôt, ticket, bundle navigateur, prompt, URL, log, image de backup ou message d’erreur ;
- gestionnaire de secrets ou mécanisme runtime équivalent, accès par compte de service dédié et scope minimal ; pas de « big secret » partagé ;
- secrets courts, rotatifs et révocables ; procédure d’incident pour rotation immédiate, invalidation et recherche dans logs/artifacts ;
- auditer qui a demandé/utilisé/modifié/expiré un secret, sans enregistrer sa valeur. Référence : [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).

### 12. Dépendances et supply chain

- lockfiles, versions maintenues et mises à jour reproductibles ; scan CVE automatisé en CI et procédure de traitement/exception datée ;
- SBOM des dépendances applicatives, images, outils et modèles ; provenance, hash/signature lorsque disponibles ; aucune extension/outil agent non revu ;
- tester une mise à jour en environnement de test avant production et conserver un inventaire des dépendances transitives. Voir [OWASP Vulnerable Dependency Management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html) et [LLM03:2025 Supply Chain](https://genai.owasp.org/llmrisk/llm032025-supply-chain/).

### 13. Backups et restore

Le MVP doit définir RPO/RTO, propriétaire, fréquence, périmètre et procédure testée pour base, objets uploadés, configuration, artefacts publiés et métadonnées nécessaires au workflow. Les secrets doivent être restaurables via leur gestionnaire, pas copiés en clair dans les dumps.

- backups chiffrés en transit/au repos, séparés des credentials de production, avec accès minimal et copie hors environnement principal ;
- vérifier intégrité et succès des sauvegardes ; conserver plusieurs points de restauration selon la politique de rétention ;
- exécuter régulièrement un restore dans un environnement isolé, vérifier migrations, permissions, liens objet/base et reprise d’un job ; NIST recommande backups réguliers, stockage hors site, validation périodique et exercices planifiés : [SP 800-34 Rev. 1](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf) ;
- si PostgreSQL est retenu, choisir explicitement dump, backup filesystem ou archivage continu/PITR ; PostgreSQL précise que le PITR nécessite une base backup et une séquence WAL conservée et testée : [Backup and Restore](https://www.postgresql.org/docs/current/backup.html), [Continuous Archiving/PITR](https://www.postgresql.org/docs/17/continuous-archiving.html).

### 14. Suppression et conservation

- inventaire des données par catégorie : formulaire, fichiers, prompts, sorties, logs, artefacts, index/cache, mémoire agent, facturation et backups ; pour chaque catégorie : finalité, propriétaire, durée, accès et suppression ;
- suppression logique ou physique selon le besoin, propagée aux objets, dérivés, caches, indexes et mémoires agent ; empêcher toute nouvelle utilisation dès la demande ;
- conserver seulement un événement d’audit minimal (qui/quand/quoi/résultat), sans reconstituer le contenu supprimé ; traiter séparément obligation légale, litige et sécurité ;
- définir l’effet sur les backups : expiration documentée et fenêtre maximale de persistance, sans promettre une suppression instantanée dans une sauvegarde immuable ; vérifier la suppression par un job idempotent et signaler les exceptions.

Si le RGPD s’applique, l’architecture doit permettre le droit à l’effacement et la communication aux destinataires concernés, sous réserve des exceptions de l’article 17 : [EUR-Lex, RGPD article 17](https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj/eng). L’[OWASP User Privacy Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html) recommande également chiffrement et transparence sur l’usage des données.

## Contrôles pouvant être différés après le MVP strict

- conformité ASVS L2 complète et test d’intrusion externe ;
- CDR/antivirus avancé si le MVP n’accepte que des images réécrites et non servies avant validation ;
- détection comportementale avancée, WAF spécialisé, DLP/PII avancée et SIEM complet, à condition d’avoir dès le départ les logs et seuils de base ;
- sandbox renforcé de type microVM/gVisor si aucun code arbitraire n’est exécuté au MVP ; il devient bloquant dès que le produit exécute code, outils système ou fichiers complexes non fiables ;
- MFA matériel, séparation formelle des quatre yeux, réplication multi-région et exercices de reprise à grande échelle, à calibrer avec le RPO/RTO et le risque commercial ;
- AI-BOM/évaluations red-team formelles, sans différer l’inventaire, la provenance, les limites et les tests de prompt injection des flux réellement exposés.

## Décisions à inscrire dans la prochaine spécification

1. Types d’uploads effectivement nécessaires et limites par type.
2. Liste initiale des domaines/protocoles sortants et politique réseau du fetcher.
3. Catalogue d’outils agents, scopes, actions nécessitant confirmation et kill switch.
4. Budget maximal d’une démo, d’un tenant et d’une période ; RPO/RTO et durée de conservation par catégorie.
5. Mode d’accès admin du cockpit local et rôle pouvant approuver publication, dépense, suppression et restore.
6. Procédure de suppression et délai de purge des objets, dérivés, logs et backups.
