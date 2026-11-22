/* STEROID V2 — historique et progrès.
 * Tout se calcule par clé d'exercice : un exercice remplacé garde son propre historique, jamais fusionné.
 * Seules les séries validées comptent ; charge non saisie = null (jamais 0 kg) ; aucun record à la première séance. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidHistory=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const dateOf=w=>w.ended_at||w.started_at;
const fr=n=>Number(n.toFixed(2)).toLocaleString('fr-FR');

// Séances terminées, de la plus ancienne à la plus récente.
function done(workouts){return (workouts||[]).filter(w=>w&&w.status==='completed').sort((a,b)=>Date.parse(dateOf(a))-Date.parse(dateOf(b)))}
// Séries validées par séance, puis par clé (dans l'ordre de la séance).
function grouped(setLogs,ids){
 const by=new Map();let seq=0;
 for(const r of setLogs||[]){
  if(!r||!r.completed||!ids.has(r.workout_id))continue;
  let w=by.get(r.workout_id);if(!w)by.set(r.workout_id,w=new Map());
  const gid=r.workout_exercise_id||r.exercise_key;let e=w.get(gid);
  if(!e)w.set(gid,e={key:r.exercise_key,from:r.substituted_from_key||null,position:num(r.position),rpe:null,order:seq++,sets:[]});
  if(r.rpe!=null)e.rpe=num(r.rpe);
  e.sets.push({set_number:num(r.set_number),weight:num(r.weight),reps:num(r.reps),rir:num(r.rir),order:seq++});
 }
 for(const w of by.values())for(const e of w.values())e.sets.sort((a,b)=>(a.set_number??1e9)-(b.set_number??1e9)||a.order-b.order);
 return by;
}
const clean=e=>({key:e.key,from:e.from,rpe:e.rpe,sets:e.sets.map(({order,...s})=>s)});
const listOf=w=>[...(w?.values()||[])].sort((a,b)=>(a.position??1e9)-(b.position??1e9)||a.order-b.order);
const valid=s=>s.weight!=null&&s.weight>=0&&s.reps!=null&&s.reps>0;
// Meilleure série : charge la plus lourde, puis le plus de répétitions ; sans charge notée, le plus de répétitions.
function best(sets){
 const w=sets.filter(valid).sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
 if(w)return {weight:w.weight,reps:w.reps};
 const r=sets.filter(s=>s.reps!=null&&s.reps>0).sort((a,b)=>b.reps-a.reps)[0];
 return r?{weight:null,reps:r.reps}:null;
}
const volume=sets=>sets.reduce((n,s)=>n+(valid(s)?s.weight*s.reps:0),0);

function sessions(workouts,setLogs,{titles={},cardioLogs=[]}={}){
 const list=done(workouts),by=grouped(setLogs,new Set(list.map(w=>w.id)));
 return list.reverse().map(w=>{
  const exercises=listOf(by.get(w.id)).map(clean),sets=exercises.flatMap(e=>e.sets);
  return {id:w.id,date:dateOf(w),title:w.title||titles[w.cycle_session_id]||'Séance',minutes:w.duration_seconds!=null?Math.round(w.duration_seconds/60):null,
   sets:sets.length,volume:volume(sets),exercises,cardio:(cardioLogs||[]).filter(c=>c.workout_id===w.id).map(c=>({type:c.type,minutes:Number(c.minutes)}))};
 });
}

// Événements de record, dans l'ordre chronologique. Plus lourd à répétitions égales ou plus, ou plus de répétitions à charge égale.
function events(setLogs,workouts){
 const list=done(workouts),by=grouped(setLogs,new Set(list.map(w=>w.id))),top=new Map(),out=[];
 for(const w of list){
  for(const e of listOf(by.get(w.id))){
   const now=best(e.sets);if(!now||now.weight==null)continue;
   const old=top.get(e.key);
   if(old){
    if(now.weight>old.weight&&now.reps>=old.reps)out.push({workoutId:w.id,date:dateOf(w),key:e.key,kind:'weight',weight:now.weight,reps:now.reps,delta:Number((now.weight-old.weight).toFixed(2))});
    else if(now.weight===old.weight&&now.reps>old.reps)out.push({workoutId:w.id,date:dateOf(w),key:e.key,kind:'reps',weight:now.weight,reps:now.reps,delta:now.reps-old.reps});
   }
   if(!old||now.weight>old.weight||(now.weight===old.weight&&now.reps>old.reps))top.set(e.key,{...now,date:dateOf(w),workoutId:w.id});
  }
 }
 return {out,top};
}
// Historique incomplet (plus anciennes séances non chargées) : on n'annonce aucun record, il pourrait être faux.
function records(setLogs,workouts){return Object.fromEntries(events(setLogs,workouts).top)}
function newRecords(workoutId,setLogs,workouts,{truncated=false}={}){if(truncated)return [];return events(setLogs,workouts).out.filter(r=>r.workoutId===workoutId).map(({workoutId,date,...r})=>r)}
function latestRecord(setLogs,workouts,{truncated=false}={}){if(truncated)return null;const r=events(setLogs,workouts).out.at(-1);if(!r)return null;const {workoutId,...x}=r;return x}

function exercise(key,setLogs,workouts){
 const list=done(workouts),by=grouped(setLogs,new Set(list.map(w=>w.id))),entries=[];
 for(const w of list){
  // Même clé deux fois dans une séance (remplacée puis reprise) : on garde l'exercice le plus complet.
  const e=listOf(by.get(w.id)).filter(x=>x.key===key).sort((a,b)=>b.sets.length-a.sets.length)[0];if(!e)continue;
  const prev=entries.at(-1),b=best(e.sets);
  entries.push({workoutId:w.id,date:dateOf(w),from:e.from,rpe:e.rpe,sets:clean(e).sets,best:b,volume:volume(e.sets),
   diff:prev?.best&&b&&prev.best.weight!=null&&b.weight!=null?{weight:Number((b.weight-prev.best.weight).toFixed(2)),reps:b.reps-prev.best.reps}:null});
 }
 const r=events(setLogs,workouts).top.get(key)||null;
 return {key,entries:entries.reverse(),record:r};
}

// Paliers de charge : 2,5 kg dès 60 kg, 1,25 kg dès 20 kg, sinon 0,5 kg.
const increment=w=>w>=60?2.5:w>=20?1.25:0.5;
// Double progression : un conseil, jamais une modification. Fondé sur la dernière séance de cette clé.
function advice(plan,setLogs,workouts,key){
 const last=exercise(key,setLogs,workouts).entries[0];if(!last)return null;
 const target=Number(plan?.sets)||last.sets.length,max=Number(plan?.reps_max)||null,sets=last.sets.filter(s=>s.reps!=null&&s.reps>0);
 if(sets.length<target)return {status:'complete',text:'Dernière fois : '+sets.length+' série'+(sets.length>1?'s':'')+' sur '+target+'. Vise toutes les séries avant d’augmenter.'};
 if(max==null)return null;
 const top=sets.every(s=>s.reps>=max);
 const noWeight=sets.filter(s=>s.weight==null).length;
 if(noWeight===sets.length)return {status:'bodyweight',text:top?'Haut de fourchette atteint sur chaque série : ajoute de la difficulté (lest ou variante plus dure).':'Vise '+max+' répétitions sur chaque série.'};
 if(noWeight)return {status:'weight',text:'Note ta charge sur chaque série pour recevoir un conseil précis.'};
 const w=Math.max(...sets.map(s=>s.weight));
 if(top&&w===0)return {status:'bodyweight',text:'Haut de fourchette atteint sur chaque série : ajoute de la charge ou une variante plus dure.'};
 // Ressenti noté par série (répétitions en réserve) : il prime sur les seules répétitions.
 const rated=sets.filter(s=>s.rir!=null),easy=rated.length===sets.length&&sets.every(s=>s.rir>=3),failed=rated.some(s=>s.rir===0);
 if(top&&failed&&w>0)return {status:'hold',text:'Haut de fourchette atteint, mais une série était à l’échec : garde '+fr(w)+' kg jusqu’à ce que ce soit plus facile.'};
 if(!top&&easy&&w>0&&sets.every(s=>s.reps>=(Number(plan?.reps_min)||0))){const next=Number((w+increment(w)).toFixed(2));return {status:'increase',weight:next,text:'Toutes tes séries étaient faciles à '+fr(w)+' kg : tente '+fr(next)+' kg.'}}
 if(!top)return {status:'reps',text:'Garde '+fr(w)+' kg et vise '+max+' répétitions sur chaque série.'};
 if(last.rpe===10)return {status:'hold',text:'Haut de fourchette atteint, mais à l’échec : garde '+fr(w)+' kg jusqu’à ce que ce soit plus facile.'};
 const next=Number((w+increment(w)).toFixed(2));
 return {status:'increase',weight:next,text:max+' répétitions sur chaque série à '+fr(w)+' kg : tente '+fr(next)+' kg, si la technique reste propre.'};
}

return {sessions,exercise,records,newRecords,latestRecord,advice,increment,best};
});
