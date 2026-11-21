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
  throw Error(path)}};
 const loaded=await C.loadCycle(api,'u1');
 assert.deepEqual(loaded.cycle.sessions.map(s=>s.id),['s1','s2']);
 assert.equal(loaded.cycle.sessions[0].exercises.length,1);assert.equal(loaded.cycle.sessions[1].exercises.length,0);
 assert.deepEqual(loaded.cycle.sessions[0].muscles,[{muscle:'Pectoraux',role:'base'}]);
 assert.equal(loaded.workouts.length,2);assert.equal(loaded.setLogs.length,4);
 const none=await C.loadCycle({async select(p){return []}},'u1');assert.equal(none.cycle,null);

 // Avancée du cycle : séances faites ÷ (semaines × séances par semaine).
 assert.equal(C.cycleProgress({weeks:6,sessions_per_week:3,id:'cy'},[{cycle_id:'cy',status:'completed'},{cycle_id:'autre',status:'completed'}]),1/18);
 console.log('v2-cycle : ok');
})().catch(e=>{console.error(e);process.exit(1)});
