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
const S={plan:null,draft:null,logs:[],start:'',week:1,day:(new Date().getDay()+6)%7,tab:'today',open:'auto',selected:'',metric:'weight',loading:false,notice:'',error:false,finishPrompt:false,importText:'',importPreview:null,importDay:0,editedDay:null,editOpenDay:null,archiveMonth:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-01',archiveSelected:''};
const STORAGE_KEY='nolsprog-guest-v1';
const API='https://femtfigampvaeetcuoxe.supabase.co';
const KEY='sb_publishable_61IlQxmdV4gQ3IEETp959Q_fEuCCXn9';
const AUTH_KEY='nolsprog-session-v1';
const accountCacheKey=id=>'nolsprog-account-'+id;
const pendingSets=new Map();let syncTimer=null,syncInFlight=false,programSyncPromise=null;
const pendingKey=id=>'steroid-pending-sets-v1:'+id;
const pendingProgramKey=id=>'steroid-pending-program-v1:'+id;
function pendingProgram(uid){if(!uid)return null;try{const data=JSON.parse(localStorage.getItem(pendingProgramKey(uid))||'null');return data?.user_id===uid&&(data.profile||Array.isArray(data.plan)&&data.plan.length===7)?data:null}catch{return null}}
function hasPendingChanges(uid){return pendingFor(uid).length>0||Boolean(pendingProgram(uid))}
// Données V1 et V2 : jamais « Enregistré sur ton compte » tant que l'une des deux attend un envoi.
function anyPending(uid){return hasPendingChanges(uid)||Boolean(v2Pending())}
function v2Pending(){try{return V2?.pending()||0}catch{return 0}}
function clearPrivateCache(uid){if(!uid)return;try{localStorage.removeItem(accountCacheKey(uid));localStorage.removeItem(SESSION_PREFIX+uid);localStorage.removeItem('steroid-rest-v2:'+uid);for(const k of ['nolsprog-v2-reminders:','nolsprog-v2-cycle:','nolsprog-v2-history:','nolsprog-v2-ui:','nolsprog-v2-outbox:','steroid-v2-workout:','steroid-v2-queue:'])localStorage.removeItem(k+uid)}catch{}}

const setKey=r=>[r.user_id,r.week_number,r.day_index,r.exercise_id,r.set_number].join('|');
function persistPending(uid){if(!uid)return;try{const rows=[...pendingSets.values()].filter(r=>r.user_id===uid);if(rows.length)localStorage.setItem(pendingKey(uid),JSON.stringify(rows));else localStorage.removeItem(pendingKey(uid))}catch(e){console.warn('Sauvegarde des séries en attente impossible',e)}}
function restorePending(uid){pendingSets.clear();if(!uid)return;try{const rows=JSON.parse(localStorage.getItem(pendingKey(uid))||'[]');if(Array.isArray(rows))for(const r of rows){if(r?.user_id===uid&&Number.isInteger(r.week_number)&&Number.isInteger(r.day_index)&&typeof r.exercise_id==='string'&&Number.isInteger(r.set_number))pendingSets.set(setKey(r),r)}}catch(e){console.warn('Séries en attente illisibles',e)}}
function pendingFor(uid){return [...pendingSets.values()].filter(r=>r.user_id===uid)}
const A={session:null,profile:null,answers:null,step:0,guide:false,view:'app',mode:'login',email:'',busy:false,syncing:false,menuOpen:false,firstName:'',demo:(()=>{try{return localStorage.getItem('nolsprog-demo')==='1'}catch{return false}})()};

const SESSION_PREFIX='steroid-workouts-v1:';
// Keep active session checkpoints separate from completed workout history.
// Write only matching revision numbers so a stale device cannot silently replace a newer checkpoint.

// Completed workout journal is stored in the account's existing program JSON,
// in addition to the local workout cache, so it survives device changes.
// Independent cloud journal: preserve the legacy program journal during migration.





const eng=()=>globalThis.NolsEngine;

const req=async(path,{method='GET',body,token,prefer,keepalive}={})=>{
 const res=await fetch(API+path,{method,...(keepalive?{keepalive:true}:{}),headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const txt=await res.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
 if(!res.ok){const err=Error(data?.msg||data?.error_description||data?.message||'Erreur réseau ('+res.status+')');err.status=res.status;err.code=data?.code;throw err}return data;
};
const token=()=>A.session?.access_token;
function setSession(s){const oldId=A.session?.user?.id,newId=s?.user?.id;if(oldId&&oldId!==newId){persistPending(oldId);clearPrivateCache(oldId)}A.session=s;if(oldId!==newId)restorePending(newId);if(s)localStorage.setItem(AUTH_KEY,JSON.stringify(s));else localStorage.removeItem(AUTH_KEY)}
async function renew(){if(!A.session)return false;if(A.session.expires_at&&A.session.expires_at>Date.now()/1000+90)return true;try{const s=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:A.session.refresh_token}});setSession({...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in});return true}catch{setSession(null);return false}}
async function cloud(path,opts={}){if(!await renew())throw Error('Session expirée. Reconnecte-toi.');return req('/rest/v1/'+path,{...opts,token:token()})}
async function loadCloud(){
 // Toujours récupérer l'identité depuis Supabase Auth : le cache local peut être ancien.
 try{const freshUser=await req('/auth/v1/user',{token:token()});if(freshUser?.id===A.session?.user?.id){A.session.user=freshUser;setSession(A.session);A.firstName=''}}catch(err){console.warn('Profil Auth non actualisé :',err)}
 const uid=encodeURIComponent(A.session.user.id);
 const [program,profile]=await Promise.all([cloud('user_programs?user_id=eq.'+uid+'&select=plan,start_date&limit=1'),cloud('user_profiles?user_id=eq.'+uid+'&select=answers,method&limit=1')]);
 const queuedProgram=pendingProgram(A.session.user.id);
 A.profile=queuedProgram?.profile||profile?.[0]||null;A.answers=A.profile?.answers||structuredClone(eng().defaults);
 if(queuedProgram?.plan||program?.[0]?.plan&&Array.isArray(program[0].plan)){S.plan=queuedProgram?.plan||program[0].plan;S.start=queuedProgram?.start_date||program[0].start_date;S.logs=[];S.week=currentWeek(S.start)}
 else {S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];S.week=currentWeek(S.start)}
 for(const row of pendingFor(A.session.user.id)){S.logs=S.logs.filter(l=>!(l.week_number===row.week_number&&l.day_index===row.day_index&&l.exercise_id===row.exercise_id&&l.set_number===row.set_number));S.logs.push({...row})}
 cacheAccount();if(pendingFor(A.session.user.id).length)flushSets().catch(e=>console.warn('Synchronisation différée',e));if(queuedProgram)flushProgram().catch(e=>console.warn('Programme en attente',e));
 A.view=A.profile?'app':'onboard';A.step=0;render()
}
async function flushProgram(){if(programSyncPromise)return programSyncPromise;
 if(!A.session||!pendingProgram(A.session.user.id))return;
 const uid=A.session.user.id;
 programSyncPromise=(async()=>{while(A.session?.user?.id===uid){
  const payload=pendingProgram(uid);if(!payload)break;
  if(payload.profile)await cloud('user_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:uid,...payload.profile}});
  // Ancien format (V1) : le plan en attente est encore envoyé pour ne rien perdre.
  if(Array.isArray(payload.plan))await cloud('user_programs?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:uid,plan:payload.plan,start_date:payload.start_date}});
  if(localStorage.getItem(pendingProgramKey(uid))===JSON.stringify(payload))localStorage.removeItem(pendingProgramKey(uid));updateSyncStatus();
 }})();
 try{await programSyncPromise}finally{programSyncPromise=null}
}

function cacheAccount(){if(!A.session)return;try{localStorage.setItem(accountCacheKey(A.session.user.id),JSON.stringify({plan:S.plan,start:S.start,logs:S.logs}))}catch{}}
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
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSets();});
// Menus du bas : glisser la poignée vers le bas pour fermer (comme sur iPhone). Un appui sur la poignée ou à côté ferme aussi.
let sheetDrag=null;
const sheetParts=sheet=>({veil:sheet.parentElement?.querySelector('.v2-veil'),close:sheet.querySelector('[data-action="v2-close-sheet"]')});
root.addEventListener('pointerdown',e=>{const sheet=e.target.closest?.('.v2-sheet');if(!sheet||!sheet.querySelector('.v2-grab'))return;const grab=e.target.closest('.v2-grab');if(!grab&&(sheet.scrollTop>0||e.target.closest('input,select,textarea,button,a,label')))return;sheetDrag={sheet,y:e.clientY,t:Date.now(),dy:0,id:e.pointerId}});
root.addEventListener('pointermove',e=>{const d=sheetDrag;if(!d||e.pointerId!==d.id)return;d.dy=Math.max(0,e.clientY-d.y);if(d.dy<4)return;d.sheet.style.transition='none';d.sheet.style.transform='translateY('+d.dy+'px)';const {veil}=sheetParts(d.sheet);if(veil)veil.style.opacity=String(Math.max(.15,1-d.dy/360))},{passive:true});
const endSheetDrag=()=>{const d=sheetDrag;sheetDrag=null;if(!d||d.dy<4)return;const {veil,close}=sheetParts(d.sheet),fast=d.dy>30&&d.dy/Math.max(1,Date.now()-d.t)>.6;
 if(d.dy>110||fast){d.sheet.style.transition='transform .18s ease-in';d.sheet.style.transform='translateY(110%)';setTimeout(()=>close?.click(),160)}
 else{d.sheet.style.transition='transform .22s ease';d.sheet.style.transform='';if(veil)veil.style.opacity=''}};
