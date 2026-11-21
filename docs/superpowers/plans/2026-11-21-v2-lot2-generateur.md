# V2 — Lot 2 « Générateur et cycles » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le moteur existant produit, une fois par cycle, une suite de séances cohérente identifiée par les clés du catalogue, vérifiée sur toutes les combinaisons du questionnaire.

**Architecture:** On fait évoluer `program-engine.js` (pas de moteur parallèle). `buildProgram(p, week)` garde exactement son comportement V1 (l'app actuelle s'en sert pour les programmes en cours). Une option `{version: 2}` active les corrections ; `buildCycle(p)` s'appuie dessus et renvoie la suite de séances, la photographie et les clés du catalogue. Un test « matrice » vérifie les invariants sur les 4 050 combinaisons.

**Tech Stack:** JS sans build, Node 22, `exercise-catalogue.js` (lot 1), `sport-rules.js` (VOLUME).

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` §6.1, §6.6.

## Global Constraints

- `buildProgram(p, week)` sans option : sortie V1 strictement identique (programmes actifs intouchés).
- Déterministe : mêmes réponses + même `ENGINE_VERSION` → même cycle (pas d'identifiant aléatoire dans `buildCycle`).
- Volume hebdomadaire cible par groupe (séries) = `SteroidRules.VOLUME[level]` : débutant 6–8, intermédiaire 8–12, avancé 10–16.
- Durée estimée d'une séance ≤ durée demandée × 1,1.
- `ENGINE_VERSION = 'v2.0'`.

## Review Focus

1. Programme PPL ou Upper/Lower en rotation continue (ex. PPL à 4 séances) → la suite ne doit jamais enchaîner deux fois le même type de séance au bouclage.
2. Mode « N séances par semaine » sans jours choisis (`days` vide) → un cycle valide, `preferredDays = null`.
3. Exercices à éviter qui vident un mouvement entier → message clair, pas de séance vide.
4. Séance de 30 min → le volume minimal n'est pas forcé au-delà du temps disponible.
5. Exercice de base barre (`compound` 3) → traité comme un exercice de base (séries, repos), pas comme une isolation.

---

### Task 1: Corrections versionnées du moteur

**Files:** Modify `program-engine.js` · Test `scripts/engine-v2.test.cjs`

**Interfaces:** Produces `buildProgram(p, weekIndex = 0, {version = 1} = {})`, `ENGINE_VERSION`, `VOLUME` (identique à `SteroidRules.VOLUME`).

- [ ] Test (échoue d'abord) : pour toutes les combinaisons méthode × jours × niveau × matériel × objectif × durée {30,60,90}, `buildProgram(p,0)` est identique à la sortie V1 de référence (empreinte calculée avant modification et figée dans le test) ; avec `{version:2}` : base avant finition dans chaque séance ; développé couché barre a les séries et le repos d'un exercice de base ; volume hebdo Pectoraux/Dos/Jambes ≥ minimum du niveau quand la durée ≥ 60 min et ≥ 3 séances ; durée estimée ≤ durée × 1,1.
- [ ] Implémenter : `compound >= 2` = polyarticulaire (v2), tri stable base → finition → gainage (v2), complément de volume par ajout de séries (max 5 par exercice, priorité aux exercices de base du groupe en déficit) tant que la séance reste dans le budget (v2).
- [ ] Tests verts, suite complète verte, commit.

### Task 2: `buildCycle` — suite de séances et photographie

**Files:** Modify `program-engine.js` · Test `scripts/engine-cycle.test.cjs`

**Interfaces:** Produces `buildCycle(p) => {engineVersion, method, weeks: 6, sessionsPerWeek, preferredDays: number[]|null, answers, sessions: [{position, code, title, focus, exercises: [{key, name, role, sets, repsMin, repsMax, rest}]}]}`.

- [ ] Test (échoue d'abord) : longueur de suite = 3 pour PPL en rotation, 2 pour Upper/Lower en rotation, sinon = nombre de séances ; jamais deux séances de même type consécutives au bouclage pour PPL/Upper-Lower ; `days: []` → cycle valide et `preferredDays === null` ; toutes les clés existent dans le catalogue ; `reps '6–10'` → 6/10, `'25–45 s'` → 25/45 ; `answers` est une copie (modifier l'objet passé ensuite ne change pas le cycle) ; deux appels → JSON identiques.
- [ ] Implémenter (jours par défaut si aucun : 2 → [0,3], 3 → [0,2,4], 4 → [0,1,3,4], 5 → [0,1,2,4,5], 6 → [0..5]).
- [ ] Tests verts, suite complète verte, commit, PR.
