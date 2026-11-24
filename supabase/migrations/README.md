# Migrations Supabase

Chaque fichier porte le numéro de version enregistré dans la base (`supabase_migrations.schema_migrations`),
pour que le dépôt et la base aient le même historique.

Deux petites migrations de la base sont incluses dans `20261121234656_v2_reminders.sql` (état final identique) :
`20261121235132_v2_reminders_pg_net_schema` (pg_net dans le schéma `extensions`) et
`20261122000608_v2_reminders_policies` (lecture et suppression de ses propres abonnements).

Règle : une migration n'est appliquée que sur accord explicite du propriétaire (« applique les migrations »).
