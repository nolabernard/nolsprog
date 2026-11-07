/* Séances : bilan fiable et estimation indicative, sans dépendance externe. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SteroidSession=api;})(globalThis,function(){
 const key=(week,day)=>week+':'+day;
 const completed=(logs,week,day,exercise)=>logs.filter(x=>x.week_number===week&&x.day_index===day&&x.exercise_id===exercise.id&&x.completed).length;
 function progress(plan,logs,week,day){const total=plan.ex.reduce((n,x)=>n+x.sets,0),done=plan.ex.reduce((n,x)=>n+completed(logs,week,day,x),0);return {total,done,percent:total?Math.round(100*done/total):0,exercises:plan.ex.filter(x=>completed(logs,week,day,x)>0).length};}
 function calories(weight,seconds,done,total){const kg=Number(weight);if(!Number.isFinite(kg)||kg<30||kg>300||seconds<60||done===0)return null;const hours=Math.min(seconds,10800)/3600;const met=done/Math.max(total,1)>.8?3.8:3.2;return Math.round((met*kg*hours)/5)*5;}
 function motivation(p){if(p.done===0)return 'La prochaine séance sera une nouvelle occasion.';if(p.done<p.total)return 'Tout n’est pas terminé. Mais tu as avancé.';return 'Le travail est fait. À la prochaine.';}
 return {key,progress,calories,motivation};
});
