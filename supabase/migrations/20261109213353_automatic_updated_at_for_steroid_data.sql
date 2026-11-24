create or replace function public.steroid_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.steroid_touch_updated_at() from public,anon,authenticated;
create trigger steroid_profiles_updated_at before update on public.user_profiles for each row execute function public.steroid_touch_updated_at();
create trigger steroid_programs_updated_at before update on public.user_programs for each row execute function public.steroid_touch_updated_at();
create trigger steroid_sets_updated_at before update on public.workout_sets for each row execute function public.steroid_touch_updated_at();