root.addEventListener('pointerup',endSheetDrag);root.addEventListener('pointercancel',endSheetDrag);
window.addEventListener('online',()=>{flushSets();flushProgram().catch(e=>console.warn('Programme toujours en attente',e))});
// Icônes au trait (pas de glyphes texte) : choix coché / non coché, flèche.
const G_CHECK='<svg class="glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',G_OFF='<svg class="glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/></svg>',G_NEXT='<svg class="glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
// Deux modes de planning : jours choisis (rythme conseillé) ou N séances par semaine, quand on veut.
function planModeField(){const free=A.answers.planMode==='free',opt=(v,t,d)=>'<button type="button" class="choice '+((v==='free')===free?'selected':'')+'" data-action="choice" data-key="planMode" data-value="'+v+'" aria-pressed="'+((v==='free')===free)+'"><span><b>'+t+'</b><br><small>'+d+'</small></span><span class="choice-end">'+((v==='free')===free?G_CHECK:G_OFF)+'</span></button>';return '<div class="choice-grid plan-mode">'+opt('days','Je choisis mes jours','L’app te les rappelle, sans rien bloquer.')+opt('free',(A.answers.daysCount||3)+' séances par semaine, quand je veux','L’app propose toujours la séance suivante.')+'</div>'}
function profileField(f){const val=A.answers[f.key]??'';if(f.type==='days'&&A.answers.planMode==='free')return planModeField();if(f.type==='days')return planModeField()+profileFieldBase(f,val);return profileFieldBase(f,val)}
function profileFieldBase(f,val){if(f.type==='multi'||f.type==='days')return '<div class="choice-grid">'+f.options.map((v,i)=>{const value=f.type==='days'?i:v;return '<button type="button" class="choice '+(val.includes(value)?'selected':'')+'" data-action="choice" data-key="'+f.key+'" data-value="'+esc(value)+'"><span>'+esc(v)+'</span><span class="choice-end">'+(val.includes(value)?G_CHECK:G_OFF)+'</span></button>'}).join('')+'</div>';
 if(f.type==='methods')return '<div class="method-list">'+f.options.map(([id,info])=>'<button type="button" class="method '+(val===id?'selected':'')+'" data-action="choice" data-key="method" data-value="'+id+'"><strong>'+esc(info.name)+'</strong><small>'+esc(info.description)+'</small><span class="method-chevron">'+(val===id?G_CHECK:G_OFF)+'</span></button>').join('')+'</div>';
 if(f.type==='select')return '<div class="answer-options">'+f.options.map(([v,label],i)=>'<button type="button" class="answer-card '+(String(val)===String(v)?'selected':'')+'" data-action="choice" data-key="'+f.key+'" data-value="'+esc(v)+'"><span class="answer-label">'+esc(label)+'</span><span class="answer-chevron">'+(String(val)===String(v)?G_CHECK:G_OFF)+'</span></button>').join('')+'</div>';
 return '<input class="select" data-profile="'+f.key+'" type="'+(f.type==='number'?'number':'text')+'" '+(f.min?'min="'+f.min+'"':'')+' '+(f.max?'max="'+f.max+'"':'')+' placeholder="'+esc(f.placeholder||'')+'" value="'+esc(val)+'">';
}

