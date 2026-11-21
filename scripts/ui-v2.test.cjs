// Écrans V2 (P1 « Guidé ») : HTML produit par des fonctions pures.
const assert=require('assert');
const Cat=require('../exercise-catalogue.js');globalThis.SteroidCatalogue=Cat;
const UI=require('../ui-v2.js');

const ex=(id,key,role,sets)=>({id,exercise_key:key,role,sets,reps_min:8,reps_max:12,rest_seconds:120});
const haut={id:'s1',position:0,code:'A',title:'Haut A',focus:['Pectoraux','Dos'],exercises:[ex('e1','developpe-couche-barre','base',3),ex('e2','hack-squat','base',2)]};
const bas={id:'s2',position:1,code:'B',title:'Bas A',focus:['Jambes'],exercises:[ex('e3','hack-squat','base',4)]};
const noEmoji=s=>!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s);

// Accueil : grande carte « Prochaine séance ».
let h=UI.home({next:{session:haut,planned:haut,reason:'sequence',message:''},cycle:{sessions:[haut,bas],weeks:6,sessions_per_week:3},progress:2/18,minutes:48,firstName:'Nolan',dateText:'Lundi 23 novembre'});
assert.match(h,/Haut A/);assert.match(h,/Pectoraux/);assert.match(h,/Dos/);
assert.match(h,/>2<\/b>\s*<span>exercices/);assert.match(h,/>5<\/b>\s*<span>séries/);assert.match(h,/48/);
assert.match(h,/data-action="v2-start" data-session="s1"/);assert.match(h,/role="progressbar"/);assert.match(h,/Salut Nolan/);
assert(!/quand même/.test(h));
assert.match(h,/Première séance de ton cycle/);
assert(!/class="v2-ring-value"/.test(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},progress:0})),'anneau vide sans point parasite');
assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},progress:0.1,hasHistory:true}),/On reprend la suite/);
// Garde-fou : phrase expliquée + « D'accord » / « Faire X quand même ».
h=UI.home({next:{session:haut,planned:bas,reason:'recovery',message:'Tu as travaillé les jambes il y a 20 h (Bas A).'},cycle:{sessions:[haut,bas]},progress:0});
assert.match(h,/Tu as travaillé les jambes il y a 20 h/);assert.match(h,/D’accord/);
assert.match(h,/data-action="v2-start" data-session="s2"[^>]*>Faire Bas A quand même/);
// Choix libre d'une autre séance.
assert.match(h,/data-action="v2-choose"/);
assert.match(UI.chooser({sessions:[haut,bas],current:'s1'}),/data-action="v2-pick-session" data-session="s2"/);
// Pas de cycle : jamais d'écran vide.
assert.match(UI.home({next:null,cycle:null}),/data-action="v2-build"/);

// Séance : un exercice à la fois.
const workout={id:'w',started_at:0,exercises:[
 {id:'x1',position:0,exercise_key:'developpe-couche-barre',status:'done',plan:{role:'base',sets:3,reps_min:6,reps_max:8,rest_seconds:180},sets:[
  {id:'a',set_number:1,weight:80,reps:8,completed:true},{id:'b',set_number:2,weight:80,reps:8,completed:false},{id:'c',set_number:3,weight:null,reps:null,completed:false}]},
 {id:'x2',position:1,exercise_key:'u-1',status:'done',plan:{role:'finition',sets:1,reps_min:10,reps_max:15,rest_seconds:60},sets:[{id:'d',set_number:1,weight:null,reps:null,completed:false}]}]};
let s=UI.session({workout,index:0,elapsed:1122,paused:false,last:{'developpe-couche-barre':{weight:80,reps:8}},userExercises:[{key:'u-1',name:'Mon exo'}]});
assert.match(s,/Développé couché barre/);assert.match(s,/3 séries · 6 à 8 reps · repos 3 min/);
assert.match(s,/Dernière fois : 80 kg × 8/);assert.match(s,/18:42/);
assert.equal((s.match(/data-action="v2-set"/g)||[]).length,3,'un bouton par série');
assert.match(s,/aria-label="Série 1 validée"/);assert.match(s,/aria-label="Valider la série 2"/);
assert.match(s,/data-action="v2-machine"/);assert.match(s,/Machine prise/);
assert.match(s,/data-v2-field="weight" data-ex="x1" data-set="3"[^>]*value=""/,'charge non saisie : champ vide, pas 0');
assert(!/En pause/.test(s));
assert.match(UI.session({workout,index:0,elapsed:10,paused:true,pausedFor:180}),/En pause depuis 3 min/);
assert.match(UI.session({workout,index:0,elapsed:10,last:{'developpe-couche-barre':{weight:null,reps:12}}}),/Dernière fois : — × 12/);
assert(!/ data-field=/.test(s),'champs V2 distincts de l’ancien écran');
// Séance en cours quittée : l'accueil propose de la reprendre.
assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},active:{title:'Haut A',done:2,total:5}}),/data-action="v2-back">[\s\S]*?Reprendre la séance/);
// Repos automatique : +30 s et Passer.
s=UI.session({workout,index:0,elapsed:10,rest:{remaining:95}});
assert.match(s,/1:35/);assert.match(s,/data-action="v2-rest-plus"/);assert.match(s,/data-action="v2-rest-skip"/);
// Dernier exercice : terminer ; exercice perso affiché par son nom.
s=UI.session({workout,index:1,elapsed:10,userExercises:[{key:'u-1',name:'Mon exo'}]});
assert.match(s,/Mon exo/);assert.match(s,/data-action="v2-finish"/);

