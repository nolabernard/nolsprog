# V2 — Lot 1 « Fondations » : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à chaque exercice une clé permanente, créer les tables V2 dans Supabase et y copier les données existantes sans rien perdre ni modifier.

**Architecture:** Un module pur `exercise-catalogue.js` (clés, alias, rôles, recherche tolérante) chargé avant le moteur. Deux migrations SQL versionnées dans `supabase/migrations/` : le schéma V2 (tables additives + RLS), puis la copie des données V1 → V2, idempotente et testée à blanc. Une table de correspondance nom → clé, calculée par un script Node et validée par le propriétaire avant la copie. L'app V1 n'est pas modifiée dans ce lot : elle continue d'écrire dans les anciennes tables ; la copie sera relancée au basculement (lot 3).

**Tech Stack:** JavaScript sans build (UMD global + `module.exports`), Node 22 pour les tests (`node:test`, `assert`), Postgres 17 / Supabase (RLS), outils MCP Supabase (`execute_sql`, `apply_migration`).

**Spec:** `docs/superpowers/specs/2026-11-21-steroid-v2-design.md` (sections 6.2, 7, 10 lot 1).

## Global Constraints

- Ne rien supprimer ni modifier dans `user_programs`, `workout_sets`, `workout_sessions`, `user_profiles`.
- Toute table V2 : `user_id uuid not null references auth.users(id) on delete cascade`, RLS activée, 4 politiques `(select auth.uid()) = user_id` (select/insert/update/delete) pour `authenticated`, aucun droit pour `anon`, trigger `public.steroid_touch_updated_at()` sur `updated_at`.
- Clés d'exercice : minuscules ASCII, chiffres et tirets (`^[a-z0-9]+(-[a-z0-9]+)*$`), jamais réutilisées ; exercices perso : `u-<uuid>`.
- Rôles : `compound` 3 → `base`, 2 → `secondaire`, 1 → `finition`.
- Charge manquante reste `null`, jamais `0`.
- Aucune migration appliquée à la base sans accord explicite du propriétaire ; la copie de données s'exécute d'abord à blanc (transaction annulée).
- Workflow `CLAUDE.md` : branche `feature/v2-fondations-20261121`, `./scripts/test-all.sh` vert avant chaque push, PR en français.

## Review Focus

1. Deux noms différents tapés pour le même exercice (« Développé incliné Smith » / « developpe incline smith ») → une seule clé ; deux exercices réellement différents → jamais la même clé.
2. Un même nom présent dans plusieurs listes de matériel du moteur (ex. « Développé épaules haltères » en `gym` et `dumbbells`) → une seule entrée, `equipment` = les deux.
3. Relancer la migration de données deux fois → mêmes comptes, aucun doublon.
4. Une série dont l'exercice a été renommé à la main pour une séance (`sessionOverrides`) → rattachée au nom saisi pour cette séance, pas au nom du programme.
5. Un utilisateur sans aucune série ni séance (compte non confirmé) → aucune ligne V2 parasite, aucune erreur.

---

### Task 1: Catalogue à clés et recherche tolérante

**Files:**
- Create: `exercise-catalogue.js`
- Create: `scripts/exercise-catalogue.test.cjs`
- Modify: `index.html` (charger `exercise-catalogue.js` juste avant `program-engine.js`)
- Modify: `CLAUDE.md` (section Structure)

**Interfaces:**
- Produces (global `SteroidCatalogue` et `module.exports`) :
  - `CATALOGUE: Array<{key, name, aliases: string[], pattern, muscle, role: 'base'|'secondaire'|'finition', equipment: string[]}>`
  - `normalize(text: string) => string` — minuscules, sans accents, ponctuation → espace, espaces réduits.
  - `byKey(key: string) => entry|null`
  - `search(query: string, {limit = 8, equipment = null} = {}) => Array<{entry, score}>` triés par score décroissant.
  - `resolveName(name: string) => {key, method: 'exact'|'alias'|'fuzzy', score} | null` — `null` si score < 0,82.

- [ ] **Step 1: Écrire les tests**

