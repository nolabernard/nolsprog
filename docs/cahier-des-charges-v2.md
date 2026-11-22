# CAHIER DES CHARGES — ÉVOLUTIONS STEROID
**Version 1.0 — Novembre 2026**

## 1. Présentation et vision du projet

STEROID est une application de coaching sportif destinée à accompagner les utilisateurs dans leur entraînement en salle de sport.

L'application repose sur deux piliers complémentaires :

- **Un assistant d'entraînement ultra-pratique :** faciliter l'exécution des séances, la consultation des exercices, le suivi des performances et la gestion de l'entraînement.
- **Un coach sportif intelligent :** analyser les performances, comprendre la progression de l'utilisateur et proposer des adaptations pertinentes.

L'objectif est de proposer une expérience simple et rapide à utiliser pendant une séance, tout en développant un moteur de génération et de suivi des programmes suffisamment intelligent pour accompagner l'utilisateur sur le long terme.

**Principe fondamental : l'application doit s'adapter à la réalité de l'entraînement, et non imposer à l'utilisateur une utilisation rigide.**

L'interface doit rester épurée. La complexité doit être gérée par le moteur technique, sans surcharger l'expérience utilisateur.

## 2. Fonctionnement général de l'application

STEROID repose sur une logique de fonctionnement en plusieurs étapes :

1. L'utilisateur répond à un questionnaire initial.
2. Le moteur analyse ses réponses et génère automatiquement un programme personnalisé.
3. Le programme est organisé en cycles de 6 à 8 semaines.
4. L'utilisateur réalise ses séances et enregistre ses performances.
5. L'application analyse progressivement ses résultats.
6. À la fin du cycle, elle établit un bilan et propose une évolution du programme.
7. L'utilisateur valide ou non la nouvelle proposition.

Les programmes sont générés automatiquement à partir des réponses au questionnaire.

Les méthodes d'entraînement actuellement prises en charge sont :
- PPL (Push / Pull / Legs).
- Upper / Lower.
- Full Body.
- Split.

Il est impératif de conserver cette logique de génération et de faire évoluer le moteur existant plutôt que de créer un système parallèle.

---

# 3. ÉVOLUTIONS TECHNIQUES

## 3.1. Audit préalable de l'existant

Avant toute modification, le développeur devra réaliser un audit de l'application actuelle.

L'audit devra couvrir :

**Questionnaire**
- Structure et fonctionnement du questionnaire.
- Questions et réponses disponibles.
- Données enregistrées en base.
- Correspondance entre les réponses et les paramètres de génération.
- Possibilités de modification du profil utilisateur.

**Moteur de génération**
- Fonctionnement des règles de génération.
- Répartition des groupes musculaires.
- Sélection des méthodes d'entraînement.
- Sélection des exercices.
- Détermination des séries, répétitions et temps de repos.
- Gestion du niveau, de la fréquence et du matériel disponible.
- Cohérence des séances entre elles.

**Gestion des programmes**
- Structure actuelle des programmes.
- Gestion des semaines et des séances.
- Gestion des cycles.
- Enregistrement des performances.
- Gestion de l'historique.
- Fonctionnement de la synchronisation avec Supabase.

**Expérience utilisateur**
- Navigation générale.
- Parcours de création d'un programme.
- Utilisation pendant une séance.
- Consultation de l'historique.
- Affichage des statistiques.

Livrable attendu : un état des lieux technique identifiant les fonctionnalités existantes, les dysfonctionnements, les améliorations nécessaires et les éventuelles contraintes d'architecture.

Aucune suppression de données ou modification destructive de la base de données ne devra être effectuée pendant cet audit.

## 3.2. Amélioration du moteur de génération des programmes

Le moteur de génération constitue le cœur de STEROID.

Il doit transformer les réponses au questionnaire en un programme structuré, cohérent et adapté à chaque utilisateur.

### A. Exploitation du questionnaire

Les réponses doivent déterminer notamment :

- L'objectif sportif.
- Le niveau d'expérience.
- La fréquence d'entraînement.
- La méthode d'entraînement.
- La durée souhaitée des séances.
- Le matériel disponible.
- Les préférences et contraintes renseignées.

