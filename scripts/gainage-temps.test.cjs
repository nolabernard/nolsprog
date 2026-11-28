// Gainage (mode temps) : pas de charge, un seul bouton « Démarrer » qui valide la tenue à la fin ou à l'arrêt.
const assert=require('assert');
const Cat=require('../exercise-catalogue.js');globalThis.SteroidCatalogue=Cat;
const UI=require('../ui-v2.js');

const w=(key)=>({id:'w1',exercises:[{id:'e1',exercise_key:key,status:'active',plan:{role:'finition',sets:2,reps_min:45,reps_max:45,rest_seconds:60},sets:[{id:'s1',set_number:1,weight:null,reps:null,completed:false},{id:'s2',set_number:2,weight:null,reps:null,completed:false}]}]});

// Gainage au repos : un bouton « Démarrer », cible 00:45, pas de charge, pas de « Valider ».
{const html=UI.session({workout:w('gainage'),index:0,last:{},advice:{}});
 assert.doesNotMatch(html,/Charge \(kg\)/,'pas de champ charge pour le gainage');
 assert.doesNotMatch(html,/Valider/,'pas de bouton Valider pour la tenue');
 assert.doesNotMatch(html,/sec\.|Secondes/,'pas de champ de saisie de durée');
 assert.match(html,/v2-hold-start/);assert.match(html,/Démarrer/);
assert.match(html,/class="v2-hold-time">00:45<\/span>/);
 assert.doesNotMatch(html,/Arrêter/);}

// Gainage en cours : compte à rebours et bouton « Arrêter » (le même emplacement).
{const html=UI.session({workout:w('gainage'),index:0,last:{},advice:{},hold:{ex:'e1',set:1,total:45,remaining:38}});
 assert.match(html,/class="v2-hold-time"[^>]*>00:38</);assert.match(html,/data-action="v2-hold-stop"/);
 assert.doesNotMatch(html,/Démarrer/);}

// Dernière fois : une tenue s'affiche en secondes.
{const wl=w('gainage');wl.exercises[0].sets[0]={...wl.exercises[0].sets[0],completed:true,reps:40};
 const html=UI.session({workout:wl,index:0,last:{gainage:{weight:null,reps:40}},advice:{}});
 assert.match(html,/Dernière fois <b>40 s<\/b>/);}

// Musculation : inchangé, la charge et « Valider » restent.
{const html=UI.session({workout:w('developpe-couche-barre'),index:0,last:{},advice:{}});
 assert.match(html,/Charge \(kg\)/);assert.match(html,/Valider la série 1/);assert.doesNotMatch(html,/Démarrer/);}

// Tenue validée : le libellé d'accessibilité donne des secondes, jamais « — kg ».
{const wl=w('gainage');wl.exercises[0].sets[0]={...wl.exercises[0].sets[0],completed:true,reps:40};
 const html=UI.session({workout:wl,index:0,last:{},advice:{}});
 assert.match(html,/Tenue 1 validée : 40 secondes/);assert.doesNotMatch(html,/— kg/);}

console.log('gainage : un bouton, tenue validée automatiquement : ok');
