/* STÉROÏDE — catalogue d'exercices à clés permanentes.
 * La clé (key) ne change jamais et ne s'affiche pas ; le nom peut évoluer.
 * Rôle : base (polyarticulaire) ou finition (isolation) ; « secondaire » est réservé pour plus tard.
 * Une clé publiée ne doit jamais être réutilisée pour un autre exercice. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidCatalogue=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CATALOGUE=Object.freeze([
 {key:"developpe-couche-barre",name:"Développé couché barre",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:[]},
 {key:"developpe-couche-halteres",name:"Développé couché haltères",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:[]},
 {key:"developpe-incline-machine",name:"Développé incliné machine",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:[]},
 {key:"developpe-incline-halteres",name:"Développé incliné haltères",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:[]},
 {key:"developpe-convergent-pectoraux",name:"Développé convergent pectoraux",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:["developpe convergent machine"]},
 {key:"pec-deck",name:"Pec deck",pattern:"chestIso",muscle:"Pectoraux",role:"finition",equipment:["gym"],aliases:["butterfly", "pec fly", "peckdeck", "peckdeck ecarte poulie"]},
 {key:"tirage-vertical-prise-neutre",name:"Tirage vertical prise neutre",pattern:"pullV",muscle:"Dos",role:"base",equipment:["gym"],aliases:[]},
 {key:"tirage-vertical-prise-large",name:"Tirage vertical prise large",pattern:"pullV",muscle:"Dos",role:"base",equipment:["gym"],aliases:["tirage vertical large"]},
 {key:"tractions-assistees",name:"Tractions assistées",pattern:"pullV",muscle:"Dos",role:"base",equipment:["gym"],aliases:[]},
 {key:"rowing-machine-appui-poitrine",name:"Rowing machine appui poitrine",pattern:"pullH",muscle:"Dos",role:"base",equipment:["gym"],aliases:["rowing poitrine appuye", "rowing poitrine appuyee"]},
 {key:"rowing-t-bar-appui-poitrine",name:"Rowing T-bar appui poitrine",pattern:"pullH",muscle:"Dos",role:"base",equipment:["gym"],aliases:["rowing t bar avec support"]},
 {key:"rowing-unilateral-haltere",name:"Rowing unilatéral haltère",pattern:"pullH",muscle:"Dos",role:"base",equipment:["gym","dumbbells"],aliases:[]},
 {key:"hack-squat",name:"Hack squat",pattern:"squat",muscle:"Jambes",role:"base",equipment:["gym"],aliases:[]},
 {key:"presse-a-cuisses",name:"Presse à cuisses",pattern:"squat",muscle:"Jambes",role:"base",equipment:["gym"],aliases:[]},
 {key:"squat-guide",name:"Squat guidé",pattern:"squat",muscle:"Jambes",role:"base",equipment:["gym"],aliases:[]},
 {key:"fentes-arriere",name:"Fentes arrière",pattern:"squat",muscle:"Jambes",role:"base",equipment:["gym","none"],aliases:[]},
 {key:"souleve-de-terre-roumain",name:"Soulevé de terre roumain",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["gym"],aliases:[]},
 {key:"hip-thrust",name:"Hip thrust",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["gym"],aliases:[]},
 {key:"leg-curl-assis",name:"Leg curl assis",pattern:"hamIso",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:[]},
 {key:"leg-extension",name:"Leg extension",pattern:"quadIso",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:[]},
 {key:"mollets-debout",name:"Mollets debout",pattern:"calves",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:[]},
 {key:"mollets-assis",name:"Mollets assis",pattern:"calves",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:[]},
 {key:"developpe-epaules-halteres",name:"Développé épaules haltères",pattern:"pushV",muscle:"Épaules",role:"base",equipment:["gym","dumbbells"],aliases:[]},
 {key:"developpe-epaules-machine",name:"Développé épaules machine",pattern:"pushV",muscle:"Épaules",role:"base",equipment:["gym"],aliases:[]},
 {key:"elevations-laterales-halteres",name:"Élévations latérales haltères",pattern:"side",muscle:"Épaules",role:"finition",equipment:["gym","dumbbells"],aliases:[]},
 {key:"elevations-laterales-poulie",name:"Élévations latérales poulie",pattern:"side",muscle:"Épaules",role:"finition",equipment:["gym"],aliases:[]},
 {key:"reverse-pec-deck",name:"Reverse pec deck",pattern:"rear",muscle:"Épaules",role:"finition",equipment:["gym"],aliases:["oiseau a la machine", "reverse peckdeck"]},
 {key:"oiseau-halteres",name:"Oiseau haltères",pattern:"rear",muscle:"Épaules",role:"finition",equipment:["gym"],aliases:["oiseau cable halteres"]},
 {key:"curl-barre-ez",name:"Curl barre EZ",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:[]},
 {key:"curl-incline-halteres",name:"Curl incliné haltères",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:[]},
 {key:"curl-pupitre",name:"Curl pupitre",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:[]},
 {key:"curl-marteau-halteres",name:"Curl marteau haltères",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:["curl marteau"]},
 {key:"extension-triceps-corde",name:"Extension triceps corde",pattern:"triceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:["pushdown corde"]},
 {key:"extension-triceps-au-dessus-de-la-tete-haltere",name:"Extension triceps au-dessus de la tête haltère",pattern:"triceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:[]},
 {key:"pushdown-triceps-barre",name:"Pushdown triceps barre",pattern:"triceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:["pushdown barre", "extension triceps barre poulie"]},
 {key:"crunch-machine",name:"Crunch machine",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["gym"],aliases:[]},
 {key:"gainage",name:"Gainage",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["any"],aliases:[]},
 {key:"crunch",name:"Crunch",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["any"],aliases:[]},
 {key:"gainage-lateral",name:"Gainage latéral",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["any"],aliases:[]},
 {key:"goblet-squat",name:"Goblet squat",pattern:"squat",muscle:"Jambes",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"fentes-arriere-halteres",name:"Fentes arrière haltères",pattern:"squat",muscle:"Jambes",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"souleve-de-terre-roumain-halteres",name:"Soulevé de terre roumain haltères",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"hip-thrust-haltere",name:"Hip thrust haltère",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"developpe-couche-au-sol-halteres",name:"Développé couché au sol haltères",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"rowing-halteres-buste-penche",name:"Rowing haltères buste penché",pattern:"pullH",muscle:"Dos",role:"base",equipment:["dumbbells"],aliases:[]},
 {key:"curl-halteres",name:"Curl haltères",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["dumbbells"],aliases:[]},
 {key:"extension-triceps-haltere",name:"Extension triceps haltère",pattern:"triceps",muscle:"Bras",role:"finition",equipment:["dumbbells"],aliases:[]},
 {key:"squat-au-poids-du-corps",name:"Squat au poids du corps",pattern:"squat",muscle:"Jambes",role:"base",equipment:["none"],aliases:[]},
 {key:"squat-tempo",name:"Squat tempo",pattern:"squat",muscle:"Jambes",role:"base",equipment:["none"],aliases:[]},
 {key:"fentes-laterales",name:"Fentes latérales",pattern:"squat",muscle:"Jambes",role:"base",equipment:["none"],aliases:[]},
 {key:"pont-fessier",name:"Pont fessier",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["none"],aliases:[]},
 {key:"souleve-de-terre-avec-sac-a-dos",name:"Soulevé de terre avec sac à dos",pattern:"hinge",muscle:"Jambes",role:"base",equipment:["none"],aliases:[]},
 {key:"pompes",name:"Pompes",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["none"],aliases:[]},
 {key:"pompes-inclinees",name:"Pompes inclinées",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["none"],aliases:[]},
 {key:"rowing-avec-sac-a-dos",name:"Rowing avec sac à dos",pattern:"pullH",muscle:"Dos",role:"base",equipment:["none"],aliases:[]},
 // Ajouts V2 (noms saisis par les utilisateurs, novembre 2026)
 {key:"dips",name:"Dips",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:[]},
 {key:"squeeze-press",name:"Squeeze press",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["dumbbells", "gym"],aliases:["squeese press"]},
 {key:"developpe-incline-smith",name:"Développé incliné Smith",pattern:"pushH",muscle:"Pectoraux",role:"base",equipment:["gym"],aliases:["developpe incline barre guidee"]},
 {key:"developpe-epaules-barre",name:"Développé épaules barre",pattern:"pushV",muscle:"Épaules",role:"base",equipment:["gym"],aliases:["developpe militaire"]},
 {key:"tirage-horizontal-poulie",name:"Tirage horizontal poulie",pattern:"pullH",muscle:"Dos",role:"base",equipment:["gym"],aliases:["rowing poulie basse"]},
 {key:"pull-over-poulie",name:"Pull-over poulie",pattern:"pullV",muscle:"Dos",role:"finition",equipment:["gym"],aliases:["pull over corde", "pullover corde", "pullover poulie", "pull over"]},
 {key:"ecarte-poulie",name:"Écarté poulie",pattern:"chestIso",muscle:"Pectoraux",role:"finition",equipment:["gym"],aliases:["ecarter poulie"]},
 {key:"elevation-frontale",name:"Élévation frontale",pattern:"side",muscle:"Épaules",role:"finition",equipment:["dumbbells", "gym"],aliases:[]},
 {key:"elevations-laterales-machine",name:"Élévations latérales machine",pattern:"side",muscle:"Épaules",role:"finition",equipment:["gym"],aliases:[]},
 {key:"leg-curl-allonge",name:"Leg curl allongé",pattern:"hamIso",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:["leg curl"]},
 {key:"mollets-machine",name:"Mollets machine",pattern:"calves",muscle:"Jambes",role:"finition",equipment:["gym"],aliases:[]},
 {key:"curl-poulie-haute",name:"Curl poulie haute",pattern:"biceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:["curl barre haute", "biceps barre haute"]},
 {key:"extension-triceps-unilaterale-poulie",name:"Extension triceps unilatérale poulie",pattern:"triceps",muscle:"Bras",role:"finition",equipment:["gym"],aliases:["extension triceps unilaterale"]},
 {key:"crunch-poulie",name:"Crunch poulie",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["gym"],aliases:[]},
 {key:"releves-de-genoux-suspendu",name:"Relevés de genoux suspendu",pattern:"core",muscle:"Abdominaux",role:"finition",equipment:["gym"],aliases:[]},
 {key:"rowing-unilateral-appui-poitrine",name:"Rowing unilatéral appui poitrine",pattern:"pullH",muscle:"Dos",role:"base",equipment:["gym"],aliases:["rowing poitrine appuyer unilateral"]}
].map(e=>Object.freeze(e)));

const MIN_SCORE=0.82;
const AMBIGUITY_GAP=0.05;
function normalize(text){return String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function bigrams(t){const s=t.replace(/ /g,''),out=new Map();for(let i=0;i<s.length-1;i++){const b=s.slice(i,i+2);out.set(b,(out.get(b)||0)+1)}return out}
function dice(a,b){const A=bigrams(a),B=bigrams(b);let inter=0,total=0;for(const v of A.values())total+=v;for(const v of B.values())total+=v;for(const [k,v] of A)inter+=Math.min(v,B.get(k)||0);return total?2*inter/total:0}
// Chaque mot de la requête est le début d'un mot du nom, ou ses consonnes apparaissent dans l'ordre (« dvlp » → « developpe »).
function wordMatch(q,w){if(w.startsWith(q))return true;if(q.length<3||q[0]!==w[0])return false;let i=0;for(const ch of w)if(ch===q[i])i++;return i===q.length}
function prefixBonus(q,n){const qw=q.split(' '),nw=n.split(' ');return qw.every(x=>nw.some(w=>wordMatch(x,w)))?0.1:0}
function score(query,entry){
 const q=normalize(query);if(!q)return 0;
 const names=[entry.name,...entry.aliases].map(normalize);
 if(names.includes(q))return 1;
 return Math.min(0.99,Math.max(...names.map(n=>dice(q,n)+prefixBonus(q,n))));
}
const byKeyMap=new Map(CATALOGUE.map(e=>[e.key,e]));
function byKey(key){return byKeyMap.get(key)||null}
function search(query,{limit=8,equipment=null}={}){
 return CATALOGUE.filter(e=>!equipment||e.equipment.includes(equipment)||e.equipment.includes('any'))
  .map(entry=>({entry,score:score(query,entry)})).filter(r=>r.score>0.3)
  .sort((a,b)=>b.score-a.score||a.entry.name.localeCompare(b.entry.name)).slice(0,limit);
}
function resolveName(name){
 const q=normalize(name);if(!q)return null;
 for(const e of CATALOGUE){if(normalize(e.name)===q)return {key:e.key,method:'exact',score:1}}
 for(const e of CATALOGUE){if(e.aliases.some(a=>normalize(a)===q))return {key:e.key,method:'alias',score:1}}
 const [best,second]=search(name,{limit:2});
 if(!best||best.score<MIN_SCORE)return null;
 // Ambigu : un autre exercice est presque aussi proche → on ne choisit pas à la place de l'utilisateur.
 if(second&&best.score-second.score<AMBIGUITY_GAP)return null;
 // Tous les mots de la requête se retrouvent dans plusieurs exercices (« développé couché » : barre, haltères…).
 if(CATALOGUE.filter(e=>[e.name,...e.aliases].some(n=>prefixBonus(q,normalize(n))>0)).length>1)return null;
 return {key:best.entry.key,method:'fuzzy',score:Math.round(best.score*100)/100};
}
return {CATALOGUE,normalize,byKey,search,resolveName,MIN_SCORE};
});
