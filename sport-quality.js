/* STÉROÏDE — audit sportif V1, sans modification automatique des séances.
 * Estimations : séries directes par groupe, durée incluant échauffement,
 * repos et transitions. Aucune conclusion médicale.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SteroidQuality=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MUSCLES=['Pectoraux','Dos','Jambes','Épaules','Bras','Abdominaux'];
 const patterns={
  pushH:'Pectoraux',chestIso:'Pectoraux',pullV:'Dos',pullH:'Dos',
  squat:'Jambes',hinge:'Jambes',hamIso:'Jambes',quadIso:'Jambes',calves:'Jambes',
  pushV:'Épaules',side:'Épaules',rear:'Épaules',
  biceps:'Bras',triceps:'Bras',core:'Abdominaux'
 };
 function catalogueIndex(catalogue){
  return new Map(catalogue.map(e=>[e.name,{muscle:e.muscle,pattern:e.pattern,compound:e.compound}]));
 }
 function audit(plan,profile,index){
  if(!Array.isArray(plan)||plan.length!==7)throw Error('Programme hebdomadaire invalide.');
  const limit=Number(profile?.duration)||60;
  const volume=Object.fromEntries(MUSCLES.map(m=>[m,0]));
  const exposures=Object.fromEntries(MUSCLES.map(m=>[m,0]));
  const warnings=[],sessions=[];
  for(let day=0;day<7;day++){
   const session=plan[day],exercises=session?.ex;
   if(!Array.isArray(exercises))throw Error('Séance invalide : '+day);
   if(!exercises.length){sessions.push({day,rest:true,minutes:0,sets:0});continue}
   let minutes=6,sets=0;
   const touched=new Set(),names=new Set();
   for(const e of exercises){
    if(!Number.isInteger(e.sets)||e.sets<1||e.sets>20)warnings.push({code:'INVALID_SETS',day,exercise:e.name});
    if(names.has(e.name))warnings.push({code:'DUPLICATE_EXERCISE',day,exercise:e.name});
    names.add(e.name);
    const series=Number.isInteger(e.sets)&&e.sets>0?e.sets:0;
    const rest=Number(e.rest);
    if(!Number.isFinite(rest)||rest<0)warnings.push({code:'INVALID_REST',day,exercise:e.name});
    const known=index?.get(e.name);
    if(!known)warnings.push({code:'UNKNOWN_EXERCISE',day,exercise:e.name});
    else if(volume[known.muscle]!==undefined){volume[known.muscle]+=series;touched.add(known.muscle)}
    // 40-55s per set; rest occurs between sets, not after the last set.
    const secondsPerSet=known?.compound>=2?50:40;
    minutes+=(series*secondsPerSet+Math.max(0,series-1)*Math.max(0,Number.isFinite(rest)?rest:0))/60+0.75;
    sets+=series;
   }
   for(const muscle of touched)exposures[muscle]++;
   const estimated=Math.ceil(minutes);
   if(estimated>limit*1.1)warnings.push({code:'DURATION_EXCEEDED',day,estimated,limit});
   sessions.push({day,rest:false,minutes:estimated,sets});
  }
  const level=profile?.level||'intermediate';
  const ranges={beginner:[6,8],intermediate:[8,12],advanced:[10,16]};
  const range=ranges[level]||ranges.intermediate;
  // Low volume is informative, not an error: compound work also trains synergists.
  for(const muscle of ['Pectoraux','Dos','Jambes','Épaules']){
   if(volume[muscle]>range[1]*1.5)warnings.push({code:'HIGH_DIRECT_VOLUME',muscle,sets:volume[muscle],reference:range});
   if(exposures[muscle]<2)warnings.push({code:'LOW_FREQUENCY',muscle,exposures:exposures[muscle]});
  }
  // Check individual patterns, not just the broad muscle category.
  // Quad and hamstring work should not be treated as interchangeable.
  const patternSets={};
  for(const session of plan)for(const e of session.ex){
   const pattern=index?.get(e.name)?.pattern;
   if(pattern)patternSets[pattern]=(patternSets[pattern]||0)+(Number(e.sets)||0);
  }
  const movementFamilies={
   horizontalPush:['pushH','chestIso'],horizontalPull:['pullH'],verticalPull:['pullV'],
   kneeDominant:['squat','quadIso'],hipDominant:['hinge','hamIso']
  };
  const movementVolume=Object.fromEntries(Object.entries(movementFamilies).map(([name,parts])=>[name,parts.reduce((sum,p)=>sum+(patternSets[p]||0),0)]));
  for(const [family,sets] of Object.entries(movementVolume)){
   if(sets===0)warnings.push({code:'MISSING_MOVEMENT_FAMILY',family});
  }
  const workingSets=sessions.reduce((sum,s)=>sum+s.sets,0);
  const totalMinutes=sessions.reduce((sum,s)=>sum+s.minutes,0);
  return {valid:!warnings.some(w=>['INVALID_SETS','INVALID_REST','DUPLICATE_EXERCISE','DURATION_EXCEEDED'].includes(w.code)),sessions,volume,exposures,movementVolume,workingSets,totalMinutes,warnings,referenceRange:range,method:profile?.method||'auto'};
 }
 return Object.freeze({MUSCLES,patterns,catalogueIndex,audit});
});
