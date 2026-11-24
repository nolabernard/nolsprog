create schema if not exists admin_private;
revoke all on schema admin_private from public, anon, authenticated;
create or replace view admin_private.admin_users as
select u.id as user_id,
       nullif(trim(u.raw_user_meta_data->>'first_name'),'') as prenom,
       u.email,
       u.created_at as date_inscription,
       u.last_sign_in_at as derniere_connexion,
       u.email_confirmed_at as email_confirme_le
from auth.users u;
revoke all on admin_private.admin_users from public, anon, authenticated;
comment on view admin_private.admin_users is 'Vue administrative privee des inscriptions STÉROÏDE, non exposee aux utilisateurs de l application.';
