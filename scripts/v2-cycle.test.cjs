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
 console.log('v2-cycle : ok');
})().catch(e=>{console.error(e);process.exit(1)});
