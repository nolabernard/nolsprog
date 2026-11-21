/* STÉROÏDE V2 — écrans P1 « Guidé » (accueil, séance, machine prise, fin, progrès, choix d'exercice).
 * Fonctions pures : données en entrée, HTML échappé en sortie. Aucun état, aucun DOM.
 * Les actions passent par data-action="v2-…" ; app.js les branche. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidUI=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Cat=()=>globalThis.SteroidCatalogue;
const nameOf=(key,ux=[])=>Cat()?.byKey(key)?.name||ux.find(u=>u.key===key)?.name||'Exercice';
const kg=v=>v==null?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2});
const clock=sec=>{sec=Math.max(0,Math.round(sec||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60,p=n=>String(n).padStart(2,'0');return h?h+':'+p(m)+':'+p(s):p(m)+':'+p(s)};
const restText=sec=>{sec=Number(sec)||0;if(sec<60)return sec+' s';const m=Math.floor(sec/60),s=sec%60;return m+' min'+(s?' '+s:'')};
const reps=(a,b)=>a===b?String(a):a+' à '+b;
const plural=(n,one,many)=>n+' '+(n>1?many:one);
const P={play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',check:'<path d="m5 12 5 5L20 7"/>',swap:'<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',left:'<path d="m15 18-6-6 6-6"/>',right:'<path d="m9 18 6-6-6-6"/>',
 later:'<path d="M12 8v4l3 2"/><path d="M3.05 11a9 9 0 1 1 .5 4"/><path d="M3 4v7h7"/>',skip:'<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',coach:'<path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3z"/><path d="M10 22h4"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'};
const icon=(n,cls='v2-ic')=>'<svg class="'+cls+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+P[n]+'</svg>';
const ordered=w=>[...(w?.exercises||[])].sort((a,b)=>a.position-b.position);
const totalSets=s=>(s?.exercises||[]).reduce((n,e)=>n+(Number(e.sets)||0),0);

function ring(value){
 const pct=Math.round(Math.max(0,Math.min(1,value||0))*100),r=26,c=2*Math.PI*r;
 return '<div class="v2-ring" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="Avancée du cycle : '+pct+' %"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="'+r+'" class="v2-ring-track"/>'+(pct?'<circle cx="32" cy="32" r="'+r+'" class="v2-ring-value" stroke-dasharray="'+(c*pct/100).toFixed(1)+' '+c.toFixed(1)+'"/>':'')+'</svg><b>'+pct+'<small>%</small></b></div>';
}

const DAYS=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'],DAY1=['L','M','M','J','V','S','D'];
const CARDIO=[['marche','Marche'],['course','Course'],['velo','Vélo'],['elliptique','Elliptique'],['rameur','Rameur'],['natation','Natation'],['escaliers','Escaliers'],['autre','Autre']];
const cardioName=t=>(CARDIO.find(c=>c[0]===t)||[0,'Cardio'])[1];
function rhythmHTML(r){
 if(!r)return '';
 if(r.mode==='free')return '<p class="v2-muted">'+r.goal+' séance'+(r.goal>1?'s':'')+' par semaine, quand tu veux.</p>';
 const today=r.todayPlanned?r.nextDay:-1;
 return '<div class="v2-days" role="img" aria-label="Tes jours : '+r.days.map(d=>DAYS[d]).join(', ')+'">'+DAY1.map((l,i)=>'<span class="'+(r.days.includes(i)?'is-on':'')+(i===today?' is-today':'')+'">'+l+'</span>').join('')+'</div>'
  +'<p class="v2-muted">'+(r.todayPlanned?'Aujourd’hui fait partie de tes jours.':'Prochain jour conseillé : '+DAYS[r.nextDay]+'.')+' Rien n’est bloqué : tu t’entraînes quand tu peux.</p>';
}
function cardioHTML(c){
 if(!c)return '';
 return '<div class="v2-cardio-line">'+(c.target?'<p><b>Cardio : '+Number(c.minutes)+' / '+Number(c.target)+' min cette semaine</b></p>':c.minutes?'<p><b>Cardio : '+Number(c.minutes)+' min cette semaine</b></p>':'')+'<button type="button" class="v2-link" data-action="v2-cardio-open">'+icon('plus','v2-ic v2-ic--sm')+'Noter du cardio</button></div>';
}
function cardioSheet({workoutId=''}={}){
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Noter du cardio"><i class="v2-grab"></i><h2>Noter du cardio</h2>'
  +'<form class="v2-create" data-v2-cardio><input type="hidden" name="workout" value="'+esc(workoutId)+'"><fieldset class="v2-types"><legend class="v2-sheet-label">Activité</legend>'
  +CARDIO.map(([v,t],i)=>'<label><input type="radio" name="type" value="'+v+'" '+(i===0?'checked':'')+'><span>'+t+'</span></label>').join('')+'</fieldset>'
  +'<label class="v2-field-label">Durée (minutes)<input name="minutes" type="number" inputmode="numeric" min="1" max="600" required value="30"></label>'
  +'<button type="submit" class="v2-btn">Enregistrer le cardio</button></form></section></div>';
}
function home({next,hasHistory=false,cycle,progress=0,minutes,firstName,dateText,weekLine,record,building=false,active=null,retry=false,rhythm=null,cardio=null}={}){
 const head='<header class="v2-home-head"><div>'+(dateText?'<p class="v2-date">'+esc(dateText)+'</p>':'')+'<h1 class="v2-hello">'+esc(firstName?'Salut '+firstName:'Salut')+'</h1></div></header>';
 if(!cycle||!next)return '<section class="v2-home">'+head+'<div class="v2-card v2-empty">'+(retry?'<h2>Programme indisponible</h2><p>Impossible de joindre ton compte. Vérifie ta connexion.</p>':'<h2>Ton programme t’attend</h2><p>Je prépare ta suite de séances à partir de tes réponses.</p>')+'<button type="button" class="v2-btn" data-action="v2-build" '+(building?'disabled':'')+'>'+(building?'Préparation…':retry?'Réessayer':'Préparer mon programme')+'</button></div></section>';
 const s=next.session,count=(s.exercises||[]).length;
 if(active)return '<section class="v2-home">'+head+'<section class="v2-next" aria-label="Séance en cours"><p class="v2-next-kicker">Séance en cours</p><h2 class="v2-next-title">'+esc(active.title)+'</h2><p>'+active.done+' / '+plural(active.total,'série validée','séries validées')+'</p><button type="button" class="v2-btn v2-btn--light v2-btn--big" data-action="v2-back">'+icon('play')+'Reprendre la séance</button></section></section>';
 let html='<section class="v2-home">'+head+'<section class="v2-next" aria-label="Prochaine séance"><div class="v2-next-top"><div><p class="v2-next-kicker">Prochaine séance</p><h2 class="v2-next-title">'+esc(s.title)+'</h2></div>'+ring(progress)+'</div>'
  +'<div class="v2-chips">'+(s.focus||[]).map(f=>'<span>'+esc(f)+'</span>').join('')+'</div>'
  +'<dl class="v2-figures"><div><b>'+count+'</b> <span>exercices</span></div><div><b>'+totalSets(s)+'</b> <span>séries</span></div>'+(minutes?'<div><b>≈ '+Number(minutes)+'</b> <span>minutes</span></div>':'')+'</dl>'
  +'<button type="button" class="v2-btn v2-btn--light v2-btn--big" data-action="v2-start" data-session="'+esc(s.id)+'">'+icon('play')+'Démarrer</button></section>';
 const coach=next.reason==='recovery'||next.reason==='recovery-all';
 html+='<div class="v2-coach">'+icon('coach','v2-ic v2-coach-ic')+'<div><p>'+(coach?esc(next.message):(hasHistory?'On reprend la suite là où tu t’es arrêté, sans séance « manquée ».':'Première séance de ton cycle. Ensuite, chaque séance suit la précédente, quel que soit le jour.'))+'</p>'
  +(next.reason==='recovery'?'<div class="v2-coach-actions"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-start" data-session="'+esc(s.id)+'">D’accord</button><button type="button" class="v2-link" data-action="v2-start" data-session="'+esc(next.planned.id)+'">Faire '+esc(next.planned.title)+' quand même</button></div>':'')
  +'<button type="button" class="v2-link" data-action="v2-choose">Changer de séance</button></div></div>';
 if(weekLine||record||rhythm||cardio)html+='<section class="v2-card v2-week">'+(weekLine?'<p class="v2-week-line">'+esc(weekLine)+'</p>':'')+rhythmHTML(rhythm)+cardioHTML(cardio)+(record?'<p class="v2-muted">'+icon('trophy','v2-ic v2-ic--sm')+esc(record)+'</p>':'')+'</section>';
 return html+'</section>';
}

function chooser({sessions=[],current}={}){
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Choisir une séance"><i class="v2-grab"></i><h2>Quelle séance aujourd’hui ?</h2>'
  +sessions.map(s=>'<button type="button" class="v2-opt'+(s.id===current?' is-current':'')+'" data-action="v2-pick-session" data-session="'+esc(s.id)+'"><span><b>'+esc(s.title)+'</b><small>'+esc((s.focus||[]).join(', '))+' · '+plural((s.exercises||[]).length,'exercice','exercices')+'</small></span></button>').join('')+'</section></div>';
}

function session({workout,index=0,elapsed=0,paused=false,pausedFor=0,rest=null,last={},advice={},userExercises=[],pending=0}={}){
 const list=ordered(workout).filter(e=>e.status!=='skipped');
 const i=Math.max(0,Math.min(index,list.length-1)),e=list[i];
 if(!e)return '<section class="v2-session"><p>Aucun exercice dans cette séance.</p><button type="button" class="v2-btn" data-action="v2-finish">Terminer la séance</button></section>';
 const p=e.plan||{},prev=last[e.exercise_key];
 let html='<section class="v2-session" aria-label="Séance en cours"><header class="v2-session-top"><button type="button" class="v2-iconbtn" data-action="v2-exit" aria-label="Revenir à l’accueil (la séance reste en cours)">'+icon('close')+'</button>'
  +'<button type="button" class="v2-chrono'+(paused?' is-paused':'')+'" data-action="'+(paused?'v2-resume':'v2-pause')+'" aria-label="'+(paused?'Reprendre la séance':'Mettre la séance en pause')+'">'+icon(paused?'play':'pause','v2-ic v2-ic--sm')+'<span>'+clock(elapsed)+'</span></button>'
  +'<button type="button" class="v2-iconbtn" data-action="v2-more" aria-label="Plus d’options">'+icon('more')+'</button></header>'
  +'<div class="v2-steps" aria-label="Exercice '+(i+1)+' sur '+list.length+'">'+list.map((x,k)=>'<i class="'+(x.sets.every(s=>s.completed)?'is-done':k===i?'is-current':'')+'"></i>').join('')+'</div>';
 if(paused)html+='<div class="v2-paused" role="status">'+icon('pause','v2-ic v2-ic--sm')+'<span><b>En pause'+(pausedFor>=60?' depuis '+Math.floor(pausedFor/60)+' min':'')+'.</b> Ce temps ne compte pas.</span><button type="button" class="v2-link" data-action="v2-resume">Reprendre</button></div>';
 html+='<div class="v2-ex-head"><p class="v2-ex-count">Exercice '+(i+1)+' sur '+list.length+'</p><h1 class="v2-ex-title">'+esc(nameOf(e.exercise_key,userExercises))+'</h1><p class="v2-muted">'+plural(p.sets||e.sets.length,'série','séries')+' · '+reps(p.reps_min,p.reps_max)+' reps · repos '+restText(p.rest_seconds)+'</p>'
  +(prev?'<span class="v2-chip">Dernière fois : '+(prev.weight==null?'—':kg(prev.weight)+' kg')+' × '+(prev.reps??'—')+'</span>':'')+(advice[e.exercise_key]?'<p class="v2-advice">'+icon('coach','v2-ic v2-ic--sm')+'<span>'+esc(advice[e.exercise_key].text)+'</span></p>':'')+'</div>';
 html+='<div class="v2-sets"><div class="v2-set-labels" aria-hidden="true"><span>Série</span><span>kg</span><span>Reps</span><span></span></div>';
 for(const s of e.sets){
  const n=s.set_number;
  html+='<div class="v2-set'+(s.completed?' is-done':'')+'"><span class="v2-set-num">'+n+'</span>'
   +'<input class="v2-cell" aria-label="Charge série '+n+' (kg)" data-v2-field="weight" data-ex="'+esc(e.id)+'" data-set="'+n+'" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="'+(s.weight==null?'':esc(s.weight))+'">'
   +'<input class="v2-cell" aria-label="Répétitions série '+n+'" data-v2-field="reps" data-ex="'+esc(e.id)+'" data-set="'+n+'" type="number" inputmode="numeric" min="0" placeholder="reps" value="'+(s.reps==null?'':esc(s.reps))+'">'
   +'<button type="button" class="v2-ok" data-action="v2-set" data-ex="'+esc(e.id)+'" data-set="'+n+'" aria-pressed="'+s.completed+'" aria-label="'+(s.completed?'Série '+n+' validée':'Valider la série '+n)+'">'+icon('check')+'</button></div>';
 }
 html+='</div>';
 if(rest)html+='<div class="v2-rest" role="timer" aria-live="polite"><span>Repos</span><b>'+clock(rest.remaining).replace(/^0(\d):/,'$1:')+'</b><button type="button" class="v2-btn v2-btn--ghost v2-btn--sm" data-action="v2-rest-plus">+30 s</button><button type="button" class="v2-btn v2-btn--ghost v2-btn--sm" data-action="v2-rest-skip">Passer</button></div>';
 const lastOne=i===list.length-1;
 html+='<footer class="v2-session-foot"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-machine" data-ex="'+esc(e.id)+'">'+icon('swap')+'Machine prise</button><div class="v2-nav"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-prev" aria-label="Exercice précédent" '+(i===0?'disabled':'')+'>'+icon('left')+'</button>'
  +(lastOne?'<button type="button" class="v2-btn" data-action="v2-finish">Terminer la séance</button>':'<button type="button" class="v2-btn" data-action="v2-next">Exercice suivant'+icon('right')+'</button>')+'</div>'
  +(pending?'<p class="v2-sync">'+plural(pending,'modification en attente d’envoi','modifications en attente d’envoi')+'</p>':'')+'</footer></section>';
 return html;
}

function machineSheet({exercise,alternatives=[],canLater=true,practiced={}}={}){
 const p=exercise.plan||{};
 const work=(p.sets||exercise.sets.length)+' × '+(p.reps_min===p.reps_max?p.reps_min:p.reps_min+'–'+p.reps_max)+', repos '+restText(p.rest_seconds);
 let html='<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Machine prise"><i class="v2-grab"></i><h2>Machine prise ? Pas de souci.</h2><p class="v2-muted">On garde le même travail : '+work+'.</p>';
 if(canLater)html+='<button type="button" class="v2-opt v2-opt--main" data-action="v2-later" data-ex="'+esc(exercise.id)+'">'+icon('later')+'<span><b>Faire plus tard</b><small>Passe en fin de séance. La machine se libère souvent vite.</small></span></button>';
 if(alternatives.length){
  html+='<p class="v2-sheet-label">Ou le remplacer par</p>'+alternatives.map(a=>'<button type="button" class="v2-opt" data-action="v2-sub" data-ex="'+esc(exercise.id)+'" data-key="'+esc(a.key)+'"><span><b>'+esc(a.name)+'</b><small>Même mouvement'+(practiced[a.key]?' · déjà fait '+plural(practiced[a.key],'fois','fois'):'')+'</small></span><span class="v2-tag">'+(a.role==='base'?'Base':'Finition')+'</span></button>').join('')
   +'<label class="v2-check"><input type="checkbox" id="v2-keep"> Garder ce remplacement dans mon programme</label>';
 }else html+='<p class="v2-note">Aucun remplaçant du même type avec ton matériel. Tu peux le faire plus tard ou le passer.</p>';
 return html+'<button type="button" class="v2-link v2-link--center" data-action="v2-skip" data-ex="'+esc(exercise.id)+'">'+icon('skip','v2-ic v2-ic--sm')+'Passer cet exercice</button></section></div>';
}

function moreSheet({exercise}={}){
 const rpe=exercise?.rpe;
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Options de la séance"><i class="v2-grab"></i><h2>Options</h2>'
  +(exercise?'<p class="v2-sheet-label">Ressenti sur cet exercice (1 facile, 10 maximal)</p><div class="v2-rpe">'+Array.from({length:10},(_,k)=>'<button type="button" class="'+(rpe===k+1?'is-on':'')+'" data-action="v2-rpe" data-ex="'+esc(exercise.id)+'" data-rpe="'+(k+1)+'" aria-pressed="'+(rpe===k+1)+'">'+(k+1)+'</button>').join('')+'</div>':'')
  +'<button type="button" class="v2-btn" data-action="v2-finish">Terminer la séance</button><p class="v2-muted v2-center">Tu peux terminer sans tout valider : seules les séries validées comptent.</p></section></div>';
}

function idlePrompt(minutes){
 return '<div class="v2-sheet-wrap"><section class="v2-sheet" role="alertdialog" aria-modal="true" aria-label="Tu étais en pause ?"><h2>Tu étais en pause ?</h2><p class="v2-muted">Aucune action depuis '+Number(minutes)+' min.</p><button type="button" class="v2-btn" data-action="v2-idle-yes">Oui, ne pas compter ce temps</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-idle-no">Non, je m’entraînais</button></section></div>';
}

function summary({workout,pending=0,local=false,userExercises=[],records=[]}={}){
 const list=ordered(workout),done=list.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0);
 const vol=list.reduce((n,e)=>n+e.sets.filter(s=>s.completed&&s.weight!=null&&s.reps!=null).reduce((a,s)=>a+s.weight*s.reps,0),0);
 const min=Math.round((workout.duration_seconds||0)/60);
 return '<section class="v2-summary"><div class="v2-done-mark">'+icon('check')+'</div><h1 class="v2-hello">Séance terminée</h1><dl class="v2-figures v2-figures--dark"><div><b>'+min+' min</b> <span>d’effort</span></div><div><b>'+plural(done,'série validée','séries validées').replace(/^(\d+) /,'$1</b> <span>')+'</span></div><div><b>'+Math.round(vol).toLocaleString('fr-FR')+'</b> <span>kg soulevés</span></div></dl>'
  +(records.length?'<ul class="v2-records">'+records.map(r=>'<li>'+icon('trophy','v2-ic v2-ic--sm')+'<span>Nouveau record : '+recordText(r,userExercises)+'</span></li>').join('')+'</ul>':'')+'<ul class="v2-sum-list">'+list.map(e=>{const d=e.sets.filter(s=>s.completed).length;return '<li><span>'+esc(nameOf(e.exercise_key,userExercises))+'</span><small>'+(e.status==='skipped'?'passé':d+'/'+e.sets.length)+'</small></li>'}).join('')+'</ul>'
  +'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-cardio-open" data-workout="'+esc(workout.id)+'">'+icon('plus')+'Ajouter du cardio</button><p class="v2-sync" role="status">'+(pending?'Enregistrée sur ce téléphone, envoi en attente.':local?'Enregistrée sur ce téléphone.':'Enregistrée.')+'</p><button type="button" class="v2-btn v2-btn--big" data-action="v2-close-summary">Retour à l’accueil</button></section>';
}

function chart(points,metric){
 const vals=points.map(p=>p[metric]).filter(v=>v!=null);if(vals.length<1)return '';
 const max=Math.max(...vals)*1.15||1,W=340,H=180,x=i=>24+i*((W-48)/Math.max(1,points.length-1)),y=v=>H-24-(v/max)*(H-48);
 const pts=points.map((p,i)=>p[metric]==null?null:[x(i),y(p[metric])]).filter(Boolean);
 return '<svg class="v2-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Évolution par séance"><line x1="24" y1="'+(H-24)+'" x2="'+(W-24)+'" y2="'+(H-24)+'"/>'+(pts.length>1?'<polyline points="'+pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')+'"/>':'')+pts.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4"/>').join('')+'</svg>';
}

const MON=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function cardioBlock(weeks){
 if(!weeks?.length)return '';
 const total=weeks.reduce((n,w)=>n+w.minutes,0),max=Math.max(1,...weeks.map(w=>w.minutes));
 return '<section class="v2-card"><h2 class="v2-card-title">Cardio</h2><p class="v2-muted">'+total+' min sur '+weeks.length+' semaines</p><ul class="v2-bars">'+weeks.map(w=>{const [y,m,d]=w.week.split('-').map(Number);return '<li><span>'+d+' '+MON[m-1]+'</span><i style="--v:'+(w.minutes/max).toFixed(3)+'"></i><b>'+w.minutes+' min</b></li>'}).join('')+'</ul></section>';
}
const WD=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
function dayText(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'':WD[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]}
// Sans charge notée : seulement les répétitions (jamais « 0 kg »).
const setText=s=>s.weight==null?(s.reps??'—')+' reps':kg(s.weight)+' × '+(s.reps??'—');
function diffText(d){
 if(!d)return '';
 if(d.weight)return '<span class="v2-diff'+(d.weight>0?' is-up':'')+'">'+(d.weight>0?'+':'−')+kg(Math.abs(d.weight))+' kg</span>';
 if(d.reps)return '<span class="v2-diff'+(d.reps>0?' is-up':'')+'">'+(d.reps>0?'+':'−')+plural(Math.abs(d.reps),'rép.','rép.')+'</span>';
 return '<span class="v2-diff">=</span>';
}
const recordText=(r,ux)=>esc(nameOf(r.key,ux))+' : '+kg(r.weight)+' kg × '+r.reps+(r.kind==='reps'?' (+'+plural(r.delta,'répétition','répétitions')+')':' (+'+kg(r.delta)+' kg)');
function tabs(tab){return '<div class="v2-seg v2-seg--2" role="group" aria-label="Affichage">'+[['exercises','Exercices'],['sessions','Séances']].map(([v,t])=>'<button type="button" data-action="v2-progress-tab" data-tab="'+v+'" aria-pressed="'+(tab===v)+'">'+t+'</button>').join('')+'</div>'}
function sessionsHTML(list,open,userExercises,records){
 const s=open&&list.find(x=>x.id===open);
 if(s){
  return '<button type="button" class="v2-link v2-back" data-action="v2-history-close">'+icon('left','v2-ic v2-ic--sm')+'Toutes les séances</button>'
   +'<section class="v2-card"><p class="v2-muted">'+esc(dayText(s.date))+'</p><h2 class="v2-card-title">'+esc(s.title)+'</h2><p class="v2-muted">'+[s.minutes!=null?s.minutes+' min':null,plural(s.sets,'série validée','séries validées'),Math.round(s.volume).toLocaleString('fr-FR')+' kg'].filter(Boolean).join(' · ')+'</p>'
   +(records?.length?'<ul class="v2-records">'+records.map(r=>'<li>'+icon('trophy','v2-ic v2-ic--sm')+'<span>Record : '+recordText(r,userExercises)+'</span></li>').join('')+'</ul>':'')+'</section>'
   +(s.exercises.length?'<ul class="v2-sum-list">'+s.exercises.map(e=>'<li class="v2-hist-ex"><span><b>'+esc(nameOf(e.key,userExercises))+'</b>'+(e.from?'<small>à la place de '+esc(nameOf(e.from,userExercises))+'</small>':'')+'</span><small>'+e.sets.map(setText).join(' · ')+'</small></li>').join('')+'</ul>':'<p class="v2-card v2-empty">Aucune série validée dans cette séance.</p>')
   +(s.cardio.length?'<p class="v2-muted">Cardio : '+s.cardio.map(c=>esc(cardioName(c.type))+' '+c.minutes+' min').join(', ')+'</p>':'');
 }
 if(!list.length)return '<p class="v2-card v2-empty">Tes séances terminées apparaîtront ici.</p>';
 return '<ul class="v2-hist">'+list.slice(0,60).map(x=>'<li><button type="button" class="v2-opt" data-action="v2-history-open" data-id="'+esc(x.id)+'"><span><b>'+esc(x.title)+'</b><small>'+esc(dayText(x.date))+' · '+[x.minutes!=null?x.minutes+' min':null,plural(x.sets,'série','séries')].filter(Boolean).join(' · ')+(x.cardio.length?' · cardio':'')+'</small></span>'+icon('right','v2-ic v2-ic--sm')+'</button></li>').join('')+'</ul>';
}
function progress({progress,selected,metric='weight',userExercises=[],cardio=null,tab='exercises',history=null,advice=null,sessions=[],open=null,records=[],truncated=false}={}){
 const keys=Object.keys(progress?.byKey||{}).sort((a,b)=>nameOf(a,userExercises).localeCompare(nameOf(b,userExercises),'fr'));
 let html='<section class="v2-progress"><h1 class="v2-hello">Tes progrès</h1>'+tabs(tab);
 if(tab==='sessions')return html+sessionsHTML(sessions,open,userExercises,records)+'</section>';
 html+='<dl class="v2-figures v2-figures--card"><div><b>'+(progress?.totals.sets||0)+'</b> <span>'+((progress?.totals.sets||0)>1?'séries validées':'série validée')+'</span></div><div><b>'+Math.round(progress?.totals.volume||0).toLocaleString('fr-FR')+'</b> <span>kg de volume</span></div></dl>';
 if(!keys.length)return html+'<p class="v2-card v2-empty">Ton graphique apparaîtra après tes premières séries validées.</p>'+cardioBlock(cardio)+'</section>';
 const key=keys.includes(selected)?selected:keys[0],points=progress.byKey[key],rec=history?.key===key&&!truncated?history.record:null;
 html+='<label class="v2-field-label" for="v2-progress-ex">Exercice</label><select id="v2-progress-ex" class="v2-select" data-v2-progress>'+keys.map(k=>'<option value="'+esc(k)+'" '+(k===key?'selected':'')+'>'+esc(nameOf(k,userExercises))+'</option>').join('')+'</select>'
  +'<div class="v2-seg" role="group" aria-label="Mesure">'+[['weight','Charge max'],['reps','Répétitions'],['volume','Volume']].map(([v,t])=>'<button type="button" data-action="v2-metric" data-metric="'+v+'" aria-pressed="'+(metric===v)+'">'+t+'</button>').join('')+'</div>'
  +'<div class="v2-card">'+(chart(points,metric)||'<p class="v2-muted">Pas encore de valeur pour cette mesure.</p>')+'<p class="v2-muted">'+plural(points.length,'séance','séances')+(rec?' · Meilleure série : '+kg(rec.weight)+' kg × '+rec.reps:'')+'</p></div>';
 if(advice)html+='<section class="v2-card v2-advice-card"><h2 class="v2-card-title">'+icon('coach','v2-ic v2-ic--sm')+'Prochaine fois</h2><p>'+esc(advice.text)+'</p><p class="v2-muted">Un conseil, pas une obligation : c’est toi qui décides de la charge.</p></section>';
 const entries=history?.key===key?history.entries.slice(0,8):[];
 if(entries.length)html+='<section class="v2-card"><h2 class="v2-card-title">Séance par séance</h2><ul class="v2-compare">'+entries.map(e=>'<li><div><b>'+esc(dayText(e.date))+'</b>'+(e.from?'<small>à la place de '+esc(nameOf(e.from,userExercises))+'</small>':'')+'</div><span>'+e.sets.map(setText).join(' · ')+'</span>'+diffText(e.diff)+'</li>').join('')+'</ul></section>';
 html+='<p class="v2-muted">Seules les séries validées comptent. Un exercice remplacé garde son propre historique.</p>'+cardioBlock(cardio)+'</section>';
 return html;
}

function picker({query='',results=[],creating=false}={}){
 let html='<div class="v2-picker"><label class="v2-search">'+icon('search','v2-ic v2-ic--sm')+'<input type="search" data-v2-search placeholder="Chercher un exercice (ex. dvlp couché)" value="'+esc(query)+'" aria-label="Chercher un exercice" autocomplete="off"></label><div class="v2-results">'
  +results.map(r=>{const e=r.entry||r;return '<button type="button" class="v2-opt" data-action="v2-pick" data-key="'+esc(e.key)+'"><span><b>'+esc(e.name)+'</b><small>'+esc(e.muscle||'')+' · '+(e.role==='base'?'Base':'Finition')+'</small></span></button>'}).join('')
  +(query&&!results.length?'<p class="v2-note">Aucun exercice trouvé.</p>':'')+'</div>';
 html+=creating?'<form class="v2-create" data-v2-create><label class="v2-field-label">Nom<input name="name" required maxlength="100" value="'+esc(query)+'"></label><label class="v2-field-label">Muscle principal<select name="muscle">'+['Pectoraux','Dos','Jambes','Épaules','Bras','Abdominaux'].map(m=>'<option>'+m+'</option>').join('')+'</select></label><label class="v2-field-label">Mouvement<select name="pattern"><option value="push">Pousser</option><option value="pull">Tirer</option><option value="legs">Jambes</option><option value="iso">Isolation</option></select></label><button type="submit" class="v2-btn">Créer mon exercice</button></form>'
  :'<button type="button" class="v2-link" data-action="v2-create">'+icon('plus','v2-ic v2-ic--sm')+'Créer mon exercice</button>';
 return html+'</div>';
}

function programme({cycle,userExercises=[],picking=null,query='',results=[],creating=false}={}){
 let html='<section class="v2-progress"><h1 class="v2-hello">Mon programme</h1><p class="v2-muted">Ta suite de séances tourne en boucle'+(cycle?.weeks?' pendant '+cycle.weeks+' semaines':'')+'. Les changements s’appliquent dès la prochaine séance.</p>';
 for(const s of cycle?.sessions||[]){
  html+='<section class="v2-card v2-prog-session"><h2>'+esc(s.title)+'</h2><p class="v2-muted">'+esc((s.focus||[]).join(', '))+'</p><ol class="v2-prog-list">';
  for(const e of s.exercises){
   html+='<li><div class="v2-prog-name"><b>'+esc(nameOf(e.exercise_key,userExercises))+'</b><small>'+reps(e.reps_min,e.reps_max)+' reps · repos '+restText(e.rest_seconds)+'</small></div>'
    +'<label class="v2-prog-sets">Séries<select class="v2-select" data-v2-sets="'+esc(e.id)+'">'+[1,2,3,4,5,6].map(n=>'<option '+(n===Number(e.sets)?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'
    +'<div class="v2-prog-actions"><button type="button" class="v2-link" data-action="v2-edit-ex" data-ce="'+esc(e.id)+'">Changer</button><button type="button" class="v2-link v2-link--muted" data-action="v2-remove-ex" data-ce="'+esc(e.id)+'">Retirer</button></div></li>';
  }
  html+='</ol><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-add-ex" data-session="'+esc(s.id)+'">'+icon('plus')+'Ajouter un exercice</button></section>';
 }
 const cc=cycle?.cardio||[];
 html+='<section class="v2-card v2-prog-session"><h2>Cardio</h2><p class="v2-muted">Fait seul un jour de repos ou en fin de séance. Noté à part des séries.</p>'
  +(cc.length?'<ul class="v2-prog-list">'+cc.map(c=>'<li><div class="v2-prog-name"><b>'+esc(cardioName(c.type))+' · '+Number(c.minutes)+' min · '+Number(c.per_week)+' fois par semaine</b></div><div class="v2-prog-actions"><button type="button" class="v2-link v2-link--muted" data-action="v2-cardio-plan-remove" data-id="'+esc(c.id)+'">Retirer</button></div></li>').join('')+'</ul>':'')
  +'<form class="v2-cardio-plan" data-v2-cardio-plan><select class="v2-select" name="type" aria-label="Activité">'+CARDIO.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select><input class="v2-select" name="minutes" type="number" inputmode="numeric" min="1" max="600" value="30" aria-label="Minutes"><select class="v2-select" name="per_week" aria-label="Fois par semaine">'+[1,2,3,4,5,6,7].map(n=>'<option value="'+n+'"'+(n===2?' selected':'')+'>'+n+' × / sem.</option>').join('')+'</select><button type="submit" class="v2-btn v2-btn--ghost">'+icon('plus')+'Ajouter du cardio</button></form></section>';
 if(picking)html+='<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Choisir un exercice"><i class="v2-grab"></i><h2>'+(picking.ce?'Changer d’exercice':'Ajouter un exercice')+'</h2>'+picker({query,results,creating})+'</section></div>';
 return html+'</section>';
}

return {cardioSheet,programme,home,chooser,session,machineSheet,moreSheet,idlePrompt,summary,progress,picker,clock,esc};
});
