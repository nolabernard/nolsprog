-- STEROID V2 — lot 7 : rappels (notifications web).
-- Migration additive. Aucun secret dans ce fichier : le secret d'appel programmé est tiré au hasard dans la base,
-- les clés d'envoi (VAPID) sont créées par la fonction au premier appel et restent dans la base.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Abonnements : un par appareil (endpoint), réglages du rappel avec.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and length(endpoint) <= 2000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  enabled boolean not null default true,
  hour smallint not null default 18 check (hour between 0 and 23),
  minute smallint not null default 0 check (minute in (0, 15, 30, 45)),
  days smallint[] not null default '{0,1,2,3,4,5,6}' check (days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  timezone text not null default 'Europe/Paris' check (length(timezone) <= 64),
  last_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- Lecture et retrait de ses lignes seulement : l'écriture passe par la fonction send-reminders (destinataires vérifiés).
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_read_own" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.steroid_touch_updated_at();

-- Réglages privés (clés VAPID, secret d'appel) : RLS sans politique = inaccessible aux utilisateurs.
create table if not exists public.push_config (key text primary key, value text not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (key, value)
  values ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
  on conflict (key) do nothing;

-- Toutes les 15 minutes : la fonction envoie les rappels dont l'heure locale est arrivée.
select cron.unschedule('steroid-reminders') where exists (select 1 from cron.job where jobname = 'steroid-reminders');
select cron.schedule('steroid-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://femtfigampvaeetcuoxe.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from public.push_config where key = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000)
$$);