Le moteur doit prendre en compte l'ensemble de ces paramètres pour construire le programme.

### B. Cohérence des programmes

Le moteur ne doit pas simplement générer des séances indépendantes.

Il doit construire un programme global cohérent.

Exemples :
- Un programme PPL doit respecter une logique Push / Pull / Legs.
- Un programme Upper / Lower doit équilibrer les séances haut et bas du corps.
- Un programme Full Body doit respecter une répartition pertinente des groupes musculaires et de la récupération.
- Un programme Split doit respecter la répartition musculaire définie pour le cycle.

La fréquence d'entraînement doit également influencer la répartition des séances.

Le moteur doit vérifier :
- La cohérence de la répartition musculaire.
- Le volume hebdomadaire par groupe musculaire.
- La fréquence de sollicitation musculaire.
- Les temps de récupération.
- L'équilibre entre exercices polyarticulaires et isolation.
- La cohérence entre le niveau de l'utilisateur et la difficulté proposée.

### C. Génération déterministe

Les règles fondamentales de génération doivent être déterministes, explicables et testables.

Deux générations réalisées avec les mêmes paramètres et la même version du moteur doivent respecter les mêmes contraintes métier.

Une éventuelle couche d'intelligence artificielle peut intervenir pour expliquer les recommandations, mais ne doit pas pouvoir modifier arbitrairement la structure du programme ou contourner les règles sportives.

### D. Tests du moteur

Créer une batterie de tests couvrant les différentes combinaisons de :
- Fréquence d'entraînement.
- Méthode.
- Niveau.
- Matériel.
- Objectifs.

Vérifier notamment que toutes les séances générées respectent la méthode choisie et que les volumes d'entraînement restent cohérents.

Les résultats doivent pouvoir être contrôlés automatiquement.

## 3.3. Gestion des cycles de 6 à 8 semaines

Chaque programme doit être organisé autour d'un cycle clairement identifié.

Un cycle comprend :
- Une configuration de départ.
- Une méthode d'entraînement.
- Une durée définie.
- Des semaines structurées.
- Des séances associées.
- Des règles de progression.
- Un bilan final.

Chaque cycle doit conserver une photographie des réponses au questionnaire et des paramètres utilisés lors de sa génération.

**Important :** une modification ultérieure du profil utilisateur ne doit pas modifier rétroactivement un programme déjà généré.

### Progression pendant le cycle

Le moteur doit pouvoir suivre :
- L'évolution des charges.
- L'évolution du nombre de répétitions.
- Le volume d'entraînement.
- Le RPE ou RIR renseigné.
- La régularité des séances réellement effectuées.
- Les substitutions d'exercices.

La progression doit s'appuyer sur des règles adaptées à l'exercice et au niveau de l'utilisateur.

Exemple : lorsqu'un utilisateur atteint la limite haute de répétitions prévue avec une difficulté maîtrisée, le moteur peut recommander une augmentation de charge.

Il ne faut pas imposer une augmentation automatique systématique.

## 3.4. Historique et suivi des performances

L'historique doit devenir une véritable source d'informations pour le moteur de progression.

Pour chaque exercice, conserver :
- L'identifiant de l'exercice.
- La date de réalisation.
- Les charges utilisées.
- Les répétitions réalisées.
- Le nombre de séries.
- Le RPE/RIR lorsque renseigné.
- Les éventuelles modifications ou substitutions.

L'utilisateur doit pouvoir retrouver facilement ses performances précédentes.

L'application doit également pouvoir comparer les performances d'un même exercice sur plusieurs séances.

Les données historiques doivent rester accessibles même après la génération d'un nouveau programme.

## 3.5. Gestion intelligente des substitutions

L'utilisateur doit pouvoir remplacer un exercice lorsqu'il ne dispose pas du matériel nécessaire, lorsqu'une machine est occupée ou lorsqu'il souhaite effectuer une variante.

La substitution doit respecter autant que possible :
- Le groupe musculaire ciblé.
- Le mouvement principal.
- Le rôle de l'exercice dans la séance.
- Le niveau de difficulté.
- Le matériel disponible.
- La logique de volume et de répétitions.