// Cinq étapes essentielles (ce qu'un coach demande vraiment), puis une étape facultative pour affiner.
const onboardingStages=[
 {title:'Tu veux quoi, exactement ?',subtitle:'Ton objectif et ton expérience.',keys:['goal','level','currentSessions'],quip:'Pas besoin de jouer les experts. Je m’adapte.'},
 {title:'On se voit combien de fois ?',subtitle:'Mieux vaut un rythme réaliste qu’une promesse impossible.',keys:['daysCount','duration'],quip:'Trois séances sérieuses valent mieux que six séances fantômes.'},
 {title:'Tu t’entraînes où ?',subtitle:'Ton matériel, et si tu veux, un ou deux muscles à faire progresser.',keys:['equipment','priority'],quip:'Tout le corps est travaillé. Une priorité ajoute du travail là où ça compte pour toi.'},
 {title:'Ton agenda, ton programme.',subtitle:'Choisis tes jours, ou entraîne-toi quand tu veux.',keys:['days'],quip:'La récupération fait partie de la progression.'},
 {title:'Derniers réglages.',subtitle:'La méthode, et les mouvements ou douleurs à éviter.',keys:['method','avoid','limitations'],quip:'Une douleur n’est jamais une excuse à ignorer.'},
 {title:'Pour affiner (facultatif).',subtitle:'Ça m’aide à doser la charge de travail. Tu peux passer cette étape.',keys:['age','height','weight','job','activity','sleep'],quip:'On construit du muscle, pas des complexes.',optional:true}
];
function coherenceUI(){
 const d=globalThis.SteroidGuide.diagnostic(A.answers);
 return '<section class="fit-onboard coherence-screen"><div class="fit-onboard-head"><button class="fit-back" type="button" data-action="guide-close" aria-label="Retour au questionnaire">‹</button><div class="fit-step-progress">'+onboardingStages.map(()=>'<span class="active"></span>').join('')+'</div><span class="fit-step-count">BILAN</span></div><div class="coherence-body"><span class="fit-kicker">ANALYSE DE TON PROGRAMME</span><h1>On ajuste avant de commencer.</h1><p class="coherence-intro">Tes réponses ne sont pas mauvaises. Certaines ne vont simplement pas bien ensemble. Voici les points à améliorer pour construire un programme cohérent.</p><div class="coherence-issues">'+d.issues.map((issue,i)=>'<article class="coherence-issue"><div class="coherence-issue-head"><span class="coherence-index">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(issue.title)+'</strong></div><p>'+esc(issue.reason)+'</p><button type="button" data-action="guide-edit" data-step="'+issue.stage+'">Modifier cette réponse <span aria-hidden="true">↗</span></button></article>').join('')+'</div>'+(d.choices.length?'<h2>Ce que je te conseille</h2><p class="coherence-subtitle">Ces propositions corrigent les incompatibilités d’entraînement détectées. Tes objectifs et tes autres réponses sont conservés.</p><div class="coherence-choices">'+d.choices.map((x,i)=>'<article class="coherence-choice"><div><span class="coherence-tag">'+(i===0?'RECOMMANDÉ':'ALTERNATIVE')+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.why)+'</p></div><button type="button" data-action="guide-apply" data-index="'+i+'">Appliquer <span aria-hidden="true">'+G_NEXT+'</span></button></article>').join('')+'</div>':'')+(d.issues.some(x=>x.code==='LIMITATIONS_REVIEW')?'<p class="coherence-health">Une douleur ou limitation ne doit jamais être effacée pour obtenir un résultat « compatible ». Garde cette information et fais vérifier les mouvements avant de commencer.</p>':'')+'</div><div class="fit-onboard-footer coherence-footer"><button type="button" class="fit-outline" data-action="guide-close">Revoir mes réponses</button></div></section>';
}
// Récapitulatif avant génération : réponses principales et aperçu des séances (même moteur que le cycle réel).
function recapUI(){let preview=null;try{preview=eng().buildCycle(A.answers)}catch{}
 return '<section class="fit-onboard v2-recap-screen"><div class="fit-onboard-head"><button type="button" class="fit-back" data-action="recap-edit" aria-label="Modifier mes réponses">‹</button><div class="fit-step-progress" aria-label="Toutes les étapes faites">'+onboardingStages.map(()=>'<span class="active"></span>').join('')+'</div><span class="fit-step-count">PRÊT</span></div><div class="v2-recap-body"><span class="fit-kicker">AVANT DE COMMENCER</span><h1>Voici ce que je te propose.</h1>'
  +globalThis.SteroidUI.recapCard({answers:A.answers,preview,methods:eng().methods})
  +'<button type="button" class="v2-btn v2-btn--big" data-action="onboard-confirm"'+(A.busy?' disabled':'')+'>Générer mon programme</button><button type="button" class="v2-btn v2-btn--ghost" data-action="recap-edit">Modifier mes réponses</button></div></section>'}
function onboardUI(){if(A.guide)return coherenceUI();if(A.recap)return recapUI();const stage=onboardingStages[A.step],fields=eng().steps.flatMap(s=>s.fields).filter(f=>stage.keys.includes(f.key));return '<section class="fit-onboard"><div class="fit-onboard-head"><button type="button" class="fit-back" data-action="'+(A.step?'prev-step':'onboard-exit')+'" aria-label="Retour">‹</button><div class="fit-step-progress" aria-label="Étape '+(A.step+1)+' sur '+onboardingStages.length+'">'+onboardingStages.map((_,i)=>'<span class="'+(i<=A.step?'active':'')+'"></span>').join('')+'</div><span class="fit-step-count">'+String(A.step+1).padStart(2,'0')+'/'+String(onboardingStages.length).padStart(2,'0')+'</span></div><div class="fit-onboard-body"><div class="fit-question"><span class="fit-kicker">TON COACH TE DEMANDE</span><h1>'+esc(stage.title)+'</h1><p>'+esc(stage.subtitle)+'</p></div><div class="fit-answers">'+fields.map(f=>'<div class="profile-field"><label class="field-label">'+esc(f.label)+'</label>'+profileField(f)+'</div>').join('')+'</div><div class="fit-coach-line">'+esc(stage.quip)+'</div></div><div class="fit-onboard-footer"><button class="fit-action" data-action="next-step">'+(A.step===onboardingStages.length-1?(stage.optional?'Voir mon programme':'Créer mon programme'):'Suivant')+' <span aria-hidden="true">'+G_NEXT+'</span></button></div></section>'}

function accountUI(){
 if(A.mode==='reset'&&A.session)return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">ACCÈS SÉCURISÉ</span><h1>Un nouveau départ.</h1><p>Définis ton mot de passe pour retrouver ton espace.</p></div><form id="password-form" class="auth-form"><label class="field-label">Nouveau mot de passe</label><input name="password" type="password" minlength="8" required autocomplete="new-password"><button class="primary save" type="submit">Enregistrer mon mot de passe <span aria-hidden="true">'+G_NEXT+'</span></button></form></div>';
 if(A.session)return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">MON ESPACE</span><h1>Heureux de te revoir.</h1><p>'+esc(A.session.user?.email||'Compte connecté')+'</p></div><button class="primary save" data-action="back-app">Reprendre mon entraînement '+G_NEXT+'</button><button class="auth-text-link" data-action="edit-profile">Adapter mon programme</button><button class="auth-text-link" data-action="logout">Me déconnecter</button></div>';
 const signup=A.mode==='signup',recover=A.mode==='recover',verify=A.mode==='verify';
 const title=signup?'Créer mon compte':recover?'Récupérer mon accès':verify?'Confirme ton adresse':'Connexion';
 const intro=signup?'Enregistre ton programme et retrouve tes séances.':recover?'Nous t’enverrons un lien par email.':verify?'Vérifie ta boîte mail et les spams.':'Retrouve ton programme et tes performances.';
 const fields=verify?'':'<form id="auth-form" class="auth-form" novalidate>'+(signup?'<label class="field-label" for="auth-firstname">Prénom</label><input id="auth-firstname" name="first_name" type="text" maxlength="60" autocomplete="given-name" required placeholder="Ton prénom">':'')+'<label class="field-label" for="auth-email">Adresse email</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="ton@email.fr" value="'+esc(A.email||'')+'">'+(recover?'':'<label class="field-label" for="auth-password">Mot de passe</label><input id="auth-password" name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required minlength="8" placeholder="8 caractères minimum"><button type="button" class="pw-toggle" data-action="pw-toggle" aria-label="Afficher le mot de passe" aria-pressed="false">Afficher</button>')+'<button class="primary save" type="submit">'+(recover?'Recevoir le lien':signup?'Créer mon compte':'Me connecter')+' <span aria-hidden="true">'+G_NEXT+'</span></button></form>';
 const alternative=signup?'<p class="auth-switch">Déjà un compte ? <button data-action="auth-login">Me connecter</button></p>':recover||verify?'<p class="auth-switch"><button data-action="auth-login">Retour à la connexion</button></p>':'<p class="auth-switch">Je n’ai pas de compte. <button data-action="auth-signup">Créer mon compte</button></p>';
 return '<div class="auth-panel"><div class="auth-headline"><span class="auth-kicker">STEROID · TON COACH</span><h1>'+title+'</h1><p>'+intro+'</p></div><div class="auth-glass">'+fields+(verify?'<button class="primary save" data-action="resend-confirm">Renvoyer l’email '+G_NEXT+'</button>':'')+alternative+(!signup&&!recover&&!verify?'<button class="auth-forgot" data-action="auth-recover">Mot de passe oublié ?</button>':'')+'<div class="auth-or"><span>OU</span></div><button class="auth-guest" data-action="guest">Utiliser sans compte <span>↗</span></button></div></div>';
}

async function finishOnboarding(){const p=A.answers;if(Number(p.age)&&Number(p.age)<18){setNotice('STEROID est réservé aux adultes pour le moment.',true);return}
 const d=globalThis.SteroidGuide.diagnostic(p);
 if(!d.ok){A.guide=true;render();scrollToSectionTop();return}
 // Première configuration : le programme V2 suit les réponses. Questionnaire refait : on demande.
 const owner=A.session?.user?.id||'guest',mine=V2&&V2owner===owner&&V2.ready();
 if(!A.profile||await globalThis.SteroidDialog.confirm('Ton cycle actuel sera archivé. Ton historique est conservé.',{title:'Appliquer à ton programme ?',ok:'Nouveau programme',cancel:'Garder l’actuel'})){
  // Le contrôleur affiché appartient à ce compte (ou à l'invité) : on reconstruit tout de suite. Sinon, au démarrage du bon contrôleur.
  if(mine)await V2.rebuild();else try{localStorage.setItem('nolsprog-v2-rebuild:'+owner,'1')}catch{}
 }
 // Réponses enregistrées ; le programme lui-même est le cycle V2 (construit à partir de ces réponses).
 A.profile={answers:structuredClone(p),method:p.method};A.view='app';S.tab='edit';S.programIntro=true;A.guide=false;A.recap=false;localStorage.setItem('nolsprog-onboarding-seen','1');
 if(!A.session){persist();render();setNotice('Programme créé sur cet appareil');return}
 cacheAccount();render();
 const uid=A.session.user.id;
 try{localStorage.setItem(pendingProgramKey(uid),JSON.stringify({user_id:uid,profile:A.profile}));updateSyncStatus()}catch{}
 try{await flushProgram();setNotice('Questionnaire enregistré')}catch(e){setNotice('Questionnaire gardé sur cet appareil, synchronisation en attente.',true)}
}
async function initAuth(){const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('access_token')&&hash.get('refresh_token')){try{const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');const user=await req('/auth/v1/user',{token:access_token});setSession({access_token,refresh_token,user,expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});history.replaceState(null,'',location.pathname+location.search);if(hash.get('type')==='recovery'){A.view='account';A.mode='reset';render();return}await loadCloud();return}catch(e){history.replaceState(null,'',location.pathname+location.search);setNotice('Lien expiré ou invalide : '+e.message,true)}}try{const saved=localStorage.getItem(AUTH_KEY);if(saved)A.session=JSON.parse(saved)}catch{}if(A.session){restorePending(A.session.user.id);try{if(await renew()){await loadCloud();return}}catch(e){console.warn('NolsProg: chargement du compte impossible',e);try{const cached=JSON.parse(localStorage.getItem(accountCacheKey(A.session.user.id)));if(cached&&Array.isArray(cached.plan)){S.plan=cached.plan;S.start=cached.start;S.logs=cached.logs||[];for(const row of pendingFor(A.session.user.id)){S.logs=S.logs.filter(l=>!(l.week_number===row.week_number&&l.day_index===row.day_index&&l.exercise_id===row.exercise_id&&l.set_number===row.set_number));S.logs.push(row)}S.week=currentWeek(S.start);A.view='app';setNotice('Mode hors ligne : dernières données locales du compte.',true);return}}catch{}A.view='account';render();return}}
 A.view=localStorage.getItem('nolsprog-onboarding-seen')==='1'?'app':'welcome';render()}
function welcomeUI(){return '<section class="fit-entry"><div class="fit-entry-top"><span class="fit-overline">STEROID · TRAINING CLUB</span><h1>Entraîne-toi<br><em>plus intelligent.</em></h1></div><div class="fit-logo"><img class="steroid-mark" src="./steroid-icon.svg" alt="" aria-hidden="true"><img class="fit-wordmark official-wordmark" src="./steroide-wordmark.svg" alt="STEROID"></div><div class="fit-entry-bottom"><p>Ton programme. Tes séances.<br>Ta progression, à ton rythme.</p><button class="fit-action" data-action="auth-signup">Commencer <span aria-hidden="true">'+G_NEXT+'</span></button><button class="fit-outline" data-action="auth-login">Me connecter</button><button class="fit-quiet" data-action="guest">Utiliser sans compte</button><button class="fit-quiet fit-demo" data-action="demo-enter">Voir la démo, sans rien remplir</button></div></section>'}

function persist(){if(A.session){cacheAccount();return true}try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,plan:S.plan,start:S.start,logs:S.logs,answers:A.answers||A.profile?.answers||null}));return true}catch(e){setNotice('Stockage local indisponible : exporte tes données avant de quitter.',true);return false}}
function loadLocal(){try{const raw=localStorage.getItem(STORAGE_KEY);const data=raw?JSON.parse(raw):null;if(data&&Array.isArray(data.plan)&&data.plan.length===7&&Array.isArray(data.logs)&&typeof data.start==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.start)){S.plan=data.plan;S.start=data.start;A.answers=data.answers||null;S.logs=data.logs.filter(x=>x&&Number.isInteger(x.week_number)&&Number.isInteger(x.day_index)&&typeof x.exercise_id==='string'&&Number.isInteger(x.set_number)).slice(-20000)}else{S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];persist()}}catch(e){S.plan=seed();S.start=iso(monday(new Date()));S.logs=[];setNotice('Lecture du stockage impossible. Vérifie les paramètres du navigateur.',true)}S.week=currentWeek(S.start);render()}
// Sauvegarde V2 : cycle, séances, séries, cardio et exercices perso (+ anciennes données V1 encore présentes sur l'appareil).
function downloadBackup(){const v=V2?.state()||{};const payload=JSON.stringify({app:'STEROID',version:2,exported_at:new Date().toISOString(),answers:A.answers||A.profile?.answers||null,cycle:v.cycle||null,workouts:v.workouts||[],set_logs:v.setLogs||[],cardio_logs:v.cardioLogs||[],user_exercises:v.userExercises||[],legacy:{plan:S.plan,start:S.start,logs:S.logs}},null,2);const blob=new Blob([payload],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='steroide-sauvegarde-'+iso(new Date())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monday=d=>{let x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const currentWeek=s=>Math.max(1,Math.floor((monday(new Date())-monday(new Date(s+'T12:00:00')))/604800000)+1);
let noticeTimeout=null;
// Message bref : ne bloque jamais un bouton (pointer-events:none), effacé au changement d'écran.
const clearNotice=()=>{S.notice='';root.querySelector('.toast')?.remove();if(noticeTimeout)clearTimeout(noticeTimeout);noticeTimeout=null};
const setNotice=(msg,error=false)=>{
 S.notice=msg;S.error=error;
 let toast=root.querySelector('.toast');
 if(!toast){toast=document.createElement('div');root.appendChild(toast)}
 toast.className='toast'+(error?' alert':'');
 toast.setAttribute('role',error?'alert':'status');
 toast.setAttribute('aria-live',error?'assertive':'polite');
 toast.textContent=msg;
 if(noticeTimeout)clearTimeout(noticeTimeout);
 noticeTimeout=setTimeout(clearNotice,error?5000:3000);
};
// Weekly plans are immutable snapshots persisted inside the existing plan JSON.
// This preserves exercise IDs and historical set records across navigation/reloads.
// Compare exercise names across weekly snapshots; IDs are week-scoped.
const navIcons={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2.5L4.5 14H11l-1 7.5L19 10h-6.5z"/></svg>',
 stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-8M22 20V3"/><path d="M2 20h20"/></svg>',
 edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/></svg>'
};
const buttonNav=(tab,label)=>'<button type="button" class="'+(S.tab===tab?'active':'')+(tab==='today'?' tab-main':'')+'" data-action="tab" data-tab="'+tab+'" aria-current="'+(S.tab===tab?'page':'false')+'"><span class="tabicon">'+navIcons[tab]+'</span><span class="tab-label">'+label+'</span></button>';

function syncStatusUI(){
 if(!A.session)return '';
 return '<span class="sync-state'+(anyPending(A.session.user.id)?' is-pending':'')+'" id="sync-state" role="status">'+(anyPending(A.session.user.id)?'Sauvegardé sur cet appareil · synchronisation en attente':'Enregistré sur ton compte')+'</span>';
}
function updateSyncStatus(){
 const el=document.getElementById('sync-state');if(!el||!A.session)return;
 const pending=anyPending(A.session.user.id);el.classList.toggle('is-pending',pending);
 el.textContent=pending?'Sauvegardé sur cet appareil · synchronisation en attente':'Enregistré sur ton compte';
}





function accountFirstName(){return String(A.session?.user?.user_metadata?.first_name||A.session?.user?.user_metadata?.given_name||A.firstName||'').trim()}
// ----- Réglages : apparence, séance, installation de l'app, compte -----
const themePref=()=>{try{return ['light','dark'].includes(localStorage.getItem('nolsprog-theme'))?localStorage.getItem('nolsprog-theme'):'auto'}catch{return 'auto'}};
function applyTheme(){const t=themePref(),dark=t==='dark'||(t==='auto'&&!!globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);
 document.documentElement?.classList?.toggle('theme-dark',dark);for(const m of document.querySelectorAll?.('meta[name="theme-color"]')||[])m.setAttribute('content',dark?'#0E1412':'#0B4D3B')}
globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(themePref()==='auto')applyTheme()});
applyTheme();
const deviceOS=()=>{const ua=navigator.userAgent||'';return /iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'ios':/Android/.test(ua)?'android':'desktop'};
const isInstalled=()=>globalThis.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
const ICON_SHARE='<svg class="v2-ic v2-ic--sm" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/></svg>';
const INSTALL_STEPS={
 ios:{name:'iPhone',steps:['Ouvre STEROID dans <b>Safari</b>.','Touche '+ICON_SHARE+' <b>Partager</b> (en bas sur iPhone, en haut sur iPad).','Fais défiler et touche <b>« Sur l’écran d’accueil »</b>.','Touche <b>Ajouter</b> : l’icône STEROID apparaît avec tes apps.'],note:'Chrome sur iPhone : même chemin par le bouton Partager. Les rappels demandent iOS 16.4 ou plus et l’app ajoutée à l’écran d’accueil.'},
 android:{name:'Android',steps:['Ouvre STEROID dans <b>Chrome</b>.','Touche le menu <b>⋮</b> en haut à droite.','Touche <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »).','Confirme : l’app s’ouvre en plein écran depuis ton écran d’accueil.'],note:'Samsung Internet : menu ≡, « Ajouter la page à », puis « Écran d’accueil ».'},
 desktop:{name:'Ordinateur',steps:['<b>Chrome ou Edge</b> : clique sur l’icône d’installation à droite de la barre d’adresse.','Ou menu <b>⋮</b> : « Installer STEROID » (Edge : « Applications », puis « Installer ce site »).','<b>Safari sur Mac</b> (macOS 14 ou plus) : menu Fichier, « Ajouter au Dock ».'],note:'L’app s’ouvre alors dans sa propre fenêtre.'}};
function installGuide(){const os=A.installOs||deviceOS(),g=INSTALL_STEPS[os];
 return '<section class="v2-card v2-set-card" aria-labelledby="set-install"><h2 id="set-install" class="v2-card-title">Installer l’app</h2>'
  +(isInstalled()?'<p class="v2-ok-line">STEROID est déjà installée sur cet appareil.</p>':'<p class="v2-muted">Plein écran, accès direct depuis ton écran d’accueil, rappels possibles.</p>')
  +'<div class="v2-seg" role="group" aria-label="Type d’appareil">'+Object.entries(INSTALL_STEPS).map(([k,v])=>'<button type="button" data-action="install-os" data-os="'+k+'" aria-pressed="'+(k===os)+'">'+v.name+'</button>').join('')+'</div>'
  +'<ol class="v2-steps-list">'+g.steps.map(x=>'<li>'+x+'</li>').join('')+'</ol>'+(os==='android'&&installPrompt?'<button type="button" class="v2-btn" data-action="install-app">Installer maintenant</button>':'')+'<p class="v2-muted v2-small">'+g.note+'</p></section>'}
function settingsUI(){const a=A.profile?.answers||A.answers||{},t=themePref(),snd=soundOn(),ra=restAlertOn();
 const seg=(act,key,cur,opts)=>'<div class="v2-seg" role="group">'+opts.map(([v,l])=>'<button type="button" data-action="'+act+'" data-'+key+'="'+v+'" aria-pressed="'+(cur===v)+'">'+l+'</button>').join('')+'</div>';
 const row=(act,label,hint,on)=>'<button type="button" class="v2-switch-row" data-action="'+act+'" role="switch" aria-checked="'+on+'"><span><b>'+label+'</b><small>'+hint+'</small></span><i class="v2-switch" aria-hidden="true"></i></button>';
 return '<section class="v2-settings"><button type="button" class="v2-link v2-back-link" data-action="settings-back">‹ Retour</button><h1 class="v2-hello">Réglages</h1>'
  +'<section class="v2-card v2-set-card" aria-labelledby="set-look"><h2 id="set-look" class="v2-card-title">Apparence</h2>'+seg('theme-set','theme',t,[['auto','Auto'],['light','Clair'],['dark','Sombre']])+'<p class="v2-muted v2-small">'+(t==='auto'?'Suit le réglage de ton téléphone.':t==='dark'?'Toujours sombre, même en journée.':'Toujours clair.')+'</p></section>'
  +'<section class="v2-card v2-set-card" aria-labelledby="set-session"><h2 id="set-session" class="v2-card-title">Séance</h2>'+row('sound-toggle','Bips du repos','3 dernières secondes et fin du repos.',snd)
  +(A.session?row('rest-alert-toggle','Alerte écran verrouillé','Notification de fin de repos si tu quittes l’app (rappels activés sur cet appareil).',ra):'')+'</section>'
  +installGuide()
  +'<section class="v2-card v2-set-card" aria-labelledby="set-demo"><h2 id="set-demo" class="v2-card-title">Mode démo</h2>'+row('demo-toggle','Données fictives','Pour voir l’app remplie : 3 semaines d’entraînement d’exemple. Tes vraies données ne sont ni modifiées ni affichées.',A.demo)+'</section>'
  +(A.demo?'':(A.session?'<section class="v2-card v2-set-card" aria-labelledby="set-me"><h2 id="set-me" class="v2-card-title">Mon compte</h2><form id="settings-form" class="v2-form"><label class="v2-field-label">Prénom<input name="first_name" type="text" maxlength="60" autocomplete="given-name" required value="'+esc(accountFirstName())+'"></label><label class="v2-field-label">Adresse e-mail<input type="email" readonly value="'+esc(A.session?.user?.email||'')+'"></label><div class="v2-form-pair"><label class="v2-field-label">Poids (kg)<input name="weight" type="number" inputmode="decimal" min="30" max="300" step="0.1" value="'+esc(a.weight??'')+'"></label><label class="v2-field-label">Taille (cm)<input name="height" type="number" inputmode="numeric" min="100" max="240" step="1" value="'+esc(a.height??'')+'"></label></div><button type="submit" class="v2-btn">Enregistrer</button></form><p class="v2-muted v2-small">L’adresse e-mail n’est pas modifiable ici.</p></section>'
    :'<section class="v2-card v2-set-card" aria-labelledby="set-me"><h2 id="set-me" class="v2-card-title">Compte</h2><p class="v2-muted">Tu es en mode invité : tes séances restent sur ce téléphone.</p><button type="button" class="v2-btn" data-action="account">Se connecter / créer un compte</button></section>')
  +'<section class="v2-card v2-set-card" aria-labelledby="set-more"><h2 id="set-more" class="v2-card-title">Programme et données</h2><button type="button" class="v2-btn v2-btn--ghost" data-action="edit-profile">Modifier mon questionnaire</button><button type="button" class="v2-btn v2-btn--ghost" data-action="backup">Exporter une sauvegarde</button>'+(A.session?'<button type="button" class="v2-btn v2-btn--ghost v2-danger" data-action="logout">Se déconnecter</button>':'')+'</section>')+'</section>'}
async function saveAccountSettings(form){if(!A.session)return;const data=new FormData(form),firstName=String(data.get('first_name')||'').trim(),weight=String(data.get('weight')||'').trim(),height=String(data.get('height')||'').trim();if(!firstName||firstName.length>60){setNotice('Prénom invalide.',true);return}if((weight&&(!Number.isFinite(Number(weight))||Number(weight)<30||Number(weight)>300))||(height&&(!Number.isFinite(Number(height))||Number(height)<100||Number(height)>240))){setNotice('Vérifie ton poids et ta taille.',true);return}if(A.busy)return;A.busy=true;try{if(!await renew())throw Error('Session expirée. Reconnecte-toi.');const user=await req('/auth/v1/user',{method:'PUT',token:token(),body:{data:{...(A.session.user?.user_metadata||{}),first_name:firstName}}});A.session.user=user;setSession(A.session);A.firstName=firstName;const answers={...(A.profile?.answers||A.answers||eng().defaults),weight:weight||null,height:height||null};await cloud('user_profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:A.session.user.id,answers,method:answers.method||'auto'}});A.profile={...(A.profile||{}),answers};A.answers=structuredClone(answers);render();setNotice('Informations enregistrées')}catch(e){setNotice('Enregistrement incomplet : '+e.message,true)}finally{A.busy=false}}
function stampSheets(){const t=Date.now();for(const el of root.querySelectorAll('.v2-sheet:not([data-opened-at])'))el.dataset.openedAt=t}
// Petites animations : l'écran qui change entre en fondu, la nouvelle série en cours apparaît, une série validée « pulse ».
// Rien ne rejoue quand on touche − / + (même écran, même série). « Réduire les animations » : tout est coupé en CSS.
let enterKey='',enterSet='',doneSets=new Set();
let restShown=false;
function animateScreen(){try{const main=root.querySelector('main');if(!main)return;const first=main.firstElementChild;
 const key=[A.view,S.tab,first?.className||'',root.querySelector('.v2-ex-title')?.textContent||'',root.querySelector('.v2-hello')?.textContent||''].join('|');
 if(key!==enterKey){enterKey=key;main.classList.add('v2-enter');scrollToSectionTop()} // nouvel écran : toujours en haut (Commencer, onglet, exercice)
 else main.classList.remove('v2-enter'); // simple mise à jour du même écran (série validée, ressenti) : pas de nouvelle animation d'entrée
 const rest=root.querySelector('.v2-rest-full');if(rest&&!restShown)rest.classList.add('v2-rest-in');restShown=!!rest;
 const cur=root.querySelector('.v2-current'),ck=cur?(root.querySelector('.v2-ex-title')?.textContent||'')+(cur.getAttribute('aria-label')||''):'';
 if(cur&&ck!==enterSet)cur.classList.add('v2-pop');enterSet=ck;
 const now=new Set([...root.querySelectorAll('.v2-set.is-done .v2-ok')].map(b=>b.dataset.ex+'|'+b.dataset.set));
 for(const b of root.querySelectorAll('.v2-set.is-done .v2-ok'))if(!doneSets.has(b.dataset.ex+'|'+b.dataset.set)&&doneSets.size+1>=now.size)b.classList.add('v2-tick');
 doneSets=now}catch{}}
// « Comment faire » : le pictogramme passe de la position de départ à l'arrivée et revient (pause à chaque bout).
// « Réduire les animations » : dessin fixe en position d'arrivée.
let picLoop=false;
function animatePic(){const el=root.querySelector('svg[data-mv-key]'),M=globalThis.SteroidMoves;
 if(!el||!M?.inner||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){picLoop=false;return}
 const ph=(performance.now()/2800)%1,sm=x=>x*x*(3-2*x),k=ph<.15?0:ph<.5?sm((ph-.15)/.35):ph<.65?1:sm(1-(ph-.65)/.35);
 el.innerHTML=M.inner(el.dataset.mvKey,el.dataset.mvPattern,k);requestAnimationFrame(animatePic)}
// Guide : la carte reste en bas ; si elle cacherait l'élément expliqué, elle passe en haut.
function placeGuide(){try{const g=root.querySelector('.v2-guide');if(!g)return;g.classList.remove('is-top');const t=root.querySelector('.is-spot');if(!t)return;const a=g.getBoundingClientRect(),b=t.getBoundingClientRect();if(b.bottom>a.top-8&&b.top<a.bottom+8)g.classList.add('is-top')}catch{}}
function fitPics(){try{root.querySelectorAll('.v2-ex-pic svg').forEach(v=>{if(v.dataset.fit)return;const b=v.getBBox();if(!b.width||!b.height)return;const pad=7,w=b.width+pad*2,h=b.height+pad*2,side=Math.max(w,h);v.setAttribute('viewBox',[b.x-pad-(side-w)/2,b.y-pad-(side-h)/2,side,side].map(n=>Math.round(n*10)/10).join(' '));v.removeAttribute('height');v.removeAttribute('width');v.dataset.fit='1'})}catch{}}
function startPic(){if(!picLoop&&root.querySelector('svg[data-mv-key]')){picLoop=true;requestAnimationFrame(animatePic)}}
function render(){Promise.resolve().then(()=>{stampSheets();trackSheet();animateScreen();startPic();fitPics();placeGuide()});if(A.demo&&A.view==='welcome')A.view='app';if(A.view==='welcome'||A.view==='account'||A.view==='onboard'){root.innerHTML='<div class="shell immersive-shell '+(A.view==='welcome'?'is-welcome':A.view==='account'?'is-auth':'is-onboard')+'"><header class="topbar"><div class="brand mobile-wordmark" aria-label="STEROID">STEROID</div></header><main>'+(A.view==='welcome'?welcomeUI():A.view==='account'?accountUI():onboardUI())+'</main></div>'+(S.notice?'<div class="toast '+(S.error?'alert':'')+'">'+esc(S.notice)+'</div>':'');return}if(S.loading||!S.plan){root.innerHTML='<div class="boot">STEROID</div>';return}root.innerHTML='<div class="shell'+(S.tab==='edit'&&V2?.hasDraft?.()?' is-editing':'')+(V2?.inSession()&&S.tab==='today'?' is-v2-session':'')+'"><header class="topbar app-topbar">'+demoBar()+'<div class="header-main-row"><div class="brand mobile-wordmark" aria-label="STEROID">STEROID</div><div class="header-actions">' + '<button class="icon-btn account-menu-trigger'+(A.session?' is-signed':'')+'" data-action="account-menu" aria-expanded="' + (A.menuOpen?'true':'false') + '" aria-label="Ouvrir le menu du compte" title="Menu du compte"><span class="avatar-initials" aria-hidden="true">'+(accountFirstName()?esc(accountFirstName().charAt(0).toUpperCase()):'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"/></svg>')+'</span></button>' + (A.menuOpen?'<div class="account-popover" role="menu">'+(A.demo?'<button data-action="demo-exit" role="menuitem">Quitter la démo</button>':'')+(A.session?'<button data-action="open-settings" role="menuitem">Réglages</button><button data-action="edit-profile" role="menuitem">Mon questionnaire</button><button data-action="backup" role="menuitem">Exporter une sauvegarde</button><button data-action="logout" role="menuitem">Se déconnecter</button>':'<button data-action="account" role="menuitem">Se connecter / créer un compte</button><button data-action="open-settings" role="menuitem">Réglages</button><button data-action="backup" role="menuitem">Exporter une sauvegarde</button>')+'</div>':'') + '</div></div><div class="header-account-status">'+(A.demo?'Démo · Alex':A.session?'<span class="online-dot" aria-hidden="true"></span> '+(accountFirstName()?'Bonjour '+esc(accountFirstName()):'Mon compte'):'Mode invité')+'</div>'+syncStatusUI()+'</header><main>'+(S.tab==='today'&&!V2?.inSession()?installCard():'')+(S.tab==='settings'?settingsUI():v2Main()??v2Unavailable())+'</main><nav class="tabbar" aria-label="Navigation principale" style="--active-tab:'+(S.tab==='stats'?1:S.tab==='edit'?2:0)+';--from-tab:'+(S.previousTab==='stats'?1:S.previousTab==='edit'?2:0)+'">'+buttonNav('stats','Progrès')+buttonNav('today','Aujourd’hui')+buttonNav('edit','Programme')+'</nav></div>'+(S.notice?'<div class="toast '+(S.error?'alert':'')+'">'+esc(S.notice)+'</div>':'')}
// ----- V2 (lot 3b) : accueil Prochaine séance, séance P1, Progrès et Programme par clé d'exercice -----
let V2=null,V2owner=null,V2state='off';
function v2Api(){
 if(!A.session)return null;
 return {select:path=>cloud(path),
  upsert:(table,rows)=>cloud(table+'?on_conflict='+(table==='user_exercises'?'user_id,key':'id'),{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:rows}),
  remove:(table,id)=>cloud(table+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',prefer:'return=minimal'}),
  fn:async(name,{method='POST',body}={})=>{if(!await renew())throw Error('Session expirée. Reconnecte-toi.');return req('/functions/v1/'+name,{method,body,token:token()})}};
}
function startV2(){
 if(A.demo)return startDemo();
 const owner=A.session?.user?.id||'guest';if(V2owner===owner)return;
 // Changement de compte : l'ancien contrôleur n'est jamais réaffiché pour le nouveau compte.
 V2owner=owner;V2state='loading';V2=null;
 const ctl=globalThis.SteroidAppV2?.create({storage:localStorage,api:v2Api(),userId:A.session?.user?.id||null,legacyPlan:()=>S.plan,answers:()=>A.answers,firstName:accountFirstName,render:()=>{if(V2===ctl)render()},notice:(m,err)=>setNotice(m,err),confirm:(m,o)=>globalThis.SteroidDialog.confirm(m,o)});
 if(!ctl){V2state='off';return}
 ctl.init().then(()=>{if(V2owner!==owner)return;V2=ctl;V2state='ready';render()}).catch(err=>{console.warn('V2 indisponible',err);if(V2owner===owner)V2state='off';render()});
}
// ----- Mode démo : données fictives (SteroidDemo), stockage isolé, aucun envoi ; activable avec ou sans compte -----
function startDemo(){
 if(V2owner==='demo')return;const D=globalThis.SteroidDemo,AppV2=globalThis.SteroidAppV2;if(!D||!AppV2){V2state='off';return}
 V2owner='demo';V2state='loading';V2=null;
 const uuid=()=>globalThis.crypto.randomUUID();
 (async()=>{if(!D.seeded(localStorage))await D.seed({AppV2,base:localStorage,uuid});
  const ctl=AppV2.create({guideAlways:true,storage:D.storage(localStorage),api:null,userId:null,legacyPlan:()=>null,answers:()=>D.ANSWERS,firstName:()=>D.FIRST_NAME,render:()=>{if(V2===ctl)render()},notice:(m,err)=>setNotice(m,err),confirm:(m,o)=>globalThis.SteroidDialog.confirm(m,o)});
  await ctl.init();if(V2owner!=='demo')return;V2=ctl;V2state='ready';render()})().catch(err=>{console.warn('Démo indisponible',err);if(V2owner==='demo')V2state='off';render()});
}
function enterDemo(){try{localStorage.setItem('nolsprog-demo','1')}catch{}A.demo=true;A.menuOpen=false;A.view='app';S.tab='today';V2owner=null;V2=null;render();scrollToSectionTop()}
function exitDemo(){try{localStorage.removeItem('nolsprog-demo')}catch{}globalThis.SteroidDemo?.clear(localStorage);A.demo=false;A.menuOpen=false;V2owner=null;V2=null;S.tab='today';
 if(!A.session&&localStorage.getItem('nolsprog-onboarding-seen')!=='1')A.view='welcome';render();setNotice('Démo quittée : données fictives effacées.')}
function demoBar(){return A.demo?'<div class="v2-demo-bar" role="status"><span><b>Mode démo</b> · données fictives, rien n’est enregistré sur ton compte</span><button type="button" data-action="demo-exit">Quitter</button></div>':''}
// Écrans V2 indisponibles (erreur au démarrage) : on propose de réessayer, il n'y a plus d'ancien écran de secours.
function v2Unavailable(){return '<div class="boot v2-loading" role="status"><p>Impossible d’afficher ton programme pour le moment.</p><button type="button" class="v2-btn" data-action="v2-retry">Réessayer</button></div>'}
// Alerte de fin de repos téléphone verrouillé : à la mise en arrière-plan pendant un repos, le serveur programme une
// notification ; au retour dans l'app, elle est annulée. Seulement si les rappels sont activés sur cet appareil.
const restAlertOn=()=>{try{return localStorage.getItem('nolsprog-rest-alert')!=='off'}catch{return true}};
function deviceEndpoint(){try{const r=JSON.parse(localStorage.getItem('nolsprog-v2-reminders:'+(A.session?.user?.id||'guest'))||'{}');return r.enabled&&r.endpoint?r.endpoint:null}catch{return null}}
let restAlertSent=false;
document.addEventListener?.('visibilitychange',()=>{
 const ep=A.session&&!A.demo&&deviceEndpoint();if(!ep||!restAlertOn())return;
 if(document.visibilityState==='hidden'){
  if(!V2?.inSession())return;const t=V2.tick();if(!(t.rest>5))return;
  const next=root.querySelector('.v2-rest')?.dataset?.next||'';
  restAlertSent=true;req('/functions/v1/send-reminders',{method:'POST',token:token(),keepalive:true,body:{action:'rest',endpoint:ep,at:Date.now()+t.rest*1000,next}}).catch(()=>{});
 }else if(restAlertSent){restAlertSent=false;req('/functions/v1/send-reminders',{method:'POST',token:token(),keepalive:true,body:{action:'rest-cancel',endpoint:ep}}).catch(()=>{})}
});
// Installation guidée : iPhone (Partager → Sur l'écran d'accueil), Android (bouton d'installation du navigateur). Une fois, puis masquée.
let installPrompt=null;window.addEventListener?.('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(A.view==='app')render()});
function installCard(){
 let seen=false;try{seen=localStorage.getItem('nolsprog-install-hint')==='done'}catch{}
 const standalone=globalThis.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
 if(seen||standalone||(!ios&&!installPrompt))return '';
 const share='<svg class="v2-ic v2-ic--sm" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/></svg>';
 return '<section class="v2-card v2-install" aria-label="Installer l’app"><b>Installe STEROID comme une app</b>'+(ios?'<p>Touche '+share+' <b>Partager</b> en bas de Safari, puis <b>« Sur l’écran d’accueil »</b>. Plein écran, et les rappels deviennent possibles.</p>':'<p>Plein écran, accès direct depuis ton écran d’accueil.</p><button type="button" class="v2-btn" data-action="install-app">Installer l’app</button>')+'<button type="button" class="v2-link" data-action="install-hide">J’ai compris</button></section>';
}
function v2Main(){
 if(A.view!=='app'||(!S.plan&&!A.demo))return null;
 startV2();
 if(V2state==='loading')return '<div class="boot v2-loading" role="status">'+(A.demo?'Préparation de la démo…':'Chargement…')+'</div>';
 if(!V2)return null;
 // Juste après le questionnaire : présentation du programme généré au-dessus de l'onglet Programme.
 return S.tab==='today'?V2.todayHTML():S.tab==='stats'?V2.statsHTML():S.tab==='edit'?(S.programIntro?globalThis.SteroidUI.programIntro({cycle:V2.state().cycle,methods:eng().methods}):'')+V2.programmeHTML():null;
}
// Séance : écran allumé (Wake Lock, iPhone récents et Android), bips de fin de repos (Web Audio, coupables dans Options).
let wakeLock=null,audioCtx=null,lastBeep=null;
async function keepAwake(on){try{if(on&&!wakeLock&&navigator.wakeLock&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null})}else if(!on&&wakeLock){const l=wakeLock;wakeLock=null;await l.release()}}catch{wakeLock=null}}
const soundOn=()=>{try{return localStorage.getItem('nolsprog-sound')!=='off'}catch{return true}};
function audio(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch{return null}}
function beep(freq=880,dur=.12){if(!soundOn())return;const c=audio();if(!c)return;try{const o=c.createOscillator(),g=c.createGain(),t0=c.currentTime;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.35,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+.03)}catch{}}
// Image de la séance (format story 1080 × 1920) dessinée depuis l'écran de fin : partage du téléphone, sinon téléchargement.
async function shareSummary(){
 const sec=root.querySelector('.v2-summary');if(!sec)return;
 const txt=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
 const figs=[...sec.querySelectorAll('.v2-figures > div')].map(d=>[txt(d.querySelector('b')),txt(d.querySelector('span'))]);
 const recs=[...sec.querySelectorAll('.v2-records li')].map(txt).slice(0,3),cmp=[...sec.querySelectorAll('.v2-compare li')].map(li=>[txt(li.querySelector('span')),txt(li.querySelector('b'))]).slice(0,4);
 const streak=txt(sec.querySelector('.v2-streak b'));
 const c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d');
 const F=(w,px)=>w+' '+px+'px Archivo, Inter, system-ui, sans-serif';
 g.fillStyle='#0B4D3B';g.fillRect(0,0,1080,1920);g.fillStyle='#B8F36B';g.fillRect(90,170,120,12);
 g.fillStyle='#F5F0E5';g.font=F(900,64);g.fillText('STEROID',90,140);
 g.font=F(900,110);g.fillText('Séance',90,360);g.fillText('terminée',90,480);
 g.font=F(600,40);g.fillStyle='#A9CBB7';g.fillText(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}),90,560);
 let y=720;for(const [b,l] of figs){g.fillStyle='#F5F0E5';g.font=F(900,120);g.fillText(b,90,y);g.fillStyle='#A9CBB7';g.font=F(600,40);g.fillText(l,90,y+56);y+=210}
 if(streak){g.fillStyle='#B8F36B';g.font=F(800,46);g.fillText(streak,90,y+10);y+=90}
 for(const r of recs){g.fillStyle='#B8F36B';g.font=F(800,40);g.fillText('★ '+r.slice(0,42),90,y);y+=64}
 for(const [n,d] of cmp){g.fillStyle='#F5F0E5';g.font=F(600,40);g.fillText(n.slice(0,30),90,y);g.font=F(900,40);g.fillText(d,1080-90-g.measureText(d).width,y);y+=62}
 g.fillStyle='#A9CBB7';g.font=F(700,36);g.fillText('Entraîné avec STEROID',90,1800);
 const blob=await new Promise(res=>c.toBlob(res,'image/png'));if(!blob)return;
 const file=new File([blob],'steroid-seance.png',{type:'image/png'});
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Ma séance STEROID'});return}}catch(err){if(err?.name==='AbortError')return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);setNotice('Image de ta séance téléchargée.');
}
setInterval(()=>{
 keepAwake(Boolean(V2?.inSession())&&A.view==='app');
 if(!V2?.inSession()||S.tab!=='today'||A.view!=='app')return;
 const t=V2.tick(),chrono=root.querySelector('.v2-chrono span'),rest=root.querySelector('.v2-rest .v2-rest-time');
 if(t.done){try{navigator.vibrate?.(200)}catch{}beep(1320,.4);lastBeep=null;render();return}
 if(t.rest!=null&&t.rest<=3&&t.rest>=1&&t.rest!==lastBeep){lastBeep=t.rest;beep(880,.12)}
 {const re=root.querySelector('.v2-rest');if(re&&t.total&&t.rest!=null)re.style.setProperty('--p',Math.max(0,Math.min(1,t.rest/t.total)).toFixed(3))}
 if(t.idle&&!root.querySelector('[aria-label="Tu étais en pause ?"]')){render();return}
 if(t.rest&&!rest){render();return}
 if(chrono)chrono.textContent=globalThis.SteroidUI.clock(t.elapsed);
 if(rest&&t.rest!=null)rest.textContent=globalThis.SteroidUI.clock(t.rest).replace(/^0(\d):/,'$1:');
},1000);
const scrollToSectionTop=()=>{if(typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:'instant'});const scroller=document.scrollingElement;if(scroller)scroller.scrollTop=0};
let lastTap={a:'',t:0};
// Brouillon du Programme : alerte avant de quitter ou recharger la page.
window.addEventListener('beforeunload',e=>{if(V2?.hasDraft?.()){e.preventDefault();e.returnValue=''}});
// Bouton retour du navigateur : ferme le menu du bas ouvert au lieu de quitter l'app.
window.addEventListener('popstate',()=>{if(root.querySelector('.v2-sheet')&&V2){V2.handle('v2-close-sheet',{}).then(()=>render())}});
function trackSheet(){try{if(root.querySelector('.v2-sheet')&&!history.state?.sheet)history.pushState({sheet:1},'')}catch{}}
root.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;{const t=Date.now(),sheet=b.closest?.('.v2-sheet'),k=Object.values(b.dataset||{}).join('|');if((a!=='v2-step'&&k===lastTap.a&&t-lastTap.t<350)||(sheet&&t-(Number(sheet.dataset.openedAt)||0)<350))return;lastTap={a:k,t}}if(a==='v2-set'||a==='v2-start'||a==='v2-step')audio();if(a==='demo-enter'){enterDemo();return}if(a==='demo-exit'){exitDemo();return}if(a==='demo-toggle'){A.demo?exitDemo():enterDemo();return}if(a==='share-summary'){shareSummary();return}if(a==='theme-set'){try{localStorage.setItem('nolsprog-theme',b.dataset.theme)}catch{}applyTheme();render();return}if(a==='install-os'){A.installOs=b.dataset.os;render();return}if(a==='install-hide'){try{localStorage.setItem('nolsprog-install-hint','done')}catch{}render();return}if(a==='install-app'){const p=installPrompt;installPrompt=null;if(p){try{await p.prompt();const c=await p.userChoice;if(c?.outcome==='accepted')localStorage.setItem('nolsprog-install-hint','done')}catch{}}render();return}if(a==='rest-alert-toggle'){try{localStorage.setItem('nolsprog-rest-alert',restAlertOn()?'off':'on')}catch{}render();return}if(a==='sound-toggle'){try{localStorage.setItem('nolsprog-sound',soundOn()?'off':'on')}catch{}render();return}if(a==='v2-retry'){V2owner=null;V2state=null;render();return}if(a.startsWith('v2-')&&V2){const d={...b.dataset};if((a==='v2-review'||a==='v2-proposal-open')&&S.tab!=='today'){S.tab='today'}if(a==='v2-last-open'){S.previousTab=S.tab;S.tab='stats'}if(a==='v2-sub')d.keep=Boolean(document.getElementById('v2-keep')?.checked);try{await V2.handle(a,d)}catch(err){setNotice(err.message,true)}return}if(a==='auth-login'){A.mode='login';A.view='account';render()}else if(a==='auth-signup'){A.mode='signup';A.view='account';render()}else if(a==='auth-recover'){A.mode='recover';A.view='account';render()}else if(a==='resend-confirm'){if(!A.email){setNotice('Renseigne ton email pour renvoyer la confirmation.',true);return}try{await req('/auth/v1/resend',{method:'POST',body:{type:'signup',email:A.email,options:{emailRedirectTo:location.origin+location.pathname}}});setNotice('Si ton adresse est en attente de confirmation, un nouvel email a été demandé.')}catch(err){setNotice('Impossible de renvoyer le message : '+err.message,true)}}else if(a==='back-app'){A.view='app';render()}else if(a==='account-menu'){A.menuOpen=!A.menuOpen;render()}else if(a==='open-settings'){A.menuOpen=false;S.tab='settings';render()}else if(a==='settings-back'){S.tab='today';render()}else if(a==='logout'){if(A.busy)return;A.busy=true;await flushSets();await V2?.remindersOff?.();if(syncInFlight||programSyncPromise||anyPending(A.session?.user?.id)){A.busy=false;setNotice('Déconnexion bloquée : des données ne sont pas encore synchronisées. Reconnecte-toi au réseau et réessaie.',true);return}try{await req('/auth/v1/logout',{method:'POST',token:token()})}catch(e){console.warn('Déconnexion distante indisponible',e)}const previousUserId=A.session?.user?.id;clearPrivateCache(previousUserId);V2=null;V2owner=null;V2state='off';setSession(null);A.profile=null;A.answers=null;A.firstName='';A.menuOpen=false;S.logs=[];S.plan=seed();S.start=iso(monday(new Date()));S.week=currentWeek(S.start);S.tab='today';S.draft=null;A.view='welcome';A.busy=false;render()}else if(a==='edit-profile'){A.menuOpen=false;A.answers=structuredClone(A.profile?.answers||eng().defaults);A.step=0;A.view='onboard';render()}else if(a==='guest'){A.view='onboard';A.step=0;A.answers=structuredClone(eng().defaults);render()}else if(a==='pw-toggle'){const i=b.closest('form')?.querySelector('input[name="password"]');if(i){const show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'Masquer':'Afficher';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe')}}else if(a==='account'){A.view='account';A.mode='login';render()}else if(a==='onboard-exit'){A.view=A.session?'app':'welcome';render()}else if(a==='guide-close'){A.guide=false;render();scrollToSectionTop()}else if(a==='guide-edit'){A.guide=false;A.step=Math.max(0,Math.min(onboardingStages.length-1,Number(b.dataset.step)||0));render();scrollToSectionTop()}else if(a==='guide-apply'){
 const d=globalThis.SteroidGuide.diagnostic(A.answers),choice=d.choices[Number(b.dataset.index)];if(!choice)return;
 A.answers=globalThis.SteroidGuide.change(A.answers,choice.patch);
 const next=globalThis.SteroidGuide.diagnostic(A.answers);
 if(next.ok){A.guide=false;A.step=onboardingStages.length-1;render();scrollToSectionTop();setNotice('Ajustement appliqué. Vérifie tes réponses, puis crée ton programme.')}else{A.guide=true;render();scrollToSectionTop()}
 }else if(a==='prev-step'){A.step=Math.max(0,A.step-1);render();scrollToSectionTop()}else if(a==='next-step'){if(A.step<onboardingStages.length-1){A.step++;render();scrollToSectionTop()}else {if(globalThis.SteroidGuide.diagnostic(A.answers).ok&&globalThis.SteroidUI){A.recap=true;render()}else await finishOnboarding();scrollToSectionTop()}}else if(a==='recap-edit'){A.recap=false;render();scrollToSectionTop()}else if(a==='onboard-confirm'){A.recap=false;await finishOnboarding();scrollToSectionTop()}else if(a==='intro-start'){S.programIntro=false;S.previousTab=S.tab;S.tab='today';render();scrollToSectionTop()}else if(a==='choice'){A.guide=false;const key=b.dataset.key,v=b.dataset.value;if(key==='planMode'&&v==='free')A.answers.days=[0,1,2,3,4,5,6];const dd=eng().DEFAULT_DAYS||{};if((key==='daysCount'&&A.answers.planMode!=='free')||(key==='planMode'&&v==='days'&&A.answers.planMode==='free'))A.answers.days=[...(dd[key==='daysCount'?v:A.answers.daysCount]||[0,2,4])];if(key==='days'||key==='priority'){const value=key==='days'?Number(v):v,list=Array.isArray(A.answers[key])?A.answers[key]:[];if(key==='priority'&&!list.includes(value)&&list.length>=2){setNotice('Deux muscles prioritaires au maximum : retire-en un pour en choisir un autre.',true);return}A.answers[key]=list.includes(value)?list.filter(x=>x!==value):[...list,value]}else A.answers[key]=v;render()}else if(a==='backup'){A.menuOpen=false;downloadBackup();render();setNotice('Sauvegarde téléchargée.')}else if(a==='tab'){clearNotice();A.menuOpen=false;
  // Programme modifié sans enregistrer : on demande avant de quitter l'onglet.
  if(S.tab==='edit'&&b.dataset.tab!=='edit'&&V2?.hasDraft?.()){const r=await globalThis.SteroidDialog.open({title:'Enregistrer tes modifications ?',message:'Tu as modifié ton programme sans l’enregistrer.',actions:[{value:'save',label:'Enregistrer',primary:true},{value:'drop',label:'Ne pas enregistrer',danger:true}],cancelLabel:'Rester'});if(!r)return;if(r.action==='save')V2.saveDraft();else V2.cancelDraft()}
S.previousTab=S.tab;S.tab=b.dataset.tab;render();scrollToSectionTop()}});
// Save typed set values locally as they change: closing the app must not lose a focused field.
root.addEventListener('input',e=>{
 const el=e.target;
 if(el?.dataset?.v2Field){el.dataset.len=String(el.value.length);V2?.input({ex:el.dataset.ex,set:el.dataset.set,field:el.dataset.v2Field,value:el.value});return}
 if('v2Search' in (el?.dataset||{})){V2?.change({kind:'search',value:el.value});const box=root.querySelector('.v2-results');if(box&&V2?.pickerResultsHTML)box.innerHTML=V2.pickerResultsHTML();else render();return}
});
window.addEventListener('online',()=>{V2?.flushNow()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.querySelector('.v2-sheet [data-action="v2-close-sheet"],.v2-sheet-wrap [data-action="v2-close-sheet"]')){V2?.handle('v2-close-sheet')}});
window.addEventListener('pagehide',()=>{V2?.flushNow();if(A.session)flushSets().catch(()=>{})});

