// Prochaine séance : tour par tour dans l'ordre du programme, jamais de séance sautée ni « manquée »,
// garde-fou de récupération expliqué, une séance par jour.
const assert=require('assert');
const P=require('../session-planner.js');
const H=3600e3,now=Date.parse('2026-11-23T10:00:00Z');
const ex=(muscle,role='base')=>({muscle,role});
const cycle={sessions:[
 {id:'s0',position:0,code:'A',title:'Haut A',muscles:[ex('Pectoraux'),ex('Dos'),ex('Bras','finition')]},
 {id:'s1',position:1,code:'B',title:'Bas A',muscles:[ex('Jambes')]},
 {id:'s2',position:2,code:'C',title:'Haut B',muscles:[ex('Pectoraux'),ex('Épaules')]},
 {id:'s3',position:3,code:'D',title:'Bas B',muscles:[ex('Jambes'),ex('Abdominaux','finition')]}]};
const at=(sid,hoursAgo,status='completed')=>({cycle_session_id:sid,status,ended_at:new Date(now-hoursAgo*H).toISOString()});

// Rien de fait → première séance.
let r=P.nextSession(cycle,[],now);
assert.equal(r.session.id,'s0');assert.equal(r.reason,'sequence');

// Suite : la première séance du tour pas encore faite, même des jours plus tard (jamais « manquée »).
r=P.nextSession(cycle,[at('s0',200),at('s1',100)],now);
assert.equal(r.session.id,'s2');assert.equal(r.reason,'sequence');

// Tour complet → on recommence au début.
r=P.nextSession(cycle,[at('s0',400),at('s1',300),at('s2',200),at('s3',100)],now);assert.equal(r.session.id,'s0');

// Séance déplacée : Bas A faite à la place de Haut A → Haut A reste à faire, elle n'est pas sautée.
r=P.nextSession(cycle,[at('s1',100)],now);assert.equal(r.session.id,'s0');
r=P.nextSession(cycle,[at('s1',100),at('s0',60)],now);assert.equal(r.session.id,'s2');
assert.deepStrictEqual(P.round(cycle,[at('s1',100),at('s0',60)]).remaining.map(s=>s.id),['s2','s3']);

// Séance refaite avant la fin du tour : nouveau tour (pas de rattrapage).
r=P.nextSession(cycle,[at('s0',300),at('s1',200),at('s0',100)],now);assert.equal(r.session.id,'s1');

// Séance passée : elle compte comme traitée dans le tour, mais ne fatigue pas.
r=P.nextSession(cycle,[at('s0',30,'skipped')],now);assert.equal(r.session.id,'s1');assert.equal(r.reason,'sequence');

// Séances abandonnées ou vides (status « empty ») ignorées.
r=P.nextSession(cycle,[at('s0',1,'abandoned'),at('s0',2,'empty')],now);assert.equal(r.session.id,'s0');

// Plus de garde-fou ni de suggestion automatique : on suit l'ordre du programme, même 20 h après des jambes.
const legs={sessions:[
 {id:'l1',position:0,title:'Jambes A',muscles:[ex('Jambes')]},
 {id:'l2',position:1,title:'Jambes B',muscles:[ex('Jambes')]},
 {id:'u1',position:2,title:'Haut A',muscles:[ex('Pectoraux')]}]};
r=P.nextSession(legs,[at('l1',20)],now);assert.equal(r.session.id,'l2');assert.equal(r.reason,'sequence');assert.equal(r.message,'');
// Haut A faite à la place (choisie dans le récapitulatif) : Jambes B reste la suivante.
r=P.nextSession(legs,[at('l1',60),at('u1',30)],now);assert.equal(r.session.id,'l2');

// Une séance par jour : séance faite aujourd'hui → la suivante attend demain, sans bouton de démarrage.
{const t=new Date(now);const sameDay=new Date(t.getFullYear(),t.getMonth(),t.getDate(),Math.min(t.getHours(),23),0).getTime();
 const todayDone={cycle_session_id:'s0',status:'completed',ended_at:new Date(sameDay).toISOString(),id:'w1'};
 r=P.nextSession(cycle,[todayDone],sameDay+60e3);
 assert.equal(r.reason,'tomorrow');assert.equal(r.today.status,'completed');assert.equal(r.today.title,'Haut A');assert.equal(r.session.id,'s1');
 assert.equal(P.today([todayDone],sameDay+60e3).id,'w1');
 // Séance vide (aucune série) : ne bloque pas la journée.
 assert.equal(P.today([{...todayDone,status:'empty'}],sameDay+60e3),null);
 // Lendemain : plus de blocage.
 r=P.nextSession(cycle,[todayDone],sameDay+30*H);assert.notEqual(r.reason,'tomorrow');assert.equal(r.session.id,'s1');
 // Séance passée aujourd'hui : repos, la suite avance.
 const skipped={cycle_session_id:'s1',status:'skipped',skip_reason:'malade',ended_at:new Date(sameDay).toISOString(),id:'w2'};
 r=P.nextSession(cycle,[skipped],sameDay+60e3);assert.equal(r.reason,'tomorrow');assert.equal(r.today.status,'skipped');assert.equal(r.today.reason,'malade');
 r=P.nextSession(cycle,[skipped],sameDay+30*H);assert.equal(r.session.id,'s0','Haut A reste à faire');assert.equal(r.reason,'sequence');
 // Séance passée puis annulée : ignorée.
 r=P.nextSession(cycle,[{...skipped,status:'abandoned'}],sameDay+60e3);assert.equal(r.session.id,'s0');assert.equal(r.reason,'sequence');}
console.log('Session planner checks passed');
