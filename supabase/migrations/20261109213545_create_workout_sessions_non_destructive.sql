create table if not exists public.workout_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 week_number integer not null check(week_number between 1 and 104),
 day_index integer not null check(day_index between 0 and 6),
 title text,
 status text not null default 'completed' check(status in ('planned','in_progress','completed')),
 started_at timestamptz,
 ended_at timestamptz,
 duration_seconds integer check(duration_seconds is null or duration_seconds>=0),
 calories_estimate numeric check(calories_estimate is null or calories_estimate>=0),
 summary jsonb not null default '{}'::jsonb,
 legacy_entry jsonb,
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,week_number,day_index)
);
alter table public.workout_sessions enable row level security;
revoke all on public.workout_sessions from anon,authenticated;
grant select,insert,update,delete on public.workout_sessions to authenticated;
create policy sessions_select_own on public.workout_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy sessions_insert_own on public.workout_sessions for insert to authenticated with check ((select auth.uid())=user_id);
create policy sessions_update_own on public.workout_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy sessions_delete_own on public.workout_sessions for delete to authenticated using ((select auth.uid())=user_id);
create index workout_sessions_user_date on public.workout_sessions(user_id,ended_at desc);
create trigger steroid_sessions_updated_at before update on public.workout_sessions for each row execute function public.steroid_touch_updated_at();
