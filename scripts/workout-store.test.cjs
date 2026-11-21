// Séance V2 en cours : séries, pause, plus tard, remplacement, fin, file d'envoi hors ligne.
const assert=require('assert');
const W=require('../workout-store.js');

function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m}}
function fakeApi(){const api={online:true,sent:[],async upsert(table,rows){if(!api.online)throw Error('Hors ligne');api.sent.push({table,rows:JSON.parse(JSON.stringify(rows))})}};return api}
let t=Date.parse('2026-11-23T10:00:00Z');const clock=()=>t;let n=0;const uuid=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');
const storage=memory(),api=fakeApi();
const make=()=>W.createWorkoutStore({storage,api,userId:'user-1',now:clock,uuid});
const session={id:'cs-1',cycle_id:'cy-1',exercises:[
 {id:'ce-1',exercise_key:'hack-squat',role:'base',sets:3,reps_min:6,reps_max:10,rest_seconds:120},
 {id:'ce-2',exercise_key:'leg-curl-assis',role:'finition',sets:2,reps_min:10,reps_max:15,rest_seconds:75},
 {id:'ce-3',exercise_key:'mollets-debout',role:'finition',sets:2,reps_min:10,reps_max:15,rest_seconds:75}]};

(async()=>{
 const s=make();
 const w=s.start(session,{last:{'hack-squat':{weight:80,reps:8}}});
 assert.equal(w.status,'in_progress');assert.equal(w.exercises.length,3);
 // Préremplissage avec la dernière performance ; sinon charge vide (jamais 0).
 assert.deepEqual(w.exercises[0].sets.map(x=>[x.weight,x.reps,x.completed]),[[80,8,false],[80,8,false],[80,8,false]]);
 assert.equal(w.exercises[1].sets[0].weight,null);
 assert.throws(()=>s.start(session),/déjà en cours/);

 // Série validée en un appel.
 s.logSet(w.exercises[0].id,1,{weight:82.5,reps:8,completed:true});
 assert.deepEqual(s.current().exercises[0].sets[0],{...s.current().exercises[0].sets[0],weight:82.5,reps:8,completed:true});

 // Reprise après fermeture de l'app : un nouveau store relit la séance.
 assert.equal(make().current().exercises[0].sets[0].weight,82.5);

 // Pause : 5 min non comptées.
 t+=10*60e3;s.pause();assert(s.current().paused_at);
 t+=5*60e3;s.resume();assert.equal(s.current().paused_seconds,300);assert.equal(s.current().paused_at,null);
 // Pause oubliée : « Tu étais en pause ? » → pause datée du dernier geste (10 min non comptées).
 t+=10*60e3;s.pause(t-10*60e3);s.resume();assert.equal(s.current().paused_seconds,900);

 // Plus tard : passe en fin de séance sans réutiliser une position (contrainte unique en base).
 const curl=s.current().exercises[1].id;
 s.later(curl);
 assert.deepEqual(s.current().exercises.map(e=>e.exercise_key),['hack-squat','mollets-debout','leg-curl-assis']);
 assert.equal(s.current().exercises[2].status,'later');
 assert.equal(new Set(s.current().exercises.map(e=>e.position)).size,3);
 const last=s.current().exercises[2].id;s.later(last);
 assert.equal(s.current().exercises[2].id,last,'plus tard sur le dernier : aucun effet');

 // Remplacement : ancienne clé gardée, séries remises à zéro, même objectif.
 const mol=s.current().exercises[1].id;
 s.substitute(mol,'mollets-assis');
 const sub=s.current().exercises.find(e=>e.id===mol);
 assert.deepEqual([sub.exercise_key,sub.substituted_from_key,sub.sets.length],['mollets-assis','mollets-debout',2]);
 s.substitute(mol,'mollets-machine');assert.equal(s.current().exercises.find(e=>e.id===mol).substituted_from_key,'mollets-debout','origine conservée');
 s.substitute(mol,'mollets-debout');const back=s.current().exercises.find(e=>e.id===mol);
 assert.deepEqual([back.exercise_key,back.substituted_from_key],['mollets-debout',null],'retour à l’original');

 // Remplacement après une série déjà validée : l'exercice fait est conservé (passé), le remplaçant est ajouté.
 const hack=s.current().exercises.find(e=>e.exercise_key==='hack-squat');
 s.substitute(hack.id,'presse-a-cuisses');
 assert.equal(s.current().exercises.find(e=>e.id===hack.id).exercise_key,'hack-squat','série faite jamais réattribuée');
 assert.equal(s.current().exercises.find(e=>e.id===hack.id).status,'skipped');
 const press=s.current().exercises.find(e=>e.exercise_key==='presse-a-cuisses');
 assert(press&&press.substituted_from_key==='hack-squat'&&press.id!==hack.id);
 assert.equal(new Set(s.current().exercises.map(e=>e.position)).size,s.current().exercises.length);
 // Hors ligne : rien n'est perdu.
 api.online=false;
 assert.equal(await s.flush(),false);
 assert(s.pending()>0);

 // Fin de séance avec une pause en cours : la pause n'est pas comptée.
 t+=20*60e3;s.pause();t+=10*60e3;
 const done=s.finish();
 assert.equal(done.status,'completed');
 assert.equal(done.duration_seconds,(10+20)*60,'45 min − 5 min − 10 min de pause');
 assert.equal(s.current(),null);

 // Retour du réseau : envoi dans l'ordre, dernière version de chaque ligne, une seule fois.
 api.online=true;
 assert.equal(await s.flush(),true);
 assert.deepEqual([...new Set(api.sent.map(x=>x.table))],['workouts','workout_exercises','workout_set_logs']);
 const wRows=api.sent.filter(x=>x.table==='workouts').flatMap(x=>x.rows);
 assert.equal(wRows.length,1);assert.equal(wRows[0].status,'completed');assert.equal(wRows[0].user_id,'user-1');
 const sets=api.sent.filter(x=>x.table==='workout_set_logs').flatMap(x=>x.rows);
 assert(sets.every(r=>r.exercise_key&&r.workout_exercise_id&&r.set_number>=1));
 assert.equal(sets.find(r=>r.exercise_key==='hack-squat'&&r.set_number===1).weight,82.5);
 assert.equal(s.pending(),0);
 const before=api.sent.length;assert.equal(await s.flush(),true);assert.equal(api.sent.length,before,'rien de renvoyé');
 // La file vide survit au redémarrage.
 assert.equal(make().pending(),0);
 console.log('Workout store checks passed');
})().catch(e=>{console.error(e);process.exit(1)});

// Régression : un envoi avec une file vide ne doit pas bloquer les envois suivants.
(async()=>{
 const m=new Map(),st={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 const sent=[],store=W.createWorkoutStore({storage:st,api:{async upsert(t){sent.push(t)}},userId:'empty-queue'});
 assert.equal(await store.flush(),true);
 store.start({id:'s',exercises:[{exercise_key:'dips',sets:1,role:'base'}]});
 assert.equal(await store.flush(),true);assert.equal(store.pending(),0);assert(sent.includes('workouts'));
 console.log('Workout store empty-queue regression passed');
})().catch(e=>{console.error(e);process.exit(1)});