Une substitution ponctuelle ne doit pas modifier automatiquement le programme initial.

L'application doit distinguer :
- Le remplacement ponctuel pour une séance.
- Le remplacement permanent validé dans le programme.

Les performances de deux exercices différents ne doivent pas être fusionnées artificiellement dans l'historique.

## 3.6. Bilan et renouvellement du programme

À la fin d'un cycle, STEROID doit générer un bilan personnalisé.

Ce bilan doit analyser :
- Les performances réalisées.
- La progression des charges et répétitions.
- Le volume d'entraînement.
- La régularité réelle.
- Les exercices ayant bien fonctionné.
- Les difficultés rencontrées.
- Le ressenti de l'utilisateur.

À partir de ces éléments, le moteur doit proposer une recommandation parmi plusieurs possibilités :

1. Conserver la méthode actuelle et faire évoluer le programme.
2. Ajuster certains paramètres du programme.
3. Proposer une nouvelle méthode d'entraînement.
4. Générer un nouveau cycle avec une structure différente.

L'utilisateur doit pouvoir consulter la proposition et la valider avant son activation.

Le questionnaire initial ne doit pas être entièrement recommencé. Les anciennes réponses doivent être réutilisées et seules les informations susceptibles d'avoir changé doivent être actualisées.

---

# 4. ÉVOLUTIONS UX / UI

## 4.1. Principes généraux

L'application doit conserver une approche mobile-first.

Les priorités UX sont :
- Rapidité d'utilisation.
- Lisibilité.
- Simplicité de navigation.
- Limitation du nombre d'actions nécessaires.
- Cohérence visuelle.
- Accessibilité pendant une séance de sport.

L'utilisateur doit pouvoir consulter et enregistrer ses performances rapidement, idéalement sans avoir à naviguer entre plusieurs écrans.

Éviter les tableaux trop complexes, les menus surchargés et les informations secondaires affichées en permanence.

Conserver l'identité visuelle existante de STEROID, notamment son wordmark et son système d'icônes SVG linéaires. Ne pas introduire d'émojis comme icônes de navigation.

## 4.2. Questionnaire et création du programme

Le parcours de création doit être fluide et compréhensible.

Améliorations attendues :
- Affichage clair de la progression dans le questionnaire.
- Regroupement logique des questions.
- Explication succincte des choix lorsque nécessaire.
- Possibilité de revenir à une question précédente.
- Confirmation des réponses avant la génération.
- Écran de présentation du programme généré.

À la fin du questionnaire, présenter un récapitulatif comprenant :
- La méthode choisie.
- La fréquence.
- La durée du cycle.
- Les objectifs.
- La répartition des séances.
- Les principales caractéristiques du programme.

L'utilisateur doit comprendre ce que STEROID lui propose avant de commencer.

## 4.3. Tableau de bord

Le tableau de bord doit donner immédiatement accès aux informations essentielles :

- Programme actuellement actif.
- Progression dans le cycle.
- Prochaine séance logique.
- Dernière séance effectuée.
- Indicateurs de progression.
- Accès rapide à l'entraînement.

La prochaine séance doit être déterminée à partir de la progression réelle de l'utilisateur dans le programme, et non uniquement à partir du jour de la semaine.

Il ne faut pas considérer une séance non réalisée comme une séance manquée.

L'application doit simplement proposer la prochaine séance cohérente dans la séquence, en tenant compte des séances réellement effectuées et de la récupération.

## 4.4. Interface pendant une séance

L'écran d'entraînement est l'un des écrans les plus importants de l'application.

Il doit être optimisé pour une utilisation en salle de sport.

Fonctionnalités attendues :

**Affichage des exercices**
- Nom de l'exercice.
- Illustration ou démonstration lorsque disponible.
- Groupes musculaires sollicités.
- Nombre de séries.
- Répétitions ciblées.
- Temps de repos.
- Dernières performances enregistrées.

**Saisie des performances**
- Saisie rapide des charges.
- Saisie rapide des répétitions.
- Validation d'une série en un minimum d'actions.
- Conservation des valeurs précédentes comme point de référence.
- Possibilité de modifier une valeur avant ou après validation.

