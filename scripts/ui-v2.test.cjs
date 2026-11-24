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
assert.match(h,/data-action="v2-recap" data-session="s1"/);assert.match(h,/aria-label="Avancée du cycle : 11 %"/);
// Barre d'avancée du programme en haut de l'accueil et de Programme.
{const st={week:3,weeks:6,done:13,total:36,pct:36};
 const hb=UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},cycleStatus:st});
 assert.match(hb,/semaine 3 sur 6/);assert.match(hb,/36 %/);assert.match(hb,/13 séances faites sur 36/);assert.match(hb,/style="width:36%"/);
 assert.match(UI.programme({cycle:{sessions:[haut]},cycleStatus:st}),/v2-cyclebar/);
 {const closed=UI.programme({cycle:{sessions:[haut]}});assert.match(closed,/Cardio en plus[^]*Facultatif/);assert.doesNotMatch(closed,/data-v2-cardio-plan/,'replié par défaut');
  assert.match(UI.programme({cycle:{sessions:[haut]},cardioOpen:true}),/data-v2-cardio-plan[^]*Ajouter cet objectif/);
  assert.match(UI.programme({cycle:{sessions:[haut,{...bas,id:'s9',title:'Cardio + abdos'}]}}),/déjà une séance cardio \(Cardio \+ abdos\)/);}}
// Anneau de l'accueil : séances de la semaine sur l'objectif, écrit en clair.
{const w=UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},progress:0.36,week:{done:5,goal:6}});
 assert.match(w,/5<small>\/6<\/small>/);assert.match(w,/aria-label="5 séances faites sur 6 cette semaine"/);assert.match(w,/cette semaine<\/span>/);assert.doesNotMatch(w,/36/);
 assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},week:{done:6,goal:6}}),/v2-ring is-full/);}assert.match(h,/Salut Nolan/);
assert(!/quand même/.test(h));
assert(!/class="v2-ring-value"/.test(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},progress:0})),'anneau vide sans point parasite');
// Accueil : « Commencer » ouvre le récapitulatif ; plus de garde-fou ni de liens de changement sur l'accueil.
assert.doesNotMatch(h,/data-action="v2-choose"|data-action="v2-skip"|quand même/);
// Récapitulatif : exercices, confirmer, choisir une autre séance du tour, passer.
{const r=UI.recapSheet({session:haut,minutes:48,remaining:[haut,bas]});
 assert.match(r,/C’est bien cette séance \?/);assert.match(r,/Haut A/);assert.match(r,/data-action="v2-start" data-session="s1"[^>]*>[^]*Oui, je commence/);
 assert.match(r,/data-action="v2-recap-choose"/);assert.match(r,/data-action="v2-skip" data-session="s1"/);assert.match(r,/\d+ × /);
 assert.doesNotMatch(UI.recapSheet({session:haut,remaining:[haut]}),/v2-recap-choose/,'rien d’autre à choisir');
 const c=UI.recapSheet({session:haut,remaining:[haut,bas],choosing:true,planned:'s1'});assert.match(c,/data-action="v2-recap" data-session="s2"/);assert.match(c,/Haut A · prévue/);}
assert.match(UI.skipSheet({session:haut}),/data-reason="envie"[^]*Pas envie aujourd’hui/);
// Indicateurs de l'accueil.
{const view={days:Array.from({length:7},(_,k)=>({state:k<5?'done':k===5?'skipped':'',today:k===6,planned:false})),done:5,goal:6,skipped:1,sets:101,volume:12480,prevVolume:11200,streak:2};
 const hv=UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},view,stats:{records:3,lastRecord:'dernier : Squat'}});
 assert.match(hv,/Ta semaine/);assert.doesNotMatch(hv,/encore 1/,'pas de doublon avec l’anneau');assert.match(hv,/is-skipped/);assert.match(hv,/is-today/);
 assert.match(hv,/101/);assert.match(hv,/12,5 t/);assert.match(hv,/\+11 % vs semaine dernière/);assert.match(hv,/2 semaines/);assert.match(hv,/>3</);
 assert.match(hv,/data-action="v2-recap" data-session="s1"[^>]*>[^]*Commencer/);
 assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},week:{done:7,goal:6}}),/6<small>\/6 \+1<\/small>/,'jamais plus que l’objectif');}
