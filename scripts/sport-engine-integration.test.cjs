const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={crypto:require('node:crypto').webcrypto,Math,Number,String,Array,Map,Set,Object,globalThis:null};
context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync('sport-rules.js','utf8'),context);
vm.runInContext(fs.readFileSync('program-engine.js','utf8'),context);
const defaults=context.NolsEngine.defaults;
const cases=[
 ['split',2,['Pectoraux + dos','Jambes + épaules']],
 ['split',3,['Pectoraux + dos','Jambes','Épaules + bras']],
 ['ppl',2,['Push','Pull']],
 ['ppl',4,['Push','Pull','Legs','Push']],
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
 assert.equal(JSON.stringify(sessions.map(s=>s.title.replace(/ [A-F]$/,''))),JSON.stringify(titles));
 assert(sessions.every(s=>s.ex.length>0));
}
const profile={...defaults,method:'split',daysCount:'2',days:[0,1,2,3,4,5,6],equipment:'none'};
assert.equal(context.NolsEngine.chooseMethod(profile),'split');
assert.equal(context.NolsEngine.buildProgram(profile).filter(s=>s.ex.length).length,2);
console.log('Phase 2 engine integration OK: méthodes conservées et adaptations vérifiées.');

function titles(method,n,week){
 const p={...defaults,method,daysCount:String(n),days:[0,1,2,3,4,5,6]};
 return context.NolsEngine.buildProgram(p,week).filter(s=>s.ex.length).map(s=>s.title.replace(/ [A-F]$/,''));
}
assert.equal(JSON.stringify(titles('ppl',2,0)),JSON.stringify(['Push','Pull']));
assert.equal(JSON.stringify(titles('ppl',2,1)),JSON.stringify(['Legs','Push']));
assert.equal(JSON.stringify(titles('ppl',2,2)),JSON.stringify(['Pull','Legs']));
assert.equal(JSON.stringify(titles('ppl',4,0)),JSON.stringify(['Push','Pull','Legs','Push']));
assert.equal(JSON.stringify(titles('ppl',4,1)),JSON.stringify(['Pull','Legs','Push','Pull']));
assert.equal(JSON.stringify(titles('upperlower',3,0)),JSON.stringify(['Upper','Lower','Upper']));
assert.equal(JSON.stringify(titles('upperlower',3,1)),JSON.stringify(['Lower','Upper','Lower']));
assert.equal(JSON.stringify(titles('split',2,1)),JSON.stringify(['Pectoraux + dos','Jambes + épaules']));
assert.throws(()=>context.NolsEngine.buildProgram({...defaults},-1),/Semaine/);
assert.throws(()=>context.NolsEngine.buildProgram({...defaults},1.5),/Semaine/);
console.log('Phase 3 rotation OK : PPL 2/4 et Upper-Lower 3, sans réinitialisation hebdomadaire.');
