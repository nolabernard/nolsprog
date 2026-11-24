/* STEROID — mode démo : données fictives pour voir l'app sans compte ni questionnaire.
 * Les données sont fabriquées en faisant jouer de vraies séances au contrôleur V2 (horloge simulée sur ~3 semaines),
 * dans un stockage séparé (préfixe « nolsprog-demo| ») : jamais envoyées, jamais mélangées aux données réelles. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidDemo=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PREFIX='nolsprog-demo|';
const ANSWERS={goal:'muscle',level:'intermediate',currentSessions:'3',daysCount:'4',duration:'60',equipment:'gym',priority:['Pectoraux'],planMode:'days',days:[0,1,3,4],method:'auto',avoid:'',limitations:'non',age:'29',height:'178',weight:'76',job:'mixed',activity:'medium',sleep:'7-8'};
const FIRST_NAME='Alex';
// Stockage isolé : mêmes méthodes que localStorage, clés préfixées.
function storage(base){return {getItem:k=>base.getItem(PREFIX+k),setItem:(k,v)=>base.setItem(PREFIX+k,v),removeItem:k=>base.removeItem(PREFIX+k)}}
function clear(base){try{const ks=[];for(let i=0;i<base.length;i++){const k=base.key(i);if(k&&k.startsWith(PREFIX))ks.push(k)}ks.forEach(k=>base.removeItem(k))}catch{}}
// Charge de départ plausible selon le muscle et le rôle (base / finition), puis +2,5 kg par semaine sur les exercices de base.
function startWeight(key){const C=globalThis.SteroidCatalogue,e=C?.byKey?.(key)||{};const role=e.role||'base',m=e.muscle||'';
 if(/Abdo/.test(m))return null;
 if(role==='finition')return /Mollets|Jambes|Fessiers/.test(m)?40:/Épaules|Bras/.test(m)?10:20;
 return /Jambes|Fessiers/.test(m)?90:/Pectoraux/.test(m)?55:/Dos/.test(m)?50:/Épaules/.test(m)?18:30}
// Fabrique l'historique : séances les jours choisis, depuis 19 jours jusqu'à hier. Renvoie le nombre de séances faites.
async function seed({AppV2,base,now=Date.now(),uuid}){
 const st=storage(base),d0=new Date(now);d0.setHours(18,0,0,0);
 let t=d0.getTime()-19*864e5,n=0;
 const ctl=AppV2.create({storage:st,api:null,userId:null,legacyPlan:()=>null,answers:()=>ANSWERS,firstName:()=>FIRST_NAME,now:()=>t,uuid,render(){},notice(){},confirm:async()=>true});
 await ctl.init();
 const P=globalThis.SteroidPlanner,days=new Set(ANSWERS.days);
 for(let day=0;day<19;day++,t=d0.getTime()-(19-day)*864e5){
  const wd=(new Date(t).getDay()+6)%7;if(!days.has(wd))continue;
  const s=ctl.state(),next=P.nextSession(s.cycle,s.workouts,t)?.session;if(!next)continue;
  await ctl.handle('v2-start',{session:next.id});
  const w=s.store.current();if(!w)continue;const week=Math.floor(day/7);
  for(const e of [...w.exercises].sort((a,b)=>a.position-b.position)){
   const p=e.plan||{},w0=startWeight(e.exercise_key),kg=w0==null?null:w0+(p.role==='base'?2.5*week:0);
   for(const set of e.sets){
    const lo=p.reps_min||8,hi=p.reps_max||12,reps=Math.max(lo,Math.min(hi,lo+week+(set.set_number===1?1:0)));
    if(kg!=null)ctl.input({ex:e.id,set:set.set_number,field:'weight',value:String(kg).replace('.',',')});
    ctl.input({ex:e.id,set:set.set_number,field:'reps',value:String(reps)});
    t+=95e3;await ctl.handle('v2-set',{ex:e.id,set:String(set.set_number)});
    await ctl.handle('v2-rir',{ex:e.id,set:String(set.set_number),rir:String(set.set_number===e.sets.length?1:2)});
   }
   t+=60e3;
  }
  t+=120e3;await ctl.handle('v2-finish');await ctl.handle('v2-close-summary');n++;
 }
 try{base.setItem(PREFIX+'seeded','1')}catch{}
 return n;
}
const seeded=base=>{try{return base.getItem(PREFIX+'seeded')==='1'}catch{return false}};
return {PREFIX,ANSWERS,FIRST_NAME,storage,clear,seed,seeded};
});
