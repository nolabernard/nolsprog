const root=document.getElementById('app');
const uniqueId=()=>globalThis.crypto?.randomUUID?.()||('ex-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,11));
const mk=(name,sets,reps,rest)=>({id:uniqueId(),name,sets,reps,rest});
const seed=()=>[
{day:'Lundi',title:'Push A',focus:'Pectoraux · Triceps',ex:[mk('Développé couché barre',3,'6–8',180),mk('Développé incliné haltères',3,'8–10',150),mk('Pec deck',3,'10–15',90),mk('Développé épaules machine',2,'8–12',120),mk('Élévations latérales haltères',3,'12–20',75),mk('Extension triceps corde',3,'10–15',90)]},
{day:'Mardi',title:'Pull A',focus:'Dos · Biceps',ex:[mk('Tirage vertical prise neutre',3,'8–12',120),mk('Rowing machine appui poitrine',3,'8–12',120),mk('Rowing unilatéral haltère',2,'10–12',90),mk('Reverse pec deck',3,'12–20',75),mk('Curl barre EZ',3,'8–12',90),mk('Curl incliné haltères',3,'10–15',90)]},
{day:'Mercredi',title:'Legs',focus:'Jambes complètes',ex:[mk('Hack squat',3,'6–10',180),mk('Presse à cuisses',3,'10–12',120),mk('Soulevé de terre roumain',3,'8–10',180),mk('Leg curl assis',3,'10–15',90),mk('Leg extension',2,'12–15',90),mk('Mollets debout',4,'10–15',75),mk('Crunch machine',3,'12–20',60)]},
{day:'Jeudi',title:'Repos actif',focus:'Marche · Mobilité',ex:[]},
{day:'Vendredi',title:'Upper',focus:'Pectoraux · Dos · Épaules',ex:[mk('Développé incliné machine',3,'8–12',120),mk('Rowing T-bar appui poitrine',3,'8–12',120),mk('Développé convergent pectoraux',2,'10–12',120),mk('Tirage vertical prise large',3,'10–12',120),mk('Développé épaules haltères',2,'8–12',120),mk('Élévations latérales haltères',3,'12–20',75),mk('Reverse pec deck',2,'12–20',75)]},
{day:'Samedi',title:'Épaules + bras',focus:'Deltoïdes · Biceps · Triceps',ex:[mk('Élévations latérales haltères',4,'12–20',75),mk('Oiseau machine',3,'12–20',75),mk('Curl pupitre machine',3,'8–12',90),mk('Extension triceps au-dessus de la tête haltère',3,'10–15',90),mk('Curl marteau haltères',3,'10–15',90),mk('Pushdown triceps barre',3,'10–15',90)]},
{day:'Dimanche',title:'Repos complet',focus:'Récupération',ex:[]}];
const S={plan:null,draft:null,logs:[],start:'',week:1,day:(new Date().getDay()+6)%7,tab:'today',open:'auto',selected:'',metric:'weight',loading:false,notice:'',error:false,finishPrompt:false,importText:'',importPreview:null,importDay:0,editedDay:null,editOpenDay:null};
const STORAGE_KEY='nolsprog-guest-v1';
const API='https://femtfigampvaeetcuoxe.supabase.co';
const KEY='sb_publishable_61IlQxmdV4gQ3IEETp959Q_fEuCCXn9';
const AUTH_KEY='nolsprog-session-v1';
const accountCacheKey=id=>'nolsprog-account-'+id;
const pendingSets=new Map();let syncTimer=null,syncInFlight=false,programSyncPromise=null;
const pendingKey=id=>'steroid-pending-sets-v1:'+id;
const pendingProgramKey=id=>'steroid-pending-program-v1:'+id;
function pendingProgram(uid){if(!uid)return null;try{const data=JSON.parse(localStorage.getItem(pendingProgramKey(uid))||'null');return data?.user_id===uid&&Array.isArray(data.plan)&&data.plan.length===7?data:null}catch{return null}}
function hasPendingChanges(uid){return pendingFor(uid).length>0||Boolean(pendingProgram(uid))}
function clearPrivateCache(uid){if(!uid)return;try{localStorage.removeItem(accountCacheKey(uid));localStorage.removeItem(SESSION_PREFIX+uid);localStorage.removeItem('steroid-rest-v2:'+uid)}catch{}}

const setKey=r=>[r.user_id,r.week_number,r.day_index,r.exercise_id,r.set_number].join('|');
function persistPending(uid){if(!uid)return;try{const rows=[...pendingSets.values()].filter(r=>r.user_id===uid);if(rows.length)localStorage.setItem(pendingKey(uid),JSON.stringify(rows));else localStorage.removeItem(pendingKey(uid))}catch(e){console.warn('Sauvegarde des séries en attente impossible',e)}}
function restorePending(uid){pendingSets.clear();if(!uid)return;try{const rows=JSON.parse(localStorage.getItem(pendingKey(uid))||'[]');if(Array.isArray(rows))for(const r of rows){if(r?.user_id===uid&&Number.isInteger(r.week_number)&&Number.isInteger(r.day_index)&&typeof r.exercise_id==='string'&&Number.isInteger(r.set_number))pendingSets.set(setKey(r),r)}}catch(e){console.warn('Séries en attente illisibles',e)}}
function pendingFor(uid){return [...pendingSets.values()].filter(r=>r.user_id===uid)}
const A={session:null,profile:null,answers:null,step:0,guide:false,view:'app',mode:'login',email:'',busy:false,syncing:false,menuOpen:false,firstName:''};
const T={end:0,remaining:0,running:false,exercise:'',interval:null};
const restKey=()=> 'steroid-rest-v2:'+(A.session?.user?.id||'guest');
function saveRest(){try{localStorage.setItem(restKey(),JSON.stringify({end:T.end,remaining:T.remaining,running:T.running,exercise:T.exercise}))}catch{}}
function restoreRest(){try{const r=JSON.parse(localStorage.getItem(restKey())||'null');if(!r)return;T.exercise=String(r.exercise||'');T.running=Boolean(r.running);T.end=Number(r.end)||0;T.remaining=T.running?Math.max(0,Math.ceil((T.end-Date.now())/1000)):Math.max(0,Number(r.remaining)||0);if(T.running&&T.remaining>0)T.interval=setInterval(updateTimer,250);else T.running=false}catch{}}

const SESSION_PREFIX='steroid-workouts-v1:';
const sessionStorageKey=()=>SESSION_PREFIX+(A.session?.user?.id||'guest');
let workouts={};
function loadWorkouts(){try{workouts=JSON.parse(localStorage.getItem(sessionStorageKey())||'{}')||{}}catch{workouts={}}}
function persistWorkouts(){try{localStorage.setItem(sessionStorageKey(),JSON.stringify(workouts))}catch{setNotice('Impossible de sauvegarder le parcours sur cet appareil.',true)}}
// Completed workout journal is stored in the account's existing program JSON,
// in addition to the local workout cache, so it survives device changes.
function journalEntries(){return Array.isArray(S.plan?.[0]?.workoutHistory)?S.plan[0].workoutHistory:[]}
function journalKey(w){return String(w.week_number)+':'+String(w.day_index)}
function journalRecord(w,week,day){
 const duration=Math.max(0,Number(w.duration_seconds)||0);
 const summary=w.summary||{done:0,total:0,exercises:0};
 return {week_number:week,day_index:day,id:w.id||week+':'+day,started_at:Number(w.started_at)||0,ended_at:Number(w.ended_at)||0,duration_seconds:duration,weight:Number(w.weight)||0,summary:{done:Number(summary.done)||0,total:Number(summary.total)||0,exercises:Number(summary.exercises)||0},cardio:cardioEntries(week,day).filter(x=>x.completed).map(x=>({type:x.type,minutes:x.minutes})),title:String(w.title||'Séance de musculation'),calories_estimate:globalThis.SteroidSession.calories(w.weight,duration,summary.done,summary.total)};
}
function upsertJournal(w,week=S.week,day=S.day){
 if(!S.plan?.[0])return;
 const item=journalRecord(w,week,day),items=journalEntries().filter(x=>journalKey(x)!==journalKey(item));
 items.push(item);S.plan[0].workoutHistory=items;
 persist();if(A.session){syncProgram().catch(e=>setNotice('Carnet enregistré sur cet appareil, synchronisation en attente.',true));syncSessionRecord(item).catch(e=>console.warn('Séance conservée dans le programme, synchronisation dédiée en attente :',e))}
}
// Independent cloud journal: preserve the legacy program journal during migration.
async function syncSessionRecord(item){
 if(!A.session||!item)return;
 const uid=A.session.user.id;
 const toStamp=value=>Number(value)>0?new Date(Number(value)).toISOString():null;
 const payload={user_id:uid,week_number:item.week_number,day_index:item.day_index,title:item.title||'Séance de musculation',status:'completed',started_at:toStamp(item.started_at),ended_at:toStamp(item.ended_at),duration_seconds:item.duration_seconds||0,calories_estimate:item.calories_estimate??null,summary:item.summary||{},legacy_entry:item};
 // Never delete an existing session; the legacy JSON remains the recovery source.
 await cloud('workout_sessions?on_conflict=user_id,week_number,day_index',{method:'POST',prefer:'resolution=merge-duplicates',body:payload});
}
async function loadSessionJournal(){
 if(!A.session||!S.plan?.[0])return;
 const uid=encodeURIComponent(A.session.user.id);
 const rows=await cloud('workout_sessions?user_id=eq.'+uid+'&status=eq.completed&select=week_number,day_index,legacy_entry&limit=2000');
 const existing=new Set(journalEntries().map(journalKey));
 let changed=false;
 for(const row of rows||[]){
  const entry=row.legacy_entry;
  if(!entry||existing.has(journalKey(row)))continue;
  S.plan[0].workoutHistory=[...journalEntries(),entry];
  existing.add(journalKey(row));changed=true;
 }
 if(changed){persist();cacheAccount()}
}
function migrateLocalJournal(){
 if(!S.plan?.[0])return;
 const existing=new Set(journalEntries().map(journalKey));
 let changed=false;
 for(const [key,w] of Object.entries(workouts)){
  if(w?.status!=='finished'||existing.has(key))continue;
  const parts=key.split(':').map(Number);
  if(parts.length!==2||!Number.isInteger(parts[0])||!Number.isInteger(parts[1])||parts[0]<1||parts[1]<0||parts[1]>6)continue;
  const item=journalRecord(w,parts[0],parts[1]);
  S.plan[0].workoutHistory=[...journalEntries(),item];existing.add(key);changed=true;
 }
 if(changed){persist();if(A.session)syncProgram().catch(e=>console.warn('Carnet en attente de synchronisation',e))}
}
function journalUI(){
 const entries=[...journalEntries()].sort((a,b)=>(b.ended_at||0)-(a.ended_at||0));
 if(!entries.length)return '<section class="journal-empty">Aucune séance terminée pour le moment. Tes prochains entraînements apparaîtront ici.</section>';
 return '<div class="journal-list">'+entries.map(w=>{
  const stamp=Number(w.ended_at)||Number(w.started_at),date=stamp?new Date(stamp).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'Semaine '+w.week_number;
  const cal=globalThis.SteroidSession.calories(w.weight,w.duration_seconds,w.summary?.done,w.summary?.total);
  const suspicious=Number(w.duration_seconds)>14400;
  return '<article class="journal-entry"><div class="journal-heading"><strong>'+esc(w.title||'Séance de musculation')+'</strong><small>'+esc(date)+'</small></div><div class="journal-numbers"><span><b>'+esc(globalThis.SteroidSession.duration(w.duration_seconds))+'</b><small>Durée</small></span><span><b>'+(cal===null?'—':'≈ '+cal)+'</b><small>kcal estimées</small></span><span><b>'+(Number(w.summary?.done)||0)+' / '+(Number(w.summary?.total)||0)+'</b><small>Séries</small></span></div>'+(Array.isArray(w.cardio)&&w.cardio.length?'<p class="journal-cardio">Cardio : '+w.cardio.map(x=>esc(CARDIO_TYPES[x.type]||'Cardio')+' · '+Number(x.minutes||0)+' min').join(' · ')+'</p>':'')+(suspicious?'<p class="journal-warning">Durée inhabituelle : le chronomètre a peut-être été laissé actif. Corrige la durée pour obtenir une estimation.</p>':'')+'<button type="button" class="journal-edit" data-action="journal-duration" data-week="'+w.week_number+'" data-day="'+w.day_index+'">Corriger la durée</button></article>';
 }).join('')+'</div>';
}
function workoutId(){return S.week+':'+S.day}
function activeWorkout(){return workouts[workoutId()]||null}
function warmupEntry(exId){return S.plan?.[0]?.sessionWarmups?.[S.week+':'+S.day]?.[exId]||null}
function saveWarmup(exId,change){
 if(!currentPlan()[S.day]?.ex.some(ex=>ex.id===exId))return;
 if(!S.plan[0].sessionWarmups)S.plan[0].sessionWarmups={};
 const key=S.week+':'+S.day,entries=S.plan[0].sessionWarmups[key]||{};
 const previous=entries[exId]||{count:2,rows:[]};
 const next={...previous,...change};
 if(next.count!==2&&next.count!==3)next.count=2;
 entries[exId]=next;S.plan[0].sessionWarmups[key]=entries;
 persist();if(A.session){cacheAccount();syncProgram().catch(()=>setNotice('Échauffement sauvegardé localement, synchronisation en attente.',true))}
 if(activeWorkout()?.status==='finished')refreshFinishedSessionSummary();
 render();
}
function warmupUI(ex){
 const warm=warmupEntry(ex.id);
 let html='<div class="warmup-box"><div class="warmup-top"><div><strong>Échauffement</strong><small>Facultatif · non compté dans les séries de travail</small></div><button type="button" class="warmup-toggle" data-action="warmup-toggle" data-ex="'+esc(ex.id)+'">'+(warm?'Retirer':'＋ Ajouter')+'</button></div>';
 if(!warm)return html+'</div>';
 html+='<div class="warmup-choice"><span>Nombre de séries</span><button type="button" data-action="warmup-count" data-ex="'+esc(ex.id)+'" data-count="2" class="'+(warm.count===2?'active':'')+'">2 séries</button><button type="button" data-action="warmup-count" data-ex="'+esc(ex.id)+'" data-count="3" class="'+(warm.count===3?'active':'')+'">3 séries</button></div>';
 html+='<div class="warmup-rows"><div class="set-row labels"><span>SÉRIE</span><span>KG</span><span>REPS</span><span>FAIT</span></div>';
 for(let i=0;i<warm.count;i++){const row=warm.rows?.[i]||{};html+='<div class="set-row"><strong class="set-index">'+(i+1)+'</strong><input aria-label="Charge échauffement '+(i+1)+'" data-warmup-field="weight" data-ex="'+esc(ex.id)+'" data-set="'+i+'" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="'+esc(row.weight??'')+'"><input aria-label="Répétitions échauffement '+(i+1)+'" data-warmup-field="reps" data-ex="'+esc(ex.id)+'" data-set="'+i+'" type="number" inputmode="numeric" min="0" step="1" placeholder="reps" value="'+esc(row.reps??'')+'"><button type="button" aria-label="Valider échauffement '+(i+1)+'" class="check '+(row.completed?'checked':'')+'" data-action="warmup-complete" data-ex="'+esc(ex.id)+'" data-set="'+i+'">✓</button></div>'}
 html+='</div><p class="warmup-help">Première séance ? Choisis librement tes charges. Les séries d’échauffement restent séparées de ta progression et du volume de travail.</p></div>';
 return html;
}
function updateWarmupRow(exId,index,field,value){
 const warm=warmupEntry(exId);if(!warm||index<0||index>=warm.count)return;
 const rows=Array.from({length:warm.count},(_,i)=>({...warm.rows?.[i]}));
 rows[index][field]=value;
 saveWarmup(exId,{rows});
}

const CARDIO_TYPES=Object.freeze({walking:'Marche',running:'Course à pied',bike:'Vélo',elliptical:'Elliptique',rowing:'Rameur',swimming:'Natation',stairs:'Escaliers',other:'Autre cardio'});
function cardioEntries(week=S.week,day=S.day){
 const plan=week===1?S.plan:S.plan?.[0]?.weeklyPlans?.[week];
 const scheduled=Array.isArray(plan?.[day]?.cardio)?plan[day].cardio:[];
 const rows=S.plan?.[0]?.sessionCardio?.[week+':'+day];
 const logged=Array.isArray(rows)?rows:[];
 const byId=new Map(logged.map(row=>[row.id,row]));
 // The programmed activity supplies its current duration; the session supplies completion.
 const planned=scheduled.map(row=>({...row,minutes:byId.get(row.id)?.minutes??row.minutes,completed:Boolean(byId.get(row.id)?.completed)}));
 // Retain cardio logged directly during a session, even if the programme has since changed.
 return [...planned,...logged.filter(row=>!scheduled.some(item=>item.id===row.id))];
}
function saveCardioEntries(rows){
 if(!S.plan?.[0])return;
 if(!S.plan[0].sessionCardio)S.plan[0].sessionCardio={};
 S.plan[0].sessionCardio[S.week+':'+S.day]=rows;
 persist();
 if(activeWorkout()?.status==='finished')refreshFinishedSessionSummary();
 if(A.session)syncProgram().catch(()=>setNotice('Cardio conservé localement, synchronisation en attente.',true));
 render();
}
function cardioUI(){
 const rows=cardioEntries();
 if(!rows.length)return '';
 const completed=rows.filter(x=>x.completed).reduce((total,x)=>total+Number(x.minutes||0),0);
 return '<section class="cardio-panel" aria-label="Cardio de la séance"><div class="cardio-heading"><div><h3>Cardio prévu</h3><p>Activités définies dans ton programme. Tu peux valider ou ajuster la durée réalisée.</p></div>'+(completed?'<strong>'+completed+' min faites</strong>':'')+'</div>'+
 rows.map(row=>'<div class="cardio-entry"><span class="cardio-name">'+esc(CARDIO_TYPES[row.type]||'Cardio')+'</span><label class="cardio-min-label">Durée <input type="number" inputmode="numeric" min="1" max="600" step="1" data-cardio-minutes="'+esc(row.id)+'" value="'+esc(row.minutes)+'" aria-label="Durée cardio en minutes"></label><span class="cardio-unit">min</span><button type="button" class="cardio-done '+(row.completed?'is-done':'')+'" data-action="cardio-toggle" data-cardio-id="'+esc(row.id)+'" aria-pressed="'+Boolean(row.completed)+'">'+(row.completed?'✓ Fait':'Valider')+'</button></div>').join('')+'</section>';
}
function cardioHistoryUI(){
 const rows=Object.entries(S.plan?.[0]?.sessionCardio||{}).flatMap(([key,items])=>Array.isArray(items)?items.filter(x=>x.completed).map(x=>({...x,key})):[]);
 if(!rows.length)return '';
 const total=rows.reduce((sum,row)=>sum+Number(row.minutes||0),0);
 return '<section class="cardio-history"><h3>Cardio enregistré</h3><p><strong>'+total+' minutes</strong> validées · '+rows.length+' activité(s). Les minutes de cardio ne sont pas comptées dans le volume de musculation.</p></section>';
}

function workoutProgress(){return globalThis.SteroidSession.progress(currentPlan()[S.day],S.logs,S.week,S.day)}
function exercisePrevious(day,ex,set){const previous=previousExerciseLogs(day,ex.name);return previous.find(r=>r.set_number===set+1)||null}
function setFields(ex,set){const row=logFor(S.day,ex.id,set),previous=exercisePrevious(S.day,ex,set);return {weight:row?.weight??previous?.weight??ex.targetWeight??null,reps:row?.reps??previous?.reps??null}}
function completeWithSuggestedValues(exId,set){
 // Allow retroactive correction of all recorded sets, including planned exercises.
 const ex=currentPlan()[S.day]?.ex.find(x=>x.id===exId);if(!ex)return;
 const existing=logFor(S.day,exId,set);
 if(existing?.completed){saveSet(exId,set,'completed',false);return}
 const values=setFields(ex,set);
 // Save only the values explicitly shown to the user; never invent repetitions.
 if(existing?.weight==null&&values.weight!=null)saveSet(exId,set,'weight',Number(values.weight));
 if(existing?.reps==null&&values.reps!=null)saveSet(exId,set,'reps',Number(values.reps));
 saveSet(exId,set,'completed',true);
}
function addSessionExercise(){
 const name=prompt('Nom de l’exercice supplémentaire :');if(name===null)return;
 const sets=prompt('Nombre de séries réalisées (1 à 20) :','3');if(sets===null)return;
 const reps=prompt('Répétitions prévues (ex. 8–12) :','8–12');if(reps===null)return;
 const rest=prompt('Repos en secondes :','90');if(rest===null)return;
 const n=Number(sets),r=Number(rest);
 if(!name.trim()||!Number.isInteger(n)||n<1||n>20||!reps.trim()||!Number.isInteger(r)||r<0||r>3600){setNotice('Vérifie le nom, les séries, les répétitions et le repos.',true);return}
 const key=S.week+':'+S.day;
 if(!S.plan[0].sessionOverrides)S.plan[0].sessionOverrides={};
 const overrides=S.plan[0].sessionOverrides[key]||{};
 const extra=Array.isArray(overrides.__extra)?overrides.__extra:[];
 const id='extra-'+S.week+'-'+S.day+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 S.plan[0].sessionOverrides[key]={...overrides,__extra:[...extra,{id,name:name.trim().slice(0,100),sets:n,reps:reps.trim().slice(0,30),rest:r,targetWeight:null}]};
 if(activeWorkout()?.status==='finished')refreshFinishedSessionSummary();
 persist();
 if(A.session){cacheAccount();syncProgram().catch(()=>setNotice('Exercice enregistré localement, synchronisation en attente.',true))}
 S.open=id;
 setNotice('Exercice ajouté uniquement à cette séance ✓');
}
function refreshFinishedSessionSummary(){
 const w=activeWorkout();if(w?.status!=='finished')return;
 w.summary=workoutProgress();persistWorkouts();upsertJournal(w);
}
function quickEditExercise(exId){
 // A finished workout can still be corrected at the exercise-description level.
 // Logged weights, reps and completion status remain immutable.
 const current=currentPlan()[S.day]?.ex.find(e=>e.id===exId);if(!current)return;
 const name=prompt('Exercice effectué aujourd’hui :',current.name);if(name===null)return;
 const sets=prompt('Nombre de séries (1 à 20) :',String(current.sets));if(sets===null)return;
 const reps=prompt('Répétitions prévues :',String(current.reps));if(reps===null)return;
 const rest=prompt('Repos entre les séries, en secondes :',String(current.rest));if(rest===null)return;
 const n=Number(sets),r=Number(rest);
 if(activeWorkout()?.status==='finished'&&n!==current.sets){setNotice('Séance terminée : conserve le nombre de séries pour préserver ton bilan. Le nom, les répétitions prévues et le repos restent modifiables.',true);return}
 if(!name.trim()||!Number.isInteger(n)||n<1||n>20||!reps.trim()||!Number.isInteger(r)||r<0||r>3600){setNotice('Vérifie le nom, les séries, les répétitions et le repos.',true);return}
 const recorded=S.logs.filter(x=>x.week_number===S.week&&x.day_index===S.day&&x.exercise_id===exId);
 if(n<Math.max(0,...recorded.map(x=>x.set_number))){setNotice('Impossible de retirer une série déjà enregistrée.',true);return}
 const scope=activeWorkout()?.status==='finished'?'1':prompt('Appliquer la modification :\n1 — Uniquement cette séance (recommandé)\n2 — Modifier mon programme','1');
 if(scope===null)return;
 if(scope!=='1'&&scope!=='2'){setNotice('Choisis 1 pour cette séance ou 2 pour le programme.',true);return}
 const updated={name:name.trim().slice(0,100),sets:n,reps:reps.trim().slice(0,30),rest:r};
 if(scope==='1'){
  if(!S.plan[0].sessionOverrides)S.plan[0].sessionOverrides={};
  const key=S.week+':'+S.day;
  S.plan[0].sessionOverrides[key]={...(S.plan[0].sessionOverrides[key]||{}),[exId]:updated};
  persist();
  if(A.session){cacheAccount();syncProgram().catch(()=>setNotice('Modification enregistrée localement, synchronisation en attente.',true))}
  setNotice('Exercice modifié pour cette séance uniquement ✓');
  return;
 }
 const draft=structuredClone(baseWeekPlan()),item=draft[S.day].ex.find(e=>e.id===exId);
 if(!item)return;
 Object.assign(item,updated);
 S.draft=draft;S.editedDay=S.day;savePlan();
}
function sessionElapsed(w){return Math.max(0,Number(w.elapsed_offset_seconds)||0)+Math.max(0,Math.floor((Date.now()-Number(w.started_at||Date.now()))/1000))}
function sessionElapsedText(seconds){return String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function sessionClockUI(w){return '<div class="session-clock" role="timer" aria-label="Durée écoulée de la séance"><span>CHRONOMÈTRE DE SÉANCE</span><strong id="session-clock-value">'+sessionElapsedText(sessionElapsed(w))+'</strong><small>Temps écoulé depuis le début</small></div>'}
setInterval(()=>{const w=activeWorkout();const el=document.getElementById('session-clock-value');if(el&&w?.status==='active')el.textContent=sessionElapsedText(sessionElapsed(w))},1000);
function startWorkout(guided){const id=workoutId(),w=workouts[id];if(w?.status==='finished'){setNotice('Cette séance est déjà terminée.',true);return}workouts[id]=w?.status==='active'?{...w,mode:'guided'}:{id:uniqueId(),status:'active',mode:'guided',started_at:Date.now(),active_exercise_id:currentPlan()[S.day].ex[0]?.id||null};persistWorkouts();render();scrollToSectionTop()}
function selectWorkoutExercise(id){const w=activeWorkout();if(!w||w.status!=='active')return;w.active_exercise_id=id;persistWorkouts();render();scrollToSectionTop()}
async function reopenWorkout(){const w=activeWorkout();if(!w||w.status!=='finished')return;if(!confirm('Rouvrir cette séance ? Elle ne sera plus comptée comme terminée, mais tes séries et tes charges seront conservées.'))return;const key=workoutId();const previous={...w};const history=[...journalEntries()];w.elapsed_offset_seconds=Math.max(0,Number(w.duration_seconds)||0);w.started_at=Date.now();w.status='active';delete w.ended_at;delete w.duration_seconds;delete w.summary;S.plan[0].workoutHistory=history.filter(item=>journalKey(item)!==key);persistWorkouts();persist();S.workoutScreen='';S.finishPrompt=false;render();if(A.session){try{await cloud('workout_sessions?user_id=eq.'+encodeURIComponent(A.session.user.id)+'&week_number=eq.'+S.week+'&day_index=eq.'+S.day,{method:'PATCH',body:{status:'in_progress',started_at:new Date(w.started_at).toISOString(),ended_at:null,duration_seconds:0,calories_estimate:null,summary:{},legacy_entry:null}});await syncProgram();setNotice('Séance rouverte. Tu peux reprendre ton entraînement.')}catch(err){w.status=previous.status;Object.assign(w,previous);S.plan[0].workoutHistory=history;persistWorkouts();persist();render();setNotice('Réouverture non synchronisée : '+err.message,true)}}else setNotice('Séance rouverte. Tu peux reprendre ton entraînement.')}
function finishWorkout(){const w=activeWorkout();if(!w||w.status!=='active')return;w.status='finished';w.ended_at=Date.now();T.running=false;T.remaining=0;clearInterval(T.interval);T.interval=null;saveRest();w.duration_seconds=sessionElapsed(w);w.summary=workoutProgress();w.weight=Number(A.answers?.weight||A.profile?.answers?.weight||0);w.title=currentPlan()[S.day]?.title||'Séance de musculation';persistWorkouts();upsertJournal(w);render();scrollToSectionTop()}
function workoutSummaryUI(w){const p=w.summary||workoutProgress(),cal=globalThis.SteroidSession.calories(w.weight,w.duration_seconds,p.done,p.total),duration=globalThis.SteroidSession.duration(w.duration_seconds),suspicious=Number(w.duration_seconds)>14400;return '<section class="workout-screen workout-finish"><div class="workout-kicker">STÉROÏDE · BILAN</div><div class="workout-success">✓</div><h1>Séance terminée.</h1><p class="workout-motivation">'+esc(globalThis.SteroidSession.motivation(p))+'</p><div class="workout-stats"><div><strong>'+esc(duration)+'</strong><small>Durée enregistrée</small></div><div><strong>'+(cal===null?'—':'≈ '+cal)+' kcal</strong><small>'+(cal===null?'Estimation indisponible':'Estimation indicative')+'</small></div></div><p>'+p.exercises+' exercices · '+p.done+'/'+p.total+' séries validées</p>'+(cardioEntries().some(x=>x.completed)?'<p class="workout-note">Cardio : '+cardioEntries().filter(x=>x.completed).map(x=>esc(CARDIO_TYPES[x.type]||'Cardio')+' · '+x.minutes+' min').join(' · ')+'</p>':'')+'<p class="workout-note">Calories indicatives calculées sur la durée globale (hypothèse 3,5 MET). Le calcul ne distingue pas musculation et cardio et ne constitue pas une mesure. '+(suspicious?'Durée inhabituelle : corrige le chronomètre.':'')+'</p><button class="journal-edit" data-action="journal-duration" data-week="'+S.week+'" data-day="'+S.day+'">Corriger la durée</button><button class="fit-outline" data-action="workout-reopen">Rouvrir cette séance</button><button class="fit-action" data-action="workout-exit">Retour à mon programme →</button></section>'}
function guidedWorkoutUI(){const w=activeWorkout(),p=currentPlan()[S.day];if(!w||w.mode!=='guided')return '';if(w.status==='finished')return workoutSummaryUI(w);const index=Math.max(0,p.ex.findIndex(x=>x.id===w.active_exercise_id)),ex=p.ex[index],progress=workoutProgress();if(!ex)return '';let html='<section class="workout-screen">'+sessionClockUI(w)+'<div class="workout-kicker">SÉANCE GUIDÉE · '+(index+1)+' / '+p.ex.length+'</div><div class="workout-progress"><i style="width:'+progress.percent+'%"></i></div><div class="workout-head"><h1>'+esc(ex.name)+'</h1><p>'+esc(ex.reps)+' répétitions · '+ex.sets+' séries · '+formatRest(ex.rest)+' de repos</p>'+previousResultHint(ex)+'</div><div class="workout-sets"><div class="set-row labels"><span>SÉRIE</span><span>KG</span><span>REPS</span><span>FAIT</span></div>';for(let s=0;s<ex.sets;s++){const r=logFor(S.day,ex.id,s),prev=setFields(ex,s);html+='<div class="set-row"><strong class="set-index">'+(s+1)+'</strong><input data-field="weight" data-ex="'+esc(ex.id)+'" data-set="'+s+'" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="'+esc(prev.weight??'')+'"><input data-field="reps" data-ex="'+esc(ex.id)+'" data-set="'+s+'" type="number" inputmode="numeric" min="0" placeholder="reps" value="'+esc(prev.reps??'')+'"><button class="check '+(r?.completed?'checked':'')+'" data-action="complete" data-ex="'+esc(ex.id)+'" data-set="'+s+'">✓</button></div>'}html+='</div>'+(index===0?warmupUI(ex):'')+'<div class="exercise-quick-actions"><button type="button" class="workout-action workout-action--edit" data-action="quick-edit-exercise" data-ex="'+esc(ex.id)+'"><span aria-hidden="true">✎</span><span>Modifier l’exercice</span></button></div><p class="workout-note">'+progress.done+'/'+progress.total+' séries validées · '+progress.percent+' %</p><div class="workout-navigation"><button data-action="workout-prev" '+(index===0?'disabled':'')+'>← Précédent</button><button data-action="workout-next" '+(index===p.ex.length-1?'disabled':'')+'>Suivant →</button></div><label class="workout-jump-label" for="workout-jump">Changer d’exercice</label><select id="workout-jump" class="select">';p.ex.forEach(x=>{html+='<option value="'+esc(x.id)+'" '+(x.id===ex.id?'selected':'')+'>'+esc(x.name)+'</option>'});return html+'</select>'+cardioUI()+'<div class="workout-footer"><button class="fit-action" data-action="workout-request-finish">Terminer ma séance</button></div>'+(S.finishPrompt?finishPromptUI():'')+'</section>'}
function finishPromptUI(){const p=workoutProgress();return '<div class="workout-confirm" role="dialog" aria-label="Confirmer la fin de séance"><div><h2>Terminer la séance ?</h2><p>'+(p.done<p.total?'Il reste '+(p.total-p.done)+' séries non validées. Tu peux quand même terminer.':'Toutes les séries sont validées.')+'</p><button data-action="workout-confirm-finish" class="fit-action">Confirmer la fin</button><button data-action="workout-cancel-finish" class="fit-outline">Continuer ma séance</button></div></div>'}

const eng=()=>globalThis.NolsEngine;
const timerSeconds=()=>T.running?Math.max(0,Math.ceil((T.end-Date.now())/1000)):T.remaining;
const clockText=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
function updateTimer(){if(T.running&&timerSeconds()===0){T.running=false;T.remaining=0;saveRest();if(T.interval){clearInterval(T.interval);T.interval=null}if(navigator.vibrate)try{navigator.vibrate([100,70,100])}catch{}}const el=document.getElementById('rest-clock');if(el){el.textContent=clockText(timerSeconds());const pill=document.getElementById('rest-timer');if(pill)pill.classList.toggle('timer-done',!T.running&&T.remaining===0)}}
function beginRest(exercise,seconds){if(!seconds||seconds<1)return;T.remaining=seconds;T.end=Date.now()+seconds*1000;T.running=true;T.exercise=exercise;if(T.interval)clearInterval(T.interval);T.interval=setInterval(updateTimer,250);updateTimer();saveRest()}
function timerUI(){if(!T.running&&T.remaining===0)return '';return '<aside id="rest-timer" class="rest-timer" role="timer" aria-label="Chronomètre de récupération"><div class="timer-copy"><small>RÉCUPÉRATION · '+esc(T.exercise)+'</small><strong id="rest-clock">'+clockText(timerSeconds())+'</strong></div><div class="timer-actions"><button type="button" data-action="timer-toggle" aria-label="'+(T.running?'Mettre en pause':'Reprendre')+'">'+(T.running?'Ⅱ':'▶')+'</button><button type="button" data-action="timer-plus" aria-label="Ajouter 30 secondes">+30</button><button type="button" data-action="timer-close" aria-label="Fermer le chronomètre">×</button></div></aside>'}

const req=async(path,{method='GET',body,token,prefer}={})=>{
 const res=await fetch(API+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const txt=await res.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
 if(!res.ok)throw Error(data?.msg||data?.error_description||data?.message||'Erreur réseau ('+res.status+')');return data;
};
const token=()=>A.session?.access_token;
function setSession(s){const oldId=A.session?.user?.id,newId=s?.user?.id;if(oldId&&oldId!==newId){persistPending(oldId);clearPrivateCache(oldId)}if(oldId!==newId){clearInterval(T.interval);T.interval=null;T.running=false;T.remaining=0;T.end=0;T.exercise=''}A.session=s;if(oldId!==newId)restorePending(newId);loadWorkouts();if(s)localStorage.setItem(AUTH_KEY,JSON.stringify(s));else localStorage.removeItem(AUTH_KEY)}
async function renew(){if(!A.session)return false;if(A.session.expires_at&&A.session.expires_at>Date.now()/1000+90)return true;try{const s=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:A.session.refresh_token}});setSession({...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in});return true}catch{setSession(null);return false}}
async function cloud(path,opts={}){if(!await renew())throw Error('Session expirée. Reconnecte-toi.');return req('/rest/v1/'+path,{...opts,token:token()})}
async function loadCloud(){loadWorkouts();restoreRest();
 // Toujours récupérer l'identité depuis Supabase Auth : le cache local peut être ancien.
 try{const freshUser=await req('/auth/v1/user',{token:token()});if(freshUser?.id===A.session?.user?.id){A.session.user=freshUser;setSession(A.session);A.firstName=''}}catch(err){console.warn('Profil Auth non actualisé :',err)}
 const uid=encodeURIComponent(A.session.user.id);
 const [program,profile,logs]=await Promise.all([cloud('user_programs?user_id=eq.'+uid+'&select=plan,start_date&limit=1'),cloud('user_profiles?user_id=eq.'+uid+'&select=answers,method&limit=1'),cloud('workout_sets?user_id=eq.'+uid+'&select=week_number,day_index,exercise_id,set_number,weight,reps,completed&order=week_number.asc&limit=20000')]);
 const queuedProgram=pendingProgram(A.session.user.id);
 A.profile=queuedProgram?.profile||profile?.[0]||null;A.answers=A.profile?.answers||structuredClone(eng().defaults);
 if(queuedProgram||program?.[0]?.plan&&Array.isArray(program[0].plan)){S.plan=queuedProgram?.plan||program[0].plan;S.start=queuedProgram?.start_date||program[0].start_date;S.logs=logs||[];S.week=currentWeek(S.start)}
 else {S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];S.week=currentWeek(S.start)}
 for(const row of pendingFor(A.session.user.id)){S.logs=S.logs.filter(l=>!(l.week_number===row.week_number&&l.day_index===row.day_index&&l.exercise_id===row.exercise_id&&l.set_number===row.set_number));S.logs.push({...row})}
 cacheAccount();if(pendingFor(A.session.user.id).length)flushSets().catch(e=>console.warn('Synchronisation différée',e));if(queuedProgram)flushProgram().catch(e=>console.warn('Programme en attente',e));
 try{ensureWeekPlan(S.week)}catch(e){setNotice('Calendrier indisponible : '+e.message,true)}
 migrateLocalJournal();
 try{await loadSessionJournal()}catch(e){console.warn('Carnet dédié indisponible, utilisation du journal historique :',e)}
 A.view=A.profile?'app':'onboard';A.step=0;render()
}
async function flushProgram(){if(programSyncPromise)return programSyncPromise;
 if(!A.session||!pendingProgram(A.session.user.id))return;
 const uid=A.session.user.id;
 programSyncPromise=(async()=>{while(A.session?.user?.id===uid){
  const payload=pendingProgram(uid);if(!payload)break;
  if(payload.profile)await cloud('user_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:uid,...payload.profile}});
  await cloud('user_programs?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:uid,plan:payload.plan,start_date:payload.start_date}});
  if(localStorage.getItem(pendingProgramKey(uid))===JSON.stringify(payload))localStorage.removeItem(pendingProgramKey(uid));updateSyncStatus();
 }})();
 try{await programSyncPromise}finally{programSyncPromise=null}
}
async function syncProgram(){if(!A.session)return;const uid=A.session.user.id;
 const payload={user_id:uid,plan:structuredClone(S.plan),start_date:S.start,profile:A.profile?{answers:structuredClone(A.profile.answers),method:A.profile.method}:null};
 try{localStorage.setItem(pendingProgramKey(uid),JSON.stringify(payload));updateSyncStatus()}catch(e){setNotice('Sauvegarde locale indisponible : ne quitte pas cette page.',true);throw e}
 try{await flushProgram()}catch(e){setNotice('Programme conservé sur cet appareil, synchronisation en attente.',true);throw e}
}

function cacheAccount(){if(!A.session)return;try{localStorage.setItem(accountCacheKey(A.session.user.id),JSON.stringify({plan:S.plan,start:S.start,logs:S.logs}))}catch{}}
function queueSet(row){if(!A.session)return;const uid=A.session.user.id;const entry={...row,user_id:uid};pendingSets.set(setKey(entry),entry);persistPending(uid);cacheAccount();updateSyncStatus();if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>{flushSets().catch(e=>console.warn('Synchronisation des séries',e))},1100)}
async function flushSets(){
 if(syncInFlight||!pendingSets.size||!A.session)return;
 const uid=A.session.user.id;
 syncInFlight=true;
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null}
 try{
  while(A.session?.user?.id===uid){
   const batch=pendingFor(uid).slice(0,80);
   if(!batch.length)break;
   await cloud('workout_sets?on_conflict=user_id,week_number,day_index,exercise_id,set_number',{method:'POST',prefer:'resolution=merge-duplicates',body:batch});
   // A more recent local edit must remain queued rather than being discarded.
   for(const row of batch){const key=setKey(row);if(pendingSets.get(key)===row)pendingSets.delete(key)}
   persistPending(uid);updateSyncStatus();
  }
 }catch(e){persistPending(uid);setNotice('Synchronisation en attente : tes séries restent sauvegardées sur cet appareil. '+e.message,true)}
 finally{
  syncInFlight=false;
  // A new edit may have been queued while the final batch was being sent.
  if(A.session?.user?.id===uid&&pendingFor(uid).length&&navigator.onLine){
   if(syncTimer)clearTimeout(syncTimer);
   syncTimer=setTimeout(()=>{flushSets().catch(e=>console.warn('Synchronisation différée',e))},3000);
  }
 }
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSets();else updateTimer()});
window.addEventListener('online',()=>{flushSets();flushProgram().catch(e=>console.warn('Programme toujours en attente',e))});
function profileField(f){const val=A.answers[f.key]??'';if(f.type==='multi'||f.type==='days')return '<div class="choice-grid">'+f.options.map((v,i)=>{const value=f.type==='days'?i:v;return '<button type="button" class="choice '+(val.includes(value)?'selected':'')+'" data-action="choice" data-key="'+f.key+'" data-value="'+esc(value)+'"><span>'+esc(v)+'</span><span class="choice-end">'+(val.includes(value)?'✓':'›')+'</span></button>'}).join('')+'</div>';
 if(f.type==='methods')return '<div class="method-list">'+f.options.map(([id,info])=>'<button type="button" class="method '+(val===id?'selected':'')+'" data-action="choice" data-key="method" data-value="'+id+'"><strong>'+esc(info.name)+'</strong><small>'+esc(info.description)+'</small><span class="method-chevron">'+(val===id?'✓':'›')+'</span></button>').join('')+'</div>';
 if(f.type==='select')return '<div class="answer-options">'+f.options.map(([v,label],i)=>'<button type="button" class="answer-card '+(String(val)===String(v)?'selected':'')+'" data-action="choice" data-key="'+f.key+'" data-value="'+esc(v)+'"><span class="answer-icon">'+'<img class="answer-brand-icon" src="./favicon.svg" alt="" aria-hidden="true">'+'</span><span class="answer-label">'+esc(label)+'</span><span class="answer-chevron">'+(String(val)===String(v)?'✓':'›')+'</span></button>').join('')+'</div>';
 return '<input class="select" data-profile="'+f.key+'" type="'+(f.type==='number'?'number':'text')+'" '+(f.min?'min="'+f.min+'"':'')+' '+(f.max?'max="'+f.max+'"':'')+' placeholder="'+esc(f.placeholder||'')+'" value="'+esc(val)+'">';
}

