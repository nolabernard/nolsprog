/* STEROID V2 — séance en cours et file d'envoi vers Supabase.
 * Tout est enregistré sur l'appareil d'abord (reprise après fermeture, hors ligne),
 * puis envoyé dans l'ordre workouts → workout_exercises → workout_set_logs.
 * Une ligne ne quitte la file qu'après confirmation du serveur. Charge non saisie = null. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidWorkout=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TABLES=['workouts','workout_exercises','workout_set_logs'];
const iso=ms=>ms==null?null:new Date(ms).toISOString();
function defaultUuid(){return globalThis.crypto.randomUUID()}

// Refus du serveur sur les données (contrainte, clé étrangère) : réessayer ne servira à rien.
const isRejection=err=>Number.isInteger(err?.status)&&err.status>=400&&err.status<500&&![401,403,408,429].includes(err.status);
function createWorkoutStore({storage,api,userId,now=()=>Date.now(),uuid=defaultUuid,onReject=()=>{}}){
 const WKEY='steroid-v2-workout:'+userId,QKEY='steroid-v2-queue:'+userId;
 const read=k=>{try{return JSON.parse(storage.getItem(k)||'null')}catch{return null}};
 let workout=read(WKEY);
 let queue=read(QKEY)||{};
 let flushing=null;
 function save(){if(workout)storage.setItem(WKEY,JSON.stringify(workout));else storage.removeItem(WKEY);storage.setItem(QKEY,JSON.stringify(queue))}
 function enqueue(table,row){queue[table+':'+row.id]={table,row};}
 function workoutRow(w){return {id:w.id,user_id:userId,cycle_id:w.cycle_id,cycle_session_id:w.cycle_session_id,status:w.status,started_at:iso(w.started_at),ended_at:iso(w.ended_at),paused_at:iso(w.paused_at),paused_seconds:w.paused_seconds,duration_seconds:w.duration_seconds,revision:w.revision,skip_reason:w.skip_reason??null}}
 function exerciseRow(e){return {id:e.id,user_id:userId,workout_id:workout.id,position:e.position,exercise_key:e.exercise_key,cycle_exercise_id:e.cycle_exercise_id,substituted_from_key:e.substituted_from_key,status:e.status,rpe:e.rpe}}
 function setRow(e,s){return {id:s.id,user_id:userId,workout_exercise_id:e.id,exercise_key:e.exercise_key,set_number:s.set_number,weight:s.weight,reps:s.reps,rir:s.rir,completed:s.completed}}
 function touchWorkout(){workout.revision=(workout.revision||0)+1;enqueue('workouts',workoutRow(workout))}
 function find(id){const e=workout?.exercises.find(x=>x.id===id);if(!e)throw Error('Exercice introuvable dans la séance.');return e}
 function freshSets(count,last){return Array.from({length:count},(_,i)=>({id:uuid(),set_number:i+1,weight:last?.weight??null,reps:last?.reps??null,rir:null,completed:false}))}
 const sorted=()=>workout.exercises.sort((a,b)=>a.position-b.position);

 return {
  current(){return workout},
  pending(){return Object.keys(queue).length},
  start(session,{last={}}={}){
   if(workout)throw Error('Une séance est déjà en cours.');
   const t=now();
   workout={id:uuid(),cycle_id:session.cycle_id??null,cycle_session_id:session.id??null,status:'in_progress',started_at:t,ended_at:null,paused_at:null,paused_seconds:0,duration_seconds:null,revision:0,
    exercises:(session.exercises||[]).map((ce,i)=>({id:uuid(),position:i,exercise_key:ce.exercise_key,cycle_exercise_id:ce.id??null,substituted_from_key:null,status:'done',rpe:null,
     plan:{role:ce.role,sets:ce.sets,reps_min:ce.reps_min,reps_max:ce.reps_max,rest_seconds:ce.rest_seconds},sets:freshSets(ce.sets,last[ce.exercise_key])}))};
   touchWorkout();for(const e of workout.exercises)enqueue('workout_exercises',exerciseRow(e));
   save();return workout;
  },
  logSet(exerciseId,setNumber,{weight,reps,rir,completed}){
   const e=find(exerciseId),s=e.sets.find(x=>x.set_number===setNumber);if(!s)throw Error('Série introuvable.');
   const num=v=>v===''||v==null?null:Number(v);
   if(weight!==undefined)s.weight=num(weight);if(reps!==undefined)s.reps=num(reps);if(rir!==undefined)s.rir=num(rir);if(completed!==undefined)s.completed=Boolean(completed);
   if(s.weight!=null&&(!Number.isFinite(s.weight)||s.weight<0))throw Error('Charge invalide.');
   enqueue('workout_set_logs',setRow(e,s));save();return s;
  },
  // Exercice prévu retiré du programme : la séance (et sa file) ne doit plus le référencer.
  forgetCycleExercise(cycleExerciseId){
   if(!cycleExerciseId)return;
   for(const e of workout?.exercises||[])if(e.cycle_exercise_id===cycleExerciseId){e.cycle_exercise_id=null;enqueue('workout_exercises',exerciseRow(e))}
   for(const v of Object.values(queue))if(v.table==='workout_exercises'&&v.row.cycle_exercise_id===cycleExerciseId)v.row={...v.row,cycle_exercise_id:null};
   save();
  },
  // Cycle abandonné (un autre appareil avait déjà le sien) : les séances restent, sans lien vers lui.
  forgetCycle(cycleId,cycleExerciseIds=[]){
   const gone=new Set(cycleExerciseIds);
   if(workout&&workout.cycle_id===cycleId){workout.cycle_id=null;workout.cycle_session_id=null;touchWorkout()}
   for(const e of workout?.exercises||[])if(gone.has(e.cycle_exercise_id)){e.cycle_exercise_id=null;enqueue('workout_exercises',exerciseRow(e))}
   for(const v of Object.values(queue)){
    if(v.table==='workouts'&&v.row.cycle_id===cycleId)v.row={...v.row,cycle_id:null,cycle_session_id:null};
    if(v.table==='workout_exercises'&&gone.has(v.row.cycle_exercise_id))v.row={...v.row,cycle_exercise_id:null};
   }
   save();
  },
  setRpe(exerciseId,rpe){const e=find(exerciseId);const v=Number(rpe);e.rpe=Number.isInteger(v)&&v>=1&&v<=10?v:null;enqueue('workout_exercises',exerciseRow(e));save()},
  pause(at){if(!workout||workout.paused_at)return;workout.paused_at=Math.max(workout.started_at,Math.min(now(),at??now()));touchWorkout();save()},
  resume(){if(!workout?.paused_at)return;workout.paused_seconds+=Math.round((now()-workout.paused_at)/1000);workout.paused_at=null;touchWorkout();save()},
  isPaused(){return Boolean(workout?.paused_at)},
  elapsedSeconds(){if(!workout)return 0;const end=workout.paused_at||now();return Math.max(0,Math.round((end-workout.started_at)/1000)-workout.paused_seconds)},
  later(exerciseId){
   const e=find(exerciseId),list=sorted();if(list[list.length-1]===e)return;
   e.position=Math.max(...list.map(x=>x.position))+1;e.status='later';sorted();
   enqueue('workout_exercises',exerciseRow(e));save();
  },
  skip(exerciseId){const e=find(exerciseId);e.status='skipped';enqueue('workout_exercises',exerciseRow(e));save()},
  substitute(exerciseId,newKey,{last}={}){
   const e=find(exerciseId);if(newKey===e.exercise_key)return;
   const original=e.substituted_from_key||e.exercise_key;
   if(e.sets.some(s=>s.completed)){
    // Des séries sont déjà faites : on les garde sur l'exercice d'origine et on ajoute le remplaçant.
    e.status='skipped';enqueue('workout_exercises',exerciseRow(e));
    const added={id:uuid(),position:Math.max(...workout.exercises.map(x=>x.position))+1,exercise_key:newKey,cycle_exercise_id:e.cycle_exercise_id,substituted_from_key:original,status:'done',rpe:null,plan:{...e.plan},sets:freshSets(e.plan.sets,last)};
    workout.exercises.push(added);sorted();enqueue('workout_exercises',exerciseRow(added));save();return added;
   }
   e.exercise_key=newKey;e.substituted_from_key=newKey===original?null:original;
   // Aucune série faite : mêmes identifiants de séries (pas de doublon en base), valeurs remises à zéro.
   const fresh=freshSets(e.plan.sets,last);fresh.forEach((s,i)=>{if(e.sets[i])s.id=e.sets[i].id});e.sets=fresh;
   for(const s of e.sets)if(queue['workout_set_logs:'+s.id])enqueue('workout_set_logs',setRow(e,s));
   enqueue('workout_exercises',exerciseRow(e));save();
  },
  finish(){
   if(!workout)return null;
   if(workout.paused_at)this.resume();
   const t=now();workout.status='completed';workout.ended_at=t;
   workout.duration_seconds=Math.max(0,Math.round((t-workout.started_at)/1000)-workout.paused_seconds);
   touchWorkout();
   for(const e of workout.exercises)for(const s of e.sets)if(s.completed||s.weight!=null||s.reps!=null)enqueue('workout_set_logs',setRow(e,s));
   const done=workout;workout=null;save();return done;
  },
  // Séance passée (malade, douleur…) : notée sans séries, elle fait avancer la suite. Jamais pendant une séance en cours.
  skipSession(session,{reason='autre'}={}){
   if(workout)throw Error('Une séance est déjà en cours.');
   const t=now(),why=['malade','douleur','temps','autre'].includes(reason)?reason:'autre';
   const w={id:uuid(),cycle_id:session.cycle_id??null,cycle_session_id:session.id??null,status:'skipped',started_at:t,ended_at:t,paused_at:null,paused_seconds:0,duration_seconds:0,revision:1,skip_reason:why};
   enqueue('workouts',workoutRow(w));save();return workoutRow(w);
  },
  // Erreur de manipulation : la séance passée est annulée (elle ne compte plus dans la suite).
  cancelSkip(row){if(!row||row.status!=='skipped')return null;const r={...row,user_id:userId,status:'abandoned',skip_reason:null,revision:(row.revision||1)+1};enqueue('workouts',r);save();return r},
  async flush(){
   if(flushing)return flushing;
   // Un envoi sans attente se termine avant l'affectation : on libère le verrou après coup.
   const run=(async()=>{
    try{
     for(const table of TABLES){
      const items=Object.entries(queue).filter(([,v])=>v.table===table);
      if(!items.length)continue;
      // Lignes mises en file avant l'ajout d'une colonne : mêmes clés pour un envoi groupé.
      if(table==='workouts')for(const [,v] of items)if(!('skip_reason' in v.row))v.row={...v.row,skip_reason:null};
      try{await api.upsert(table,items.map(([,v])=>v.row))}
      catch(err){
       if(!isRejection(err))throw err;
       // Une ligne refusée ne doit pas bloquer les autres : envoi ligne par ligne, les refusées sont écartées et signalées.
       for(const [k,v] of items){try{await api.upsert(table,[v.row])}catch(e){if(!isRejection(e))throw e;if(queue[k]===v){delete queue[k];save()}onReject(table,v.row,e)}}
      }
      // Une ligne modifiée pendant l'envoi reste dans la file.
      for(const [k,v] of items)if(queue[k]===v)delete queue[k];
      save();
     }
     return true;
    }catch(err){return false}
   })();
   flushing=run;run.finally(()=>{if(flushing===run)flushing=null});
   return run;
  }
 };
}
return {createWorkoutStore,isRejection};
});