// Séance : pas de « Terminer » sans série validée.
assert.match(UI.moreSheet({exercise:null,anyDone:false}),/v2-wrong-session[^]*v2-abandon/);assert.doesNotMatch(UI.moreSheet({exercise:null,anyDone:false}),/v2-finish/);
// Pas de cycle : jamais d'écran vide.
assert.match(UI.home({next:null,cycle:null}),/data-action="v2-build"/);

// Séance : un exercice à la fois.
const workout={id:'w',started_at:0,exercises:[
 {id:'x1',position:0,exercise_key:'developpe-couche-barre',status:'done',plan:{role:'base',sets:3,reps_min:6,reps_max:8,rest_seconds:180},sets:[
  {id:'a',set_number:1,weight:80,reps:8,completed:true},{id:'b',set_number:2,weight:80,reps:8,completed:false},{id:'c',set_number:3,weight:null,reps:null,completed:false}]},
 {id:'x2',position:1,exercise_key:'u-1',status:'done',plan:{role:'finition',sets:1,reps_min:10,reps_max:15,rest_seconds:60},sets:[{id:'d',set_number:1,weight:null,reps:null,completed:false}]}]};
let s=UI.session({workout,index:0,elapsed:1122,paused:false,last:{'developpe-couche-barre':{weight:80,reps:8}},userExercises:[{key:'u-1',name:'Mon exo'}]});
assert.match(s,/Développé couché barre/);assert.match(s,/3 séries · 6 à 8 rép. · repos 3 min/);
assert.match(s,/Dernière fois : 80 kg × 8/);assert.match(s,/18:42/);
// Série en cours en grand (− / + et Valider), séries faites et à venir en lignes compactes.
assert.equal((s.match(/data-action="v2-set"/g)||[]).length,2,'série faite (modifiable) + série en cours');
assert.match(s,/aria-label="Série 1 validée/);assert.match(s,/Valider la série 2</);
assert.equal((s.match(/data-action="v2-step"/g)||[]).length,4,'− / + pour la charge et les répétitions');
assert.match(s,/data-v2-field="weight" data-ex="x1" data-set="2"[^>]*value="80"/);
assert.match(s,/v2-set--line is-next"><span class="v2-set-num">3<\/span><span class="v2-set-val">— kg × —/,'à venir : charge non saisie affichée —, jamais 0');
assert.match(s,/data-action="v2-machine"/);assert.match(s,/Machine prise/);
assert(!/En pause/.test(s));
assert.match(UI.session({workout,index:0,elapsed:10,paused:true,pausedFor:180}),/En pause depuis 3 min/);
assert.match(UI.session({workout,index:0,elapsed:10,last:{'developpe-couche-barre':{weight:null,reps:12}}}),/Dernière fois : — × 12/);
assert(!/ data-field=/.test(s),'champs V2 distincts de l’ancien écran');
// Séance en cours quittée : l'accueil propose de la reprendre.
assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},active:{title:'Haut A',done:2,total:5}}),/data-action="v2-back">[\s\S]*?Reprendre la séance/);
// Repos automatique : +30 s et Passer.
s=UI.session({workout,index:0,elapsed:10,rest:{remaining:95,total:180,next:'série 2 · 80 kg × 8'}});
assert.match(s,/1:35/);assert.match(s,/Ensuite : série 2 · 80 kg × 8/);assert.match(s,/--p:0\.528/);assert.match(s,/data-action="v2-rest-plus"/);assert.match(s,/data-action="v2-rest-skip"/);
// Dernier exercice : terminer ; exercice perso affiché par son nom.
s=UI.session({workout,index:1,elapsed:10,userExercises:[{key:'u-1',name:'Mon exo'}]});
assert.match(s,/Mon exo/);assert.match(s,/data-action="v2-finish"/);

