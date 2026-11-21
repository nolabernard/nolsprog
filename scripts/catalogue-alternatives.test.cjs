// « Machine prise » : remplaçants du même mouvement et du même rôle.
const assert=require('assert');
const C=require('../exercise-catalogue.js');
const alt=(k,o)=>C.alternatives(k,o).map(e=>e.key);

const incl=alt('developpe-incline-halteres',{equipment:'gym'});
assert(incl.length>0&&incl.length<=3,'1 à 3 remplaçants');
for(const k of incl){const e=C.byKey(k);assert.equal(e.pattern,'pushH');assert.equal(e.role,'base')}
assert(!incl.includes('developpe-incline-halteres'),'pas lui-même');
// Jamais une finition pour un exercice de base.
assert(!incl.includes('pec-deck')&&!incl.includes('ecarte-poulie'));
// Matériel : avec haltères seulement, rien qui exige une machine.
for(const k of alt('developpe-incline-halteres',{equipment:'dumbbells'}))assert(C.byKey(k).equipment.some(x=>['dumbbells','any','none'].includes(x)),k);
// Exercices déjà dans la séance et mouvements à éviter exclus.
assert(!alt('developpe-incline-halteres',{equipment:'gym',exclude:[incl[0]]}).includes(incl[0]));
assert(!alt('hack-squat',{equipment:'gym',avoid:['presse']}).some(k=>C.byKey(k).name.toLowerCase().includes('presse')));
// Déjà pratiqué par l'utilisateur → en premier.
const pref=alt('developpe-incline-halteres',{equipment:'gym',history:{'developpe-incline-smith':5}});
assert.equal(pref[0],'developpe-incline-smith');
// Clé inconnue → aucun remplaçant.
assert.deepEqual(alt('u-00000000-0000-0000-0000-000000000000',{equipment:'gym'}),[]);
console.log('Catalogue alternatives checks passed');