const coachSteps=[
 {eyebrow:'INTERROGATOIRE · 01/03',title:'Alors, p’tite merde… on part de quoi ?',subtitle:'Âge, taille, poids, boulot, sommeil : le coach veut les faits. Pas ton autobiographie.',quip:'Pas de jugement sur ton physique. Ici, on juge seulement les excuses.'},
 {eyebrow:'MISSION · 02/03',title:'Tu veux quoi, au juste ?',subtitle:'Du muscle ? De la force ? Une meilleure forme ? Choisis ton objectif et arrête de négocier avec ton canapé.',quip:'Deux séances sérieuses valent mieux que six séances imaginaires.'},
 {eyebrow:'PLAN D’ATTAQUE · 03/03',title:'Bon. Quand est-ce qu’on bosse ?',subtitle:'Tes jours, ta méthode, tes limites. Le coach prépare le programme ; toi, tu viens t’entraîner.',quip:'Full body, PPL, Upper/Lower… le seul mauvais programme, c’est celui que tu ne fais jamais.'}
];
const onboardingStages=[
 {title:'On fait connaissance.',subtitle:'Quelques repères. Aucun jugement, promis.',keys:['age','height','weight'],quip:'On construit du muscle, pas des complexes.'},
 {title:'Ton quotidien, c’est comment ?',subtitle:'Le meilleur programme tient compte de ta vraie vie.',keys:['job','activity','sleep'],quip:'Ton sommeil et ton boulot comptent autant que tes haltères.'},
 {title:'Tu veux quoi, exactement ?',subtitle:'Choisis ton objectif et ton niveau.',keys:['goal','level','currentSessions'],quip:'Pas besoin de jouer les experts. Je m’adapte.'},
 {title:'On se voit combien de fois ?',subtitle:'Mieux vaut un rythme réaliste qu’une promesse impossible.',keys:['daysCount','duration'],quip:'Trois séances sérieuses valent mieux que six séances fantômes.'},
 {title:'Tu t’entraînes où ?',subtitle:'Dis-moi ton matériel, je construis autour.',keys:['equipment','priority'],quip:'On travaille tout le corps. Tu peux choisir tes priorités.'},
 {title:'Ton agenda, ton programme.',subtitle:'Sélectionne les jours où tu peux vraiment t’entraîner.',keys:['days'],quip:'La récupération fait partie de la progression.'},
 {title:'Derniers réglages.',subtitle:'On ajuste la méthode et les mouvements à éviter.',keys:['method','avoid','limitations'],quip:'Une douleur n’est jamais une excuse à ignorer.'}
];
function coherenceUI(){
 const d=globalThis.SteroidGuide.diagnostic(A.answers);
 return '<section class="fit-onboard coherence-screen"><div class="fit-onboard-head"><button class="fit-back" type="button" data-action="guide-close" aria-label="Retour au questionnaire">‹</button><div class="fit-step-progress"><span class="active"></span><span class="active"></span><span class="active"></span><span class="active"></span><span class="active"></span><span class="active"></span><span class="active"></span></div><span class="fit-step-count">BILAN</span></div><div class="coherence-body"><span class="fit-kicker">ANALYSE DE TON PROGRAMME</span><h1>On ajuste avant de commencer.</h1><p class="coherence-intro">Tes réponses ne sont pas mauvaises. Certaines ne vont simplement pas bien ensemble. Voici les points à améliorer pour construire un programme cohérent.</p><div class="coherence-issues">'+d.issues.map((issue,i)=>'<article class="coherence-issue"><div class="coherence-issue-head"><span class="coherence-index">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(issue.title)+'</strong></div><p>'+esc(issue.reason)+'</p><button type="button" data-action="guide-edit" data-step="'+issue.stage+'">Modifier cette réponse <span aria-hidden="true">↗</span></button></article>').join('')+'</div>'+(d.choices.length?'<h2>Ce que je te conseille</h2><p class="coherence-subtitle">Ces propositions corrigent les incompatibilités d’entraînement détectées. Tes objectifs et tes autres réponses sont conservés.</p><div class="coherence-choices">'+d.choices.map((x,i)=>'<article class="coherence-choice"><div><span class="coherence-tag">'+(i===0?'RECOMMANDÉ':'ALTERNATIVE')+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.why)+'</p></div><button type="button" data-action="guide-apply" data-index="'+i+'">Appliquer <span aria-hidden="true">→</span></button></article>').join('')+'</div>':'')+(d.issues.some(x=>x.code==='LIMITATIONS_REVIEW')?'<p class="coherence-health">Une douleur ou limitation ne doit jamais être effacée pour obtenir un résultat « compatible ». Garde cette information et fais vérifier les mouvements avant de commencer.</p>':'')+'</div><div class="fit-onboard-footer coherence-footer"><button type="button" class="fit-outline" data-action="guide-close">Revoir mes réponses</button></div></section>';
}
function onboardUI(){if(A.guide)return coherenceUI();const stage=onboardingStages[A.step],fields=eng().steps.flatMap(s=>s.fields).filter(f=>stage.keys.includes(f.key));return '<section class="fit-onboard"><div class="fit-onboard-head"><button type="button" class="fit-back" data-action="'+(A.step?'prev-step':'onboard-exit')+'" aria-label="Retour">‹</button><div class="fit-step-progress" aria-label="Étape '+(A.step+1)+' sur '+onboardingStages.length+'">'+onboardingStages.map((_,i)=>'<span class="'+(i<=A.step?'active':'')+'"></span>').join('')+'</div><span class="fit-step-count">'+String(A.step+1).padStart(2,'0')+'/'+String(onboardingStages.length).padStart(2,'0')+'</span></div><div class="fit-onboard-body"><div class="fit-question"><span class="fit-kicker">TON COACH TE DEMANDE</span><h1>'+esc(stage.title)+'</h1><p>'+esc(stage.subtitle)+'</p></div><div class="fit-answers">'+fields.map(f=>'<div class="profile-field"><label class="field-label">'+esc(f.label)+'</label>'+profileField(f)+'</div>').join('')+'</div><div class="fit-coach-line">'+esc(stage.quip)+'</div></div><div class="fit-onboard-footer"><button class="fit-action" data-action="next-step">'+(A.step===onboardingStages.length-1?'Créer mon programme':'Suivant')+' <span>→</span></button></div></section>'}

function accountUI(){
 if(A.mode==='reset'&&A.session)return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">ACCÈS SÉCURISÉ</span><h1>Un nouveau départ.</h1><p>Définis ton mot de passe pour retrouver ton espace.</p></div><form id="password-form" class="auth-form"><label class="field-label">Nouveau mot de passe</label><input name="password" type="password" minlength="8" required autocomplete="new-password"><button class="primary save" type="submit">Enregistrer mon mot de passe <span>→</span></button></form></div>';
 if(A.session)return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">MON ESPACE</span><h1>Heureux de te revoir.</h1><p>'+esc(A.session.user?.email||'Compte connecté')+'</p></div><button class="primary save" data-action="back-app">Reprendre mon entraînement →</button><button class="auth-text-link" data-action="edit-profile">Adapter mon programme</button><button class="auth-text-link" data-action="logout">Me déconnecter</button></div>';
 const signup=A.mode==='signup',recover=A.mode==='recover',verify=A.mode==='verify';
 const title=signup?'Créer mon compte':recover?'Récupérer mon accès':verify?'Confirme ton adresse':'Connexion';
 const intro=signup?'Enregistre ton programme et retrouve tes séances.':recover?'Nous t’enverrons un lien par email.':verify?'Vérifie ta boîte mail et les spams.':'Retrouve ton programme et tes performances.';
 const fields=verify?'':'<form id="auth-form" class="auth-form">'+(signup?'<label class="field-label" for="auth-firstname">Prénom</label><input id="auth-firstname" name="first_name" type="text" maxlength="60" autocomplete="given-name" required placeholder="Ton prénom">':'')+'<label class="field-label" for="auth-email">Adresse email</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="ton@email.fr" value="'+esc(A.email||'')+'">'+(recover?'':'<label class="field-label" for="auth-password">Mot de passe</label><input id="auth-password" name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required minlength="8" placeholder="8 caractères minimum">')+'<button class="primary save" type="submit">'+(recover?'Recevoir le lien':signup?'Créer mon compte':'Me connecter')+' <span aria-hidden="true">→</span></button></form>';
 const alternative=signup?'<p class="auth-switch">Déjà un compte ? <button data-action="auth-login">Me connecter</button></p>':recover||verify?'<p class="auth-switch"><button data-action="auth-login">Retour à la connexion</button></p>':'<p class="auth-switch">Je n’ai pas de compte. <button data-action="auth-signup">Créer mon compte</button></p>';
 return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">STÉROÏDE · TON COACH</span><h1>'+title+'</h1><p>'+intro+'</p></div><div class="auth-glass">'+fields+(verify?'<button class="primary save" data-action="resend-confirm">Renvoyer l’email →</button>':'')+alternative+(!signup&&!recover&&!verify?'<button class="auth-forgot" data-action="auth-recover">Mot de passe oublié ?</button>':'')+'<div class="auth-or"><span>OU</span></div><button class="auth-guest" data-action="guest">Utiliser sans compte <span>↗</span></button></div></div>';
}

async function finishOnboarding(){const p=A.answers;if(Number(p.age)&&Number(p.age)<18){setNotice('STÉROÏDE est réservé aux adultes pour le moment.',true);return}
 const d=globalThis.SteroidGuide.diagnostic(p);
 if(!d.ok){A.guide=true;render();scrollToSectionTop();return}
 let program;
 try{program=eng().buildProgram(p)}catch(e){setNotice(e.message||'Impossible de générer ce programme.',true);return}
 if(A.profile&&(S.logs.length||journalEntries().length)){
 // Keep the current cycle and all recorded exercise IDs unchanged. Apply the
 // updated questionnaire only to the next training week.
 const nextWeek=Math.max(S.week,...S.logs.map(r=>r.week_number),...journalEntries().map(r=>r.week_number))+1;
 if(nextWeek>52){setNotice('Cycle de 52 semaines terminé. Exporte tes données avant de recommencer.',true);return}
 const future=eng().buildProgram(p,nextWeek-1);
 for(let day=0;day<future.length;day++)for(let i=0;i<future[day].ex.length;i++)future[day].ex[i].id='w'+nextWeek+'-d'+day+'-e'+i;
 if(!S.plan[0].weeklyPlans)S.plan[0].weeklyPlans={};
 // Discard only future snapshots without any logged performance.
 for(const week of Object.keys(S.plan[0].weeklyPlans)){
  const n=Number(week);
  if(n>=nextWeek&&!S.logs.some(r=>r.week_number===n)&&!journalEntries().some(r=>r.week_number===n))delete S.plan[0].weeklyPlans[week];
 }
 S.plan[0].weeklyPlans[nextWeek]=future;
 A.profile={answers:structuredClone(p),method:p.method};A.view='app';S.tab='today';A.guide=false;
 persist();render();
 if(A.session){try{await syncProgram();setNotice('Nouveau programme prévu dès la semaine '+nextWeek+'. Historique conservé ✓')}catch(e){setNotice('Modification enregistrée sur cet appareil, synchronisation en attente.',true)}}
 else setNotice('Nouveau programme prévu dès la semaine '+nextWeek+'. Historique conservé ✓');
 return;
}
 S.plan=program;A.profile={answers:structuredClone(p),method:p.method};S.start=iso(monday(new Date()));S.logs=[];S.week=1;S.tab='today';S.open='auto';A.view='app';localStorage.setItem('nolsprog-onboarding-seen','1');if(!A.session)persist();else cacheAccount();render();
 if(A.session){try{await cloud('user_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:A.session.user.id,answers:p,method:p.method}});await syncProgram();A.profile={answers:p,method:p.method};setNotice('Programme personnalisé créé et synchronisé ✓')}catch(e){setNotice('Programme créé localement, mais synchronisation impossible : '+e.message,true)}}
 else setNotice('Programme créé sur cet appareil ✓')
}
async function initAuth(){const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('access_token')&&hash.get('refresh_token')){try{const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');const user=await req('/auth/v1/user',{token:access_token});setSession({access_token,refresh_token,user,expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});history.replaceState(null,'',location.pathname+location.search);if(hash.get('type')==='recovery'){A.view='account';A.mode='reset';render();return}await loadCloud();return}catch(e){history.replaceState(null,'',location.pathname+location.search);setNotice('Lien expiré ou invalide : '+e.message,true)}}try{const saved=localStorage.getItem(AUTH_KEY);if(saved)A.session=JSON.parse(saved)}catch{}if(A.session){restorePending(A.session.user.id);try{if(await renew()){await loadCloud();return}}catch(e){console.warn('NolsProg: chargement du compte impossible',e);try{const cached=JSON.parse(localStorage.getItem(accountCacheKey(A.session.user.id)));if(cached&&Array.isArray(cached.plan)){S.plan=cached.plan;S.start=cached.start;S.logs=cached.logs||[];for(const row of pendingFor(A.session.user.id)){S.logs=S.logs.filter(l=>!(l.week_number===row.week_number&&l.day_index===row.day_index&&l.exercise_id===row.exercise_id&&l.set_number===row.set_number));S.logs.push(row)}S.week=currentWeek(S.start);A.view='app';setNotice('Mode hors ligne : dernières données locales du compte.',true);return}}catch{}A.view='account';render();return}}
 A.view=localStorage.getItem('nolsprog-onboarding-seen')==='1'?'app':'welcome';render()}
function welcomeUI(){return '<section class="fit-entry"><div class="fit-entry-top"><span class="fit-overline">STÉROÏDE · TRAINING CLUB</span><h1>Entraîne-toi<br><em>plus intelligent.</em></h1></div><div class="fit-logo"><img class="steroid-mark" src="./steroid-icon.svg" alt="" aria-hidden="true"><img class="fit-wordmark official-wordmark" src="./steroide-wordmark.svg" alt="STÉROÏDE"></div><div class="fit-entry-bottom"><p>Ton programme. Tes séances.<br>Ta progression, à ton rythme.</p><button class="fit-action" data-action="auth-signup">Commencer <span>→</span></button><button class="fit-outline" data-action="auth-login">Me connecter</button><button class="fit-quiet" data-action="guest">Utiliser sans compte</button></div></section>'}

function persist(){if(A.session){cacheAccount();return true}try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,plan:S.plan,start:S.start,logs:S.logs,answers:A.answers||A.profile?.answers||null}));return true}catch(e){setNotice('Stockage local indisponible : exporte tes données avant de quitter.',true);return false}}
function loadLocal(){loadWorkouts();restoreRest();try{const raw=localStorage.getItem(STORAGE_KEY);const data=raw?JSON.parse(raw):null;if(data&&Array.isArray(data.plan)&&data.plan.length===7&&Array.isArray(data.logs)&&typeof data.start==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.start)){S.plan=data.plan;S.start=data.start;A.answers=data.answers||null;S.logs=data.logs.filter(x=>x&&Number.isInteger(x.week_number)&&Number.isInteger(x.day_index)&&typeof x.exercise_id==='string'&&Number.isInteger(x.set_number)).slice(-20000)}else{S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];persist()}}catch(e){S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];setNotice('Lecture du stockage impossible. Vérifie les paramètres du navigateur.',true)}S.week=currentWeek(S.start);migrateLocalJournal();try{ensureWeekPlan(S.week)}catch(e){setNotice('Calendrier indisponible : '+e.message,true)}render()}
function downloadBackup(){const payload=JSON.stringify({app:'NolsProg',version:1,exported_at:new Date().toISOString(),plan:S.plan,start:S.start,logs:S.logs,answers:A.answers||A.profile?.answers||null},null,2);const blob=new Blob([payload],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='nolsprog-sauvegarde-'+iso(new Date())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monday=d=>{let x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const currentWeek=s=>Math.max(1,Math.floor((monday(new Date())-monday(new Date(s+'T12:00:00')))/604800000)+1);
let noticeTimeout=null;
const setNotice=(msg,error=false)=>{
 S.notice=msg;S.error=error;
 let toast=root.querySelector('.toast');
 if(!toast){toast=document.createElement('div');root.appendChild(toast)}
 toast.className='toast'+(error?' alert':'');
 toast.setAttribute('role',error?'alert':'status');
 toast.setAttribute('aria-live',error?'assertive':'polite');
 toast.textContent=msg;
 if(noticeTimeout)clearTimeout(noticeTimeout);
 noticeTimeout=setTimeout(()=>{if(S.notice!==msg)return;S.notice='';const current=root.querySelector('.toast');if(current)current.remove();noticeTimeout=null},6500);
};
// Weekly plans are immutable snapshots persisted inside the existing plan JSON.
// This preserves exercise IDs and historical set records across navigation/reloads.
function baseWeekPlan(){
 const weeks=S.plan?.[0]?.weeklyPlans;
 return S.week>1&&Array.isArray(weeks?.[S.week])?weeks[S.week]:S.plan;
}
function currentPlan(){
 const base=baseWeekPlan();
 if(!base?.length)return base;
 const overrides=S.plan?.[0]?.sessionOverrides?.[S.week+':'+S.day];
 if(!overrides||!Object.keys(overrides).length)return base;
 const copy=base.slice();
 copy[S.day]={...base[S.day],ex:[...base[S.day].ex.map(ex=>overrides[ex.id]?{...ex,...overrides[ex.id],id:ex.id}:ex),...(Array.isArray(overrides.__extra)?overrides.__extra:[])]};
 return copy;
}
function ensureWeekPlan(week){
 if(week<=1||week>52||!S.plan?.length)return;
 if(!S.plan[0].weeklyPlans)S.plan[0].weeklyPlans={};
 if(S.plan[0].weeklyPlans[week])return;
 const profile=A.profile?.answers||A.answers;
 if(!profile||!globalThis.NolsEngine?.buildProgram)return;
 const generated=eng().buildProgram(profile,week-1);
 // Preserve recurring cardio planned on the base programme when generating a new week.
 for(let day=0;day<generated.length;day++){
  const template=Array.isArray(S.plan?.[day]?.cardio)?S.plan[day].cardio:[];
  if(template.length)generated[day].cardio=structuredClone(template);
 }
 // IDs are scoped to the week; snapshots are never regenerated once recorded.
 for(let day=0;day<generated.length;day++)for(let i=0;i<generated[day].ex.length;i++){
  generated[day].ex[i].id='w'+week+'-d'+day+'-e'+i;
 }
 S.plan[0].weeklyPlans[week]=generated;
 if(A.session){cacheAccount();syncProgram().catch(e=>setNotice('Synchronisation du calendrier en attente : '+e.message,true))}
 else persist();
}
// Compare exercise names across weekly snapshots; IDs are week-scoped.
function previousExerciseLogs(day,name,week=S.week){
 for(let w=week-1;w>=1;w--){
  const plan=w===1?S.plan:S.plan?.[0]?.weeklyPlans?.[w];
  const ex=plan?.[day]?.ex.find(x=>(S.plan?.[0]?.sessionOverrides?.[w+':'+day]?.[x.id]?.name||x.name)===name);
  if(!ex)continue;
  const rows=S.logs.filter(r=>r.week_number===w&&r.day_index===day&&r.exercise_id===ex.id);
  if(rows.length)return rows;
 }
 return [];
}
function progressionHint(ex,day){
 const rows=S.logs.filter(r=>r.week_number===S.week&&r.day_index===day&&r.exercise_id===ex.id);
 const result=globalThis.SteroidProgression?.evaluate(ex,rows);
 if(!result)return '';
 const label=result.status==='verify'?'Vérifier le RIR':result.status==='reps'?'Double progression':'';
 return label?'<div class="progression-advice"><p><strong>'+esc(label)+' :</strong> '+esc(result.message)+'</p>'+(result.status==='verify'?'<button type="button" class="workout-action workout-action--assess" data-action="verify-rir" data-ex="'+esc(ex.id)+'"><span aria-hidden="true">↗</span><span>Évaluer ma marge</span></button>':'')+'</div>':'';
}
const logFor=(d,id,s,w=S.week)=>S.logs.find(l=>l.day_index===d&&l.exercise_id===id&&l.set_number===s+1&&l.week_number===w);
const allEx=()=>currentPlan().flatMap((p,d)=>p.ex.map(ex=>({id:d+'|'+ex.id,label:p.day+' · '+ex.name})));
const formatRest=seconds=>{const n=Math.max(0,Number(seconds)||0);if(n<=60)return n+' s';const m=Math.floor(n/60),s=n%60;return m+' min'+(s?' '+String(s).padStart(2,'0'):'')};
const selectedDate=index=>{const d=new Date(S.start+'T12:00:00');d.setDate(d.getDate()+(S.week-1)*7+index);return d};
const dateText=()=>{const d=new Date(S.start+'T12:00:00');d.setDate(d.getDate()+(S.week-1)*7);const end=new Date(d);end.setDate(d.getDate()+6);return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' – '+end.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})};
const navIcons={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18M8 14h3M8 18h3"/></svg>',
 stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-8M22 20V3"/><path d="M2 20h20"/></svg>',
 edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/></svg>'
};
const buttonNav=(tab,label)=>'<button type="button" class="'+(S.tab===tab?'active':'')+'" data-action="tab" data-tab="'+tab+'" aria-current="'+(S.tab===tab?'page':'false')+'"><span class="tabicon">'+navIcons[tab]+'</span><span class="tab-label">'+label+'</span></button>';
function cycleReviewUI(){
 if(S.week<6||S.week%6!==0)return '';
 const completed=S.logs.filter(r=>r.completed&&r.week_number>=S.week-5&&r.week_number<=S.week).length;
 return '<section class="rest"><h3>Bilan de tes 6 semaines</h3><p>'+completed+' séries validées sur ce cycle. Fais le point sur ta progression, ta récupération et tes exercices. Aucun changement automatique : ton programme reste en place tant que tu ne le modifies pas.</p><button data-action="cycle-review">Faire mon bilan ↗</button></section>';
}

function dayActivity(day,week=S.week){
 const p=currentPlan()?.[day],cardio=cardioEntries(week,day);
 const strength=Boolean(p?.ex?.length),aerobic=cardio.length>0;
 return {kind:strength&&aerobic?'Musculation + cardio':strength?'Musculation':aerobic?'Cardio':'Récupération',details:[strength?p.ex.length+' exercices':null,aerobic?cardio.reduce((n,x)=>n+(Number(x.minutes)||0),0)+' min cardio':null].filter(Boolean).join(' · ')};
}
function previousResultHint(ex,day=S.day){
 const rows=previousExerciseLogs(day,ex.name).filter(r=>r.completed&&r.weight!==null&&r.reps!==null);
 if(!rows.length)return '<p class="session-previous-note">Pas encore de performance précédente.</p>';
 const best=rows.reduce((a,b)=>Number(b.weight)>Number(a.weight)?b:a);
 return '<p class="session-previous-note">Dernière séance : '+esc(best.weight)+' kg × '+esc(best.reps)+' répétitions</p>';
}
function syncStatusUI(){
 if(!A.session)return '';
 return '<span class="sync-state'+(hasPendingChanges(A.session.user.id)?' is-pending':'')+'" id="sync-state" role="status">'+(hasPendingChanges(A.session.user.id)?'Sauvegardé sur cet appareil · synchronisation en attente':'Données locales enregistrées')+'</span>';
}
function updateSyncStatus(){
 const el=document.getElementById('sync-state');if(!el||!A.session)return;
 const pending=hasPendingChanges(A.session.user.id);el.classList.toggle('is-pending',pending);
 el.textContent=pending?'Sauvegardé sur cet appareil · synchronisation en attente':'Données locales enregistrées';
}

function todayUI(){const p=currentPlan()[S.day],cardio=cardioEntries(),hasCardio=cardio.length>0,total=p.ex.reduce((n,e)=>n+e.sets,0),done=p.ex.reduce((n,e)=>n+Array.from({length:e.sets},(_,s)=>logFor(S.day,e.id,s)?.completed?1:0).reduce((a,b)=>a+b,0),0);const days=currentPlan().map((d,i)=>{const date=selectedDate(i),today=iso(date)===iso(new Date()),activity=dayActivity(i);return '<button aria-label="'+esc(d.day+' '+date.toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' · '+activity.kind+(activity.details?' · '+activity.details:''))+'" data-action="day" data-day="'+i+'" class="'+(i===S.day?'active':'')+(today?' is-today':'')+'"><small>'+d.day.slice(0,3).toUpperCase()+'</small><strong>'+date.getDate()+'</strong></button>'}).join('');let main='<div class="eyebrow">MA SÉANCE DU JOUR</div><h1 class="hero-title">Prêt à<br><em>t’entraîner ?</em></h1><div class="week"><button data-action="week" data-step="-1">‹</button><strong>SEMAINE '+S.week+'</strong><button data-action="week" data-step="1">›</button><small>'+dateText()+'</small></div><div class="days">'+days+'</div><section class="hero"><div class="eyebrow">'+esc(p.day.toUpperCase())+' · '+(total&&hasCardio?'MUSCULATION + CARDIO':total?'MUSCULATION':hasCardio?'CARDIO':'RÉCUPÉRATION')+'</div><h2>'+esc(!total&&hasCardio?'Séance cardio':p.title)+'</h2><p>'+esc(!total&&hasCardio?cardio.map(x=>(CARDIO_TYPES[x.type]||'Cardio')+' · '+x.minutes+' min').join(' · '):p.focus)+'</p>'+(total?'<div class="track"><i style="width:'+Math.round(done/total*100)+'%"></i></div><div class="space"><small>'+done+' / '+total+' séries terminées</small><strong>'+Math.round(done/total*100)+'%</strong></div>':'')+'</section>';if(!total&&hasCardio)return main+cardioUI();if(!total)return main+'<section class="rest"><div class="symbol">'+(S.day===3?'↗':'☾')+'</div><h3>'+esc(p.title)+'</h3><p>'+(S.day===3?'20–40 minutes de marche ou cardio léger et 10 minutes de mobilité.':'Récupération complète.')+'</p></section>'+cardioUI();const workout=activeWorkout();if(workout?.status==='active')main+='<div class="workout-entry"><button class="fit-action" data-action="workout-guided">Reprendre ma séance</button></div>';else if(!workout)main+='<div class="workout-entry"><button class="fit-action" data-action="workout-guided">Commencer ma séance</button></div>';else main+='<div class="workout-entry"><button class="fit-outline" data-action="workout-show-summary">Voir le bilan de séance</button></div>';if(S.finishPrompt&&workout?.status==='active')main+=finishPromptUI();main+=cycleReviewUI();main+='<div class="section-title"><h3>Exercices <span>'+p.ex.length+'</span></h3></div>';p.ex.forEach((ex,i)=>{const finished=Array.from({length:ex.sets},(_,s)=>logFor(S.day,ex.id,s)?.completed?1:0).reduce((a,b)=>a+b,0),opened=S.open===ex.id||(S.open==='auto'&&i===0);main+='<section class="exercise"><button class="ex-head" data-action="open" data-id="'+esc(ex.id)+'"><span class="num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name"><strong>'+esc(ex.name)+'</strong><small>'+ex.sets+' séries · '+esc(ex.reps)+' reps · '+(ex.targetWeight!==null&&ex.targetWeight!==undefined?ex.targetWeight+' kg cible · ':'')+formatRest(ex.rest)+' repos</small></span><span class="count">'+finished+'/'+ex.sets+'</span><span class="chevron">'+(opened?'⌄':'›')+'</span></button>';if(opened){main+=(i===0?warmupUI(ex):'')+'<div class="sets"><div class="set-row labels"><span>SÉRIE</span><span>KG</span><span>REPS</span><span>FAIT</span></div>';for(let s=0;s<ex.sets;s++){const r=logFor(S.day,ex.id,s),prev=previousExerciseLogs(S.day,ex.name)[s];main+='<div class="set-row"><strong class="set-index" aria-label="Série '+(s+1)+'">'+(s+1)+'</strong><input data-field="weight" data-ex="'+esc(ex.id)+'" data-set="'+s+'" type="number" inputmode="decimal" min="0" step="0.5" placeholder="'+esc(prev?.weight??ex.targetWeight??'—')+'" value="'+esc(r?.weight??'')+'"><input data-field="reps" data-ex="'+esc(ex.id)+'" data-set="'+s+'" type="number" inputmode="numeric" min="0" step="1" placeholder="'+esc(prev?.reps??'—')+'" value="'+esc(r?.reps??'')+'"><button class="check '+(r?.completed?'checked':'')+'" data-action="complete" data-ex="'+esc(ex.id)+'" data-set="'+s+'">✓</button></div>'}main+='<p class="previous">Charges et répétitions proposées d’après la dernière séance ; modifie-les si nécessaire avant de valider.</p>'+progressionHint(ex,S.day)+'</div>'}main+='<div class="exercise-quick-actions"><button type="button" class="workout-action workout-action--edit" data-action="quick-edit-exercise" data-ex="'+esc(ex.id)+'"><span aria-hidden="true">✎</span><span>Modifier l’exercice</span></button></div></section>'});return main+cardioUI()}
function chartData(){const ex=allEx().some(x=>x.id===S.selected)?S.selected:allEx()[0]?.id;if(!ex)return[];const [d,id]=ex.split('|');const name=currentPlan()[Number(d)]?.ex.find(x=>x.id===id)?.name;return Array.from({length:Math.max(8,S.week)},(_,i)=>{const week=i+1;const weekPlan=week===1?S.plan:S.plan[0]?.weeklyPlans?.[week];const sameName=weekPlan?.[Number(d)]?.ex.find(x=>(S.plan?.[0]?.sessionOverrides?.[week+':'+d]?.[x.id]?.name||x.name)===name)?.id;const rows=S.logs.filter(l=>l.week_number===week&&l.day_index===Number(d)&&l.exercise_id===(sameName||id)&&l.completed&&l.weight!==null&&l.reps!==null);return {week:'S'+(i+1),weight:rows.length?Math.max(...rows.map(r=>Number(r.weight))):null,reps:rows.length?Math.max(...rows.map(r=>Number(r.reps))):null,volume:rows.length?rows.reduce((n,r)=>n+Number(r.weight)*Number(r.reps),0):null}})}
function chartUI(){const values=chartData(),pts=values.map((d,i)=>({x:42+i*(310/Math.max(1,values.length-1)),y:d[S.metric]===null?null:Number(d[S.metric])})),existing=pts.filter(p=>p.y!==null);if(!existing.length)return '<div class="empty-chart">Ton graphique apparaîtra après tes premières séries validées.</div>';const max=Math.max(1,...existing.map(x=>x.y))*1.15;const plotted=existing.map(p=>({x:p.x,y:200-p.y/max*160}));const segments=[];let segment=[];for(const point of pts){if(point.y===null){if(segment.length>1)segments.push(segment);segment=[];continue}segment.push({x:point.x,y:200-point.y/max*160})}if(segment.length>1)segments.push(segment);return '<svg viewBox="0 0 375 235" role="img" aria-label="Évolution des performances"><line x1="42" y1="200" x2="356" y2="200" stroke="#424e4b"/><line x1="42" y1="120" x2="356" y2="120" stroke="#2c353a" stroke-dasharray="4 6"/><line x1="42" y1="40" x2="356" y2="40" stroke="#2c353a" stroke-dasharray="4 6"/><text x="3" y="45" fill="#71817d" font-size="10">'+Math.round(max)+'</text><text x="8" y="204" fill="#71817d" font-size="10">0</text>'+segments.map(points=>'<polyline points="'+points.map(p=>p.x+','+p.y).join(' ')+'" fill="none" stroke="#0b4d3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>').join('')+plotted.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#c7f26f"/>').join('')+values.map((d,i)=>(i%Math.ceil(values.length/6)===0?'<text x="'+(42+i*(310/Math.max(1,values.length-1)))+'" y="226" fill="#89949b" text-anchor="middle" font-size="10">'+esc(d.week)+'</text>':'')).join('')+'</svg>'}

function simpleProgressHint(){
 const records=[];
 for(let d=0;d<7;d++)for(const ex of currentPlan()[d].ex){
  const now=S.logs.filter(x=>x.week_number===S.week&&x.day_index===d&&x.exercise_id===ex.id&&x.completed&&x.weight!==null);
  if(!now.length)continue;
  const past=[];
  for(let w=1;w<S.week;w++){
   const plan=w===1?S.plan:S.plan?.[0]?.weeklyPlans?.[w];
   const prev=plan?.[d]?.ex?.find(x=>x.name===ex.name);
   if(prev)past.push(...S.logs.filter(x=>x.week_number===w&&x.day_index===d&&x.exercise_id===prev.id&&x.completed&&x.weight!==null));
  }
  if(!past.length)continue;
  const latest=Math.max(...now.map(x=>Number(x.weight))),earlier=Math.max(...past.map(x=>Number(x.weight)));
  if(Number.isFinite(latest)&&Number.isFinite(earlier)&&latest>earlier)records.push({name:ex.name,delta:latest-earlier});
 }
 if(!records.length)return '<p class="hint">Valide plusieurs séances pour afficher tes meilleures progressions.</p>';
 const top=records.sort((a,b)=>b.delta-a.delta)[0];
 return '<div class="simple-progress"><strong>Nouvelle meilleure charge : '+esc(top.name)+'</strong><span>+'+esc(top.delta.toLocaleString('fr-FR'))+' kg depuis les semaines précédentes.</span></div>';
}
function statsUI(){const logs=S.logs.filter(x=>x.completed),volume=logs.reduce((n,l)=>n+(Number(l.weight)||0)*(Number(l.reps)||0),0);const options=allEx();return '<div class="eyebrow">TES PERFORMANCES</div><h1 class="hero-title">Les chiffres<br><em>parlent.</em></h1><div class="statsgrid"><div class="stat"><small>SÉRIES VALIDÉES</small><strong>'+logs.length+'</strong></div><div class="stat"><small>VOLUME TOTAL</small><strong>'+Math.round(volume).toLocaleString('fr-FR')+' <sup>kg</sup></strong></div></div><div class="section-title"><h3>Ta progression</h3></div>'+simpleProgressHint()+'<label class="field-label">EXERCICE</label><select class="select" id="exercise-select">'+options.map(x=>'<option value="'+esc(x.id)+'" '+((S.selected||options[0]?.id)===x.id?'selected':'')+'>'+esc(x.label)+'</option>').join('')+'</select><div class="seg">'+[['weight','Charge max'],['reps','Répétitions'],['volume','Volume']].map(([v,t])=>'<button data-action="metric" data-metric="'+v+'" class="'+(S.metric===v?'active':'')+'">'+t+'</button>').join('')+'</div><div class="chart">'+chartUI()+'</div><p class="hint">Les graphiques utilisent les séries validées, semaine par semaine. Volume = kg × répétitions.</p><p class="hint">'+(A.session?'Compte connecté : tes données sont synchronisées avec ton compte.':'Mode invité : tes données restent sur ce téléphone. Elles ne sont envoyées à aucun serveur.')+' Utilise le bouton ↓ en haut pour exporter une sauvegarde ; supprimer les données du navigateur peut effacer les données.</p><section class="journal-section"><div class="section-title"><h3>Carnet de bord</h3></div><p class="hint">Retrouve tes séances terminées, leur durée et une estimation des calories dépensées.</p>'+journalUI()+'</section>'+cardioHistoryUI()}

function importPanelUI(){const preview=S.importPreview;return '<section class="import-panel"><div class="eyebrow">TON ENTRAÎNEMENT, TES CHOIX</div><h2>Importer un programme</h2><p class="hint">Colle une séance ou importe un fichier CSV/TXT. Tu pourras vérifier les exercices avant de les enregistrer. Tout se fait dans ton navigateur.</p><label for="import-text">Programme à importer</label><textarea id="import-text" rows="6" placeholder="Lundi : Pectoraux / Triceps\nDéveloppé couché — 4 x 8 — 70 kg\nDéveloppé incliné — 3 x 10\nMardi : Dos\nTirage vertical — 3 x 12">'+esc(S.importText||'')+'</textarea><label class="import-file-label" for="import-file">Choisir un fichier .csv ou .txt</label><input id="import-file" type="file" accept=".csv,.tsv,.txt,text/plain,text/csv,text/tab-separated-values"><button class="fit-action" data-action="import-preview">Prévisualiser mon import</button><p class="hint">Format CSV : jour;seance;exercice;series;repetitions;repos;charge. Pour un programme sans jour, sélectionne le jour de destination.</p>'+(preview?'<div class="import-preview"><h3>'+preview.count+' exercice(s) reconnu(s)</h3>'+preview.sessions.map((session,i)=>'<div class="import-preview-day"><strong>'+esc(session.day||'Séance unique')+' · '+esc(session.title)+'</strong><p>'+session.ex.map(x=>esc(x.name)+' ('+x.sets+' × '+esc(x.reps)+(x.weight!==null?' · '+x.weight+' kg':'')+')').join(' · ')+'</p></div>').join('')+(preview.multi?'':'<label for="import-day">Jour de destination</label><select id="import-day">'+globalThis.SteroidImport.days.map((d,i)=>'<option value="'+i+'" '+(i===S.importDay?'selected':'')+'>'+d+'</option>').join('')+'</select>')+'<p class="hint">Les séances importées remplaceront les exercices des jours concernés dans le brouillon. Les autres jours resteront inchangés. Aucune modification n’est enregistrée sans confirmation.</p><button class="fit-action" data-action="import-apply">Ajouter au brouillon</button></div>':'')+'</section>'}
function prepareImport(){try{S.importPreview=globalThis.SteroidImport.read(S.importText);render()}catch(e){S.importPreview=null;setNotice('Import : '+e.message,true)}}
function applyImport(){const result=S.importPreview;if(!result)return;const draft=S.draft||structuredClone(currentPlan());for(const session of result.sessions){const d=Number.isInteger(session.day)&&session.day>=0?session.day:S.importDay;if(d<0||d>6){setNotice('Jour de séance invalide.',true);return}const existing=draft[d];S.editedDay=d;S.editOpenDay=d;draft[d]={...existing,title:session.title,focus:'Programme personnel',ex:session.ex.map(x=>({id:uniqueId(),name:x.name,sets:x.sets,reps:x.reps,rest:x.rest,targetWeight:Number.isFinite(x.weight)&&x.weight>=0?x.weight:null}))};}S.draft=draft;S.importPreview=null;S.importText='';render();setNotice('Import ajouté au brouillon. Vérifie les exercices, puis enregistre ton programme.')}


function programCardioUI(day,items){
 return '<div class="program-cardio-editor"><div class="program-cardio-title"><strong>Cardio prévu</strong><small>Activités incluses dans ton programme · durée en minutes</small></div>'+
 items.map((item,index)=>'<div class="program-cardio-row"><span class="program-cardio-name">'+esc(CARDIO_TYPES[item.type]||'Cardio')+'</span><label>Minutes<input type="number" inputmode="numeric" min="1" max="600" step="1" data-program-cardio-minutes="1" data-day="'+day+'" data-index="'+index+'" value="'+esc(item.minutes)+'"></label><button type="button" data-action="program-cardio-delete" data-day="'+day+'" data-index="'+index+'" aria-label="Retirer '+esc(CARDIO_TYPES[item.type]||'cardio')+' du programme">×</button></div>').join('')+
 '<div class="program-cardio-add"><label>Activité<select data-program-cardio-type="'+day+'">'+Object.entries(CARDIO_TYPES).map(([value,label])=>'<option value="'+value+'">'+esc(label)+'</option>').join('')+'</select></label><label>Minutes<input type="number" inputmode="numeric" min="1" max="600" step="1" value="20" data-program-cardio-duration="'+day+'"></label><button type="button" data-action="program-cardio-add" data-day="'+day+'">+ Ajouter du cardio</button></div></div>';
}
function addProgramCardio(day){
 const type=root.querySelector('[data-program-cardio-type="'+day+'"]')?.value;
 const raw=root.querySelector('[data-program-cardio-duration="'+day+'"]')?.value.trim()||'';
 const minutes=Number(raw);
 if(!Object.hasOwn(CARDIO_TYPES,type)||!isValidCardioMinutes(raw,minutes)){setNotice('Choisis une activité et une durée entière entre 1 et 600 minutes.',true);return}
 if(!S.draft?.[day])return;
 if(!Array.isArray(S.draft[day].cardio))S.draft[day].cardio=[];
 S.draft[day].cardio.push({id:'planned-cardio-'+uniqueId(),type,minutes});
 S.editedDay=day;S.editOpenDay=day;render();
}
function isValidCardioMinutes(raw,minutes){return raw.length>0&&[...raw].every(c=>c>='0'&&c<='9')&&Number.isInteger(minutes)&&minutes>=1&&minutes<=600}
function editUI(){const draft=S.draft||baseWeekPlan();return '<div class="eyebrow">TON PROGRAMME, TES RÈGLES</div><h1 class="hero-title">Personnalise<br><em>ton plan.</em></h1><p class="hint">Remplace un exercice, modifie les séries ou ajoute un mouvement. Tu modifies les exercices de la semaine affichée dans Séances. Ton historique reste enregistré et les autres semaines ne changent pas.</p>'+draft.map((p,d)=>'<section class="edit-day program-day"><button type="button" class="program-day-toggle" data-action="toggle-edit-day" data-day="'+d+'" aria-expanded="'+(S.editOpenDay===d)+'"><span class="program-day-label"><strong>'+esc(p.day)+'</strong><small>'+esc(!p.ex.length&&Array.isArray(p.cardio)&&p.cardio.length?'Séance cardio':p.title)+'</small></span><span class="program-day-count">'+p.ex.length+' exercice'+(p.ex.length>1?'s':'')+(Array.isArray(p.cardio)&&p.cardio.length?' · '+p.cardio.length+' cardio':'')+'</span><span class="program-day-chevron" aria-hidden="true">'+(S.editOpenDay===d?'−':'+')+'</span></button><div class="program-day-content" '+(S.editOpenDay===d?'':'hidden')+'>'+p.ex.map((ex,i)=>'<div class="edit-ex" data-sort-day="'+d+'" data-sort-index="'+i+'"><div class="edit-sort-row"><button type="button" class="drag-handle" data-drag-day="'+d+'" data-drag-index="'+i+'" aria-label="Déplacer '+esc(ex.name)+' : maintenir puis glisser" title="Maintenir et glisser pour réordonner">⠿</button><span class="edit-order-label">EXERCICE '+(i+1)+'</span><div class="edit-sort-arrows"><button type="button" data-action="move-exercise" data-day="'+d+'" data-index="'+i+'" data-step="-1" '+(i===0?'disabled':'')+' aria-label="Monter '+esc(ex.name)+'">↑</button><button type="button" data-action="move-exercise" data-day="'+d+'" data-index="'+i+'" data-step="1" '+(i===p.ex.length-1?'disabled':'')+' aria-label="Descendre '+esc(ex.name)+'">↓</button></div></div><input class="edit-name" data-edit="name" data-day="'+d+'" data-index="'+i+'" value="'+esc(ex.name)+'" aria-label="Exercice"><details class="edit-advanced"><summary>Modifier les paramètres</summary><div class="edit-fields"><label>Séries<input type="number" min="1" max="20" data-edit="sets" data-day="'+d+'" data-index="'+i+'" value="'+ex.sets+'"></label><label>Reps<input type="text" data-edit="reps" data-day="'+d+'" data-index="'+i+'" value="'+esc(ex.reps)+'"></label><label>Repos (s)<input type="number" min="0" data-edit="rest" data-day="'+d+'" data-index="'+i+'" value="'+ex.rest+'"></label><button class="delete" data-action="delete" data-day="'+d+'" data-index="'+i+'" title="Supprimer">×</button></div></details></div>').join('')+(p.ex.length?'<button class="add" data-action="add" data-day="'+d+'">+ Ajouter un exercice</button>':d===3||d===6?'<p class="hint">'+(Array.isArray(p.cardio)&&p.cardio.length?'Journée cardio':'Jour de récupération')+'</p>':'<button class="add" data-action="add" data-day="'+d+'">+ Ajouter un exercice</button>')+programCardioUI(d,Array.isArray(p.cardio)?p.cardio:[])+'</div></section>').join('')+'<button class="primary save" data-action="save-plan">Enregistrer mon programme ✓</button><p class="legal">Les modifications s’appliqueront aux prochaines séances. Les séries enregistrées conservent leurs identifiants.</p>'+importPanelUI()}
function accountFirstName(){return String(A.session?.user?.user_metadata?.first_name||A.session?.user?.user_metadata?.given_name||A.firstName||'').trim()}
function settingsUI(){const a=A.profile?.answers||A.answers||{};return '<section class="settings-panel"><div class="eyebrow">MON ESPACE</div><h1>Mes paramètres</h1><p class="hint">Modifie tes informations personnelles.</p><form id="settings-form" class="settings-form"><label>Prénom<input name="first_name" type="text" maxlength="60" autocomplete="given-name" required value="'+esc(accountFirstName())+'"></label><label>Adresse e-mail<input type="email" readonly value="'+esc(A.session?.user?.email||'')+'"></label><p class="hint">Pour des raisons de sécurité, l’adresse e-mail n’est pas modifiable ici.</p><div class="settings-pair"><label>Poids (kg)<input name="weight" type="number" min="30" max="300" step="0.1" value="'+esc(a.weight??'')+'"></label><label>Taille (cm)<input name="height" type="number" min="100" max="240" step="1" value="'+esc(a.height??'')+'"></label></div><button type="submit" class="primary save">Enregistrer mes informations</button></form><div class="settings-links"><button data-action="edit-profile">Modifier mon questionnaire sportif</button><button data-action="settings-back">Retour à mes séances</button><button data-action="logout" class="settings-logout">Se déconnecter</button></div></section>'}
async function saveAccountSettings(form){if(!A.session)return;const data=new FormData(form),firstName=String(data.get('first_name')||'').trim(),weight=String(data.get('weight')||'').trim(),height=String(data.get('height')||'').trim();if(!firstName||firstName.length>60){setNotice('Prénom invalide.',true);return}if((weight&&(!Number.isFinite(Number(weight))||Number(weight)<30||Number(weight)>300))||(height&&(!Number.isFinite(Number(height))||Number(height)<100||Number(height)>240))){setNotice('Vérifie ton poids et ta taille.',true);return}if(A.busy)return;A.busy=true;try{if(!await renew())throw Error('Session expirée. Reconnecte-toi.');const user=await req('/auth/v1/user',{method:'PUT',token:token(),body:{data:{...(A.session.user?.user_metadata||{}),first_name:firstName}}});A.session.user=user;setSession(A.session);A.firstName=firstName;const answers={...(A.profile?.answers||A.answers||eng().defaults),weight:weight||null,height:height||null};await cloud('user_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:A.session.user.id,answers,method:answers.method||'auto'}});A.profile={...(A.profile||{}),answers};A.answers=structuredClone(answers);render();setNotice('Informations enregistrées ✓')}catch(e){setNotice('Enregistrement incomplet : '+e.message,true)}finally{A.busy=false}}
function render(){if(A.view==='welcome'||A.view==='account'||A.view==='onboard'){root.innerHTML='<div class="shell immersive-shell '+(A.view==='welcome'?'is-welcome':A.view==='account'?'is-auth':'is-onboard')+'"><header class="topbar"><div class="brand mobile-wordmark" aria-label="STÉROÏDE">STÉROÏDE</div></header><main>'+(A.view==='welcome'?welcomeUI():A.view==='account'?accountUI():onboardUI())+'</main></div>'+(S.notice?'<div class="toast '+(S.error?'alert':'')+'">'+esc(S.notice)+'</div>':'');return}if(S.loading||!S.plan){root.innerHTML='<div class="boot">STÉROÏDE</div>';return}root.innerHTML='<div class="shell"><header class="topbar app-topbar"><div class="header-main-row"><div class="brand mobile-wordmark" aria-label="STÉROÏDE">STÉROÏDE</div><div class="header-actions">' + '<button class="icon-btn account-menu-trigger" data-action="account-menu" aria-expanded="' + (A.menuOpen?'true':'false') + '" aria-label="Ouvrir le menu du compte" title="Menu du compte"><span aria-hidden="true">•••</span></button>' + (A.menuOpen?'<div class="account-popover" role="menu">'+(A.session?'<button data-action="open-settings" role="menuitem">Mes paramètres</button><button data-action="edit-profile" role="menuitem">Mon questionnaire</button><button data-action="logout" role="menuitem">Se déconnecter</button>':'<button data-action="account" role="menuitem">Se connecter / créer un compte</button>')+'</div>':'') + '</div></div><div class="header-account-status">'+(A.session?'<span class="online-dot" aria-hidden="true"></span> '+(accountFirstName()?'Bonjour '+esc(accountFirstName()):'Mon compte'):'Mode invité')+'</div>'+syncStatusUI()+'</header><main>'+(S.tab==='today'&&S.workoutScreen==='summary'&&activeWorkout()?.status==='finished'?workoutSummaryUI(activeWorkout()):S.tab==='today'&&activeWorkout()?.status==='active'?guidedWorkoutUI():S.tab==='today'?todayUI():S.tab==='stats'?statsUI():S.tab==='settings'?settingsUI():editUI())+'</main><nav class="tabbar" aria-label="Navigation principale" style="--active-tab:'+(S.tab==='stats'?1:S.tab==='edit'?2:0)+';--from-tab:'+(S.previousTab==='stats'?1:S.previousTab==='edit'?2:0)+'">'+buttonNav('today','Séances')+buttonNav('stats','Progression')+buttonNav('edit','Programme')+'</nav></div>'+timerUI()+(S.notice?'<div class="toast '+(S.error?'alert':'')+'">'+esc(S.notice)+'</div>':'')}
function saveSet(ex,s,field,value){const prev=logFor(S.day,ex,s);const row={week_number:S.week,day_index:S.day,exercise_id:ex,set_number:s+1,weight:prev?.weight??null,reps:prev?.reps??null,completed:prev?.completed??false,[field]:value};S.logs=[...S.logs.filter(l=>!(l.week_number===S.week&&l.day_index===S.day&&l.exercise_id===ex&&l.set_number===s+1)),row];persist();if(A.session)queueSet(row);if(activeWorkout()?.status==='finished')refreshFinishedSessionSummary();if(field==='completed'&&value===true&&!prev?.completed&&activeWorkout()?.status!=='finished'){const item=currentPlan()[S.day]?.ex.find(x=>x.id===ex);if(item)beginRest(item.name,item.rest)}render()}
function moveDraftExercise(day,from,to){const list=S.draft?.[day]?.ex;if(!list||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=list.length||to>=list.length||from===to)return false;const [item]=list.splice(from,1);list.splice(to,0,item);return true}
let dragExercise=null;
root.addEventListener('pointerdown',e=>{const handle=e.target.closest('.drag-handle');if(!handle||S.tab!=='edit'||!S.draft)return;if(e.button!==0&&e.pointerType==='mouse')return;const row=handle.closest('.edit-ex');if(!row)return;dragExercise={day:Number(handle.dataset.dragDay),from:Number(handle.dataset.dragIndex),to:Number(handle.dataset.dragIndex),handle,row,pointerId:e.pointerId};handle.setPointerCapture?.(e.pointerId);row.classList.add('is-dragging');e.preventDefault()});
root.addEventListener('pointermove',e=>{const d=dragExercise;if(!d||e.pointerId!==d.pointerId)return;if(e.clientY<70)window.scrollBy(0,-18);else if(e.clientY>window.innerHeight-70)window.scrollBy(0,18);const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.edit-ex');if(hit&&Number(hit.dataset.sortDay)===d.day){d.to=Number(hit.dataset.sortIndex);root.querySelectorAll('.edit-ex.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));if(hit!==d.row)hit.classList.add('is-drop-target')}});
function endExerciseDrag(e){const d=dragExercise;if(!d||e.pointerId!==d.pointerId)return;dragExercise=null;d.row.classList.remove('is-dragging');root.querySelectorAll('.edit-ex.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));if(e.type!=='pointercancel'&&moveDraftExercise(d.day,d.from,d.to))render()}
root.addEventListener('pointerup',endExerciseDrag);
root.addEventListener('pointercancel',endExerciseDrag);
function savePlan(){const draft=S.draft;if(!draft||draft.length!==7)return;
 // Edit the exact week displayed by "Séances", never a different base plan.
 // Recorded sets are immutable: keep their exercise IDs and number of sets.
 const orphaned=S.logs.some(row=>{
  if(row.week_number!==S.week)return false;
  const extra=S.plan?.[0]?.sessionOverrides?.[S.week+':'+row.day_index]?.__extra;
  if(Array.isArray(extra)&&extra.some(ex=>ex.id===row.exercise_id))return false; // Extra exercise belongs to this session, not the program.
  const ex=draft[row.day_index]?.ex.find(e=>e.id===row.exercise_id);
  return !ex||Number(ex.sets)<row.set_number;
 });
 if(orphaned){setNotice('Cet exercice contient des performances enregistrées. Conserve-le et ses séries pour protéger ton historique ; modifie plutôt les séances à venir.',true);return}
 const baseBeforeSave=structuredClone(baseWeekPlan());
 const updated=structuredClone(draft);
 if(S.week===1){
  // Preserve every existing weekly snapshot when updating the base week.
  const snapshots=S.plan?.[0]?.weeklyPlans,oldHistory=S.plan?.[0]?.workoutHistory,oldOverrides=S.plan?.[0]?.sessionOverrides,oldWarmups=S.plan?.[0]?.sessionWarmups,oldCardio=S.plan?.[0]?.sessionCardio;
  S.plan=updated;
  if(snapshots)S.plan[0].weeklyPlans=snapshots;
  if(oldHistory)S.plan[0].workoutHistory=oldHistory;
  if(oldOverrides)S.plan[0].sessionOverrides=oldOverrides;
  if(oldWarmups)S.plan[0].sessionWarmups=oldWarmups;
  if(oldCardio)S.plan[0].sessionCardio=oldCardio;
 }else{
  if(!S.plan[0].weeklyPlans)S.plan[0].weeklyPlans={};
  S.plan[0].weeklyPlans[S.week]=updated;
 }
 // A program edit must not be hidden by an older one-off substitution.
 // Preserve overrides of finished workouts: they describe what was actually performed.
 const overrides=S.plan?.[0]?.sessionOverrides;
 if(overrides){
  for(let day=0;day<7;day++){
   const key=S.week+':'+day,entry=overrides[key];
   if(!entry||workouts[key]?.status==='finished')continue;
   const before=baseBeforeSave?.[day]?.ex||[];
   const after=updated[day]?.ex||[];
   for(const ex of after){
    const prior=before.find(x=>x.id===ex.id);
    if(prior&&['name','sets','reps','rest'].some(field=>prior[field]!==ex[field]))delete entry[ex.id];
   }
   if(!Object.keys(entry).length)delete overrides[key];
  }
 }
 S.draft=null;
 if(Number.isInteger(S.editedDay)&&S.editedDay>=0&&S.editedDay<7)S.day=S.editedDay;
 S.editedDay=null;
 // A guided session may point to an exercise removed by this edit.
 const session=activeWorkout();
 if(session?.status==='active'&&!currentPlan()[S.day].ex.some(ex=>ex.id===session.active_exercise_id)){
  session.active_exercise_id=currentPlan()[S.day].ex[0]?.id||null;
  persistWorkouts();
 }
 persist();
 if(A.session){cacheAccount();syncProgram().catch(e=>setNotice('Synchronisation impossible : '+e.message,true))}
 S.tab='today';S.open='auto';setNotice(A.session?'Programme enregistré ✓':'Programme enregistré sur cet appareil ✓')
}
const scrollToSectionTop=()=>{if(typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:'instant'});const scroller=document.scrollingElement;if(scroller)scroller.scrollTop=0};
root.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='program-cardio-add'){addProgramCardio(Number(b.dataset.day))}else if(a==='program-cardio-delete'){const day=Number(b.dataset.day),index=Number(b.dataset.index);if(!S.draft?.[day]?.cardio?.[index])return;if(!confirm('Retirer cette activité cardio du programme ? Les activités déjà effectuées restent enregistrées.'))return;S.draft[day].cardio.splice(index,1);S.editedDay=day;S.editOpenDay=day;render()}else if(a==='cardio-toggle'){const id=b.dataset.cardioId;saveCardioEntries(cardioEntries().map(x=>x.id===id?{...x,completed:!x.completed}:x))}else if(a==='cardio-remove'){const id=b.dataset.cardioId;if(confirm('Retirer cette activité cardio de la séance ?'))saveCardioEntries(cardioEntries().filter(x=>x.id!==id))}else if(a==='warmup-toggle'){const warm=warmupEntry(b.dataset.ex);if(warm){const key=S.week+':'+S.day;delete S.plan[0].sessionWarmups[key][b.dataset.ex];persist();if(A.session){cacheAccount();syncProgram().catch(()=>{})}render()}else saveWarmup(b.dataset.ex,{count:2,rows:[]})}else if(a==='warmup-count'){saveWarmup(b.dataset.ex,{count:Number(b.dataset.count)})}else if(a==='warmup-complete'){const i=Number(b.dataset.set),warm=warmupEntry(b.dataset.ex);if(warm)updateWarmupRow(b.dataset.ex,i,'completed',!warm.rows?.[i]?.completed)}else if(a==='workout-guided'){startWorkout(true)}else if(a==='workout-classic'){startWorkout(true)}else if(a==='workout-next'||a==='workout-prev'){const p=currentPlan()[S.day],i=p.ex.findIndex(x=>x.id===activeWorkout()?.active_exercise_id),next=p.ex[i+(a==='workout-next'?1:-1)];if(next)selectWorkoutExercise(next.id)}else if(a==='workout-request-finish'){if(activeWorkout()?.status!=='active')return;S.finishPrompt=true;render()}else if(a==='workout-cancel-finish'){S.finishPrompt=false;render()}else if(a==='workout-confirm-finish'){S.finishPrompt=false;S.workoutScreen='summary';finishWorkout()}else if(a==='workout-reopen'){await reopenWorkout()}else if(a==='workout-show-summary'){S.workoutScreen='summary';render()}else if(a==='workout-exit'){S.workoutScreen='';render()}else if(a==='timer-toggle'){if(T.running){T.remaining=timerSeconds();T.running=false;clearInterval(T.interval);T.interval=null}else if(T.remaining>0){T.end=Date.now()+T.remaining*1000;T.running=true;T.interval=setInterval(updateTimer,250)}saveRest();render()}else if(a==='timer-plus'){T.remaining=timerSeconds()+30;if(T.running)T.end=Date.now()+T.remaining*1000;saveRest();render()}else if(a==='timer-close'){T.running=false;T.remaining=0;clearInterval(T.interval);T.interval=null;saveRest();render()}else if(a==='auth-login'){A.mode='login';A.view='account';render()}else if(a==='auth-signup'){A.mode='signup';A.view='account';render()}else if(a==='auth-recover'){A.mode='recover';A.view='account';render()}else if(a==='resend-confirm'){if(!A.email){setNotice('Renseigne ton email pour renvoyer la confirmation.',true);return}try{await req('/auth/v1/resend',{method:'POST',body:{type:'signup',email:A.email,options:{emailRedirectTo:location.origin+location.pathname}}});setNotice('Si ton adresse est en attente de confirmation, un nouvel email a été demandé.')}catch(err){setNotice('Impossible de renvoyer le message : '+err.message,true)}}else if(a==='back-app'){A.view='app';render()}else if(a==='account-menu'){A.menuOpen=!A.menuOpen;render()}else if(a==='open-settings'){A.menuOpen=false;S.tab='settings';render()}else if(a==='settings-back'){S.tab='today';render()}else if(a==='logout'){if(A.busy)return;A.busy=true;await flushSets();if(syncInFlight||programSyncPromise||hasPendingChanges(A.session?.user?.id)){A.busy=false;setNotice('Déconnexion bloquée : des données ne sont pas encore synchronisées. Reconnecte-toi au réseau et réessaie.',true);return}try{await req('/auth/v1/logout',{method:'POST',token:token()})}catch(e){console.warn('Déconnexion distante indisponible',e)}const previousUserId=A.session?.user?.id;clearPrivateCache(previousUserId);setSession(null);A.profile=null;A.answers=null;A.firstName='';A.menuOpen=false;workouts={};S.logs=[];S.plan=seed();S.start=iso(monday(new Date()));S.week=currentWeek(S.start);S.tab='today';S.draft=null;A.view='welcome';A.busy=false;render()}else if(a==='edit-profile'){A.menuOpen=false;A.answers=structuredClone(A.profile?.answers||eng().defaults);A.step=0;A.view='onboard';render()}else if(a==='start-account'){A.view='account';A.mode='signup';render()}else if(a==='start-onboard'){A.answers=structuredClone(eng().defaults);A.view='onboard';A.step=0;render();scrollToSectionTop()}else if(a==='keep-plan'){localStorage.setItem('nolsprog-onboarding-seen','1');A.view='app';render()}else if(a==='guest'){A.view='onboard';A.step=0;A.answers=structuredClone(eng().defaults);render()}else if(a==='forgot-password'){const email=prompt('Quelle adresse email est associée à ton compte ?');if(!email)return;try{await req('/auth/v1/recover',{method:'POST',body:{email:email.trim(),redirect_to:location.origin+location.pathname}});setNotice('Si ce compte existe, un email pour définir ton mot de passe va arriver. Regarde aussi les spams.')}catch(e){setNotice('Envoi impossible : '+e.message,true)}}else if(a==='auth-mode'){A.mode=A.mode==='signup'?'login':'signup';render()}else if(a==='account'){A.view='account';A.mode='login';render()}else if(a==='onboard-exit'){A.view=A.session?'app':'welcome';render()}else if(a==='guide-close'){A.guide=false;render();scrollToSectionTop()}else if(a==='guide-edit'){A.guide=false;A.step=Math.max(0,Math.min(onboardingStages.length-1,Number(b.dataset.step)||0));render();scrollToSectionTop()}else if(a==='guide-apply'){
 const d=globalThis.SteroidGuide.diagnostic(A.answers),choice=d.choices[Number(b.dataset.index)];if(!choice)return;
 A.answers=globalThis.SteroidGuide.change(A.answers,choice.patch);
 const next=globalThis.SteroidGuide.diagnostic(A.answers);
 if(next.ok){A.guide=false;A.step=onboardingStages.length-1;render();scrollToSectionTop();setNotice('Ajustement appliqué. Vérifie tes réponses, puis crée ton programme.')}else{A.guide=true;render();scrollToSectionTop()}
 }else if(a==='prev-step'){A.step=Math.max(0,A.step-1);render();scrollToSectionTop()}else if(a==='next-step'){if(A.step<onboardingStages.length-1){A.step++;render();scrollToSectionTop()}else {await finishOnboarding();scrollToSectionTop()}}else if(a==='choice'){A.guide=false;const key=b.dataset.key,v=b.dataset.value;if(key==='days'||key==='priority'){const value=key==='days'?Number(v):v;A.answers[key]=A.answers[key].includes(value)?A.answers[key].filter(x=>x!==value):[...A.answers[key],value]}else A.answers[key]=v;render()}else if(a==='tab'){A.menuOpen=false;if(b.dataset.tab==='edit'){S.draft=structuredClone(baseWeekPlan());S.editedDay=null;S.editOpenDay=null;}S.previousTab=S.tab;S.tab=b.dataset.tab;render();scrollToSectionTop()}else if(a==='day'){S.workoutScreen='';S.finishPrompt=false;S.day=Number(b.dataset.day);S.open='auto';render();scrollToSectionTop()}else if(a==='week'){S.workoutScreen='';S.finishPrompt=false;S.week=Math.max(1,Math.min(52,S.week+Number(b.dataset.step)));try{ensureWeekPlan(S.week)}catch(e){setNotice('Impossible de préparer cette semaine : '+e.message,true)}S.open='auto';render();scrollToSectionTop()}else if(a==='open'){S.open=(S.open===b.dataset.id||(S.open==='auto'&&currentPlan()[S.day].ex[0]?.id===b.dataset.id))?null:b.dataset.id;render()}else if(a==='complete'){completeWithSuggestedValues(b.dataset.ex,Number(b.dataset.set))}else if(a==='quick-edit-exercise'){quickEditExercise(b.dataset.ex)}else if(a==='session-add-exercise'){addSessionExercise()}else if(a==='cycle-review'){
 const fatigue=confirm('Bilan du cycle : as-tu ressenti une fatigue importante ou une récupération insuffisante ?');
 const plateau=confirm('As-tu stagné sur plusieurs exercices pendant ce cycle ?');
 setNotice(fatigue?'Réduis temporairement la charge de travail et privilégie la récupération. Aucun changement automatique.':plateau?'Envisage de modifier un ou deux exercices ou leur progression dans Programme.':'Continue ton programme : aucun changement n’est nécessaire si tu progresses et récupères bien.');
 }else if(a==='verify-rir'){
 const ex=currentPlan()[S.day]?.ex.find(x=>x.id===b.dataset.ex);
 if(!ex)return;
 if(!confirm('Toutes les répétitions ont-elles été réalisées avec une technique propre, sans douleur anormale ?'))return;
 const input=prompt('Combien de répétitions supplémentaires aurais-tu pu faire à la fin de ta dernière série ? (RIR : 0 à 5)');
 if(input===null)return;
 const rir=Number(input);
 if(!Number.isInteger(rir)||rir<0||rir>5){setNotice('RIR invalide : saisis un entier entre 0 et 5.',true);return}
 const rows=S.logs.filter(r=>r.week_number===S.week&&r.day_index===S.day&&r.exercise_id===ex.id);
 const result=globalThis.SteroidProgression.evaluate(ex,rows,{technique:true,rir});
 setNotice(result.message,result.status!=='increase');
 }else if(a==='journal-duration'){
 const week=Number(b.dataset.week),day=Number(b.dataset.day),item=journalEntries().find(x=>x.week_number===week&&x.day_index===day);
 if(!item)return;
 const value=prompt('Durée réelle de cette séance, en minutes (exemple : 75 pour 1 h 15) :',String(Math.round((item.duration_seconds||0)/60)));
 if(value===null)return;
 const minutes=Number(value.replace(',','.'));
 if(!Number.isFinite(minutes)||minutes<1||minutes>240){setNotice('Indique une durée entre 1 et 240 minutes.',true);return}
 item.duration_seconds=Math.round(minutes*60);
 item.calories_estimate=globalThis.SteroidSession.calories(item.weight,item.duration_seconds,item.summary?.done,item.summary?.total);
 const local=workouts[week+':'+day];if(local?.status==='finished'){local.duration_seconds=item.duration_seconds;persistWorkouts()}
 persist();if(A.session)syncProgram().catch(e=>setNotice('Correction sauvegardée localement, synchronisation en attente.',true));
 render();
 }else if(a==='metric'){S.metric=b.dataset.metric;render()}else if(a==='toggle-edit-day'){const day=Number(b.dataset.day);S.editOpenDay=S.editOpenDay===day?null:day;render()}else if(a==='move-exercise'){if(moveDraftExercise(Number(b.dataset.day),Number(b.dataset.index),Number(b.dataset.index)+Number(b.dataset.step))){S.editedDay=Number(b.dataset.day);render()}}else if(a==='add'){const d=Number(b.dataset.day);S.draft[d].ex.push(mk('Nouvel exercice',3,'8–12',90));S.editedDay=d;S.editOpenDay=d;render()}else if(a==='delete'){const d=Number(b.dataset.day),i=Number(b.dataset.index),exercise=S.draft?.[d]?.ex?.[i];if(!exercise)return;if(!confirm('Retirer « '+exercise.name+' » du brouillon ? Cette action ne modifiera pas les séances déjà enregistrées.'))return;S.draft[d].ex.splice(i,1);S.editedDay=d;render()}else if(a==='import-preview'){S.importText=root.querySelector('#import-text')?.value||'';prepareImport()}else if(a==='import-apply'){applyImport()}else if(a==='save-plan')await savePlan();else if(a==='backup'){downloadBackup()}});
