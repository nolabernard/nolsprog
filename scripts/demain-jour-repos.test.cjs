// « Demain » ne doit jamais annoncer une séance un jour de repos : le prochain jour prévu est calculé d'après le cycle.
const assert=require('assert');
const Cat=require('../exercise-catalogue.js');globalThis.SteroidCatalogue=Cat;
const C=require('../v2-cycle.js');
const UI=require('../ui-v2.js');

// Samedi 28/11/2026 à midi (heure locale), programme lundi → samedi, dimanche = repos.
const samedi=new Date(2026,10,28,12,0,0).getTime();
const vendredi=new Date(2026,10,27,12,0,0).getTime();
const cycle={id:'c1',preferred_days:[0,1,2,3,4,5]};

// 1. Calcul du prochain jour prévu
assert.deepStrictEqual(C.nextTrainingDay(cycle,samedi),{offset:2,day:0},'samedi → lundi (repos dimanche)');
assert.deepStrictEqual(C.nextTrainingDay(cycle,vendredi),{offset:1,day:5},'vendredi → samedi, demain');
assert.strictEqual(C.nextTrainingDay({preferred_days:null},samedi),null,'mode libre : pas de jour prévu');

// 2. Carte affichée après la séance du jour
const today={id:'w1',status:'completed',title:'Cardio + abdos'};
const next={reason:'tomorrow',session:{id:'s1',title:'Push A',exercises:[]},planned:{id:'s1'},today:{...today,reason:null}};
{const html=UI.home({next,cycle,nextTraining:C.nextTrainingDay(cycle,samedi),progress:0.44});
 assert.match(html,/Repos demain/,'pas de « Demain : Push A » le samedi');
 assert.match(html,/Prochaine séance : <b>Push A<\/b> · lundi/);
 assert.doesNotMatch(html,/Demain : <b>Push A/);}
{const html=UI.home({next,cycle,nextTraining:C.nextTrainingDay(cycle,vendredi),progress:0.44});
 assert.match(html,/Demain : <b>Push A<\/b>/,'vendredi : demain est bien un jour prévu');}
{const html=UI.home({next,cycle:{...cycle,preferred_days:null},nextTraining:null,progress:0.44});
 assert.match(html,/Demain : <b>Push A<\/b>/,'mode libre : comportement inchangé');}

console.log('demain et jours de repos : ok');
