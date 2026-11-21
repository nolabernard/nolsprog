// Catalogue d'exercices : clés permanentes, rôles, recherche tolérante aux fautes.
const assert=require('assert');
const fs=require('fs');
const C=require('../exercise-catalogue.js');

// Chaque exercice du moteur est retrouvé exactement, avec une clé unique et bien formée.
const eng=fs.readFileSync('program-engine.js','utf8');
const names=[...new Set([...eng.matchAll(/\['([^']+)','[a-zA-Z]+','[^']+','[a-z]+',\d\]/g)].map(m=>m[1]))];
assert(names.length>=50,'catalogue du moteur introuvable');
for(const n of names)assert.equal(C.resolveName(n)?.method,'exact',n);
assert.equal(C.CATALOGUE.length,names.length,'une entrée par nom distinct');
assert.equal(new Set(C.CATALOGUE.map(e=>e.key)).size,C.CATALOGUE.length,'clés uniques');
assert(C.CATALOGUE.every(e=>/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.key)),'format de clé');

// Un même nom présent dans plusieurs listes de matériel → une seule entrée.
assert.deepEqual([...C.byKey(C.resolveName('Développé épaules haltères').key).equipment].sort(),['dumbbells','gym']);

// Rôles dérivés du niveau de polyarticularité.
assert.equal(C.byKey(C.resolveName('Hack squat').key).role,'base');
assert.equal(C.byKey(C.resolveName('Développé incliné haltères').key).role,'base');
assert(C.CATALOGUE.every(e=>e.role==='base'||e.role==='finition'),'deux rôles');
assert.equal(C.byKey(C.resolveName('Pec deck').key).role,'finition');

// Tolérance : casse, espaces, accents, abréviations, alias.
assert.equal(C.normalize('  Développé   INCLINÉ, haltères! '),'developpe incline halteres');
assert.equal(C.resolveName('hack  SQUAT').key,C.resolveName('Hack squat').key);
assert.equal(C.resolveName('developpe incline halteres').key,C.resolveName('Développé incliné haltères').key);
assert(C.search('dvlp couche')[0].entry.name.startsWith('Développé couché'),'abréviation');
assert.equal(C.resolveName('butterfly').method,'alias');
assert.equal(C.resolveName('butterfly').key,C.resolveName('Pec deck').key);

// Inconnu → null (deviendra un exercice perso) ; exercices proches mais différents → clés différentes.
assert.equal(C.resolveName('squeese press'),null);
assert.notEqual(C.resolveName('Leg curl assis').key,C.resolveName('Leg extension').key);
assert.notEqual(C.resolveName('Mollets debout').key,C.resolveName('Mollets assis').key);

// Filtre par matériel.
assert(C.search('développé',{equipment:'dumbbells'}).every(r=>r.entry.equipment.includes('dumbbells')||r.entry.equipment.includes('any')));
assert(C.search('squat',{limit:2}).length<=2);

console.log('Exercise catalogue checks passed');
