# STÉROÏDE V2 — document de conception

Statut : **à valider par le propriétaire** · 21/11/2026
Référence : `docs/cahier-des-charges-v2.md` (cahier des charges V2) · maquettes : canevas « STÉROÏDE — refonte UX », direction A.

## 1. Intention

STÉROÏDE doit passer d'un carnet calé sur le calendrier à un assistant qui suit la **réalité** de l'entraînement :
séances faites un autre jour, machine occupée, pause imprévue, exercices bien identifiés, cycles de 6 à 8 semaines avec un bilan.
L'intelligence doit se voir dans les décisions, pas dans la complexité de l'interface.

Situations réelles à couvrir (demandées par le propriétaire) :
1. une machine est prise ;
2. la séance n'est pas faite le jour prévu ;
3. un exercice tapé avec une faute fait perdre l'historique ;
4. la séance doit être mise en pause (téléphone, attente).

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs** : tout le cahier des charges, livré en 6 lots validables.

**Non-objectifs** : app native (App Store), IA générative, réseau social, paiement, nutrition.

**Ajouté par le propriétaire** : lot 7 « Rappels » (notifications).

**Anti-objectifs** (échec même si « ça marche ») :
- une séance non faite affichée comme « manquée » ou à rattraper ;
- un exercice de base remplacé par un exercice de finition ;
- l'historique de deux exercices différents fusionné, ou celui d'un même exercice coupé en deux ;
- une donnée existante supprimée ou écrasée ;
- un cycle ou une modification de programme activés sans validation ;
- une interface plus chargée qu'aujourd'hui.

## 3. Contraintes

- Architecture conservée : PWA statique (GitHub Pages), Supabase (Auth + Postgres + RLS), pas de framework ni d'étape de build.
- **Hors ligne obligatoire en salle** : le moteur, le catalogue et la séance fonctionnent sans réseau ; synchronisation ensuite.
- Moteur **déterministe** : mêmes réponses + même version du moteur = même programme.
- Migrations **additives** : les tables actuelles (`user_programs`, `workout_sets`, `workout_sessions`, `user_profiles`) ne sont ni modifiées ni supprimées.
- Mode invité conservé (même modèle de données, stocké localement) ; ses données V1 locales sont converties au premier lancement de la V2, avec la même table de correspondance.
- Règles de `CLAUDE.md` : branche → tests → PR → fusion après accord ; rien directement en production.

## 4. Approches envisagées

| | Approche | Verdict |
|---|---|---|
| 1 | Rapiécer : tout ajouter dans le bloc JSON `user_programs.plan` | Écartée : séries toujours indexées « semaine/jour », historique et cycles difficiles à calculer, bloc unique fragile en multi-appareils |
| **2** | **Nouvelle structure relationnelle ajoutée à côté de l'ancienne, catalogue versionné dans le code, moteur dans le téléphone** | **Retenue par le propriétaire** |
| 3 | Comme 2, moteur côté serveur (Edge Functions) | Écartée : plus de génération ni de remplacement sans réseau en salle |

Reconstruire avec un autre framework est exclu par le cahier des charges.

## 5. Ce qu'on garde

- Les 4 méthodes (PPL, Upper/Lower, Full Body, Split) et le choix automatique (`program-engine.js`), à faire évoluer.
- Le catalogue de 59 exercices déjà classés par mouvement (`pattern`), muscle et niveau de polyarticularité (`compound` 1–3).
- Le questionnaire (3 étapes, 20 réponses) et le diagnostic de cohérence (`sport-guide.js`, `sport-rules.js`).
- La double progression sans hausse automatique (`sport-progression.js`), les records (`sport-ux.js`), le bilan de séance (`sport-session.js`).
- La sécurité Supabase (RLS par utilisateur), la file d'attente hors ligne, le mode hors ligne, les panneaux de l'app.

## 6. Décisions

### 6.1 Planning : une suite de séances, avec ou sans jours

