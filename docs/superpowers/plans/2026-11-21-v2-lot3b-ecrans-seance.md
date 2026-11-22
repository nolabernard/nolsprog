# V2 — Lot 3b « Écrans P1 et bascule » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (ou subagent-driven-development). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rendre visible la logique du lot 3a : nouvel accueil « Prochaine séance », écran de séance P1 (un exercice à la fois, « Machine prise » toujours visible), choix des exercices dans le catalogue, et passage de l'app aux tables V2 pour les nouvelles séances.

**Architecture:** Deux nouveaux modules purs testés sous Node : `v2-cycle.js` (charger/construire le cycle actif, dernières performances par clé, conversion du plan V1 pour le mode invité) et `ui-v2.js` (fonctions qui renvoient le HTML des écrans, sans état ni DOM). `app.js` ne fait que brancher : onglet Aujourd'hui → accueil V2, bouton Démarrer → `SteroidWorkout.createWorkoutStore`, événements `data-action="v2-*"`. Styles dans `steroid-v2.css`.

**Tech Stack:** JavaScript sans build (UMD global + `module.exports`), Node 22 (`node:test`), Supabase REST via la fonction `cloud()` existante.

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` §6.1, §6.2, §6.3, §6.4, §6.4 bis, §6.5, §8. Maquettes : canevas « STEROID — refonte UX », écrans V1a (accueil), V1b (séance et pause), V1c (machine prise).

## Global Constraints
- Palette et composants de `DESIGN-SYSTEM-V2.md` ; maquette 390 × 844 ; cibles ≥ 44 px ; bouton principal ≥ 52 px ; icônes SVG au trait ; aucun emoji ; `prefers-reduced-motion` respecté.
- Valider une série = **1 toucher** (charges et répétitions préremplies avec la dernière performance de la même clé).
- Repos lancé automatiquement après validation ; boutons « +30 s » et « Passer ».
- Toucher le chrono = pause ; bandeau « En pause · Reprendre » ; au retour après ≥ 20 min sans action : « Tu étais en pause ? » (oui = temps non compté).
- « Machine prise » : 1. Faire plus tard, 2. trois remplaçants (`SteroidCatalogue.alternatives`), 3. Passer. Aucun remplaçant : on le dit.
- Charge non saisie = `null`, jamais 0 ; « en attente » affiché tant que le serveur n'a pas confirmé.
- Plus de saisie libre du nom d'exercice : recherche tolérante + « Créer mon exercice » (`user_exercises`, clé `u-<uuid>`).
- Les nouvelles séances s'écrivent dans `workouts`, `workout_exercises`, `workout_set_logs` ; les tables V1 ne sont ni modifiées ni supprimées.
- Aucune écriture en base hors de l'app (copie `v2_copy_legacy()` relancée) sans accord explicite du propriétaire.

## Review Focus
1. Fermer l'app en pleine série puis la rouvrir (hors ligne) → même exercice, mêmes séries, chrono juste.
2. Compte sans cycle V2 (nouvel inscrit, invité) → un cycle est construit, jamais d'écran vide.
3. Exercice perso (`u-…`) dans la séance → nom affiché, aucun crash dans « Machine prise ».
4. Deux onglets/appareils : la file n'envoie jamais deux fois la même ligne (upsert sur `id`).
5. Terminer sans avoir tout validé → séance enregistrée, séries non faites non comptées.

### Task 1: `v2-cycle.js` — tests `scripts/v2-cycle.test.cjs`
**Produces:** `SteroidCycle.fromEngine(built, {uuid, userId}) → cycle` (forme `{id, sessions:[{id, position, code, title, focus, exercises:[{id, exercise_key, role, sets, reps_min, reps_max, rest_seconds}]}]}`, même forme que les lignes Supabase) ; `fromLegacyPlan(planWeek, Catalogue, opts) → cycle` (invité : jours non vides dans l'ordre) ; `lastPerformance(setLogs) → {[key]: {weight, reps}}` (dernière série validée par clé) ; `loadCycle(api, userId) → Promise<{cycle, workouts, last}>` (lit `cycles?status=eq.active`, `cycle_sessions`, `cycle_exercises`, 50 derniers `workouts` terminés, `workout_set_logs` récents) ; `nameOf(key, userExercises)`.
- [ ] Tests : `fromEngine` conserve l'ordre et les volumes ; `lastPerformance` ignore les séries non validées et garde la plus récente ; `weight:null` reste `null` ; `fromLegacyPlan` sur le plan d'exemple donne autant de séances que de jours non vides ; clé inconnue → `nameOf` renvoie le nom perso ou « Exercice ».
- [ ] Implémenter, tests verts, commit.

### Task 2: `ui-v2.js` — tests `scripts/ui-v2.test.cjs`
**Produces:** `SteroidUI.home({next, cycleProgress, week, pending})`, `session({workout, index, elapsed, paused, rest, names, last})`, `machineSheet({exercise, alternatives, names})`, `pausePrompt(minutes)`, `picker({query, results})`. Toutes renvoient une chaîne HTML échappée.
- [ ] Tests : accueil affiche titre, muscles, nb d'exercices, séries, durée, anneau d'avancée et la phrase du garde-fou quand `reason==='recovery'` avec « D'accord » / « Faire X quand même » ; séance : bouton `data-action="v2-set"` unique par série, « Machine prise » présent, bandeau pause quand `paused`, « Dernière fois : 80 kg × 8 », charge `null` affichée « — » ; panneau machine : ordre Plus tard → remplaçants → Passer, message si aucun remplaçant ; aucune chaîne ne contient d'emoji ni `onclick`.
- [ ] Implémenter, tests verts, commit.

### Task 3: Styles P1 — `steroid-v2.css`
- [ ] Classes `v2-*` d'après les maquettes V1a/V1b/V1c ; test `steroid-v2-ui.test.cjs` étendu : présence de `prefers-reduced-motion`, cibles `min-height:44px`.
- [ ] Commit.

### Task 4: Branchement dans `app.js` + `index.html`
- [ ] Charger `session-planner.js`, `workout-store.js`, `v2-cycle.js`, `ui-v2.js` avant `app.js` ; mettre à jour `sw.js` (`CACHE`).
- [ ] Au chargement du compte : `loadCycle` ; si aucun cycle → `buildCycle(réponses)` → insertion `cycles`/`cycle_sessions`/`cycle_exercises` (upsert, identifiants appareil) ; invité : cycle local depuis le plan V1, stocké sous `nolsprog-v2-cycle-guest`.
- [ ] Onglet Aujourd'hui → `SteroidUI.home` ; Démarrer → `store.start(session,{last})` ; actions `v2-set`, `v2-pause`, `v2-later`, `v2-skip`, `v2-sub`, `v2-finish`, `v2-rest-plus`, `v2-rest-skip`, `v2-next`, `v2-prev` ; `store.flush()` après chaque action (débounce 600 ms) et au retour du réseau ; reprise de la séance au lancement.
- [ ] API d'envoi : `upsert(table, rows)` = `cloud(table+'?on_conflict=id',{method:'POST',prefer:'resolution=merge-duplicates',body:rows})`.
- [ ] `smoke.cjs` : l'app démarre en invité et affiche « Prochaine séance ». Commit.

### Task 4b: Progrès branché sur V2 *(choix du propriétaire)*
**Produces:** `SteroidCycle.progress(setLogs, workouts) → {totals:{sets, volume}, byKey:{[key]: [{date, weight, reps, volume}]}}` (séries validées seulement, une entrée par séance) ; `SteroidUI.progress({progress, selected, metric, names})`.
- [ ] Tests : séries non validées ou charge `null` exclues de la charge max ; un exercice remplacé reste sous sa propre clé ; historique copié du lot 1 inclus (lecture de `workout_set_logs`).
- [ ] Onglet Progrès → `SteroidUI.progress` (compte : Supabase + cache ; invité : historique local `nolsprog-v2-history-guest`). Commit.

### Task 5: Catalogue dans l'édition du programme
- [ ] Remplacer le champ nom libre par `SteroidUI.picker` (recherche `SteroidCatalogue.search`) ; « Créer mon exercice » (nom + mouvement + muscle) → `user_exercises`.
- [ ] Test : plus aucun `<input` de nom d'exercice libre dans l'écran d'édition. Commit.

### Task 6: Documentation, PR, test sur téléphone
- [ ] `CLAUDE.md` (avancement, nouveaux modules) ; `./scripts/test-all.sh` vert ; PR « V2 lot 3b ».
- [ ] **POINT D'ARRÊT** : test sur téléphone par le propriétaire, puis accord pour relancer `select public.v2_copy_legacy()` (récupère les séances V1 faites depuis le lot 1) juste avant la fusion.
