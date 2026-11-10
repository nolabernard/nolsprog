const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

globalThis.crypto ||= webcrypto;
require('../sport-rules.js');
require('../program-engine.js');
const progression = require('../sport-progression.js');

test('programmes de 2 à 6 séances : toutes les méthodes et tous les équipements', () => {
 const methods = ['auto','fullbody','upperlower','ppl','split','hybrid'];
 for(let count=2;count<=6;count++)for(const method of methods)for(const equipment of ['gym','dumbbells','none']){
  const profile = {...globalThis.NolsEngine.defaults,daysCount:String(count),days:[0,1,2,3,4,5].slice(0,count),method,equipment};
  const result = globalThis.NolsEngine.buildProgram(profile,0);
  assert.equal(result.filter(day=>day.ex.length>0).length,count,method+' '+equipment+' '+count);
  for(const day of result)for(const exercise of day.ex){
   assert.ok(exercise.name);
   assert.ok(exercise.sets>0);
   assert.ok(exercise.rest>=0);
  }
 }
});

test('double progression : une charge absente nest pas traitée comme 0 kg', () => {
 const exercise={sets:1,reps:'8–12'};
 const evaluate=(reps,weight)=>progression.evaluate(exercise,[{set_number:1,completed:true,reps,weight}]);
 assert.equal(evaluate(12,null).status,'insufficient');
 assert.equal(evaluate(12,undefined).status,'insufficient');
 assert.equal(evaluate(12,'').status,'insufficient');
 assert.equal(evaluate(12,0).status,'verify');
 assert.equal(evaluate(8,40).status,'reps');
 assert.equal(evaluate(12,-3).status,'insufficient');
});