- Un cycle = une **suite ordonnée de séances** (ex. A → B → C) qui tourne en boucle.
- Le questionnaire propose deux modes : **choisir ses jours** (lundi, mercredi, vendredi) ou **« N séances par semaine »**. Les jours choisis ne servent que de rythme conseillé et de repère dans l'accueil ; ils ne bloquent rien.
- **Prochaine séance** = celle qui suit la dernière séance terminée du cycle. Jamais de séance « manquée ».
- **Garde-fou récupération** : si la dernière séance date de moins de 48 h et que la séance proposée sollicite en exercice de base les mêmes groupes musculaires, l'app propose la suivante compatible (« Hier : jambes. Aujourd'hui je te conseille Haut du corps »). L'utilisateur peut toujours choisir une autre séance.
- Le garde-fou **explique toujours son choix** en une phrase concrète (« Hier : jambes. Tes jambes ont besoin d'environ 48 h. Je te propose Haut B. ») avec deux boutons : « D'accord » et « Faire Bas B quand même ». Jamais de blocage, jamais de jargon.
- **Avancement du cycle** = séances faites ÷ (semaines × séances par semaine). Le bilan est proposé quand ce total est atteint **ou** quand la durée du cycle + 2 semaines est dépassée.

### 6.2 Catalogue et identité des exercices

- Chaque exercice reçoit une **clé permanente** (`dev-couche-barre`), jamais affichée. Le nom peut changer, la clé jamais.
- Champs : `key`, `name`, `aliases` (fautes et variantes connues), `pattern`, `muscles` (principal + secondaires), `role` (`base` = compound 3, `secondaire` = 2, `finition` = 1), `equipment` (`gym`, `dumbbells`, `home`, `bands`), `unilateral`, `media` (illustration, optionnelle : aucune au départ, ajoutée au fil de l'eau).
- Le catalogue vit dans le code (`exercise-catalogue.js`), versionné sur GitHub : déterministe, testable, disponible hors ligne.
- **Plus de saisie libre** : on choisit dans le catalogue avec une recherche tolérante (accents, fautes, abréviations : « dvlp couche » → « Développé couché »).
- Exercice absent : « Créer mon exercice » (nom + mouvement + muscle), enregistré dans `user_exercises` avec une clé `u-<uuid>`. Il peut ensuite être renommé sans perdre son historique.
- L'historique, les records et la progression se calculent **par clé**, jamais par nom.

### 6.3 Remplacements (« Machine prise »)

Bouton « Machine prise » dans la séance → panneau, dans cet ordre :
1. **Faire plus tard** : l'exercice passe en fin de séance (ordre modifié pour cette séance seulement).
2. **Trois remplaçants** classés : même `pattern`, **même `role`**, matériel disponible, hors mouvements à éviter (questionnaire), pas déjà dans la séance. Score : muscles communs > même matériel > déjà pratiqué par l'utilisateur.
3. **Passer** : l'exercice est noté « non fait », sans pénalité.

- Les séries, répétitions et repos restent **ceux de la place dans la séance** (le rôle définit le volume, pas l'exercice).
- Remplacement ponctuel par défaut ; case « Garder dans mon programme » → modifie la séance du cycle (permanent), l'ancienne clé est conservée dans l'historique.
- Jamais base → finition. S'il n'existe aucun remplaçant du même rôle : on le dit et on propose « Faire plus tard » ou « Passer ».

### 6.4 Pause

- Toucher le chrono de séance = pause. Bandeau discret « En pause · Reprendre » ; chrono et repos figés.
- Durée de séance = temps total − pauses (`paused_seconds`).
- Sans action depuis 20 min, au retour : « Tu étais en pause ? » → ne pas compter ce temps.
- La séance est sauvegardée en continu (localement puis Supabase) et reprend après fermeture ou changement d'appareil.

### 6.4 bis Choix d'interface (propriétaire)

Proposition **P1 « Guidé »** retenue (canevas, page « V2 — 3 propositions ») : un exercice à la fois en plein écran, bouton « Machine prise » toujours visible.
Accueil retravaillé : grande carte « Prochaine séance » (nom, muscles, exercices, séries, durée, anneau d'avancée du cycle, bouton Démarrer), phrase du coach qui explique le choix du jour et le garde-fou avec « Changer de séance », séances de la semaine faites et à venir, record et régularité.

### 6.5 Écran de séance (direction A)

Un exercice à la fois, plein écran : nom, objectif (séries × répétitions, repos), « Dernière fois : 80 kg × 8 ».
Charges et répétitions **préremplies** avec la dernière performance de la même clé ; valider une série = 1 toucher ; le repos démarre seul (+30 s, Passer).
Secondaire derrière « ⋯ » : conseils et muscles, remplacer, modifier, ressenti (RPE).
Terminer sans tout valider reste possible.

### 6.6 Cycles et générateur

- Un cycle conserve une **photographie** : réponses du questionnaire, version du moteur, méthode, durée, séances par semaine, jours choisis.
- Modifier son profil n'affecte **pas** le cycle en cours ; cela servira au cycle suivant.
- Durée : 6 semaines par défaut, réglable entre 6 et 8 sur l'écran récapitulatif.
- Le générateur produit la suite de séances une fois, au début du cycle. Il ne régénère plus chaque semaine (aujourd'hui chaque semaine est régénérée depuis le profil actuel, avec de nouveaux identifiants).
- La progression d'une semaine à l'autre passe par des **recommandations** (double progression), jamais par une modification automatique.
- Tests automatiques sur la matrice méthode × fréquence (2–6) × niveau × matériel × objectif. Invariants vérifiés : structure de la méthode, volume hebdomadaire par groupe musculaire dans une fourchette, exercices de base avant les finitions, repos cohérents avec le rôle, matériel respecté, mouvements à éviter exclus, durée estimée ≤ durée demandée.

### 6.7 Cardio

Planifié dans le cycle (type, minutes, fois par semaine), réalisé soit avec une séance, soit seul un jour de repos. Enregistré séparément des séries. Types : marche, course, vélo, elliptique, rameur, natation, escaliers, autre.

### 6.8 Bilan et renouvellement (lot 6)

Écran de fin de cycle : séances faites, évolutions par exercice, points forts, points à améliorer, ressenti, recommandation (garder, ajuster, changer de méthode, nouvelle structure). Questionnaire **actualisé** (seulement ce qui a pu changer). Le cycle suivant est créé au statut « proposé » et activé uniquement après validation.

## 7. Données (Supabase, migrations additives)

Toutes les tables : `user_id` → `auth.users` (ON DELETE CASCADE), RLS « chacun ses lignes » (`(select auth.uid()) = user_id`), aucun accès anonyme, `updated_at` automatique.

| Table | Rôle | Colonnes principales |
|---|---|---|
| `cycles` | Un cycle et sa photographie | `status` (proposed/active/archived), `method`, `weeks` 6–8, `sessions_per_week` 1–7, `preferred_days` int[] nullable, `answers_snapshot` jsonb, `engine_version`, `started_at`, `ended_at` · un seul cycle `active` par utilisateur (index unique partiel) |
| `cycle_sessions` | La suite de séances | `cycle_id`, `position`, `code` (A, B…), `title`, `focus` text[] |
| `cycle_exercises` | Exercices prévus | `cycle_session_id`, `position`, `exercise_key`, `role`, `sets`, `reps_min`, `reps_max`, `rest_seconds`, `replaced_key` (si remplacement permanent) |
| `cycle_cardio` | Cardio prévu | `cycle_id`, `type`, `minutes`, `per_week` |
| `workouts` | Séances réellement faites | `cycle_id`, `cycle_session_id` (null = séance libre), `status` (in_progress/completed/abandoned), `started_at`, `ended_at`, `paused_at`, `paused_seconds`, `duration_seconds`, `calories_estimate`, `revision`, `legacy_week`, `legacy_day` |
| `workout_exercises` | Exercices faits dans une séance | `workout_id`, `position`, `exercise_key`, `cycle_exercise_id`, `substituted_from_key`, `status` (done/skipped/later), `rpe` |
| `workout_set_logs` | Séries | `workout_exercise_id`, `exercise_key` (dénormalisé pour l'historique), `set_number`, `weight` (null ≠ 0), `reps`, `rir`, `completed` · unique (`workout_exercise_id`, `set_number`) |
| `cardio_logs` | Cardio fait | `workout_id` nullable, `cycle_id`, `done_on`, `type`, `minutes` |
| `user_exercises` | Exercices perso | `key` (`u-<uuid>`), `name`, `pattern`, `muscle`, `equipment` |

Index : (`user_id`, `exercise_key`, date) pour l'historique ; (`user_id`, `ended_at` desc) pour la prochaine séance.

### Migration des données existantes

1. Table de correspondance nom → clé : normalisation (minuscules, sans accents, espaces), alias, puis distance d'édition. Les noms non rattachés deviennent des exercices perso. **La liste est montrée au propriétaire avant toute écriture.**
2. Programme actuel → un cycle `active` (séances = jours non vides de la semaine de base, dans l'ordre ; `preferred_days` = ces jours ; photographie = réponses actuelles).
3. `workout_sessions` + regroupement de `workout_sets` par (semaine, jour) → `workouts` (`legacy_week`, `legacy_day` conservés), puis `workout_exercises` et `workout_set_logs`.
4. Script SQL idempotent, d'abord exécuté **à blanc** (transaction annulée, comptes affichés), puis pour de vrai après accord. Les anciennes tables restent intactes et ne sont plus écrites par l'app V2.

## 8. Synchronisation

- Écritures locales d'abord (IndexedDB ou localStorage selon la taille), file d'attente par ligne, envoi en upsert idempotent (identifiants générés côté appareil).
- Conflits : par ligne, la version la plus récente (`updated_at`) gagne ; la séance en cours garde son contrôle de `revision` actuel.
- Statut affiché inchangé : « en attente » tant que le serveur n'a pas confirmé.

## 9. Organisation du code

`app.js` est découpé progressivement en modules ES natifs (sans build) :
`domain/` (catalogue, générateur, suite et récupération, remplacements, progression), `data/` (stockage local, Supabase, file d'attente), `ui/` (écrans : accueil, séance, progrès, programme, questionnaire, bilan, compte).
Les règles métier restent pures et testées sans navigateur ; l'interface n'en contient pas.

## 10. Lots et critères de validation

Chaque lot = une ou plusieurs PR, tests verts, démonstration mobile, validation avant fusion. Migrations Supabase appliquées seulement après accord.

| Lot | Contenu | Validé quand |
|---|---|---|
| 1 Fondations | Catalogue à clés + recherche tolérante + exercices perso ; tables V2 ; migration à blanc puis réelle | 223 séries retrouvées sous leur clé ; liste des correspondances validée ; anciennes tables intactes |
| 2 Générateur et cycles | Suite de séances, photographie, durée 6–8, tests matrice | Les 4 méthodes passent tous les invariants ; modifier le profil ne change pas le cycle |
| 3 Séance | Écran direction A, préremplissage, pause, « Machine prise », repos auto, reprise | Séance interrompue/reprise sans perte ; validation d'une série en 1 toucher |
| 4 Planning | Prochaine séance, garde-fou récupération, deux modes jours / N par semaine, cardio | Aucune séance « manquée » ; enchaînements incohérents évités |
| 5 Historique et progrès | Historique par clé, comparaison, records, recommandations | Remplacements jamais fusionnés ; recommandations fondées sur des séries réelles |
| 6 Coach et bilan | Bilan de cycle, questionnaire actualisé, cycle suivant proposé | Aucun cycle activé sans validation |
| 7 Rappels | Notifications web (iPhone : app installée, iOS 16.4+), heure et jours au choix, désactivables ; envoi par une fonction Supabase programmée, table des abonnements | Rappel reçu le jour choisi à l'heure choisie ; aucun rappel si désactivé |

## 11. Laissé au développeur

Noms exacts des fichiers et fonctions, algorithme de recherche tolérante, seuils fins du score de remplacement, mise en page des écrans non dessinés (questionnaire, bilan, compte) dans le style de la direction A.

## 12. Choix du développeur à confirmer

- Durée de cycle par défaut : 6 semaines, réglable 6–8 *(validé)*.
- Garde-fou récupération : 48 h, basé sur les groupes travaillés en exercice de base, toujours expliqué *(validé)*.
- Pause : question après 20 min sans action *(validé)* ; pas de suggestion d'échauffement *(décision du propriétaire)*.
- Mode invité conservé avec le même modèle, en local.
- Notifications : ajoutées en lot 7 *(décision du propriétaire)*.
