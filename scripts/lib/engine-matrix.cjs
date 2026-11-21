// Matrice des combinaisons du questionnaire pour tester le moteur.
const crypto=require('crypto');
globalThis.crypto ||= crypto.webcrypto;
function loadEngine(){globalThis.SteroidCatalogue=require('../../exercise-catalogue.js');require('../../program-engine.js');return globalThis.NolsEngine}
function* combos(){
 for(const method of ['fullbody','upperlower','ppl','split','hybrid','auto'])
 for(const daysCount of ['2','3','4','5','6'])
 for(const level of ['beginner','intermediate','advanced'])
 for(const equipment of ['gym','dumbbells','none'])
 for(const goal of ['muscle','strength','fatloss','fitness','restart'])
 for(const duration of ['30','60','90'])
  yield {method,daysCount,level,equipment,goal,duration};
}
function answers(E,c){return {...E.defaults,...c,days:[0,1,2,3,4,5,6].slice(0,Number(c.daysCount))}}
const strip=plan=>plan.map(d=>({t:d.title,f:d.focus,ex:(d.ex||[]).map(e=>[e.name,e.sets,e.reps,e.rest])}));
function fingerprint(E,opts){const h=crypto.createHash('sha256');for(const c of combos())h.update(JSON.stringify(strip(E.buildProgram(answers(E,c),0,opts))));return h.digest('hex')}
module.exports={loadEngine,combos,answers,strip,fingerprint};
