-- STÉROÏDE V2 : schéma additif. Ne modifie ni ne supprime aucune table V1.
-- Idempotent : peut être relancé sans effet.

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'proposed' check (status in ('proposed','active','archived')),
  method text not null default 'auto',
  weeks int not null default 6 check (weeks between 6 and 8),
  sessions_per_week int not null check (sessions_per_week between 1 and 7),
  preferred_days int[] check (preferred_days is null or preferred_days <@ array[0,1,2,3,4,5,6]),
  answers_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(answers_snapshot) = 'object'),
  engine_version text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cycles enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycles' and policyname = 'cycles_select_own') then create policy "cycles_select_own" on public.cycles for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycles' and policyname = 'cycles_insert_own') then create policy "cycles_insert_own" on public.cycles for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycles' and policyname = 'cycles_update_own') then create policy "cycles_update_own" on public.cycles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycles' and policyname = 'cycles_delete_own') then create policy "cycles_delete_own" on public.cycles for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_cycles_updated_at') then create trigger steroid_cycles_updated_at before update on public.cycles for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.cycles from anon;
grant select, insert, update, delete on public.cycles to authenticated;

create table if not exists public.cycle_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  position int not null check (position >= 0),
  code text not null,
  title text not null,
  focus text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, position)
);
alter table public.cycle_sessions enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_sessions' and policyname = 'cycle_sessions_select_own') then create policy "cycle_sessions_select_own" on public.cycle_sessions for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_sessions' and policyname = 'cycle_sessions_insert_own') then create policy "cycle_sessions_insert_own" on public.cycle_sessions for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_sessions' and policyname = 'cycle_sessions_update_own') then create policy "cycle_sessions_update_own" on public.cycle_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_sessions' and policyname = 'cycle_sessions_delete_own') then create policy "cycle_sessions_delete_own" on public.cycle_sessions for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_cycle_sessions_updated_at') then create trigger steroid_cycle_sessions_updated_at before update on public.cycle_sessions for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.cycle_sessions from anon;
grant select, insert, update, delete on public.cycle_sessions to authenticated;

create table if not exists public.cycle_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_session_id uuid not null references public.cycle_sessions(id) on delete cascade,
  position int not null check (position >= 0),
  exercise_key text not null,
  role text not null check (role in ('base','secondaire','finition')),
  sets int not null check (sets between 1 and 20),
  reps_min int not null check (reps_min between 1 and 100),
  reps_max int not null check (reps_max between 1 and 100),
  rest_seconds int not null check (rest_seconds between 0 and 3600),
  replaced_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reps_min <= reps_max),
  unique (cycle_session_id, position)
);
alter table public.cycle_exercises enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_exercises' and policyname = 'cycle_exercises_select_own') then create policy "cycle_exercises_select_own" on public.cycle_exercises for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_exercises' and policyname = 'cycle_exercises_insert_own') then create policy "cycle_exercises_insert_own" on public.cycle_exercises for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_exercises' and policyname = 'cycle_exercises_update_own') then create policy "cycle_exercises_update_own" on public.cycle_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_exercises' and policyname = 'cycle_exercises_delete_own') then create policy "cycle_exercises_delete_own" on public.cycle_exercises for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_cycle_exercises_updated_at') then create trigger steroid_cycle_exercises_updated_at before update on public.cycle_exercises for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.cycle_exercises from anon;
grant select, insert, update, delete on public.cycle_exercises to authenticated;

create table if not exists public.cycle_cardio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  type text not null check (type in ('marche','course','velo','elliptique','rameur','natation','escaliers','autre')),
  minutes int not null check (minutes between 1 and 600),
  per_week int not null check (per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cycle_cardio enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_cardio' and policyname = 'cycle_cardio_select_own') then create policy "cycle_cardio_select_own" on public.cycle_cardio for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_cardio' and policyname = 'cycle_cardio_insert_own') then create policy "cycle_cardio_insert_own" on public.cycle_cardio for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_cardio' and policyname = 'cycle_cardio_update_own') then create policy "cycle_cardio_update_own" on public.cycle_cardio for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cycle_cardio' and policyname = 'cycle_cardio_delete_own') then create policy "cycle_cardio_delete_own" on public.cycle_cardio for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_cycle_cardio_updated_at') then create trigger steroid_cycle_cardio_updated_at before update on public.cycle_cardio for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.cycle_cardio from anon;
