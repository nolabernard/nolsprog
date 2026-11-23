// Lot 3 : bilan accessible en dernière semaine, cycle terminé signalé dès la fin de la semaine 6, pluriels.
const assert=require('assert'),Rv=require('../v2-review.js');
const cy={id:'c',weeks:6,sessions_per_week:3,started_at:'2026-11-02T09:00:00Z'}; // lundi
const at=s=>Date.parse(s);
assert.equal(Rv.available(cy,[],at('2026-11-05T10:00:00Z')),false,'semaine 1 : pas de bilan');
assert.equal(Rv.available(cy,[],at('2026-12-08T10:00:00Z')),true,'semaine 6 : bilan accessible');
assert.equal(Rv.due(cy,[],at('2026-12-12T10:00:00Z')),false,'pas encore dû pendant la semaine 6');
assert.equal(Rv.due(cy,[],at('2026-12-14T10:00:00Z')),true,'dû dès le lundi suivant la semaine 6');
const r=Rv.review(cy,[{id:'w',cycle_id:'c',status:'completed',started_at:'2026-11-03T10:00:00Z',ended_at:'2026-11-03T11:00:00Z'}],[],[],at('2026-12-14T10:00:00Z'));
assert(!JSON.stringify(r).includes('1 séances'),'pluriel');
console.log('Lot 3 bilan : ok');