// Machine prise : Plus tard → remplaçants → Passer.
let m=UI.machineSheet({exercise:workout.exercises[0],alternatives:[{key:'developpe-couche-halteres',name:'Développé couché haltères',role:'base',score:2}],canLater:true});
const order=['data-action="v2-later"','data-action="v2-sub"','data-action="v2-skip"'].map(k=>m.indexOf(k));
assert(order.every(i=>i>0)&&order[0]<order[1]&&order[1]<order[2],'ordre Plus tard, remplaçants, Passer');
assert.match(m,/3 × 6–8, repos 3 min/);assert.match(m,/data-key="developpe-couche-halteres"/);assert.match(m,/Garder ce remplacement/);
m=UI.machineSheet({exercise:workout.exercises[0],alternatives:[],canLater:false});
assert.match(m,/Aucun remplaçant/);assert(!/v2-later/.test(m));

// Pause oubliée.
assert.match(UI.idlePrompt(25),/Tu étais en pause \?/);assert.match(UI.idlePrompt(25),/25 min/);

// Fin de séance : statut d'envoi explicite.
let f=UI.summary({workout:{...workout,duration_seconds:2700},pending:3});
assert.match(f,/45 min/);assert.match(f,/>1<\/b> <span>série validée/);assert.match(f,/en attente/i);
assert(!/synchronisé/i.test(f));

// Progrès par clé.
const p=UI.progress({progress:{totals:{sets:3,volume:1132},byKey:{'hack-squat':[{date:'2026-11-10T11:00:00Z',weight:80,reps:8,volume:640},{date:'2026-11-12T11:00:00Z',weight:82.5,reps:6,volume:495}]}},selected:'hack-squat',metric:'weight'});
assert.match(p,/Hack squat/);assert.match(p,/1\s132/);assert.match(p,/<svg/);
// 82,5 kg × 6 après 80 kg × 8 n'est pas un record comparable : le record vient de l'historique.
assert.doesNotMatch(p,/Record/);
const hist={key:'hack-squat',record:{weight:80,reps:8},entries:[{workoutId:'w2',date:'2026-11-12T11:00:00Z',from:'presse-a-cuisses',sets:[{weight:82.5,reps:6},{weight:null,reps:6}],best:{weight:82.5,reps:6},diff:{weight:2.5,reps:-2}},{workoutId:'w1',date:'2026-11-10T11:00:00Z',from:null,sets:[{weight:80,reps:8}],best:{weight:80,reps:8},diff:null}]};
const p2=UI.progress({progress:{totals:{sets:3,volume:1132},byKey:{'hack-squat':[{date:'2026-11-10T11:00:00Z',weight:80,reps:8,volume:640}]}},selected:'hack-squat',history:hist,advice:{status:'reps',text:'Garde 82,5 kg et vise 10 répétitions sur chaque série.'}});
assert.match(p2,/Record : 80 kg × 8/);assert.match(p2,/Séance par séance/);assert.match(p2,/82,5 × 6 · 6 reps/);assert.match(p2,/\+2,5 kg/);
assert.match(p2,/à la place de Presse à cuisses/);assert.match(p2,/Prochaine fois/);assert.match(p2,/vise 10 répétitions/);assert.match(p2,/jeu\. 12 nov\./);
// Onglet Séances : liste puis détail.
const list=[{id:'w2',date:'2026-11-12T11:00:00Z',title:'Bas A',minutes:52,sets:2,volume:495,exercises:[{key:'hack-squat',from:'presse-a-cuisses',sets:[{weight:82.5,reps:6}]}],cardio:[{type:'velo',minutes:15}]}];
const ps=UI.progress({tab:'sessions',sessions:list});
assert.match(ps,/data-action="v2-history-open" data-id="w2"/);assert.match(ps,/Bas A/);assert.match(ps,/52 min · 2 séries · cardio/);assert.doesNotMatch(ps,/<svg class="v2-chart"/);
const pd=UI.progress({tab:'sessions',sessions:list,open:'w2',records:[{key:'hack-squat',kind:'weight',weight:82.5,reps:6,delta:2.5}]});
assert.match(pd,/data-action="v2-history-close"/);assert.match(pd,/à la place de Presse à cuisses/);assert.match(pd,/Vélo 15 min/);assert.match(pd,/Record : Hack squat : 82,5 kg × 6 \(\+2,5 kg\)/);
assert.match(UI.progress({tab:'sessions',sessions:[]}),/apparaîtront ici/);
// Séance : conseil sous « Dernière fois ». Fin de séance : nouveaux records.
assert.match(UI.session({workout,advice:{[workout.exercises[0].exercise_key]:{text:'Tente 85 kg, si la technique reste propre.'}}}),/class="v2-advice"[^]*Tente 85 kg/);
assert.match(UI.summary({workout:{...workout,duration_seconds:60},records:[{key:'hack-squat',kind:'reps',weight:80,reps:10,delta:2}]}),/Nouveau record : Hack squat : 80 kg × 10 \(\+2 répétitions\)/);
for(const html of [p2,ps,pd])assert(noEmoji(html)&&!/onclick=/i.test(html));
assert.match(UI.progress({progress:{totals:{sets:0,volume:0},byKey:{}}}),/premières séries validées/);

