const assert=require('node:assert/strict');
const R=require('../sport-rules.js');
const base={method:'auto',daysCount:'3',days:[0,1,2,3,4,5],level:'intermediate',goal:'muscle',equipment:'gym',duration:'60',currentSessions:'2',priority:[],avoid:'',limitations:'no'};
let tested=0;
for(const method of R.METHODS)for(let n=2;n<=6;n++){
 const result=R.assess({...base,method,daysCount:String(n),days:[0,1,2,3,4,5,6]});
 assert.equal(result.valid,true,method+' '+n);
 assert.equal(result.method,method,'La méthode choisie ne doit pas être remplacée');
 assert.equal(result.compatibility,R.MATRIX[method][n-2]);
 assert.equal(result.requiresConfirmation,result.warnings.some(w=>w.requiresConfirmation));
 assert.equal(R.confirm(result,result.warnings.map(w=>w.code)).approved,true);
 if(result.compatibility==='discouraged'){
  assert.equal(result.warnings.some(w=>w.code==='METHOD_DISCOURAGED'),true);
  assert.equal(R.confirm(result).approved,false);
 }
 tested++;
}
for(let n=2;n<=6;n++){
 const r=R.assess({...base,daysCount:String(n),days:[0,1,2,3,4,5,6]});
 assert.equal(r.valid,true);
 assert.equal(r.method,{2:'fullbody',3:'fullbody',4:'upperlower',5:'hybrid',6:'ppl'}[n]);
}
for(const level of ['beginner','intermediate','advanced']){
 const r=R.assess({...base,level});
 assert.deepEqual(r.volumeRange,R.VOLUME[level]);
}
const beginner=R.assess({...base,level:'beginner',daysCount:'6',days:[0,1,2,3,4,5,6],currentSessions:'5'});
assert(beginner.warnings.some(w=>w.code==='BEGINNER_HIGH_FREQUENCY'));
assert.equal(R.confirm(beginner).approved,false);
assert.equal(R.confirm(beginner,['BEGINNER_HIGH_FREQUENCY']).approved,true);
const multiple=R.assess({...base,method:'split',daysCount:'6',days:[0,1,2,3,4,5,6],level:'beginner',currentSessions:'0',limitations:'yes'});
assert.equal(multiple.valid,true);
assert(multiple.warnings.length>=3);
assert.equal(R.confirm(multiple,['METHOD_DISCOURAGED']).approved,false);
assert.equal(R.confirm(multiple,multiple.warnings.map(x=>x.code)).approved,true);
const invalid=[
 {...base,daysCount:'7'}, {...base,daysCount:'2.5'}, {...base,daysCount:''},
 {...base,daysCount:'4',days:[0,1,2]}, {...base,days:[0,0,1]},
 {...base,days:[0,1,7]}, {...base,days:['foo',1,2]},
 {...base,method:'unknown'}, {...base,level:'expert'},
 {...base,goal:'unknown'}, {...base,equipment:'barbell'},
 {...base,duration:'20'}, {...base,currentSessions:'-1'},
 {...base,priority:['Inconnu']}, {...base,limitations:'unknown'},
 {...base,avoid:[]}, null
];
for(const profile of invalid){
 const r=R.assess(profile);
 assert.equal(r.valid,false,JSON.stringify(profile));
 assert.equal(R.confirm(r).approved,false);
}
const untouched=structuredClone(base);
R.assess(base);
assert.deepEqual(base,untouched,'La validation ne doit pas modifier les réponses');
assert.equal(R.assess({...base,method:'split',daysCount:'2'}).method,'split');
assert.equal(R.assess({...base,method:'split',daysCount:'2'}).compatibility,'discouraged');
console.log('Sport rules phase 1 OK: '+tested+' combinaisons, auto, volumes, confirmations, validations et immutabilité.');
