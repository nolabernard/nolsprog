// Rappels : envoyés une fois, au bon jour et à la bonne heure locale, jamais si désactivés ou séance déjà faite.
const assert=require('assert');
(async()=>{
 const S=await import('../supabase/functions/send-reminders/schedule.js');
 const sub={enabled:true,hour:18,minute:30,days:[0,2,4],timezone:'Europe/Paris',last_sent_on:null};
 const at=s=>Date.parse(s);
 // Lundi 23 novembre 2026, 18 h 35 à Paris (17 h 35 UTC, heure d'hiver).
 assert.equal(S.isDue(sub,at('2026-11-23T17:35:00Z')),true);
 assert.equal(S.isDue(sub,at('2026-11-23T17:25:00Z')),false,'trop tôt');
 assert.equal(S.isDue(sub,at('2026-11-23T17:45:00Z')),false,'fenêtre de 15 min dépassée');
 assert.equal(S.isDue(sub,at('2026-11-24T17:35:00Z')),false,'mardi non choisi');
 assert.equal(S.isDue({...sub,enabled:false},at('2026-11-23T17:35:00Z')),false,'désactivé');
 assert.equal(S.isDue({...sub,last_sent_on:'2026-11-23'},at('2026-11-23T17:35:00Z')),false,'déjà envoyé');
 assert.equal(S.isDue(sub,at('2026-11-23T17:35:00Z'),['2026-11-23']),false,'séance déjà faite');
 // Heure d'été : 18 h 30 à Paris = 16 h 30 UTC.
 assert.equal(S.isDue(sub,at('2026-06-01T16:31:00Z')),true);
 // Fuseau inconnu : Paris par défaut, pas d'erreur.
 assert.equal(S.isDue({...sub,timezone:'Mars/Olympus'},at('2026-11-23T17:35:00Z')),true);
 assert.equal(S.localDate(at('2026-11-23T23:30:00Z'),'Europe/Paris'),'2026-11-24');
 console.log('reminders-schedule : ok');
})().catch(e=>{console.error(e);process.exit(1)});
