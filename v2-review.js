/* STÉROÏDE V2 — bilan de fin de cycle.
 * Constats fondés uniquement sur les séances réellement faites dans le cycle ; recommandation expliquée, jamais appliquée seule.
 * Le cycle suivant part de la photographie du cycle en cours + les réponses actualisées ; il n'est activé qu'après validation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidReview=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const H=()=>globalThis.SteroidHistory,Cat=()=>globalThis.SteroidCatalogue;
const DAY=24*3600e3;
const fr=n=>Number(Number(n).toFixed(2)).toLocaleString('fr-FR');
const nameOf=(key,ux=[])=>Cat()?.byKey(key)?.name||ux.find(u=>u.key===key)?.name||'Exercice';
const plural=(n,one,many)=>n+' '+(n>1?many:one);

function planned(cycle){return (cycle?.weeks||6)*(cycle?.sessions_per_week||1)}
function mine(cycle,workouts){return (workouts||[]).filter(w=>w.cycle_id===cycle?.id&&w.status==='completed')}
// Bilan proposé quand les séances prévues sont faites, ou quand la durée du cycle + 2 semaines est dépassée.
function due(cycle,workouts,now){
 if(!cycle)return false;
 if(mine(cycle,workouts).length>=planned(cycle))return true;
 const t=Date.parse(cycle.started_at);
 return Number.isFinite(t)&&now-t>((cycle.weeks||6)+2)*7*DAY;
}
// Méthodes adaptées au nombre de séances (même logique que le générateur).
function methodsFor(n){n=Number(n)||3;return n<=3?['fullbody','upperlower','ppl']:n===4?['upperlower','fullbody','split']:n===5?['hybrid','ppl','split','upperlower']:['ppl','split','upperlower']}

function review(cycle,workouts,setLogs,userExercises=[],now=Date.now()){
 const ws=mine(cycle,workouts),ids=new Set(ws.map(w=>w.id)),logs=(setLogs||[]).filter(r=>ids.has(r.workout_id));
 const done=ws.length,plan=planned(cycle),weeks=Math.max(1,Math.ceil((now-Date.parse(cycle.started_at))/(7*DAY))||1);
 const regularity=plan?done/plan:0;
 // Évolution par clé : première et dernière séance du cycle (au moins deux séances).
 const keys=[...new Set(logs.filter(r=>r.completed).map(r=>r.exercise_key))],evolutions=[];
 for(const key of keys){
  const e=H().exercise(key,logs,ws).entries;if(e.length<2)continue;
  const a=e.at(-1).best,b=e[0].best;if(!a||!b)continue;
  const weight=a.weight!=null&&b.weight!=null?Number((b.weight-a.weight).toFixed(2)):null,reps=b.reps-a.reps;
  evolutions.push({key,sessions:e.length,from:a,to:b,weight,reps,progress:weight!=null?(weight>0||(weight===0&&reps>0)):reps>0});
 }
 const up=evolutions.filter(e=>e.progress),share=evolutions.length?up.length/evolutions.length:0;
 const rpes=[];const seen=new Set();for(const r of logs){const k=r.workout_id+'|'+(r.workout_exercise_id||r.exercise_key);if(r.rpe!=null&&!seen.has(k)){seen.add(k);rpes.push(Number(r.rpe))}}
 const rpe=rpes.length?Math.round(rpes.reduce((a,b)=>a+b,0)/rpes.length*10)/10:null;
 const subs={};const subSeen=new Set();for(const r of logs){const k=r.workout_id+'|'+r.exercise_key;if(r.substituted_from_key&&!subSeen.has(k)){subSeen.add(k);subs[r.substituted_from_key]=(subs[r.substituted_from_key]||0)+1}}

 const strengths=[],improve=[];
 if(regularity>=0.75)strengths.push('Régularité : '+done+' séances sur '+plan+' prévues.');
 else improve.push(done+' séances sur '+plan+' prévues : un rythme plus léger t’aidera à tenir.');
 const best=[...up].sort((x,y)=>(y.weight??0)-(x.weight??0)||y.reps-x.reps).slice(0,3);
 for(const e of best)strengths.push(nameOf(e.key,userExercises)+' : '+(e.weight?'+'+fr(e.weight)+' kg':'+'+plural(e.reps,'répétition','répétitions'))+' depuis le début du cycle.');
 const flat=evolutions.filter(e=>!e.progress&&e.sessions>=3).slice(0,3);
 if(flat.length)improve.push('Pas de progrès mesuré sur '+flat.map(e=>nameOf(e.key,userExercises)).join(', ')+'.');
 for(const [k,n] of Object.entries(subs).sort((a,b)=>b[1]-a[1]).slice(0,2))if(n>=2)improve.push(nameOf(k,userExercises)+' a été remplacé '+n+' fois : on peut le changer dans le prochain cycle.');
 if(rpe!=null&&rpe>=9)improve.push('Séances très dures (ressenti moyen '+fr(rpe)+'/10) : garde 1 à 2 répétitions en réserve.');

 const snap=cycle.answers_snapshot||{},n=Number(snap.daysCount||cycle.sessions_per_week||3);
 let recommendation;
 if(regularity<0.6&&n>2)recommendation={code:'adjust',title:'Alléger le rythme',text:'Tu as fait '+done+' séances sur '+plan+'. Passe à '+(n-1)+' séances par semaine, même méthode : mieux vaut un programme que tu tiens.',changes:{daysCount:String(n-1)}};
 else if(regularity<0.6)recommendation={code:'adjust',title:'Rythme léger',text:'Tu as fait '+done+' séances sur '+plan+'. Reste sur 2 séances par semaine, quitte à les raccourcir : la régularité compte plus que la durée.',changes:{daysCount:'2'}};
 else if(evolutions.length>=2&&share<0.3){
  const alt=methodsFor(n).find(m=>m!==cycle.method)||cycle.method;
  recommendation={code:'change',title:'Changer de méthode',text:'Tu as été régulier mais tes charges stagnent. Une nouvelle méthode relance la progression.',changes:{method:alt}};
 }
 else recommendation={code:'keep',title:'Garder la méthode',text:share>=0.5?'Régulier et en progrès : on garde la même méthode pour un nouveau cycle.':'Bonne régularité : on garde la méthode et on vise la progression sur les exercices qui stagnent.',changes:{}};
 return {done,planned:plan,weeks,regularity,evolutions,strengths,improve,rpe,recommendation};
}

// Réponses du cycle suivant : photographie du cycle en cours + changements. Le cycle en cours n'est jamais modifié.
function nextAnswers(cycle,changes={}){
 const a={...JSON.parse(JSON.stringify(cycle?.answers_snapshot||{})),...changes};
 const n=Number(a.daysCount)||3;
 if(a.planMode==='free')a.days=[];
 else if(!Array.isArray(a.days)||a.days.length<n)a.days=[];
 return a;
}

return {due,review,methodsFor,nextAnswers,planned};
});
