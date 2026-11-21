# STÉROÏDE — consignes de travail

Application web mobile-first de suivi d'entraînement (musculation + cardio).
Site statique (HTML/CSS/JS, sans framework ni build), publié sur GitHub Pages :
https://nolabernard.github.io/nolsprog/ — comptes et synchronisation via Supabase.

## Façon de travailler (obligatoire)
1. Partir de `main` à jour, créer une branche `type/sujet-AAAAMMJJ`
   (`feature/`, `fix/`, `chore/`, `refactor/`).
2. Une PR = un sujet. Changements minimaux, pas de reformatage hors sujet.
3. Lancer `./scripts/test-all.sh` avant chaque push : tout doit passer.
4. Pousser, ouvrir une PR vers `main` (titre et description en français).
5. **Ne jamais fusionner sans l'accord explicite du propriétaire.**
   Ne jamais pousser directement sur `main` (chaque push sur `main` déploie en production).

## Structure
- `index.html` : charge les modules dans l'ordre, puis `app.js` (module ES).
  Contient la CSP : tout nouveau domaine externe (API, images, polices) doit y être ajouté.
- `app.js` : application (écrans, état, stockage local, Supabase). Fichier très gros,
  aux lignes très longues : chercher avec `grep -n` et ne lire que les passages utiles.
- Modules purs, exposés en global navigateur et en `module.exports` pour les tests :
  `sport-rules.js` (validation), `sport-guide.js` (onboarding), `sport-progression.js`
  (double progression), `program-engine.js` (génération de programme, déterministe),
  `sport-session.js` (bilan de séance), `sport-import.js` (import texte/CSV/TSV local),
  `sport-ux.js` (aides UX, records).
- `app-updates.js` : détection de nouvelle version (`version.json` généré au déploiement).
- Styles : `styles.css` (historique, lourd) + `steroid-v2.css` (identité V2, chargé après).
  Référence visuelle : `DESIGN-SYSTEM-V2.md`. Toute nouvelle règle va dans `steroid-v2.css`.
- `supabase/email-templates/` : e-mails de confirmation et de récupération.
- Tests : `scripts/*.test.cjs`, `scripts/smoke.cjs`, `tests/*.test.cjs` (node:test).
  Un nouveau test placé dans ces dossiers est lancé automatiquement.

## Données
- Stockage local (clés préfixées `nolsprog-`) : mode invité, cache de compte, séance active.
- Supabase : tables `user_profiles`, `user_programs`, `workout_sets`, `workout_sessions`,
  RLS `auth.uid() = user_id`. Seule la clé publique `sb_publishable` est autorisée dans le code.
  Jamais de clé `service_role` ni de secret dans le dépôt (il est public).
- Ne jamais casser la compatibilité des données locales existantes sans migration.

## Règles métier non négociables
- Une synchronisation en attente reste affichée comme telle ; jamais « synchronisé »
  avant confirmation du serveur. Local et Cloud sont deux états distincts.
- Records : uniquement à partir de séries validées et comparables. Aucun faux record.
- Charge manquante ≠ 0 kg.
- Calories = estimations indicatives, jamais présentées comme exactes.
- Pas de diagnostic médical ; le moteur de programme reste déterministe.

## UI
- Textes de l'interface en français, ton direct.
- Maquette de base 390 × 844 px, cibles tactiles ≥ 44 px, focus visible,
  respect de `prefers-reduced-motion`, icônes SVG au trait (pas d'emoji).
