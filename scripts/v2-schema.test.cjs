// Schéma V2 : tables additives, protégées par RLS, sans toucher aux tables V1.
const assert=require('assert');
const fs=require('fs');
const file='supabase/migrations/20261121173448_v2_schema.sql';
assert(fs.existsSync(file),'migration de schéma absente');
const sql=fs.readFileSync(file,'utf8'),low=sql.toLowerCase();
const tables=['cycles','cycle_sessions','cycle_exercises','cycle_cardio','workouts','workout_exercises','workout_set_logs','cardio_logs','user_exercises'];
for(const t of tables){
 assert(low.includes(`create table if not exists public.${t} (`),`table ${t}`);
 assert(low.includes(`alter table public.${t} enable row level security`),`RLS ${t}`);
 for(const cmd of ['select','insert','update','delete'])assert(new RegExp(`'${t}_${cmd}_own'`).test(low),`politique ${cmd} ${t}`);
 const block=low.slice(low.indexOf(`create table if not exists public.${t} (`));
 assert(/user_id uuid not null references auth\.users\(id\) on delete cascade/.test(block.slice(0,block.indexOf(');'))),`user_id ${t}`);
 assert(low.includes(`on public.${t} for each row execute function public.steroid_touch_updated_at()`),`trigger ${t}`);
}
assert(low.includes('create table if not exists public.v2_name_map ('),'table de correspondance');
assert(low.includes('alter table public.v2_name_map enable row level security'),'RLS v2_name_map');
assert(!/\bdrop\s/.test(low),'aucun drop');
assert(!/alter table public\.(user_programs|workout_sets|workout_sessions|user_profiles)\b/.test(low),'tables V1 intactes');
assert(!/grant[^;]*\banon\b/.test(low),'aucun droit anonyme');
// Règles métier encodées en contraintes.
for(const s of ["weeks between 6 and 8","sessions_per_week between 1 and 7","status in ('proposed','active','archived')","status in ('in_progress','completed','abandoned')","status in ('done','skipped','later')","rpe between 1 and 10","set_number between 1 and 20","rir between 0 and 5","minutes between 1 and 600","where status = 'active'","unique (workout_exercise_id, set_number)","unique (user_id, legacy_week, legacy_day)"])assert(low.includes(s),s);
assert(/weight numeric check \(weight is null or weight >= 0\)/.test(low),'charge manquante ≠ 0');
console.log('V2 schema checks passed');
