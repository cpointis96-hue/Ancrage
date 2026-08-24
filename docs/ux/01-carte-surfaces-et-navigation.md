# Carte des surfaces et navigation

## Principe directeur

Chaque surface doit répondre à une question principale. Si une information ne change aucune décision ou action sur cette surface, elle reste dans le détail, une vue secondaire ou le journal — elle ne devient pas un bouton.

## Cockpit : navigation principale

La sidebar comporte au maximum six entrées visibles :

1. **À traiter** — synchronisations, blocages, validations et alertes nécessitant une action.
2. **Runs** — audits, générations, reprises et historique filtrable.
3. **Dossiers** — prospects, établissements, sources, photos et état de complétude.
4. **Configuration** — agents, providers, prompts, schémas et politiques versionnés.
5. **Qualité** — rapports QA, preuves, warnings et validations opérateur.
6. **Système** — synchronisation locale, sauvegarde, logs techniques et accès.

Le coût est un filtre et un détail contextuel, pas une entrée principale séparée tant qu'il ne représente pas une décision autonome.

## Structure d'un écran cockpit

```text
sidebar courte | liste ou file de travail | détail de l'objet sélectionné
```

- La sidebar peut être masquée.
- La liste montre uniquement les champs utiles à la décision de l'écran.
- Le détail s'ouvre sans perdre le contexte de la liste.
- Les actions primaires sont dans la barre de contexte de l'objet.
- Les actions rares sont dans un menu secondaire, jamais dans une rangée de boutons permanente.

## Site public : navigation minimale

La navigation publique ne doit pas imiter le cockpit. Elle privilégie :

- une promesse compréhensible ;
- une action principale ;
- une explication courte du fonctionnement ;
- des exemples de démos réellement disponibles ;
- une aide documentaire accessible par la mascotte ;
- les mentions nécessaires.

Le formulaire suit le parcours et ne devient pas une page de réglages. Les champs apparaissent seulement lorsqu'ils sont nécessaires à l'étape courante.

## Premier vertical slice UX

```text
Accueil public
→ nom + ville
→ établissement confirmé ou branche sans GMB
→ enrichissement et champs manquants
→ audit GMB visible
→ audit SEO en progression
→ rapport final
→ Préparer mon site
→ collecte e-mail
→ dossier dans À traiter
→ Synchroniser
→ run cockpit
→ validation opérateur
→ lien de démo
```

Ce slice prouve la continuité entre les deux surfaces avant de concevoir les sites générés.
