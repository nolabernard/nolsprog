const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={crypto:require('node:crypto').webcrypto,globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
for(const path of ['program-engine.js','sport-quality.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
const engine=ctx.NolsEngine,quality=ctx.SteroidQuality;
const index=quality.catalogueIndex(engine.exerciseCatalogue);
assert(index.size>40,'Le catalogue doit être exploitable');
let audits=0,excess=0;
for(const method of ['fullbody','upperlower','ppl','split','hybrid'])for(let n=2;n<=6;n++)for(const duration of [30,60,90]){
 const profile={...engine.defaults,method,daysCount:String(n),duration:String(duration),days:[0,1,2,3,4,5,6]};
 const plan=engine.buildProgram(profile);
 const result=quality.audit(plan,profile,index);
 assert.equal(result.sessions.length,7);
 assert.equal(result.sessions.filter(x=>!x.rest).length,n);
 assert(result.sessions.every(x=>x.minutes>=0));
 assert(Object.values(result.volume).every(v=>Number.isFinite(v)&&v>=0));
 assert(Object.values(result.exposures).every(v=>Number.isInteger(v)&&v>=0&&v<=n));
 assert.equal(result.warnings.filter(w=>w.code==='UNKNOWN_EXERCISE').length,0);
 assert.equal(result.warnings.filter(w=>w.code==='DURATION_EXCEEDED').length,0,'La durée doit respecter la tolérance de 10 % pour '+method+'/'+n+'/'+duration);
 excess+=result.warnings.filter(w=>w.code==='DURATION_EXCEEDED').length;
 audits++;
}
const profile={...engine.defaults,method:'fullbody',daysCount:'2',duration:'30',days:[0,3]};
const plan=engine.buildProgram(profile);
plan[0].ex.push({...plan[0].ex[0]});
assert(quality.audit(plan,profile,index).warnings.some(w=>w.code==='DUPLICATE_EXERCISE'));
assert.throws(()=>quality.audit([],profile,index),/invalide/);
console.log('Phase 4 audit OK: '+audits+' profils testés; '+excess+' dépassements de durée détectés (à corriger avant activation stricte).');