grant select, insert, update, delete on public.cycle_cardio to authenticated;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.cycles(id) on delete set null,
  cycle_session_id uuid references public.cycle_sessions(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_at timestamptz,
  paused_seconds int not null default 0 check (paused_seconds >= 0),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  calories_estimate numeric check (calories_estimate is null or calories_estimate >= 0),
  revision bigint not null default 1,
  legacy_week int,
  legacy_day int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, legacy_week, legacy_day)
);
alter table public.workouts enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'workouts_select_own') then create policy "workouts_select_own" on public.workouts for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'workouts_insert_own') then create policy "workouts_insert_own" on public.workouts for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'workouts_update_own') then create policy "workouts_update_own" on public.workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'workouts_delete_own') then create policy "workouts_delete_own" on public.workouts for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_workouts_updated_at') then create trigger steroid_workouts_updated_at before update on public.workouts for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.workouts from anon;
grant select, insert, update, delete on public.workouts to authenticated;

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  position int not null check (position >= 0),
  exercise_key text not null,
  cycle_exercise_id uuid references public.cycle_exercises(id) on delete set null,
  substituted_from_key text,
  status text not null default 'done' check (status in ('done','skipped','later')),
  rpe int check (rpe is null or rpe between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, position)
);
alter table public.workout_exercises enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_exercises' and policyname = 'workout_exercises_select_own') then create policy "workout_exercises_select_own" on public.workout_exercises for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_exercises' and policyname = 'workout_exercises_insert_own') then create policy "workout_exercises_insert_own" on public.workout_exercises for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_exercises' and policyname = 'workout_exercises_update_own') then create policy "workout_exercises_update_own" on public.workout_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_exercises' and policyname = 'workout_exercises_delete_own') then create policy "workout_exercises_delete_own" on public.workout_exercises for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_workout_exercises_updated_at') then create trigger steroid_workout_exercises_updated_at before update on public.workout_exercises for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.workout_exercises from anon;
grant select, insert, update, delete on public.workout_exercises to authenticated;

create table if not exists public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  exercise_key text not null,
  set_number int not null check (set_number between 1 and 20),
  weight numeric check (weight is null or weight >= 0),
  reps int check (reps is null or reps between 0 and 1000),
  rir int check (rir is null or rir between 0 and 5),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_exercise_id, set_number)
);
alter table public.workout_set_logs enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_set_logs' and policyname = 'workout_set_logs_select_own') then create policy "workout_set_logs_select_own" on public.workout_set_logs for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_set_logs' and policyname = 'workout_set_logs_insert_own') then create policy "workout_set_logs_insert_own" on public.workout_set_logs for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_set_logs' and policyname = 'workout_set_logs_update_own') then create policy "workout_set_logs_update_own" on public.workout_set_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_set_logs' and policyname = 'workout_set_logs_delete_own') then create policy "workout_set_logs_delete_own" on public.workout_set_logs for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_workout_set_logs_updated_at') then create trigger steroid_workout_set_logs_updated_at before update on public.workout_set_logs for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.workout_set_logs from anon;
grant select, insert, update, delete on public.workout_set_logs to authenticated;

create table if not exists public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  cycle_id uuid references public.cycles(id) on delete set null,
  done_on date not null default current_date,
  type text not null check (type in ('marche','course','velo','elliptique','rameur','natation','escaliers','autre')),
  minutes int not null check (minutes between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cardio_logs enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_logs' and policyname = 'cardio_logs_select_own') then create policy "cardio_logs_select_own" on public.cardio_logs for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_logs' and policyname = 'cardio_logs_insert_own') then create policy "cardio_logs_insert_own" on public.cardio_logs for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_logs' and policyname = 'cardio_logs_update_own') then create policy "cardio_logs_update_own" on public.cardio_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_logs' and policyname = 'cardio_logs_delete_own') then create policy "cardio_logs_delete_own" on public.cardio_logs for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_cardio_logs_updated_at') then create trigger steroid_cardio_logs_updated_at before update on public.cardio_logs for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.cardio_logs from anon;
grant select, insert, update, delete on public.cardio_logs to authenticated;

create table if not exists public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key ~ '^u-[0-9a-f-]{36}$'),
  name text not null check (char_length(name) between 1 and 100),
  pattern text,
  muscle text,
  equipment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.user_exercises enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_exercises' and policyname = 'user_exercises_select_own') then create policy "user_exercises_select_own" on public.user_exercises for select to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_exercises' and policyname = 'user_exercises_insert_own') then create policy "user_exercises_insert_own" on public.user_exercises for insert to authenticated with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_exercises' and policyname = 'user_exercises_update_own') then create policy "user_exercises_update_own" on public.user_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_exercises' and policyname = 'user_exercises_delete_own') then create policy "user_exercises_delete_own" on public.user_exercises for delete to authenticated using ((select auth.uid()) = user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'steroid_user_exercises_updated_at') then create trigger steroid_user_exercises_updated_at before update on public.user_exercises for each row execute function public.steroid_touch_updated_at(); end if; end $$;
revoke all on public.user_exercises from anon;
grant select, insert, update, delete on public.user_exercises to authenticated;

-- Un seul cycle actif par utilisateur.
create unique index if not exists cycles_one_active on public.cycles (user_id) where status = 'active';
create index if not exists workout_set_logs_history on public.workout_set_logs (user_id, exercise_key, created_at desc);
create index if not exists workouts_recent on public.workouts (user_id, ended_at desc);
create index if not exists workout_exercises_workout on public.workout_exercises (workout_id);

-- Table technique de migration (nom saisi → clé). RLS sans politique : invisible pour l'app.
create table if not exists public.v2_name_map (
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_name text not null,
  exercise_key text not null,
  method text not null check (method in ('exact','alias','fuzzy','custom','manual')),
  primary key (user_id, raw_name)
);
alter table public.v2_name_map enable row level security;
revoke all on public.v2_name_map from anon, authenticated;
