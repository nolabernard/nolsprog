# V2 — Lot 6 « Coach et bilan » : plan de mise en œuvre

**Goal:** Bilan de fin de cycle (séances faites, évolutions par exercice, points forts, points à améliorer, ressenti, recommandation), questionnaire actualisé, cycle suivant proposé puis activé seulement après validation.

**Architecture:** Module pur `v2-review.js` (`SteroidReview` : `due`, `review`, `nextAnswers`, `methodsFor`) ; écrans `reviewCard`, `review`, `nextForm`, `proposal` dans `ui-v2.js` ; contrôleur `app-v2.js` (proposition gardée sur l'appareil, `nolsprog-v2-proposal:<compte>`). Aucune migration.

## Global Constraints
- Aucun cycle activé sans validation ; le cycle en cours n'est jamais modifié par le bilan.
- Constats fondés uniquement sur les séances du cycle ; un exercice remplacé garde ses propres chiffres.
- Activation : ancien cycle `archived` envoyé avant le nouveau `active` (un seul actif par compte).
- Recommandations : alléger (régularité < 60 %), changer de méthode (régulier mais < 30 % des exercices en progrès), sinon garder.

## Tâches
- [x] `v2-review.js` + `scripts/v2-review.test.cjs`
- [x] Écrans + tests `ui-v2`
- [x] Contrôleur + tests `app-v2` (proposition persistée, ordre d'envoi, serveur en retard)
- [x] `app.js` : formulaire `data-v2-next` ; `index.html` charge `v2-review.js`