// Machine prise : Plus tard → remplaçants → Passer.
let m=UI.machineSheet({exercise:workout.exercises[0],alternatives:[{key:'developpe-couche-halteres',name:'Développé couché haltères',role:'base',score:2}],canLater:true});
const order=['data-action="v2-later"','data-action="v2-sub"','data-action="v2-skip-ex"'].map(k=>m.indexOf(k));
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
assert.match(p2,/Meilleure série : 80 kg × 8/);assert.match(p2,/Séance par séance/);assert.match(p2,/82,5 × 6 · 6 reps/);assert.match(p2,/\+2,5 kg/);
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
const prog=UI.programme({cycle:{sessions:[haut,bas]},open:['s1']});
// Séances repliées par défaut : titre et nombre d'exercices visibles, détail masqué.
{const closed=UI.programme({cycle:{sessions:[haut,bas]}});assert.match(closed,/data-action="v2-prog-toggle" data-session="s1" aria-expanded="false"/);assert.doesNotMatch(closed,/data-action="v2-edit-ex"/);assert.match(closed,/exercices?<\/small>/)}
assert.match(prog,/aria-expanded="true"/);assert.match(prog,/data-action="v2-move-ex" data-ce="e1" data-dir="-1"[^>]*disabled/);
assert.match(UI.pickerResults({query:'zzz',results:[]}),/Aucun exercice trouvé/);
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
const pc=UI.programme({cycle:{sessions:[haut],cardio:[{id:'cc1',type:'velo',minutes:30,per_week:2}]},cardioOpen:true});
assert.match(pc,/Vélo · 30 min · 2 fois par semaine/);assert.match(pc,/data-action="v2-cardio-plan-remove" data-id="cc1"/);assert.match(pc,/data-v2-cardio-plan/);
const pp=UI.progress({progress:{totals:{sets:0,volume:0},byKey:{}},cardio:[{week:'2026-11-16',minutes:30},{week:'2026-11-23',minutes:35}]});
assert.match(pp,/Cardio/);assert.match(pp,/65 min sur 6 semaines|65 min/);assert.match(pp,/23 nov/);
assert.match(UI.home({...base,cardio:{target:0,minutes:25}}),/Cardio : 25 min cette semaine/);
// Lot 6 : bilan, formulaire du cycle suivant, proposition.
require('../program-engine.js');
const rv={done:14,planned:18,weeks:6,rpe:8.5,strengths:['Développé couché barre : +5 kg depuis le début du cycle.'],improve:['<b>x</b>'],evolutions:[{key:'hack-squat',from:{weight:100,reps:8},to:{weight:110,reps:8},weight:10,reps:0}],recommendation:{code:'keep',title:'Garder la méthode',text:'On garde.',changes:{}}};
const rh=UI.review({review:rv});
assert.match(rh,/14\/18/);assert.match(rh,/Points forts/);assert.match(rh,/&lt;b&gt;x/);assert.match(rh,/100 × 8 → 110 × 8/);assert.match(rh,/garder la méthode/);assert.match(rh,/data-action="v2-review-next"/);
const nf=UI.nextForm({answers:{daysCount:'4',duration:'45',goal:'muscle'},weeks:7,methods:globalThis.NolsEngine.methods});
assert.match(nf,/data-v2-next/);assert.match(nf,/<option value="4" selected>/);assert.match(nf,/<option value="7" selected>7 semaines/);assert.match(nf,/Haut \/ bas du corps/);
const pr=UI.proposal({cycle:{method:'ppl',weeks:6,sessions_per_week:3,sessions:[{code:'A',title:'Push',exercises:[{exercise_key:'hack-squat',sets:3,reps_min:8,reps_max:10,rest_seconds:120}]}]},methods:globalThis.NolsEngine.methods});
assert.match(pr,/pas encore actif/);assert.match(pr,/Poussée \/ tirage \/ jambes/);assert.match(pr,/data-action="v2-proposal-accept"/);
assert.match(UI.programme({cycle:{weeks:6,sessions:[]}}),/data-action="v2-review"/);
for(const html of [rh,nf,pr])assert(noEmoji(html)&&!/onclick=/i.test(html));
// Lot 7 : carte Rappels.
const rc=UI.remindersCard({enabled:true,hour:18,minute:30,days:[0,2,4],blocker:null});
assert.match(rc,/18:30, lundi, mercredi, vendredi/);assert.match(rc,/<option value="18:30" selected>/);assert.match(rc,/data-day="2" aria-pressed="true"/);assert.match(rc,/data-day="1" aria-pressed="false"/);assert.match(rc,/v2-rem-test/);assert.match(rc,/v2-rem-off/);
assert.match(UI.remindersCard({enabled:false,hour:18,minute:0,days:[0,1,2,3,4,5,6]}),/data-action="v2-rem-on"/);
assert.match(UI.remindersCard({blocker:'install',message:'Ajoute <STEROID>'}),/Ajoute &lt;STEROID&gt;/);
assert(noEmoji(rc)&&!/onclick=/i.test(rc));
// Accueil : dernière séance effectuée.
const hl=UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},last:{id:'w9',title:'Bas A',date:'2026-11-12T11:00:00Z',minutes:48,sets:16}});
assert.match(hl,/data-action="v2-last-open" data-id="w9"/);assert.match(hl,/Dernière séance/);assert.match(hl,/jeu\. 12 nov\. · 48 min · 16 séries/);
assert.doesNotMatch(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]}}),/Dernière séance/);
// Cardio : liste des activités, modification et suppression.
const cl=UI.cardioLogs([{id:'c1',type:'velo',minutes:25,done_on:'2026-11-12'}]);
assert.match(cl,/data-action="v2-cardio-edit" data-id="c1"/);assert.match(cl,/Vélo · 25 min/);assert.match(cl,/jeu\. 12 nov\./);assert.equal(UI.cardioLogs([]),'');
const ce=UI.cardioSheet({edit:{id:'c1',type:'course',minutes:40,workout_id:'w1'}});
assert.match(ce,/Modifier le cardio/);assert.match(ce,/name="id" value="c1"/);assert.match(ce,/value="course" checked/);assert.match(ce,/value="40"/);assert.match(ce,/data-action="v2-cardio-delete" data-id="c1"/);
assert.doesNotMatch(UI.cardioSheet({}),/v2-cardio-delete/);
// Questionnaire : récapitulatif avant génération et présentation du programme.
{ require('../sport-rules.js');const E=globalThis.NolsEngine,a={...E.defaults,goal:'strength'},pv=E.buildCycle(a);
  const rc=UI.recapCard({answers:a,preview:pv,methods:E.methods});
  assert.match(rc,/Méthode<\/dt><dd>Full body/);assert.match(rc,/Durée du cycle<\/dt><dd>6 semaines/);assert.match(rc,/Gagner en force/);assert.match(rc,/Répartition des séances/);assert.match(rc,/Full body A/);assert.match(rc,/lundi, mercredi, vendredi/);
  assert.match(rc,/Exercices de base : \d+ à \d+ répétitions/);assert.doesNotMatch(rc,/45 répétitions/,'gainage exclu des fourchettes');
  const pi=UI.programIntro({cycle:{method:'fullbody',weeks:6,sessions_per_week:3,sessions:[{},{},{}]},methods:E.methods});
  assert.match(pi,/Ton programme est prêt/);assert.match(pi,/Full body \(corps entier\) · 6 semaines/);assert.match(pi,/3 séances différentes/);assert.match(pi,/data-action="intro-start"/);assert.equal(UI.programIntro({}),'');
  for(const h of [rc,pi])assert(noEmoji(h)&&!/onclick=/i.test(h)); }
