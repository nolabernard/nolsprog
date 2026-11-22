# V2 — Lot 7 « Rappels » : mise en œuvre

**Goal:** Notifications web à l'heure et aux jours choisis, désactivables ; envoi par une fonction Supabase programmée.

**Architecture:**
- `supabase/migrations/20261122010000_v2_reminders.sql` : table `push_subscriptions` (RLS « chacun ses lignes »), table privée `push_config` (RLS sans politique), tâche pg_cron toutes les 15 min.
- `supabase/functions/send-reminders` : `index.ts` (envoi web-push, clés VAPID créées au premier appel, abonnements expirés supprimés) + `schedule.js` (règle d'envoi pure, testée).
- App : `reminders.js` (abonnement, réglages), carte Rappels dans Programme, `sw.js` (push, clic).

## Règles
- Aucun secret dans le dépôt ; la clé publique VAPID est servie par la fonction.
- Rappel envoyé une fois par jour au plus, dans le quart d'heure choisi, à l'heure locale de l'appareil (fuseau enregistré).
- Pas de rappel un jour où une séance est déjà terminée.
- Invité : pas de rappels (compte requis). iPhone : app installée sur l'écran d'accueil.
