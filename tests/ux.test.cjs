const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
require('../program-engine.js');
const ux=require('../sport-ux.js');
const done=(weight,reps)=>[{completed:true,weight,reps}];
test('records: higher load with comparable reps',()=>{
 assert.equal(ux.achievement(done(85,8),done(80,8)).kind,'weight');
 assert.equal(ux.achievement(done(80,10),done(80,8)).kind,'reps');
 assert.equal(ux.achievement(done(90,6),done(80,10)),null);
 assert.equal(ux.achievement([{completed:true,weight:null,reps:12}],done(80,8)),null);
});
test('alternatives: same movement pattern and avoidance filter',()=>{
 const catalogue=globalThis.NolsEngine.exerciseCatalogue;
 const name='Développé couché barre';
 const base=catalogue.find(x=>x.name===name);
 const alternatives=ux.alternatives(name,catalogue,'incliné');
 assert.ok(alternatives.length>0);
 for(const suggestion of alternatives){
  assert.equal(suggestion.pattern,base.pattern);
  assert.notEqual(suggestion.name,name);
  assert.ok(!suggestion.name.toLowerCase().includes('incliné'));
 }
});
test('exercise guidance: safe fallback for unrecognized movements',()=>{
 const catalogue=globalThis.NolsEngine.exerciseCatalogue;
 assert.equal(ux.info('Développé couché barre',catalogue).muscle,'Pectoraux');
 assert.ok(ux.info('Exercice personnalisé',catalogue).instruction.length>10);
});
