// Historique V2 : tout par clé d'exercice, seules les séries validées comptent.
const assert=require('assert');
const H=require('../v2-history.js');

const W=(id,ended,extra={})=>({id,cycle_id:'c1',cycle_session_id:'s1',status:'completed',started_at:ended,ended_at:ended,duration_seconds:3000,...extra});
const L=(wid,key,n,weight,reps,extra={})=>({workout_id:wid,exercise_key:key,set_number:n,weight,reps,completed:true,created_at:'2026-11-01T00:00:00Z',...extra});
const workouts=[W('w1','2026-11-02T10:00:00Z'),W('w2','2026-11-05T10:00:00Z'),W('w3','2026-11-09T10:00:00Z',{cycle_session_id:'s2'}),{id:'w0',status:'in_progress',started_at:'2026-11-10T10:00:00Z'}];
const logs=[
 L('w1','dev-couche-barre',1,80,8,{position:0}),L('w1','dev-couche-barre',2,80,7,{position:0}),
 L('w2','dev-couche-barre',2,80,8,{position:0}),L('w2','dev-couche-barre',1,82.5,8,{position:0}),L('w2','dev-couche-barre',3,90,2,{position:0,completed:false}),
 // Machine prise : remplacé ponctuellement, rangé sous sa propre clé.
 L('w3','dev-couche-halteres',1,30,10,{position:0,substituted_from_key:'dev-couche-barre'}),L('w3','dips',1,null,12,{position:1}),
 L('w0','dev-couche-barre',1,200,1)
];

// Liste des séances : terminées seulement, la plus récente d'abord.
const list=H.sessions(workouts,logs,{titles:{s1:'Haut A',s2:'Haut B'},cardioLogs:[{workout_id:'w3',type:'velo',minutes:20}]});
assert.deepEqual(list.map(s=>s.id),['w3','w2','w1']);
assert.equal(list[0].title,'Haut B');assert.equal(list[1].title,'Haut A');assert.equal(list[0].minutes,50);
assert.equal(list[1].sets,2,'série non validée exclue');assert.equal(list[1].volume,82.5*8+80*8);
assert.deepEqual(list[1].exercises[0].sets.map(s=>s.set_number),[1,2],'séries dans l’ordre');
assert.equal(list[0].exercises[0].key,'dev-couche-halteres');assert.equal(list[0].exercises[0].from,'dev-couche-barre');
assert.deepEqual(list[0].cardio,[{type:'velo',minutes:20}]);
assert.equal(H.sessions([W('x','2026-11-01T00:00:00Z',{title:'Libre',cycle_session_id:null})],[],{}).at(0).title,'Libre');

// Historique d'un exercice : jamais fusionné avec son remplaçant.
const ex=H.exercise('dev-couche-barre',logs,workouts);
assert.deepEqual(ex.entries.map(e=>e.workoutId),['w2','w1']);
assert.deepEqual(ex.entries[0].best,{weight:82.5,reps:8});
assert.deepEqual(ex.entries[0].diff,{weight:2.5,reps:0});assert.equal(ex.entries[1].diff,null);
assert.deepEqual(ex.record,{weight:82.5,reps:8,date:'2026-11-05T10:00:00Z',workoutId:'w2'});
const alt=H.exercise('dev-couche-halteres',logs,workouts);
assert.equal(alt.entries.length,1);assert.equal(alt.entries[0].from,'dev-couche-barre');
// Sans charge : pas de record, la meilleure série reste lisible.
const dips=H.exercise('dips',logs,workouts);assert.equal(dips.record,null);assert.deepEqual(dips.entries[0].best,{weight:null,reps:12});

// Records : première séance = pas de record ; ensuite charge plus lourde à reps égales ou plus, ou plus de reps à charge égale.
assert.deepEqual(H.newRecords('w1',logs,workouts),[]);
assert.deepEqual(H.newRecords('w2',logs,workouts),[{key:'dev-couche-barre',kind:'weight',weight:82.5,reps:8,delta:2.5}]);
assert.deepEqual(H.newRecords('w3',logs,workouts),[]);
const more=[...logs,L('w4','dev-couche-barre',1,82.5,10)],ws=[...workouts,W('w4','2026-11-12T10:00:00Z')];
assert.deepEqual(H.newRecords('w4',more,ws),[{key:'dev-couche-barre',kind:'reps',weight:82.5,reps:10,delta:2}]);
// Plus lourd mais moins de répétitions : pas comparable, pas de record.
assert.deepEqual(H.newRecords('w5',[...logs,L('w5','dev-couche-barre',1,85,5)],[...workouts,W('w5','2026-11-12T10:00:00Z')]),[]);
assert.deepEqual(H.latestRecord(more,ws),{key:'dev-couche-barre',kind:'reps',weight:82.5,reps:10,delta:2,date:'2026-11-12T10:00:00Z'});
assert.equal(H.latestRecord([],[]),null);

// Conseils (double progression), fondés sur la dernière séance de la même clé.
const plan={sets:2,reps_min:6,reps_max:8};
let a=H.advice(plan,logs,workouts,'dev-couche-barre');
assert.equal(a.status,'increase');assert.equal(a.weight,85);assert.match(a.text,/85 kg/);
a=H.advice({sets:3,reps_min:6,reps_max:8},logs,workouts,'dev-couche-barre');
assert.equal(a.status,'complete');assert.match(a.text,/2 séries sur 3/);
a=H.advice({sets:2,reps_min:8,reps_max:10},logs,workouts,'dev-couche-barre');
assert.equal(a.status,'reps');assert.match(a.text,/82,5 kg/);assert.match(a.text,/10 répétitions/);
// À l'échec (ressenti 10) : on garde la charge.
a=H.advice(plan,logs.map(r=>r.workout_id==='w2'?{...r,rpe:10}:r),workouts,'dev-couche-barre');
assert.equal(a.status,'hold');assert.equal(a.weight,undefined);
// Sans charge notée : aucun conseil de charge.
a=H.advice({sets:1,reps_min:8,reps_max:12},logs,workouts,'dips');assert.equal(a.status,'bodyweight');assert.doesNotMatch(a.text,/kg/);
a=H.advice({sets:2,reps_min:6,reps_max:8},[L('w1','squat',1,100,8),L('w1','squat',2,null,8)],workouts,'squat');assert.equal(a.status,'weight');
// Jamais pratiqué : pas de conseil.
assert.equal(H.advice(plan,logs,workouts,'rowing-barre'),null);
// Données en cache d'avant le lot 5 (sans numéro de série) : pas d'erreur.
assert.equal(H.sessions([W('w1','2026-11-02T10:00:00Z')],[{workout_id:'w1',exercise_key:'squat',weight:100,reps:5,completed:true}],{})[0].exercises[0].sets.length,1);
assert.equal(H.increment(60),2.5);assert.equal(H.increment(20),1.25);assert.equal(H.increment(10),0.5);

console.log('v2-history : ok');
