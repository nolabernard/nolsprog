-- STEROID V2 — raison « pas envie » pour une séance passée.
alter table public.workouts drop constraint if exists workouts_skip_reason_check;
alter table public.workouts add constraint workouts_skip_reason_check
  check (skip_reason is null or skip_reason = any (array['malade'::text, 'douleur'::text, 'temps'::text, 'envie'::text, 'autre'::text]));
