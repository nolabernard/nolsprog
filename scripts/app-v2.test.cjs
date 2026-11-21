// Contrôleur V2 : parcours complet invité et compte, sans navigateur.
const assert=require('assert');
for(const [g,f] of [['SteroidCatalogue','exercise-catalogue'],['SteroidCycle','v2-cycle'],['SteroidUI','ui-v2'],['SteroidPlanner','session-planner'],['SteroidWorkout','workout-store']])globalThis[g]=require('../'+f+'.js');
require('../program-engine.js');
const V2=require('../app-v2.js');

function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m}}
let t=Date.parse('2026-11-23T10:00:00Z');const now=()=>t;let n=0;const uuid=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');
const legacy=[{day:'Lundi',title:'Push A',ex:[{name:'Développé couché barre',sets:2,reps:'6–8',rest:120},{name:'Dips',sets:1,reps:'8–12',rest:90}]},{day:'Mardi',title:'Repos',ex:[]},{day:'Mercredi',title:'Legs',ex:[{name:'Hack squat',sets:2,reps:'8–10',rest:120}]}];

(async()=>{
 // ----- Invité -----
 const storage=memory();let renders=0;
 const ctx={storage,api:null,userId:null,legacyPlan:()=>legacy,answers:()=>null,firstName:()=>'',now,uuid,render:()=>renders++,notice:()=>{},confirm:async()=>true};
 let c=V2.create(ctx);await c.init();
 assert(c.ready());
 let h=c.todayHTML();assert.match(h,/Push A/);assert.match(h,/data-action="v2-start"/);
 const s1=c.state().cycle.sessions[0];
 await c.handle('v2-start',{session:s1.id});
 h=c.todayHTML();assert.match(h,/Développé couché barre/);assert.match(h,/Machine prise/);
 const w=c.state().store.current(),e1=w.exercises[0];
 // Sans répétitions saisies, la série n'est pas validée (aucune série vide comptée).
 await c.handle('v2-set',{ex:e1.id,set:'1'});assert.equal(c.state().store.current().exercises[0].sets[0].completed,false);
 // Saisie puis validation en 1 toucher ; le repos démarre seul.
 c.input({ex:e1.id,set:1,field:'weight',value:'60'});c.input({ex:e1.id,set:1,field:'reps',value:'8'});
 await c.handle('v2-set',{ex:e1.id,set:'1'});
 assert.equal(c.state().store.current().exercises[0].sets[0].completed,true);
 assert.equal(c.tick().rest,120);
 t+=30e3;assert.equal(c.tick().rest,90);
 await c.handle('v2-rest-plus');assert.equal(c.tick().rest,120);
 // Pause : le repos est figé, puis repart.
 await c.handle('v2-pause');t+=60e3;assert.equal(c.tick().rest,120);await c.handle('v2-resume');t+=10e3;assert.equal(c.tick().rest,110);
 // Toucher à nouveau annule la validation.
 await c.handle('v2-set',{ex:e1.id,set:'1'});assert.equal(c.state().store.current().exercises[0].sets[0].completed,false);
 await c.handle('v2-set',{ex:e1.id,set:'1'});
 // Toutes les séries faites → exercice suivant affiché automatiquement.
 c.input({ex:e1.id,set:2,field:'reps',value:'7'});await c.handle('v2-set',{ex:e1.id,set:'2'});assert.match(c.todayHTML(),/Dips/);
 // Quitter vers l'accueil sans perdre la séance.
 await c.handle('v2-exit');assert.match(c.todayHTML(),/Reprendre la séance/);await c.handle('v2-back');assert.match(c.todayHTML(),/Dips/);
 // Reprise après fermeture de l'app.
 c=V2.create(ctx);await c.init();assert.match(c.todayHTML(),/Dips/);
 // Pause oubliée : 25 min sans action → question ; « oui » ne compte pas ce temps.
 t+=25*60e3;assert.match(c.todayHTML(),/Tu étais en pause \?/);
 await c.handle('v2-idle-yes');assert(c.state().store.current().paused_seconds>=25*60-5);assert(!/Tu étais en pause/.test(c.todayHTML()));
 // Machine prise : remplacement par un exercice du même rôle.
 const dips=c.state().store.current().exercises.find(x=>x.exercise_key==='dips');
 await c.handle('v2-machine',{ex:dips.id});h=c.todayHTML();assert.match(h,/Machine prise \? Pas de souci/);
 const alt=h.match(/data-action="v2-sub" data-ex="[^"]+" data-key="([^"]+)"/);
 if(alt){await c.handle('v2-sub',{ex:dips.id,key:alt[1]});assert.equal(c.state().store.current().exercises.find(x=>x.id===dips.id).substituted_from_key,'dips')}
 else{await c.handle('v2-skip',{ex:dips.id})}
 // Fin de séance : résumé, puis la séance suivante est proposée.
 await c.handle('v2-finish');assert.match(c.todayHTML(),/Séance terminée/);
 await c.handle('v2-close-summary');t+=60e3;assert.match(c.todayHTML(),/Legs/);
 // Progrès : historique local par clé.
 assert.match(c.statsHTML(),/Développé couché barre/);
 // L'historique invité survit à la fermeture.
 c=V2.create(ctx);await c.init();assert.match(c.statsHTML(),/Développé couché barre/);assert.match(c.todayHTML(),/Legs/);
 // Programme : changer un exercice via le catalogue.
 const ce=c.state().cycle.sessions[1].exercises[0];
 await c.handle('v2-edit-ex',{ce:ce.id});c.change({kind:'search',value:'presse'});
 const pick=c.programmeHTML().match(/data-action="v2-pick" data-key="([^"]+)"/)[1];
 await c.handle('v2-pick',{key:pick});assert.equal(c.state().cycle.sessions[1].exercises[0].exercise_key,pick);
 await c.handle('v2-add-ex',{session:c.state().cycle.sessions[1].id});await c.handle('v2-pick',{key:'leg-extension'});
 assert.equal(c.state().cycle.sessions[1].exercises.length,2);assert.equal(c.state().cycle.sessions[1].exercises[1].role,'finition');
 c.change({kind:'sets',ce:ce.id,value:'4'});assert.equal(c.state().cycle.sessions[1].exercises[0].sets,4);
 await c.handle('v2-remove-ex',{ce:ce.id});assert.equal(c.state().cycle.sessions[1].exercises.length,1);
 // Exercice perso : créé puis choisi.
 await c.handle('v2-add-ex',{session:c.state().cycle.sessions[1].id});await c.handle('v2-create');
 await c.createExercise({name:'Mon mollet maison',muscle:'Jambes',pattern:'iso'});
 const mine=c.state().cycle.sessions[1].exercises.at(-1);assert.match(mine.exercise_key,/^u-[0-9a-f-]{36}$/);
 assert.match(c.programmeHTML(),/Mon mollet maison/);

 // ----- Compte sans cycle V2 : construit puis envoyé dans l'ordre -----
 const sent=[],api={online:true,async select(p){return []},async upsert(table,rows){if(!api.online)throw Error('Hors ligne');sent.push(table+':'+rows.length)}};
 const st2=memory();
 const acc=V2.create({...ctx,storage:st2,api,userId:'11111111-1111-4111-8111-111111111111',answers:()=>null});await acc.init();await acc.flushNow();
 assert(acc.ready());
 assert.deepEqual(sent.map(x=>x.split(':')[0]).slice(0,3),['cycles','cycle_sessions','cycle_exercises']);
 // Séance hors ligne, puis retour du réseau : tout part, rien en double.
 api.online=false;await acc.handle('v2-start',{session:acc.state().cycle.sessions[0].id});
 const x=acc.state().store.current().exercises[0];acc.input({ex:x.id,set:1,field:'reps',value:'10'});await acc.handle('v2-set',{ex:x.id,set:'1'});await acc.handle('v2-finish');
 assert(acc.pending()>0);assert.match(acc.todayHTML(),/envoi en attente/);
 api.online=true;await acc.flushNow();assert.equal(acc.pending(),0);
 assert(sent.some(s=>s.startsWith('workouts:'))&&sent.some(s=>s.startsWith('workout_set_logs:')));
 // Échec du chargement en ligne : le cache de l'appareil prend le relais.
 const broken={async select(){throw Error('Réseau')},async upsert(){throw Error('Réseau')}};
 const again=V2.create({...ctx,storage:st2,api:broken,userId:'11111111-1111-4111-8111-111111111111'});await again.init();
 assert(again.ready());assert.equal(again.state().cycle.id,acc.state().cycle.id);
 console.log('app-v2 : ok');
})().catch(e=>{console.error(e);process.exit(1)});
