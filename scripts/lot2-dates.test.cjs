// Lot 2 : jour d'une séance = son début, semaines calendaires, dernière perf datée par la séance, annulation d'une séance passée.
process.env.TZ=process.env.TZ||'Europe/Paris';
const assert=require('assert');
const P=require('../session-planner.js'),C=require('../v2-cycle.js'),Rv=require('../v2-review.js'),St=require('../workout-store.js');
const at=s=>Date.parse(s);
// Séance commencée lundi 23:30, finie mardi 00:20 : le mardi reste libre.
const cyc={sessions:[{id:'a',position:0,title:'A'},{id:'b',position:1,title:'B'}]};
const late={id:'w',status:'completed',cycle_session_id:'a',started_at:'2026-11-23T22:30:00Z',ended_at:'2026-11-23T23:20:00Z'};
assert.equal(P.today([late],at('2026-11-24T17:00:00Z')),null,'mardi libre');
assert.equal(P.today([late],at('2026-11-23T22:50:00Z')).id,'w','lundi : faite');
// Semaines calendaires : cycle commencé un mercredi, semaine 2 dès le lundi suivant.
const cy={id:'c',weeks:6,sessions_per_week:3,started_at:'2026-11-18T09:00:00Z',sessions:[]};
assert.equal(C.cycleStatus(cy,[],at('2026-11-23T08:00:00Z')).week,2);
assert.equal(C.cycleStatus(cy,[],at('2026-11-22T20:00:00Z')).week,1);
// Dernière performance : séries V1 avec la même date de copie → la séance la plus récente gagne.
const ws=[{id:'old',started_at:'2026-11-01T10:00:00Z'},{id:'new',started_at:'2026-11-20T10:00:00Z'}];
const copy='2026-11-21T17:35:45Z';
const logs=[{workout_id:'new',exercise_key:'k',completed:true,weight:100,reps:5,position:0,set_number:1,created_at:copy},{workout_id:'old',exercise_key:'k',completed:true,weight:60,reps:8,position:0,set_number:3,created_at:copy}];
assert.deepStrictEqual(C.lastPerformance(logs,ws).k,{weight:100,reps:5});
assert.deepStrictEqual(C.lastPerformance([...logs].reverse(),ws).k,{weight:100,reps:5});
// Annuler une séance passée : seulement les colonnes de la table.
const mem={};const st={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v},removeItem:k=>{delete mem[k]}};
const store=St.createWorkoutStore({storage:st,api:null,userId:'u',now:()=>at('2026-11-23T10:00:00Z'),uuid:(()=>{let i=0;return()=>'id'+(i++)})()});
const row=store.skipSession({id:'a',cycle_id:'c'},{reason:'malade'});
const r=store.cancelSkip({...row,title:'A',local_only:true});
assert.equal(r.status,'abandoned');assert(!('title' in r)&&!('local_only' in r),'pas de colonnes inconnues');assert.equal(r.revision,2);
console.log('Lot 2 dates et synchro : ok');
