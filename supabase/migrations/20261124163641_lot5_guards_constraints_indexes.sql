-- Garde-fou : un appareil en retard (révision plus ancienne) ne peut plus écraser une séance plus récente.
-- La mise à jour est ignorée sans erreur, pour ne pas bloquer la file d'envoi de l'appareil.
create or replace function public.workouts_keep_latest_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.revision is not null and old.revision is not null and new.revision < old.revision then
    return old;
  end if;
  return new;
end $$;
drop trigger if exists workouts_keep_latest_revision on public.workouts;
create trigger workouts_keep_latest_revision before update on public.workouts
for each row execute function public.workouts_keep_latest_revision();

-- Contraintes
alter table public.workouts add constraint workouts_ended_after_started check (ended_at is null or ended_at >= started_at);
alter table public.workouts add constraint workouts_skip_reason_only_skipped check (skip_reason is null or status = 'skipped');

-- Index des clés étrangères (et de l'historique)
create index if not exists cardio_logs_cycle_id_idx on public.cardio_logs(cycle_id);
create index if not exists cardio_logs_user_id_idx on public.cardio_logs(user_id);
create index if not exists cardio_logs_workout_id_idx on public.cardio_logs(workout_id);
create index if not exists cycle_cardio_cycle_id_idx on public.cycle_cardio(cycle_id);
create index if not exists cycle_cardio_user_id_idx on public.cycle_cardio(user_id);
create index if not exists cycle_exercises_user_id_idx on public.cycle_exercises(user_id);
create index if not exists cycle_sessions_user_id_idx on public.cycle_sessions(user_id);
create index if not exists workout_exercises_cycle_exercise_id_idx on public.workout_exercises(cycle_exercise_id);
create index if not exists workout_exercises_user_id_idx on public.workout_exercises(user_id);
create index if not exists workouts_cycle_id_idx on public.workouts(cycle_id);
create index if not exists workouts_cycle_session_id_idx on public.workouts(cycle_session_id);

-- Droits : les visiteurs non connectés n'ont rien à faire sur les abonnements ; pas de TRUNCATE/TRIGGER/REFERENCES pour les comptes.
revoke all on public.push_subscriptions from anon;
revoke truncate, trigger, references on public.push_subscriptions from authenticated;
