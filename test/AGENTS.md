# Tests
Limiter le travail aux tests et fixtures de ce dossier et du sous-dossier sélectionné.
Entrée : services publics importés, données synthétiques, adaptateurs injectés. Sortie : assertions reproductibles.
Cibler le comportement, isoler les répertoires temporaires, libérer serveurs/verrous. Aucun fournisseur payant réel.
Exécuter le test concerné, puis `rtk proxy npm test` pour une modification transversale. Ne pas affaiblir une assertion pour masquer une régression.
