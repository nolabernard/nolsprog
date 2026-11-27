// Guide de la première série : s'affiche une seule fois, étape par étape, et peut être passé ou revu.
const assert=require('assert');
for(const [g,f] of [['SteroidCatalogue','exercise-catalogue'],['SteroidMoves','exercise-guide'],['SteroidCycle','v2-cycle'],['SteroidHistory','v2-history'],['SteroidReview','v2-review'],['SteroidReminders','reminders'],['SteroidUI','ui-v2'],['SteroidPlanner','session-planner'],['SteroidWorkout','workout-store']])globalThis[g]=require('../'+f+'.js');
require('../program-engine.js');
const V2=require('../app-v2.js');

function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m}}
let t=Date.parse('2026-11-23T10:00:00Z');const now=()=>t;let n=0;const uuid=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');

const legacy=[{day:'Lundi',title:'Push A',ex:[{name:'Développé couché barre',sets:2,reps:'6–8',rest:120},{name:'Dips',sets:1,reps:'8–12',rest:90}]},{day:'Mardi',title:'Repos',ex:[]},{day:'Mercredi',title:'Legs',ex:[{name:'Hack squat',sets:2,reps:'8–10',rest:120}]}];

(async()=>{
 const storage=memory();const ctx={storage,api:null,userId:null,legacyPlan:()=>legacy,answers:()=>null,firstName:()=>'',now,uuid,render:()=>{},notice:()=>{},confirm:async()=>true};
 const c=V2.create(ctx);await c.init();
 await c.handle('v2-start',{session:c.state().cycle.sessions[0].id});
 const step=()=>{const m=c.todayHTML().match(/class="v2-guide"[^>]*data-step="(\d)"/);return m?Number(m[1]):0};
 const e=()=>c.state().store.current().exercises[0];
 // 1 : première série d'un nouvel utilisateur → étape 1, sur la charge et les répétitions.
 assert.equal(step(),1);assert.match(c.todayHTML(),/Règle ta série/);assert.match(c.todayHTML(),/v2-steppers is-spot/);
 assert.match(c.todayHTML(),/<i class="is-on"><\/i>/);
 // 2 : « Suivant » → Valider mis en avant.
 await c.handle('v2-guide-next',{});assert.equal(step(),2);assert.match(c.todayHTML(),/v2-validate is-spot/);
 // 3 : « Compris » → plus de carte tant que rien n'est validé (on laisse la personne faire sa série).
 await c.handle('v2-guide-next',{});assert.equal(step(),0);
 c.input({ex:e().id,set:1,field:'weight',value:'60'});c.input({ex:e().id,set:1,field:'reps',value:'8'});
 await c.handle('v2-set',{ex:e().id,set:'1'});
 // 4 : série validée → étape 3 sur le ressenti.
 assert.equal(step(),3);assert.match(c.todayHTML(),/Dis comment c’était/);assert.match(c.todayHTML(),/v2-rate-full is-spot/);
 // 5 : choisir un ressenti termine le guide pour de bon.
 await c.handle('v2-rir',{ex:e().id,set:'1',rir:'2'});assert.equal(step(),0);
 assert.equal(JSON.parse(storage.getItem('nolsprog-v2-guide:guest')),true);
 // 6 : jamais reproposé après un rechargement (même stockage).
 const c2=V2.create({...ctx,render:()=>{}});await c2.init();assert.doesNotMatch(c2.todayHTML(),/class="v2-guide"/);
 // 7 : « Revoir le guide » (menu Options) le relance à l'étape 1.
 await c.handle('v2-guide-replay',{});assert.equal(step(),1);
 // 8 : « Passer le guide » le ferme.
 await c.handle('v2-guide-skip',{});assert.equal(step(),0);
 // 9 : valider la série pendant l'étape 1 ou 2 mène directement à l'étape 3.
 {const st=memory();const cc=V2.create({...ctx,storage:st});await cc.init();await cc.handle('v2-start',{session:cc.state().cycle.sessions[0].id});
  const ex=cc.state().store.current().exercises[0];assert.match(cc.todayHTML(),/data-step="1"/);
  cc.input({ex:ex.id,set:1,field:'weight',value:'50'});cc.input({ex:ex.id,set:1,field:'reps',value:'8'});await cc.handle('v2-set',{ex:ex.id,set:'1'});
  assert.match(cc.todayHTML(),/data-step="3"/);
  // Passer à l'étape 3 : « Compris » la ferme aussi.
  await cc.handle('v2-guide-next',{});assert.doesNotMatch(cc.todayHTML(),/class="v2-guide"/);}
 // 10 : un utilisateur qui a déjà validé une série (même sans avoir fini le guide) ne le revoit plus.
 {const st=memory();const a=V2.create({...ctx,storage:st});await a.init();await a.handle('v2-start',{session:a.state().cycle.sessions[0].id});
  const ex=a.state().store.current().exercises[0];a.input({ex:ex.id,set:1,field:'weight',value:'50'});a.input({ex:ex.id,set:1,field:'reps',value:'8'});await a.handle('v2-set',{ex:ex.id,set:'1'});
  await a.handle('v2-finish');await a.flushNow();
  t+=86400e3;const b=V2.create({...ctx,storage:st});await b.init();await b.handle('v2-start',{session:b.state().cycle.sessions[1].id});
  assert.doesNotMatch(b.todayHTML(),/class="v2-guide"/);}
 // 11 : en démo (historique fictif), le guide se lance quand même, une fois.
 {const st=memory();const a=V2.create({...ctx,storage:st});await a.init();await a.handle('v2-start',{session:a.state().cycle.sessions[0].id});
  const ex=a.state().store.current().exercises[0];a.input({ex:ex.id,set:1,field:'weight',value:'50'});a.input({ex:ex.id,set:1,field:'reps',value:'8'});await a.handle('v2-set',{ex:ex.id,set:'1'});await a.handle('v2-finish');await a.flushNow();
  t+=86400e3;const d=V2.create({...ctx,storage:st,guideAlways:true});await d.init();await d.handle('v2-start',{session:d.state().cycle.sessions[1].id});
  assert.match(d.todayHTML(),/data-step="1"/);await d.handle('v2-guide-skip',{});assert.doesNotMatch(d.todayHTML(),/class="v2-guide"/);}
 console.log('guide première série : ok');
})().catch(e=>{console.error(e);process.exit(1)});