**Gestion de la séance**
- Mise en pause et reprise.
- Sauvegarde automatique.
- Récupération de la séance après fermeture ou actualisation de l'application.
- Protection contre la perte de données.
- Possibilité de terminer une séance sans avoir renseigné toutes les séries.

**Repos**
- Minuteur de récupération facilement accessible.
- Démarrage rapide après validation d'une série.
- Possibilité de modifier ou d'arrêter le minuteur.

L'objectif est de rendre l'application aussi pratique que possible pendant l'effort.

## 4.5. Gestion des séances décalées

Le fonctionnement doit être flexible.

L'utilisateur peut s'entraîner à des jours différents de ceux initialement prévus.

Le programme doit donc fonctionner avec une logique de séquence et non avec un calendrier rigide.

Exemple :

Un utilisateur possède un programme Upper / Lower avec quatre séances hebdomadaires.

S'il ne s'entraîne pas le mercredi, l'application ne doit pas lui afficher une séance manquée ou lui demander de la rattraper.

Elle doit simplement lui proposer la prochaine séance logique lorsqu'il revient.

Cette logique doit également prendre en compte la récupération musculaire et éviter les enchaînements incohérents.

## 4.6. Cardio

Le cardio doit être intégré à la planification hebdomadaire du programme.

Les activités cardio doivent rester distinctes des séries de musculation.

Types d'activités :
- Marche.
- Course.
- Vélo.
- Elliptique.
- Rameur.
- Natation.
- Escaliers.
- Autre.

Pour chaque activité, permettre l'enregistrement de la durée en minutes.

L'utilisateur doit pouvoir ajouter, modifier ou supprimer une activité cardio.

Le cardio doit pouvoir être associé à une journée d'entraînement ou de récupération sans être systématiquement ajouté à la fin d'une séance de musculation.

L'affichage du planning doit éviter les doublons entre une activité cardio et un jour de repos.

## 4.7. Historique et statistiques

L'historique doit permettre de consulter :
- Les séances effectuées.
- Les performances par exercice.
- Les charges utilisées.
- Le volume d'entraînement.
- Les activités cardio.
- La progression sur plusieurs semaines.

Les statistiques doivent rester compréhensibles et utiles.

Privilégier les indicateurs qui aident réellement l'utilisateur à comprendre sa progression plutôt que de multiplier les graphiques.

## 4.8. Bilan de fin de cycle

Créer un écran dédié à la fin de chaque cycle.

Il doit présenter :
- Un résumé du cycle.
- Les séances réalisées.
- Les évolutions de performances.
- Les points positifs.
- Les points à améliorer.
- Le ressenti de l'utilisateur.
- La recommandation du moteur.

L'utilisateur doit ensuite pouvoir consulter le programme suivant et le valider.

Aucun nouveau cycle ne doit être activé automatiquement sans validation.

---

# 5. ARCHITECTURE ET QUALITÉ TECHNIQUE

## 5.1. Architecture existante

L'application repose actuellement sur :
- Une interface web progressive (PWA).
- Un hébergement GitHub Pages.
- Un dépôt GitHub.
- Supabase pour les données et l'authentification.

Le développeur devra conserver autant que possible cette architecture si elle répond aux besoins.

Toute évolution importante devra être justifiée techniquement.

## 5.2. Gestion des données

La fiabilité des données est prioritaire.

Exigences :
- Ne supprimer aucune donnée existante.
- Ne pas écraser l'historique lors d'une génération de programme.
- Préserver les programmes archivés.
- Conserver les performances enregistrées.
- Assurer l'intégrité des relations entre utilisateurs, programmes et séances.
- Prévoir des migrations de base de données additives et réversibles lorsque possible.
- Vérifier les droits d'accès et les politiques RLS de Supabase.

Les modifications doivent être testées avant leur déploiement en production.

## 5.3. Sauvegarde et synchronisation

L'application doit assurer une synchronisation fiable entre les appareils.

Une séance commencée sur un appareil doit pouvoir être retrouvée sur un autre après synchronisation.

