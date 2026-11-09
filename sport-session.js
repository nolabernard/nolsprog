/* Séances : bilan fiable et estimation indicative, sans dépendance externe. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SteroidSession=api;})(globalThis,function(){
 const key=(week,day)=>week+':'+day;
 const completed=(logs,week,day,exercise)=>logs.filter(x=>x.week_number===week&&x.day_index===day&&x.exercise_id===exercise.id&&x.completed).length;
 function progress(plan,logs,week,day){const total=plan.ex.reduce((n,x)=>n+x.sets,0),done=plan.ex.reduce((n,x)=>n+completed(logs,week,day,x),0);return {total,done,percent:total?Math.round(100*done/total):0,exercises:plan.ex.filter(x=>completed(logs,week,day,x)>0).length};}
 function calories(weight,seconds,done,total){const kg=Number(weight),duration=Number(seconds);if(!Number.isFinite(kg)||kg<30||kg>300||!Number.isFinite(duration)||duration<60||duration>14400||done===0)return null;/* 2024 Compendium: multiple resistance exercises 8-15 reps = 3.5 MET; do not infer intensity from completion percentage. Long unattended timers require manual correction. */const met=3.5;return Math.round((met*kg*duration/3600)/5)*5;}
 function duration(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60);return h?h+' h '+String(m).padStart(2,'0')+' min':m+' min';}
 function motivation(p){if(p.done===0)return 'La prochaine séance sera une nouvelle occasion.';if(p.done<p.total)return 'Tout n’est pas terminé. Mais tu as avancé.';return 'Le travail est fait. À la prochaine.';}
 return {key,progress,calories,duration,motivation};
});
