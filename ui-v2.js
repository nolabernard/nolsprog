/* STEROID V2 — écrans P1 « Guidé » (accueil, séance, machine prise, fin, progrès, choix d'exercice).
 * Fonctions pures : données en entrée, HTML échappé en sortie. Aucun état, aucun DOM.
 * Les actions passent par data-action="v2-…" ; app.js les branche. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidUI=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Cat=()=>globalThis.SteroidCatalogue;
// Unité d'un exercice : secondes pour les exercices tenus (gainage), répétitions sinon.
const timed=key=>globalThis.SteroidCatalogue?.byKey(key)?.unit==='s';
const unit=key=>timed(key)?' s':' rép.';
const nameOf=(key,ux=[])=>Cat()?.byKey(key)?.name||ux.find(u=>u.key===key)?.name||'Exercice';
const kg=v=>v==null?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2});
const clock=sec=>{sec=Math.max(0,Math.round(sec||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60,p=n=>String(n).padStart(2,'0');return h?h+':'+p(m)+':'+p(s):p(m)+':'+p(s)};
const restText=sec=>{sec=Number(sec)||0;if(sec<60)return sec+' s';const m=Math.floor(sec/60),s=sec%60;return m+' min'+(s?' '+s:'')};
const reps=(a,b)=>a===b?String(a):a+' à '+b;
const plural=(n,one,many)=>n+' '+(n>1?many:one);
const P={play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',check:'<path d="m5 12 5 5L20 7"/>',swap:'<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',left:'<path d="m15 18-6-6 6-6"/>',right:'<path d="m9 18 6-6-6-6"/>',up:'<path d="m6 15 6-6 6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
 later:'<path d="M12 8v4l3 2"/><path d="M3.05 11a9 9 0 1 1 .5 4"/><path d="M3 4v7h7"/>',skip:'<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',coach:'<path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3z"/><path d="M10 22h4"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'};
const icon=(n,cls='v2-ic')=>'<svg class="'+cls+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+P[n]+'</svg>';
const ordered=w=>[...(w?.exercises||[])].sort((a,b)=>a.position-b.position);
const totalSets=s=>(s?.exercises||[]).reduce((n,e)=>n+(Number(e.sets)||0),0);

// Anneau de l'accueil : séances faites cette semaine sur l'objectif (ex. 5/6), lisible sans explication.
// Sans objectif hebdomadaire connu : avancée du cycle en %.
function ring(value,week=null){
 const r=26,c=2*Math.PI*r;
 const goal=Number(week?.goal)||0,done=Math.max(0,Number(week?.done)||0);
 const frac=goal?Math.min(1,done/goal):Math.max(0,Math.min(1,value||0)),pct=Math.round(frac*100);
 const label=goal?plural(done,'séance faite','séances faites')+' sur '+goal+' cette semaine':'Avancée du cycle : '+pct+' %';
 const text=goal?'<b class="v2-ring-frac">'+Math.min(done,goal)+'<small>/'+goal+(done>goal?' +'+(done-goal):'')+'</small></b>':'<b>'+pct+'<small>%</small></b>';
 return '<div class="v2-ring-wrap"><div class="v2-ring'+(goal&&done>=goal?' is-full':'')+'" role="img" aria-label="'+esc(label)+'"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="'+r+'" class="v2-ring-track"/>'+(pct?'<circle cx="32" cy="32" r="'+r+'" class="v2-ring-value" stroke-dasharray="'+(c*pct/100).toFixed(1)+' '+c.toFixed(1)+'"/>':'')+'</svg>'+text+'</div>'+(goal?'<span class="v2-ring-cap" aria-hidden="true">cette semaine</span>':'')+'</div>';
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
// Noter du cardio, ou modifier / supprimer une activité déjà enregistrée (edit = la ligne existante).
function cardioSheet({workoutId='',edit=null}={}){
 const title=edit?'Modifier le cardio':'Noter du cardio',type=edit?.type||CARDIO[0][0];
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="'+title+'"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>'+title+'</h2>'
  +'<form class="v2-create" data-v2-cardio><input type="hidden" name="workout" value="'+esc(edit?edit.workout_id||'':workoutId)+'">'+(edit?'<input type="hidden" name="id" value="'+esc(edit.id)+'">':'')+'<fieldset class="v2-types"><legend class="v2-sheet-label">Activité</legend>'
  +CARDIO.map(([v,t])=>'<label><input type="radio" name="type" value="'+v+'" '+(v===type?'checked':'')+'><span>'+t+'</span></label>').join('')+'</fieldset>'
  +'<label class="v2-field-label">Durée (minutes)<input name="minutes" type="number" inputmode="numeric" min="1" max="600" required value="'+(edit?Number(edit.minutes):30)+'"></label>'
  +'<button type="submit" class="v2-btn">'+(edit?'Enregistrer la modification':'Enregistrer le cardio')+'</button></form>'
  +(edit?'<button type="button" class="v2-btn v2-btn--ghost v2-danger" data-action="v2-cardio-delete" data-id="'+esc(edit.id)+'">Supprimer cette activité</button>':'')+'</section></div>';
}
// Barre d'avancée du programme, en haut de l'accueil et de Programme.
function cycleBar(st){
 if(!st)return '';
 return '<div class="v2-cyclebar" role="group" aria-label="Avancée du programme : semaine '+st.week+' sur '+st.weeks+', '+st.done+' séances faites sur '+st.total+'"><div class="v2-cyclebar-top"><span><b>Programme</b> · semaine '+st.week+' sur '+st.weeks+'</span><b>'+st.pct+' %</b></div><div class="v2-cyclebar-track" aria-hidden="true"><i style="width:'+st.pct+'%"></i></div><p class="v2-cyclebar-foot">'+plural(st.done,'séance faite','séances faites')+' sur '+st.total+'</p></div>';
}
function home({next,hasHistory=false,cycle,progress=0,minutes,firstName,dateText,weekLine,record,building=false,active=null,retry=false,rhythm=null,cardio=null,last=null,deload=false,week=null,cycleStatus=null,view=null,stats=null}={}){
 const head='<header class="v2-home-head"><div>'+(dateText?'<p class="v2-date">'+esc(dateText)+'</p>':'')+'<h1 class="v2-hello">'+esc(firstName?'Salut '+firstName:'Salut')+'</h1></div></header>';
 const bar=cycleBar(cycleStatus);
 if(!cycle||!next)return '<section class="v2-home">'+head+'<div class="v2-card v2-empty">'+(retry?'<h2>Programme indisponible</h2><p>Impossible de joindre ton compte. Vérifie ta connexion.</p>':'<h2>Ton programme t’attend</h2><p>Je prépare ta suite de séances à partir de tes réponses.</p>')+'<button type="button" class="v2-btn" data-action="v2-build" '+(building?'disabled':'')+'>'+(building?'Préparation…':retry?'Réessayer':'Préparer mon programme')+'</button></div></section>';
 const s=next.session,count=(s.exercises||[]).length;
 if(active)return '<section class="v2-home">'+head+bar+'<section class="v2-next" aria-label="Séance en cours"><p class="v2-next-kicker">Séance en cours</p><h2 class="v2-next-title">'+esc(active.title)+'</h2><p>'+active.done+' / '+plural(active.total,'série validée','séries validées')+'</p><button type="button" class="v2-btn v2-btn--light v2-btn--big" data-action="v2-back">'+icon('play')+'Reprendre la séance</button></section></section>';
 const wk=view?{done:view.done,goal:view.goal}:week;
 const extras=()=>(view?weekSection(view,cardio):(weekLine||record||rhythm||cardio)?weekCard({weekLine,record,rhythm,cardio}):'')+(view?tiles(view,stats)+(record?'<p class="v2-record-line">'+icon('trophy','v2-ic v2-ic--sm')+esc(record)+'</p>':''):'')+(last&&!(next.reason==='tomorrow'&&next.today&&last.id===next.today.id)?lastCard(last):'');
 if(next.reason==='tomorrow'){
  // Séance du jour faite ou passée : repos, la suivante attend demain. Pas de bouton Démarrer.
  const t=next.today,skipped=t.status==='skipped';
  let rest='<section class="v2-home">'+head+bar+'<section class="v2-next v2-next--rest" aria-label="Aujourd’hui"><div class="v2-next-top"><div><p class="v2-next-kicker">'+(skipped?'Séance passée aujourd’hui':'Séance faite aujourd’hui')+'</p><h2 class="v2-next-title">'+esc(t.title)+'</h2></div>'+ring(progress,wk)+'</div>'
   +'<p class="v2-next-after">'+icon('clock','v2-ic v2-ic--sm')+'Demain : <b>'+esc(s.title)+'</b></p></section>';
  rest+='<div class="v2-coach">'+icon('coach','v2-ic v2-coach-ic')+'<div><p>'+esc(skipped?(SKIP_COACH[t.reason]||SKIP_COACH.autre):'C’est fait pour aujourd’hui. Tes muscles progressent pendant la récupération : prochaine séance demain.')+'</p>'
   +(skipped?'<button type="button" class="v2-link" data-action="v2-skip-undo" data-id="'+esc(t.id)+'">Annuler, je me suis trompé</button>':'')+'</div></div>';
  return rest+extras()+'</section>';
 }
 // Prochaine séance : « Commencer » ouvre d'abord le récapitulatif (confirmer, choisir une autre séance ou passer).
 let html='<section class="v2-home">'+head+bar+'<section class="v2-next" aria-label="Prochaine séance"><div class="v2-next-top"><div><p class="v2-next-kicker">Prochaine séance</p><h2 class="v2-next-title">'+esc(s.title)+'</h2></div>'+ring(progress,wk)+'</div>'
  +'<div class="v2-chips">'+(s.focus||[]).map(f=>'<span>'+esc(f)+'</span>').join('')+'</div>'
  +'<dl class="v2-figures"><div><b>'+count+'</b> <span>exercices</span></div><div><b>'+totalSets(s)+'</b> <span>séries</span></div>'+(minutes?'<div><b>≈ '+Number(minutes)+'</b> <span>minutes</span></div>':'')+'</dl>'
  +'<button type="button" class="v2-btn v2-btn--light v2-btn--big" data-action="v2-recap" data-session="'+esc(s.id)+'">'+icon('play')+'Commencer</button></section>';
 if(next.passed)html+='<div class="v2-coach v2-passed">'+icon('coach','v2-ic v2-coach-ic')+'<div><p>'+esc('« '+next.passed.title+' » passée. Tu peux faire la suivante aujourd’hui.')+'</p><button type="button" class="v2-link" data-action="v2-skip-undo" data-id="'+esc(next.passed.id)+'">Annuler, je me suis trompé</button></div></div>';
 if(deload)html+='<div class="v2-coach">'+icon('coach','v2-ic v2-coach-ic')+'<div><p>Dernière semaine du cycle : semaine allégée. Moins de séries, mêmes charges, pour récupérer avant ton bilan.</p></div></div>';
 return html+extras()+'</section>';
}
// « Ta semaine » : jours (faite / passée / aujourd'hui), séances faites sur l'objectif, cardio.
function weekSection(v,cardio){
 const lab={done:'séance faite',skipped:'séance passée','':'pas de séance'};
 // L'anneau donne déjà « faites / objectif » : ici seulement l'objectif atteint.
 const line=v.done>=v.goal?'Objectif atteint ('+plural(v.done,'séance','séances')+').':'';
 return '<section class="v2-card v2-week"><div class="v2-week-head"><h2>Ta semaine</h2>'+(line?'<span>'+esc(line)+'</span>':'')+'</div>'
  +'<ol class="v2-weekdays">'+v.days.map((d,k)=>'<li class="'+[d.state&&'is-'+d.state,d.today&&'is-today',d.planned&&'is-planned'].filter(Boolean).join(' ')+'" aria-label="'+DAYS[k]+' : '+lab[d.state]+(d.today?' (aujourd’hui)':'')+'"><span aria-hidden="true">'+DAY1[k]+'</span>'+(d.state==='done'?icon('check','v2-ic v2-ic--xs'):'')+'</li>').join('')+'</ol>'
  +(v.days.some(d=>d.planned)?'<p class="v2-muted v2-week-plan">Tes jours : '+v.days.map((d,k)=>d.planned?DAYS[k]:null).filter(Boolean).join(', ')+'. Rien n’est bloqué si tu changes de jour.</p>':'')
  +'<p class="v2-week-legend" aria-hidden="true"><i class="is-done"></i>faite<i class="is-skipped"></i>passée<i class="is-today"></i>aujourd’hui</p>'
  +cardioHTML(cardio)+'</section>';
}
const fmtKg=v=>v>=1000?(v/1000).toLocaleString('fr-FR',{maximumFractionDigits:1})+' t':Number(v).toLocaleString('fr-FR')+' kg';
// Indicateurs : uniquement des chiffres issus des séries validées (aucune estimation présentée comme exacte).
function tiles(v,stats={}){
 const delta=v.prevVolume>0?Math.round((v.volume-v.prevVolume)/v.prevVolume*100):null;
 const t=[
  ['Séries validées',String(v.sets),'cette semaine'],
  ['Volume soulevé',fmtKg(v.volume),delta==null?'cette semaine':(delta>=0?'+':'')+delta+' % vs semaine dernière'],
  ['Régularité',v.streak?plural(v.streak,'semaine','semaines'):'—',v.streak?'d’affilée à l’objectif':'atteins l’objectif cette semaine'],
  ['Records',stats.records==null?'—':String(stats.records),stats.lastRecord||'pendant ce cycle']];
 return '<section class="v2-tiles" aria-label="Tes indicateurs">'+t.map(([a,b,c])=>'<div class="v2-tile"><span>'+esc(a)+'</span><b>'+esc(b)+'</b><small>'+esc(c)+'</small></div>').join('')+'</section>';
}
// Dernière séance effectuée : un appui ouvre son détail dans Progrès.
// Durée d'une séance : « < 1 min » sous une minute, comme sur l'écran de fin.
function durTxt(x){return x.minutes==null?null:(x.seconds!=null&&x.seconds<60?'< 1':x.minutes)+' min'}
function lastCard(last){return '<button type="button" class="v2-card v2-last" data-action="v2-last-open" data-id="'+esc(last.id)+'"><span class="v2-last-kicker">Dernière séance</span><b>'+esc(last.title)+'</b><small>'+esc([dayText(last.date),durTxt(last),plural(last.sets,'série','séries')].filter(Boolean).join(' · '))+'</small>'+icon('right','v2-ic v2-ic--sm')+'</button>'}
function weekCard({weekLine,record,rhythm,cardio}){return '<section class="v2-card v2-week">'+(weekLine?'<p class="v2-week-line">'+esc(weekLine)+'</p>':'')+rhythmHTML(rhythm)+cardioHTML(cardio)+(record?'<p class="v2-muted">'+icon('trophy','v2-ic v2-ic--sm')+esc(record)+'</p>':'')+'</section>'}
const SKIP_COACH={malade:'Repose-toi et hydrate-toi. Reprends quand tu te sens mieux, sinon passe encore : aucune séance à rattraper.',
 douleur:'Ne force pas sur une douleur. Si elle dure ou s’aggrave, demande l’avis d’un professionnel de santé. Aucune séance à rattraper.',
 temps:'Pas de souci : la suite avance, sans rattrapage. La séance suivante reste possible aujourd’hui.',
 envie:'Ça arrive. La suite avance sans rattrapage ; la séance suivante reste possible aujourd’hui si tu changes d’avis.',
 autre:'Séance passée : la suite avance, sans rattrapage. La suivante reste possible aujourd’hui.'};
const SKIP_REASONS=[['malade','Je suis malade'],['douleur','J’ai une douleur ou une blessure'],['temps','Pas le temps aujourd’hui'],['envie','Pas envie aujourd’hui'],['autre','Autre raison']];
function skipSheet({session}={}){
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Passer la séance"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>Pas de séance aujourd’hui ?</h2><p class="v2-muted">'+esc(session.title)+' sera notée comme passée : ta suite avance à la séance suivante, sans rattrapage. La suivante reste possible aujourd’hui.</p>'
  +SKIP_REASONS.map(([v,t])=>'<button type="button" class="v2-opt" data-action="v2-skip-confirm" data-session="'+esc(session.id)+'" data-reason="'+v+'"><span><b>'+t+'</b></span></button>').join('')
  +'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-recap" data-session="'+esc(session.id)+'">Finalement, je la fais</button></section></div>';
}
// Récapitulatif avant de commencer : on confirme la bonne séance, on en choisit une autre du tour, ou on la passe.
function recapSheet({session,minutes=null,userExercises=[],remaining=[],choosing=false,planned=null}={}){
 const wrap=(label,body)=>'<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet v2-recap" role="dialog" aria-modal="true" aria-label="'+label+'"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button>'+body+'</section></div>';
 if(choosing)return wrap('Choisir une séance','<h2>Quelle séance aujourd’hui ?</h2><p class="v2-muted">Les séances qui te restent dans ce tour. Celle que tu ne fais pas reste à faire.</p>'
  +remaining.map(x=>'<button type="button" class="v2-opt'+(x.id===planned?' is-current':'')+'" data-action="v2-recap" data-session="'+esc(x.id)+'"><span><b>'+esc(x.title)+(x.id===planned?' · prévue':'')+'</b><small>'+esc([(x.focus||[]).join(', '),plural((x.exercises||[]).length,'exercice','exercices')].filter(Boolean).join(' · '))+'</small></span></button>').join(''));
 const ex=session.exercises||[];
 return wrap('Récapitulatif de la séance','<p class="v2-next-kicker v2-recap-kicker">C’est bien cette séance ?</p><h2 class="v2-recap-title">'+esc(session.title)+'</h2>'
  +'<p class="v2-muted">'+esc([(session.focus||[]).join(', '),plural(ex.length,'exercice','exercices'),plural(totalSets(session),'série','séries'),minutes?'≈ '+Number(minutes)+' min':''].filter(Boolean).join(' · '))+'</p>'
  +'<ol class="v2-recap-list">'+ex.map(e=>'<li><b>'+esc(nameOf(e.exercise_key,userExercises))+'</b><span>'+Number(e.sets)+' × '+reps(e.reps_min,e.reps_max)+'</span></li>').join('')+'</ol>'
  +'<button type="button" class="v2-btn v2-btn--big" data-action="v2-start" data-session="'+esc(session.id)+'">'+icon('play')+'Oui, je commence</button>'
  +'<div class="v2-recap-alt">'+(remaining.length>1?'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-recap-choose" data-session="'+esc(session.id)+'">'+icon('swap')+'Choisir une autre séance</button>':'')
  +'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-skip" data-session="'+esc(session.id)+'">Je ne la fais pas aujourd’hui</button></div>');
}

function chooser({sessions=[],current}={}){
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Choisir une séance"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>Quelle séance aujourd’hui ?</h2>'
  +sessions.map(s=>'<button type="button" class="v2-opt'+(s.id===current?' is-current':'')+'" data-action="v2-pick-session" data-session="'+esc(s.id)+'"><span><b>'+esc(s.title)+'</b><small>'+esc((s.focus||[]).join(', '))+' · '+plural((s.exercises||[]).length,'exercice','exercices')+'</small></span></button>').join('')+'</section></div>';
}

const RATES=[[3,'Facile','3 reps ou + en réserve'],[2,'Correct','1 ou 2 en réserve'],[0,'Dur','plus rien en réserve']];
function session({workout,index=0,elapsed=0,paused=false,pausedFor=0,rest=null,last={},advice={},userExercises=[],pending=0,rate=null,light=false,warmup=null}={}){
 const list=ordered(workout).filter(e=>e.status!=='skipped');
 const i=Math.max(0,Math.min(index,list.length-1)),e=list[i];
 if(!e)return '<section class="v2-session"><p>Aucun exercice dans cette séance.</p><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-abandon">Abandonner la séance</button></section>';
 const p=e.plan||{},prev=last[e.exercise_key];
 let html='<section class="v2-session" aria-label="Séance en cours"><header class="v2-session-top"><button type="button" class="v2-iconbtn" data-action="v2-exit" aria-label="Revenir à l’accueil (la séance reste en cours)">'+icon('close')+'</button>'
  +'<button type="button" class="v2-chrono'+(paused?' is-paused':'')+'" data-action="'+(paused?'v2-resume':'v2-pause')+'" aria-label="'+(paused?'Reprendre la séance':'Mettre la séance en pause')+'">'+icon(paused?'play':'pause','v2-ic v2-ic--sm')+'<span>'+clock(elapsed)+'</span></button>'
  +'<button type="button" class="v2-iconbtn" data-action="v2-more" aria-label="Plus d’options">'+icon('more')+'</button></header>'
  +'<div class="v2-steps" aria-label="Exercice '+(i+1)+' sur '+list.length+'">'+list.map((x,k)=>'<i class="'+(x.sets.every(s=>s.completed)?'is-done':k===i?'is-current':'')+'"></i>').join('')+'</div>';
 if(paused)html+='<div class="v2-paused" role="status">'+icon('pause','v2-ic v2-ic--sm')+'<span><b>En pause'+(pausedFor>=60?' depuis '+Math.floor(pausedFor/60)+' min':'')+'.</b> Ce temps ne compte pas.</span><button type="button" class="v2-link" data-action="v2-resume">Reprendre</button></div>';
 html+='<div class="v2-ex-head"><p class="v2-ex-count">Exercice '+(i+1)+' sur '+list.length+'</p><div class="v2-ex-name"><h1 class="v2-ex-title">'+esc(nameOf(e.exercise_key,userExercises))+'</h1>'+howtoButton(e.exercise_key,userExercises)+'</div><p class="v2-muted">'+plural(p.sets||e.sets.length,'série','séries')+' · '+reps(p.reps_min,p.reps_max)+unit(e.exercise_key)+' · repos '+restText(p.rest_seconds)+'</p>'
  +(prev?'<span class="v2-chip">Dernière fois : '+(prev.weight==null?'—':kg(prev.weight)+' kg')+' × '+(prev.reps??'—')+'</span>':'')+(advice[e.exercise_key]?'<p class="v2-advice">'+icon('coach','v2-ic v2-ic--sm')+'<span>'+esc(advice[e.exercise_key].text)+'</span></p>':'')+'</div>';
 if(light&&i===0)html+='<p class="v2-light">'+icon('coach','v2-ic v2-ic--sm')+'<span><b>Semaine allégée.</b> Moins de séries, mêmes charges : tu récupères avant le bilan.</span></p>';
 if(warmup&&warmup.ex===e.id)html+='<div class="v2-warmup"><b>Échauffement</b>'+(warmup.sets?'<ol>'+warmup.sets.map(x=>'<li>'+kg(x.weight)+' kg × '+x.reps+'</li>').join('')+'</ol><small>Puis tes séries de travail. Non comptées dans tes séries.</small>':'<small>2 séries légères pour monter en charge : 8 répétitions, puis 4. Non comptées dans tes séries.</small>')+'</div>';
 html+='<div class="v2-sets"><div class="v2-set-labels" aria-hidden="true"><span>Série</span><span>kg</span><span>'+(timed(e.exercise_key)?'Secondes':'Rép.')+'</span><span></span></div>';
 for(const s of e.sets){
  const n=s.set_number;
  html+='<div class="v2-set'+(s.completed?' is-done':'')+'"><span class="v2-set-num">'+n+'</span>'
   +'<input class="v2-cell" aria-label="Charge série '+n+' (kg)" data-v2-field="weight" data-ex="'+esc(e.id)+'" data-set="'+n+'" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="kg" value="'+(s.weight==null?'':esc(String(s.weight).replace('.',',')))+'">'
   +'<input class="v2-cell" aria-label="'+(timed(e.exercise_key)?'Secondes':'Répétitions')+' série '+n+'" data-v2-field="reps" data-ex="'+esc(e.id)+'" data-set="'+n+'" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="'+(timed(e.exercise_key)?'s':'rép.')+'" value="'+(s.reps==null?'':esc(s.reps))+'">'
   +'<button type="button" class="v2-ok" data-action="v2-set" data-ex="'+esc(e.id)+'" data-set="'+n+'" aria-pressed="'+s.completed+'" aria-label="'+(s.completed?'Série '+n+' validée':'Valider la série '+n)+'">'+icon('check')+'</button></div>';
 }
 html+='</div>';
 // Ressenti de la dernière série validée, en un appui (répétitions en réserve : facile ≥ 3, correct 1-2, dur 0).
 if(rate)html+='<div class="v2-rate" role="group" aria-label="Ressenti de la série '+rate.set+'"><span>Série '+rate.set+(rate.name?' · '+esc(rate.name):'')+' : c’était…</span><div>'+RATES.map(([v,t,h])=>'<button type="button" data-action="v2-rir" data-ex="'+esc(rate.ex)+'" data-set="'+rate.set+'" data-rir="'+v+'" aria-pressed="'+(rate.rir===v)+'"><b>'+t+'</b><small>'+h+'</small></button>').join('')+'</div></div>';
 if(rest)html+='<div class="v2-rest" role="timer" aria-live="polite"><span>Repos</span><b>'+clock(rest.remaining).replace(/^0(\d):/,'$1:')+'</b><button type="button" class="v2-btn v2-btn--ghost v2-btn--sm" data-action="v2-rest-plus">+30 s</button><button type="button" class="v2-btn v2-btn--ghost v2-btn--sm" data-action="v2-rest-skip">Passer</button></div>';
 const lastOne=i===list.length-1;
 const anyDone=(workout.exercises||[]).some(x=>(x.sets||[]).some(z=>z.completed));
 html+='<footer class="v2-session-foot"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-machine" data-ex="'+esc(e.id)+'">'+icon('swap')+'Machine prise</button><div class="v2-nav"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-prev" aria-label="Exercice précédent" '+(i===0?'disabled':'')+'>'+icon('left')+'</button>'
  +(lastOne?(anyDone?'<button type="button" class="v2-btn" data-action="v2-finish">Terminer la séance</button>':'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-abandon">Abandonner la séance</button>'):'<button type="button" class="v2-btn" data-action="v2-next">Exercice suivant'+icon('right')+'</button>')+'</div>'
  +(pending?'<p class="v2-sync">'+plural(pending,'modification en attente d’envoi','modifications en attente d’envoi')+'</p>':'')+'</footer></section>';
 return html;
}

function machineSheet({exercise,alternatives=[],canLater=true,practiced={}}={}){
 const p=exercise.plan||{};
 const work=(p.sets||exercise.sets.length)+' × '+(p.reps_min===p.reps_max?p.reps_min:p.reps_min+'–'+p.reps_max)+', repos '+restText(p.rest_seconds);
 let html='<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Machine prise"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>Machine prise ? Pas de souci.</h2><p class="v2-muted">On garde le même travail : '+work+'.</p>';
 if(canLater)html+='<button type="button" class="v2-opt v2-opt--main" data-action="v2-later" data-ex="'+esc(exercise.id)+'">'+icon('later')+'<span><b>Faire plus tard</b><small>Passe en fin de séance. La machine se libère souvent vite.</small></span></button>';
 if(alternatives.length){
  html+='<p class="v2-sheet-label">Ou le remplacer par</p>'+alternatives.map(a=>'<button type="button" class="v2-opt" data-action="v2-sub" data-ex="'+esc(exercise.id)+'" data-key="'+esc(a.key)+'"><span><b>'+esc(a.name)+'</b><small>Même mouvement'+(practiced[a.key]?' · déjà fait '+plural(practiced[a.key],'fois','fois'):'')+'</small></span><span class="v2-tag">'+(a.role==='base'?'Base':'Finition')+'</span></button>').join('')
   +'<label class="v2-check"><input type="checkbox" id="v2-keep"> Garder ce remplacement dans mon programme</label>';
 }else html+='<p class="v2-note">Aucun remplaçant du même type avec ton matériel. Tu peux le faire plus tard ou le passer.</p>';
 return html+'<button type="button" class="v2-link v2-link--center" data-action="v2-skip-ex" data-ex="'+esc(exercise.id)+'">'+icon('skip','v2-ic v2-ic--sm')+'Passer cet exercice</button></section></div>';
}

function moreSheet({exercise,anyDone=true}={}){
 const rpe=exercise?.rpe;
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Options de la séance"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>Options</h2>'

  +(anyDone?'<button type="button" class="v2-btn" data-action="v2-finish">Terminer la séance</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-abandon">Abandonner la séance</button><p class="v2-muted v2-center">Tu peux terminer sans tout valider : seules les séries validées comptent. Abandonner : rien ne compte.</p>'
   :'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-wrong-session">Ce n’est pas la bonne séance</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-abandon">Abandonner la séance</button><p class="v2-muted v2-center">Aucune série validée : la séance ne compte pas tant que tu n’en valides pas une.</p>')+'</section></div>';
}

function idlePrompt(minutes){
 return '<div class="v2-sheet-wrap"><section class="v2-sheet" role="alertdialog" aria-modal="true" aria-label="Tu étais en pause ?"><h2>Tu étais en pause ?</h2><p class="v2-muted">Aucune action depuis '+(minutes>=720?'hier':minutes>=120?Math.round(minutes/60)+' h':Number(minutes)+' min')+'.</p><button type="button" class="v2-btn" data-action="v2-idle-yes">Oui, ne pas compter ce temps</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-idle-no">Non, je m’entraînais</button></section></div>';
}

function summary({workout,pending=0,local=false,userExercises=[],records=[]}={}){
 const list=ordered(workout),done=list.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0);
 const vol=list.reduce((n,e)=>n+e.sets.filter(s=>s.completed&&s.weight!=null&&s.reps!=null).reduce((a,s)=>a+s.weight*s.reps,0),0);
 const min=Math.round((workout.duration_seconds||0)/60),minTxt=(workout.duration_seconds||0)<60?'< 1':String(min);
 return '<section class="v2-summary"><div class="v2-done-mark">'+icon('check')+'</div><h1 class="v2-hello">Séance terminée</h1><dl class="v2-figures v2-figures--dark"><div><b>'+minTxt+' min</b> <span>d’effort</span></div><div><b>'+plural(done,'série validée','séries validées').replace(/^(\d+) /,'$1</b> <span>')+'</span></div><div><b>'+Math.round(vol).toLocaleString('fr-FR')+'</b> <span>kg soulevés</span></div></dl>'
  +(records.length?'<ul class="v2-records">'+records.map(r=>'<li>'+icon('trophy','v2-ic v2-ic--sm')+'<span>Nouveau record : '+recordText(r,userExercises)+'</span></li>').join('')+'</ul>':'')+'<ul class="v2-sum-list">'+list.map(e=>{const d=e.sets.filter(s=>s.completed).length;return '<li><span>'+esc(nameOf(e.exercise_key,userExercises))+'</span><small>'+(e.status==='skipped'?'passé':d+'/'+e.sets.length)+'</small></li>'}).join('')+'</ul>'
  +'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-cardio-open" data-workout="'+esc(workout.id)+'">'+icon('plus')+'Ajouter du cardio</button><p class="v2-sync" role="status">'+(pending?'Enregistrée sur ce téléphone, envoi en attente.':local?'Enregistrée sur ce téléphone.':'Enregistrée.')+'</p><button type="button" class="v2-btn v2-btn--big" data-action="v2-close-summary">Retour à l’accueil</button></section>';
}

function chart(points,metric){
 const vals=points.map(p=>p[metric]).filter(v=>v!=null);if(vals.length<1)return '';
 const max=Math.max(...vals)*1.15||1,W=340,H=180,x=i=>24+i*((W-48)/Math.max(1,points.length-1)),y=v=>H-24-(v/max)*(H-48);
 const pts=points.map((p,i)=>p[metric]==null?null:[x(i),y(p[metric])]).filter(Boolean);
 return '<svg class="v2-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Évolution par séance"><line x1="24" y1="'+(H-24)+'" x2="'+(W-24)+'" y2="'+(H-24)+'"/>'+(pts.length>1?'<polyline points="'+pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')+'"/>':'')+pts.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4"/>').join('')
  // Valeurs et dates lisibles : première et dernière séance étiquetées.
  +labelAt(points,metric,x,y,0,'start')+(points.length>1?labelAt(points,metric,x,y,points.length-1,'end'):'')+'</svg>'
  +(vals.length<2?'<p class="v2-muted v2-center">Encore une séance pour voir ta courbe.</p>':'');
}
function labelAt(points,metric,x,y,i,anchor){
 const p=points[i];if(!p||p[metric]==null)return '';
 const v=metric==='volume'?fmtKgShort(p[metric]):metric==='weight'?kg(p[metric])+' kg':p[metric]+' rép.';
 const d=p.date?new Date(p.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}):'';
 return '<text class="v2-chart-val" x="'+x(i).toFixed(1)+'" y="'+(y(p[metric])-10).toFixed(1)+'" text-anchor="'+anchor+'">'+esc(v)+'</text>'+(d?'<text class="v2-chart-date" x="'+x(i).toFixed(1)+'" y="174" text-anchor="'+anchor+'">'+esc(d)+'</text>':'');
}
const fmtKgShort=v=>v>=1000?(v/1000).toLocaleString('fr-FR',{maximumFractionDigits:1})+' t':Math.round(v).toLocaleString('fr-FR')+' kg';

const MON=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
// Activités cardio récentes : un appui pour modifier ou supprimer.
function cardioLogs(list){
 if(!list?.length)return '';
 return '<section class="v2-card"><h2 class="v2-card-title">Activités cardio</h2><ul class="v2-hist">'+list.slice(0,10).map(c=>'<li><button type="button" class="v2-opt" data-action="v2-cardio-edit" data-id="'+esc(c.id)+'"><span><b>'+esc(cardioName(c.type))+' · '+Number(c.minutes)+' min</b><small>'+esc(dayText(c.done_on+'T12:00:00'))+'</small></span>'+icon('right','v2-ic v2-ic--sm')+'</button></li>').join('')+'</ul></section>';
}
function cardioBlock(weeks){
 if(!weeks?.length)return '';
 const total=weeks.reduce((n,w)=>n+w.minutes,0),max=Math.max(1,...weeks.map(w=>w.minutes));
 if(!total)return ''; // rien à montrer tant qu'aucun cardio n'est noté
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
   +'<section class="v2-card"><p class="v2-muted">'+esc(dayText(s.date))+'</p><h2 class="v2-card-title">'+esc(s.title)+'</h2><p class="v2-muted">'+[durTxt(s),plural(s.sets,'série validée','séries validées'),Math.round(s.volume).toLocaleString('fr-FR')+' kg'].filter(Boolean).join(' · ')+'</p>'
   +(records?.length?'<ul class="v2-records">'+records.map(r=>'<li>'+icon('trophy','v2-ic v2-ic--sm')+'<span>Record : '+recordText(r,userExercises)+'</span></li>').join('')+'</ul>':'')+'</section>'
   +(s.exercises.length?'<ul class="v2-sum-list">'+s.exercises.map(e=>'<li class="v2-hist-ex"><span><b>'+esc(nameOf(e.key,userExercises))+'</b>'+(e.from?'<small>à la place de '+esc(nameOf(e.from,userExercises))+'</small>':'')+'</span><small>'+e.sets.map(setText).join(' · ')+'</small></li>').join('')+'</ul>':'<p class="v2-card v2-empty">Aucune série validée dans cette séance.</p>')
   +(s.cardio.length?'<p class="v2-muted">Cardio : '+s.cardio.map(c=>esc(cardioName(c.type))+' '+c.minutes+' min').join(', ')+'</p>':'');
 }
 if(!list.length)return '<p class="v2-card v2-empty">Tes séances terminées apparaîtront ici.</p>';
 return '<ul class="v2-hist">'+list.slice(0,60).map(x=>'<li><button type="button" class="v2-opt" data-action="v2-history-open" data-id="'+esc(x.id)+'"><span><b>'+esc(x.title)+'</b><small>'+esc(dayText(x.date))+' · '+[durTxt(x),plural(x.sets,'série','séries')].filter(Boolean).join(' · ')+(x.cardio.length?' · cardio':'')+'</small></span>'+icon('right','v2-ic v2-ic--sm')+'</button></li>').join('')+'</ul>';
}
function progress({progress,selected,metric='weight',userExercises=[],cardio=null,tab='exercises',history=null,advice=null,sessions=[],open=null,records=[],truncated=false,cardioList=[]}={}){
 const keys=Object.keys(progress?.byKey||{}).sort((a,b)=>nameOf(a,userExercises).localeCompare(nameOf(b,userExercises),'fr'));
 let html='<section class="v2-progress"><h1 class="v2-hello">Tes progrès</h1>'+tabs(tab);
 if(tab==='sessions')return html+sessionsHTML(sessions,open,userExercises,records)+(open?'':cardioLogs(cardioList))+'</section>';
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

// ----- Bilan de fin de cycle (lot 6) -----
function reviewCard({proposal=false}={}){
 if(proposal)return '<section class="v2-card v2-review-cta"><h2 class="v2-card-title">'+icon('trophy','v2-ic v2-ic--sm')+'Ton prochain cycle est prêt</h2><p class="v2-muted">Il n’est pas encore actif. Relis-le et valide-le quand tu veux.</p><button type="button" class="v2-btn" data-action="v2-proposal-open">Voir le programme proposé</button></section>';
 return '<section class="v2-card v2-review-cta"><h2 class="v2-card-title">'+icon('trophy','v2-ic v2-ic--sm')+'Ton cycle est terminé</h2><p class="v2-muted">Fais le bilan et prépare le cycle suivant. Rien ne change tant que tu n’as pas validé.</p><button type="button" class="v2-btn" data-action="v2-review">Voir mon bilan</button></section>'}
const listBlock=(title,items)=>items.length?'<section class="v2-card"><h2 class="v2-card-title">'+title+'</h2><ul class="v2-bullets">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>':'';
function review({review:r,userExercises=[]}={}){
 const rec=r.recommendation,evo=[...r.evolutions].sort((a,b)=>(b.weight??0)-(a.weight??0)).slice(0,6);
 const one=x=>x.weight==null?x.reps+' reps':kg(x.weight)+' × '+x.reps;
 return '<section class="v2-progress v2-review"><button type="button" class="v2-link v2-back" data-action="v2-review-close">'+icon('left','v2-ic v2-ic--sm')+'Accueil</button><h1 class="v2-hello">Bilan du cycle</h1>'
  +'<dl class="v2-figures v2-figures--dark"><div><b>'+r.done+'/'+r.planned+'</b> <span>séances faites</span></div><div><b>'+r.weeks+'</b> <span>'+(r.weeks>1?'semaines':'semaine')+'</span></div><div><b>'+(r.hard==null?'—':r.hard+' %')+'</b> <span>séries « Dur »</span></div></dl>'
  +listBlock('Points forts',r.strengths)+listBlock('À améliorer',r.improve)
  +(evo.length?'<section class="v2-card"><h2 class="v2-card-title">Évolution par exercice</h2><ul class="v2-compare">'+evo.map(e=>'<li><div><b>'+esc(nameOf(e.key,userExercises))+'</b></div><span>'+one(e.from)+' → '+one(e.to)+'</span>'+(e.weight?'<span class="v2-diff'+(e.weight>0?' is-up':'')+'">'+(e.weight>0?'+':'−')+kg(Math.abs(e.weight))+' kg</span>':e.reps?'<span class="v2-diff'+(e.reps>0?' is-up':'')+'">'+(e.reps>0?'+':'−')+Math.abs(e.reps)+' rép.</span>':'<span class="v2-diff">=</span>')+'</li>').join('')+'</ul></section>':'')
  +'<section class="v2-card v2-advice-card"><h2 class="v2-card-title">'+icon('coach','v2-ic v2-ic--sm')+'Ma recommandation : '+esc(rec.title.toLowerCase())+'</h2><p>'+esc(rec.text)+'</p></section>'
  +'<button type="button" class="v2-btn v2-btn--big" data-action="v2-review-next">Préparer le cycle suivant</button><p class="v2-muted">Tu pourras tout modifier avant de valider. Ton historique est conservé.</p></section>';
}
function selectField(name,label,options,value){return '<label class="v2-field-label" for="v2-next-'+name+'">'+label+'</label><select id="v2-next-'+name+'" class="v2-select" name="'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(value??'')?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>'}
function nextForm({answers={},weeks=6,methods={},recommendation=null}={}){
 const E=globalThis.NolsEngine,opt=k=>(E?.steps||[]).flatMap(s=>s.fields).find(f=>f.key===k)?.options||[];
 return '<section class="v2-progress v2-review"><button type="button" class="v2-link v2-back" data-action="v2-review">'+icon('left','v2-ic v2-ic--sm')+'Bilan</button><h1 class="v2-hello">Cycle suivant</h1>'
  +'<p class="v2-muted">Seulement ce qui a pu changer. '+(recommendation?.code&&recommendation.code!=='keep'?'Ma recommandation est déjà appliquée.':'')+'</p>'
  +'<form class="v2-create v2-next-form" data-v2-next>'
  +selectField('daysCount','Séances par semaine',opt('daysCount'),answers.daysCount)
  +selectField('duration','Durée par séance',opt('duration'),answers.duration)
  +selectField('method','Méthode',[['auto','Choix automatique'],...Object.entries(methods).map(([k,v])=>[k,v.name])],answers.method||'auto')
  +selectField('goal','Objectif',opt('goal'),answers.goal)
  +selectField('level','Expérience',opt('level'),answers.level)
  +selectField('equipment','Lieu / équipement',opt('equipment'),answers.equipment)
  +selectField('weeks','Durée du cycle',[['6','6 semaines'],['7','7 semaines'],['8','8 semaines']],weeks)
  +'<label class="v2-field-label" for="v2-next-avoid">Exercices à éviter</label><input id="v2-next-avoid" class="v2-select" name="avoid" maxlength="200" value="'+esc(answers.avoid||'')+'" placeholder="Ex. tractions, dips">'
  +'<button type="submit" class="v2-btn v2-btn--big">Voir le programme proposé</button></form></section>';
}
function proposal({cycle,userExercises=[],methods={}}={}){
 return '<section class="v2-progress v2-review"><button type="button" class="v2-link v2-back" data-action="v2-review-next">'+icon('left','v2-ic v2-ic--sm')+'Modifier</button><p class="v2-next-kicker v2-kicker--light">Proposé · pas encore actif</p><h1 class="v2-hello">'+esc(methods[cycle.method]?.name||'Nouveau cycle')+'</h1>'
  +'<p class="v2-muted">'+cycle.weeks+' semaines · '+plural(cycle.sessions_per_week,'séance','séances')+' par semaine · suite de '+plural(cycle.sessions.length,'séance','séances')+' en boucle.</p>'
  +cycle.sessions.map(s=>'<section class="v2-card v2-prog-session"><h2>'+esc(s.code+' · '+s.title)+'</h2><ol class="v2-prog-list">'+s.exercises.map(e=>'<li><div class="v2-prog-name"><b>'+esc(nameOf(e.exercise_key,userExercises))+'</b><small>'+e.sets+' × '+reps(e.reps_min,e.reps_max)+unit(e.exercise_key)+' · repos '+restText(e.rest_seconds)+'</small></div></li>').join('')+'</ol></section>').join('')
  +'<button type="button" class="v2-btn v2-btn--big" data-action="v2-proposal-accept">Valider et démarrer ce cycle</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-review-close">Plus tard</button><p class="v2-muted">Ton cycle actuel reste actif tant que tu n’as pas validé. Ton historique est conservé.</p></section>';
}

// ----- Rappels (lot 7) -----
const DAY_LETTERS=['L','M','M','J','V','S','D'],DAY_NAMES=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const hhmm=(h,m)=>String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
function remindersCard(r){
 if(!r)return '';
 let html='<section class="v2-card v2-prog-session v2-reminders"><h2>Rappels</h2>';
 if(r.blocker)return html+'<p class="v2-muted">'+esc(r.message||'')+'</p>'+(r.blocker==='account'?'<button type="button" class="v2-btn v2-btn--ghost" data-action="account">Créer un compte ou me connecter</button>':'')+'</section>';
 html+='<p class="v2-muted">'+(r.enabled?'Activés sur ce téléphone : '+hhmm(r.hour,r.minute)+', '+(r.days.length===7?'tous les jours':r.days.map(d=>DAY_NAMES[d]).join(', '))+'. Pas de rappel un jour où ta séance est déjà faite.':'Une notification à l’heure choisie, les jours choisis. Tu peux les couper quand tu veux.')+'</p>'
  +'<label class="v2-field-label" for="v2-rem-time">Heure</label><select id="v2-rem-time" class="v2-select" data-v2-rem-time>';
 for(let h=6;h<=22;h++)for(const m of [0,30])html+='<option value="'+h+':'+m+'"'+(h===r.hour&&m===r.minute?' selected':'')+'>'+hhmm(h,m)+'</option>';
 html+='</select><div class="v2-daypick" role="group" aria-label="Jours">'+DAY_LETTERS.map((l,d)=>'<button type="button" data-action="v2-rem-day" data-day="'+d+'" aria-pressed="'+r.days.includes(d)+'" aria-label="'+DAY_NAMES[d]+'">'+l+'</button>').join('')+'</div>';
 html+=r.enabled?'<div class="v2-row"><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-rem-test">Envoyer un essai</button><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-rem-off">Désactiver</button></div>'
  :'<button type="button" class="v2-btn" data-action="v2-rem-on"'+(r.busy?' disabled':'')+'>Activer les rappels</button>';
 return html+'</section>';
}

// ----- Questionnaire : récapitulatif avant génération, puis présentation du programme (§4.2) -----
function recapCard({answers={},preview=null,methods={}}={}){
 const E=globalThis.NolsEngine,lab=(k,v)=>((E?.steps||[]).flatMap(s=>s.fields).find(f=>f.key===k)?.options||[]).find(o=>String(o[0])===String(v))?.[1]||v;
 const days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
 const freq=answers.planMode==='free'?plural(Number(answers.daysCount)||preview?.sessionsPerWeek||3,'séance','séances')+' par semaine, les jours que tu veux':plural(Number(answers.daysCount)||3,'séance','séances')+' par semaine'+(Array.isArray(preview?.preferredDays)&&preview.preferredDays.length?' ('+preview.preferredDays.map(d=>days[d]).join(', ')+')':'');
 const rows=[['Méthode',preview?methods[preview.method]?.name||preview.method:lab('method',answers.method)],['Fréquence',freq],['Durée du cycle',(preview?.weeks||6)+' semaines'],['Objectif',lab('goal',answers.goal)],['Durée par séance',durationText(answers,preview,lab)],['Matériel',lab('equipment',answers.equipment)]];
 return '<dl class="v2-recap">'+rows.filter(r=>r[1]).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'
  +(preview?.sessions?.length?'<h2 class="v2-card-title">Répartition des séances</h2><ol class="v2-recap-sessions">'+preview.sessions.map(s=>'<li><b>'+esc(s.title)+'</b><small>'+esc([(s.focus||[]).join(', '),plural(s.exercises.length,'exercice','exercices')].filter(Boolean).join(' · '))+'</small></li>').join('')+'</ol>'
   +'<p class="v2-muted">Les séances s’enchaînent dans cet ordre, quel que soit le jour.'+repsLine(preview)+' Quand tu atteins le haut de la fourchette, je te conseille d’augmenter la charge.</p>':'');
}
// Durée choisie = plafond ; durée estimée des séances générées (échauffement compris), pour expliquer l'écart.
function durationText(answers,preview,lab){
 const base=lab('duration',answers.duration),est=globalThis.NolsEngine?.estimatedMinutes,m=(preview?.sessions||[]).map(s=>est?est(s.exercises||[]):0).filter(Boolean);
 if(!m.length)return base;const lo=Math.min(...m),hi=Math.max(...m);
 return base+' au maximum · séances estimées à '+(lo===hi?'≈ '+lo:lo+' à '+hi)+' min, échauffement compris';
}
// Fourchettes de répétitions réellement générées, par rôle (base / finition) ; le gainage, compté en secondes, est exclu.
function repsLine(preview){
 const ex=(preview?.sessions||[]).flatMap(s=>s.exercises),r=role=>{const l=ex.filter(e=>e.role===role&&e.repsMax<=20);return l.length?Math.min(...l.map(e=>e.repsMin))+' à '+Math.max(...l.map(e=>e.repsMax)):null};
 const b=r('base'),f=r('finition');
 return (b?' Exercices de base : '+b+' répétitions.':'')+(f?' Finitions : '+f+' répétitions.':'');
}
function programIntro({cycle,methods={}}={}){
 if(!cycle)return '';
 return '<section class="v2-card v2-intro"><p class="v2-next-kicker v2-kicker--light">Ton programme est prêt</p><h2 class="v2-card-title">'+esc(methods[cycle.method]?.name||'Ton cycle')+' · '+cycle.weeks+' semaines</h2><p>'+plural(cycle.sessions.length,'séance différente','séances différentes')+' en boucle, '+plural(cycle.sessions_per_week,'séance','séances')+' par semaine. Voici le détail : tu peux changer un exercice ou le nombre de séries à tout moment.</p><button type="button" class="v2-btn" data-action="intro-start">'+icon('play')+'C’est parti</button></section>';
}

// ----- Comment faire : pictogramme et consignes par type de mouvement -----
function moveInfo(key,userExercises=[]){const c=globalThis.SteroidCatalogue?.byKey(key)||userExercises.find(u=>u.key===key)||{};return {pattern:c.pattern,muscle:c.muscle}}
function howtoButton(key,userExercises=[]){
 const M=globalThis.SteroidMoves;if(!M)return '';const {pattern}=moveInfo(key,userExercises);
 return '<button type="button" class="v2-howto-btn" data-action="v2-howto" aria-label="Comment faire : '+esc(nameOf(key,userExercises))+'">'+M.svg(pattern,{size:56})+'<span>Comment faire</span></button>';
}
function howtoSheet({key,userExercises=[]}={}){
 const M=globalThis.SteroidMoves;if(!M||!key)return '';const {pattern,muscle}=moveInfo(key,userExercises),m=M.move(pattern);
 return '<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet v2-howto" role="dialog" aria-modal="true" aria-label="Comment faire"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button>'
  +'<div class="v2-howto-pic">'+M.svg(pattern,{size:180})+'</div><h2>'+esc(nameOf(key,userExercises))+'</h2><p class="v2-muted">'+esc(m.label)+(muscle?' · '+esc(muscle):'')+'</p>'
  +'<ol class="v2-howto-cues">'+m.cues.map(c=>'<li>'+esc(c)+'</li>').join('')+'</ol>'
  +'<p class="v2-muted">Une douleur pendant l’exercice : arrête et demande conseil à un professionnel.</p><button type="button" class="v2-btn" data-action="v2-close-sheet">Compris</button></section></div>';
}

// Résultats seuls : la recherche les remplace à chaque frappe sans réafficher l'écran (pas de saccade ni de clavier qui saute).
function pickerResults({query='',results=[]}={}){
 return results.map(r=>{const e=r.entry||r;return '<button type="button" class="v2-opt" data-action="v2-pick" data-key="'+esc(e.key)+'"><span><b>'+esc(e.name)+'</b><small>'+esc(e.muscle||'')+' · '+(e.role==='base'?'Base':'Finition')+'</small></span></button>'}).join('')
  +(query&&!results.length?'<p class="v2-note">Aucun exercice trouvé.</p>':'');
}
function picker({query='',results=[],creating=false}={}){
 let html='<div class="v2-picker"><label class="v2-search">'+icon('search','v2-ic v2-ic--sm')+'<input type="search" data-v2-search placeholder="Chercher un exercice" value="'+esc(query)+'" aria-label="Chercher un exercice" autocomplete="off"></label><div class="v2-results" aria-live="polite">'
  +pickerResults({query,results})+'</div>';
 html+=creating?'<form class="v2-create" data-v2-create><label class="v2-field-label">Nom<input name="name" required maxlength="100" value="'+esc(query)+'"></label><label class="v2-field-label">Muscle principal<select name="muscle">'+['Pectoraux','Dos','Jambes','Épaules','Bras','Abdominaux'].map(m=>'<option>'+m+'</option>').join('')+'</select></label><label class="v2-field-label">Mouvement<select name="pattern"><option value="push">Pousser</option><option value="pull">Tirer</option><option value="legs">Jambes</option><option value="iso">Isolation</option></select></label><button type="submit" class="v2-btn">Créer mon exercice</button></form>'
  :'<button type="button" class="v2-link" data-action="v2-create">'+icon('plus','v2-ic v2-ic--sm')+'Créer mon exercice</button>';
 return html+'</div>';
}

function programme({cycle,userExercises=[],picking=null,query='',results=[],creating=false,reminders=null,editing=0,open=[],cycleStatus=null,cardioOpen=false,reviewAvailable=true}={}){
 let html='<section class="v2-progress"><h1 class="v2-hello">Mon programme</h1><p class="v2-muted">Ta suite de séances tourne en boucle'+(cycle?.weeks?' pendant '+cycle.weeks+' semaines':'')+'. Modifie ce que tu veux puis touche « Enregistrer » : rien ne change avant.</p>'+cycleBar(cycleStatus);
 for(const s of cycle?.sessions||[]){
  // Séance repliable : en-tête toujours visible (titre, muscles, nombre d'exercices), détail au toucher.
  const isOpen=open.includes(s.id);
  html+='<section class="v2-card v2-prog-session'+(isOpen?' is-open':'')+'"><button type="button" class="v2-prog-head" data-action="v2-prog-toggle" data-session="'+esc(s.id)+'" aria-expanded="'+isOpen+'" aria-controls="v2-prog-'+esc(s.id)+'"><span><b>'+esc(s.title)+'</b><small>'+esc([(s.focus||[]).join(', '),plural(s.exercises.length,'exercice','exercices')].filter(Boolean).join(' · '))+'</small></span>'+'<i class="v2-prog-chev">'+icon(isOpen?'up':'down','v2-ic v2-ic--sm')+'</i></button>';
  if(!isOpen){html+='</section>';continue}
  html+='<ol class="v2-prog-list" id="v2-prog-'+esc(s.id)+'">';
  s.exercises.forEach((e,k)=>{
   html+='<li><div class="v2-prog-move"><button type="button" class="v2-move" data-action="v2-move-ex" data-ce="'+esc(e.id)+'" data-dir="-1" aria-label="Monter '+esc(nameOf(e.exercise_key,userExercises))+'"'+(k===0?' disabled':'')+'>'+icon('up','v2-ic v2-ic--sm')+'</button><button type="button" class="v2-move" data-action="v2-move-ex" data-ce="'+esc(e.id)+'" data-dir="1" aria-label="Descendre '+esc(nameOf(e.exercise_key,userExercises))+'"'+(k===s.exercises.length-1?' disabled':'')+'>'+icon('down','v2-ic v2-ic--sm')+'</button></div><div class="v2-prog-name"><b>'+esc(nameOf(e.exercise_key,userExercises))+'</b><small>'+reps(e.reps_min,e.reps_max)+unit(e.exercise_key)+' · repos '+restText(e.rest_seconds)+'</small></div>'
    +'<label class="v2-prog-sets">Séries<select class="v2-select" data-v2-sets="'+esc(e.id)+'">'+[1,2,3,4,5,6].map(n=>'<option '+(n===Number(e.sets)?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'
    +'<div class="v2-prog-actions"><button type="button" class="v2-link" data-action="v2-edit-ex" data-ce="'+esc(e.id)+'">Changer</button><button type="button" class="v2-link v2-link--muted" data-action="v2-remove-ex" data-ce="'+esc(e.id)+'">Retirer</button></div></li>';
  });
  html+='</ol><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-add-ex" data-session="'+esc(s.id)+'">'+icon('plus')+'Ajouter un exercice</button></section>';
 }
 const cc=cycle?.cardio||[];
 // Cardio en plus : replié par défaut (facultatif) ; signale une séance cardio déjà présente dans le programme.
 const cardioSession=(cycle?.sessions||[]).find(x=>/cardio/i.test(x.title||''));
 html+='<section class="v2-card v2-prog-session v2-cardio-card'+(cardioOpen?' is-open':'')+'"><button type="button" class="v2-prog-head" data-action="v2-cardio-toggle" aria-expanded="'+cardioOpen+'"><span><b>Cardio en plus</b><small>'+(cc.length?plural(cc.length,'objectif','objectifs')+' par semaine':'Facultatif')+'</small></span><i class="v2-prog-chev">'+icon(cardioOpen?'up':'down','v2-ic v2-ic--sm')+'</i></button>'
  +(cardioSession?'<p class="v2-cardio-none">Ton programme contient déjà une séance cardio ('+esc(cardioSession.title)+'). Ajoute du cardio en plus seulement si tu en veux davantage.</p>':'')
  +(cc.length?'<ul class="v2-prog-list">'+cc.map(c=>'<li><div class="v2-prog-name"><b>'+esc(cardioName(c.type))+' · '+Number(c.minutes)+' min · '+Number(c.per_week)+' fois par semaine</b></div><div class="v2-prog-actions"><button type="button" class="v2-link v2-link--muted" data-action="v2-cardio-plan-remove" data-id="'+esc(c.id)+'">Retirer</button></div></li>').join('')+'</ul>':'')
  +(cardioOpen?'<p class="v2-muted">Un objectif de cardio pour la semaine, en plus de tes séances (ex. 2 fois 30 min de marche). Tu le fais quand tu veux et tu le notes depuis l’accueil avec « Noter du cardio ».</p><p class="v2-cardio-add-title">'+(cc.length?'Ajouter un autre objectif':'Ajouter un objectif')+'</p>'+'<form class="v2-cardio-plan" data-v2-cardio-plan><label class="v2-cp-type"><span>Activité</span><select class="v2-select" name="type">'+CARDIO.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select></label><label><span>Minutes</span><input class="v2-select" name="minutes" type="number" inputmode="numeric" min="1" max="600" value="30"></label><label><span>Par semaine</span><select class="v2-select" name="per_week">'+[1,2,3,4,5,6,7].map(n=>'<option value="'+n+'"'+(n===2?' selected':'')+'>'+n+' fois</option>').join('')+'</select></label><button type="submit" class="v2-btn v2-btn--ghost">'+icon('plus')+'Ajouter cet objectif</button></form>':'')+'</section>';
 html+=remindersCard(reminders);
 if(cycle)html+=reviewAvailable?'<button type="button" class="v2-btn v2-btn--ghost" data-action="v2-review">'+icon('trophy')+'Faire le bilan de ce cycle</button>':'<p class="v2-muted v2-center">'+icon('trophy','v2-ic v2-ic--sm')+' Bilan du cycle disponible en semaine '+(cycleStatus?.weeks||6)+'.</p>';
 if(picking)html+='<div class="v2-sheet-wrap"><button type="button" class="v2-veil" data-action="v2-close-sheet" aria-label="Fermer"></button><section class="v2-sheet" role="dialog" aria-modal="true" aria-label="Choisir un exercice"><button type="button" class="v2-grab" data-action="v2-close-sheet" aria-label="Fermer (ou fais glisser vers le bas)"><i></i></button><h2>'+(picking.ce?'Changer d’exercice':'Ajouter un exercice')+'</h2>'+picker({query,results,creating})+'</section></div>';
 // Barre d'enregistrement : visible dès la première modification, au-dessus de la navigation.
 if(editing)html+='<div class="v2-savebar" role="region" aria-label="Modifications du programme"><span><b>Non enregistré</b><small>Rien ne change avant.</small></span><button type="button" class="v2-btn v2-btn--ghost" data-action="v2-edit-cancel">Annuler</button><button type="button" class="v2-btn" data-action="v2-edit-save">Enregistrer</button></div>';
 return html+'</section>';
}

return {recapSheet,skipSheet,pickerResults,cardioLogs,remindersCard,reviewCard,review,nextForm,proposal,cardioSheet,programme,home,chooser,session,machineSheet,moreSheet,idlePrompt,summary,progress,picker,clock,esc,recapCard,programIntro,howtoSheet};
});
