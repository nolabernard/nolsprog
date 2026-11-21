/* STÉROÏDE V2 — cycle actif côté app.
 * Construit le cycle (générateur ou ancien plan pour le mode invité), le lit depuis Supabase,
 * et calcule les dernières performances et le progrès, toujours par clé d'exercice. Charge non saisie = null. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidCycle=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const Cat=()=>globalThis.SteroidCatalogue;
const defaultUuid=()=>globalThis.crypto.randomUUID();
function parseReps(text){const nums=String(text??'').match(/\d+/g)||[];const a=Number(nums[0]||8),b=Number(nums[1]||nums[0]||12);return [Math.min(a,b),Math.max(a,b)]}
function muscleOf(key,userExercises=[]){return Cat()?.byKey(key)?.muscle||userExercises.find(u=>u.key===key)?.muscle||null}
function nameOf(key,userExercises=[]){return Cat()?.byKey(key)?.name||userExercises.find(u=>u.key===key)?.name||'Exercice'}
function musclesOf(exercises,userExercises){
 const seen=new Map();
 for(const e of exercises){const m=muscleOf(e.exercise_key,userExercises);if(m&&!seen.has(m+'|'+e.role))seen.set(m+'|'+e.role,{muscle:m,role:e.role})}
 return [...seen.values()];
}
function finishSession(s,userExercises){s.exercises.sort((a,b)=>a.position-b.position);s.muscles=musclesOf(s.exercises,userExercises);return s}

function fromEngine(built,{uuid=defaultUuid,startedAt=new Date().toISOString()}={}){
 const id=uuid();
 return {id,status:'active',method:built.method,weeks:built.weeks||6,sessions_per_week:built.sessionsPerWeek,preferred_days:built.preferredDays||null,
  answers_snapshot:built.answers||{},engine_version:built.engineVersion,started_at:startedAt,user_exercises:[],
  sessions:built.sessions.map(s=>{const sid=uuid();return finishSession({id:sid,cycle_id:id,position:s.position,code:s.code,title:s.title,focus:s.focus||[],
   exercises:s.exercises.map((e,i)=>({id:uuid(),cycle_session_id:sid,position:i,exercise_key:e.key,role:e.role,sets:e.sets,reps_min:e.repsMin,reps_max:e.repsMax,rest_seconds:e.rest}))},[])})};
}

// Mode invité : l'ancien plan (7 jours) devient une suite de séances, jours non vides dans l'ordre.
function fromLegacyPlan(planWeek,{uuid=defaultUuid,startedAt=new Date().toISOString()}={}){
 const id=uuid(),custom=new Map(),days=[];
 const keyFor=name=>{
  const hit=Cat()?.resolveName(name);if(hit)return {key:hit.key,role:Cat().byKey(hit.key).role};
  const label=String(name||'').trim()||'Exercice';
  if(!custom.has(label.toLowerCase()))custom.set(label.toLowerCase(),{key:'u-'+uuid(),name:label,pattern:null,muscle:null,equipment:null});
  return {key:custom.get(label.toLowerCase()).key,role:'finition'};
 };
 const sessions=[];
 (planWeek||[]).forEach((d,day)=>{
  if(!d?.ex?.length)return;days.push(day);
  const sid=uuid(),pos=sessions.length;
  sessions.push({id:sid,cycle_id:id,position:pos,code:String.fromCharCode(65+pos),title:d.title||'Séance '+(pos+1),focus:[],
   exercises:d.ex.map((e,i)=>{const k=keyFor(e.name),[a,b]=parseReps(e.reps);return {id:uuid(),cycle_session_id:sid,position:i,exercise_key:k.key,role:k.role,sets:Number(e.sets)||3,reps_min:a,reps_max:b,rest_seconds:Number(e.rest)||90}})});
 });
 const user_exercises=[...custom.values()];
 for(const s of sessions){finishSession(s,user_exercises);s.focus=[...new Set(s.muscles.map(m=>m.muscle))]}
 return {id,status:'active',method:'auto',weeks:6,sessions_per_week:Math.max(1,sessions.length),preferred_days:days,answers_snapshot:{},engine_version:'v1-legacy',started_at:startedAt,user_exercises,sessions};
}

function toRows(cycle,userId){
 const {sessions,user_exercises,...c}=cycle;
 return {
  cycles:[{...c,user_id:userId}],
  cycle_sessions:sessions.map(({exercises,muscles,...s})=>({...s,user_id:userId})),
  cycle_exercises:sessions.flatMap(s=>s.exercises.map(e=>({...e,user_id:userId}))),
  user_exercises:(user_exercises||[]).map(u=>({...u,user_id:userId}))
 };
}

const stamp=r=>Date.parse(r.created_at||r.updated_at||0)||0;
function lastPerformance(setLogs){
 const out={},at={};
 for(const r of setLogs||[]){if(!r.completed)continue;const t=stamp(r);if(at[r.exercise_key]!=null&&at[r.exercise_key]>t)continue;at[r.exercise_key]=t;out[r.exercise_key]={weight:r.weight==null?null:Number(r.weight),reps:r.reps==null?null:Number(r.reps)}}
 return out;
}

function progress(setLogs,workouts){
 const when=new Map((workouts||[]).map(w=>[w.id,w.ended_at||w.started_at]));
 const totals={sets:0,volume:0},groups=new Map();
 for(const r of setLogs||[]){
  if(!r.completed)continue;
  const wid=r.workout_id??r.workout_exercises?.workout_id;if(!when.has(wid))continue;
  totals.sets++;const w=r.weight==null?null:Number(r.weight),reps=r.reps==null?null:Number(r.reps),vol=w!=null&&reps!=null?w*reps:0;totals.volume+=vol;
  const k=r.exercise_key+'|'+wid;let g=groups.get(k);
  if(!g){g={key:r.exercise_key,date:when.get(wid),weight:null,reps:null,volume:0};groups.set(k,g)}
  if(w!=null)g.weight=g.weight==null?w:Math.max(g.weight,w);if(reps!=null)g.reps=g.reps==null?reps:Math.max(g.reps,reps);g.volume+=vol;
 }
 const byKey={};
 for(const {key,...g} of groups.values())(byKey[key]||(byKey[key]=[])).push(g);
 for(const k in byKey)byKey[k].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 return {totals,byKey};
}

function cycleProgress(cycle,workouts){
 if(!cycle)return 0;const total=(cycle.weeks||6)*(cycle.sessions_per_week||1);
 const done=(workouts||[]).filter(w=>w.cycle_id===cycle.id&&w.status==='completed').length;
 return Math.min(1,done/total);
}

async function loadCycle(api,userId){
 const uid=encodeURIComponent(userId);
 const [cy]=await api.select('cycles?user_id=eq.'+uid+'&status=eq.active&select=*&limit=1');
 const [workouts,logs,userExercises]=await Promise.all([
  api.select('workouts?user_id=eq.'+uid+'&status=eq.completed&select=id,cycle_id,cycle_session_id,status,started_at,ended_at,duration_seconds&order=ended_at.desc&limit=500'),
  api.select('workout_set_logs?user_id=eq.'+uid+'&select=exercise_key,weight,reps,completed,created_at,workout_exercises(workout_id)&order=created_at.desc&limit=5000'),
  api.select('user_exercises?user_id=eq.'+uid+'&select=key,name,pattern,muscle,equipment')]);
 const setLogs=(logs||[]).map(r=>({...r,workout_id:r.workout_id??r.workout_exercises?.workout_id}));
 if(!cy)return {cycle:null,workouts:workouts||[],setLogs,userExercises:userExercises||[]};
 const cid=encodeURIComponent(cy.id);
 const [sessions,exercises]=await Promise.all([
  api.select('cycle_sessions?cycle_id=eq.'+cid+'&select=*&order=position'),
  api.select('cycle_exercises?user_id=eq.'+uid+'&select=*&order=position')]);
 const list=(sessions||[]).map(s=>({...s,exercises:(exercises||[]).filter(e=>e.cycle_session_id===s.id)})).sort((a,b)=>a.position-b.position);
 for(const s of list)finishSession(s,userExercises||[]);
 return {cycle:{...cy,user_exercises:userExercises||[],sessions:list},workouts:workouts||[],setLogs,userExercises:userExercises||[]};
}

return {fromEngine,fromLegacyPlan,toRows,lastPerformance,progress,cycleProgress,loadCycle,nameOf,parseReps};
});
