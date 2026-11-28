# Gainage en mode temps : sans charge, tenue chronométrée

Date : 2026-11-28. Statut : validé par le propriétaire (réponses du 28/11/2026).

## Intention
Le gainage se mesure en temps, pas en répétitions, et il n'a pas de charge. L'app demandait une charge et des répétitions pour tous les exercices. Il faut que le gainage s'affiche comme un exercice chronométré.

## Mode de mesure
- Un exercice est en mode `charge` (musculation) ou `temps`. Le mode est déduit du catalogue : `unit: "s"` = temps (gainage, gainage latéral). Pas de nouveau champ en base.
- Décision : pas de gainage lesté (confirmé par le propriétaire).

## Ce qui change (écran de série)
- Mode temps : le champ charge disparaît. Il reste la durée (« sec. », pas de 5 s) et les séries.
- « Lancer la tenue » démarre un compte à rebours. La cible est la durée enregistrée dans le programme (`reps_min`), donc mémorisée pour chaque gainage sans migration.
- À la fin de la cible : signal sonore et vibration (décision validée), et la série est enregistrée à la cible.
- « Arrêter la tenue » enregistre la durée réellement tenue.
- Valider la série ensuite passe au repos comme avant.

## Hors périmètre (ce lot)
- Cardio : distance optionnelle. Demande une colonne dans `cardio_logs`, donc une migration, non appliquée sans accord.
- Compte à rebours de repos : le repos existant reste inchangé.
- Restauration de la tenue après rechargement de la page : non gérée, l'état vit en mémoire.

## Approches écartées
- Catégories fixes (muscu / cardio / gainage) : trop rigide pour les exercices hybrides.
- Champs configurables par exercice : plus lourd que nécessaire pour ce besoin.
