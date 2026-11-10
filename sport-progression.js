/* STÉROÏDE — double progression, sans modification automatique des charges. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SteroidProgression=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function repRange(value){
  const matches=String(value||'').match(/\d+/g);
  if(!matches||matches.length<2||/\bs\b|sec|second/i.test(String(value)))return null;
  const min=Number(matches[0]),max=Number(matches[1]);
  return min>=1&&max>=min&&max<=50?{min,max}:null;
 }
 function evaluate(exercise,rows,feedback){
  const range=repRange(exercise?.reps);
  if(!range)return {status:'not_applicable',message:'Progression en répétitions non applicable à cet exercice.'};
  const count=Number(exercise?.sets);
  if(!Number.isInteger(count)||count<1||!Array.isArray(rows))return {status:'insufficient',message:'Complète tes séries pour obtenir une recommandation.'};
  const completed=Array.from({length:count},(_,i)=>rows.find(r=>r.set_number===i+1&&r.completed&&Number.isFinite(Number(r.reps))&&Number(r.reps)>0));
  if(completed.some(r=>!r))return {status:'insufficient',message:'Complète toutes les séries avant de progresser.'};
  const weights=completed.map(r=>r.weight===null||r.weight===undefined||r.weight===''?NaN:Number(r.weight));
  if(weights.some(w=>!Number.isFinite(w)||w<0))return {status:'insufficient',message:'Renseigne tes charges pour suivre ta progression.'};
  if(!completed.every(r=>Number(r.reps)>=range.max))return {status:'reps',message:'Garde la même charge et progresse vers '+range.max+' répétitions sur chaque série.',range};
  if(feedback?.technique!==true||!Number.isFinite(Number(feedback?.rir))||Number(feedback.rir)<1||Number(feedback.rir)>4){
   return {status:'verify',message:'Haut de fourchette atteint. Vérifie une technique propre et un RIR de 1 à 4 avant de monter la charge.',range};
  }
  const maxWeight=Math.max(...weights),increment=maxWeight>=60?2.5:maxWeight>=20?1.25:0.5;
  return {status:'increase',message:'Tu peux envisager +'+increment+' kg à la prochaine séance, si le mouvement reste maîtrisé.',suggestedWeight:Math.round((maxWeight+increment)*100)/100,increment,range};
 }
 return Object.freeze({repRange,evaluate});
});
