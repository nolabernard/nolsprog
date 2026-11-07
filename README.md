# NolsProg

Application mobile-first de suivi de musculation, synchronisée avec le projet Supabase NolsProg.

## Fonctionnalités
- Programme préconfiguré : 5 séances, 1 repos actif (jeudi), 1 repos complet.
- Modification des exercices, séries, répétitions et repos.
- Saisie des charges, répétitions et validation des séries par semaine.
- Historique des performances et graphiques par exercice.
- Authentification sécurisée par e-mail ; chaque compte ne voit que ses données grâce aux règles RLS de Supabase.

## Hébergement
Ce dépôt est une application statique sans compilation. Elle se déploie via le workflow `.github/workflows/deploy.yml`.

**Activation initiale nécessaire par le propriétaire du dépôt** : GitHub > nolsprog > Settings > Pages > Build and deployment > Source : GitHub Actions. La connexion GitHub utilisée pour publier le code ne dispose pas des droits administratifs permettant de créer le site Pages. Une fois activé, relancer le workflow "Deploy NolsProg" depuis Actions ou pousser un nouveau commit.

Adresse attendue après déploiement : https://nolabernard.github.io/nolsprog/

## Configuration de connexion Supabase
Dans https://supabase.com/dashboard/project/femtfigampvaeetcuoxe/auth/url-configuration :
- Site URL : `https://nolabernard.github.io/nolsprog/`
- Redirect URLs : ajouter `https://nolabernard.github.io/nolsprog/`

Le site nécessite cette configuration pour que les liens de connexion par e-mail reviennent vers l'application.

## Données
Tables : `public.user_programs` et `public.workout_sets`, avec RLS. Les clés présentes dans `app.js` sont uniquement des clés publiques (publishable), jamais une service-role key.

## Installer sur iPhone
Ouvrir l'URL dans Safari > Partager > Sur l'écran d'accueil.
