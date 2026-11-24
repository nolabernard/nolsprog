-- Sauvegarde avant le lot 5 (schéma non exposé, aucun accès utilisateur).
create schema if not exists backup_20261124;
revoke all on schema backup_20261124 from public, anon, authenticated;
create table backup_20261124.workouts as table public.workouts;
create table backup_20261124.workout_exercises as table public.workout_exercises;
create table backup_20261124.workout_set_logs as table public.workout_set_logs;
revoke all on all tables in schema backup_20261124 from public, anon, authenticated;
