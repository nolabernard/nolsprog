create table if not exists public.user_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 answers jsonb not null default '{}'::jsonb,
 method text not null default 'auto',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint answers_is_object check (jsonb_typeof(answers) = 'object'),
 constraint method_valid check (method in ('auto','fullbody','upperlower','ppl','split','hybrid'))
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon;
grant select,insert,update,delete on public.user_profiles to authenticated;
create policy "profiles_select_own" on public.user_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "profiles_insert_own" on public.user_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy "profiles_update_own" on public.user_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "profiles_delete_own" on public.user_profiles for delete to authenticated using ((select auth.uid())=user_id);
