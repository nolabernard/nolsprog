/* Diagnostic et recommandations d'onboarding : pur, sans mutation du profil. */
(function(root,factory){const api=factory(root.SteroidRules||(typeof require==='function'?require('./sport-rules.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.SteroidGuide=api;})(typeof globalThis!=='undefined'?globalThis:this,function(rules){
 'use strict';
 const LABEL={auto:'Choix conseillé',fullbody:'Full body',upperlower:'Haut / bas du corps',ppl:'Push / Pull / Legs',split:'Split musculaire',hybrid:'Hybride'};
 const STAGES={daysCount:3,days:5,method:6,level:2,currentSessions:2,limitations:6,duration:3,equipment:4};
 const relevantCodes=new Set(['METHOD_DISCOURAGED','BEGINNER_HIGH_FREQUENCY','FREQUENCY_JUMP']);
 function assess(p){return rules.assess(p)}
 function change(p,patch){return {...p,...patch}}

 function diagnostic(p){
  const result=assess(p),issues=[];
  for(const e of result.errors)issues.push({code:e.code,field:e.field,title:'Une information est à corriger',reason:e.message,stage:STAGES[e.field]??6});
  for(const w of result.warnings){
   if(w.code==='METHOD_DISCOURAGED')issues.push({code:w.code,field:'method',stage:6,title:'Méthode et fréquence peu compatibles',reason:LABEL[p.method]+' avec '+p.daysCount+' séances par semaine risque de déséquilibrer la répartition musculaire. La méthode peut être adaptée, mais une autre répartition est généralement plus pertinente.'});
   else if(w.code==='BEGINNER_HIGH_FREQUENCY')issues.push({code:w.code,field:'daysCount',stage:3,title:'Rythme élevé pour débuter',reason:'Avec '+p.daysCount+' séances et un niveau débutant, la récupération et la régularité peuvent devenir difficiles.'});
   else if(w.code==='FREQUENCY_JUMP')issues.push({code:w.code,field:'daysCount',stage:3,title:'Progression trop rapide du rythme',reason:'Passer de '+p.currentSessions+' à '+p.daysCount+' séances par semaine représente un saut important. Une augmentation progressive est généralement plus durable.'});
   else if(w.code==='LIMITATIONS_REVIEW')issues.push({code:w.code,field:'limitations',stage:6,title:'Mouvements à vérifier',reason:'Tu as indiqué une douleur ou une limitation. Les exercices doivent être adaptés à ta situation, idéalement avec un professionnel de santé. Cette information ne peut pas être corrigée automatiquement.'});
  }
  const choices=[];
  function propose(patch,title,why){
   const next=change(p,patch),a=assess(next);
   if(!a.valid||a.warnings.some(w=>relevantCodes.has(w.code)))return;
   const key=JSON.stringify(patch);if(choices.some(x=>x.key===key))return;
   choices.push({key,patch,title,why,stage:Object.keys(patch).includes('method')?6:3});
  }
  const n=Number(p.daysCount),current=Number(p.currentSessions??2),level=p.level||'intermediate';
  if(result.warnings.some(w=>w.code==='METHOD_DISCOURAGED')){
   for(const method of ['auto','fullbody','upperlower','hybrid','ppl','split']){
    if(method!==p.method)propose({method},'Choisir '+LABEL[method],'Conserver '+n+' séances et adopter une méthode mieux adaptée à ce rythme.');
   }
  }
  if(result.warnings.some(w=>w.code==='BEGINNER_HIGH_FREQUENCY'||w.code==='FREQUENCY_JUMP'||w.code==='METHOD_DISCOURAGED')){
   for(let count=2;count<=6;count++){
    if(count===n||count>(Array.isArray(p.days)?p.days.length:0))continue;
    if(level==='beginner'&&count>=5)continue;
    if(Number.isFinite(current)&&count-current>=3)continue;
    propose({daysCount:String(count)},'Passer à '+count+' séances','Adapter le rythme à ton expérience et à tes séances actuelles. Les jours disponibles sont conservés : aucun nouveau jour n’est supposé libre.');
   }
  }

  choices.sort((a,b)=>{const score=x=>(Object.keys(x.patch).includes('method')?0:2)+(x.patch.method==='auto'?-1:0);return score(a)-score(b)});
  return {ok:result.valid&&!result.warnings.some(w=>relevantCodes.has(w.code)),issues,choices:choices.slice(0,5),assessment:result};
 }
 return Object.freeze({diagnostic,change,LABEL,STAGES});
});
