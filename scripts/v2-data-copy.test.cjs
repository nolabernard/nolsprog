// Copie V1 → V2 : uniquement des ajouts, rejouable, réservée à l'administrateur.
const assert=require('assert');
const fs=require('fs');
const file='supabase/migrations/20261121181000_v2_data_copy.sql';
assert(fs.existsSync(file),'migration de copie absente');
const low=fs.readFileSync(file,'utf8').toLowerCase();
assert(low.includes('create or replace function public.v2_copy_legacy()'),'fonction de copie');
assert(low.includes('security definer')&&low.includes("set search_path = ''"),'security definer + search_path vide');
assert(/revoke all on function public\.v2_copy_legacy\(\) from public, anon, authenticated/.test(low),'non exécutable par les utilisateurs');
assert(!/\b(delete|truncate|drop)\b/.test(low),'aucune suppression');
assert(!/update\s+public\.(user_programs|workout_sets|workout_sessions|user_profiles)/.test(low),'tables V1 en lecture seule');
const inserts=low.match(/insert into public\.\w+/g)||[];
assert(inserts.length>=6,'insertions V2');
assert.equal((low.match(/on conflict[^;]*do nothing/g)||[]).length,inserts.length,'chaque insertion est rejouable');
for(const t of ['cycles','cycle_sessions','cycle_exercises','workouts','workout_exercises','workout_set_logs','user_exercises'])assert(low.includes('insert into public.'+t),t);
assert(low.includes("'v1-legacy'"),'version du moteur marquée');
assert(low.includes('sessionoverrides'),'les noms modifiés pour une séance sont pris en compte');
console.log('V2 data copy checks passed');
