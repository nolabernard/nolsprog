/* STEROID — illustrations et consignes d'exécution, par type de mouvement (pattern du catalogue).
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

// ===== Pictogrammes v2 (24/11/2026) : un dessin par mouvement, même personnage partout, 2 positions (k = 0 départ, 1 arrivée).
// Le personnage est décrit par des angles d'articulations (proportions fixes) : les animations interpolent entre les 2 positions.
const PIC=(function(){
// Moteur de pictogrammes STEROID : un seul personnage (proportions fixes), décrit par des angles d'articulations.
// Angles en degrés : 0 = vers la droite, 90 = vers le bas, -90 = vers le haut. Vue de profil, tourné vers la droite (f=1) ou la gauche (f=-1).
const L={torso:25,neck:3,head:6,ua:13,fa:12,th:17,sh:17,foot:5};
const R=d=>d*Math.PI/180,P=(o,a,l)=>[+(o[0]+Math.cos(R(a))*l).toFixed(1),+(o[1]+Math.sin(R(a))*l).toFixed(1)];
const pl=(...p)=>'<polyline points="'+p.map(q=>q.join(',')).join(' ')+'"/>';
const ln=(a,b,c='')=>'<line'+(c?' class="'+c+'"':'')+' x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';
const ci=(c,r,k='')=>'<circle'+(k?' class="'+k+'"':'')+' cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'"/>';
const rc=(x,y,w,h,k='mv-eq')=>'<rect class="'+k+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2"/>';
// Personnage : hip, t (torse), arms [[bras, avant-bras]...], legs [[cuisse, jambe, pied?]...]. Le premier bras/jambe est le plus proche.
function fig({hip,t=-90,hd=null,arms=[[90,90]],legs=[[90,90]],f=1,feet=true}){
 const sh=P(hip,t,L.torso),nk=P(sh,hd??t,L.neck),hc=P(nk,hd??t,L.head);
 const ar=[+(sh[0]+2*f).toFixed(1),+(sh[1]+1.5).toFixed(1)]; // racine des bras un peu en avant : le bras ne se confond pas avec le buste
 const A=arms.map(([u,a])=>{const e=P(ar,u,L.ua),h=P(e,a,L.fa);return {e,h}});
 const G=legs.map(([u,a,ft])=>{const k=P(hip,u,L.th),fo=P(k,a,L.sh),toe=P(fo,ft??(f>0?0:180),L.foot);return {k,fo,toe}});
 let s='';
 // membres éloignés d'abord, en trait plus fin
 G.slice(1).forEach(g=>s+='<g class="mv-far">'+pl(hip,g.k,g.fo)+(feet?pl(g.fo,g.toe):'')+'</g>');
 A.slice(1).forEach(a=>s+='<g class="mv-far">'+pl(ar,a.e,a.h)+'</g>');
 s+='<polyline class="mv-torso" points="'+hip.join(',')+' '+sh.join(',')+'"/>'+ci(hc,L.head,'mv-head');
 G.slice(0,1).forEach(g=>s+=pl(hip,g.k,g.fo)+(feet?pl(g.fo,g.toe):''));
 A.slice(0,1).forEach(a=>s+=pl(ar,a.e,a.h));
 return {svg:s,hip,sh,head:hc,hand:A.map(a=>a.h),elbow:A.map(a=>a.e),knee:G.map(g=>g.k),foot:G.map(g=>g.fo)};
}
// Matériel
const eq={
 floor:(y=88)=>ln([6,y],[114,y],'mv-floor'),
 bar:h=>ci(h,5.5,'mv-eq')+ci(h,1.6,'mv-eq-fill'),                 // barre vue de profil : disque
 db:h=>rc(h[0]-5,h[1]-2.5,10,5),                                     // haltère
 kb:h=>ci([h[0],h[1]+3],4,'mv-eq'),
 handle:h=>ci(h,2.2,'mv-eq'),
 cable:(from,h)=>ci(from,3,'mv-eq')+ln(from,h,'mv-cable')+ci(h,2,'mv-eq'),
 bench:(x1,x2,y)=>ln([x1,y],[x2,y],'mv-eq-thick')+ln([x1+6,y],[x1+6,88],'mv-eq')+ln([x2-6,y],[x2-6,88],'mv-eq'),
 incline:(x1,y1,x2,y2)=>ln([x1,y1],[x2,y2],'mv-eq-thick')+ln([x2,y2],[x2,88],'mv-eq')+ln([x1+4,y1+2],[x1+4,88],'mv-eq'),
 seat:(x,y,w=22)=>ln([x,y],[x+w,y],'mv-eq-thick')+ln([x+w/2,y],[x+w/2,88],'mv-eq'),
 back:(x1,y1,x2,y2)=>ln([x1,y1],[x2,y2],'mv-eq-thick'),
 pad:(c,r=3.5)=>ci(c,r,'mv-eq'),
 pullbar:(x1,x2,y)=>ln([x1,y],[x2,y],'mv-eq-thick')+ln([x1,y],[x1,y-6],'mv-eq')+ln([x2,y],[x2,y-6],'mv-eq'),
 step:(x,w=20)=>rc(x,80,w,8,'mv-eq'),
 bag:h=>rc(h[0]-5,h[1],10,9),
 arrow:()=>''
};
// Pictogrammes STEROID : un par mouvement réellement différent, chacun en 2 positions (0 = départ, 1 = arrivée).
const F=eq.floor();
const STAND=[[97,88],[83,92]];
const mix=(a,b,k)=>Array.isArray(a)?a.map((x,i)=>mix(x,b[i],k)):a+(b-a)*k;
// Raccourci : une pose = paramètres du personnage ; k = 0 départ, 1 arrivée.
const pose=(p0,p1,k)=>{const o={};for(const key in p0)o[key]=(key==='f'||key==='feet')?p0[key]:mix(p0[key],p1[key],k);return o};

const PICTOS={
 // ---------- Pectoraux ----------
 'bench-bar':{label:'Développé couché (barre)',draw:k=>{const p=fig(pose({hip:[72,60],t:180,legs:[[20,100]],arms:[[-90,-90]]},{hip:[72,60],t:180,legs:[[20,100]],arms:[[115,-75]]},k));
  return F+eq.bench(24,84,66)+p.svg+eq.bar([p.hand[0][0],p.hand[0][1]-3])+eq.arrow(k?'M60 30v-10':'M60 22v10')}},
 'bench-db':{label:'Développé couché (haltères)',draw:k=>{const p=fig(pose({hip:[72,60],t:180,legs:[[20,100]],arms:[[-90,-90]]},{hip:[72,60],t:180,legs:[[20,100]],arms:[[115,-75]]},k));
  return F+eq.bench(24,84,66)+p.svg+eq.db([p.hand[0][0],p.hand[0][1]-3])}},
 'floor-press':{label:'Développé au sol (haltères)',draw:k=>{const p=fig(pose({hip:[74,82],t:180,legs:[[-30,60]],arms:[[-90,-90]]},{hip:[74,82],t:180,legs:[[-30,60]],arms:[[100,-80]]},k));
  return F+p.svg+eq.db([p.hand[0][0],p.hand[0][1]-3])}},
 'incline-press':{label:'Développé incliné',draw:k=>{const p=fig(pose({hip:[70,64],t:-150,legs:[[15,95]],arms:[[-120,-120]]},{hip:[70,64],t:-150,legs:[[15,95]],arms:[[110,-95]]},k));
  return F+eq.incline(30,40,74,68)+p.svg+eq.db([p.hand[0][0],p.hand[0][1]-3])}},
 'chest-press':{label:'Développé machine assis',draw:k=>{const p=fig(pose({hip:[44,62],t:-95,legs:[[0,95]],arms:[[30,10]]},{hip:[44,62],t:-95,legs:[[0,95]],arms:[[5,0]]},k));
  return F+eq.seat(30,66)+eq.back(34,66,36,30)+p.svg+eq.handle(p.hand[0])}},
 'push-up':{label:'Pompes',draw:k=>{const p=fig(pose({hip:[60,62],t:180,hd:180,legs:[[8,8,90]],arms:[[90,90]],feet:true},{hip:[60,72],t:178,hd:180,legs:[[11,11,90]],arms:[[60,120]]},k));
  return F+p.svg}},
 'incline-push-up':{label:'Pompes inclinées',draw:k=>{const p=fig(pose({hip:[66,58],t:200,legs:[[20,20,90]],arms:[[105,105]]},{hip:[66,62],t:205,legs:[[22,22,90]],arms:[[60,140]]},k));
  return F+eq.bench(14,40,64)+p.svg}},
 'dips':{label:'Dips',draw:k=>{const p=fig(pose({hip:[60,52],t:-88,legs:[[95,130]],arms:[[88,92]]},{hip:[60,62],t:-80,legs:[[95,130]],arms:[[140,33]]},k));
  return F+'<line class="mv-eq-thick" x1="40" y1="'+(p.hand[0][1]+1)+'" x2="82" y2="'+(p.hand[0][1]+1)+'"/>'+'<line class="mv-eq" x1="44" y1="'+(p.hand[0][1]+1)+'" x2="44" y2="88"/><line class="mv-eq" x1="78" y1="'+(p.hand[0][1]+1)+'" x2="78" y2="88"/>'+p.svg}},
 'pec-deck':{label:'Pec deck',draw:k=>{// vue de face, bras qui se referment
  const s=[60,30],a=k?18:42,hL=[60-a,30],hR=[60+a,30];
  return F+eq.seat(46,62,28)+'<polyline points="60,62 60,30"/>'+'<circle cx="60" cy="21" r="6"/>'+'<polyline points="60,62 52,88"/><polyline points="60,62 68,88"/>'
   +'<polyline points="60,32 '+(60-a/1.4)+',38 '+hL[0]+',30"/><polyline points="60,32 '+(60+a/1.4)+',38 '+hR[0]+',30"/>'+eq.handle(hL)+eq.handle(hR)+eq.arrow(k?'M30 46 h8':'M38 46 h-8')}},
 'cable-fly':{label:'Écarté poulie',draw:k=>{const a=k?10:40,y=k?46:34;
  return F+'<polyline points="60,54 60,29"/><circle cx="60" cy="20" r="6"/><polyline points="60,54 54,88"/><polyline points="60,54 66,88"/>'
   +'<polyline points="60,31 '+(60-a*.7)+','+(y-4)+' '+(60-a)+','+y+'"/><polyline points="60,31 '+(60+a*.7)+','+(y-4)+' '+(60+a)+','+y+'"/>'+eq.cable([10,14],[60-a,y])+eq.cable([110,14],[60+a,y])}},
 // ---------- Dos ----------
 'lat-pulldown':{label:'Tirage vertical',draw:k=>{const p=fig(pose({hip:[56,62],t:-95,legs:[[0,95]],arms:[[-85,-90]]},{hip:[56,62],t:-100,legs:[[0,95]],arms:[[100,-80]]},k));
  return F+eq.seat(42,66)+p.svg+eq.pad([p.knee[0][0]+2,p.knee[0][1]-5])+eq.cable([58,6],p.hand[0])+'<line class="mv-eq-thick" x1="'+(p.hand[0][0]-12)+'" y1="'+p.hand[0][1]+'" x2="'+(p.hand[0][0]+12)+'" y2="'+p.hand[0][1]+'"/>'}},
 'assisted-pull-up':{label:'Tractions assistées',draw:k=>{const p=fig(pose({hip:[60,58],t:-90,legs:[[100,140]],arms:[[-90,-90]]},{hip:[60,46],t:-90,legs:[[100,140]],arms:[[-150,-20]]},k));
  return F+eq.pullbar(38,82,8)+p.svg+eq.pad([p.knee[0][0]-2,p.knee[0][1]+4],4)}},
 'pullover':{label:'Pull-over poulie',draw:k=>{const p=fig(pose({hip:[56,54],t:-80,legs:STAND,arms:[[-60,-60]]},{hip:[56,54],t:-80,legs:STAND,arms:[[80,80]]},k));
  return F+p.svg+eq.cable([104,8],p.hand[0])}},
 'row-supported':{label:'Rowing appui poitrine',draw:k=>{const p=fig(pose({hip:[40,62],t:-55,legs:[[15,95]],arms:[[25,15]]},{hip:[40,62],t:-55,legs:[[15,95]],arms:[[165,-20]]},k));
  const c=P(p.hip,-55,16);return F+eq.seat(28,66,20)+'<line class="mv-eq-thick" x1="'+(c[0]+6)+'" y1="'+(c[1]-9)+'" x2="'+(c[0]+6)+'" y2="'+(c[1]+9)+'"/>'+'<line class="mv-eq" x1="'+(c[0]+6)+'" y1="'+(c[1]+9)+'" x2="'+(c[0]+6)+'" y2="88"/>'+p.svg+eq.handle(p.hand[0])}},
 'row-one-arm':{label:'Rowing unilatéral (haltère)',draw:k=>{const p=fig(pose({hip:[78,53],t:180,hd:185,f:-1,legs:[[80,95],[90,0,0]],arms:[[90,90],[160,60]]},{hip:[78,53],t:180,hd:185,f:-1,legs:[[80,95],[90,0,0]],arms:[[-35,95],[160,60]]},k));
  return F+eq.bench(40,100,72)+p.svg+eq.db(p.hand[0])}},
 'row-bent':{label:'Rowing buste penché',draw:k=>{const p=fig(pose({hip:[48,54],t:-25,legs:[[100,80]],arms:[[90,90]]},{hip:[48,54],t:-25,legs:[[100,80]],arms:[[170,80]]},k));
  return F+p.svg+eq.db(p.hand[0])}},
 'row-cable':{label:'Tirage horizontal poulie',draw:k=>{const p=fig(pose({hip:[40,78],t:-75,legs:[[-5,15,-80]],arms:[[10,0]]},{hip:[40,78],t:-95,legs:[[-5,15,-80]],arms:[[150,-5]]},k));
  return F+'<line class="mv-eq-thick" x1="24" y1="82" x2="60" y2="82"/>'+eq.step(78,10)+p.svg+eq.cable([104,70],p.hand[0])}},
 // ---------- Jambes ----------
 'squat-bar':{label:'Squat (barre)',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:[[95,85]],arms:[[150,-60]]},{hip:[50,70],t:-55,legs:[[15,110]],arms:[[180,-60]]},k));
  return F+p.svg+eq.bar([p.sh[0]-5,p.sh[1]+1])}},
 'goblet-squat':{label:'Goblet squat',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:[[95,85]],arms:[[60,-100]]},{hip:[50,70],t:-60,legs:[[15,110]],arms:[[60,-100]]},k));
  return F+p.svg+eq.kb([p.hand[0][0]+2,p.hand[0][1]-6])}},
 'bw-squat':{label:'Squat au poids du corps',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:[[95,85]],arms:[[90,90]]},{hip:[50,70],t:-60,legs:[[15,110]],arms:[[0,0]]},k));
  return F+p.svg}},
 'hack-squat':{label:'Hack squat',draw:k=>{const o=pose({hip:[48,52],t:-108,legs:[[78,82]],arms:[[-70,-150]]},{hip:[42,68],t:-112,legs:[[-5,100]],arms:[[-70,-150]]},k);const p=fig(o);
  const b0=P(p.hip,o.t+90,-5),b1=P(p.sh,o.t+90,-5),top=P(b1,o.t,10),bot=P(b0,o.t,-14);return F+'<line class="mv-eq-thick" x1="'+bot[0]+'" y1="'+bot[1]+'" x2="'+top[0]+'" y2="'+top[1]+'"/>'+'<line class="mv-eq" x1="'+bot[0]+'" y1="'+bot[1]+'" x2="'+(bot[0]-6)+'" y2="88"/>'+'<line class="mv-eq-thick" x1="52" y1="88" x2="84" y2="82"/>'+eq.pad([p.sh[0]+2,p.sh[1]-2],3)+p.svg}},
 'leg-press':{label:'Presse à cuisses',draw:k=>{const o=pose({hip:[36,72],t:-135,legs:[[-80,15,-75]],arms:[[40,10]]},{hip:[36,72],t:-135,legs:[[-35,-25,-115]],arms:[[40,10]]},k);const p=fig(o);
  const b0=P(p.hip,o.t+90,-5),top=P(P(p.sh,o.t+90,-5),o.t,8),f=p.foot[0],sh2=o.legs[0][1],u=P(f,sh2+90,10),d=P(f,sh2-90,10);
  return F+'<line class="mv-eq-thick" x1="'+b0[0]+'" y1="'+b0[1]+'" x2="'+top[0]+'" y2="'+top[1]+'"/>'+'<line class="mv-eq-thick" x1="'+(b0[0]-4)+'" y1="'+(b0[1]+4)+'" x2="'+(b0[0]+14)+'" y2="'+(b0[1]+4)+'"/><line class="mv-eq" x1="'+(b0[0]+5)+'" y1="'+(b0[1]+4)+'" x2="'+(b0[0]+5)+'" y2="88"/>'+'<line class="mv-eq-thick" x1="'+u[0]+'" y1="'+u[1]+'" x2="'+d[0]+'" y2="'+d[1]+'"/>'+p.svg}},
 'lunge':{label:'Fentes arrière',draw:k=>{const p=fig(pose({hip:[60,54],t:-90,legs:[[92,90],[88,90]],arms:[[80,88]]},{hip:[58,68],t:-90,legs:[[0,90],[125,165,180]],arms:[[80,88]]},k));
  return F+p.svg+eq.db(p.hand[0])}},
 'side-lunge':{label:'Fentes latérales',draw:k=>{// vue de face
  const hy=k?68:54,lx=k?30:52,rx=k?80:68,rk=k?[72,74]:[68,71];
  return F+'<polyline points="'+(k?58:60)+','+hy+' '+(k?56:60)+','+(hy-25)+'"/><circle cx="'+(k?55:60)+'" cy="'+(hy-34)+'" r="6"/>'
   +'<polyline points="'+(k?58:60)+','+hy+' '+lx+',88"/><polyline points="'+(k?58:60)+','+hy+' '+rk[0]+','+rk[1]+' '+rx+',88"/>'+'<polyline points="'+(k?57:60)+','+(hy-22)+' '+(k?60:56)+','+(hy-8)+'"/>'}},
 'rdl':{label:'Soulevé de terre roumain',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:[[95,88]],arms:[[90,90]]},{hip:[62,56],t:-15,legs:[[100,88]],arms:[[90,90]]},k));
  return F+p.svg+eq.bar(p.hand[0])}},
 'hip-thrust':{label:'Hip thrust',draw:k=>{const p=fig(pose({hip:[56,78],t:-150,hd:-120,legs:[[-20,90]],arms:[[45,0]]},{hip:[62,62],t:-178,hd:-120,legs:[[20,95]],arms:[[30,10]]},k));
  return F+eq.bench(12,34,62)+p.svg+eq.bar([p.hip[0],p.hip[1]-5])}},
 'glute-bridge':{label:'Pont fessier',draw:k=>{const p=fig(pose({hip:[56,84],t:180,hd:180,legs:[[-40,80]],arms:[[180,180]]},{hip:[56,70],t:160,hd:175,legs:[[-10,95]],arms:[[180,180]]},k));
  return F+p.svg}},
 'leg-curl-seated':{label:'Leg curl assis',draw:k=>{const p=fig(pose({hip:[44,60],t:-95,legs:[[0,0]],arms:[[60,0]]},{hip:[44,60],t:-95,legs:[[0,100]],arms:[[60,0]]},k));
  return F+eq.seat(28,64,30)+eq.back(30,64,32,28)+p.svg+eq.pad([p.foot[0][0]+2,p.foot[0][1]+3])}},
 'leg-curl-lying':{label:'Leg curl allongé',draw:k=>{const p=fig(pose({hip:[56,62],t:180,hd:200,legs:[[0,0,90]],arms:[[110,20]]},{hip:[56,62],t:180,hd:200,legs:[[0,-80,-90]],arms:[[110,20]]},k));
  return F+eq.bench(18,92,66)+p.svg+eq.pad([p.foot[0][0]-1,p.foot[0][1]-4])}},
 'leg-extension':{label:'Leg extension',draw:k=>{const p=fig(pose({hip:[44,60],t:-95,legs:[[0,95]],arms:[[60,0]]},{hip:[44,60],t:-95,legs:[[0,5]],arms:[[60,0]]},k));
  return F+eq.seat(28,64,30)+eq.back(30,64,32,28)+p.svg+eq.pad([p.foot[0][0]+1,p.foot[0][1]+4])}},
 'calf-standing':{label:'Mollets debout',draw:k=>{const p=fig(pose({hip:[60,52],t:-90,legs:[[92,90,20]],arms:[[80,85]]},{hip:[60,47],t:-90,legs:[[92,90,60]],arms:[[80,85]]},k));
  return F+eq.step(52,22)+p.svg}},
 'calf-seated':{label:'Mollets assis',draw:k=>{const p=fig(pose({hip:[44,60],t:-90,legs:[[0,90,20]],arms:[[60,0]]},{hip:[44,60],t:-90,legs:[[0,82,60]],arms:[[60,0]]},k));
  return F+eq.seat(26,64,26)+eq.step(56,18)+p.svg+eq.pad([p.knee[0][0]-2,p.knee[0][1]-5])}},
 // ---------- Épaules ----------
 'shoulder-press':{label:'Développé épaules',draw:k=>{const p=fig(pose({hip:[56,60],t:-92,legs:[[0,95]],arms:[[160,-80]]},{hip:[56,60],t:-92,legs:[[0,95]],arms:[[-95,-90]]},k));
  return F+eq.seat(42,64,24)+eq.back(46,64,48,26)+p.svg+eq.db([p.hand[0][0],p.hand[0][1]-2])}},
 'lateral-raise':{label:'Élévations latérales',draw:k=>{const a=k?-5:75;const r=a*Math.PI/180;
  const L1=[60-Math.cos(r)*13,31+Math.sin(r)*13],L2=[60-Math.cos(r)*25,31+Math.sin(r)*25],R1=[60+Math.cos(r)*13,31+Math.sin(r)*13],R2=[60+Math.cos(r)*25,31+Math.sin(r)*25];
  return F+'<polyline points="60,54 60,29"/><circle cx="60" cy="20" r="6"/><polyline points="60,54 54,88"/><polyline points="60,54 66,88"/>'+'<polyline points="60,31 '+L1+' '+L2+'"/><polyline points="60,31 '+R1+' '+R2+'"/>'+eq.db(L2)+eq.db(R2)}},
 'front-raise':{label:'Élévation frontale',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:STAND,arms:[[85,85]]},{hip:[56,54],t:-90,legs:STAND,arms:[[0,0]]},k));
  return F+p.svg+eq.db(p.hand[0])}},
 'rear-delt':{label:'Oiseau (arrière d’épaule)',draw:k=>{// buste penché vu de face : bras qui s'ouvrent
  const a=k?-10:80,r=a*Math.PI/180,L2=[60-Math.cos(r)*25,48+Math.sin(r)*25],R2=[60+Math.cos(r)*25,48+Math.sin(r)*25];
  return F+'<circle cx="60" cy="40" r="6"/><polyline points="60,48 60,60"/><polyline points="60,60 50,72 52,88"/><polyline points="60,60 70,72 68,88"/><polyline points="60,48 '+L2+'"/><polyline points="60,48 '+R2+'"/>'+eq.db(L2)+eq.db(R2)}},
 // ---------- Bras ----------
 'curl':{label:'Curl debout',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:STAND,arms:[[78,82]]},{hip:[56,54],t:-90,legs:STAND,arms:[[82,-80]]},k));
  return F+p.svg+eq.db(p.hand[0])}},
 'curl-incline':{label:'Curl incliné',draw:k=>{const p=fig(pose({hip:[64,66],t:-125,legs:[[10,95]],arms:[[100,100]]},{hip:[64,66],t:-125,legs:[[10,95]],arms:[[100,-60]]},k));
  return F+eq.incline(32,28,70,70)+p.svg+eq.db(p.hand[0])}},
 'curl-preacher':{label:'Curl pupitre',draw:k=>{const p=fig(pose({hip:[42,62],t:-85,legs:[[0,95]],arms:[[45,45]]},{hip:[42,62],t:-85,legs:[[0,95]],arms:[[45,-100]]},k));
  return F+eq.seat(30,66,20)+eq.back(48,40,64,56)+p.svg+eq.bar(p.hand[0])}},
 'curl-cable-high':{label:'Curl poulie haute',draw:k=>{// vue de face, bras à l'horizontale, avant-bras qui se plient
  const ang=k?-100:-5;const r=ang*Math.PI/180;const fL=[34-Math.cos(r)*0,31],hL=[34+Math.cos(r)*12*-1,31+Math.sin(r)*12],hR=[86+Math.cos(r)*12,31+Math.sin(r)*12];
  return F+'<polyline points="60,54 60,29"/><circle cx="60" cy="20" r="6"/><polyline points="60,54 54,88"/><polyline points="60,54 66,88"/><polyline points="60,31 34,31 '+hL+'"/><polyline points="60,31 86,31 '+hR+'"/>'+eq.cable([6,26],hL)+eq.cable([114,26],hR)}},
 'pushdown':{label:'Extension triceps poulie',draw:k=>{const p=fig(pose({hip:[56,54],t:-85,legs:STAND,arms:[[95,-55]]},{hip:[56,54],t:-85,legs:STAND,arms:[[95,85]]},k));
  return F+p.svg+eq.cable([76,6],p.hand[0])}},
 'overhead-ext':{label:'Extension au-dessus de la tête',draw:k=>{const p=fig(pose({hip:[56,54],t:-90,legs:STAND,arms:[[-100,105]]},{hip:[56,54],t:-90,legs:STAND,arms:[[-100,-95]]},k));
  return F+p.svg+eq.db(p.hand[0])}},
 'crunch':{label:'Crunch',draw:k=>{const p=fig(pose({hip:[60,84],t:180,hd:180,legs:[[-45,60]],arms:[[-160,-30]]},{hip:[60,84],t:-145,hd:-140,legs:[[-45,60]],arms:[[-120,10]]},k));
  return F+p.svg}},
 'crunch-machine':{label:'Crunch machine',draw:k=>{const o=pose({hip:[46,62],t:-92,hd:-92,legs:[[0,95]],arms:[[75,-110]]},{hip:[46,62],t:-40,hd:-30,legs:[[0,95]],arms:[[75,-110]]},k);const p=fig(o);
  return F+eq.seat(32,66,26)+p.svg+eq.pad(P(p.sh,o.t+90,4),3.5)}},
 'crunch-cable':{label:'Crunch poulie',draw:k=>{const p=fig(pose({hip:[56,64],t:-80,legs:[[90,0,0]],arms:[[-110,120]]},{hip:[56,64],t:-20,hd:30,legs:[[90,0,0]],arms:[[-20,170]]},k));
  return F+p.svg+eq.cable([60,6],p.hand[0])}},
 'plank':{label:'Gainage',draw:k=>{const p=fig({hip:[64,74],t:182,hd:185,legs:[[6,6,90]],arms:[[90,180]]});
  return F+p.svg}},
 'side-plank':{label:'Gainage latéral',draw:k=>{const p=fig({hip:[64,70],t:200,hd:200,legs:[[14,14,90]],arms:[[92,180],[-90,-90]]});
  return F+p.svg}},
 'knee-raise':{label:'Relevés de genoux suspendu',draw:k=>{const p=fig(pose({hip:[60,58],t:-90,legs:[[95,90]],arms:[[-82,-88]]},{hip:[60,58],t:-90,legs:[[-5,90]],arms:[[-82,-88]]},k));
  return F+eq.pullbar(38,82,8)+p.svg}},
};
return {PICTOS,fig,eq};
})();
// Exercice du catalogue → pictogramme ; sinon pictogramme du type de mouvement (exercices perso).
const BY_KEY={"developpe-couche-barre": "bench-bar", "developpe-couche-halteres": "bench-db", "squeeze-press": "bench-db", "developpe-couche-au-sol-halteres": "floor-press", "developpe-incline-machine": "incline-press", "developpe-incline-halteres": "incline-press", "developpe-incline-smith": "incline-press", "developpe-convergent-pectoraux": "chest-press", "pompes": "push-up", "pompes-inclinees": "incline-push-up", "dips": "dips", "pec-deck": "pec-deck", "ecarte-poulie": "cable-fly", "tirage-vertical-prise-neutre": "lat-pulldown", "tirage-vertical-prise-large": "lat-pulldown", "tractions-assistees": "assisted-pull-up", "pull-over-poulie": "pullover", "rowing-machine-appui-poitrine": "row-supported", "rowing-t-bar-appui-poitrine": "row-supported", "rowing-unilateral-appui-poitrine": "row-supported", "rowing-unilateral-haltere": "row-one-arm", "rowing-halteres-buste-penche": "row-bent", "rowing-avec-sac-a-dos": "row-bent", "tirage-horizontal-poulie": "row-cable", "hack-squat": "hack-squat", "presse-a-cuisses": "leg-press", "squat-guide": "squat-bar", "squat-tempo": "bw-squat", "squat-au-poids-du-corps": "bw-squat", "goblet-squat": "goblet-squat", "fentes-arriere": "lunge", "fentes-arriere-halteres": "lunge", "fentes-laterales": "side-lunge", "souleve-de-terre-roumain": "rdl", "souleve-de-terre-roumain-halteres": "rdl", "souleve-de-terre-avec-sac-a-dos": "rdl", "hip-thrust": "hip-thrust", "hip-thrust-haltere": "hip-thrust", "pont-fessier": "glute-bridge", "leg-curl-assis": "leg-curl-seated", "leg-curl-allonge": "leg-curl-lying", "leg-extension": "leg-extension", "mollets-debout": "calf-standing", "mollets-machine": "calf-standing", "mollets-assis": "calf-seated", "developpe-epaules-halteres": "shoulder-press", "developpe-epaules-machine": "shoulder-press", "developpe-epaules-barre": "shoulder-press", "elevations-laterales-halteres": "lateral-raise", "elevations-laterales-poulie": "lateral-raise", "elevations-laterales-machine": "lateral-raise", "elevation-frontale": "front-raise", "reverse-pec-deck": "rear-delt", "oiseau-halteres": "rear-delt", "curl-barre-ez": "curl", "curl-halteres": "curl", "curl-marteau-halteres": "curl", "curl-incline-halteres": "curl-incline", "curl-pupitre": "curl-preacher", "curl-poulie-haute": "curl-cable-high", "extension-triceps-corde": "pushdown", "pushdown-triceps-barre": "pushdown", "extension-triceps-unilaterale-poulie": "pushdown", "extension-triceps-au-dessus-de-la-tete-haltere": "overhead-ext", "extension-triceps-haltere": "overhead-ext", "crunch": "crunch", "crunch-machine": "crunch-machine", "crunch-poulie": "crunch-cable", "gainage": "plank", "gainage-lateral": "side-plank", "releves-de-genoux-suspendu": "knee-raise"};
const BY_PATTERN={"pushH": "bench-db", "chestIso": "pec-deck", "pullV": "lat-pulldown", "pullH": "row-bent", "squat": "bw-squat", "hinge": "rdl", "hamIso": "leg-curl-seated", "quadIso": "leg-extension", "calves": "calf-standing", "pushV": "shoulder-press", "side": "lateral-raise", "rear": "rear-delt", "biceps": "curl", "triceps": "pushdown", "core": "crunch"};
function picId(key,pattern){return BY_KEY[key]||BY_PATTERN[pattern]||null}
// Dessin seul (contenu du SVG) pour une position k (0 → 1) ; rejoué par l'animation de « Comment faire ».
function inner(key,pattern,k=1){const id=picId(key,pattern),p=id&&PIC.PICTOS[id];return p?p.draw(Math.max(0,Math.min(1,k))):move(pattern).draw}
function pic(key,pattern,{size=96,cls='mv-pic',k=1,anim=false}={}){
 return '<svg class="'+cls+' mv-v2" viewBox="0 0 120 96" width="'+size+'" height="'+Math.round(size*96/120)+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'+(anim?' data-mv-key="'+String(key||'').replace(/[^a-z0-9-]/gi,'')+'" data-mv-pattern="'+String(pattern||'').replace(/[^a-z0-9]/gi,'')+'"':'')+'>'+inner(key,pattern,k)+'</svg>';
}
return {MOVES,move,svg,pic,inner,picId,PICTOS:PIC.PICTOS,BY_KEY,cues:p=>move(p).cues,label:p=>move(p).label};
});
