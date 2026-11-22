/* STEROID V2 — prochaine séance.
 * Le programme est une suite (A → B → C…) : on propose la séance qui suit la dernière terminée.
 * Jamais de séance « manquée ». Garde-fou : si un groupe travaillé en exercice de base l'a été il y a
 * moins de 48 h, on conseille la prochaine séance compatible, en expliquant pourquoi.
 * Une séance par jour : une fois la séance du jour faite (ou passée), la suivante attend le lendemain.
 * Une séance passée (« Je ne fais pas cette séance ») fait avancer la suite sans compter comme travaillée. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidPlanner=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RECOVERY_HOURS=48;
const baseMuscles=s=>new Set((s.muscles||[]).filter(m=>m.role==='base').map(m=>m.muscle));
const PHRASE={Pectoraux:'les pectoraux',Dos:'le dos',Jambes:'les jambes',Épaules:'les épaules',Bras:'les bras',Abdominaux:'les abdominaux'};
function list(set){const a=[...set].map(m=>PHRASE[m]||m.toLowerCase());return a.length<=1?a.join(''):a.slice(0,-1).join(', ')+' et '+a[a.length-1]}
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
  const next=plan(sessions,workouts,now+24*3600e3);
  const title=sessions.find(s=>s.id===done.cycle_session_id)?.title||done.title||'Ta séance';
  return {...next,reason:'tomorrow',today:{id:done.id,status:done.status,title,reason:done.skip_reason||null},message:''};
 }
 return plan(sessions,workouts,now);
}
function plan(sessions,workouts,now){
 const moved=(workouts||[]).filter(w=>(w.status==='completed'||w.status==='skipped')&&w.ended_at).sort((a,b)=>Date.parse(b.ended_at)-Date.parse(a.ended_at));
 const finished=moved.filter(w=>w.status==='completed');
 const last=moved.find(w=>sessions.some(s=>s.id===w.cycle_session_id));
 const start=last?(sessions.findIndex(s=>s.id===last.cycle_session_id)+1)%sessions.length:0;
 const planned=sessions[start];
 // Groupes encore en récupération (base, < 48 h).
 const tired=new Map();
 for(const w of finished){
  const hours=(now-Date.parse(w.ended_at))/3600e3;if(hours>=RECOVERY_HOURS)break;
  const s=sessions.find(x=>x.id===w.cycle_session_id);if(!s)continue;
  for(const m of baseMuscles(s))if(!tired.has(m))tired.set(m,{session:s,hours});
 }
 const clash=s=>[...baseMuscles(s)].filter(m=>tired.has(m));
 if(!clash(planned).length)return {session:planned,planned,reason:'sequence',message:''};
 const muscles=new Set(clash(planned)),src=tired.get([...muscles][0]);
 const why=`Tu as travaillé ${list(muscles)} il y a ${Math.round(src.hours)} h (${src.session.title}) : il faut environ ${RECOVERY_HOURS} h pour récupérer.`;
 for(let k=1;k<sessions.length;k++){
  const s=sessions[(start+k)%sessions.length];
  if(!clash(s).length)return {session:s,planned,reason:'recovery',message:`${why} Je te propose ${s.title} aujourd’hui, ${planned.title} sera parfait ensuite.`};
 }
 return {session:planned,planned,reason:'recovery-all',message:`${why} Toutes tes séances les sollicitent à nouveau : allège les charges aujourd’hui si tu sens de la fatigue.`};
}
return {nextSession,today,RECOVERY_HOURS};
});
