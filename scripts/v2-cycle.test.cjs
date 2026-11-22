// Cycle V2 côté app : construction, dernières performances, noms, progrès, chargement Supabase.
const assert=require('assert');
const Cat=require('../exercise-catalogue.js');globalThis.SteroidCatalogue=Cat;
const C=require('../v2-cycle.js');
let n=0;const uuid=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');

(async()=>{
 // fromEngine : ordre et volumes conservés, forme identique aux lignes Supabase.
 const built={engineVersion:'2.0.0',method:'upperlower',weeks:6,sessionsPerWeek:4,preferredDays:[0,2,4,5],answers:{goal:'muscle'},sessions:[
  {position:0,code:'A',title:'Haut A',focus:['Pectoraux','Dos'],exercises:[{key:'developpe-couche-barre',name:'Développé couché barre',role:'base',sets:3,repsMin:6,repsMax:8,rest:180},{key:'hack-squat',name:'Hack squat',role:'base',sets:2,repsMin:10,repsMax:12,rest:120}]},
  {position:1,code:'B',title:'Bas A',focus:['Jambes'],exercises:[{key:'hack-squat',name:'Hack squat',role:'base',sets:4,repsMin:6,repsMax:10,rest:180}]}]};
 const cy=C.fromEngine(built,{uuid,userId:'u1'});
 assert.equal(cy.method,'upperlower');assert.equal(cy.status,'active');assert.equal(cy.weeks,6);assert.equal(cy.sessions_per_week,4);
 assert.deepEqual(cy.sessions.map(s=>[s.position,s.code,s.title]),[[0,'A','Haut A'],[1,'B','Bas A']]);
 assert.deepEqual(cy.sessions[0].exercises.map(e=>[e.position,e.exercise_key,e.sets,e.reps_min,e.reps_max,e.rest_seconds,e.role]),[[0,'developpe-couche-barre',3,6,8,180,'base'],[1,'hack-squat',2,10,12,120,'base']]);
 assert.equal(cy.sessions[0].cycle_id,cy.id);assert.equal(cy.sessions[0].exercises[0].cycle_session_id,cy.sessions[0].id);
 // Muscles par rôle pour le garde-fou (session-planner lit s.muscles).
 assert.deepEqual(cy.sessions[1].muscles,[{muscle:'Jambes',role:'base'}]);
 // Lignes prêtes pour l'envoi.
 const rows=C.toRows(cy,'u1');
 assert.equal(rows.cycles[0].user_id,'u1');assert.equal(rows.cycle_sessions.length,2);assert.equal(rows.cycle_exercises.length,3);
 assert(!('exercises' in rows.cycle_sessions[0])&&!('muscles' in rows.cycle_sessions[0]));

 // lastPerformance : dernière série validée par clé, charge null conservée.
 const logs=[
  {exercise_key:'hack-squat',weight:80,reps:8,completed:true,created_at:'2026-11-10T10:00:00Z'},
  {exercise_key:'hack-squat',weight:85,reps:7,completed:true,created_at:'2026-11-12T10:00:00Z'},
  {exercise_key:'hack-squat',weight:120,reps:1,completed:false,created_at:'2026-11-13T10:00:00Z'},
  {exercise_key:'dips',weight:null,reps:12,completed:true,created_at:'2026-11-12T10:00:00Z'}];
 assert.deepEqual(C.lastPerformance(logs),{'hack-squat':{weight:85,reps:7},'dips':{weight:null,reps:12}});

 // fromLegacyPlan : un cycle par jour non vide, noms rattachés au catalogue.
 const plan=[{day:'Lundi',title:'Push A',ex:[{name:'Développé couché barre',sets:3,reps:'6–8',rest:180}]},{day:'Mardi',title:'Repos',ex:[]},{day:'Mercredi',title:'Legs',ex:[{name:'Hack squat',sets:3,reps:'10',rest:120},{name:'Mon exo maison',sets:2,reps:'12–15',rest:60}]}];
 const legacy=C.fromLegacyPlan(plan,{uuid,userId:'guest'});
 assert.deepEqual(legacy.sessions.map(s=>s.title),['Push A','Legs']);assert.deepEqual(legacy.preferred_days,[0,2]);
 assert.deepEqual(legacy.sessions[1].exercises.map(e=>[e.reps_min,e.reps_max]),[[10,10],[12,15]]);
 assert.match(legacy.sessions[1].exercises[1].exercise_key,/^u-/);
 assert.equal(legacy.user_exercises[0].name,'Mon exo maison');

 // nameOf : catalogue, puis exercice perso, puis repli.
 assert.equal(C.nameOf('hack-squat'),'Hack squat');
 assert.equal(C.nameOf('u-1',[{key:'u-1',name:'Mon exo'}]),'Mon exo');
 assert.equal(C.nameOf('inconnu'),'Exercice');

 // progress : séries validées seulement, une entrée par séance, clés séparées (remplacement jamais fusionné).
 const wk=[{id:'w1',ended_at:'2026-11-10T11:00:00Z',status:'completed'},{id:'w2',ended_at:'2026-11-12T11:00:00Z',status:'completed'}];
 const sl=[{workout_id:'w1',exercise_key:'hack-squat',weight:80,reps:8,completed:true},{workout_id:'w1',exercise_key:'hack-squat',weight:82,reps:6,completed:true},
  {workout_id:'w2',exercise_key:'hack-squat',weight:200,reps:1,completed:false},{workout_id:'w2',exercise_key:'presse-cuisses',weight:null,reps:10,completed:true}];
 const p=C.progress(sl,wk);
 assert.deepEqual(p.totals,{sets:3,volume:80*8+82*6});
 assert.deepEqual(p.byKey['hack-squat'],[{date:'2026-11-10T11:00:00Z',weight:82,reps:8,volume:80*8+82*6}]);
 assert.deepEqual(p.byKey['presse-cuisses'],[{date:'2026-11-12T11:00:00Z',weight:null,reps:10,volume:0}]);

 // loadCycle : assemble cycle + séances + exercices depuis l'API.
 const api={async select(path){
  if(path.startsWith('cycles'))return [{id:'cy',status:'active',method:'ppl',weeks:6,sessions_per_week:3}];
  if(path.startsWith('cycle_sessions'))return [{id:'s2',cycle_id:'cy',position:1,code:'B',title:'Pull',focus:['Dos']},{id:'s1',cycle_id:'cy',position:0,code:'A',title:'Push',focus:['Pectoraux']}];
  if(path.startsWith('cycle_exercises'))return [{id:'e1',cycle_session_id:'s1',position:0,exercise_key:'developpe-couche-barre',role:'base',sets:3,reps_min:6,reps_max:8,rest_seconds:180}];
  if(path.startsWith('workouts'))return wk;
  if(path.startsWith('workout_set_logs'))return sl;
  if(path.startsWith('user_exercises'))return [];
  if(path.startsWith('cardio_logs')||path.startsWith('cycle_cardio'))return [];throw Error(path)}};
 const loaded=await C.loadCycle(api,'u1');
 assert.deepEqual(loaded.cycle.sessions.map(s=>s.id),['s1','s2']);
 assert.equal(loaded.cycle.sessions[0].exercises.length,1);assert.equal(loaded.cycle.sessions[1].exercises.length,0);
 assert.deepEqual(loaded.cycle.sessions[0].muscles,[{muscle:'Pectoraux',role:'base'}]);
 assert.equal(loaded.workouts.length,2);assert.equal(loaded.setLogs.length,4);
 const none=await C.loadCycle({async select(p){return []}},'u1');assert.equal(none.cycle,null);
 // Lot 5 : numéro de série, ressenti, substitution et titre de séance lus avec l'historique.
 const paths=[],rich={async select(p){paths.push(p);
  if(p.startsWith('workouts'))return [{id:'w9',status:'completed',ended_at:'2026-11-01T00:00:00Z',cycle_session_id:'old',cycle_sessions:{title:'Haut ancien'}}];
  if(p.startsWith('workout_set_logs'))return [{exercise_key:'dips',set_number:2,weight:null,reps:10,rir:2,completed:true,workout_exercises:{workout_id:'w9',position:3,substituted_from_key:'pompes',rpe:8}}];
  return []}};
 const lr=await C.loadCycle(rich,'u1');
 assert.equal(lr.workouts[0].title,'Haut ancien');assert.equal('cycle_sessions' in lr.workouts[0],false);
 assert.equal(lr.truncated,false);
 assert.deepEqual(lr.setLogs[0],{exercise_key:'dips',set_number:2,weight:null,reps:10,rir:2,completed:true,workout_id:'w9',position:3,substituted_from_key:'pompes',rpe:8});
 assert(paths.some(p=>/^workouts.*cycle_sessions\(title\)/.test(p)));
 assert(paths.some(p=>/^workout_set_logs.*set_number.*workout_exercises\(workout_id,position,substituted_from_key,rpe\)/.test(p)));

 // Avancée du cycle : séances faites ÷ (semaines × séances par semaine).
 assert.equal(C.cycleProgress({weeks:6,sessions_per_week:3,id:'cy'},[{cycle_id:'cy',status:'completed'},{cycle_id:'autre',status:'completed'}]),1/18);

 // ===== Lot 4 : rythme et cardio =====
 // Lundi 23 novembre 2026, 10 h (heure locale) ; 0 = lundi.
 const mon=new Date(2026,10,23,10).getTime(),day=24*3600e3;
 assert.equal(C.weekStart(mon),new Date(2026,10,23).getTime());
 assert.equal(C.weekStart(mon-11*3600e3),new Date(2026,10,16).getTime(),'dimanche soir = semaine précédente');
 const cyD={id:'cy',sessions_per_week:3,preferred_days:[0,2,4],sessions:[]};
 let r=C.rhythm(cyD,[],mon);assert.equal(r.mode,'days');assert.equal(r.todayPlanned,true);assert.equal(r.nextDay,0);assert.equal(r.goal,3);
 r=C.rhythm(cyD,[{cycle_id:'cy',status:'completed',ended_at:new Date(mon).toISOString()}],mon+3600e3);
 assert.equal(r.doneThisWeek,1);assert.equal(r.todayPlanned,false,'séance du jour déjà faite');assert.equal(r.nextDay,2,'prochain jour : mercredi');
 r=C.rhythm(cyD,[],mon+5*day);assert.equal(r.nextDay,0,'samedi → lundi suivant');
 r=C.rhythm({id:'cy',sessions_per_week:4,preferred_days:null,sessions:[]},[],mon);assert.equal(r.mode,'free');assert.equal(r.nextDay,null);assert.equal(r.todayPlanned,false);
 // Cardio : minutes de la semaine en cours, puis 6 dernières semaines.
 const cl=[{done_on:'2026-11-23',minutes:20,type:'velo'},{done_on:'2026-11-22',minutes:30,type:'marche'},{done_on:'2026-11-25',minutes:15,type:'course'},{done_on:'2026-10-01',minutes:60,type:'marche'}];
 assert.equal(C.cardioWeek(cl,mon),35);
 const cp=C.cardioProgress(cl,mon);assert.equal(cp.length,6);assert.deepEqual(cp.at(-1),{week:'2026-11-23',minutes:35});assert.deepEqual(cp.at(-2),{week:'2026-11-16',minutes:30});
 assert.equal(C.localDate(mon),'2026-11-23');
 // Chargement : cardio prévu du cycle et cardio fait.
 const capi={async select(p){if(p.startsWith('cycles'))return [{id:'cy',status:'active'}];if(p.startsWith('cycle_sessions'))return [];if(p.startsWith('cycle_cardio'))return [{id:'cc',cycle_id:'cy',type:'velo',minutes:30,per_week:2}];if(p.startsWith('cardio_logs'))return cl;return []}};
 const lc=await C.loadCycle(capi,'u1');assert.equal(lc.cycle.cardio[0].type,'velo');assert.equal(lc.cardioLogs.length,4);
 // Changement d'heure (mars, Paris) : un lundi n'est compté que dans sa propre semaine.
 const out=require('child_process').execFileSync(process.execPath,['-e',`
  globalThis.SteroidCatalogue=require('./exercise-catalogue.js');const C=require('./v2-cycle.js');
  const l=[{done_on:'2026-03-30',minutes:40,type:'velo'}];
  const p=C.cardioProgress(l,new Date(2026,3,1,12).getTime());
  console.log(JSON.stringify({prev:C.cardioWeek(l,new Date(2026,2,27,12).getTime()),bars:p.filter(w=>w.minutes).map(w=>w.week)}))`],{cwd:require('path').join(__dirname,'..'),env:{...process.env,TZ:'Europe/Paris'}}).toString();
 assert.deepEqual(JSON.parse(out),{prev:0,bars:['2026-03-30']});
 // Semaine allégée : la dernière semaine de séances réellement faites.
{ const cy={id:'c',weeks:6,sessions_per_week:3},ws=n=>Array.from({length:n},(_,i)=>({id:'w'+i,cycle_id:'c',status:'completed'}));
  assert.equal(C.deload(cy,ws(14)),false);assert.equal(C.deload(cy,ws(15)),true);assert.equal(C.deload(cy,ws(17)),true);assert.equal(C.deload(cy,ws(18)),false,'cycle terminé : place au bilan');
  assert.equal(C.deload(null,[]),false);assert.equal(C.deloadSets(3),2);assert.equal(C.deloadSets(4),2);assert.equal(C.deloadSets(1),1);
  assert.deepEqual(C.warmup(100),[{weight:50,reps:8},{weight:75,reps:4}]);assert.deepEqual(C.warmup(42),[{weight:21,reps:8},{weight:32,reps:4}]);
  assert.equal(C.warmup(null),null);assert.equal(C.warmup(12),null,'charge légère : pas d’échauffement chiffré'); }
console.log('v2-cycle : ok');
})().catch(e=>{console.error(e);process.exit(1)});
// Où on en est : semaine en cours depuis le début du cycle et séances faites sur le total.
{const C2=require('../v2-cycle.js'),D=24*3600e3,start=Date.parse('2026-11-02T00:00:00Z');
 const cy={id:'c9',weeks:6,sessions_per_week:6,started_at:new Date(start).toISOString(),sessions:[]};
 const ws=Array.from({length:13},(_,i)=>({cycle_id:'c9',status:'completed'})).concat([{cycle_id:'c9',status:'skipped'},{cycle_id:'x',status:'completed'}]);
 const st=C2.cycleStatus(cy,ws,start+20*D);require('assert').deepStrictEqual(st,{week:3,weeks:6,done:13,total:36,pct:36});
 require('assert').equal(C2.cycleStatus(cy,[],start+90*D).week,6,'jamais au-delà de la dernière semaine');}
