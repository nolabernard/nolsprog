// Exercices en mode temps (gainage) : pas de charge, tenue chronométrée à compte à rebours.
const assert=require('assert');
const Cat=require('../exercise-catalogue.js');globalThis.SteroidCatalogue=Cat;
const UI=require('../ui-v2.js');

const w=(key)=>({id:'w1',exercises:[{id:'e1',exercise_key:key,status:'active',plan:{role:'finition',sets:2,reps_min:45,reps_max:45,rest_seconds:60},sets:[{id:'s1',set_number:1,weight:null,reps:null,completed:false},{id:'s2',set_number:2,weight:null,reps:null,completed:false}]}]});

// Gainage : aucune charge demandée, cible de 45 s, bouton « Lancer la tenue ».
{const html=UI.session({workout:w('gainage'),index:0,last:{},advice:{}});
 assert.doesNotMatch(html,/Charge \(kg\)/,'pas de champ charge pour le gainage');
 assert.match(html,/Lancer la tenue \(45 s\)/);
 assert.match(html,/Secondes/);}

// Musculation : inchangé, la charge reste demandée.
{const html=UI.session({workout:w('developpe-couche-barre'),index:0,last:{},advice:{}});
 assert.match(html,/Charge \(kg\)/);assert.doesNotMatch(html,/Lancer la tenue/);}

// Tenue en cours : compte à rebours visible et bouton d'arrêt.
{const html=UI.session({workout:w('gainage'),index:0,last:{},advice:{},hold:{ex:'e1',set:1,total:45,remaining:38}});
 assert.match(html,/class="v2-hold-time"[^>]*>00:38</);assert.match(html,/data-action="v2-hold-stop"/);
 assert.doesNotMatch(html,/Lancer la tenue/);}

console.log('gainage en mode temps : ok');
