revoke all privileges on table public.user_programs,public.workout_sets from anon;
revoke all privileges on table public.user_profiles from anon;
revoke truncate,references,trigger on table public.user_profiles,public.user_programs,public.workout_sets from authenticated;
grant select,insert,update,delete on table public.user_profiles,public.user_programs,public.workout_sets to authenticated;
