# NolsProg

Application mobile-first et publique de suivi de musculation, en **mode invité sans connexion**.

## Fonctionnement
- Accès libre à l'interface : pas d'identifiant ou de mot de passe.
- Programme préconfiguré : 5 séances, jeudi repos actif, dimanche repos complet.
- Modification des exercices, séries, répétitions et repos.
- Suivi hebdomadaire des charges et répétitions et graphiques de progression.
- Données enregistrées uniquement en `localStorage` dans le navigateur de chaque appareil.
- Export JSON personnel via l'icône ↓ dans la barre supérieure pour sauvegarder ses données.

## Confidentialité et sécurité
Le site statique **ne contacte pas Supabase** et ne publie aucune clé API ou jeton d'accès dans sa version actuelle. Chaque navigateur a sa propre copie locale des données, inaccessible à un autre utilisateur depuis l'application. Une politique CSP restrictive interdit les connexions réseau depuis le JavaScript de la page, les scripts tiers, les cadres et le chargement de ressources distantes. Le projet GitHub reste **public** : le code HTML/CSS/JS n'est pas secret. Ne jamais y enregistrer de clé confidentielle.

Limites : le stockage local n'est **ni chiffré ni synchronisé**. Une personne ayant accès au téléphone ou au profil navigateur peut consulter les données ; vider les données du site ou changer d'appareil peut supprimer le suivi. Ce dispositif ne constitue pas un audit exhaustif, ni une garantie d'absence de faille. Le stockage sur le projet Supabase des comptes déjà créés n'est pas effacé par cette mise à jour : l'ancien projet conserve ses politiques RLS.

## Déploiement
Le projet est un site statique sans compilation, hébergé sur GitHub Pages et publié via `.github/workflows/deploy.yml`.

URL : https://nolabernard.github.io/nolsprog/

## Installer sur iPhone
Dans Safari : ouvrir le site, Partager → Sur l'écran d'accueil.
