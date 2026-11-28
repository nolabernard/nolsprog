/* STEROID V2 — cycle actif côté app.
 * Construit le cycle (générateur ou ancien plan pour le mode invité), le lit depuis Supabase,
 * et calcule les dernières performances et le progrès, toujours par clé d'exercice. Charge non saisie = null. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidCycle=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const Cat=()=>globalThis.SteroidCatalogue;
const defaultUuid=()=>globalThis.crypto.randomUUID();
const clamp=(v,lo,hi,d)=>{v=Math.round(Number(v));return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):d};
// Bornes identiques aux contraintes de la base (reps 1–100) : une valeur V1 farfelue ne bloque jamais l'envoi.
function parseReps(text){const nums=String(text??'').match(/\d+/g)||[];let a=clamp(nums[0]||8,1,100,8),b=clamp(nums[1]||nums[0]||12,1,100,12);return [Math.min(a,b),Math.max(a,b)]}
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
  const label=String(name||'').trim().slice(0,100)||'Exercice';
  if(!custom.has(label.toLowerCase()))custom.set(label.toLowerCase(),{key:'u-'+uuid(),name:label,pattern:null,muscle:null,equipment:null});
  return {key:custom.get(label.toLowerCase()).key,role:'finition'};
 };
 const sessions=[];
 (planWeek||[]).forEach((d,day)=>{
  if(!d?.ex?.length)return;days.push(day);
  const sid=uuid(),pos=sessions.length;
  sessions.push({id:sid,cycle_id:id,position:pos,code:String.fromCharCode(65+pos),title:d.title||'Séance '+(pos+1),focus:[],
   exercises:d.ex.map((e,i)=>{const k=keyFor(e.name),[a,b]=parseReps(e.reps);return {id:uuid(),cycle_session_id:sid,position:i,exercise_key:k.key,role:k.role,sets:clamp(e.sets,1,20,3),reps_min:a,reps_max:b,rest_seconds:clamp(e.rest,0,3600,90)}})});
 });
 const user_exercises=[...custom.values()];
 for(const s of sessions){finishSession(s,user_exercises);s.focus=[...new Set(s.muscles.map(m=>m.muscle))]}
 return {id,status:'active',method:'auto',weeks:6,sessions_per_week:Math.max(1,sessions.length),preferred_days:days,answers_snapshot:{},engine_version:'v1-legacy',started_at:startedAt,user_exercises,sessions};
}

function toRows(cycle,userId){
 const {sessions,user_exercises,cardio,...c}=cycle;
 return {
  cycles:[{...c,user_id:userId}],
  cycle_sessions:sessions.map(({exercises,muscles,...s})=>({...s,user_id:userId})),
  cycle_exercises:sessions.flatMap(s=>s.exercises.map(e=>({...e,user_id:userId}))),
  user_exercises:(user_exercises||[]).map(u=>({...u,user_id:userId})),
  cycle_cardio:(cardio||[]).map(x=>({...x,user_id:userId}))
 };
}

const stamp=r=>Date.parse(r.created_at||r.updated_at||0)||0;
// Dernière performance par exercice : datée par la séance (les séries copiées de la V1 ont toutes la date de la copie),
// puis par position et numéro de série. Sans séance connue : date de la série.
function lastPerformance(setLogs,workouts){
 const out={},at={},when=new Map((workouts||[]).map(w=>[w.id,Date.parse(w.started_at||w.ended_at)]));
 for(const r of setLogs||[]){if(!r.completed)continue;const base=when.get(r.workout_id);const t=base!=null&&Number.isFinite(base)?base+(Number(r.position)||0)*1e4+(Number(r.set_number)||0):stamp(r);if(at[r.exercise_key]!=null&&at[r.exercise_key]>t)continue;at[r.exercise_key]=t;out[r.exercise_key]={weight:r.weight==null?null:Number(r.weight),reps:r.reps==null?null:Number(r.reps)}}
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

// Semaine allégée : la dernière semaine de séances du cycle (en séances réellement faites, pas au calendrier).
// Environ 40 % de séries en moins, mêmes charges : la fatigue retombe avant le bilan et le cycle suivant.
function deload(cycle,workouts){
 if(!cycle||(cycle.weeks||6)<4)return false;const spw=cycle.sessions_per_week||1,total=(cycle.weeks||6)*spw;
 const done=(workouts||[]).filter(w=>w.cycle_id===cycle.id&&w.status==='completed').length;
 return done>=total-spw&&done<total;
}
const deloadSets=n=>Math.max(1,Math.round((Number(n)||1)*0.6));
// Échauffement du premier exercice de base : 2 séries de montée à partir de la charge de travail (arrondi au palier).
function warmup(weight){
 const w=Number(weight);if(!Number.isFinite(w)||w<20)return null;
 const step=w>=60?2.5:1,r=x=>Math.max(step,Math.round(x/step)*step);
 return [{weight:r(w*0.5),reps:8},{weight:r(w*0.75),reps:4}];
}
function cycleProgress(cycle,workouts){
 if(!cycle)return 0;const total=(cycle.weeks||6)*(cycle.sessions_per_week||1);
 const done=(workouts||[]).filter(w=>w.cycle_id===cycle.id&&w.status==='completed').length;
 return Math.min(1,done/total);
}

// Jour d'une séance = son début (une séance finie après minuit, ou oubliée la nuit, reste celle de la veille).
const dayAtOf=w=>Date.parse(w.started_at||w.ended_at);
// Règle unique de comptage : une séance terminée ne compte que si elle contient au moins une série validée
// ou du cardio noté. Terminée vide (ex. ouverte puis fermée), elle passe au statut « empty » : ni comptée,
// ni dans la suite, ni dans l'historique. Les séances importées de la V1 comptent toujours. Si l'historique
// des séries est tronqué, les séances plus anciennes que la plus ancienne série chargée comptent (on ne sait pas).
function countable(workouts,setLogs,cardioLogs,{truncated=false}={}){
 const withSets=new Set();let oldest=Infinity;
 for(const r of setLogs||[]){if(r.completed&&r.workout_id)withSets.add(r.workout_id);const t=Date.parse(r.created_at);if(t<oldest)oldest=t}
 for(const c of cardioLogs||[])if(c.workout_id)withSets.add(c.workout_id);
 return (workouts||[]).map(w=>{
  if(w.status!=='completed'||withSets.has(w.id)||w.legacy_week!=null)return w;
  if(truncated&&Date.parse(w.ended_at||w.started_at)<oldest)return w;
  return {...w,status:'empty'};
 });
}
// Semaine en cours pour l'accueil (lundi → dimanche, séances déjà passées par countable) :
// état de chaque jour, séances faites / objectif, séries validées, volume (charge × répétitions, charges manquantes
// ignorées : jamais comptées 0 kg) comparé à la semaine précédente, et semaines d'affilée à l'objectif.
function weekView(cycle,workouts,setLogs,now=Date.now()){
 if(!cycle)return null;
 const start=weekStart(now),d0=new Date(start),dayAt=k=>new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+k).getTime();
 const end=dayAt(7),prevStart=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()-7).getTime();
 const goal=Math.max(1,Number(cycle.sessions_per_week)||(cycle.sessions||[]).length||1);
 const planned=Array.isArray(cycle.preferred_days)?cycle.preferred_days:[];
 const mine=(workouts||[]).filter(w=>w.cycle_id===cycle.id&&w.ended_at);
 const t=dayIndex(now);
 const days=Array.from({length:7},(_,k)=>{
  const a=dayAt(k),b=dayAt(k+1),here=mine.filter(w=>{const e=dayAtOf(w);return e>=a&&e<b});
  const state=here.some(w=>w.status==='completed')?'done':here.some(w=>w.status==='skipped')?'skipped':'';
  return {state,today:k===t,planned:planned.includes(k)};
 });
 const done=mine.filter(w=>w.status==='completed'&&dayAtOf(w)>=start&&dayAtOf(w)<end).length;
 const skipped=mine.filter(w=>w.status==='skipped'&&dayAtOf(w)>=start&&dayAtOf(w)<end).length;
 // Date de la séance (pas celle de la série : les séries copiées de la V1 portent la date de la copie).
 const counted=new Map((workouts||[]).filter(w=>w.status==='completed'&&w.ended_at).map(w=>[w.id,dayAtOf(w)]));
 let sets=0,volume=0,prevVolume=0;
 for(const r of setLogs||[]){
  if(!r.completed||!counted.has(r.workout_id))continue;const at=counted.get(r.workout_id);
  const v=r.weight!=null&&r.reps!=null?Number(r.weight)*Number(r.reps):0;
  if(at>=start&&at<end){sets++;volume+=v}else if(at>=prevStart&&at<start)prevVolume+=v;
 }
 // Semaines pleines d'affilée à l'objectif, en remontant depuis la semaine dernière (+ la semaine en cours si atteinte).
 let streak=done>=goal?1:0;const cycleStart=Date.parse(cycle.started_at)||0;
 for(let k=1;k<60;k++){
  const a=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()-7*k).getTime(),b=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()-7*(k-1)).getTime();
  if(b<=cycleStart)break;
  const n=mine.filter(w=>w.status==='completed'&&dayAtOf(w)>=a&&dayAtOf(w)<b).length;
  if(n>=goal)streak++;else break;
 }
 return {days,done,goal,skipped,sets,volume:Math.round(volume),prevVolume:Math.round(prevVolume),streak};
}
// Où on en est dans le programme : semaine en cours (depuis le début du cycle) et séances faites sur le total prévu.
function cycleStatus(cycle,workouts,now=Date.now()){
 if(!cycle)return null;
 const weeks=Math.max(1,Number(cycle.weeks)||6),perWeek=Math.max(1,Number(cycle.sessions_per_week)||(cycle.sessions||[]).length||1),total=weeks*perWeek;
 const done=(workouts||[]).filter(w=>w.cycle_id===cycle.id&&w.status==='completed').length;
 const start=Date.parse(cycle.started_at);
 // Semaines calendaires (lundi → dimanche), arrondi pour les changements d'heure.
 const week=Number.isFinite(start)?Math.min(weeks,Math.max(1,Math.round((weekStart(now)-weekStart(start))/(7*24*3600e3))+1)):1;
 return {week,weeks,done:Math.min(done,total),total,pct:Math.round(Math.min(1,done/total)*100)};
}
// Supabase renvoie au plus 1000 lignes par réponse : lecture par pages.
async function selectAll(api,path,maxPages=10){
 const out=[];
 for(let page=0;page<maxPages;page++){const rows=await api.select(path+'&limit=1000&offset='+page*1000)||[];out.push(...rows);if(rows.length<1000)break}
 return out;
}
// ----- Rythme (jours conseillés, jamais bloquants) et cardio. 0 = lundi … 6 = dimanche. -----
const DAY=24*3600e3;
const dayIndex=ms=>(new Date(ms).getDay()+6)%7;
function weekStart(ms){const d=new Date(ms);return new Date(d.getFullYear(),d.getMonth(),d.getDate()-dayIndex(ms)).getTime()}
function localDate(ms){const d=new Date(ms),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const parseDay=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d).getTime()};
// Prochain jour d'entraînement après aujourd'hui, d'après les jours prévus du cycle (0 = lundi).
// offset 1 = demain. null en mode libre (pas de jours prévus).
function nextTrainingDay(cycle,now){
 const days=Array.isArray(cycle?.preferred_days)&&cycle.preferred_days.length?[...cycle.preferred_days].sort((a,b)=>a-b):null;
 if(!days)return null;
 const t=dayIndex(now);
 for(let k=1;k<=7;k++){const d=(t+k)%7;if(days.includes(d))return {offset:k,day:d}}
 return null;
}
function rhythm(cycle,workouts,now){
 const days=Array.isArray(cycle?.preferred_days)&&cycle.preferred_days.length?[...cycle.preferred_days].sort((a,b)=>a-b):[];
 const start=weekStart(now),today=new Date(now).setHours(0,0,0,0);
 const mine=(workouts||[]).filter(w=>w.cycle_id===cycle?.id&&w.status==='completed');
 const doneThisWeek=mine.filter(w=>dayAtOf(w)>=start).length;
 const doneToday=(workouts||[]).some(w=>w.cycle_id===cycle?.id&&w.status==='completed'&&dayAtOf(w)>=today);
 const goal=cycle?.sessions_per_week||days.length||1;
 if(!days.length)return {mode:'free',days:[],todayPlanned:false,nextDay:null,doneThisWeek,goal};
 const t=dayIndex(now),todayPlanned=days.includes(t)&&!doneToday;
 const after=days.find(d=>d>t);
 return {mode:'days',days,todayPlanned,nextDay:todayPlanned?t:(after??days[0]),doneThisWeek,goal};
}
// Fin de semaine calculée en jours calendaires : une semaine de changement d'heure dure 167 ou 169 h.
function cardioWeek(logs,now){const s=weekStart(now),d=new Date(s),e=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7).getTime();return (logs||[]).filter(l=>{const t=parseDay(l.done_on);return t>=s&&t<e}).reduce((n,l)=>n+(Number(l.minutes)||0),0)}
function cardioProgress(logs,now,weeks=6){
 const cur=weekStart(now),out=[];
 for(let i=weeks-1;i>=0;i--){const s=new Date(cur);s.setDate(s.getDate()-7*i);out.push({week:localDate(s.getTime()),minutes:cardioWeek(logs,s.getTime())})}
 return out;
}

async function loadCycle(api,userId){
 const uid=encodeURIComponent(userId);
 const [cy]=await api.select('cycles?user_id=eq.'+uid+'&status=eq.active&select=*&limit=1');
 const [workouts,logs,userExercises,cardioLogs]=await Promise.all([
  api.select('workouts?user_id=eq.'+uid+'&status=in.(completed,skipped)&select=id,cycle_id,cycle_session_id,status,skip_reason,started_at,ended_at,duration_seconds,revision,legacy_week,cycle_sessions(title)&order=ended_at.desc&limit=500'),
  selectAll(api,'workout_set_logs?user_id=eq.'+uid+'&select=exercise_key,workout_exercise_id,set_number,weight,reps,rir,completed,created_at,workout_exercises(workout_id,position,substituted_from_key,rpe)&order=created_at.desc,id',10),
  api.select('user_exercises?user_id=eq.'+uid+'&select=key,name,pattern,muscle,equipment'),
  api.select('cardio_logs?user_id=eq.'+uid+'&select=id,workout_id,cycle_id,done_on,type,minutes&order=done_on.desc&limit=1000')]);
 // Champs de l'exercice de séance aplatis sur chaque série : l'historique se lit sans jointure.
 const setLogs=(logs||[]).map(({workout_exercises:we,...r})=>({...r,workout_id:r.workout_id??we?.workout_id,position:we?.position??null,substituted_from_key:we?.substituted_from_key??null,rpe:we?.rpe??null}));
// Limites de lecture atteintes : l'historique le plus ancien manque (records non annoncés).
 const truncated=(logs||[]).length>=10000||(workouts||[]).length>=500;
 const done=(workouts||[]).map(({cycle_sessions:cs,...w})=>cs?.title?{...w,title:cs.title}:w);
 if(!cy)return {truncated,cycle:null,workouts:done,setLogs,userExercises:userExercises||[],cardioLogs:cardioLogs||[]};
 const cid=encodeURIComponent(cy.id);
 const sessions=await api.select('cycle_sessions?cycle_id=eq.'+cid+'&select=*&order=position');
 const [exercises,cardio]=await Promise.all([
  sessions?.length?api.select('cycle_exercises?cycle_session_id=in.('+sessions.map(x=>encodeURIComponent(x.id)).join(',')+')&select=*&order=position'):[],
  api.select('cycle_cardio?cycle_id=eq.'+cid+'&select=id,cycle_id,type,minutes,per_week')]);
 const list=(sessions||[]).map(s=>({...s,exercises:(exercises||[]).filter(e=>e.cycle_session_id===s.id)})).sort((a,b)=>a.position-b.position);
 for(const s of list)finishSession(s,userExercises||[]);
 return {cycle:{...cy,user_exercises:userExercises||[],sessions:list,cardio:cardio||[]},truncated,workouts:done,setLogs,userExercises:userExercises||[],cardioLogs:cardioLogs||[]};
}

return {deload,deloadSets,warmup,rhythm,nextTrainingDay,weekStart,localDate,cardioWeek,cardioProgress,fromEngine,fromLegacyPlan,toRows,lastPerformance,progress,cycleProgress,cycleStatus,countable,weekView,loadCycle,nameOf,parseReps};
});
