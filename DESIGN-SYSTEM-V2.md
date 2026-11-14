# STÉROÏDE V2 — mini design system

## Marque
- Wordmark inchangé : STÉROÏDE, DejaVu Sans Bold, vert profond.
- Palette : vert profond `#0B4D3B`, crème `#F5F0E5`, vert pâle `#E6EFE5`, ivoire `#FFFCF7`, vert sombre `#073528`, encre `#1A2923`, texte secondaire `#4F6158`, bordure `#DCE8DD`.
- Titres : Archivo 900, capitales, affichage condensé.
- Texte : Inter 400–800.
- Icônes : SVG au trait, 2 px, sans emoji.

## Composants
- Cartes : ivoire sur fond crème, rayon généreux, ombre douce.
- Surface forte : vert profond, texte ivoire.
- Actions principales : fond vert profond, hauteur minimale 52 px.
- Contrôles : hauteur minimale 44 px, fond crème, bordure vert pâle.
- Navigation : barre flottante vert profond ; onglet actif ivoire.
- États validés : vert pâle ; état de synchronisation toujours textuel et explicite.

## Ergonomie
- Base de maquette : 390 × 844 px.
- Cibles tactiles : 44 px minimum.
- Focus clavier visible, contrastes à vérifier écran par écran.
- Les champs numériques de programme doivent évoluer vers des menus déroulants sans clavier.
- Aucun faux record ; une performance ne compte que si la série est validée et comparable.
- Les calories restent des estimations et ne doivent jamais être présentées comme exactes.
- Local et Cloud restent deux états distincts ; ne jamais annoncer une synchronisation avant confirmation serveur.

## Mouvement
- Transitions courtes et discrètes (160–220 ms), easing doux.
- Validation de série : coche rapide (180 ms).
- Barre de progression : 220 ms.
- Panneaux bas : 220 ms.
- Réduction des animations : respecter `prefers-reduced-motion`.

## Périmètre de cette première livraison
Cette première couche pose les tokens, la typographie, les surfaces, la navigation, le contraste de base, les états de focus et les premiers éléments de l'accueil. Les écrans secondaires, leurs états complets, les parcours interactifs et la sélection photographique restent à construire et à valider avant toute mise en production.
