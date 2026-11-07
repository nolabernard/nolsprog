/* STÉROÏDE V1 — Phase 1 : règles sportives et validation pure.
 * Module autonome : ne modifie ni le générateur actuel ni l'interface.
 * Aucun diagnostic médical, aucune charge prescrite.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SteroidRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const METHODS=['fullbody','upperlower','ppl','split','hybrid'];
 const MATRIX=Object.freeze({
  fullbody:['adapted','adapted','conditional','discouraged','discouraged'],
  upperlower:['conditional','adapted','adapted','conditional','conditional'],
  ppl:['discouraged','conditional','conditional','conditional','adapted'],
  split:['discouraged','discouraged','conditional','conditional','conditional'],
  hybrid:['conditional','adapted','adapted','adapted','conditional']
 });
 const LEVELS=['beginner','intermediate','advanced'];
 const GOALS=['muscle','strength','fatloss','fitness','restart'];
 const EQUIPMENT=['gym','dumbbells','none'];
 const VOLUME=Object.freeze({beginner:[6,8],intermediate:[8,12],advanced:[10,16]});
 const AUTO=Object.freeze({2:'fullbody',3:'fullbody',4:'upperlower',5:'hybrid',6:'ppl'});
 const RULES_VERSION='1.0.0';
 function isObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
 function integer(x){if(typeof x==='string'&&!/^\d+$/.test(x.trim()))return NaN;if(x===''||x===null||x===undefined||typeof x==='boolean')return NaN;return Number.isInteger(Number(x))?Number(x):NaN}
 function uniqueDays(days){return [...new Set(days.map(integer))].sort((a,b)=>a-b)}
 function issue(code,field,message,severity='error',requiresConfirmation=false){return {code,field,message,severity,requiresConfirmation}}
 function assess(input){
  const errors=[],warnings=[],info=[];
  if(!isObject(input))return {valid:false,profile:null,method:null,compatibility:null,errors:[issue('INVALID_PROFILE','profile','Profil invalide.')],warnings,info,requiresConfirmation:false,version:RULES_VERSION};
  const n=integer(input.daysCount);
  if(!Number.isInteger(n)||n<2||n>6)errors.push(issue('INVALID_FREQUENCY','daysCount','Choisis entre 2 et 6 séances par semaine.'));
  const days=Array.isArray(input.days)?uniqueDays(input.days):[];
  if(!Array.isArray(input.days)||days.some(d=>d<0||d>6||!Number.isInteger(d)))errors.push(issue('INVALID_DAYS','days','Les jours doivent être des entiers de 0 (lundi) à 6 (dimanche).'));
  else if(Number.isInteger(n)&&days.length<n)errors.push(issue('INSUFFICIENT_DAYS','days','Le nombre de jours disponibles est inférieur aux séances demandées.'));
  const requested=input.method===undefined||input.method===null?'auto':input.method;
  if(requested!=='auto'&&!METHODS.includes(requested))errors.push(issue('INVALID_METHOD','method','Méthode inconnue.'));
  const method=requested==='auto'&&n>=2&&n<=6?AUTO[n]:requested;
  const level=input.level||'intermediate';
  if(!LEVELS.includes(level))errors.push(issue('INVALID_LEVEL','level','Niveau inconnu.'));
  const goal=input.goal||'muscle';
  if(!GOALS.includes(goal))errors.push(issue('INVALID_GOAL','goal','Objectif inconnu.'));
  const equipment=input.equipment||'gym';
  if(!EQUIPMENT.includes(equipment))errors.push(issue('INVALID_EQUIPMENT','equipment','Équipement inconnu.'));
  const duration=integer(input.duration===undefined?'60':input.duration);
  if(![30,45,60,75,90].includes(duration))errors.push(issue('INVALID_DURATION','duration','Durée non prise en charge.'));
  const current=integer(input.currentSessions===undefined?'2':input.currentSessions);
  if(!Number.isInteger(current)||current<0||current>6)errors.push(issue('INVALID_CURRENT_FREQUENCY','currentSessions','Fréquence actuelle invalide.'));
  const priority=Array.isArray(input.priority)?[...new Set(input.priority)]:[];
  const allowedPriorities=['Pectoraux','Dos','Épaules','Bras','Jambes','Abdominaux'];
  if(!Array.isArray(input.priority)&&input.priority!==undefined||priority.some(x=>!allowedPriorities.includes(x)))errors.push(issue('INVALID_PRIORITY','priority','Priorités musculaires invalides.'));
  const avoid=typeof input.avoid==='string'?input.avoid.trim():'';
  if(input.avoid!==undefined&&typeof input.avoid!=='string')errors.push(issue('INVALID_AVOID','avoid','Liste des exercices à éviter invalide.'));
  const limitations=input.limitations||'no';
  if(!['yes','no'].includes(limitations))errors.push(issue('INVALID_LIMITATIONS','limitations','Valeur de limitation invalide.'));
  const compatibility=METHODS.includes(method)&&n>=2&&n<=6?MATRIX[method][n-2]:null;
  if(compatibility==='discouraged')warnings.push(issue('METHOD_DISCOURAGED','method','Cette méthode est déconseillée à cette fréquence. Elle sera adaptée sans changer silencieusement de méthode.','warning',true));
  if(compatibility==='conditional')info.push(issue('METHOD_CONDITIONAL','method','Cette méthode nécessite une répartition adaptée.','info'));
  if(level==='beginner'&&n>=5)warnings.push(issue('BEGINNER_HIGH_FREQUENCY','daysCount','Une fréquence élevée chez un débutant exige un volume adapté.','warning',true));
  if(Number.isInteger(current)&&Number.isInteger(n)&&n-current>=3)warnings.push(issue('FREQUENCY_JUMP','daysCount','L’augmentation de fréquence est importante : prévoir une adaptation progressive.','warning',true));
  if(limitations==='yes')warnings.push(issue('LIMITATIONS_REVIEW','limitations','Les limitations déclarées nécessitent une vérification des mouvements avant entraînement.','warning',true));
  const profile={method:requested,daysCount:n,days,level,goal,equipment,duration,currentSessions:current,priority,avoid,limitations};
  return {valid:errors.length===0,profile,method,compatibility,errors,warnings,info,requiresConfirmation:warnings.some(w=>w.requiresConfirmation),volumeRange:VOLUME[level]?[...VOLUME[level]]:null,frequencyTarget:2,cycleWeeks:6,progression:'double',rotation:'continuous',version:RULES_VERSION};
 }
 function confirm(result,acceptedCodes=[]){
  if(!result||!result.valid)return {approved:false,pending:[],reason:'invalid_profile'};
  const accepted=new Set(Array.isArray(acceptedCodes)?acceptedCodes:[]);
  const pending=result.warnings.filter(x=>x.requiresConfirmation&&!accepted.has(x.code)).map(x=>x.code);
  return {approved:pending.length===0,pending,reason:pending.length?'confirmation_required':null};
 }
 return Object.freeze({RULES_VERSION,METHODS,MATRIX,VOLUME,assess,confirm});
});
