# STÉROÏDE — consignes de travail

Application web mobile-first de suivi d'entraînement (musculation + cardio).
Site statique (HTML/CSS/JS, sans framework ni build), publié sur GitHub Pages :
https://nolabernard.github.io/nolsprog/ — comptes et synchronisation via Supabase.

## Façon de travailler (obligatoire)
1. Partir de `main` à jour, créer une branche `type/sujet-AAAAMMJJ`
   (`feature/`, `fix/`, `chore/`, `refactor/`).
2. Une PR = un sujet. Changements minimaux, pas de reformatage hors sujet.
3. Lancer `./scripts/test-all.sh` avant chaque push : tout doit passer.
4. Pousser, ouvrir une PR vers `main` (titre et description en français).
5. **Ne jamais fusionner sans l'accord explicite du propriétaire.**
   Ne jamais pousser directement sur `main` (chaque push sur `main` déploie en production).

## Structure
- `index.html` : charge les modules dans l'ordre, puis `app.js` (module ES).
  Contient la CSP : tout nouveau domaine externe (API, images, polices) doit y être ajouté.
- `app.js` : coquille de l'application (connexion, questionnaire, réglages du compte, navigation) ; délègue Aujourd'hui,
  Progrès et Programme à la V2. Lignes très longues : chercher avec `grep -n` et ne lire que les passages utiles.
  Le questionnaire enregistre seulement les réponses (`user_profiles`) ; le programme est le cycle V2. Restes V1 pour la
  compatibilité : lecture de l'ancien plan (`user_programs`, secours si aucune réponse) et envoi des séries ou du plan V1
  restés en attente sur un appareil.
- Modules purs, exposés en global navigateur et en `module.exports` pour les tests :
  `sport-rules.js` (validation), `sport-guide.js` (onboarding), `program-engine.js` (génération de programme, déterministe ;
  `buildProgram(p, semaine)` = V1 figée pour les programmes en cours, `{version: 2}` et `buildCycle(p)` = V2).
- `exercise-catalogue.js` : catalogue à clés permanentes (`SteroidCatalogue`), rôles base/finition, recherche
  tolérante (`search`, `resolveName`). Une clé publiée ne change jamais et n'est jamais réutilisée.
- `exercise-guide.js` (`SteroidMoves`) : pictogrammes SVG au trait dessinés pour l'app et consignes d'exécution, par type de
  mouvement (`pattern` du catalogue) ; bouton « Comment faire » pendant la séance. Aucune image externe.
- `session-planner.js` (`SteroidPlanner.nextSession`) : prochaine séance de la suite + garde-fou 48 h expliqué.
- `workout-store.js` (`SteroidWorkout.createWorkoutStore`) : séance V2 en cours (séries, pause, plus tard,
  remplacement, fin) et file d'envoi ordonnée vers les tables V2 (upsert sur `id`).
- `v2-cycle.js` (`SteroidCycle`) : cycle actif (construction, chargement Supabase), dernières performances et progrès par clé.
- `v2-history.js` (`SteroidHistory`) : historique par clé (séances, séance par séance, records comparables, conseils de
  double progression fondés sur la dernière séance de la même clé, jamais appliqués automatiquement).
