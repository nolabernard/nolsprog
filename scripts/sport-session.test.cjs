const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// sport-session.js supprimé avec la V1 : restent les contrôles du générateur et de l'identité.
const app=fs.readFileSync('app.js','utf8'),engine=fs.readFileSync('program-engine.js','utf8');
const html=fs.readFileSync('index.html','utf8');assert(!html.includes('sport-session.js'),'Module V1 retiré');

assert(engine.includes('method===\'fullbody\'?Number(p.duration)<=30?5'),'30 min full body at least 5 exercises');
const ctx={crypto:{randomUUID:()=>Math.random().toString(36).slice(2)}};ctx.globalThis=ctx;vm.runInNewContext(engine,ctx);
for(const daysCount of [2,3]){const p={...ctx.NolsEngine.defaults,daysCount:String(daysCount),duration:'30',method:'fullbody',days:[0,1,2,3,4,5,6]};const plan=ctx.NolsEngine.buildProgram(p);const sessions=plan.filter(x=>x.ex.length);assert.equal(sessions.length,daysCount);for(const s of sessions){assert(s.ex.length>=5,'Fullbody must include at least five exercises: '+s.ex.length);assert(ctx.NolsEngine.estimatedMinutes(s.ex)<=33,'30-minute full body exceeds tolerance: '+ctx.NolsEngine.estimatedMinutes(s.ex));const patterns=s.ex.map(e=>ctx.NolsEngine.exerciseCatalogue.find(x=>x.name===e.name)?.pattern);assert(patterns.some(x=>['squat','hinge'].includes(x)),'legs');assert(patterns.some(x=>['pushH','pushV'].includes(x)),'push');assert(patterns.some(x=>['pullH','pullV'].includes(x)),'pull');}} 
assert(app.includes('steroide-wordmark.svg'),'Official wordmark not used in app');assert(!app.includes('crisp-wordmark'),'Old reconstructed wordmark still used');assert(fs.readFileSync('steroide-wordmark.svg','utf8').includes('<path'),'Missing vector logo');console.log('Guided workout, fullbody and branding tests passed.');
