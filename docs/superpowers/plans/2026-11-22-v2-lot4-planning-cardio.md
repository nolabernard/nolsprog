# V2 — Lot 4 « Planning et cardio » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Deux modes de planning (jours choisis / N séances par semaine), rythme conseillé visible sur l'accueil, cardio planifié et enregistré séparément des séries.

**Architecture:** Données pures dans `v2-cycle.js` (lecture `cycle_cardio`, `cardio_logs`, calculs de rythme et de minutes par semaine), rendu dans `ui-v2.js`, actions dans `app-v2.js`. `app.js` : seulement le choix du mode dans le questionnaire. Aucune migration : tables `cycle_cardio` et `cardio_logs` créées au lot 1.

**Tech Stack:** JavaScript sans build, Node 22 (`node:test`/`assert`), Supabase REST.

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` §6.1, §6.6, §6.7, §10 lot 4.

## Global Constraints
- Jours choisis = rythme conseillé seulement, jamais bloquant ; aucune séance « manquée » (déjà garanti par `SteroidPlanner`).
- Index des jours : 0 = lundi … 6 = dimanche (convention du questionnaire et de `preferred_days`).
- Types de cardio : `marche, course, velo, elliptique, rameur, natation, escaliers, autre` ; minutes 1–600 ; fois par semaine 1–7.
- `cardio_logs.workout_id` référence `workouts` : envoyé après les séances.
- Statut d'envoi explicite, textes en français, cibles ≥ 44 px, pas d'emoji.

## Review Focus
1. Mode « quand je veux » : aucun jour affiché comme « prévu », le questionnaire V1 continue de fonctionner (jours = semaine entière).
2. Cardio noté hors ligne à la fin d'une séance non encore envoyée → envoyé après la séance, jamais refusé.
3. Semaine à cheval (dimanche soir / lundi) : minutes de cardio comptées dans la bonne semaine (lundi 00 h locale).
4. Cycle sans cardio prévu : l'accueil ne montre pas d'objectif cardio, mais « Noter du cardio » reste possible.
5. Valeurs hors bornes saisies (0 min, 900 min) → refusées avec un message, jamais envoyées.

### Task 1: Données — `v2-cycle.js`
**Produces:** `rhythm(cycle, workouts, now) → {mode:'days'|'free', days:[int], todayPlanned:bool, nextDay:int|null, doneThisWeek, goal}` ; `weekStart(now) → ms` (lundi 00 h locale) ; `cardioWeek(logs, now) → minutes` ; `cardioProgress(logs) → [{week, minutes}]` (6 dernières semaines) ; `loadCycle` renvoie aussi `cardio` (prévu) et `cardioLogs`.
- [ ] Tests `scripts/v2-cycle.test.cjs` : mode jours/libre, prochain jour conseillé (mercredi après lundi), semaine à cheval, minutes par semaine.
- [ ] Implémenter, tests verts, commit.

### Task 2: Écrans — `ui-v2.js`
**Produces:** `home({..., rhythm, cardio:{planned:[...], minutes, target}})` ; `cardioSheet({types, workoutId})` ; `programme({..., cardio})` (carte Cardio : ajouter/retirer) ; `progress({..., cardio})` (minutes par semaine) ; `summary` → bouton « Ajouter du cardio ».
- [ ] Tests `scripts/ui-v2.test.cjs`, implémenter, commit.

### Task 3: Contrôleur — `app-v2.js`
- [ ] Actions `v2-cardio-open`, `v2-cardio-save` (via `saveCardio({type, minutes, workoutId})`), `v2-cardio-plan-add`, `v2-cardio-plan-remove` ; file : `cycle_cardio` avec le programme, `cardio_logs` après les séances ; construction : mode libre → `buildCycle({...réponses, days: []})`.
- [ ] Tests `scripts/app-v2.test.cjs` (invité + compte, ordre d'envoi, bornes). Commit.

### Task 4: Questionnaire — `app.js`
- [ ] Étape « Ton agenda » : choix « Je choisis mes jours » / « Quand je veux » (`answers.planMode`) ; mode libre → jours = semaine entière pour l'ancien moteur.
- [ ] Test statique + parcours navigateur, `./scripts/test-all.sh`, relecture finale, PR.