// Comment faire : pictogramme dessiné pour l'app + consignes, par type de mouvement.
{ globalThis.SteroidMoves=require('../exercise-guide.js');const M=globalThis.SteroidMoves;
  for(const p of ['pushH','chestIso','pullV','pullH','squat','hinge','hamIso','quadIso','calves','pushV','side','rear','biceps','triceps','core'])
   {assert(M.MOVES[p],'pictogramme manquant : '+p);assert.equal(M.cues(p).length,3);assert.match(M.svg(p),/^<svg[^>]*aria-hidden="true"/);}
  const cat=require('../exercise-catalogue.js');for(const e of cat.CATALOGUE)assert(M.MOVES[e.pattern],'mouvement sans illustration : '+e.key);
  assert.equal(M.label('inconnu'),'Exercice');
  const s=UI.session({workout});assert.match(s,/data-action="v2-howto"/);assert.match(s,/<svg class="mv-pic"/);
  const h=UI.howtoSheet({key:'hack-squat'});assert.match(h,/Hack squat/);assert.match(h,/Squat \/ presse · Jambes/);assert.match(h,/genoux dans l’axe/);assert.match(h,/data-action="v2-close-sheet"/);
  assert(noEmoji(h)&&!/onclick=|<img|https?:/i.test(h),'aucune image externe'); }
