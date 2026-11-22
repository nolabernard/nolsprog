// Cohérence des séances : un muscle prioritaire est renforcé seulement dans les séances qui le travaillent déjà.
// Régression : en PPL, « muscles prioritaires » ajoutait du rowing en Push, du développé en Pull et en Legs.
const assert=require('assert');
require('../sport-rules.js');globalThis.SteroidCatalogue=require('../exercise-catalogue.js');require('../program-engine.js');
const E=globalThis.NolsEngine,C=globalThis.SteroidCatalogue;
// Familles de mouvement admises par type de séance (le gainage est admis partout).
const FAMILY={pushH:'push',chestIso:'push',pushV:'push',side:'push',triceps:'push',pullH:'pull',pullV:'pull',rear:'pull',biceps:'pull',squat:'legs',hinge:'legs',quadIso:'legs',hamIso:'legs',calves:'legs',core:'core'};
const ALLOWED={Push:['push'],Pull:['pull'],Legs:['legs'],Upper:['push','pull'],Lower:['legs']};
const ALL=['Pectoraux','Dos','Épaules','Bras','Jambes','Abdominaux'];
const prios=[[],ALL,['Pectoraux'],['Dos','Bras'],['Jambes','Pectoraux','Dos'],['Épaules','Abdominaux']];
let checked=0;
for(const method of ['ppl','upperlower','split','fullbody','hybrid'])for(const n of [2,3,4,5,6])for(const priority of prios)for(const duration of ['30','45','60','75','90'])for(const equipment of ['gym','dumbbells','none']){
 const a={...E.defaults,method,daysCount:String(n),days:[0,1,2,3,4,5,6],priority,duration,equipment,level:'advanced'};
 let cycle;try{cycle=E.buildCycle(a)}catch{continue}
 for(const s of cycle.sessions){
  const type=Object.keys(ALLOWED).find(t=>s.title.startsWith(t));
  if(!type)continue;
  for(const e of s.exercises){
   const f=FAMILY[C.byKey(e.key)?.pattern];if(f==='core')continue;
   assert(ALLOWED[type].includes(f),method+' '+n+'j '+duration+'min '+equipment+' priorités ['+priority+'] : '+s.title+' contient '+e.name+' ('+f+')');
  }
  checked++;
 }
}
// Cas exact signalé : 6 séances, PPL automatique, les six groupes cochés.
const real=E.buildCycle({...E.defaults,days:[0,1,2,3,4,5],daysCount:'6',level:'advanced',currentSessions:'5',priority:ALL,goal:'muscle',duration:'60',equipment:'gym'});
assert.equal(real.method,'ppl');
for(const s of real.sessions)assert(s.exercises.map(e=>FAMILY[C.byKey(e.key).pattern]).filter(f=>f!=='core').every(f=>ALLOWED[s.title.split(' ')[0]].includes(f)),s.title);
// Une priorité reste utile : elle ajoute du travail dans les séances qui ciblent déjà ce muscle.
const base=E.buildCycle({...E.defaults,method:'ppl',daysCount:'3',days:[0,2,4],duration:'75',priority:[]});
const prio=E.buildCycle({...E.defaults,method:'ppl',daysCount:'3',days:[0,2,4],duration:'75',priority:['Bras']});
const arms=c=>c.sessions.flatMap(s=>s.exercises).filter(e=>C.byKey(e.key).muscle==='Bras').length;
assert(arms(prio)>=arms(base),'la priorité Bras ne doit pas réduire le travail des bras');
// Plus de deux priorités (anciennes réponses) : traité comme « aucune priorité ».
const none=E.buildCycle({...E.defaults,method:'ppl',daysCount:'3',days:[0,2,4],duration:'75',priority:[]});
const six=E.buildCycle({...E.defaults,method:'ppl',daysCount:'3',days:[0,2,4],duration:'75',priority:ALL});
assert.deepEqual(six.sessions.map(s=>s.exercises.map(e=>e.key)),none.sessions.map(s=>s.exercises.map(e=>e.key)));
console.log('engine-coherence : ok ('+checked+' séances vérifiées)');