// Choix d'exercice dans le catalogue, plus de saisie libre.
const k=UI.picker({query:'dvlp couche',results:Cat.search('dvlp couche').slice(0,5)});
assert.match(k,/data-action="v2-pick"/);assert.match(k,/Développé couché/);assert.match(k,/Créer mon exercice/);

for(const html of [h,s,m,f,p,k])assert(noEmoji(html)&&!/onclick=/i.test(html),'pas d’emoji ni de gestionnaire en ligne');
// Échappement.
assert(!/<script>/.test(UI.home({next:{session:{...haut,title:'<script>'},planned:haut,reason:'sequence'},cycle:{sessions:[haut]}})));
// Programme : exercices du cycle modifiables via le catalogue.
const prog=UI.programme({cycle:{sessions:[haut,bas]}});
assert.match(prog,/Haut A/);assert.match(prog,/data-action="v2-edit-ex" data-ce="e1"/);assert.match(prog,/data-action="v2-add-ex" data-session="s1"/);
assert.match(prog,/data-action="v2-remove-ex" data-ce="e1"/);assert.match(prog,/data-v2-sets="e1"/);
assert(!/<input[^>]*name="name"/.test(prog),'pas de saisie libre du nom');
assert.match(UI.progress({progress:{totals:{sets:1,volume:480},byKey:{'hack-squat':[{date:'2026-11-10T11:00:00Z',weight:60,reps:8,volume:480}]}}}),/>1<\/b> <span>série validée<\/span>/);
assert.match(UI.summary({workout:{...workout,duration_seconds:60},pending:0,local:true}),/Enregistrée sur ce téléphone\./);

// ===== Lot 4 : rythme et cardio =====
const base={next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut,bas]}};
let r4=UI.home({...base,rhythm:{mode:'days',days:[0,2,4],todayPlanned:false,nextDay:2,doneThisWeek:1,goal:3}});
assert.match(r4,/Prochain jour conseillé : mercredi/);assert.match(r4,/aria-label="Tes jours : lundi, mercredi, vendredi"/);
assert.match(UI.home({...base,rhythm:{mode:'days',days:[0,2,4],todayPlanned:true,nextDay:0,doneThisWeek:0,goal:3}}),/Aujourd’hui fait partie de tes jours/);
r4=UI.home({...base,rhythm:{mode:'free',days:[],todayPlanned:false,nextDay:null,doneThisWeek:1,goal:4}});
assert.match(r4,/4 séances par semaine, quand tu veux/);assert(!/Prochain jour/.test(r4));
// Cardio : objectif seulement s'il est prévu ; « Noter du cardio » toujours possible.
r4=UI.home({...base,cardio:{target:60,minutes:35}});assert.match(r4,/Cardio : 35 \/ 60 min cette semaine/);assert.match(r4,/data-action="v2-cardio-open"/);
r4=UI.home({...base,cardio:{target:0,minutes:0}});assert(!/min cette semaine/.test(r4));assert.match(r4,/data-action="v2-cardio-open"/);
const cs=UI.cardioSheet({workoutId:'w9'});
assert.match(cs,/data-v2-cardio/);assert.match(cs,/name="workout" value="w9"/);
for(const t of ['marche','course','velo','elliptique','rameur','natation','escaliers','autre'])assert.match(cs,new RegExp('value="'+t+'"'));
assert.match(cs,/name="minutes"[^>]*min="1"[^>]*max="600"/);
assert.match(UI.summary({workout:{...workout,duration_seconds:60}}),/data-action="v2-cardio-open" data-workout="w"/);
const pc=UI.programme({cycle:{sessions:[haut],cardio:[{id:'cc1',type:'velo',minutes:30,per_week:2}]}});
assert.match(pc,/Vélo · 30 min · 2 fois par semaine/);assert.match(pc,/data-action="v2-cardio-plan-remove" data-id="cc1"/);assert.match(pc,/data-v2-cardio-plan/);
const pp=UI.progress({progress:{totals:{sets:0,volume:0},byKey:{}},cardio:[{week:'2026-11-16',minutes:30},{week:'2026-11-23',minutes:35}]});
assert.match(pp,/Cardio/);assert.match(pp,/65 min sur 6 semaines|65 min/);assert.match(pp,/23 nov/);
assert.match(UI.home({...base,cardio:{target:0,minutes:25}}),/Cardio : 25 min cette semaine/);
console.log('ui-v2 : ok');
