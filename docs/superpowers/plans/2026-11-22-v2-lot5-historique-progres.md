# V2 — Lot 5 « Historique et progrès » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Historique par clé d'exercice, comparaison séance par séance, records fiables, conseils de progression (double progression) fondés sur les séries réellement validées.

**Architecture:** Nouveau module pur `v2-history.js` (`SteroidHistory`) ; `v2-cycle.js` lit en plus le numéro de série, le ressenti, la substitution et le titre de séance ; rendu dans `ui-v2.js`, actions dans `app-v2.js`. Aucune migration.

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` §6.2, §6.3, §6.6, §10 lot 5 ; cahier des charges §3.3, §3.4, §4.7.

## Global Constraints
- Tout se calcule **par clé** : un exercice remplacé garde son propre historique (jamais fusionné avec l'exercice d'origine).
- Seules les séries validées comptent ; record = série validée avec charge et répétitions ; pas de record à la première séance d'un exercice.
- Conseil = recommandation, jamais modification automatique (les cases restent préremplies avec la dernière performance).
- Conseil seulement si la dernière séance de cette clé contient des séries validées ; charge manquante ≠ 0 kg.
- Ressenti 10/10 (échec) : pas de hausse conseillée.

## Review Focus
1. Remplacement ponctuel : séries rangées sous la nouvelle clé, mention « à la place de … », aucune fusion.
2. Première séance d'un exercice : aucun record annoncé.
3. Séries sans charge : ni record ni conseil de charge.
4. Données en cache d'avant le lot 5 (sans numéro de série) : affichage sans erreur.

### Task 1: `v2-history.js`
**Produces:** `sessions(workouts, setLogs, {titles, cardioLogs})`, `exercise(key, setLogs, workouts)`, `records(setLogs, workouts)`, `newRecords(workoutId, setLogs, workouts)`, `advice(plan, setLogs, workouts, key)`.
- [ ] Tests `scripts/v2-history.test.cjs`, implémenter, commit.

### Task 2: Données
- [ ] `loadCycle` : `set_number`, `rir`, `workout_exercises(workout_id,position,substituted_from_key,rpe)`, titre de séance (`cycle_sessions(title)`).
- [ ] Fin de séance locale : mêmes champs. Tests `v2-cycle`/`app-v2`. Commit.

### Task 3: Écrans
- [ ] Progrès : onglets « Exercices » / « Séances » ; exercice : graphique, record, conseil, séance par séance avec écart ; séances : liste puis détail.
- [ ] Séance : ligne « Conseil » sous « Dernière fois ». Fin de séance : nouveaux records. Accueil : dernier record.
- [ ] Tests `ui-v2`, `app-v2`, `steroid-v2-ui`. Commit.

### Task 4: Vérification
- [ ] `./scripts/test-all.sh`, rendu mobile, relecture indépendante, `CLAUDE.md`, PR.