Le développeur devra vérifier :
- La sauvegarde des données.
- La synchronisation avec Supabase.
- La gestion des erreurs réseau.
- Les conflits de modification.
- La persistance locale des séances en cours.
- La reprise après fermeture de l'application.

Il faut éviter toute perte de données en cas de connexion instable.

## 5.4. Performance et compatibilité

L'application doit rester rapide et fluide.

Vérifications :
- Temps de chargement.
- Fluidité des interactions.
- Compatibilité mobile.
- Compatibilité Safari iOS et Chrome Android.
- Affichage responsive.
- Comportement en mode PWA.
- Gestion des connexions réseau faibles.

Les écrans utilisés pendant les entraînements doivent être particulièrement réactifs.

## 5.5. Qualité et maintenance du code

Le développeur devra privilégier :
- Une architecture modulaire.
- Une séparation entre règles métier et interface utilisateur.
- Des fonctions de génération testables indépendamment.
- Une gestion centralisée des erreurs.
- Des composants réutilisables.
- Des tests automatisés sur les fonctionnalités critiques.

Éviter les duplications de logique entre les différentes méthodes d'entraînement.

---

# 6. ROADMAP DE DÉVELOPPEMENT

Le développement doit être organisé en lots indépendants et validables.

| Priorité | Lot | Objectif |
|---|---|---|
| P0 | Audit | Comprendre et documenter l'existant |
| P1 | Générateur | Fiabiliser la génération des programmes |
| P1 | Cycles | Structurer les programmes sur 6 à 8 semaines |
| P1 | Séances | Améliorer l'interface et la sauvegarde des entraînements |
| P2 | Historique | Exploiter les performances enregistrées |
| P2 | Substitutions | Développer les remplacements intelligents |
| P2 | Planning | Gérer les séances décalées et la récupération |
| P2 | Cardio | Fiabiliser son intégration dans le programme |
| P3 | Coach | Développer les recommandations de progression |
| P3 | Bilan | Créer le bilan et le renouvellement des cycles |

### Lot 0 — Audit préalable

Livrables :
- Cartographie technique.
- Analyse du questionnaire.
- Documentation du générateur.
- Analyse du schéma Supabase.
- Liste des fonctionnalités existantes.
- Liste des anomalies.
- Proposition d'évolution technique.

Aucune modification de production à ce stade.

### Lot 1 — Générateur et cycles

Livrables :
- Règles de génération documentées.
- Vérification des quatre méthodes.
- Tests automatisés.
- Gestion des paramètres de génération.
- Conservation de la configuration initiale.
- Gestion des cycles de 6 à 8 semaines.

### Lot 2 — Expérience d'entraînement

Livrables :
- Refonte ciblée de l'écran de séance.
- Saisie rapide des performances.
- Sauvegarde automatique.
- Pause et reprise.
- Minuteur de repos.
- Gestion des séances incomplètes.

### Lot 3 — Intelligence des exercices et historique

Livrables :
- Historique détaillé.
- Comparaison des performances.
- Substitutions pertinentes.
- Conservation des performances par exercice.
- Distinction entre modifications ponctuelles et permanentes.

### Lot 4 — Planning et récupération

Livrables :
- Logique de prochaine séance.
- Gestion des séances décalées.
- Prise en compte de la récupération.
- Intégration cohérente du cardio.
- Correction des anomalies d'affichage du planning.

### Lot 5 — Coach et progression

Livrables :
- Analyse des performances.
- Recommandations de progression.
- Détection des stagnations.
- Suggestions d'adaptation.
- Prise en compte du ressenti.

### Lot 6 — Bilan et renouvellement

Livrables :
- Bilan de fin de cycle.
- Recommandation personnalisée.
- Actualisation partielle du questionnaire.
- Génération du programme suivant.
- Validation utilisateur avant activation.

---

# 7. CRITÈRES DE VALIDATION

Chaque lot devra faire l'objet d'une validation avant son passage en production.

Les critères suivants sont obligatoires :

**Génération**
- Les quatre méthodes fonctionnent.
- Les séances sont cohérentes avec la méthode sélectionnée.
- Les réponses au questionnaire influencent réellement la génération.
- Les contraintes de fréquence et de matériel sont respectées.

