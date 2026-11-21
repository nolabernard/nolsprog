/* STÉROÏDE V2 — contrôleur des écrans Aujourd'hui, Progrès et Programme.
 * Relie les modules purs (cycle, planificateur, séance, écrans) au stockage et à Supabase.
 * app.js lui délègue l'affichage et les actions data-action="v2-…". Testé sous Node (scripts/app-v2.test.cjs). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidAppV2=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const G=()=>globalThis;
const IDLE_MS=20*60e3;
const isRejection=err=>Number.isInteger(err?.status)&&err.status>=400&&err.status<500&&![401,403,408,429].includes(err.status);
const DAYS=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const iso=ms=>new Date(ms).toISOString();
const clone=v=>JSON.parse(JSON.stringify(v));

function create(ctx){
 const {storage,api,userId,now=()=>Date.now(),uuid=()=>G().crypto.randomUUID(),render=()=>{},notice=()=>{},confirm=async()=>true}=ctx;
 const C=G().SteroidCycle,UI=G().SteroidUI,Planner=G().SteroidPlanner,Cat=G().SteroidCatalogue;
 const owner=userId||'guest';
 const K={cycle:'nolsprog-v2-cycle:'+owner,history:'nolsprog-v2-history:'+owner,ui:'nolsprog-v2-ui:'+owner,outbox:'nolsprog-v2-outbox:'+owner};
 const read=(k,d)=>{try{const v=JSON.parse(storage.getItem(k)||'null');return v??d}catch{return d}};
 const write=(k,v)=>{try{storage.setItem(k,JSON.stringify(v))}catch{notice('Espace de stockage plein sur ce téléphone.',true)}};
 const S={cardioLogs:[],cycle:null,workouts:[],setLogs:[],userExercises:[],store:null,view:'home',index:0,sheet:null,rest:null,summary:null,metric:'weight',selected:null,picking:null,query:'',creating:false,building:false};
 let ui=read(K.ui,{lastAction:null,rest:null,view:'home',index:0});
 let outbox=read(K.outbox,[]); // lignes de programme à envoyer (cycles, séances, exercices prévus, exercices perso)
 let flushTimer=null,flushing=null;
 const saveUi=()=>{ui={lastAction:ui.lastAction,rest:S.rest,view:S.view,index:S.index};write(K.ui,ui)};
 const touch=()=>{ui.lastAction=now();saveUi()};
 const remote=api?{upsert:(table,rows)=>api.upsert(table,rows)}:{upsert:async()=>{}};

 function persistLocal(){
  write(K.cycle,S.cycle);
  write(K.history,{workouts:S.workouts.slice(0,500),setLogs:S.setLogs.slice(0,5000),userExercises:S.userExercises,cardioLogs:S.cardioLogs.slice(0,1000)});
 }
 function queueRows(rows){
  for(const [table,list] of Object.entries(rows))for(const row of list){
   const i=outbox.findIndex(x=>!x.op&&x.table===table&&x.row.id===row.id&&x.row.key===row.key);
   if(i>=0)outbox[i]={table,row};else outbox.push({table,row});
  }
  write(K.outbox,outbox);scheduleFlush();
 }
 const ORDER=['cycles','user_exercises','cycle_sessions','cycle_exercises','cycle_cardio'],AFTER=['cardio_logs']; // le cardio fait référence aux séances : envoyé après elles
 // Colonnes fixes par table : un envoi groupé exige les mêmes clés sur chaque ligne.
 const COLS={cycles:['id','user_id','status','method','weeks','sessions_per_week','preferred_days','answers_snapshot','engine_version','started_at','ended_at'],
  user_exercises:['user_id','key','name','pattern','muscle','equipment'],
  cycle_sessions:['id','user_id','cycle_id','position','code','title','focus'],
  cycle_exercises:['id','user_id','cycle_session_id','position','exercise_key','role','sets','reps_min','reps_max','rest_seconds','replaced_key'],
  cycle_cardio:['id','user_id','cycle_id','type','minutes','per_week'],
  cardio_logs:['id','user_id','workout_id','cycle_id','done_on','type','minutes']};
 const pick=(table,r)=>Object.fromEntries(COLS[table].map(c=>[c,r[c]??null]));
 async function flushOutbox(tables=ORDER){
  if(!api||!userId)return true;
  // Retraits d'abord : ils libèrent des places avant les décalages.
  for(const item of outbox.filter(x=>x.op==='delete'&&tables===ORDER)){
   try{await api.remove(item.table,item.id)}catch(err){if(!isRejection(err))throw err}
   outbox=outbox.filter(x=>x!==item);write(K.outbox,outbox);
  }
  for(const table of tables){
   const items=outbox.filter(x=>x.table===table&&!x.op);if(!items.length)continue;
   const rows=items.map(x=>pick(table,x.row));
   try{
    // (séance, place) est unique et vérifié ligne par ligne : on passe par des places provisoires.
    if(table==='cycle_exercises')await api.upsert(table,rows.map(r=>({...r,position:r.position+1000})));
    await api.upsert(table,rows);
   }catch(err){
    if(!isRejection(err))throw err;
    // Un autre appareil a déjà un cycle actif : on abandonne le nôtre et on reprend celui du serveur.
    if(table==='cycles'&&err.code==='23505'&&S.cycle&&items.some(x=>x.row.id===S.cycle.id)){await adoptServerCycle();return true}
    // Refus définitif : ligne par ligne, les refusées sont écartées et signalées, jamais de blocage.
    for(const [i,x] of items.entries()){try{await api.upsert(table,[rows[i]])}catch(e){if(!isRejection(e))throw e;outbox=outbox.filter(y=>y!==x);write(K.outbox,outbox);rejected(table,e)}}
   }
   outbox=outbox.filter(x=>!items.includes(x));write(K.outbox,outbox);
  }
  return true;
 }
 function rejected(table,err){notice('Une modification ('+(LABEL[table]||table)+') a été refusée par le serveur et n’a pas été enregistrée : '+err.message,true)}
 const LABEL={cycles:'programme',cycle_sessions:'séance prévue',cycle_exercises:'exercice prévu',user_exercises:'exercice perso',workouts:'séance',workout_exercises:'exercice de séance',workout_set_logs:'série'};
 async function adoptServerCycle(){
  const mine=S.cycle,ids=new Set([mine.id,...mine.sessions.map(x=>x.id),...mine.sessions.flatMap(x=>x.exercises.map(e=>e.id)),...(mine.cardio||[]).map(c=>c.id)]);
  for(const x of outbox)if(x.table==='cardio_logs'&&x.row.cycle_id===mine.id)x.row={...x.row,cycle_id:null};
  outbox=outbox.filter(x=>x.table==='user_exercises'||!ids.has(x.row?.id??x.id));write(K.outbox,outbox);
  S.store.forgetCycle(mine.id,mine.sessions.flatMap(x=>x.exercises.map(e=>e.id)));
  for(const w of S.workouts)if(w.cycle_id===mine.id){w.cycle_id=null;w.cycle_session_id=null}
  S.cycle=null;await refresh();
  notice('Ton programme existait déjà sur un autre appareil : je reprends celui-là.');
 }
 async function flushNow(){
  if(flushing)return flushing;
  const run=(async()=>{try{if(!api||!userId||!S.store)return true;await flushOutbox();const ok=await S.store.flush();if(!ok)return false;await flushOutbox(AFTER);return true}catch{return false}finally{render()}})();
  flushing=run;run.finally(()=>{if(flushing===run)flushing=null});
  return run;
 }
 function scheduleFlush(){if(!api)return;clearTimeout(flushTimer);flushTimer=setTimeout(()=>{flushNow()},600)}
 const pending=()=>(api&&userId?outbox.length+(S.store?.pending()||0):0);

 function cycleRow(){const {sessions,user_exercises,...c}=S.cycle;return {...c,user_id:userId}}
 function exRow(e){return {...e,user_id:userId}}
 function sessionOf(ceId){for(const s of S.cycle.sessions){const e=s.exercises.find(x=>x.id===ceId);if(e)return {s,e}}return {}}
 function refreshSession(s){s.exercises.forEach((e,i)=>e.position=i);const m=new Map();for(const e of s.exercises){const mu=Cat.byKey(e.exercise_key)?.muscle||S.userExercises.find(u=>u.key===e.exercise_key)?.muscle;if(mu&&!m.has(mu+'|'+e.role))m.set(mu+'|'+e.role,{muscle:mu,role:e.role})}s.muscles=[...m.values()];s.focus=[...new Set(s.muscles.map(x=>x.muscle))]}

 let fresh=Promise.resolve(),loadFailed=false;
 // Cache de l'appareil d'abord (jamais d'attente sur un réseau muet), puis rafraîchissement depuis Supabase.
 async function init(){
  S.store=G().SteroidWorkout.createWorkoutStore({storage,api:remote,userId:owner,now,uuid,onReject:(t,row,err)=>rejected(t,err)});
  const local=read(K.history,null);
  if(local){S.workouts=local.workouts||[];S.setLogs=local.setLogs||[];S.userExercises=local.userExercises||[];S.cardioLogs=local.cardioLogs||[]}
  S.cycle=read(K.cycle,null);
  S.view=S.store.current()?(ui.view==='home'?'home':'session'):'home';S.index=S.store.current()?ui.index||0:0;S.rest=ui.rest||null;
  if(api&&userId){fresh=refresh();if(!S.cycle)await fresh;else fresh.then(()=>render())}
  else if(!S.cycle){build();persistLocal()}
 }
 async function refresh(){
  try{
   const loaded=await C.loadCycle(api,userId);loadFailed=false;
   // Les séances pas encore confirmées par le serveur restent affichées.
   const ids=new Set(loaded.workouts.map(w=>w.id));
   S.workouts=mergeById(loaded.workouts,S.workouts.filter(w=>!ids.has(w.id)));
   S.setLogs=[...loaded.setLogs,...S.setLogs.filter(r=>!ids.has(r.workout_id))];
   S.userExercises=mergeByKey(loaded.userExercises,S.userExercises);
   const cids=new Set((loaded.cardioLogs||[]).map(x=>x.id));S.cardioLogs=[...(loaded.cardioLogs||[]),...S.cardioLogs.filter(x=>!cids.has(x.id))];
   if(loaded.cycle)S.cycle=loaded.cycle;
   else if(!S.cycle)build(); // le serveur a répondu : ce compte n'a vraiment pas de cycle
  }catch(e){
   // Jamais de second cycle fabriqué à l'aveugle pour un compte : on attend le réseau.
   if(!S.cycle){loadFailed=true;notice('Programme indisponible hors ligne. Reconnecte-toi au réseau puis réessaie.',true)}
  }
  if(S.cycle?.user_exercises?.length)S.userExercises=mergeByKey(S.userExercises,S.cycle.user_exercises);
  if(S.cycle)persistLocal();
  flushNow();
 }
 async function rebuild(){
  if(current()){notice('Termine d’abord ta séance en cours.',true);return false}
  const old=S.cycle;
  if(old)old.status='archived',old.ended_at=iso(now());
  if(old&&api&&userId)queueRows({cycles:[{...old,user_id:userId}]});
  S.cycle=null;build();
  if(!S.cycle){if(old){old.status='active';old.ended_at=null;S.cycle=old}return false}
  persistLocal();render();return true;
 }
 function mergeById(a,b){const m=new Map();for(const x of [...a,...b])m.set(x.id,x);return [...m.values()].sort((x,y)=>Date.parse(y.ended_at||0)-Date.parse(x.ended_at||0))}
 function mergeByKey(a,b){const m=new Map();for(const x of [...a,...b])m.set(x.key,x);return [...m.values()]}
 function build(){
  const plan=ctx.legacyPlan?.()||[],a=ctx.answers?.();
  try{
   // Générateur V2 à partir du questionnaire ; l'ancien plan seulement s'il n'y a pas de questionnaire.
   if(a&&Object.keys(a).length){const built=G().NolsEngine.buildCycle(a.planMode==='free'?{...a,days:[]}:a);S.cycle=C.fromEngine({...built,answers:built.answers||a},{uuid,startedAt:iso(now())})}
   else if(plan.some(d=>d?.ex?.length))S.cycle=C.fromLegacyPlan(plan,{uuid,startedAt:iso(now())});
   else{S.cycle=C.fromEngine(G().NolsEngine.buildCycle(G().NolsEngine.defaults||{}),{uuid,startedAt:iso(now())})}
  }catch(e){notice('Programme impossible à préparer : '+e.message,true);return}
  S.cycle.cardio=S.cycle.cardio||[];
  S.userExercises=mergeByKey(S.userExercises,S.cycle.user_exercises||[]);
  if(api&&userId)queueRows(C.toRows(S.cycle,userId));
 }

 // ----- Séance -----
 const current=()=>S.store?.current();
 const list=()=>[...(current()?.exercises||[])].sort((a,b)=>a.position-b.position).filter(e=>e.status!=='skipped');
 const last=()=>C.lastPerformance(S.setLogs);
 const answers=()=>S.cycle?.answers_snapshot&&Object.keys(S.cycle.answers_snapshot).length?S.cycle.answers_snapshot:(ctx.answers?.()||{});
 function startRest(sec){S.rest={end:now()+sec*1000};saveUi()}
 function restLeft(){if(!S.rest)return null;if(S.rest.frozen!=null)return S.rest.frozen;const left=Math.ceil((S.rest.end-now())/1000);return left>0?left:0}
 function idleMinutes(){const w=current();if(!w||w.paused_at||S.view!=='session'||!ui.lastAction)return 0;const d=now()-ui.lastAction;return d>=IDLE_MS?Math.floor(d/60e3):0}
 function sessionTitle(w){return S.cycle?.sessions.find(s=>s.id===w.cycle_session_id)?.title||'Séance'}
 function startSession(id){
  const s=S.cycle.sessions.find(x=>x.id===id);if(!s)return;
  if(current()){S.view='session';return}
  S.store.start({...s,cycle_id:S.cycle.id},{last:last()});S.view='session';S.index=0;S.rest=null;S.sheet=null;touch();scheduleFlush();
 }
 function finishSession(){
  const done=S.store.finish();if(!done)return;
  const row={id:done.id,cycle_id:done.cycle_id,cycle_session_id:done.cycle_session_id,status:'completed',started_at:iso(done.started_at),ended_at:iso(done.ended_at),duration_seconds:done.duration_seconds,local_only:!(api&&userId)};
  S.workouts=[row,...S.workouts.filter(w=>w.id!==row.id)];
  for(const e of done.exercises)for(const s of e.sets)if(s.completed)S.setLogs.unshift({exercise_key:e.exercise_key,weight:s.weight,reps:s.reps,completed:true,created_at:row.ended_at,workout_id:done.id,local_only:!(api&&userId)});
  persistLocal();S.summary=done;S.view='summary';S.rest=null;S.sheet=null;saveUi();scheduleFlush();
 }

 // ----- Rendu -----
 function dateText(){const d=new Date(now());return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]}
 function minutes(s){try{return G().NolsEngine.estimatedMinutes(s.exercises.map(e=>({name:C.nameOf(e.exercise_key,S.userExercises),sets:e.sets,rest:e.rest_seconds})))}catch{return null}}
 function weekLine(){
  const d=new Date(now()),monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)).getTime();
  const done=S.workouts.filter(w=>w.cycle_id===S.cycle.id&&w.status==='completed'&&Date.parse(w.ended_at)>=monday).length,goal=S.cycle.sessions_per_week||S.cycle.sessions.length;
  return done>=goal?'Objectif de la semaine atteint : '+done+' séance'+(done>1?'s':'')+'.':done?done+' séance'+(done>1?'s':'')+' cette semaine, encore '+(goal-done)+'.':'Objectif : '+goal+' séance'+(goal>1?'s':'')+' cette semaine.';
 }
 function todayHTML(){
  if(!S.cycle)return UI.home({next:null,cycle:null,building:S.building,retry:loadFailed});
  const cardioSheet=S.sheet?.type==='cardio'?UI.cardioSheet({workoutId:S.sheet.workout||''}):'';
  if(S.view==='summary'&&S.summary)return UI.summary({workout:S.summary,pending:pending(),local:!(api&&userId),userExercises:S.userExercises})+cardioSheet;
  const w=current();
  if(w&&S.view==='session'){
   const items=list();S.index=Math.max(0,Math.min(S.index,items.length-1));
   const left=restLeft();
   let html=UI.session({workout:w,index:S.index,elapsed:S.store.elapsedSeconds(),paused:S.store.isPaused(),pausedFor:w.paused_at?Math.round((now()-w.paused_at)/1000):0,rest:left?{remaining:left}:null,last:last(),userExercises:S.userExercises,pending:pending()});
   const idle=idleMinutes();
   if(idle)html+=UI.idlePrompt(idle);
   else if(S.sheet?.type==='machine'){const e=w.exercises.find(x=>x.id===S.sheet.ex);if(e){const practiced={};for(const r of S.setLogs)if(r.completed)practiced[r.exercise_key]=(practiced[r.exercise_key]||0)+1;
    const a=answers(),alts=Cat.alternatives(e.exercise_key,{equipment:a.equipment||'gym',avoid:String(a.avoid||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean),exclude:w.exercises.map(x=>x.exercise_key),history:practiced});
    html+=UI.machineSheet({exercise:e,alternatives:alts,canLater:items[items.length-1]?.id!==e.id,practiced})}}
   else if(S.sheet?.type==='more')html+=UI.moreSheet({exercise:items[S.index]});
   return html;
  }
  const next=Planner.nextSession(S.cycle,S.workouts,now());
  const active=w?{title:sessionTitle(w),done:w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0),total:w.exercises.reduce((n,e)=>n+e.sets.length,0)}:null;
  const cardio={target:(S.cycle.cardio||[]).reduce((n,c)=>n+c.minutes*c.per_week,0),minutes:C.cardioWeek(S.cardioLogs,now())};
  let html=UI.home({next,rhythm:C.rhythm(S.cycle,S.workouts,now()),cardio,hasHistory:S.workouts.some(x=>x.cycle_id===S.cycle.id&&x.status==='completed'),cycle:S.cycle,progress:C.cycleProgress(S.cycle,S.workouts),minutes:next?minutes(next.session):null,firstName:ctx.firstName?.()||'',dateText:dateText(),weekLine:weekLine(),active});
  if(S.sheet?.type==='choose')html+=UI.chooser({sessions:S.cycle.sessions,current:next?.session.id});
  return html+cardioSheet;
 }
 function statsHTML(){return UI.progress({progress:C.progress(S.setLogs,S.workouts),selected:S.selected,metric:S.metric,userExercises:S.userExercises,cardio:C.cardioProgress(S.cardioLogs,now())})}
 function searchResults(){
  const q=S.query.trim();
  const mine=S.userExercises.filter(u=>q&&Cat.normalize(u.name).includes(Cat.normalize(q))).map(u=>({key:u.key,name:u.name,muscle:u.muscle,role:'finition'}));
  return [...mine,...(q?Cat.search(q).slice(0,8):Cat.CATALOGUE.slice(0,8).map(entry=>({entry})))];
 }
 function programmeHTML(){return UI.programme({cycle:S.cycle,userExercises:S.userExercises,picking:S.picking,query:S.query,results:S.picking?searchResults():[],creating:S.creating})}

 // ----- Programme -----
 function saveCycleExercise(e){persistLocal();if(api&&userId)queueRows({cycle_exercises:[exRow(e)]})}
 function pickExercise(key){
  const role=Cat.byKey(key)?.role||'finition';
  if(S.picking?.ce){const {s,e}=sessionOf(S.picking.ce);if(!e)return;e.exercise_key=key;e.role=role;refreshSession(s);saveCycleExercise(e)}
  else if(S.picking?.session){
   const s=S.cycle.sessions.find(x=>x.id===S.picking.session);if(!s)return;
   const base=role==='base';
   const e={id:uuid(),cycle_session_id:s.id,position:s.exercises.length,exercise_key:key,role,sets:3,reps_min:base?6:10,reps_max:base?10:15,rest_seconds:base?150:75};
   // Les exercices de base restent avant les finitions.
   const at=base?s.exercises.findIndex(x=>x.role!=='base'):-1;if(at>=0)s.exercises.splice(at,0,e);else s.exercises.push(e);
   refreshSession(s);persistLocal();if(api&&userId)queueRows({cycle_exercises:s.exercises.map(exRow)});
  }
  S.picking=null;S.query='';S.creating=false;
 }
 async function removeExercise(ceId){
  const {s,e}=sessionOf(ceId);if(!e)return;
  if(s.exercises.length<=1){notice('Une séance garde au moins un exercice.',true);return}
  if(!await confirm(C.nameOf(e.exercise_key,S.userExercises)+' sera retiré de '+s.title+'. Son historique est conservé.',{title:'Retirer cet exercice ?',ok:'Retirer',cancel:'Garder'}))return;
  s.exercises=s.exercises.filter(x=>x.id!==ceId);refreshSession(s);persistLocal();
  S.store.forgetCycleExercise(ceId);
  if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cycle_exercises'&&x.row?.id===ceId));outbox.push({table:'cycle_exercises',op:'delete',id:ceId});queueRows({cycle_exercises:s.exercises.map(exRow)})}
 }
 async function createExercise({name,muscle,pattern}){
  name=String(name||'').trim().slice(0,100);if(!name){notice('Indique le nom de l’exercice.',true);return}
  const u={key:'u-'+uuid(),name,muscle:muscle||null,pattern:pattern||null,equipment:null};
  S.userExercises.push(u);persistLocal();if(api&&userId)queueRows({user_exercises:[{...u,user_id:userId}]});
  pickExercise(u.key);render();
 }

 async function handle(action,d={}){
  const w=current();
  switch(action){
   case 'v2-build':S.building=true;render();if(api&&userId){fresh=refresh();await fresh}else{build();persistLocal()}S.building=false;break;
   case 'v2-start':case 'v2-pick-session':startSession(d.session);break;
   case 'v2-choose':S.sheet={type:'choose'};break;
   case 'v2-close-sheet':S.sheet=null;S.picking=null;S.creating=false;break;
   case 'v2-back':S.view='session';touch();break;
   case 'v2-exit':S.view='home';S.sheet=null;saveUi();break;
   case 'v2-set':{
    const e=w?.exercises.find(x=>x.id===d.ex),s=e?.sets.find(x=>x.set_number===Number(d.set));if(!s)return;
    if(!s.completed&&s.reps==null){notice('Indique tes répétitions pour valider la série '+s.set_number+'.',true);return}
    S.store.logSet(e.id,s.set_number,{completed:!s.completed});touch();
    if(s.completed){startRest(e.plan.rest_seconds||90);if(e.sets.every(x=>x.completed)){const items=list(),i=items.findIndex(x=>x.id===e.id);if(i>=0&&i<items.length-1)S.index=i+1}}
    saveUi();scheduleFlush();break;
   }
   case 'v2-pause':if(S.rest){const l=restLeft();S.rest=l?{frozen:l}:null}S.store.pause();touch();scheduleFlush();break;
   case 'v2-resume':if(S.rest?.frozen!=null)S.rest={end:now()+S.rest.frozen*1000};S.store.resume();touch();scheduleFlush();break;
   case 'v2-idle-yes':S.store.pause(ui.lastAction);S.store.resume();touch();scheduleFlush();break;
   case 'v2-idle-no':touch();break;
   case 'v2-rest-plus':if(S.rest?.frozen!=null)S.rest.frozen+=30;else if(S.rest)S.rest.end=Math.max(S.rest.end,now())+30e3;saveUi();break;
   case 'v2-rest-skip':S.rest=null;saveUi();break;
   case 'v2-next':S.index=Math.min(S.index+1,list().length-1);touch();break;
   case 'v2-prev':S.index=Math.max(0,S.index-1);touch();break;
   case 'v2-machine':S.sheet={type:'machine',ex:d.ex};break;
   case 'v2-more':S.sheet={type:'more'};break;
   case 'v2-later':S.store.later(d.ex);S.sheet=null;touch();scheduleFlush();break;
   case 'v2-skip':S.store.skip(d.ex);S.sheet=null;S.index=Math.min(S.index,Math.max(0,list().length-1));touch();scheduleFlush();break;
   case 'v2-sub':{
    const e=w?.exercises.find(x=>x.id===d.ex);if(!e)return;
    const keep=Boolean(d.keep),from=e.substituted_from_key||e.exercise_key;
    S.store.substitute(e.id,d.key,{last:last()[d.key]});
    if(keep&&e.cycle_exercise_id){const r=sessionOf(e.cycle_exercise_id);if(r.e){r.e.replaced_key=r.e.replaced_key||from;r.e.exercise_key=d.key;refreshSession(r.s);saveCycleExercise(r.e)}}
    S.sheet=null;touch();scheduleFlush();break;
   }
   case 'v2-rpe':S.store.setRpe(d.ex,d.rpe);S.sheet=null;scheduleFlush();break;
   case 'v2-finish':{
    if(!w)return;
    const open=w.exercises.some(e=>e.status!=='skipped'&&e.sets.some(s=>!s.completed));
    if(open&&!await confirm('Les séries non validées ne seront pas comptées.',{title:'Terminer la séance ?',ok:'Terminer',cancel:'Continuer'}))return;
    finishSession();break;
   }
   case 'v2-close-summary':S.summary=null;S.view='home';saveUi();break;
   case 'v2-metric':S.metric=d.metric;break;
   case 'v2-edit-ex':S.picking={ce:d.ce};S.query='';S.creating=false;break;
   case 'v2-add-ex':S.picking={session:d.session};S.query='';S.creating=false;break;
   case 'v2-pick':pickExercise(d.key);break;
   case 'v2-remove-ex':await removeExercise(d.ce);break;
   case 'v2-create':S.creating=true;break;
   case 'v2-cardio-open':S.sheet={type:'cardio',workout:d.workout||''};break;
   case 'v2-cardio-plan-remove':{
    const cc=S.cycle.cardio||[];if(!cc.some(c=>c.id===d.id))return;
    S.cycle.cardio=cc.filter(c=>c.id!==d.id);persistLocal();
    if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cycle_cardio'&&x.row?.id===d.id));outbox.push({table:'cycle_cardio',op:'delete',id:d.id});write(K.outbox,outbox);scheduleFlush()}
    break;
   }
   default:return;
  }
  render();
 }
// ----- Cardio (noté à part des séries) -----
 const CARDIO_TYPES=['marche','course','velo','elliptique','rameur','natation','escaliers','autre'];
 function checkCardio(type,minutes,perWeek){
  const m=Number(minutes),p=perWeek===undefined?1:Number(perWeek);
  if(!CARDIO_TYPES.includes(type)){notice('Choisis une activité.',true);return null}
  if(!Number.isInteger(m)||m<1||m>600){notice('Indique une durée entre 1 et 600 minutes.',true);return null}
  if(!Number.isInteger(p)||p<1||p>7){notice('Choisis entre 1 et 7 fois par semaine.',true);return null}
  return {m,p};
 }
 async function saveCardio({type,minutes,workout}){
  const ok=checkCardio(type,minutes);if(!ok)return false;
  const row={id:uuid(),workout_id:workout||null,cycle_id:S.cycle?.id||null,done_on:C.localDate(now()),type,minutes:ok.m};
  S.cardioLogs.unshift(row);persistLocal();
  if(api&&userId){outbox.push({table:'cardio_logs',row:{...row,user_id:userId}});write(K.outbox,outbox);scheduleFlush()}
  S.sheet=null;notice('Cardio enregistré : '+ok.m+' min.');render();return true;
 }
 async function addCardioPlan({type,minutes,per_week}){
  if(!S.cycle)return false;const ok=checkCardio(type,minutes,per_week);if(!ok)return false;
  const row={id:uuid(),cycle_id:S.cycle.id,type,minutes:ok.m,per_week:ok.p};
  S.cycle.cardio=[...(S.cycle.cardio||[]),row];persistLocal();
  if(api&&userId)queueRows({cycle_cardio:[{...row,user_id:userId}]});
  render();return true;
 }
 function input({ex,set,field,value}){
  if(!current()||!['weight','reps'].includes(field))return;
  const raw=String(value??'').trim().replace(',','.'),v=raw===''?null:Number(raw);
  if(v!=null&&(!Number.isFinite(v)||v<0||v>(field==='weight'?3000:1000)))return;
  try{S.store.logSet(ex,Number(set),{[field]:v});touch();scheduleFlush()}catch{}
 }
 function change({kind,value,ce}){
  if(kind==='search'){S.query=String(value||'');return}
  if(kind==='progress'){S.selected=value;render();return}
  if(kind==='sets'){const {e}=sessionOf(ce);const n=Number(value);if(e&&Number.isInteger(n)&&n>=1&&n<=6){e.sets=n;saveCycleExercise(e)}render()}
 }
 function tick(){
  const left=restLeft();
  if(S.rest&&left===0){S.rest=null;saveUi();return {rest:0,done:true,elapsed:S.store?.elapsedSeconds()||0}}
  return {rest:left,elapsed:S.store?.elapsedSeconds()||0,idle:idleMinutes()};
 }
 return {saveCardio,addCardioPlan,init,rebuild,whenFresh:()=>fresh,ready:()=>Boolean(S.cycle),todayHTML,statsHTML,programmeHTML,handle,input,change,tick,createExercise,flushNow,pending,
  inSession:()=>Boolean(current())&&S.view==='session',busy:()=>Boolean(current())||pending()>0,state:()=>S};
}
return {create};
});
