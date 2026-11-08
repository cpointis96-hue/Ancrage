# Application macOS Ancrage

Construction Apple Silicon sur macOS avec les outils de développement Apple :

```sh
npm run build:desktop
```

L’application et le DMG sont générés dans `outputs/desktop/`. Le DMG contient l’application et un lien Applications pour l’installation par glisser-déposer. Aucune configuration locale, donnée client ou clé API n’est embarquée. La signature locale ad hoc ne remplace pas une signature Developer ID et une notarisation Apple.

L’application utilise WebKit, la session persistante macOS et l’adresse `https://ancrage-vision.vercel.app/cockpit`. Les liens externes s’ouvrent dans le navigateur. Elle exige Internet ; aucun moteur d’audit n’est lancé sur le Mac.

Le cockpit est déployé sur Vercel avec un accès opérateur par mot de passe et le même stockage hébergé que le site client. La vue Audits permet de retrouver les demandes et d’ouvrir leurs rapports HTML/PDF dans des fenêtres conservant la session.

Vérifications réalisées : connexion réelle, refus de la liste des demandes sans session (HTTP 401), trois demandes existantes retrouvées, deux rapports HTML/PDF récupérés et ouverture HTML/PDF constatée dans l’application macOS. Deux anciens PDF n’ont pas été générés et renvoient HTTP 409. Le clic sur le logo affiche brièvement les placeholders de chargement puis revient à « À traiter » ; répété deux fois sans bloquer l’application. Fermeture et réouverture de l’application conservent la session. Le DMG a été monté en lecture seule : exécutable identique à l’application testée, signature locale valide, icône et lien Applications présents, aucun secret embarqué.

Les actions nécessitant un dossier Finder local ne sont pas disponibles dans le runtime hébergé.
