const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={crypto:require('node:crypto').webcrypto,Math,Number,String,Array,Map,Set,Object,globalThis:null};
context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync('sport-rules.js','utf8'),context);
vm.runInContext(fs.readFileSync('program-engine.js','utf8'),context);
const defaults=context.NolsEngine.defaults;
const cases=[
 ['split',2,['Pectoraux + dos','Jambes + épaules']],
 ['split',3,['Pectoraux + dos','Jambes','Épaules + bras']],
 ['ppl',2,['Push + jambes','Pull + jambes']],
 ['ppl',4,['Push','Pull','Legs','Rappel global']],
 ['hybrid',2,['Full body dominante haut','Full body dominante bas']],
 ['upperlower',3,['Upper','Lower','Upper']]
];
for(const [method,n,titles] of cases){
 const profile={...defaults,method,daysCount:String(n),days:[0,1,2,3,4,5,6]};
 const assessment=context.SteroidRules.assess(profile);
 assert.equal(assessment.valid,true);
 assert.equal(context.NolsEngine.chooseMethod(profile),method);
 const sessions=context.NolsEngine.buildProgram(profile).filter(s=>s.ex.length);
 assert.equal(sessions.length,n);
 assert.deepEqual(sessions.map(s=>s.title.split(' A')[0].split(' B')[0].split(' C')[0]),titles);
 assert(sessions.every(s=>s.ex.length>0));
}
const profile={...defaults,method:'split',daysCount:'2',days:[0,1,2,3,4,5,6],equipment:'none'};
assert.equal(context.NolsEngine.chooseMethod(profile),'split');
assert.equal(context.NolsEngine.buildProgram(profile).filter(s=>s.ex.length).length,2);
console.log('Phase 2 engine integration OK: méthodes conservées et adaptations vérifiées.');
