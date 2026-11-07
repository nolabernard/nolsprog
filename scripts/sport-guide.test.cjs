const assert=require('node:assert/strict'),fs=require('node:fs');
const guide=require('../sport-guide.js'),rules=require('../sport-rules.js');
const base={daysCount:'3',days:[0,2,4],method:'fullbody',level:'intermediate',goal:'muscle',equipment:'gym',duration:'60',currentSessions:'3',limitations:'no',priority:[],avoid:''};
assert(guide.diagnostic(base).ok);
const split=guide.diagnostic({...base,daysCount:'2',days:[0,3],method:'split'});
assert(!split.ok);assert(split.issues.some(x=>x.code==='METHOD_DISCOURAGED'&&x.stage===6));
assert(split.choices.some(x=>x.patch.method==='fullbody'||x.patch.method==='auto'));
for(const suggestion of split.choices){const next=guide.change({...base,daysCount:'2',days:[0,3],method:'split'},suggestion.patch);assert(rules.assess(next).valid);assert(!rules.assess(next).warnings.some(x=>x.code==='METHOD_DISCOURAGED'))}
const beginner=guide.diagnostic({...base,daysCount:'6',days:[0,1,2,3,4,5],level:'beginner',currentSessions:'2',method:'ppl'});
assert(!beginner.ok);assert(beginner.issues.some(x=>x.code==='BEGINNER_HIGH_FREQUENCY'));assert(beginner.issues.some(x=>x.code==='FREQUENCY_JUMP'));
assert(beginner.choices.every(x=>{const next=guide.change({...base,daysCount:'6',days:[0,1,2,3,4,5],level:'beginner',currentSessions:'2',method:'ppl'},x.patch);return guide.diagnostic(next).ok}));
const p={...base,daysCount:'2',days:[0,3],method:'split'};const snapshot=JSON.stringify(p);guide.diagnostic(p);assert.equal(JSON.stringify(p),snapshot,'No mutation');
assert(guide.diagnostic({...base,limitations:'yes'}).ok,'Limitations are safety notice, not fake automatic repair');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
assert(html.includes('sport-guide.js'));assert(app.includes('function coherenceUI()'));assert(app.includes("a==='guide-edit'"));assert(app.includes("a==='guide-apply'"));assert(app.includes('globalThis.SteroidGuide.diagnostic(p)'));assert(!app.includes('Confirmer ce choix ?'));assert(css.includes('.coherence-screen'));
console.log('Coherence guide tests passed.');
