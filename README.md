# STEROID

Application mobile-first de suivi d'entraînement (musculation et cardio), avec mode invité et comptes Supabase. Interface statique publiée sur GitHub Pages.

## Fonctionnalités
- Questionnaire puis cycle de 6 semaines généré par un moteur déterministe (suite de séances en boucle, une séance par jour).
- Écran « Aujourd’hui » : prochaine séance, séance guidée (séries, pause, remplacement de machine, consignes « Comment faire »).
- Cardio planifié, ressenti en fin de séance (Facile / Correct / Dur).
- « Progrès » : historique par exercice et par séance, records comparables uniquement.
- « Programme » : modifications en brouillon, appliquées sur « Enregistrer » ; bilan de fin de cycle et cycle suivant.
- Rappels par notification (comptes connectés).
- Mode hors ligne : données gardées sur l’appareil puis envoyées dès que possible.

## Données et synchronisation
- Le mode invité conserve ses données dans le stockage local du navigateur.
- Pour les comptes connectés, les données sont envoyées à Supabase dans les tables V2 (`cycles`, `cycle_sessions`, `cycle_exercises`,
  `cycle_cardio`, `workouts`, `workout_exercises`, `workout_set_logs`, `cardio_logs`, `user_exercises`, `push_subscriptions`) et `user_profiles`.
- Toutes les tables ont RLS activé, avec des politiques limitant l’accès à `auth.uid() = user_id`.
- Les tables V1 (`user_programs`, `workout_sets`, `workout_sessions`) ne sont plus écrites ; leur contenu a été copié en V2.
- Une modification non envoyée reste signalée « en attente » jusqu’à confirmation du serveur.
- La clé `sb_publishable` utilisée par le navigateur est une clé publique. Ne jamais publier de clé secrète ou de clé `service_role`.

## Tests
`./scripts/test-all.sh` lance tous les contrôles (syntaxe, fichiers indispensables, tests Node).

## Confidentialité et limites
- Le dépôt GitHub est public : le code source HTML/CSS/JS est visible.
- Le stockage local du navigateur n'est pas un coffre chiffré. Protéger l'accès à l'appareil.
- Les calories sont des estimations indicatives, jamais une mesure exacte.
- Les records ne doivent être calculés qu'à partir de séries réellement validées et comparables.
- Une synchronisation en attente ne doit jamais être présentée comme terminée.

## Déploiement
Le site statique est publié sur GitHub Pages via `.github/workflows/deploy.yml`. Les contrôles automatisés sont définis dans `.github/workflows/validate.yml`.

URL : https://nolabernard.github.io/nolsprog/

## Installer sur iPhone
Dans Safari : ouvrir le site, Partager → Sur l'écran d'accueil.
