// Bilan de fin de cycle : constats fondés sur les séances réellement faites, recommandation expliquée.
const assert=require('assert');
globalThis.SteroidCatalogue=require('../exercise-catalogue.js');
globalThis.SteroidHistory=require('../v2-history.js');
require('../program-engine.js');
const R=require('../v2-review.js');

const DAY=24*3600e3,start=Date.parse('2026-09-07T08:00:00Z');
const cycle={id:'c1',method:'fullbody',weeks:6,sessions_per_week:3,started_at:new Date(start).toISOString(),answers_snapshot:{daysCount:'3',duration:'60',equipment:'gym',goal:'muscle',level:'intermediate',days:[0,2,4],method:'auto'},
 sessions:[{id:'s1',title:'Full A',exercises:[{exercise_key:'developpe-couche-barre',role:'base',sets:2,reps_min:6,reps_max:8},{exercise_key:'hack-squat',role:'base',sets:2,reps_min:8,reps_max:10}]}]};
function make(n,{progress=true,rpe=null,sub=false}={}){
 const workouts=[],logs=[];
 for(let i=0;i<n;i++){
  const id='w'+i,ended=new Date(start+i*2*DAY).toISOString();workouts.push({id,cycle_id:'c1',cycle_session_id:'s1',status:'completed',ended_at:ended,duration_seconds:3000});
  const w=progress?60+2.5*Math.floor(i/3):60;
  for(const n of [1,2])logs.push({workout_id:id,workout_exercise_id:id+'a',exercise_key:'developpe-couche-barre',set_number:n,weight:w,reps:8,completed:true,rpe});
  const k=sub&&i%2?'presse-a-cuisses':'hack-squat';
  for(const n of [1,2])logs.push({workout_id:id,workout_exercise_id:id+'b',exercise_key:k,substituted_from_key:k==='hack-squat'?null:'hack-squat',set_number:n,weight:100,reps:10,completed:true,rpe});
 }
 workouts.push({id:'other',cycle_id:'c0',status:'completed',ended_at:new Date(start-DAY).toISOString()});
 return {workouts,logs};
}

// Échéance : séances prévues atteintes, ou durée du cycle + 2 semaines dépassée.
assert.equal(R.due(cycle,make(17).workouts,start+40*DAY),false);
assert.equal(R.due(cycle,make(18).workouts,start+40*DAY),true);
assert.equal(R.due(cycle,make(5).workouts,start+8*7*DAY+DAY),true);
assert.equal(R.due(null,[],start),false);

// Cycle régulier et en progrès : on garde la méthode.
let d=make(18);let r=R.review(cycle,d.workouts,d.logs,[],start+40*DAY);
assert.equal(r.done,18);assert.equal(r.planned,18);assert.equal(r.recommendation.code,'keep');
assert(r.strengths.some(s=>/18 séances sur 18/.test(s)));
assert(r.strengths.some(s=>/Développé couché barre : \+12,5 kg/.test(s)),r.strengths.join('|'));
assert.equal(r.evolutions.find(e=>e.key==='developpe-couche-barre').weight,12.5);
// Charges identiques mais ressenti très élevé : point à améliorer.
d=make(18,{progress:false,rpe:10});r=R.review(cycle,d.workouts,d.logs,[],start+40*DAY);
assert(r.improve.some(s=>/ressenti moyen 10\/10/i.test(s)));assert.equal(r.rpe,10);
// Stagnation générale avec une bonne régularité : changer de méthode, jamais la même.
assert.equal(r.recommendation.code,'change');assert.notEqual(r.recommendation.changes.method,'fullbody');
assert(R.methodsFor(3).includes(r.recommendation.changes.method));
// Peu de séances : on allège le rythme.
d=make(6);r=R.review(cycle,d.workouts,d.logs,[],start+9*7*DAY);
assert.equal(r.recommendation.code,'adjust');assert.equal(r.recommendation.changes.daysCount,'2');
assert(r.improve.some(s=>/6 séances sur 18/.test(s)));
// Exercice souvent remplacé : signalé, et son remplaçant garde ses propres chiffres.
d=make(18,{sub:true});r=R.review(cycle,d.workouts,d.logs,[],start+40*DAY);
assert(r.improve.some(s=>/Hack squat.*remplacé 9 fois/.test(s)),r.improve.join('|'));
assert(r.evolutions.some(e=>e.key==='presse-a-cuisses'));
// Aucune séance : pas de conclusion inventée.
r=R.review(cycle,[],[],[],start+9*7*DAY);assert.equal(r.done,0);assert.equal(r.evolutions.length,0);assert.equal(r.recommendation.code,'adjust');

// Réponses du cycle suivant : l'ancienne photographie + les changements, jamais le cycle en cours modifié.
const next=R.nextAnswers(cycle,{daysCount:'2',duration:'45'});
assert.equal(next.daysCount,'2');assert.equal(next.duration,'45');assert.equal(next.goal,'muscle');assert.equal(cycle.answers_snapshot.daysCount,'3');
const built=globalThis.NolsEngine.buildCycle(next);assert.equal(built.sessionsPerWeek,2);
console.log('v2-review : ok');