```js
const C=require('../exercise-catalogue.js');
// toutes les entrées du moteur ont une clé unique
const eng=require('fs').readFileSync('program-engine.js','utf8');
const names=[...new Set([...eng.matchAll(/\['([^']+)','[a-zA-Z]+','[^']+','[a-z]+',\d\]/g)].map(m=>m[1]))];
for(const n of names) assert.equal(C.resolveName(n)?.method,'exact',n);
assert.equal(new Set(C.CATALOGUE.map(e=>e.key)).size,C.CATALOGUE.length);
assert(C.CATALOGUE.every(e=>/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.key)));
assert.deepEqual(C.byKey(C.resolveName('Développé épaules haltères').key).equipment.sort(),['dumbbells','gym']);
assert.equal(C.byKey(C.resolveName('Hack squat').key).role,'base');
assert.equal(C.byKey(C.resolveName('Pec deck').key).role,'finition');
// tolérance
assert.equal(C.search('dvlp couche')[0].entry.name.startsWith('Développé couché'),true);
assert.equal(C.resolveName('developpe incline halteres').key,C.resolveName('Développé incliné haltères').key);
assert.equal(C.resolveName('butterfly').key,C.resolveName('Pec deck').key);          // alias
assert.equal(C.resolveName('hack  SQUAT').key,C.resolveName('Hack squat').key);
assert.equal(C.resolveName('squeese press'),null);                                    // inconnu → exercice perso
assert.notEqual(C.resolveName('Leg curl assis').key,C.resolveName('Leg extension').key);
```

- [ ] **Step 2: Lancer** `node scripts/exercise-catalogue.test.cjs` → échec « Cannot find module ».

