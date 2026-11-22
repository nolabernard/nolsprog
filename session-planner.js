/* STEROID V2 — prochaine séance.
 * Le programme est une suite (A → B → C…) parcourue par tours. Dans le tour en cours, on propose la première séance
 * (dans l'ordre du programme) pas encore faite ni passée : une séance déplacée (choisie à la place d'une autre) n'est
 * donc jamais sautée, elle reste à faire. Aucune suggestion automatique : on suit l'ordre du programme.
 * Un tour se termine quand chaque séance a été faite ou passée ; refaire une séance du tour en ouvre un nouveau
 * (jamais de rattrapage). Une séance par jour : une fois la séance du jour faite ou passée, la suivante attend demain.
 * Une séance passée (« Je ne la fais pas aujourd'hui ») fait avancer le tour sans compter comme faite. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidPlanner=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const dayKey=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
// Séance faite ou passée aujourd'hui (jour du téléphone) : la plus récente.
function today(workouts,now=Date.now()){
 const k=dayKey(now);
 return (workouts||[]).filter(w=>(w.status==='completed'||w.status==='skipped')&&w.ended_at&&dayKey(Date.parse(w.ended_at))===k).sort((a,b)=>Date.parse(b.ended_at)-Date.parse(a.ended_at))[0]||null;
}
function nextSession(cycle,workouts,now=Date.now()){
 const sessions=[...(cycle?.sessions||[])].sort((a,b)=>a.position-b.position);
 if(!sessions.length)return null;
 const done=today(workouts,now);
 if(done){
  // Prochaine séance calculée pour demain à la même heure (récupération comprise).
  const next=plan(sessions,workouts);
  const title=sessions.find(s=>s.id===done.cycle_session_id)?.title||done.title||'Ta séance';
  return {...next,reason:'tomorrow',today:{id:done.id,status:done.status,title,reason:done.skip_reason||null},message:''};
 }
 return plan(sessions,workouts);
}
// Tour en cours : séances faites ou passées depuis le début du tour, et celles qui restent (dans l'ordre du programme).
function round(cycleOrSessions,workouts){
 const sessions=[...(Array.isArray(cycleOrSessions)?cycleOrSessions:cycleOrSessions?.sessions||[])].sort((a,b)=>a.position-b.position);
 const ids=new Set(sessions.map(x=>x.id));
 const handled=(workouts||[]).filter(w=>(w.status==='completed'||w.status==='skipped')&&w.ended_at&&ids.has(w.cycle_session_id)).sort((a,b)=>Date.parse(a.ended_at)-Date.parse(b.ended_at));
 let current=new Set();
 for(const w of handled){
  if(current.has(w.cycle_session_id))current=new Set(); // séance refaite : nouveau tour
  current.add(w.cycle_session_id);
  if(current.size===ids.size)current=new Set(); // tour complet
 }
 return {handled:[...current],remaining:sessions.filter(x=>!current.has(x.id)),total:sessions.length};
}
function plan(sessions,workouts){
 const {remaining}=round(sessions,workouts);
 const planned=remaining[0]||sessions[0];
 return {session:planned,planned,reason:'sequence',message:''};
}
return {nextSession,today,round};
});
