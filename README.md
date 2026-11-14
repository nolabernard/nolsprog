# STÉROÏDE

Application mobile-first de suivi d'entraînement (musculation et cardio), avec mode invité et comptes Supabase. Interface statique publiée sur GitHub Pages.

## Fonctionnalités existantes
- Programme hebdomadaire personnalisable et import de programmes.
- Séances guidées, séries validées, charges et répétitions.
- Cardio planifié par jour avec durée en minutes.
- Chronomètre de séance et de récupération.
- Progression, historique, records comparables et bilan de séance.
- Sauvegarde locale et synchronisation Supabase pour les comptes connectés.

## Données et synchronisation
- Le mode invité conserve ses données dans le stockage local du navigateur.
- Pour les comptes connectés, les profils, programmes, séries et séances sont synchronisés avec Supabase.
- Les tables utilisées sont `user_profiles`, `user_programs`, `workout_sets` et `workout_sessions`.
- Les quatre tables exposées ont RLS activé et des politiques limitant les lectures/écritures à `auth.uid() = user_id`.
- Les changements non synchronisés sont conservés localement et doivent rester explicitement signalés comme « synchronisation en attente » jusqu'à confirmation du serveur.
- La clé `sb_publishable` utilisée par le navigateur est une clé publique. Ne jamais publier de clé secrète ou de clé `service_role`.

## Confidentialité et limites
- Le dépôt GitHub est public : le code source HTML/CSS/JS est visible.
- Le stockage local du navigateur n'est pas un coffre chiffré. Protéger l'accès à l'appareil.
- Les calories sont des estimations indicatives, jamais une mesure exacte.
- Les records ne doivent être calculés qu'à partir de séries réellement validées et comparables.
- Une synchronisation en attente ne doit jamais être présentée comme terminée.

## Déploiement
Le site statique est publié sur GitHub Pages via `.github/workflows/deploy.yml`. Les contrôles automatisés sont définis dans `.github/workflows/validate.yml`.

URL : https://nolabernard.github.io/nolsprog/

## Installer sur iPhone
Dans Safari : ouvrir le site, Partager → Sur l'écran d'accueil.