**Cycles**
- Les programmes sont organisés sur 6 à 8 semaines.
- Les paramètres de génération sont conservés.
- Les programmes précédents restent accessibles.
- La progression peut être suivie sur l'ensemble du cycle.

**Entraînement**
- Les performances sont sauvegardées.
- Une séance peut être interrompue et reprise.
- Aucune donnée n'est perdue après actualisation.
- Les saisies sont rapides sur mobile.

**Planning**
- Les séances décalées sont correctement gérées.
- Aucune séance manquée n'est imposée à l'utilisateur.
- La prochaine séance proposée respecte la séquence du programme.

**Historique et progression**
- Les performances sont conservées.
- Les substitutions ne mélangent pas les historiques.
- Les recommandations s'appuient sur des données réelles.

**Données**
- Aucune donnée existante n'est supprimée.
- La synchronisation est vérifiée.
- Les migrations sont testées.
- Les accès aux données sont sécurisés.

**Déploiement**
- Les tests sont exécutés avant fusion.
- Les modifications sont réalisées sur une branche dédiée.
- Une revue est effectuée avant intégration à la branche principale.
- Le déploiement en production nécessite une validation préalable.

---

# 8. PRINCIPES À RESPECTER ABSOLUMENT

Les règles suivantes sont non négociables dans le cadre de cette évolution :

1. **Ne pas reconstruire l'application de zéro.** Auditer l'existant et améliorer les fonctionnalités déjà présentes.
2. **Ne supprimer aucune donnée.** Préserver les programmes, historiques, comptes et performances existants.
3. **Ne pas créer de système de séances manquées.** Le programme doit s'adapter au rythme réel de l'utilisateur.
4. **Ne pas rigidifier le calendrier.** La progression repose sur la séquence réelle des séances.
5. **Ne pas complexifier l'interface.** La simplicité et la rapidité d'utilisation restent prioritaires.
6. **Ne pas laisser une IA générer librement les entraînements.** Les règles sportives doivent être déterministes et vérifiables.
7. **Ne pas modifier automatiquement un programme actif.** Les adaptations structurelles doivent être maîtrisées et, lorsque nécessaire, validées par l'utilisateur.
8. **Ne pas activer automatiquement un nouveau cycle.** L'utilisateur doit conserver le contrôle.
9. **Ne pas confondre cardio et musculation.** Les deux activités doivent être intégrées dans le suivi avec des données adaptées.
10. **Ne pas déployer directement en production.** Chaque évolution doit être testée et validée.

---

# 9. LIVRABLES ATTENDUS DU DÉVELOPPEUR

Pour chaque lot, le développeur devra fournir :

- Une description des modifications réalisées.
- Les fichiers et composants concernés.
- Les éventuelles modifications de la base de données.
- Les tests effectués et leurs résultats.
- Les éventuelles limites identifiées.
- Une démonstration fonctionnelle sur mobile.
- La procédure de déploiement.
- Les éventuelles actions restant à effectuer.

Les évolutions devront être livrées progressivement afin de permettre une validation fonctionnelle à chaque étape.

## 10. OBJECTIF FINAL

À terme, STEROID doit devenir une application capable de :

- Comprendre le profil sportif de chaque utilisateur.
- Générer automatiquement un programme cohérent.
- Organiser les entraînements sur plusieurs semaines.
- Accompagner l'utilisateur pendant chaque séance.
- Enregistrer et analyser ses performances.
- S'adapter aux contraintes de son quotidien.
- Recommander des évolutions pertinentes.
- Construire progressivement un historique sportif exploitable.
- Générer un nouveau programme adapté à son évolution.

**STEROID ne doit pas être un simple carnet d'entraînement numérique. Il doit devenir un véritable assistant sportif qui connaît le programme de l'utilisateur, comprend sa progression et l'aide à s'améliorer.**

La priorité reste toutefois la fiabilité du moteur sportif et la qualité de l'expérience utilisateur. L'intelligence de l'application doit se ressentir dans la pertinence de ses décisions, pas dans la complexité de son interface.