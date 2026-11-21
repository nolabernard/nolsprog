// Correspondance nom saisi → clé du catalogue (migration V2).
const assert=require('assert');
const {buildNameMap}=require('./v2/build-name-map.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const rows=[
 {user_id:A,raw_name:'Hack squat'},
 {user_id:A,raw_name:'butterfly'},
 {user_id:A,raw_name:'développer coucher inclinée'},
 {user_id:A,raw_name:'mouvement inventé'},
 {user_id:A,raw_name:'MOUVEMENT  inventé'},
 {user_id:B,raw_name:'mouvement inventé'},
];
const map=buildNameMap(rows),get=(u,n)=>map.find(r=>r.user_id===u&&r.raw_name===n);
assert.equal(map.length,rows.length,'une ligne par nom saisi');
assert.equal(get(A,'Hack squat').method,'exact');
assert.equal(get(A,'Hack squat').exercise_key,'hack-squat');
assert.equal(get(A,'Hack squat').role,'base');
assert.equal(get(A,'butterfly').role,'finition');
assert.equal(get(A,'butterfly').method,'alias');
assert.equal(get(A,'butterfly').exercise_key,'pec-deck');
assert.notEqual(get(A,'développer coucher inclinée').method,'exact');
const custom=get(A,'mouvement inventé');
assert.equal(custom.method,'custom');
assert(/^u-[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(custom.exercise_key),'uuid v5');
assert.equal(get(A,'MOUVEMENT  inventé').exercise_key,custom.exercise_key,'même nom normalisé, même clé');
assert.notEqual(get(B,'mouvement inventé').exercise_key,custom.exercise_key,'autre utilisateur, autre clé');
assert.deepEqual(buildNameMap(rows),map,'déterministe');
// Forçage manuel prioritaire.
const forced=buildNameMap([{user_id:A,raw_name:'mouvement inventé'}],{overrides:{'mouvement inventé':'developpe-couche-halteres'}});
assert.deepEqual([forced[0].exercise_key,forced[0].method],['developpe-couche-halteres','manual']);
console.log('V2 name map checks passed');
