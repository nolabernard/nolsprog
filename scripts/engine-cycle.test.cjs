// buildCycle : une suite de séances par cycle, identifiée par les clés du catalogue.
const assert=require('assert');
const M=require('./lib/engine-matrix.cjs');
const E=M.loadEngine();
const C=require('../exercise-catalogue.js');
const type=t=>t.replace(/ [A-Z]$/,'');

for(const c of M.combos()){
 const a=M.answers(E,c);
 const cycle=E.buildCycle(a);
 assert.equal(cycle.engineVersion,'v2.0');
 assert.equal(cycle.weeks,6);
 assert.equal(cycle.sessionsPerWeek,Number(c.daysCount));
 assert(cycle.sessions.length>=1);
 cycle.sessions.forEach((s,i)=>{
  assert.equal(s.position,i);assert.equal(s.code,String.fromCharCode(65+i));
  for(const e of s.exercises){
   const entry=C.byKey(e.key);
   assert(entry,`clé inconnue ${e.key}`);
   assert.equal(e.role,entry.role);
   assert(Number.isInteger(e.repsMin)&&Number.isInteger(e.repsMax)&&e.repsMin<=e.repsMax,`reps ${JSON.stringify(e)}`);
  }
 });
 // Jamais deux fois le même type de séance d'affilée, bouclage compris.
 const types=cycle.sessions.map(s=>type(s.title));
 if(types.length>1)types.forEach((t,i)=>{if(['Push','Pull','Legs','Upper','Lower'].includes(t))assert.notEqual(t,types[(i+1)%types.length],`${JSON.stringify(c)} ${types}`)});
}

// Rotation continue : PPL à 4 séances → suite de 3 ; Upper/Lower à 3 séances → suite de 2.
const ppl4=E.buildCycle(M.answers(E,{method:'ppl',daysCount:'4',level:'intermediate',equipment:'gym',goal:'muscle',duration:'60'}));
assert.deepEqual(ppl4.sessions.map(s=>type(s.title)),['Push','Pull','Legs']);
const ul3=E.buildCycle(M.answers(E,{method:'upperlower',daysCount:'3',level:'intermediate',equipment:'gym',goal:'muscle',duration:'60'}));
assert.deepEqual(ul3.sessions.map(s=>type(s.title)),['Upper','Lower']);

// Mode « N séances par semaine » sans jours choisis.
const free=E.buildCycle({...E.defaults,daysCount:'3',days:[]});
assert.equal(free.preferredDays,null);
assert.equal(free.sessionsPerWeek,3);
const fixed=E.buildCycle({...E.defaults,daysCount:'3',days:[1,3,5]});
assert.deepEqual(fixed.preferredDays,[1,3,5]);

// Répétitions : plage et durée.
const reps=E.parseReps;
assert.deepEqual(reps('6–10'),[6,10]);assert.deepEqual(reps('25–45 s'),[25,45]);assert.deepEqual(reps('12'),[12,12]);

// Photographie : copie indépendante, déterministe.
const a={...E.defaults,daysCount:'3',days:[0,2,4],priority:['Dos']};
const c1=E.buildCycle(a);
a.priority.push('Bras');a.goal='strength';
assert.deepEqual(c1.answers.priority,['Dos']);assert.equal(c1.answers.goal,'muscle');
assert.equal(JSON.stringify(E.buildCycle({...E.defaults,daysCount:'3',days:[0,2,4],priority:['Dos']})),JSON.stringify(c1));

console.log('Engine cycle checks passed');
