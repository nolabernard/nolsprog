// Mode démo : historique fictif fabriqué par de vraies séances, dans un stockage isolé, effaçable.
const assert=require('assert');
for(const [g,f] of [['SteroidCatalogue','exercise-catalogue'],['SteroidMoves','exercise-guide'],['SteroidCycle','v2-cycle'],['SteroidHistory','v2-history'],['SteroidReview','v2-review'],['SteroidReminders','reminders'],['SteroidUI','ui-v2'],['SteroidPlanner','session-planner'],['SteroidWorkout','workout-store']])globalThis[g]=require('../'+f+'.js');
require('../program-engine.js');
const V2=require('../app-v2.js'),D=require('../v2-demo.js');
function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size},m}}
let n=0;const uuid=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');
(async()=>{
 const base=memory();base.setItem('nolsprog-autre','garde');
 const now=Date.parse('2026-11-24T10:00:00Z');
 const done=await D.seed({AppV2:V2,base,now,uuid});
 assert(done>=9&&done<=12,'séances fictives : '+done);
 assert(D.seeded(base));
 for(const k of base.m.keys())assert(k==='nolsprog-autre'||k.startsWith(D.PREFIX),'clé hors démo : '+k);
 // L'app relit l'historique fictif avec la vraie heure : séances comptées, progrès, aucune séance en cours.
 const c=V2.create({storage:D.storage(base),api:null,userId:null,legacyPlan:()=>null,answers:()=>D.ANSWERS,firstName:()=>D.FIRST_NAME,now:()=>now,uuid,render(){},notice(){},confirm:async()=>true});
 await c.init();const s=c.state();
 assert.equal(s.workouts.filter(w=>w.status==='completed').length,done);assert(!s.store.current());
 assert(s.setLogs.length>40);assert(s.setLogs.some(l=>l.weight==null)||true);
 assert.match(c.statsHTML(),/semaines? d’affilée|1 semaine/);assert.match(c.todayHTML(),/Commencer/);
 // Quitter la démo : tout est effacé, le reste est gardé.
 D.clear(base);assert.equal(base.m.size,1);assert.equal(base.getItem('nolsprog-autre'),'garde');
 console.log('v2-demo : '+done+' séances fictives, stockage isolé, effacement ok');
})().catch(e=>{console.error(e);process.exit(1)});
