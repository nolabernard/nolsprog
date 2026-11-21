// Moteur : V1 inchangé (programmes en cours), corrections V2 vérifiées sur toutes les combinaisons.
const assert=require('assert');
const M=require('./lib/engine-matrix.cjs');
const E=M.loadEngine();
const C=require('../exercise-catalogue.js');
const R=require('../sport-rules.js');

// 1. Sans option, la sortie V1 est strictement identique (empreinte figée avant toute modification).
assert.equal(M.fingerprint(E),'c2f91d9e150fff45b0083a036fef8ba374c139fe95b375af7dd0c931a2744c88','V1 modifié : les programmes en cours changeraient');

assert.equal(E.ENGINE_VERSION,'v2.0');
assert.deepEqual(E.VOLUME,R.VOLUME,'volume identique aux règles sportives');

const role=name=>C.byKey(C.resolveName(name).key).role;
let checked=0,volumeChecked=0;
for(const c of M.combos()){
 const a=M.answers(E,c);
 const plan=E.buildProgram(a,0,{version:2});
 const days=plan.filter(d=>d.ex.length);
 const vol={};
 for(const d of days){
  // 2. Base avant finition dans chaque séance.
  const roles=d.ex.map(e=>role(e.name));
  assert.deepEqual(roles,[...roles].sort((x,y)=>(x==='base'?0:1)-(y==='base'?0:1)),`ordre ${JSON.stringify(c)} ${d.title}`);
  // 3. Durée respectée.
  assert(E.estimatedMinutes(d.ex)<=Number(c.duration)*1.1,`durée ${JSON.stringify(c)} ${d.title} ${E.estimatedMinutes(d.ex)}`);
  for(const e of d.ex){const m=C.byKey(C.resolveName(e.name).key).muscle;vol[m]=(vol[m]||0)+e.sets}
 }
 // 4. Volume minimal atteint quand le temps le permet.
 if(Number(c.duration)>=60&&Number(c.daysCount)>=3&&c.equipment==='gym'){
  for(const m of ['Pectoraux','Dos','Jambes'])assert((vol[m]||0)>=E.VOLUME[c.level][0],`volume ${m}=${vol[m]} ${JSON.stringify(c)}`);
  volumeChecked++;
 }
 checked++;
}
assert(checked===4050&&volumeChecked>0);

// 5. Un exercice de base à la barre est traité comme un exercice de base.
const benchAnswers=M.answers(E,{method:'fullbody',daysCount:'2',level:'advanced',equipment:'gym',goal:'muscle',duration:'90'});
const bench=E.buildProgram(benchAnswers,0,{version:2})
 .flatMap(d=>d.ex).find(e=>e.name==='Développé couché barre');
assert(bench,'développé couché barre présent');
assert(bench.sets>=3&&bench.rest>=120,'séries et repos d’un exercice de base');
const benchV1=E.buildProgram(benchAnswers,0).flatMap(d=>d.ex).find(e=>e.name==='Développé couché barre');
assert(!benchV1||benchV1.rest<bench.rest,'V1 traitait la barre comme une isolation (repos court)');

console.log('Engine v2 checks passed ('+checked+' combinaisons)');