root.addEventListener('change',async e=>{const el=e.target;if('v2RemTime' in (el.dataset||{})){V2?.change({kind:'rem-time',value:el.value});return}if(el.dataset?.v2Sets){V2?.change({kind:'sets',ce:el.dataset.v2Sets,value:el.value});return}if(el.dataset?.v2Reps){V2?.change({kind:'reps',ce:el.dataset.v2Reps,value:el.value});return}if(el.dataset?.v2Rest){V2?.change({kind:'rest',ce:el.dataset.v2Rest,value:el.value});return}if('v2Progress' in (el.dataset||{})){V2?.change({kind:'progress',value:el.value});return}if(el.dataset.profile&&A.answers){A.answers[el.dataset.profile]=el.value;return}});
root.addEventListener('submit',async e=>{
 if('v2Cardio' in (e.target?.dataset||{})){e.preventDefault();const f=new FormData(e.target);await V2?.saveCardio({type:f.get('type'),minutes:f.get('minutes'),workout:f.get('workout'),id:f.get('id')||undefined});return}
 if('v2CardioPlan' in (e.target?.dataset||{})){e.preventDefault();const f=new FormData(e.target);await V2?.addCardioPlan({type:f.get('type'),minutes:f.get('minutes'),per_week:f.get('per_week')});return}
 if('v2Next' in (e.target?.dataset||{})){e.preventDefault();V2?.proposeNext(Object.fromEntries(new FormData(e.target)));return}
 if('v2Create' in (e.target?.dataset||{})){e.preventDefault();const f=new FormData(e.target);await V2?.createExercise({name:f.get('name'),muscle:f.get('muscle'),pattern:f.get('pattern')});return}
 if(e.target.id==='settings-form'){e.preventDefault();await saveAccountSettings(e.target);return}
 if(e.target.id==='password-form'){e.preventDefault();const password=String(new FormData(e.target).get('password')||'');if(password.length<8)return;try{await req('/auth/v1/user',{method:'PUT',token:token(),body:{password}});A.mode='login';await loadCloud();setNotice('Mot de passe enregistré')}catch(err){setNotice('Impossible de définir le mot de passe : '+err.message,true)}return}
 if(e.target.id!=='auth-form')return;
 e.preventDefault();if(A.busy)return;A.busy=true;
 const data=new FormData(e.target),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');A.email=email;
 try{
  // Validation maison en français (les messages du navigateur peuvent être en anglais).
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Indique une adresse e-mail valide.');
  if(A.mode==='recover'){await req('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:{email}});setNotice('Si cette adresse possède un compte, un lien de récupération a été demandé. Vérifie aussi les spams.');return}
  if(password.length<8)throw Error('Le mot de passe doit contenir au moins 8 caractères.');
  const signup=A.mode==='signup';
  const path=signup?'/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+location.pathname):'/auth/v1/token?grant_type=password';
  const firstName=String(data.get('first_name')||'').trim();if(signup&&(!firstName||firstName.length>60))throw Error('Indique ton prénom.');if(signup)A.firstName=firstName;const s=await req(path,{method:'POST',body:signup?{email,password,data:{first_name:firstName}}:{email,password}});
  if(!s.access_token){A.mode='verify';A.view='account';render();setNotice('Vérifie ton email pour activer le compte. Tu pourras renvoyer le lien depuis cet écran.');return}
  if(!signup)A.firstName='';setSession({...s,expires_at:Math.floor(Date.now()/1000)+(s.expires_in||3600)});
  await loadCloud();setNotice('Compte connecté');
 }catch(err){setNotice('Connexion : '+err.message,true)}
 finally{A.busy=false}
});
loadLocal();initAuth();
window.SteroidUpdates?.start({
 isSafe:()=>A.view==='app'&&!V2?.busy()&&!A.busy&&!syncInFlight&&!programSyncPromise&&!hasPendingChanges(A.session?.user?.id)&&!document.querySelector('input:focus,textarea:focus,select:focus'),
 autoOnLaunch:true
});

