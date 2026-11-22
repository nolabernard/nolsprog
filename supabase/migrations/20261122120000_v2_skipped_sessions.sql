-- STEROID V2 — séance passée (« Je ne fais pas cette séance »).
-- Une séance passée est notée comme telle : elle fait avancer la suite, ne compte ni comme séance faite
-- ni dans les progrès ou les records, et ne déclenche pas de rappel ce jour-là.
alter table public.workouts drop constraint if exists workouts_status_check;
alter table public.workouts add constraint workouts_status_check
  check (status = any (array['in_progress'::text, 'completed'::text, 'abandoned'::text, 'skipped'::text]));

alter table public.workouts add column if not exists skip_reason text;
alter table public.workouts drop constraint if exists workouts_skip_reason_check;
alter table public.workouts add constraint workouts_skip_reason_check
  check (skip_reason is null or skip_reason = any (array['malade'::text, 'douleur'::text, 'temps'::text, 'autre'::text]));
