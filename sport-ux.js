/* STÉROÏDE — isolated UX helpers, no user data mutation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SteroidUX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function valid(row){return row?.completed===true&&Number.isFinite(Number(row?.weight))&&row.weight!==null&&row.weight!==''&&Number.isFinite(Number(row?.reps))&&Number(row.reps)>0}
 function best(rows){const eligible=(rows||[]).filter(valid);return eligible.sort((a,b)=>Number(b.weight)-Number(a.weight)||Number(b.reps)-Number(a.reps))[0]||null}
 function achievement(current,previous){
  const now=best(current),old=best(previous);if(!now||!old)return null;
  const weight=Number(now.weight),oldWeight=Number(old.weight),reps=Number(now.reps),oldReps=Number(old.reps);
  if(weight>oldWeight&&reps>=oldReps)return {kind:'weight',delta:weight-oldWeight,label:'Nouveau record : +'+Number((weight-oldWeight).toFixed(2))+' kg à répétitions égales ou supérieures'};
  if(weight===oldWeight&&reps>oldReps)return {kind:'reps',delta:reps-oldReps,label:'+'+(reps-oldReps)+' répétition'+(reps-oldReps>1?'s':'')+' à charge identique'};
  return null;
 }
 function previousNote(rows){const row=best(rows);return row?Number(row.weight)+' kg × '+Number(row.reps)+' répétitions':null}
 function alternatives(name,catalogue,avoid=''){
  const list=Array.isArray(catalogue)?catalogue:[],source=list.find(x=>x.name===name);
  if(!source)return [];
  const ignored=String(avoid||'').toLowerCase().split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  return list.filter(x=>x.name!==name&&x.pattern===source.pattern&&!ignored.some(v=>x.name.toLowerCase().includes(v))).slice(0,4);
 }
 const guidance={
  pushH:['Pectoraux','Garde les épaules stables et descends la charge sous contrôle.','Évite de rebondir en bas du mouvement.'],
  pushV:['Épaules','Reste gainé et pousse sans cambrer excessivement.','Évite de projeter la tête ou de forcer la trajectoire.'],
  pullH:['Dos','Tire avec les coudes en gardant le buste stable.','Évite de donner de grands à-coups.'],
  pullV:['Dos','Abaisse les épaules et ramène les coudes vers le bas.','Ne tire pas derrière la nuque.'],
  squat:['Jambes','Fléchis progressivement en gardant le mouvement maîtrisé.','Évite de laisser la charge te déséquilibrer.'],
  hinge:['Jambes','Pousse les hanches vers l’arrière et maintiens le dos stable.','Évite d’arrondir le dos sous charge.'],
  biceps:['Bras','Garde les coudes stables et maîtrise la descente.','Évite de balancer le buste.'],
  triceps:['Bras','Stabilise les coudes et déroule l’extension lentement.','Évite de faire tout le mouvement avec les épaules.'],
  side:['Épaules','Lève les bras de manière contrôlée, sans hausser les épaules.','Évite l’élan et les charges trop lourdes.'],
  rear:['Épaules','Ouvre les bras sans élan avec un buste stable.','Ne compense pas en haussant les épaules.'],
  core:['Abdominaux','Respire normalement et garde le tronc stable.','Évite de retenir la respiration.']
 };
 function info(name,catalogue){
  const found=(catalogue||[]).find(x=>x.name===name),g=guidance[found?.pattern];
  if(!g)return {muscle:found?.muscle||'Muscles selon le mouvement',instruction:'Utilise une amplitude confortable et garde le mouvement contrôlé.',mistake:'Évite les gestes brusques et les charges non maîtrisées.'};
  return {muscle:g[0],instruction:g[1],mistake:g[2]};
 }
 return Object.freeze({valid,best,achievement,previousNote,alternatives,info});
});