// Règle unique de comptage : une séance terminée sans série validée ni cardio ne compte pas.
{const C3=require('../v2-cycle.js'),A=require('assert');
 const ws=[{id:'a',status:'completed',ended_at:'2026-11-22T10:00:00Z'},{id:'b',status:'completed',ended_at:'2026-11-22T11:00:00Z'},
  {id:'c',status:'completed',ended_at:'2026-11-22T12:00:00Z'},{id:'d',status:'completed',legacy_week:2,ended_at:'2026-11-10T12:00:00Z'},
  {id:'e',status:'skipped',ended_at:'2026-11-22T13:00:00Z'},{id:'f',status:'completed',ended_at:'2026-11-01T12:00:00Z'}];
 const logs=[{workout_id:'a',completed:true,created_at:'2026-11-22T10:00:00Z'},{workout_id:'b',completed:false,created_at:'2026-11-05T11:00:00Z'}];
 const out=C3.countable(ws,logs,[{workout_id:'c'}]);
 A.deepStrictEqual(out.map(w=>w.status),['completed','empty','completed','completed','skipped','empty']);
 A.equal(C3.countable(ws,logs,[],{truncated:true}).find(w=>w.id==='f').status,'completed','avant la plus ancienne série chargée : on ne sait pas, elle compte');}
