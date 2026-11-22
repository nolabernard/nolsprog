/* STÉROÏDE — illustrations et consignes d'exécution, par type de mouvement (pattern du catalogue).
 * Pictogrammes SVG au trait dessinés pour l'app (aucune image externe, aucun droit tiers) ; consignes courtes et
 * générales, sans diagnostic. Une douleur = on arrête et on demande l'avis d'un professionnel. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidMoves=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Éléments de dessin : tête, segments, haltère/barre, flèche de mouvement.
const head=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="7"/>';
const line=(...p)=>'<polyline points="'+p.join(' ')+'"/>';
const bar=(x1,x2,y)=>'<line x1="'+x1+'" y1="'+y+'" x2="'+x2+'" y2="'+y+'"/><line x1="'+(x1+3)+'" y1="'+(y-6)+'" x2="'+(x1+3)+'" y2="'+(y+6)+'"/><line x1="'+(x2-3)+'" y1="'+(y-6)+'" x2="'+(x2-3)+'" y2="'+(y+6)+'"/>';
const db=(x,y)=>'<line x1="'+(x-6)+'" y1="'+y+'" x2="'+(x+6)+'" y2="'+y+'"/><line x1="'+(x-6)+'" y1="'+(y-4)+'" x2="'+(x-6)+'" y2="'+(y+4)+'"/><line x1="'+(x+6)+'" y1="'+(y-4)+'" x2="'+(x+6)+'" y2="'+(y+4)+'"/>';
const arrow=d=>'<path class="mv-arrow" d="'+d+'"/>';
const floor=y=>'<line class="mv-floor" x1="8" y1="'+y+'" x2="112" y2="'+y+'"/>';

const MOVES={
 pushH:{label:'Poussée horizontale',draw:floor(84)+'<line class="mv-floor" x1="18" y1="64" x2="84" y2="64"/>'+head(24,52)+line('31,56','74,56','86,70','86,84')+line('40,56','40,30')+bar(24,56,28)+arrow('M100 50 V24 M95 30 L100 24 L105 30'),
  cues:['Omoplates serrées et basses, pieds bien ancrés au sol.','Descends sous contrôle jusqu’à effleurer la poitrine, coudes à environ 45°.','Pousse sans décoller les fesses ni bloquer brutalement les coudes.']},
 chestIso:{label:'Écarté pectoraux',draw:floor(84)+'<line class="mv-floor" x1="18" y1="64" x2="84" y2="64"/>'+head(24,52)+line('31,56','74,56','86,70','86,84')+line('40,56','22,40')+line('40,56','58,40')+db(22,40)+db(58,40)+arrow('M20 26 Q40 10 60 26'),
  cues:['Coudes légèrement fléchis et fixes du début à la fin.','Ouvre les bras jusqu’à sentir l’étirement de la poitrine, sans douleur à l’épaule.','Ramène les mains comme pour serrer un gros arbre.']},
 pullV:{label:'Tirage vertical',draw:'<line x1="22" y1="10" x2="98" y2="10"/>'+head(60,30)+line('42,12','52,40','60,40','68,40','78,12')+line('60,37','60,64')+line('52,86','60,64','68,86')+arrow('M104 22 V50 M99 44 L104 50 L109 44'),
  cues:['Poitrine sortie, épaules basses avant de tirer.','Tire les coudes vers les hanches, la barre vers le haut de la poitrine.','Remonte lentement jusqu’à bras presque tendus.']},
 pullH:{label:'Tirage horizontal',draw:floor(86)+head(82,30)+line('76,36','50,58')+line('50,58','44,86')+line('50,58','58,86')+line('72,40','64,58','80,58')+'<line x1="80" y1="58" x2="108" y2="58"/>'+arrow('M100 72 H76 M82 67 L76 72 L82 77'),
  cues:['Dos droit et gainé, poitrine vers l’avant.','Tire les coudes en arrière en serrant les omoplates.','Reviens bras tendus sans arrondir le dos.']},
 squat:{label:'Squat / presse',draw:floor(86)+head(60,20)+bar(40,80,30)+line('60,28','52,56','74,60','70,86')+line('46,30','52,34')+arrow('M98 30 V60 M93 54 L98 60 L103 54'),
  cues:['Pieds à largeur d’épaules, genoux dans l’axe des pieds.','Descends hanches en arrière, dos neutre, talons au sol.','Remonte en poussant le sol, sans verrouiller les genoux en force.']},
 hinge:{label:'Charnière de hanche',draw:floor(86)+head(84,34)+line('78,40','50,52')+line('50,52','54,86')+line('74,42','72,72')+bar(58,90,74)+arrow('M30 70 Q24 50 40 36 M34 36 L40 36 L40 42'),
  cues:['Barre ou haltères près des jambes, dos plat du début à la fin.','Pousse les hanches en arrière, genoux légèrement fléchis.','Remonte en contractant les fessiers, sans cambrer en haut.']},
 hamIso:{label:'Ischio-jambiers',draw:floor(86)+'<line class="mv-floor" x1="16" y1="62" x2="92" y2="62"/>'+head(22,50)+line('30,54','72,56','92,56','100,34')+arrow('M108 58 Q112 40 102 26 M100 32 L102 26 L108 28'),
  cues:['Bassin plaqué sur le banc ou le siège.','Plie les genoux en contrôlant, sans donner d’à-coup.','Reviens lentement en gardant la tension.']},
 quadIso:{label:'Extension des jambes',draw:floor(86)+'<line class="mv-floor" x1="30" y1="64" x2="66" y2="64"/>'+head(40,20)+line('40,28','40,60','66,60','92,50')+arrow('M86 74 Q100 70 102 54 M97 58 L102 54 L106 59'),
  cues:['Dos bien calé contre le dossier, mains sur les poignées.','Tends les jambes sans verrouiller les genoux.','Marque une courte pause en haut, puis redescends lentement.']},
 calves:{label:'Mollets',draw:'<rect class="mv-floor" x="44" y="76" width="32" height="10"/>'+head(60,14)+line('60,22','60,52')+line('56,76','60,52','64,76')+line('60,30','48,46')+line('60,30','72,46')+arrow('M92 80 V56 M87 62 L92 56 L97 62'),
  cues:['Avant des pieds sur la marche, talons dans le vide.','Monte le plus haut possible et marque une pause.','Descends lentement jusqu’à l’étirement complet.']},
 pushV:{label:'Développé au-dessus de la tête',draw:floor(86)+head(60,32)+bar(34,86,10)+line('46,10','52,40','68,40','74,10')+line('60,40','60,64')+line('52,86','60,64','68,86')+arrow('M100 40 V16 M95 22 L100 16 L105 22'),
  cues:['Gaine les abdos et serre les fessiers : pas de cambrure.','Pousse à la verticale, la tête passe sous les bras en haut.','Redescends sous contrôle jusqu’au menton.']},
 side:{label:'Élévations latérales',draw:floor(86)+head(60,22)+line('60,30','60,60')+line('52,86','60,60','68,86')+line('60,36','28,40')+line('60,36','92,40')+db(26,40)+db(94,40)+arrow('M18 60 Q14 46 22 32 M17 37 L22 32 L26 38'),
  cues:['Léger buste penché en avant, coudes un peu fléchis.','Monte les bras sur les côtés jusqu’à hauteur des épaules, pas plus.','Redescends lentement, sans élan.']},
 rear:{label:'Arrière d’épaule',draw:floor(86)+head(86,38)+line('79,42','50,54','54,86')+line('72,46','60,22')+db(58,20)+arrow('M40 60 Q34 42 44 30 M38 32 L44 30 L46 36'),
  cues:['Buste penché, dos plat, nuque dans l’alignement.','Ouvre les bras vers l’arrière en pensant « coudes ».','Petites charges : le mouvement doit rester lent et contrôlé.']},
 biceps:{label:'Flexion des bras',draw:floor(86)+head(60,20)+line('60,28','60,60')+line('52,86','60,60','68,86')+line('60,34','58,58','76,46')+db(78,44)+arrow('M96 66 Q102 48 90 34 M89 40 L90 34 L96 36'),
  cues:['Coudes collés au corps et immobiles.','Monte sans balancer le buste.','Redescends complètement, bras presque tendus.']},
 triceps:{label:'Extension des triceps',draw:floor(86)+'<line x1="72" y1="4" x2="72" y2="54"/>'+head(56,20)+line('56,28','56,60')+line('48,86','56,60','64,86')+line('56,34','64,54','72,72')+'<line x1="66" y1="72" x2="78" y2="72"/>'+arrow('M94 46 V72 M89 66 L94 72 L99 66'),
  cues:['Coudes fixes, près de la tête ou du buste selon la variante.','Tends complètement les bras sans bouger les épaules.','Reviens lentement jusqu’à l’étirement.']},
 core:{label:'Gainage / abdominaux',draw:floor(74)+head(22,46)+line('29,50','96,62','100,74')+line('34,52','34,72','48,72'),
  cues:['Corps aligné de la tête aux talons, bassin ni trop haut ni trop bas.','Rentre le nombril et respire calmement.','Arrête la série dès que la position se dégrade.']}
};
const GENERIC={label:'Exercice',draw:floor(86)+head(60,20)+line('60,28','60,60')+line('52,86','60,60','68,86')+line('44,46','60,34','76,46'),cues:['Mouvement contrôlé, sans élan.','Amplitude complète tant qu’elle reste confortable.','Charge que tu maîtrises sur toutes les répétitions.']};

function move(pattern){return MOVES[pattern]||GENERIC}
// Pictogramme : décoratif (aria-hidden) ; le nom et les consignes portent l'information.
function svg(pattern,{size=96,cls='mv-pic'}={}){
 return '<svg class="'+cls+'" viewBox="0 0 120 92" width="'+size+'" height="'+Math.round(size*92/120)+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+move(pattern).draw+'</svg>';
}
return {MOVES,move,svg,cues:p=>move(p).cues,label:p=>move(p).label};
});
