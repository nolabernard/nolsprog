// Prochaine séance : suite du cycle, jamais de séance « manquée », garde-fou de récupération expliqué.
const assert=require('assert');
const P=require('../session-planner.js');
const H=3600e3,now=Date.parse('2026-11-23T10:00:00Z');
const ex=(muscle,role='base')=>({muscle,role});
const cycle={sessions:[
 {id:'s0',position:0,code:'A',title:'Haut A',muscles:[ex('Pectoraux'),ex('Dos'),ex('Bras','finition')]},
 {id:'s1',position:1,code:'B',title:'Bas A',muscles:[ex('Jambes')]},
 {id:'s2',position:2,code:'C',title:'Haut B',muscles:[ex('Pectoraux'),ex('Épaules')]},
 {id:'s3',position:3,code:'D',title:'Bas B',muscles:[ex('Jambes'),ex('Abdominaux','finition')]}]};
const done=(sid,hoursAgo)=>({cycle_session_id:sid,status:'completed',ended_at:new Date(now-hoursAgo*H).toISOString()});

// Rien de fait → première séance.
let r=P.nextSession(cycle,[],now);
assert.equal(r.session.id,'s0');assert.equal(r.reason,'sequence');

// Suite : la séance qui suit la dernière terminée, même des jours plus tard (jamais « manquée »).
r=P.nextSession(cycle,[done('s0',200),done('s1',100)],now);
assert.equal(r.session.id,'s2');assert.equal(r.reason,'sequence');

// Bouclage.
r=P.nextSession(cycle,[done('s3',100)],now);assert.equal(r.session.id,'s0');

// Garde-fou : Bas A il y a 20 h, la suite propose Bas B → conflit jambes, on conseille Haut B... (ici la suivante compatible).
const c2={sessions:[cycle.sessions[1],cycle.sessions[3],cycle.sessions[0]]}; // Bas A, Bas B, Haut A
r=P.nextSession(c2,[done('s1',20)],now);
assert.equal(r.session.id,'s0','séance compatible proposée');
assert.equal(r.reason,'recovery');
assert.equal(r.planned.id,'s3','la séance prévue reste proposée en option');
assert.match(r.message,/tu as travaillé les jambes/i);assert.match(r.message,/48 h/);assert.match(r.message,/Haut A/);

// Au-delà de 48 h : pas de garde-fou.
r=P.nextSession(c2,[done('s1',50)],now);assert.equal(r.session.id,'s3');assert.equal(r.reason,'sequence');

// Les finitions ne déclenchent pas le garde-fou (Abdominaux en finition).
// Tout est en conflit → on propose quand même la prévue, avec l'explication.
const c3={sessions:[cycle.sessions[1],cycle.sessions[3]]};
r=P.nextSession(c3,[done('s1',20)],now);
assert.equal(r.session.id,'s3');assert.equal(r.reason,"recovery-all");assert.match(r.message,/les jambes/);

// Séances non terminées ignorées.
r=P.nextSession(cycle,[{cycle_session_id:'s0',status:'abandoned',ended_at:new Date(now-H).toISOString()}],now);
assert.equal(r.session.id,'s0');
// Une séance par jour : séance faite aujourd'hui → la suivante attend demain, sans bouton de démarrage.
{const t=new Date(now);const sameDay=new Date(t.getFullYear(),t.getMonth(),t.getDate(),Math.min(t.getHours(),23),0).getTime();
 const todayDone={cycle_session_id:'s0',status:'completed',ended_at:new Date(sameDay).toISOString(),id:'w1'};
 r=P.nextSession(cycle,[todayDone],sameDay+60e3);
 assert.equal(r.reason,'tomorrow');assert.equal(r.today.status,'completed');assert.equal(r.today.title,'Haut A');assert.equal(r.session.id,'s1');
 assert.equal(P.today([todayDone],sameDay+60e3).id,'w1');
 // Lendemain : plus de blocage.
 r=P.nextSession(cycle,[todayDone],sameDay+30*H);assert.notEqual(r.reason,'tomorrow');assert.equal(r.session.id,'s1');
 // Séance passée : la suite avance, repos aujourd'hui, et elle ne compte pas comme travaillée (pas de garde-fou).
 const skipped={cycle_session_id:'s1',status:'skipped',skip_reason:'malade',ended_at:new Date(sameDay).toISOString(),id:'w2'};
 r=P.nextSession(c2,[skipped],sameDay+60e3);assert.equal(r.reason,'tomorrow');assert.equal(r.today.status,'skipped');assert.equal(r.today.reason,'malade');
 r=P.nextSession(c2,[skipped],sameDay+30*H);assert.equal(r.session.id,'s3');assert.equal(r.reason,'sequence','une séance passée ne fatigue pas');
 // Séance passée puis annulée (abandoned) : ignorée.
 r=P.nextSession(c2,[{...skipped,status:'abandoned'}],sameDay+60e3);assert.equal(r.session.id,'s0');assert.equal(r.reason,'sequence');}
console.log('Session planner checks passed');