// Ressenti en un appui après une série validée.
{ const r=UI.session({workout,rate:{ex:'x1',set:2,rir:null,name:'Hack squat'}});
  assert.match(r,/Série 2 · Hack squat : c’était…/);assert.match(r,/data-action="v2-rir" data-ex="x1" data-set="2" data-rir="3"/);assert.match(r,/Facile[^]*Correct[^]*Dur/);
  assert.match(UI.session({workout,rate:{ex:'x1',set:1,rir:2}}),/data-rir="2" aria-pressed="true"/);assert.doesNotMatch(UI.session({workout}),/v2-rate/); }
// Semaine allégée et échauffement.
{ const l=UI.session({workout,light:true,warmup:{ex:workout.exercises[0].id,sets:[{weight:50,reps:8},{weight:75,reps:4}]}});
  assert.match(l,/Semaine allégée/);assert.match(l,/Échauffement[^]*50 kg × 8[^]*75 kg × 4/);
  assert.match(UI.session({workout,warmup:{ex:workout.exercises[0].id,sets:null}}),/2 séries légères/);
  assert.doesNotMatch(UI.session({workout}),/Échauffement|Semaine allégée/);
  assert.match(UI.home({next:{session:haut,planned:haut,reason:'sequence'},cycle:{sessions:[haut]},deload:true}),/semaine allégée/); }
// Programme : barre « Annuler / Enregistrer » ; menus du bas : poignée qui ferme.
assert.match(UI.programme({cycle:{weeks:6,sessions:[]},editing:2}),/Non enregistré[^]*v2-edit-cancel[^]*v2-edit-save/);
assert.doesNotMatch(UI.programme({cycle:{weeks:6,sessions:[]}}),/v2-savebar/);
assert.match(UI.chooser({sessions:[haut]}),/<button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer/);
assert.doesNotMatch(UI.idlePrompt?UI.idlePrompt({}):'',/v2-grab/,'la question « en pause ? » attend une réponse');
console.log('ui-v2 : ok');
// Fin de séance : comparaison avec la dernière fois, semaines d'affilée, partage ; Progrès : carte Régularité.
{const sw={id:'w9',duration_seconds:1800,exercises:[{id:'e',position:0,exercise_key:'developpe-couche-barre',status:'done',plan:{},sets:[{set_number:1,weight:85,reps:8,completed:true}]}]};
 const h=UI.summary({workout:sw,compare:[{key:'developpe-couche-barre',kind:'kg',diff:5},{key:'developpe-couche-barre',kind:'reps',diff:-2}],streak:3});
 assert.match(h,/\+5 kg/);assert.match(h,/−2 rép\./);assert.match(h,/3e semaine d’affilée/);assert.match(h,/data-action="share-summary"/);
 assert(!/semaine d’affilée/.test(UI.summary({workout:sw,streak:1})),'pas de série affichée à 1 semaine');
 const p=UI.progress({regularity:{streak:2,year:2026,month:10,days:[3,5,24],today:24,total:3},progress:{byKey:{},totals:{sets:0,volume:0}}});
 assert.match(p,/2 semaines d’affilée/);assert.match(p,/3 séances en novembre/);assert.match(p,/class="is-done is-today"[^>]*>24</);
 assert(!/v2-regular/.test(UI.progress({regularity:{streak:0,days:[],total:0},progress:{byKey:{},totals:{sets:0,volume:0}}})),'pas de carte sans séance');}
console.log('ui-v2 : fin de séance et régularité ok');