- `v2-review.js` (`SteroidReview`) : bilan de fin de cycle (échéance, constats, recommandation) et réponses du cycle suivant.
- `reminders.js` (`SteroidReminders`) : rappels côté app (abonnement de l'appareil, heure, jours) ; envoi par la fonction
  Supabase `supabase/functions/send-reminders` (pg_cron toutes les 15 min). Clés VAPID et secret d'appel générés et gardés dans
  `public.push_config` (aucun accès utilisateur) : jamais dans le dépôt.
- `ui-v2.js` (`SteroidUI`) : écrans V2 en HTML pur (accueil, séance P1, machine prise, fin, progrès, programme, choix d'exercice).
- `app-v2.js` (`SteroidAppV2.create`) : contrôleur V2 (stockage, envoi, actions `data-action="v2-…"`), testé sous Node.
  `app.js` lui délègue Aujourd'hui, Progrès et Programme (`v2Main`) ; s'il ne démarre pas : écran « Réessayer » (`v2Unavailable`).
- `ui-dialog.js` : panneaux de dialogue de l'app (`SteroidDialog.open/confirm/yesNo/ask`).
  Interdit : `prompt`, `confirm`, `alert` natifs (vérifié par les tests).
- `app-updates.js` : détection de nouvelle version (`version.json` généré au déploiement).
- `sw.js` : mode hors ligne (réseau d'abord, cache en secours ; jamais Supabase ni `version.json`).
  Enregistré seulement en production. Changer `CACHE` si la stratégie de cache change.
- Styles : `styles.css` (historique, lourd) + `steroid-v2.css` (identité V2, chargé après).
  Référence visuelle : `DESIGN-SYSTEM-V2.md`. Toute nouvelle règle va dans `steroid-v2.css`.
- `supabase/email-templates/` : e-mails de confirmation et de récupération.
- Tests : `scripts/*.test.cjs`, `scripts/smoke.cjs`, `tests/*.test.cjs` (node:test).
  Un nouveau test placé dans ces dossiers est lancé automatiquement.

## Données
- Stockage local (clés préfixées `nolsprog-`) : mode invité, cache de compte, séance active.
- Supabase : tables V2 (`cycles`, `cycle_sessions`, `cycle_exercises`, `cycle_cardio`, `workouts`, `workout_exercises`,
  `workout_set_logs`, `cardio_logs`, `user_exercises`, `push_subscriptions`) + `user_profiles` (réponses du questionnaire),
  RLS `auth.uid() = user_id`. Tables V1 (`user_programs`, `workout_sets`, `workout_sessions`) : plus écrites par l'app,
  sauf données restées en attente sur un appareil ; contenu entièrement copié en V2 (vérifié le 22/11/2026 : 221 séries sur 221).
  Suppression possible plus tard, uniquement sur demande explicite du propriétaire et après sauvegarde. Seule la clé publique `sb_publishable` est autorisée dans le code.
  Jamais de clé `service_role` ni de secret dans le dépôt (il est public).
- Ne jamais casser la compatibilité des données locales existantes sans migration.

## Règles métier non négociables
- Une synchronisation en attente reste affichée comme telle ; jamais « synchronisé »
  avant confirmation du serveur. Local et Cloud sont deux états distincts.
- Records : uniquement à partir de séries validées et comparables. Aucun faux record.
- Charge manquante ≠ 0 kg.
- Calories = estimations indicatives, jamais présentées comme exactes.
- Pas de diagnostic médical ; le moteur de programme reste déterministe.

## UI
- Textes de l'interface en français, ton direct.
- Maquette de base 390 × 844 px, cibles tactiles ≥ 44 px, focus visible,
  respect de `prefers-reduced-motion`, icônes SVG au trait (pas d'emoji).

## Avancement V2 (cahier des charges : `docs/cahier-des-charges-v2.md`)
Conception : `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` (interface retenue : proposition P1 « Guidé »,
maquettes sur le canevas « STÉROÏDE — refonte UX »). Plans : `docs/superpowers/plans/`.
- Lot 1 Fondations : fait. Tables V2 créées dans Supabase et données V1 copiées (`select public.v2_copy_legacy()`,
  rejouable ; correspondances des noms dans `public.v2_name_map`).
- Lot 2 Générateur et cycles : fait (`buildCycle`, moteur `{version: 2}`, tests sur 4 050 combinaisons).
- Lot 3a Logique de séance : fait (modules ci-dessus + `alternatives` du catalogue).
- Lot 3b Écrans P1 et bascule : fait. Les nouvelles séances s'écrivent dans les tables V2 ; Progrès et Programme lisent la V2.
  Ancien code V1 (écrans, séance guidée, éditeur, archives, import, partage) supprimé le 22/11/2026.
- Lot 4 Planning et cardio : fait (`answers.planMode` 'days'|'free', `SteroidCycle.rhythm`, `cycle_cardio`/`cardio_logs`,
  cardio envoyé après les séances ; jours : 0 = lundi).
- Lot 5 Historique et progrès : fait (Progrès : onglets Exercices / Séances ; conseil en séance ; nouveaux records en fin de séance ;
  record récent sur l'accueil). Lecture enrichie : `set_number`, `rpe`, `substituted_from_key`, titre de séance. Aucune migration.
- Lot 6 Coach et bilan : fait (carte « Ton cycle est terminé » sur l'accueil, bilan aussi accessible depuis Programme ;
  cycle suivant proposé sur l'appareil, activé seulement après validation ; ancien cycle archivé avant l'envoi du nouveau).
- Lot 7 Rappels : fait (carte Rappels dans Programme ; comptes seulement ; iPhone : app installée sur l'écran d'accueil, iOS 16.4+ ;
  pas de rappel un jour où la séance est faite). Table `push_subscriptions`, fonction `send-reminders` déployée (verify_jwt off,
  authentification par secret d'appel ou jeton utilisateur).
- Migrations Supabase : uniquement sur accord explicite du propriétaire (« applique les migrations »).
