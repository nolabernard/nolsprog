# V2 — Lot 3a « Logique de séance » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Toute la logique V2 de la séance, sans interface : prochaine séance et garde-fou, remplaçants, séance en cours (séries, pause, plus tard, remplacement, fin), file d'envoi vers les tables Supabase V2.

**Architecture:** Trois modules purs (UMD, testés sous Node, sans DOM) : `exercise-catalogue.js` (+ `alternatives`), `session-planner.js` (prochaine séance), `workout-store.js` (séance en cours + file d'attente, stockage et API injectés). L'écran (lot 3b) ne fera qu'appeler ces fonctions.

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` §6.1, §6.3, §6.4, §6.5, §8.

## Global Constraints
- Statuts d'exercice limités au schéma : `done` (dans la séance), `skipped`, `later` ; « fait » se déduit des séries validées.
- Identifiants générés sur l'appareil (UUID v4) → envois idempotents (upsert).
- Ordre d'envoi : `workouts` → `workout_exercises` → `workout_set_logs` ; une ligne n'est retirée de la file qu'après confirmation du serveur.
- Charge non saisie = `null`. Durée = fin − début − pauses.
- Garde-fou : 48 h, sur les groupes musculaires travaillés en exercice de base ; toujours une phrase d'explication.
- Remplaçant : même `pattern`, même `role`, matériel disponible, hors « à éviter », pas déjà dans la séance ; 3 maximum.

## Review Focus
1. Hors ligne puis retour du réseau : rien n'est perdu ni envoyé deux fois.
2. Pause oubliée puis fin de séance : la durée n'inclut pas la pause en cours.
3. « Plus tard » sur le dernier exercice : aucun effet.
4. Aucune séance faite dans le cycle : la première séance est proposée.
5. Toutes les séances du cycle en conflit de récupération : on propose quand même la suivante, avec l'explication.

### Task 1: `alternatives` dans le catalogue — tests `scripts/catalogue-alternatives.test.cjs`
### Task 2: `session-planner.js` (`nextSession`) — tests `scripts/session-planner.test.cjs`
### Task 3: `workout-store.js` (séance + file) — tests `scripts/workout-store.test.cjs`
