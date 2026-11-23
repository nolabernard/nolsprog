/* STEROID V2 — contrôleur des écrans Aujourd'hui, Progrès et Programme.
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
 const C=G().SteroidCycle,H=G().SteroidHistory,Rv=G().SteroidReview,UI=G().SteroidUI,Planner=G().SteroidPlanner,Cat=G().SteroidCatalogue;
 const owner=userId||'guest';
 const K={cycle:'nolsprog-v2-cycle:'+owner,history:'nolsprog-v2-history:'+owner,ui:'nolsprog-v2-ui:'+owner,outbox:'nolsprog-v2-outbox:'+owner,deload:'nolsprog-v2-deload:'+owner,proposal:'nolsprog-v2-proposal:'+owner};
 const read=(k,d)=>{try{const v=JSON.parse(storage.getItem(k)||'null');return v??d}catch{return d}};
 const write=(k,v)=>{try{storage.setItem(k,JSON.stringify(v))}catch{notice('Espace de stockage plein sur ce téléphone.',true)}};
 const S={cardioLogs:[],cycle:null,workouts:[],setLogs:[],userExercises:[],store:null,view:'home',index:0,sheet:null,rest:null,summary:null,metric:'weight',selected:null,tab:'exercises',open:null,truncated:false,advice:null,proposal:null,nextAnswers:null,picking:null,query:'',creating:false,building:false};
 let ui=read(K.ui,{lastAction:null,rest:null,view:'home',index:0});
 let outbox=read(K.outbox,[]); // lignes de programme à envoyer (cycles, séances, exercices prévus, exercices perso)
 let flushTimer=null,flushing=null;
 const saveUi=()=>{ui={lastAction:ui.lastAction,rest:S.rest,view:S.view,index:S.index};write(K.ui,ui)};
 const touch=()=>{ui.lastAction=now();saveUi()};
 const Rem=G().SteroidReminders?.create({storage,api,userId,uuid});let remBusy=false;
 const remState=()=>{if(!Rem)return null;const r=Rem.state();return {...r,busy:remBusy,message:r.blocker?G().SteroidReminders.MESSAGES[r.blocker]:''}};
 async function remRun(fn,ok){if(!Rem||remBusy)return;remBusy=true;render();try{const r=await fn();if(ok)notice(typeof ok==='function'?ok(r):ok)}catch(e){notice(e.message||'Rappels indisponibles pour le moment.',true)}finally{remBusy=false;render()}}
 const remote=api?{upsert:(table,rows)=>api.upsert(table,rows)}:{upsert:async()=>{}};

 function persistLocal(){
  write(K.cycle,S.cycle);
  write(K.history,{truncated:S.truncated||S.setLogs.length>5000||S.workouts.length>500,workouts:S.workouts.slice(0,500),setLogs:S.setLogs.slice(0,5000),userExercises:S.userExercises,cardioLogs:S.cardioLogs.slice(0,1000)});
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
 // ----- Brouillon du programme : rien n'est appliqué ni envoyé avant « Enregistrer » -----
 // Séances telles qu'elles comptent (règle unique : C.countable). Recalculé seulement quand les données changent.
 let wMemo=null,lastSetTap={k:'',t:0};
 function W(){const k=[S.workouts,S.setLogs,S.cardioLogs,S.truncated,S.workouts.length,S.setLogs.length,S.cardioLogs.length];if(wMemo&&wMemo.k.every((x,i)=>x===k[i]))return wMemo.v;const v=C.countable(S.workouts,S.setLogs,S.cardioLogs,{truncated:S.truncated});wMemo={k,v};return v}
 const P=()=>S.edit?.draft||S.cycle;
 const openSessions=new Set();
 // Monter / descendre un exercice dans sa séance (brouillon, comme toute modification du programme).
 function moveExercise(ceId,dir){const cy=draft(),{s}=sessionIn(cy,ceId);if(!s)return;const i=s.exercises.findIndex(x=>x.id===ceId),j=i+dir;if(j<0||j>=s.exercises.length)return;[s.exercises[i],s.exercises[j]]=[s.exercises[j],s.exercises[i]];refreshSession(s);later(()=>{if(api&&userId)queueRows({cycle_exercises:s.exercises.map(exRow)})})}
 function draft(){if(!S.edit)S.edit={draft:JSON.parse(JSON.stringify(S.cycle)),ops:[]};return S.edit.draft}
 function later(fn){if(S.edit)S.edit.ops.push(fn);else fn()}
 function sessionIn(cy,ceId){for(const s of cy?.sessions||[]){const e=s.exercises.find(x=>x.id===ceId);if(e)return {s,e}}return {}}
 function saveDraft(){
  if(!S.edit)return;
  if(S.edit.draft.id!==S.cycle?.id){S.edit=null;notice('Ton programme a changé entre-temps : modifications annulées.',true);return}
  const ops=S.edit.ops;S.cycle=S.edit.draft;S.edit=null;
  for(const op of ops)op();
  persistLocal();scheduleFlush();notice('Programme enregistré. Il s’applique dès ta prochaine séance.');
 }
 function cancelDraft(){if(!S.edit)return;S.edit=null;S.picking=null;notice('Modifications annulées.')}
 function sessionOf(ceId){for(const s of S.cycle.sessions){const e=s.exercises.find(x=>x.id===ceId);if(e)return {s,e}}return {}}
 function refreshSession(s){s.exercises.forEach((e,i)=>e.position=i);const m=new Map();for(const e of s.exercises){const mu=Cat.byKey(e.exercise_key)?.muscle||S.userExercises.find(u=>u.key===e.exercise_key)?.muscle;if(mu&&!m.has(mu+'|'+e.role))m.set(mu+'|'+e.role,{muscle:mu,role:e.role})}s.muscles=[...m.values()];s.focus=[...new Set(s.muscles.map(x=>x.muscle))]}

 let fresh=Promise.resolve(),loadFailed=false;
 // Cache de l'appareil d'abord (jamais d'attente sur un réseau muet), puis rafraîchissement depuis Supabase.
 async function init(){
  S.store=G().SteroidWorkout.createWorkoutStore({storage,api:remote,userId:owner,now,uuid,onReject:(t,row,err)=>rejected(t,err)});
  const local=read(K.history,null);
  if(local){S.workouts=local.workouts||[];S.setLogs=local.setLogs||[];S.truncated=Boolean(local.truncated)||S.setLogs.length>=5000||S.workouts.length>=500;S.userExercises=local.userExercises||[];S.cardioLogs=local.cardioLogs||[]}
  S.cycle=read(K.cycle,null);S.proposal=read(K.proposal,null);
  S.view=S.store.current()?(ui.view==='home'?'home':'session'):'home';S.index=S.store.current()?ui.index||0:0;S.rest=ui.rest||null;
  // Questionnaire terminé avant que ce contrôleur ne démarre : le programme suit les nouvelles réponses.
  let pending=false;try{pending=storage.getItem('nolsprog-v2-rebuild:'+owner)==='1'}catch{}
  if(api&&userId){fresh=refresh();if(!S.cycle||pending)await fresh;else fresh.then(()=>render())}
  else if(!S.cycle&&!pending){build();persistLocal()}
  if(pending){try{storage.removeItem('nolsprog-v2-rebuild:'+owner)}catch{}if(!S.store.current())await rebuild();else{if(!S.cycle)build();persistLocal()}}
 }
 async function refresh(){
  try{
   const loaded=await C.loadCycle(api,userId);loadFailed=false;S.truncated=Boolean(loaded.truncated);
   // Les séances pas encore confirmées par le serveur restent affichées.
   const ids=new Set(loaded.workouts.map(w=>w.id));
   // Une séance passée annulée sur ce téléphone garde son annulation tant que le serveur ne l'a pas reçue.
   S.workouts=mergeById(loaded.workouts,S.workouts.filter(w=>!ids.has(w.id)||w.status==='abandoned'));
   // Séries locales pas encore reçues par le serveur (même séance déjà connue) : gardées, sinon la séance redeviendrait vide.
   const skey=r=>r.workout_exercise_id+'|'+r.set_number,have=new Set(loaded.setLogs.map(skey));
   S.setLogs=[...loaded.setLogs,...S.setLogs.filter(r=>!have.has(skey(r))&&(!ids.has(r.workout_id)||r.workout_exercise_id))];
   S.userExercises=mergeByKey(loaded.userExercises,S.userExercises);
   const cids=new Set((loaded.cardioLogs||[]).map(x=>x.id));S.cardioLogs=[...(loaded.cardioLogs||[]),...S.cardioLogs.filter(x=>!cids.has(x.id))];
   // Nouveau cycle validé sur cet appareil, pas encore envoyé : le serveur renvoie encore l'ancien, on garde le nôtre.
   let localActive=outbox.some(x=>x.table==='cycles'&&!x.op&&x.row.status==='active'&&x.row.id===S.cycle?.id&&x.row.id!==loaded.cycle?.id);
   // Le compte a un autre programme : on ne remplace jamais en silence (ex. programme reconstruit par erreur hors connexion).
   if(localActive&&loaded.cycle){
    const names=c=>(c.sessions||[]).map(x=>x.title).join(', ');
    const keepNew=await confirm('Ce téléphone a un nouveau programme pas encore envoyé ('+names(S.cycle)+'). Ton compte a toujours : '+names(loaded.cycle)+'.',{title:'Quel programme garder ?',ok:'Le nouveau',cancel:'Celui de mon compte'});
    if(!keepNew){
     const localId=S.cycle.id,serverId=loaded.cycle.id,sids=new Set((S.cycle.sessions||[]).map(x=>x.id));
     outbox=outbox.filter(x=>{const r=x.row||{};return !(r.cycle_id===localId||r.id===localId||sids.has(r.cycle_session_id)||(x.table==='cycles'&&r.id===serverId))});write(K.outbox,outbox);
     localActive=false;
    }
   }
   if(loaded.cycle&&!localActive){
    // Cardio prévu modifié sur l'appareil et pas encore envoyé : on le réapplique sur la version du serveur.
    if(S.cycle?.id===loaded.cycle.id){
     const gone=new Set(outbox.filter(x=>x.table==='cycle_cardio'&&x.op==='delete').map(x=>x.id));
     const added=outbox.filter(x=>x.table==='cycle_cardio'&&!x.op).map(x=>{const {user_id,...r}=x.row;return r});
     const ids=new Set(added.map(r=>r.id));
     loaded.cycle.cardio=[...(loaded.cycle.cardio||[]).filter(c=>!gone.has(c.id)&&!ids.has(c.id)),...added];
    }
    S.cycle=loaded.cycle;
   }
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
 const last=()=>C.lastPerformance(S.setLogs,S.workouts);
 const answers=()=>S.cycle?.answers_snapshot&&Object.keys(S.cycle.answers_snapshot).length?S.cycle.answers_snapshot:(ctx.answers?.()||{});
 function startRest(sec,rate=null){S.rest={end:now()+sec*1000,rate};saveUi()}
 // Série à noter (ressenti) : la dernière validée, tant que la séance continue.
 function rateInfo(w){const r=S.rest?.rate||S.rate;if(!r||!w)return null;const e=w.exercises.find(x=>x.id===r.ex),s=e?.sets.find(x=>x.set_number===r.set);if(!s?.completed)return null;return {ex:e.id,set:s.set_number,rir:s.rir,name:C.nameOf(e.exercise_key,S.userExercises)}}
 function restLeft(){if(!S.rest)return null;if(S.rest.frozen!=null)return S.rest.frozen;const left=Math.ceil((S.rest.end-now())/1000);return left>0?left:0}
 function idleMinutes(){const w=current();if(!w||w.paused_at||S.view!=='session'||!ui.lastAction)return 0;const d=now()-ui.lastAction;return d>=IDLE_MS?Math.floor(d/60e3):0}
 // Séances de semaine allégée : exclues des conseils de progression (moins de séries volontairement).
 // Séances allégées exclues des conseils : notées sur ce téléphone, ou (autre appareil) faites pendant la semaine allégée du cycle.
 function normalWorkouts(){const ids=new Set(read(K.deload,[]));const st=Date.parse(S.cycle?.started_at);const last=Number.isFinite(st)&&S.cycle?.weeks?C.weekStart(st)+(S.cycle.weeks-1)*7*24*3600e3:Infinity;
  return W().filter(w=>!ids.has(w.id)&&!(w.cycle_id===S.cycle?.id&&Date.parse(w.started_at||w.ended_at)>=last-3600e3))}
 function sessionTitle(w){return S.cycle?.sessions.find(s=>s.id===w.cycle_session_id)?.title||'Séance'}
 function startSession(id){
  const s=S.cycle.sessions.find(x=>x.id===id);if(!s)return;
  if(current()){S.view='session';return}
  // Une séance par jour : la suivante attend demain (récupération).
  if(Planner.today(W(),now())){S.sheet=null;notice('Ta séance du jour est faite. La suivante t’attend demain.');return}
  // Semaine allégée : moins de séries, mêmes charges ; la séance est notée comme telle (conseils et bilan n'en tirent pas de conclusion).
  const light=C.deload(S.cycle,W());
  S.store.start({...s,cycle_id:S.cycle.id,exercises:light?s.exercises.map(e=>({...e,sets:C.deloadSets(e.sets)})):s.exercises},{last:last()});
  if(light){const ids=read(K.deload,[]);ids.push(S.store.current().id);write(K.deload,ids.slice(-200))}
  S.view='session';S.index=0;S.rest=null;S.sheet=null;touch();scheduleFlush();
 }
 // « Je ne fais pas cette séance » : notée comme passée, la suite avance, repos aujourd'hui.
 function skipSession(id,reason){
  const s=S.cycle?.sessions.find(x=>x.id===id);if(!s||current()||Planner.today(W(),now()))return;
  const row=S.store.skipSession({...s,cycle_id:S.cycle.id},{reason});
  S.workouts=[{...row,title:s.title,local_only:!(api&&userId)},...S.workouts];
  persistLocal();S.sheet=null;scheduleFlush();
  notice(s.title+' passée. Repos aujourd’hui, la suite reprend demain.');
 }
 function cancelSkip(id){
  const w=S.workouts.find(x=>x.id===id&&x.status==='skipped');if(!w)return;
  const r=S.store.cancelSkip(w);if(!r)return;
  S.workouts=S.workouts.map(x=>x.id===id?{...x,status:'abandoned',skip_reason:null,revision:r.revision}:x);
  persistLocal();scheduleFlush();
 }
 function finishSession(){
  const done=S.store.finish();if(!done)return;
  const row={id:done.id,cycle_id:done.cycle_id,cycle_session_id:done.cycle_session_id,title:sessionTitle(done),status:'completed',started_at:iso(done.started_at),ended_at:iso(done.ended_at),duration_seconds:done.duration_seconds,local_only:!(api&&userId)};
  S.workouts=[row,...S.workouts.filter(w=>w.id!==row.id)];
  for(const e of done.exercises)for(const s of e.sets)if(s.completed)S.setLogs.unshift({workout_exercise_id:e.id,exercise_key:e.exercise_key,set_number:s.set_number,weight:s.weight,reps:s.reps,rir:s.rir??null,position:e.position,substituted_from_key:e.substituted_from_key||null,rpe:e.rpe??null,completed:true,created_at:row.ended_at,workout_id:done.id,local_only:!(api&&userId)});
  persistLocal();S.summary=done;S.view='summary';S.rest=null;S.sheet=null;saveUi();scheduleFlush();
 }

 // ----- Rendu -----
 function dateText(){const d=new Date(now());return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]}
 function minutes(s){try{return G().NolsEngine.estimatedMinutes(s.exercises.map(e=>({name:C.nameOf(e.exercise_key,S.userExercises),sets:e.sets,rest:e.rest_seconds})))}catch{return null}}
 // Séances faites cette semaine (lundi → dimanche) et objectif : l'anneau de l'accueil.
 function weekCount(){const d=new Date(now()),monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)).getTime();return {done:W().filter(w=>w.cycle_id===S.cycle.id&&w.status==='completed'&&Date.parse(w.started_at||w.ended_at)>=monday).length,goal:S.cycle.sessions_per_week||S.cycle.sessions.length}}
 function weekLine(){
  const d=new Date(now()),monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)).getTime();
  const done=W().filter(w=>w.cycle_id===S.cycle.id&&w.status==='completed'&&Date.parse(w.started_at||w.ended_at)>=monday).length,goal=S.cycle.sessions_per_week||S.cycle.sessions.length;
  return done>=goal?'Objectif de la semaine atteint : '+done+' séance'+(done>1?'s':'')+'.':done?done+' séance'+(done>1?'s':'')+' cette semaine, encore '+(goal-done)+'.':'Objectif : '+goal+' séance'+(goal>1?'s':'')+' cette semaine.';
 }
 function todayHTML(){
  if(!S.cycle)return UI.home({next:null,cycle:null,building:S.building,retry:loadFailed});
  const cardioSheet=cardioSheetHTML();
  if(S.view==='summary'&&S.summary)return UI.summary({records:H.newRecords(S.summary.id,S.setLogs,W(),{truncated:S.truncated}),workout:S.summary,pending:pending(),local:!(api&&userId),userExercises:S.userExercises})+cardioSheet;
  if(S.view==='review')return UI.review({review:Rv.review(S.cycle,W(),S.setLogs,S.userExercises,now()),userExercises:S.userExercises});
  if(S.view==='next')return UI.nextForm({answers:S.nextAnswers||nextDefaults(),weeks:S.nextWeeks||S.cycle.weeks||6,methods:G().NolsEngine.methods,recommendation:reviewNow().recommendation});
  if(S.view==='proposal'&&S.proposal)return UI.proposal({cycle:S.proposal,userExercises:S.userExercises,methods:G().NolsEngine.methods});
  const w=current();
  if(w&&S.view==='session'){
   const items=list();S.index=Math.max(0,Math.min(S.index,items.length-1));
   const left=restLeft();
   // Conseils figés pour la séance : l'historique ne change pas avant la fin.
   if(S.advice?.id!==w.id||S.advice.n!==w.exercises.length||w.exercises.some(e=>!(e.exercise_key in S.advice.map))){const map={};for(const e of w.exercises)map[e.exercise_key]=H.advice(e.plan,S.setLogs,normalWorkouts(),e.exercise_key)||{status:'calibrate',text:'Première fois sur cet exercice : trouve ta charge. Monte progressivement et garde celle qui te laisse 2 répétitions en réserve, puis note ton ressenti.'};S.advice={id:w.id,n:w.exercises.length,map}}
   const advice=S.advice.map;
   const light=new Set(read(K.deload,[])).has(w.id);
   // Échauffement : premier exercice de base de la séance, tant qu'aucune série n'est validée.
   const firstBase=items.find(x=>x.plan?.role==='base');let warm=null;
   if(firstBase&&items[S.index]?.id===firstBase.id&&!firstBase.sets.some(x=>x.completed)){const ref=firstBase.sets.find(x=>x.weight!=null)?.weight??last()[firstBase.exercise_key]?.weight;warm={ex:firstBase.id,sets:C.warmup(ref)}}
   let html=UI.session({light,warmup:warm,rate:rateInfo(w),advice,workout:w,index:S.index,elapsed:S.store.elapsedSeconds(),paused:S.store.isPaused(),pausedFor:w.paused_at?Math.round((now()-w.paused_at)/1000):0,rest:left?{remaining:left}:null,last:last(),userExercises:S.userExercises,pending:pending()});
   const idle=idleMinutes();
   if(idle)html+=UI.idlePrompt(idle);
   else if(S.sheet?.type==='machine'){const e=w.exercises.find(x=>x.id===S.sheet.ex);if(e){const practiced={};for(const r of S.setLogs)if(r.completed)practiced[r.exercise_key]=(practiced[r.exercise_key]||0)+1;
    const a=answers(),alts=Cat.alternatives(e.exercise_key,{equipment:a.equipment||'gym',avoid:String(a.avoid||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean),exclude:w.exercises.map(x=>x.exercise_key),history:practiced});
    html+=UI.machineSheet({exercise:e,alternatives:alts,canLater:items[items.length-1]?.id!==e.id,practiced})}}
   else if(S.sheet?.type==='more')html+=UI.moreSheet({exercise:items[S.index],anyDone:w.exercises.some(e=>e.sets.some(s=>s.completed))});
   else if(S.sheet?.type==='howto')html+=UI.howtoSheet({key:S.sheet.key,userExercises:S.userExercises});
   return html;
  }
  const next=Planner.nextSession(S.cycle,W(),now());
  const active=w?{title:sessionTitle(w),done:w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0),total:w.exercises.reduce((n,e)=>n+e.sets.length,0)}:null;
  const cardio={target:(S.cycle.cardio||[]).reduce((n,c)=>n+c.minutes*c.per_week,0),minutes:C.cardioWeek(S.cardioLogs,now())};
  let html=UI.home({next,rhythm:C.rhythm(S.cycle,W(),now()),cardio,hasHistory:W().some(x=>x.cycle_id===S.cycle.id&&x.status==='completed'),cycle:S.cycle,progress:C.cycleProgress(S.cycle,W()),minutes:next?minutes(next.session):null,firstName:ctx.firstName?.()||'',dateText:dateText(),weekLine:weekLine(),record:recentRecord(),deload:C.deload(S.cycle,W()),last:lastSession(),week:weekCount(),view:C.weekView(S.cycle,W(),S.setLogs,now()),stats:homeStats(),cycleStatus:C.cycleStatus(S.cycle,W(),now()),active});
  if(!w&&(S.proposal||Rv.due(S.cycle,W(),now())))html=html.replace('<section class="v2-next"',UI.reviewCard({proposal:Boolean(S.proposal)})+'<section class="v2-next"');
  if(S.sheet?.type==='choose')html+=UI.chooser({sessions:S.cycle.sessions,current:next?.session.id});
  if(S.sheet?.type==='recap'){const rs=S.cycle.sessions.find(x=>x.id===S.sheet.session);if(rs)html+=UI.recapSheet({session:rs,minutes:minutes(rs),userExercises:S.userExercises,remaining:Planner.round(S.cycle,W()).remaining,choosing:S.sheet.choosing,planned:next?.session.id})}
  if(S.sheet?.type==='skip'){const sk=S.cycle.sessions.find(x=>x.id===S.sheet.session);if(sk)html+=UI.skipSheet({session:sk})}
  return html+cardioSheet;
 }
 // Records battus pendant ce cycle (séries validées et comparables uniquement ; historique tronqué → pas de chiffre).
 function homeStats(){if(S.truncated)return {records:null};const ws=W().filter(x=>x.cycle_id===S.cycle.id&&x.status==='completed');let n=0;for(const x of ws)n+=H.newRecords(x.id,S.setLogs,W()).length;const r=n?H.latestRecord(S.setLogs,W()):null;return {records:n,lastRecord:r?'dernier : '+C.nameOf(r.key,S.userExercises):null}}
 // Dernière séance terminée (tous cycles), affichée sur l'accueil.
 function lastSession(){const titles={};for(const x of S.cycle?.sessions||[])titles[x.id]=x.title;return H.sessions(W(),S.setLogs,{titles})[0]||null}
 function cardioSheetHTML(){if(S.sheet?.type!=='cardio')return '';const edit=S.sheet.edit?S.cardioLogs.find(c=>c.id===S.sheet.edit)||null:null;return UI.cardioSheet({workoutId:S.sheet.workout||'',edit})}
 // Dernier record des 14 derniers jours, affiché sur l'accueil.
 function recentRecord(){const r=H.latestRecord(S.setLogs,W(),{truncated:S.truncated});if(!r||now()-Date.parse(r.date)>14*24*3600e3)return null;return 'Record récent : '+C.nameOf(r.key,S.userExercises)+', '+Number(r.weight).toLocaleString('fr-FR')+' kg × '+r.reps}
 function statsHTML(){return statsBody()+cardioSheetHTML()}
 function statsBody(){
  const prog=C.progress(S.setLogs,W()),keys=Object.keys(prog.byKey);
  const key=keys.includes(S.selected)?S.selected:keys.sort((a,b)=>C.nameOf(a,S.userExercises).localeCompare(C.nameOf(b,S.userExercises),'fr'))[0];
  const titles={};for(const x of S.cycle?.sessions||[])titles[x.id]=x.title;
  const plan=(S.cycle?.sessions||[]).flatMap(x=>x.exercises).find(e=>e.exercise_key===key);
  return UI.progress({progress:prog,selected:S.selected,metric:S.metric,userExercises:S.userExercises,cardio:C.cardioProgress(S.cardioLogs,now()),
   cardioList:S.tab==='sessions'?[...S.cardioLogs].sort((a,b)=>String(b.done_on).localeCompare(String(a.done_on))):[],tab:S.tab,history:key?H.exercise(key,S.setLogs,W()):null,advice:key&&plan?H.advice(plan,S.setLogs,normalWorkouts(),key):null,
   sessions:S.tab==='sessions'?H.sessions(W(),S.setLogs,{titles,cardioLogs:S.cardioLogs}):[],open:S.open,records:S.open?H.newRecords(S.open,S.setLogs,W(),{truncated:S.truncated}):[],truncated:S.truncated});
 }
 function searchResults(){
  const q=S.query.trim();
  const mine=S.userExercises.filter(u=>q&&Cat.normalize(u.name).includes(Cat.normalize(q))).map(u=>({key:u.key,name:u.name,muscle:u.muscle,role:'finition'}));
  return [...mine,...(q?Cat.search(q).slice(0,8):Cat.CATALOGUE.slice(0,8).map(entry=>({entry})))];
 }
 function programmeHTML(){return UI.programme({reviewAvailable:Boolean(S.cycle)&&Rv.available(S.cycle,W(),now()),cardioOpen:S.cardioOpen,cycleStatus:S.cycle?C.cycleStatus(S.cycle,W(),now()):null,open:[...openSessions],editing:S.edit?Math.max(1,S.edit.ops.length):0,reminders:remState(),cycle:P(),userExercises:S.userExercises,picking:S.picking,query:S.query,results:S.picking?searchResults():[],creating:S.creating})}

 // ----- Programme -----
 function saveCycleExercise(e){later(()=>{if(api&&userId)queueRows({cycle_exercises:[exRow(e)]})})}
 function pickExercise(key){
  const role=Cat.byKey(key)?.role||'finition';
  const cy=draft();
  if(S.picking?.ce){const {s,e}=sessionIn(cy,S.picking.ce);if(!e)return;e.exercise_key=key;e.role=role;refreshSession(s);saveCycleExercise(e)}
  else if(S.picking?.session){
   const s=cy.sessions.find(x=>x.id===S.picking.session);if(!s)return;
   const base=role==='base';
   const e={id:uuid(),cycle_session_id:s.id,position:s.exercises.length,exercise_key:key,role,sets:3,reps_min:base?6:10,reps_max:base?10:15,rest_seconds:base?150:75};
   // Les exercices de base restent avant les finitions.
   const at=base?s.exercises.findIndex(x=>x.role!=='base'):-1;if(at>=0)s.exercises.splice(at,0,e);else s.exercises.push(e);
   refreshSession(s);later(()=>{if(api&&userId)queueRows({cycle_exercises:s.exercises.map(exRow)})});
  }
  S.picking=null;S.query='';S.creating=false;
 }
 async function removeExercise(ceId){
  const {s,e}=sessionIn(P(),ceId);if(!e)return;
  if(s.exercises.length<=1){notice('Une séance garde au moins un exercice.',true);return}
  if(!await confirm(C.nameOf(e.exercise_key,S.userExercises)+' sera retiré de '+s.title+'. Son historique est conservé.',{title:'Retirer cet exercice ?',ok:'Retirer',cancel:'Garder'}))return;
  const ds=sessionIn(draft(),ceId).s;ds.exercises=ds.exercises.filter(x=>x.id!==ceId);refreshSession(ds);
  later(()=>{S.store.forgetCycleExercise(ceId);if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cycle_exercises'&&x.row?.id===ceId));outbox.push({table:'cycle_exercises',op:'delete',id:ceId});queueRows({cycle_exercises:ds.exercises.map(exRow)})}})
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
   case 'v2-choose':S.sheet={type:'recap',session:Planner.nextSession(S.cycle,W(),now())?.session.id,choosing:true};break;
   case 'v2-recap':
    if(current()){S.view='session';S.sheet=null;break}
    if(Planner.today(W(),now())){S.sheet=null;notice('Ta séance du jour est faite. La suivante t’attend demain.');break}
    S.sheet={type:'recap',session:d.session};break;
   case 'v2-recap-choose':S.sheet={type:'recap',session:d.session,choosing:true};break;
   case 'v2-abandon':{
    if(!w)return;
    if(w.exercises.some(e=>e.sets.some(s=>s.completed))&&!await confirm('Les séries déjà validées ne compteront pas : la séance entière est abandonnée.',{title:'Abandonner la séance ?',ok:'Abandonner',cancel:'Continuer la séance'}))return;
    if(!w.exercises.some(e=>e.sets.some(s=>s.completed))&&!await confirm('Elle ne comptera pas et restera ta prochaine séance.',{title:'Abandonner la séance ?',ok:'Abandonner',cancel:'Continuer la séance'}))return;
    S.store.abandon();S.view='home';S.rest=null;S.sheet=null;S.index=0;saveUi();scheduleFlush();notice('Séance abandonnée : elle n’est pas comptée.');break;
   }
   case 'v2-wrong-session':{
    // Mauvaise séance lancée : tant qu'aucune série n'est validée, on annule et on revient au choix.
    if(!w||w.exercises.some(e=>e.sets.some(s=>s.completed)))return;
    const sid=w.cycle_session_id;S.store.abandon();S.view='home';S.rest=null;S.index=0;saveUi();scheduleFlush();
    S.sheet={type:'recap',session:sid,choosing:true};break;
   }
   case 'v2-skip':S.sheet={type:'skip',session:d.session};break;
   case 'v2-skip-confirm':skipSession(d.session,d.reason);break;
   case 'v2-skip-undo':cancelSkip(d.id);break;
   case 'v2-close-sheet':S.sheet=null;S.picking=null;S.creating=false;break;
   case 'v2-back':S.view='session';touch();break;
   case 'v2-exit':S.view='home';S.sheet=null;saveUi();break;
   case 'v2-set':{
    const e=w?.exercises.find(x=>x.id===d.ex),s=e?.sets.find(x=>x.set_number===Number(d.set));if(!s)return;
    if(!s.completed&&s.reps==null){notice('Indique tes répétitions pour valider la série '+s.set_number+'.',true);return}
    // Double appui : le 2e appui (< 0,7 s) est ignoré, jamais une dévalidation silencieuse.
    const tk=e.id+'|'+s.set_number,tn=now();if(lastSetTap.k===tk&&tn-lastSetTap.t<700)return;lastSetTap={k:tk,t:tn};
    if(w.paused_at)S.store.resume(); // valider une série reprend la séance
    S.store.logSet(e.id,s.set_number,{completed:!s.completed});touch();
    if(!s.completed){S.rest=null;S.rate=null}
    if(s.completed){S.rate={ex:e.id,set:s.set_number};startRest(e.plan.rest_seconds||90,S.rate);if(e.sets.every(x=>x.completed)){const items=list(),i=items.findIndex(x=>x.id===e.id);if(i>=0&&i<items.length-1)S.index=i+1}}
    saveUi();scheduleFlush();break;
   }
   case 'v2-rir':{
    const e=w?.exercises.find(x=>x.id===d.ex),s=e?.sets.find(x=>x.set_number===Number(d.set));if(!s?.completed)return;
    const rir=Number(d.rir);S.store.logSet(e.id,s.set_number,{rir});touch();scheduleFlush();
    // Conseil immédiat pour la série suivante (jamais appliqué tout seul) : marge → plus lourd ; échec sous la fourchette → plus léger.
    const next=e.sets.find(x=>!x.completed&&x.set_number>s.set_number);
    if(next&&s.weight!=null){
     if(rir>=3)notice('Belle marge : essaie '+(Number((s.weight+H.increment(s.weight)).toFixed(2))).toLocaleString('fr-FR')+' kg sur la série suivante.');
     else if(rir===0&&s.reps<(e.plan.reps_min||0))notice('Trop lourd : baisse un peu la charge pour rester dans la fourchette.');
    }
    S.rate=null;if(S.rest)S.rest.rate=null;saveUi();break}
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
   case 'v2-skip-ex':S.store.skip(d.ex);S.sheet=null;S.index=Math.min(S.index,Math.max(0,list().length-1));touch();scheduleFlush();break;
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
    // Aucune série validée : la séance ne peut pas compter. On propose de l'abandonner (elle reste la prochaine à faire).
    if(!w.exercises.some(e=>e.sets.some(s=>s.completed))){
     if(!await confirm('Tu n’as validé aucune série : cette séance ne comptera pas et restera ta prochaine séance.',{title:'Abandonner la séance ?',ok:'Abandonner',cancel:'Continuer la séance'}))return;
     S.store.abandon();S.view='home';S.rest=null;S.sheet=null;S.index=0;saveUi();scheduleFlush();notice('Séance abandonnée : elle n’est pas comptée.');break;
    }
    const open=w.exercises.some(e=>e.status!=='skipped'&&e.sets.some(s=>!s.completed));
    if(open&&!await confirm('Les séries non validées ne seront pas comptées.',{title:'Terminer la séance ?',ok:'Terminer',cancel:'Continuer'}))return;
    finishSession();break;
   }
   case 'v2-close-summary':S.summary=null;S.view='home';saveUi();break;
   case 'v2-metric':S.metric=d.metric;break;
   case 'v2-review':if(!S.cycle)return;if(!Rv.available(S.cycle,W(),now())){notice('Le bilan sera disponible pendant la dernière semaine du cycle.');return}if(current()){notice('Termine d’abord ta séance en cours.',true);return}S.view='review';S.sheet=null;break;
   case 'v2-proposal-open':if(!S.proposal)return;S.view='proposal';S.sheet=null;break;
   case 'v2-review-next':if(!S.cycle)return;S.view='next';break;
   case 'v2-review-close':S.view='home';saveUi();break;
   case 'v2-proposal-accept':await acceptProposal();break;
   case 'v2-rem-on':await remRun(()=>Rem.enable({}),'Rappels activés.');return;
   case 'v2-rem-off':await remRun(()=>Rem.disable(),'Rappels désactivés sur ce téléphone.');return;
   case 'v2-rem-test':await remRun(()=>Rem.test(),n=>n?'Essai envoyé : la notification arrive dans quelques secondes.':'Aucun appareil abonné pour l’instant.');return;
   case 'v2-rem-day':{if(!Rem)return;const st=Rem.state(),day=Number(d.day);const days=st.days.includes(day)?st.days.filter(x=>x!==day):[...st.days,day];await remRun(()=>Rem.update({days}));return}
   case 'v2-progress-tab':S.tab=d.tab==='sessions'?'sessions':'exercises';S.open=null;break;
   case 'v2-history-open':S.open=d.id||null;break;
   case 'v2-last-open':S.tab='sessions';S.open=d.id||null;break;
   case 'v2-history-close':S.open=null;break;
   case 'v2-edit-ex':{const o=sessionIn(P(),d.ce).s;if(o)openSessions.add(o.id)}S.picking={ce:d.ce};S.query='';S.creating=false;break;
   case 'v2-add-ex':openSessions.add(d.session);S.picking={session:d.session};S.query='';S.creating=false;break;
   case 'v2-pick':pickExercise(d.key);break;
   case 'v2-remove-ex':await removeExercise(d.ce);break;
   case 'v2-edit-save':saveDraft();break;
   case 'v2-cardio-toggle':S.cardioOpen=!S.cardioOpen;break;
   case 'v2-prog-toggle':if(openSessions.has(d.session))openSessions.delete(d.session);else openSessions.add(d.session);break;
   case 'v2-move-ex':moveExercise(d.ce,Number(d.dir)===-1?-1:1);break;
   case 'v2-edit-cancel':cancelDraft();break;
   case 'v2-create':S.creating=true;break;
   case 'v2-howto':{const e=current()?list()[S.index]:null;if(!e)return;S.sheet={type:'howto',key:e.exercise_key};break}
   case 'v2-cardio-open':S.sheet={type:'cardio',workout:d.workout||''};break;
   case 'v2-cardio-edit':if(!S.cardioLogs.some(c=>c.id===d.id))return;S.sheet={type:'cardio',edit:d.id};break;
   case 'v2-cardio-delete':{
    const row=S.cardioLogs.find(c=>c.id===d.id);if(!row)return;
    if(!await confirm(cardioLabel(row)+' sera retiré de ton historique.',{title:'Supprimer cette activité ?',ok:'Supprimer',cancel:'Garder'}))return;
    S.cardioLogs=S.cardioLogs.filter(c=>c.id!==d.id);S.sheet=null;persistLocal();
    // Retrait côté serveur (sans effet si la ligne n'y est jamais arrivée) ; l'envoi en attente est annulé.
    if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cardio_logs'&&x.row?.id===d.id));outbox.push({table:'cardio_logs',op:'delete',id:d.id});write(K.outbox,outbox);scheduleFlush()}
    notice('Activité supprimée.');break}
   case 'v2-cardio-plan-remove':{
    const cy=draft(),cc=cy.cardio||[];if(!cc.some(c=>c.id===d.id))return;
    cy.cardio=cc.filter(c=>c.id!==d.id);
    later(()=>{if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cycle_cardio'&&x.row?.id===d.id));outbox.push({table:'cycle_cardio',op:'delete',id:d.id});write(K.outbox,outbox);scheduleFlush()}})
    break;
   }
   default:return;
  }
  render();
 }
// ----- Bilan et cycle suivant (proposé localement, activé seulement après validation) -----
 const reviewNow=()=>Rv.review(S.cycle,W(),S.setLogs,S.userExercises,now());
 const fallbackAnswers=()=>({...(G().NolsEngine.defaults||{}),...(ctx.answers?.()||{})});
 function nextDefaults(){return Rv.nextAnswers(S.cycle,reviewNow().recommendation.changes,fallbackAnswers())}
 const NEXT_FIELDS=['daysCount','duration','method','goal','level','equipment','avoid'];
 function proposeNext(form={}){
  if(!S.cycle)return false;
  const changes={};for(const k of NEXT_FIELDS)if(form[k]!=null)changes[k]=String(form[k]).trim().slice(0,200);
  const weeks=Math.min(8,Math.max(6,Number(form.weeks)||6));
  const answers=Rv.nextAnswers(S.cycle,changes,fallbackAnswers());
  try{
   const built=G().NolsEngine.buildCycle(answers);
   const next=C.fromEngine({...built,weeks,answers:built.answers||answers},{uuid,startedAt:iso(now())});
   next.status='proposed';next.from_cycle=S.cycle.id;
   // Le cardio prévu continue dans le cycle suivant.
   next.cardio=(S.cycle.cardio||[]).map(c=>({id:uuid(),cycle_id:next.id,type:c.type,minutes:c.minutes,per_week:c.per_week}));
   S.proposal=next;S.nextAnswers=answers;S.nextWeeks=weeks;write(K.proposal,next);S.view='proposal';
  }catch(e){notice('Programme impossible à préparer : '+e.message,true);return false}
  render();return true;
 }
 async function acceptProposal(){
  const next=S.proposal;if(!next||!S.cycle)return;
  if(current()){notice('Termine d’abord ta séance en cours.',true);return}
  // Le programme a changé ailleurs (autre appareil) depuis ce bilan : on ne remplace pas un cycle qu'on n'a pas évalué.
  if(next.from_cycle!==S.cycle.id){S.proposal=null;storage.removeItem(K.proposal);S.view='home';saveUi();notice('Ton programme a changé depuis ce bilan. Refais le bilan pour préparer le cycle suivant.',true);return}
  if(!await confirm('Ton cycle actuel sera archivé (son historique est conservé) et le nouveau commencera dès ta prochaine séance.',{title:'Démarrer ce cycle ?',ok:'Démarrer',cancel:'Pas encore'}))return;
  const old=S.cycle;old.status='archived';old.ended_at=iso(now());
  next.status='active';next.started_at=iso(now());delete next.from_cycle;
  // Archivé d'abord : un seul cycle actif par compte.
  if(api&&userId){queueRows({cycles:[{...old,user_id:userId}]});queueRows(C.toRows(next,userId))}
  S.cycle=next;S.proposal=null;S.nextAnswers=null;S.nextWeeks=null;storage.removeItem(K.proposal);
  S.userExercises=mergeByKey(S.userExercises,next.user_exercises||[]);
  persistLocal();S.view='home';saveUi();notice('Nouveau cycle lancé. Bonne séance !');
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
 const cardioLabel=c=>({marche:'Marche',course:'Course',velo:'Vélo',elliptique:'Elliptique',rameur:'Rameur',natation:'Natation',escaliers:'Escaliers'}[c.type]||'Cardio')+' ('+c.minutes+' min)';
 async function saveCardio({type,minutes,workout,id}){
  const ok=checkCardio(type,minutes);if(!ok)return false;
  const old=id?S.cardioLogs.find(c=>c.id===id):null;
  if(old){
   // Modification : même ligne (même identifiant), date et séance d'origine conservées.
   const row={...old,type,minutes:ok.m};S.cardioLogs=S.cardioLogs.map(c=>c.id===id?row:c);persistLocal();
   if(api&&userId){outbox=outbox.filter(x=>!(x.table==='cardio_logs'&&!x.op&&x.row?.id===id));outbox.push({table:'cardio_logs',row:{...row,user_id:userId}});write(K.outbox,outbox);scheduleFlush()}
   S.sheet=null;notice('Cardio modifié : '+ok.m+' min.');render();return true;
  }
  const row={id:uuid(),workout_id:workout||null,cycle_id:S.cycle?.id||null,done_on:C.localDate(now()),type,minutes:ok.m};
  S.cardioLogs.unshift(row);persistLocal();
  if(api&&userId){outbox.push({table:'cardio_logs',row:{...row,user_id:userId}});write(K.outbox,outbox);scheduleFlush()}
  S.sheet=null;notice('Cardio enregistré : '+ok.m+' min.');render();return true;
 }
 async function addCardioPlan({type,minutes,per_week}){
  if(!S.cycle)return false;const ok=checkCardio(type,minutes,per_week);if(!ok)return false;
  const cy=draft(),row={id:uuid(),cycle_id:cy.id,type,minutes:ok.m,per_week:ok.p};
  cy.cardio=[...(cy.cardio||[]),row];
  later(()=>{if(api&&userId)queueRows({cycle_cardio:[{...row,user_id:userId}]})});
  render();return true;
 }
 function input({ex,set,field,value}){
  if(!current()||!['weight','reps'].includes(field))return;
  // Valeur refusée : jamais tronquée ni gardée en silence. Charge 0–500 kg (virgule acceptée), répétitions entières 1–100.
  const raw=String(value??'').trim().replace(',','.');let v=raw===''?null:Number(raw);
  const ok=v==null||(field==='weight'?Number.isFinite(v)&&v>=0&&v<=500:Number.isInteger(v)&&v>=1&&v<=100);
  if(!ok){v=null;if(!/[.,]$/.test(String(value)))notice(field==='weight'?'Charge : un nombre entre 0 et 500 kg (ex. 62,5).':'Répétitions : un nombre entier entre 1 et 100.',true)}
  try{S.store.logSet(ex,Number(set),{[field]:v});touch();scheduleFlush()}catch{}
 }
 function change({kind,value,ce}){
  if(kind==='rem-time'){const [h,m]=String(value).split(':').map(Number);remRun(()=>Rem.update({hour:h,minute:m}));return}
  if(kind==='search'){S.query=String(value||'');return}
  if(kind==='progress'){S.selected=value;render();return}
  if(kind==='sets'){const {e}=sessionIn(draft(),ce);const n=Number(value);if(e&&Number.isInteger(n)&&n>=1&&n<=6){e.sets=n;saveCycleExercise(e)}render()}
 }
 function tick(){
  const left=restLeft();
  if(S.rest&&left===0){S.rest=null;saveUi();return {rest:0,done:true,elapsed:S.store?.elapsedSeconds()||0}}
  return {rest:left,elapsed:S.store?.elapsedSeconds()||0,idle:idleMinutes()};
 }
 // Déconnexion : le téléphone cesse de recevoir les rappels de ce compte (au mieux, sans bloquer).
 async function remindersOff(){try{if(Rem?.state().enabled)await Rem.disable()}catch{}}
 return {pickerResultsHTML:()=>UI.pickerResults({query:S.query,results:S.picking?searchResults():[]}),hasDraft:()=>Boolean(S.edit),saveDraft:()=>{saveDraft();render()},cancelDraft:()=>{cancelDraft();render()},remindersOff,proposeNext,saveCardio,addCardioPlan,init,rebuild,whenFresh:()=>fresh,ready:()=>Boolean(S.cycle),todayHTML,statsHTML,programmeHTML,handle,input,change,tick,createExercise,flushNow,pending,
  inSession:()=>Boolean(current())&&S.view==='session',busy:()=>Boolean(current())||pending()>0,state:()=>S};
}
return {create};
});