root.addEventListener('change',async e=>{const el=e.target;if(el.dataset.programCardioMinutes){const day=Number(el.dataset.day),index=Number(el.dataset.index),raw=el.value.trim(),minutes=Number(raw);if(!isValidCardioMinutes(raw,minutes)){setNotice('Durée prévue : indique entre 1 et 600 minutes.',true);render();return}const row=S.draft?.[day]?.cardio?.[index];if(row){row.minutes=minutes;S.editedDay=day}return}if(el.dataset.cardioMinutes){const raw=el.value.trim(),minutes=Number(raw);if(!(raw.length>0&&[...raw].every(c=>c>='0'&&c<='9'))||!Number.isInteger(minutes)||minutes<1||minutes>600){setNotice('La durée du cardio doit être comprise entre 1 et 600 minutes.',true);render();return}saveCardioEntries(cardioEntries().map(x=>x.id===el.dataset.cardioMinutes?{...x,minutes}:x));return}if(el.dataset.profile&&A.answers){A.answers[el.dataset.profile]=el.value;return}if(el.id==='import-file'){const file=el.files?.[0];if(!file)return;if(file.size>150000){setNotice('Fichier trop volumineux : maximum 150 Ko.',true);return}try{S.importText=await file.text();S.importPreview=null;render();setNotice('Fichier chargé. Clique sur Prévisualiser mon import.')}catch{setNotice('Impossible de lire ce fichier.',true)}return}if(el.id==='import-day'){S.importDay=Number(el.value);return}if(el.id==='workout-jump'){selectWorkoutExercise(el.value);return}if(el.id==='exercise-select'){S.selected=el.value;render();return}if(el.dataset.warmupField){const v=el.value.trim();if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>(el.dataset.warmupField==='weight'?3000:1000)))return;updateWarmupRow(el.dataset.ex,Number(el.dataset.set),el.dataset.warmupField,v===''?null:Number(v));return}if(el.dataset.field){const v=el.value.trim();if(v&&!Number.isFinite(Number(v)))return;if(v!==''&&(Number(v)<0||Number(v)>(el.dataset.field==='weight'?3000:1000)))return;saveSet(el.dataset.ex,Number(el.dataset.set),el.dataset.field,v===''?null:Number(v));return}if(el.dataset.edit){const d=Number(el.dataset.day),i=Number(el.dataset.index),field=el.dataset.edit;let v=el.value;if(field==='sets')v=Math.max(1,Math.min(20,Number(v)||1));if(field==='rest')v=Math.max(0,Math.min(3600,Number(v)||0));if(field==='name')v=v.slice(0,100).trim()||'Exercice';if(field==='reps')v=v.slice(0,30);S.draft[d].ex[i][field]=v;S.editedDay=d}});
root.addEventListener('submit',async e=>{
 if(e.target.id==='settings-form'){e.preventDefault();await saveAccountSettings(e.target);return}
 if(e.target.id==='password-form'){e.preventDefault();const password=String(new FormData(e.target).get('password')||'');if(password.length<8)return;try{await req('/auth/v1/user',{method:'PUT',token:token(),body:{password}});A.mode='login';await loadCloud();setNotice('Mot de passe enregistré ✓')}catch(err){setNotice('Impossible de définir le mot de passe : '+err.message,true)}return}
 if(e.target.id!=='auth-form')return;
 e.preventDefault();if(A.busy)return;A.busy=true;
 const data=new FormData(e.target),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');A.email=email;
 try{
  if(A.mode==='recover'){await req('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:{email}});setNotice('Si cette adresse possède un compte, un lien de récupération a été demandé. Vérifie aussi les spams.');return}
  if(password.length<8)throw Error('Le mot de passe doit contenir au moins 8 caractères.');
  const signup=A.mode==='signup';
  const path=signup?'/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+location.pathname):'/auth/v1/token?grant_type=password';
  const firstName=String(data.get('first_name')||'').trim();if(signup&&(!firstName||firstName.length>60))throw Error('Indique ton prénom.');if(signup)A.firstName=firstName;const s=await req(path,{method:'POST',body:signup?{email,password,data:{first_name:firstName}}:{email,password}});
  if(!s.access_token){A.mode='verify';A.view='account';render();setNotice('Vérifie ton email pour activer le compte. Tu pourras renvoyer le lien depuis cet écran.');return}
  if(!signup)A.firstName='';setSession({...s,expires_at:Math.floor(Date.now()/1000)+(s.expires_in||3600)});
  await loadCloud();setNotice('Compte connecté ✓');
 }catch(err){setNotice('Connexion : '+err.message,true)}
 finally{A.busy=false}
});
loadLocal();initAuth();
window.SteroidUpdates?.start({
 isSafe:()=>A.view==='app'&&activeWorkout()?.status!=='active'&&!A.busy&&!syncInFlight&&!programSyncPromise&&!hasPendingChanges(A.session?.user?.id)&&!(S.tab==='edit'&&S.draft)&&!document.querySelector('input:focus,textarea:focus,select:focus'),
 autoOnLaunch:true
});

