const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../sport-session.js');
const plan={ex:[{id:'a',sets:2},{id:'b',sets:2}]};
assert.deepEqual(S.progress(plan,[{week_number:1,day_index:0,exercise_id:'a',completed:true}],1,0),{total:4,done:1,percent:25,exercises:1});
assert.equal(S.calories(75,52*60,12,12),Math.round((3.8*75*52/60)/5)*5);
assert.equal(S.calories(0,3600,10,10),null);
assert.match(S.motivation({done:2,total:5}),/avancé/);
const app=fs.readFileSync('app.js','utf8'),engine=fs.readFileSync('program-engine.js','utf8');
for(const name of ['guidedWorkoutUI','finishWorkout','workoutSummaryUI','workout-request-finish','workout-jump'])assert(app.includes(name),name);
assert(engine.includes('method===\'fullbody\'?Number(p.duration)<=30?5'),'30 min full body at least 5 exercises');
const ctx={crypto:{randomUUID:()=>Math.random().toString(36).slice(2)}};ctx.globalThis=ctx;vm.runInNewContext(engine,ctx);
for(const daysCount of [2,3]){const p={...ctx.NolsEngine.defaults,daysCount:String(daysCount),duration:'30',method:'fullbody',days:[0,1,2,3,4,5,6]};const plan=ctx.NolsEngine.buildProgram(p);const sessions=plan.filter(x=>x.ex.length);assert.equal(sessions.length,daysCount);for(const s of sessions){assert(s.ex.length>=5,'Fullbody must include at least five exercises: '+s.ex.length);const patterns=s.ex.map(e=>ctx.NolsEngine.exerciseCatalogue.find(x=>x.name===e.name)?.pattern);assert(patterns.some(x=>['squat','hinge'].includes(x)),'legs');assert(patterns.some(x=>['pushH','pushV'].includes(x)),'push');assert(patterns.some(x=>['pullH','pullV'].includes(x)),'pull');}} 
console.log('Guided workout and fullbody tests passed.');