- [ ] **Step 3: Écrire `exercise-catalogue.js`**
  Reprendre les 59 lignes du catalogue de `program-engine.js` (dédoublonnées par nom, `equipment` fusionné, `any` et `none` conservés tels quels), écrire les clés **en dur** (pas générées à l'exécution) : slug du nom (ex. `developpe-couche-barre`). Alias de départ : `butterfly`, `pec fly` → Pec deck ; `smith` / `barre guidée` → aucune entrée (ne pas inventer). Score de `search`/`resolveName` : 1 si égalité normalisée ou alias ; sinon similarité de Dice sur bigrammes des formes normalisées, + bonus 0,1 si chaque mot de la requête est préfixe d'un mot du nom ; plafonné à 0,99.

- [ ] **Step 4: Lancer** `node scripts/exercise-catalogue.test.cjs` puis `./scripts/test-all.sh` → tout vert.

- [ ] **Step 5: Commit** `git commit -m "Catalogue d'exercices à clés permanentes et recherche tolérante"`

### Task 2: Schéma V2 (migration additive)

**Files:**
- Create: `supabase/migrations/20261121180000_v2_schema.sql`
- Create: `scripts/v2-schema.test.cjs`

**Interfaces:**
- Produces : tables `cycles`, `cycle_sessions`, `cycle_exercises`, `cycle_cardio`, `workouts`, `workout_exercises`, `workout_set_logs`, `cardio_logs`, `user_exercises` (colonnes exactes : spec §7), plus `v2_name_map(user_id uuid, raw_name text, exercise_key text, method text, primary key(user_id, raw_name))` (table technique de migration, RLS sans politique = invisible pour l'app).
- Contraintes à écrire : `cycles.weeks between 6 and 8`, `sessions_per_week between 1 and 7`, `status in ('proposed','active','archived')`, index unique partiel `(user_id) where status='active'` ; `workouts.status in ('in_progress','completed','abandoned')`, unique `(user_id, legacy_week, legacy_day)` ; `workout_exercises.status in ('done','skipped','later')`, `rpe between 1 and 10` ; `workout_set_logs` unique `(workout_exercise_id, set_number)`, `set_number between 1 and 20`, `weight >= 0` nullable, `reps between 0 and 1000` nullable, `rir between 0 and 5` nullable ; `cardio_logs.type in ('marche','course','velo','elliptique','rameur','natation','escaliers','autre')`, `minutes between 1 and 600` ; index `(user_id, exercise_key, created_at desc)` sur `workout_set_logs`, `(user_id, ended_at desc)` sur `workouts`.

- [ ] **Step 1: Écrire le test statique** : pour chacune des 9 tables métier, le SQL contient `create table if not exists public.<t>`, `enable row level security`, 4 `create policy` sur `<t>`, `references auth.users(id) on delete cascade` et un trigger `steroid_touch_updated_at` ; le fichier ne contient ni `drop `, ni `alter table public.user_programs|workout_sets|workout_sessions|user_profiles`, ni `grant ... to anon`.
- [ ] **Step 2: Lancer** `node scripts/v2-schema.test.cjs` → échec (fichier absent).
- [ ] **Step 3: Écrire la migration** (idempotente : `if not exists`, politiques créées dans un `do $$ ... $$` qui vérifie `pg_policies`).
- [ ] **Step 4: Lancer** le test puis `./scripts/test-all.sh` → vert.
- [ ] **Step 5: Vérifier la syntaxe sur la base sans rien écrire** : `execute_sql` avec `begin; <contenu>; rollback;` → aucune erreur.
- [ ] **Step 6: Commit** `git commit -m "Schéma Supabase V2 additif avec RLS"`

### Task 3: Table de correspondance nom → clé

**Files:**
- Create: `scripts/v2/build-name-map.cjs` (CLI : lit un JSON `[{user_id, raw_name}]` sur l'entrée standard, écrit `[{user_id, raw_name, exercise_key, method, score}]` et un rapport lisible)
- Create: `scripts/v2-name-map.test.cjs`

**Interfaces:**
- Consumes : `resolveName`, `normalize` (Task 1).
- Produces : `buildNameMap(rows) => mapRows` exporté ; pour un nom non résolu : `exercise_key = 'u-' + uuid v5 déterministe (namespace fixe, valeur user_id + normalize(raw_name))`, `method = 'custom'` ; deux noms identiques une fois normalisés pour un même utilisateur → même clé perso.

- [ ] **Step 1: Tests** : `butterfly` → clé Pec deck (`alias`) ; `développer coucher inclinée` → `method !== 'exact'` et score présent ; `squeese press` et `SQUEESE  press` (même user) → même `u-…` ; même nom pour deux users → deux clés perso différentes ; relancer donne exactement le même résultat (déterminisme).
- [ ] **Step 2: Lancer** → échec. **Step 3: Implémenter.** **Step 4: Lancer** → vert.
- [ ] **Step 5: Produire la liste réelle** : extraire les noms (requête du design : plan de base, `weeklyPlans`, `sessionOverrides`, `__extra`) avec `execute_sql`, passer dans le script, enregistrer `docs/v2-correspondances.md` (tableau nom saisi → exercice retenu → méthode).
- [ ] **Step 6: Commit**, puis **POINT D'ARRÊT : montrer `docs/v2-correspondances.md` au propriétaire** et corriger les lignes qu'il conteste (ajout d'alias dans le catalogue ou forçage manuel dans un fichier `scripts/v2/name-overrides.json`).

### Task 4: Copie des données V1 → V2

**Files:**
- Create: `supabase/migrations/20261121181000_v2_data_copy.sql` (fonction `public.v2_copy_legacy()` `security definer`, `search_path=''`, exécutable seulement par `postgres`, retourne un jsonb de comptes)
- Create: `scripts/v2-data-copy.test.cjs` (test statique : pas de `delete`/`update`/`truncate` sur les tables V1, `insert ... on conflict do nothing` partout, `revoke execute ... from public, anon, authenticated`)

**Interfaces:**
- Consumes : tables Task 2, `v2_name_map` rempli (Task 3).
- Produces : `select public.v2_copy_legacy()` → `{"cycles":n,"sessions":n,"workouts":n,"exercises":n,"sets":n,"custom_exercises":n}`.

Règles de copie :
- Un cycle `active` par `user_programs` : `method` = `user_profiles.method` (défaut `auto`), `weeks` 6, `sessions_per_week` = nombre de jours non vides de la semaine de base, `preferred_days` = leurs index, `answers_snapshot` = `user_profiles.answers`, `engine_version` = `'v1-legacy'`, `started_at` = `start_date`.
- `cycle_sessions` = jours non vides du plan de base dans l'ordre ; `cycle_exercises` = leurs exercices avec la clé de `v2_name_map`, reps `'6–10'` → `reps_min` 6 / `reps_max` 10 (nombre seul → min = max).
- `workouts` = un par (user, week_number, day_index) présent dans `workout_sets` ou `workout_sessions` ; dates prises dans `workout_sessions` sinon `start_date + (week-1)*7 + day` à 12:00 UTC ; `status` `completed` ; `legacy_week/legacy_day` remplis.
- `workout_exercises` + `workout_set_logs` : nom = override de séance si présent, sinon nom du plan de la semaine (`weeklyPlans[w]`, semaine 1 = plan de base) ; clé via `v2_name_map`.
- `user_exercises` pour chaque `method = 'custom'`.

- [ ] **Step 1: Test statique** → échec. **Step 2: Écrire la migration.** **Step 3: Test** → vert.
- [ ] **Step 4: Essai à blanc** avec `execute_sql` : `begin; <migrations Task 2 + Task 4>; <insert v2_name_map>; select public.v2_copy_legacy(); select public.v2_copy_legacy(); select count(*) from workout_set_logs; rollback;` → `sets` = 223 au premier appel, 0 nouvelle ligne au second, total 223.
- [ ] **Step 5: Commit**, push, PR « V2 lot 1 : fondations » avec les comptes de l'essai à blanc.
- [ ] **Step 6: POINT D'ARRÊT : accord du propriétaire**, puis `apply_migration` (schéma), insertion de `v2_name_map`, `apply_migration` (copie), `select public.v2_copy_legacy()`, `get_advisors security` → aucune nouvelle alerte ; vérifier que les 4 tables V1 ont exactement les mêmes comptes qu'avant.
