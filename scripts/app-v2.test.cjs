// Contrôleur V2 : parcours complet invité et compte, sans navigateur.
const assert=require('assert');
for(const [g,f] of [['SteroidCatalogue','exercise-catalogue'],['SteroidMoves','exercise-guide'],['SteroidCycle','v2-cycle'],['SteroidHistory','v2-history'],['SteroidReview','v2-review'],['SteroidReminders','reminders'],['SteroidUI','ui-v2'],['SteroidPlanner','session-planner'],['SteroidWorkout','workout-store']])globalThis[g]=require('../'+f+'.js');
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
 // Lot 5 : historique des séances, conseil en séance, record à la séance suivante.
 {
  const st=memory(),one=[{day:'Lundi',title:'Push A',ex:[{name:'Développé couché barre',sets:2,reps:'6–8',rest:120}]}];
  const h5=V2.create({...ctx,storage:st,legacyPlan:()=>one});await h5.init();
  const run=async(weight,reps)=>{
   await h5.handle('v2-start',{session:h5.state().cycle.sessions[0].id});
   const e=h5.state().store.current().exercises[0];
   for(const n of [1,2]){h5.input({ex:e.id,set:n,field:'weight',value:String(weight)});h5.input({ex:e.id,set:n,field:'reps',value:String(reps)});await h5.handle('v2-set',{ex:e.id,set:String(n)})}
   await h5.handle('v2-finish');
  };
  // Première séance : conseil de calibrage ; après une série, le ressenti se note en un appui.
  await h5.handle('v2-start',{session:h5.state().cycle.sessions[0].id});
  assert.match(h5.todayHTML(),/Première fois sur cet exercice : trouve ta charge/);
  { const e=h5.state().store.current().exercises[0];
    for(const n of [1,2]){h5.input({ex:e.id,set:n,field:'weight',value:'60'});h5.input({ex:e.id,set:n,field:'reps',value:'8'})}
    await h5.handle('v2-set',{ex:e.id,set:'1'});
    assert.match(h5.todayHTML(),/Série 1 · Développé couché barre : c’était…/);
    await h5.handle('v2-rir',{ex:e.id,set:'1',rir:'2'});
    assert.equal(h5.state().store.current().exercises[0].sets[0].rir,2);assert.doesNotMatch(h5.todayHTML(),/c’était…/);
    await h5.handle('v2-set',{ex:e.id,set:'2'});await h5.handle('v2-rir',{ex:e.id,set:'2',rir:'2'});
    await h5.handle('v2-finish'); }
  assert(h5.state().setLogs.some(r=>r.rir===2),'ressenti conservé dans l’historique');
  assert.doesNotMatch(h5.todayHTML(),/Nouveau record/,'pas de record à la première séance');
  await h5.handle('v2-close-summary');t+=3*24*3600e3;
  await h5.handle('v2-start',{session:h5.state().cycle.sessions[0].id});
  assert.match(h5.todayHTML(),/class="v2-advice"[^]*tente 62,5 kg/,'conseil fondé sur la séance précédente');
  assert.match(h5.todayHTML(),/value="60"/,'les cases restent préremplies avec la dernière performance');
  await h5.handle('v2-howto');assert.match(h5.todayHTML(),/Poussée horizontale · Pectoraux/);assert.match(h5.todayHTML(),/Omoplates serrées/);await h5.handle('v2-close-sheet');assert.doesNotMatch(h5.todayHTML(),/Omoplates serrées/);
  await h5.handle('v2-exit');
  const e=h5.state().store.current().exercises[0];
  for(const n of [1,2]){h5.input({ex:e.id,set:n,field:'weight',value:'62.5'});await h5.handle('v2-set',{ex:e.id,set:String(n)})}
  await h5.handle('v2-back');await h5.handle('v2-finish');
  assert.match(h5.todayHTML(),/Nouveau record : Développé couché barre : 62,5 kg × 8 \(\+2,5 kg\)/);
  await h5.handle('v2-close-summary');
  assert.match(h5.todayHTML(),/Record récent : Développé couché barre, 62,5 kg × 8/);
  const lastId=h5.todayHTML().match(/data-action="v2-last-open" data-id="([^"]+)"/)[1];assert.match(h5.todayHTML(),/Dernière séance[^]*Push A/);
  await h5.handle('v2-last-open',{id:lastId});assert.match(h5.statsHTML(),/data-action="v2-history-close"/);await h5.handle('v2-progress-tab',{tab:'exercises'});
  let st5=h5.statsHTML();assert.match(st5,/Séance par séance/);assert.match(st5,/62,5 × 8 · 62,5 × 8/);assert.match(st5,/Meilleure série : 62,5 kg × 8/);assert.match(st5,/Prochaine fois/);
  await h5.handle('v2-progress-tab',{tab:'sessions'});st5=h5.statsHTML();
  const ids=[...st5.matchAll(/data-action="v2-history-open" data-id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,2);
  await h5.handle('v2-history-open',{id:ids[0]});st5=h5.statsHTML();assert.match(st5,/Push A/);assert.match(st5,/Record : Développé couché barre/);
  await h5.handle('v2-history-close');assert.match(h5.statsHTML(),/v2-history-open/);
  await h5.handle('v2-progress-tab',{tab:'exercises'});assert.match(h5.statsHTML(),/Séance par séance/);
 }
 // Programme : changer un exercice via le catalogue.
 const ce=c.state().cycle.sessions[1].exercises[0];
 await c.handle('v2-edit-ex',{ce:ce.id});c.change({kind:'search',value:'presse'});
 const pick=c.programmeHTML().match(/data-action="v2-pick" data-key="([^"]+)"/)[1];
 // Brouillon : rien n'est appliqué avant « Enregistrer » ; « Annuler » rend le programme d'origine.
 await c.handle('v2-pick',{key:pick});assert.notEqual(c.state().cycle.sessions[1].exercises[0].exercise_key,pick,'pas appliqué avant enregistrement');
 assert.match(c.programmeHTML(),/Non enregistré[^]*data-action="v2-edit-save"/);assert.equal(c.hasDraft(),true);
 await c.handle('v2-edit-cancel');assert.equal(c.hasDraft(),false);assert.doesNotMatch(c.programmeHTML(),/v2-savebar/);
 await c.handle('v2-edit-ex',{ce:ce.id});c.change({kind:'search',value:'presse'});
 await c.handle('v2-pick',{key:pick});await c.handle('v2-edit-save');assert.equal(c.hasDraft(),false);assert.equal(c.state().cycle.sessions[1].exercises[0].exercise_key,pick);
 await c.handle('v2-add-ex',{session:c.state().cycle.sessions[1].id});await c.handle('v2-pick',{key:'leg-extension'});await c.handle('v2-edit-save');
 assert.equal(c.state().cycle.sessions[1].exercises.length,2);assert.equal(c.state().cycle.sessions[1].exercises[1].role,'finition');
 c.change({kind:'sets',ce:ce.id,value:'4'});await c.handle('v2-edit-save');assert.equal(c.state().cycle.sessions[1].exercises[0].sets,4);
 await c.handle('v2-remove-ex',{ce:ce.id});await c.handle('v2-edit-save');assert.equal(c.state().cycle.sessions[1].exercises.length,1);
 // Exercice perso : créé puis choisi.
 await c.handle('v2-add-ex',{session:c.state().cycle.sessions[1].id});await c.handle('v2-create');
 await c.createExercise({name:'Mon mollet maison',muscle:'Jambes',pattern:'iso'});await c.handle('v2-edit-save');
 const mine=c.state().cycle.sessions[1].exercises.at(-1);assert.match(mine.exercise_key,/^u-[0-9a-f-]{36}$/);
 assert.match(c.programmeHTML(),/Mon mollet maison/);
 // Ordre des exercices : descendre le premier exercice, brouillon puis enregistrement.
 {const s1=c.state().cycle.sessions[1],first=s1.exercises[0].id;await c.handle('v2-move-ex',{ce:first,dir:'1'});
  assert.equal(c.state().cycle.sessions[1].exercises[0].id,first,'rien ne change avant Enregistrer');
  await c.handle('v2-edit-save');assert.equal(c.state().cycle.sessions[1].exercises[1].id,first);assert.equal(c.state().cycle.sessions[1].exercises[1].position,1);
  await c.handle('v2-prog-toggle',{session:s1.id});assert.doesNotMatch(c.programmeHTML(),new RegExp('data-ce="'+first+'"'));
  await c.handle('v2-prog-toggle',{session:s1.id});assert.match(c.programmeHTML(),new RegExp('data-ce="'+first+'"'))}

 // ----- Lot 6 : bilan de fin de cycle, cycle suivant proposé puis validé -----
 {
  const sentRows=[],api6={async select(){return []},async upsert(table,rows){sentRows.push(...rows.map(r=>({table,...r})))},async remove(){}};
  const U6='44444444-4444-4444-8444-444444444444',st6=memory();
  const b6=V2.create({...ctx,storage:st6,api:api6,userId:U6});await b6.init();await b6.flushNow();
  const firstId=b6.state().cycle.id;
  assert.doesNotMatch(b6.todayHTML(),/Ton cycle est terminé/,'pas de bilan en début de cycle');
  const t0=t;t+=9*7*24*3600e3;
  assert.match(b6.todayHTML(),/Ton cycle est terminé/);
  await b6.handle('v2-review');let h6=b6.todayHTML();assert.match(h6,/Bilan du cycle/);assert.match(h6,/0\/12/);assert.match(h6,/Ma recommandation/);
  await b6.handle('v2-review-next');h6=b6.todayHTML();assert.match(h6,/data-v2-next/);assert.match(h6,/name="daysCount"/);
  assert(b6.proposeNext({daysCount:'3',duration:'60',method:'auto',goal:'muscle',level:'intermediate',equipment:'gym',avoid:'',weeks:'7'}));
  h6=b6.todayHTML();assert.match(h6,/pas encore actif/);assert.match(h6,/7 semaines/);
  assert.equal(b6.state().cycle.id,firstId,'aucun cycle activé sans validation');
  sentRows.length=0;await b6.flushNow();assert(!sentRows.some(r=>r.table==='cycles'),'la proposition reste sur l’appareil');
  // Fermeture de l'app : la proposition est retrouvée, le cycle en cours inchangé.
  const b7=V2.create({...ctx,storage:st6,api:api6,userId:U6});await b7.init();
  assert.equal(b7.state().cycle.id,firstId);assert(b7.state().proposal);
  await b7.handle('v2-review');await b7.handle('v2-review-next');b7.proposeNext({daysCount:'3',duration:'60',method:'auto',goal:'muscle',level:'intermediate',equipment:'gym',weeks:'6'});
  const nextId=b7.state().proposal.id;
  await b7.handle('v2-review-close');assert.match(b7.todayHTML(),/Ton prochain cycle est prêt/);await b7.handle('v2-proposal-open');assert.match(b7.todayHTML(),/pas encore actif/);
  // Programme changé ailleurs depuis le bilan : la proposition n'écrase rien.
  const saved=b7.state().proposal;b7.state().proposal={...saved,from_cycle:'autre'};await b7.handle('v2-proposal-accept');
  assert.equal(b7.state().cycle.id,firstId);assert.equal(b7.state().proposal,null);
  await b7.handle('v2-review');await b7.handle('v2-review-next');b7.proposeNext({daysCount:'3',duration:'60',method:'auto',goal:'muscle',level:'intermediate',equipment:'gym',weeks:'6'});
  const nextId2=b7.state().proposal.id;
  await b7.handle('v2-proposal-accept');await b7.flushNow();
  assert.equal(b7.state().cycle.id,nextId2);assert.equal(b7.state().cycle.status,'active');assert.equal(b7.state().proposal,null);
  const cyc=sentRows.filter(r=>r.table==='cycles');
  assert.deepEqual(cyc.map(r=>[r.id,r.status]),[[firstId,'archived'],[nextId2,'active']],'archivé avant le nouveau actif');
  assert(sentRows.some(r=>r.table==='cycle_sessions'&&r.cycle_id===nextId2));
  assert.doesNotMatch(b7.todayHTML(),/Ton cycle est terminé/);
  // Le serveur renvoie encore l'ancien cycle actif avant l'envoi : on garde le nouveau.
  const lag={...api6,async select(p){if(p.startsWith('cycles'))return [{id:firstId,status:'active',weeks:6,sessions_per_week:2,started_at:new Date(t0).toISOString()}];return []},async upsert(){throw Error('Hors ligne')}};
  const st8b=memory();
  for(const [k,v] of st6.m)st8b.setItem(k,v);
  st8b.setItem('nolsprog-v2-outbox:'+U6,JSON.stringify([{table:'cycles',row:{id:nextId2,status:'active',user_id:U6}}]));
  const b8=V2.create({...ctx,storage:st8b,api:lag,userId:U6});
  await b8.init();await b8.whenFresh();assert.equal(b8.state().cycle.id,nextId2);
 }
 // Cardio : modifier puis supprimer une activité enregistrée (compte), avec envoi au serveur.
 { const ops=[],api8={async select(){return []},async upsert(t,rows){for(const r of rows)ops.push(['up',t,r.id,r.minutes])},async remove(t,id){ops.push(['del',t,id])},async fn(){return {}}};
   const c8=V2.create({...ctx,storage:memory(),api:api8,userId:'66666666-6666-4666-8666-666666666666'});await c8.init();
   await c8.saveCardio({type:'velo',minutes:'20'});await c8.flushNow();const id=c8.state().cardioLogs[0].id;
   await c8.handle('v2-progress-tab',{tab:'sessions'});assert.match(c8.statsHTML(),/data-action="v2-cardio-edit" data-id="/);
   await c8.handle('v2-cardio-edit',{id});assert.match(c8.statsHTML(),/Modifier le cardio/);
   await c8.saveCardio({id,type:'course',minutes:'35'});await c8.flushNow();
   assert.equal(c8.state().cardioLogs.length,1);assert.equal(c8.state().cardioLogs[0].type,'course');assert.equal(c8.state().cardioLogs[0].id,id,'même ligne modifiée');
   assert.deepEqual(ops.filter(o=>o[1]==='cardio_logs').map(o=>o[0]+o[3]),['up20','up35']);
   await c8.handle('v2-cardio-delete',{id});await c8.flushNow();assert.equal(c8.state().cardioLogs.length,0);assert(ops.some(o=>o[0]==='del'&&o[2]===id));
   assert.doesNotMatch(c8.statsHTML(),/v2-cardio-edit/); }
 // Semaine allégée : dernière semaine du cycle, séries réduites, séance exclue des conseils.
 { const st=memory(),one=[{day:'Lundi',title:'Push A',ex:[{name:'Développé couché barre',sets:3,reps:'6–8',rest:120}]}];
   const c=V2.create({...ctx,storage:st,legacyPlan:()=>one});await c.init();
   const cy=c.state().cycle,total=(cy.weeks||6)*(cy.sessions_per_week||1);
   for(let i=0;i<total-(cy.sessions_per_week||1);i++)c.state().workouts.push({id:'old'+i,cycle_id:cy.id,status:'completed',ended_at:new Date(t-86400e3*(i+1)).toISOString()});
   assert.match(c.todayHTML(),/semaine allégée/);
   await c.handle('v2-start',{session:cy.sessions[0].id});
   const w=c.state().store.current();assert.equal(w.exercises[0].sets.length,2,'3 séries → 2');assert.match(c.todayHTML(),/Semaine allégée/);assert.match(c.todayHTML(),/Échauffement/);
   assert(JSON.parse(st.getItem([...st.m.keys()].find(k=>k.startsWith('nolsprog-v2-deload:')))).includes(w.id)); }
 // Lot 7 : choix d'un jour enregistré (sans exception), même rappels désactivés.
 { const st7=memory(),c7=V2.create({...ctx,storage:st7,api:{async select(){return []},async upsert(){},async remove(){},async fn(){return {}}},userId:'55555555-5555-4555-8555-555555555555'});
   await c7.handle('v2-rem-day',{day:'6'});assert.deepEqual(JSON.parse(st7.getItem('nolsprog-v2-reminders:55555555-5555-4555-8555-555555555555')).days,[0,1,2,3,4,5]);
   await c7.handle('v2-rem-day',{day:'6'});assert.deepEqual(JSON.parse(st7.getItem('nolsprog-v2-reminders:55555555-5555-4555-8555-555555555555')).days,[0,1,2,3,4,5,6]);
   await c7.remindersOff(); }
 // Lot 7 : en invité, la carte Rappels explique qu'il faut un compte.
 assert.match(V2.create({...ctx,storage:memory()}).programmeHTML(),/Connecte-toi à ton compte pour recevoir des rappels/);
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
 // Fausse base aux contraintes réelles : colonnes identiques par envoi, (séance, place) unique, vérifiée ligne par ligne.
 const db=new Map(),log=[];
 const strict={async select(){return []},async remove(table,id){log.push('del');db.delete(id)},async upsert(table,rows){
  const keys=JSON.stringify(Object.keys(rows[0]).sort());
  if(rows.some(r=>JSON.stringify(Object.keys(r).sort())!==keys))throw Error('All object keys must match');
  if(table!=='cycle_exercises')return;
  for(const r of rows){db.set(r.id,{...r});const clash=[...db.values()].filter(x=>x.cycle_session_id===r.cycle_session_id&&x.position===r.position);if(clash.length>1)throw Error('duplicate key (cycle_session_id, position)')}
 }};
 const st3=memory(),db3=V2.create({...ctx,storage:st3,api:strict,userId:'22222222-2222-4222-8222-222222222222'});await db3.init();assert(await db3.flushNow());
 const sess=db3.state().cycle.sessions[0];
 // Un exercice de base ajouté s'insère avant les finitions : les places se décalent.
 await db3.handle('v2-add-ex',{session:sess.id});await db3.handle('v2-pick',{key:'hack-squat'});await db3.handle('v2-edit-save');
 assert(await db3.flushNow(),'envoi accepté malgré le décalage des places');assert.equal(db3.pending(),0);
 const rows=[...db.values()].filter(x=>x.cycle_session_id===sess.id).sort((a,b)=>a.position-b.position).map(x=>x.exercise_key);
 assert.deepEqual(rows,db3.state().cycle.sessions[0].exercises.map(x=>x.exercise_key));
 // Retrait hors ligne : rejoué au retour du réseau, avant les décalages.
 const off={...strict,async remove(){throw Error('Hors ligne')}};
 const db4=V2.create({...ctx,storage:st3,api:off,userId:'22222222-2222-4222-8222-222222222222'});await db4.init();
 await db4.handle('v2-remove-ex',{ce:db4.state().cycle.sessions[0].exercises[0].id});await db4.handle('v2-edit-save');
 const db5=V2.create({...ctx,storage:st3,api:strict,userId:'22222222-2222-4222-8222-222222222222'});await db5.init();
 assert(await db5.flushNow());assert.equal(db5.pending(),0);assert(log.includes('del'));
 assert.deepEqual([...db.values()].filter(x=>x.cycle_session_id===sess.id).sort((a,b)=>a.position-b.position).map(x=>x.exercise_key),db5.state().cycle.sessions[0].exercises.map(x=>x.exercise_key));
 // Échec du chargement en ligne : le cache de l'appareil prend le relais.
 const broken={async select(){throw Error('Réseau')},async upsert(){throw Error('Réseau')}};
 const again=V2.create({...ctx,storage:st2,api:broken,userId:'11111111-1111-4111-8111-111111111111'});await again.init();
 assert(again.ready());assert.equal(again.state().cycle.id,acc.state().cycle.id);

 // ===== Revue finale =====
 const U='33333333-3333-4333-8333-333333333333',reject=(code,status=409)=>{const e=Error('duplicate key value violates unique constraint');e.status=status;e.code=code;return e};
 // C1a : compte, chargement en échec et aucun cache → on ne fabrique pas un second cycle actif.
 const fail=V2.create({...ctx,storage:memory(),api:{async select(){throw Error('Réseau')},async upsert(){throw Error('Réseau')}},userId:U});await fail.init();
 assert.equal(fail.ready(),false);assert.equal(fail.state().cycle,null);assert.equal(fail.pending(),0);
 assert.match(fail.todayHTML(),/data-action="v2-build"[^>]*>Réessayer/);
 // C1b : un autre appareil a déjà un cycle actif → refus 23505, file purgée, cycle du serveur repris, séances non bloquées.
 const server={cycles:[]},sent2=[];
 const race={async select(p){if(p.startsWith('cycles'))return server.cycles;if(p.startsWith('cycle_sessions'))return server.cycles.length?[{id:'srv-s',cycle_id:'srv',position:0,code:'A',title:'Serveur A',focus:[]}]:[];if(p.startsWith('cycle_exercises'))return server.cycles.length?[{id:'srv-e',cycle_session_id:'srv-s',position:0,exercise_key:'hack-squat',role:'base',sets:2,reps_min:8,reps_max:10,rest_seconds:120}]:[];return []},
  async upsert(t,rows){if(t==='cycles'&&rows.some(r=>r.status==='active'&&r.id!=='srv')){server.cycles=[{id:'srv',status:'active',method:'ppl',weeks:6,sessions_per_week:3}];throw reject('23505')}sent2.push(t)},async remove(){}};
 const st6=memory(),r1=V2.create({...ctx,storage:st6,api:race,userId:U});await r1.init();
 await r1.flushNow();await r1.flushNow();
 assert.equal(r1.state().cycle.id,'srv');assert.equal(r1.pending(),0);assert.match(r1.todayHTML(),/Serveur A/);
 // C2 : retirer un exercice prévu pendant une séance → la séance ne le référence plus.
 const st7=memory(),c7=V2.create({...ctx,storage:st7,api:{async select(){return []},async upsert(){},async remove(){}},userId:U});await c7.init();
 const s7=c7.state().cycle.sessions[0];await c7.handle('v2-start',{session:s7.id});await c7.handle('v2-exit');
 const gone=s7.exercises[0].id;await c7.handle('v2-remove-ex',{ce:gone});await c7.handle('v2-edit-save');
 assert(!c7.state().store.current().exercises.some(e=>e.cycle_exercise_id===gone));
 // I4 : séance terminée hors ligne, réouverture en ligne avant l'envoi → elle reste visible et la suite avance.
 const st8=memory(),down={async select(){return []},async upsert(){throw Error('Failed to fetch')},async remove(){throw Error('Failed to fetch')}};
 const c8=V2.create({...ctx,storage:st8,api:down,userId:U});await c8.init();
 const first=c8.state().cycle.sessions[0];await c8.handle('v2-start',{session:first.id});
 const fx=c8.state().store.current().exercises[0];c8.input({ex:fx.id,set:1,field:'reps',value:'9'});await c8.handle('v2-set',{ex:fx.id,set:'1'});await c8.handle('v2-finish');await c8.handle('v2-close-summary');
 const cycleRows=JSON.parse(st8.getItem('nolsprog-v2-cycle:'+U));
 const back={async select(p){if(p.startsWith('cycles'))return [{...cycleRows,sessions:undefined,user_exercises:undefined}];if(p.startsWith('cycle_sessions'))return cycleRows.sessions.map(({exercises,muscles,...x})=>x);if(p.startsWith('cycle_exercises'))return cycleRows.sessions.flatMap(x=>x.exercises);return []},async upsert(){throw Error('Failed to fetch')}};
 const c9=V2.create({...ctx,storage:st8,api:back,userId:U});await c9.init();await c9.whenFresh();
 assert(c9.state().workouts.some(w=>w.cycle_session_id===first.id),'séance non envoyée conservée');
 assert.match(c9.statsHTML(),/série validée/);assert(!c9.todayHTML().includes('data-action="v2-start" data-session="'+first.id+'"'),'la suite avance');assert.match(c9.todayHTML(),/Séance faite aujourd’hui[^]*Demain : <b>/,'une séance par jour');
 // Séance passée : raison notée, envoyée avec la séance, la suite avance ; pas d'autre séance aujourd'hui ; annulation possible.
 {const sent=[],api10={async select(){return []},async upsert(t,rows){sent.push(...rows.map(r=>({t,...r})))},async remove(){}};
  const c10=V2.create({...ctx,storage:memory(),api:api10,userId:U});await c10.init();
  const s0=c10.state().cycle.sessions[0];
  assert.match(c10.todayHTML(),/data-action="v2-skip" data-session="/);
  await c10.handle('v2-skip',{session:s0.id});assert.match(c10.todayHTML(),/Pas de séance aujourd’hui \?[^]*data-reason="malade"/);
  await c10.handle('v2-skip-confirm',{session:s0.id,reason:'malade'});await c10.flushNow();
  const row=sent.find(r=>r.t==='workouts'&&r.status==='skipped');assert(row,'séance passée envoyée');assert.equal(row.skip_reason,'malade');assert.equal(row.cycle_session_id,s0.id);
  assert.match(c10.todayHTML(),/Séance passée aujourd’hui[^]*Repose-toi/);
  await c10.handle('v2-start',{session:c10.state().cycle.sessions[1].id});assert.equal(c10.state().store.current(),null,'pas d’autre séance aujourd’hui');
  await c10.handle('v2-skip-undo',{id:row.id});await c10.flushNow();
  assert(sent.some(r=>r.t==='workouts'&&r.id===row.id&&r.status==='abandoned'&&r.revision===2),'annulation envoyée');
  assert.match(c10.todayHTML(),new RegExp('data-action="v2-start" data-session="'+s0.id+'"'),'la séance revient');}
 // I5 : réseau qui ne répond jamais → le cache s'affiche tout de suite.
 const hang=V2.create({...ctx,storage:st8,api:{select:()=>new Promise(()=>{}),upsert:()=>new Promise(()=>{})},userId:U});
 await Promise.race([hang.init(),new Promise((_,no)=>setTimeout(()=>no(Error('init bloqué')),500))]);assert(hang.ready());
 // I8 : construction depuis le générateur V2 quand le questionnaire existe ; plan V1 borné aux contraintes sinon.
 const gen=V2.create({...ctx,storage:memory(),api:null,userId:null,answers:()=>({goal:'muscle',level:'intermediate',days:3,equipment:'gym',duration:60})});await gen.init();
 assert.notEqual(gen.state().cycle.engine_version,'v1-legacy');assert.equal(gen.state().cycle.sessions.length,3);
 const wild=globalThis.SteroidCycle.fromLegacyPlan([{title:'X',ex:[{name:'A'.repeat(140),sets:40,reps:'0',rest:9999},{name:'Dips',sets:0,reps:'120 s',rest:60}]}],{uuid});
 for(const e of wild.sessions[0].exercises){assert(e.sets>=1&&e.sets<=20);assert(e.reps_min>=1&&e.reps_max<=100&&e.reps_min<=e.reps_max);assert(e.rest_seconds<=3600)}
 assert(wild.user_exercises[0].name.length<=100);
 // I7 : questionnaire refait → nouveau cycle actif, l'ancien archivé dans le même envoi (ancien d'abord).
 const order=[],st10=memory(),c10=V2.create({...ctx,storage:st10,api:{async select(){return []},async upsert(t,rows){if(t==='cycles')order.push(...rows.map(r=>r.status))},async remove(){}},userId:U,answers:()=>({goal:'muscle',level:'intermediate',days:4,equipment:'gym',duration:60})});
 await c10.init();await c10.flushNow();order.length=0;const old=c10.state().cycle.id;
 await c10.rebuild();await c10.flushNow();
 assert.notEqual(c10.state().cycle.id,old);assert.deepEqual(order,['archived','active']);
 // I9 : historique paginé (PostgREST limite à 1000 lignes par réponse) et exercices du cycle courant seulement.
 const many=Array.from({length:2500},(_,i)=>({exercise_key:'hack-squat',weight:50,reps:5,completed:true,created_at:'2026-11-01T00:00:00Z',workout_exercises:{workout_id:'w'}}));
 const paths=[];const loaded=await globalThis.SteroidCycle.loadCycle({async select(p){paths.push(p);if(p.startsWith('workout_set_logs')){const o=Number((p.match(/offset=(\d+)/)||[])[1]||0),l=Math.min(1000,Number((p.match(/limit=(\d+)/)||[])[1]||1000));return many.slice(o,o+l)}if(p.startsWith('cycles'))return [{id:'cy'}];if(p.startsWith('cycle_sessions'))return [{id:'s1',cycle_id:'cy',position:0}];return []}},U);
 assert.equal(loaded.setLogs.length,2500);assert(paths.some(p=>p.startsWith('cycle_exercises')&&p.includes('cycle_session_id=in.(s1)')));
 // C3 : l'en-tête et la déconnexion tiennent compte des envois V2 en attente ; la déconnexion efface les clés V2.
 const appSrc=require('fs').readFileSync(require('path').join(__dirname,'../app.js'),'utf8');
 assert(/function anyPending\(uid\)\{return hasPendingChanges\(uid\)\|\|Boolean\(v2Pending\(\)\)\}/.test(appSrc)&&/V2\?\.pending\(\)/.test(appSrc));
 assert(!/hasPendingChanges\(A\.session\.user\.id\)/.test(appSrc),'statut de synchro : anyPending partout');
 assert(/a==='logout'[\s\S]{0,200}anyPending\(A\.session\?\.user\?\.id\)/.test(appSrc));
 assert(/clearPrivateCache[^\n]*nolsprog-v2-/.test(appSrc)&&/clearPrivateCache[^\n]*steroid-v2-/.test(appSrc));
 assert(/if\(V2\?\.ready\(\)&&\(!A\.profile\|\|await globalThis\.SteroidDialog\.confirm/.test(appSrc),'pas de question à la première configuration');

 // ===== Lot 4 : planning et cardio =====
 const U4='44444444-4444-4444-8444-444444444444';
 // Mode « quand je veux » : pas de jours conseillés ; mode jours : jours repris du questionnaire.
 const free=V2.create({...ctx,storage:memory(),api:null,userId:null,answers:()=>({goal:'muscle',level:'intermediate',daysCount:'3',days:[0,1,2,3,4,5,6],planMode:'free',equipment:'gym',duration:'60'})});await free.init();
 assert.equal(free.state().cycle.preferred_days,null);assert.match(free.todayHTML(),/3 séances par semaine, quand tu veux/);
 const fixed=V2.create({...ctx,storage:memory(),api:null,userId:null,answers:()=>({goal:'muscle',level:'intermediate',daysCount:'3',days:[0,2,4],planMode:'days',equipment:'gym',duration:'60'})});await fixed.init();
 assert.deepEqual(fixed.state().cycle.preferred_days,[0,2,4]);assert.match(fixed.todayHTML(),/Tes jours : lundi, mercredi, vendredi/);
 // Cardio noté seul (invité) : bornes vérifiées, compté dans la semaine et dans Progrès.
 await fixed.handle('v2-cardio-open');assert.match(fixed.todayHTML(),/Noter du cardio<\/h2>/);
 assert.equal(await fixed.saveCardio({type:'velo',minutes:'0'}),false);assert.equal(await fixed.saveCardio({type:'velo',minutes:'900'}),false);assert.equal(await fixed.saveCardio({type:'yoga',minutes:'20'}),false);
 assert.equal(await fixed.saveCardio({type:'velo',minutes:'25'}),true);assert(!/Noter du cardio<\/h2>/.test(fixed.todayHTML()),'panneau fermé');
 assert.match(fixed.statsHTML(),/25 min/);
 // Cardio prévu : ajouté puis retiré dans Programme ; objectif affiché sur l'accueil.
 assert.equal(await fixed.addCardioPlan({type:'marche',minutes:'30',per_week:'2'}),true);assert.doesNotMatch(fixed.todayHTML(),/\/ 60 min/,'brouillon invisible sur l’accueil');await fixed.handle('v2-edit-save');
 assert.match(fixed.todayHTML(),/Cardio : 25 \/ 60 min cette semaine/);assert.match(fixed.programmeHTML(),/Marche · 30 min · 2 fois par semaine/);
 await fixed.handle('v2-cardio-plan-remove',{id:fixed.state().cycle.cardio[0].id});await fixed.handle('v2-edit-save');assert.equal(fixed.state().cycle.cardio.length,0);
 // Compte, hors ligne : cardio lié à une séance non envoyée → envoyé APRÈS la séance, jamais refusé.
 const seen=[],online={v:false};
 const fk={async select(){return []},async remove(){},async upsert(t,rows){if(!online.v)throw Error('Failed to fetch');
  if(t==='workouts')rows.forEach(r=>seen.push('w:'+r.id));
  if(t==='cardio_logs')for(const r of rows){if(r.workout_id&&!seen.includes('w:'+r.workout_id)){const e=Error('violates foreign key');e.status=409;throw e}seen.push('cardio')}
  if(t==='cycle_cardio')seen.push('plan')}};
 const st11=memory(),c11=V2.create({...ctx,storage:st11,api:fk,userId:U4,answers:()=>({goal:'muscle',level:'intermediate',daysCount:'3',days:[0,2,4],planMode:'days',equipment:'gym',duration:'60'})});
 online.v=true;await c11.init();await c11.flushNow();online.v=false;
 await c11.handle('v2-start',{session:c11.state().cycle.sessions[0].id});const ex11=c11.state().store.current().exercises[0];
 c11.input({ex:ex11.id,set:1,field:'reps',value:'8'});await c11.handle('v2-set',{ex:ex11.id,set:'1'});await c11.handle('v2-finish');
 const wid=c11.state().summary.id;await c11.handle('v2-cardio-open',{workout:wid});assert.equal(await c11.saveCardio({type:'course',minutes:'15',workout:wid}),true);
 await c11.addCardioPlan({type:'velo',minutes:'30',per_week:'1'});await c11.handle('v2-edit-save');
 assert(c11.pending()>0);online.v=true;assert(await c11.flushNow());assert.equal(c11.pending(),0);
 assert(seen.indexOf('cardio')>seen.indexOf('w:'+wid),'cardio après la séance');assert(seen.includes('plan'));
 // Rechargement : cardio et cardio prévu relus.
 const c12=V2.create({...ctx,storage:st11,api:{...fk,async select(p){if(p.startsWith('cardio_logs'))return [{id:'x',done_on:new Date().toISOString().slice(0,10),type:'course',minutes:15,workout_id:wid}];return []}},userId:U4});await c12.init();await c12.whenFresh();
 assert.match(c12.statsHTML(),/15 min/);
 // Cardio prévu ajouté puis retiré hors ligne : la réouverture en ligne ne l'annule pas avant l'envoi.
 const st13=memory(),srv13={cycle:null},off13={async select(p){if(!srv13.cycle)return [];const c=srv13.cycle;if(p.startsWith('cycles'))return [{...c,sessions:undefined,cardio:undefined}];if(p.startsWith('cycle_sessions'))return c.sessions.map(({exercises,muscles,...x})=>x);if(p.startsWith('cycle_exercises'))return c.sessions.flatMap(x=>x.exercises);if(p.startsWith('cycle_cardio'))return srv13.cardio||[];return []},async upsert(){throw Error('Failed to fetch')},async remove(){throw Error('Failed to fetch')}};
 const c13=V2.create({...ctx,storage:st13,api:off13,userId:U4});await c13.init();
 srv13.cycle=JSON.parse(JSON.stringify(c13.state().cycle));srv13.cardio=[{id:'old',cycle_id:srv13.cycle.id,type:'rameur',minutes:20,per_week:1}];
 const c13b=V2.create({...ctx,storage:st13,api:off13,userId:U4});await c13b.init();await c13b.whenFresh();assert.match(c13b.programmeHTML(),/Rameur · 20 min/);
 await c13b.addCardioPlan({type:'natation',minutes:'40',per_week:'1'});await c13b.handle('v2-cardio-plan-remove',{id:'old'});await c13b.handle('v2-edit-save');
 const c14=V2.create({...ctx,storage:st13,api:off13,userId:U4});await c14.init();await c14.whenFresh();
 const prog14=c14.programmeHTML();assert.match(prog14,/Natation · 40 min/);assert(!/Rameur · 20 min/.test(prog14),'retrait conservé');
 // Questionnaire : deux modes ; formulaires cardio branchés.
 assert(/data-key="planMode"/.test(appSrc)&&/opt\('days','Je choisis mes jours'/.test(appSrc)&&/opt\('free'/.test(appSrc),'choix du mode de planning');
 assert(/key==='planMode'&&v==='free'\)A\.answers\.days=\[0,1,2,3,4,5,6\]/.test(appSrc),'mode libre : semaine entière pour l’ancien moteur');
 assert(/'v2Cardio' in/.test(appSrc)&&/'v2CardioPlan' in/.test(appSrc));
 console.log('app-v2 : ok');
})().catch(e=>{console.error(e);process.exit(1)});
