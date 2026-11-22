const fs=require('fs');const vm=require('vm');const assert=require('assert');
const source=fs.readFileSync('app.js','utf8');
const listeners={};const store={'nolsprog-onboarding-seen':'1'};const root={innerHTML:'',addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={navigator:{onLine:true,vibrate:()=>{}},setInterval:()=>0,clearInterval:()=>{},document:{getElementById:id=>id==='app'?root:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({}),addEventListener:()=>{},visibilityState:'visible'},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},window:{addEventListener:()=>{}},clearTimeout:()=>{},crypto:require('crypto').webcrypto,Date,console,Math,Number,String,Array,JSON,Intl,setTimeout:()=>0,URL,URLSearchParams,location:{hash:'',pathname:'/nolsprog/',search:'',origin:'https://nolabernard.github.io'},history:{replaceState:()=>{}},Blob,structuredClone,globalThis:null};ctx.globalThis=ctx;
const html=fs.readFileSync('index.html','utf8');
const order=[...html.matchAll(/<script src="\.\/([^"]+\.js)"><\/script>/g)].map(m=>m[1]).filter(f=>f!=='app.js'&&f!=='app-updates.js');
vm.createContext(ctx);for(const f of order)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});vm.runInContext(source,ctx);
const click=(action,fields={})=>listeners.click({target:{closest:()=>({dataset:{action,...fields}})}});
(async()=>{
 for(let i=0;i<20&&!root.innerHTML.includes('Prochaine séance');i++)await new Promise(r=>setImmediate(r));
 assert(root.innerHTML.includes('Prochaine séance'),'L’app doit démarrer en invité sur l’écran V2 « Prochaine séance »');
 assert(!root.innerHTML.includes('data-action="day"'),'Plus de calendrier V1');
 await click('tab',{tab:'stats'});assert(root.innerHTML.includes('Tes progrès'),'Progrès V2');
 await click('tab',{tab:'edit'});assert(root.innerHTML.includes('Rappels'),'Programme V2');
 console.log('NolsProg smoke test OK : démarrage invité, Aujourd’hui, Progrès et Programme en V2.');
})().catch(e=>{console.error(e);process.exit(1)});
const p={...ctx.NolsEngine.defaults,daysCount:'4',method:'upperlower',days:[0,1,3,5],level:'advanced',duration:'75'};
const generated=ctx.NolsEngine.buildProgram(p);
assert(generated.length===7,'Le programme doit couvrir 7 jours');
assert(generated.filter(x=>x.ex.length).length===4,'Quatre séances doivent être générées');
assert(ctx.NolsEngine.chooseMethod(p)==='upperlower','Upper/Lower doit être sélectionné');
assert(ctx.NolsEngine.chooseMethod({...p,daysCount:'6',method:'ppl'})==='ppl','PPL doit être sélectionné');
assert(ctx.NolsEngine.chooseMethod({...p,daysCount:'3',method:'fullbody'})==='fullbody','Full body doit être sélectionné');
console.log('Génération de programmes : OK');

const allDays={...ctx.NolsEngine.defaults,daysCount:'3',method:'auto',days:[0,1,2,3,4,5,6],equipment:'gym'};
const spread=ctx.NolsEngine.buildProgram(allDays);
const training=spread.map((x,i)=>x.ex.length?i:-1).filter(i=>i>=0);
assert(training.length===3,'Sept jours disponibles ne doivent produire que trois séances');
assert(training.join(',')!=='0,1,2','Les séances doivent être réparties sur la semaine');
assert(new Set(spread.filter(x=>x.ex.length).map(x=>x.ex.map(e=>e.name).join('|'))).size===3,'Les trois full body doivent être différents');
assert(spread.filter(x=>!x.ex.length).length===4,'Quatre jours de récupération sont nécessaires');
const onlyThree=ctx.NolsEngine.buildProgram({...allDays,days:[0,2,4]});
assert(onlyThree[0].ex.length&&onlyThree[2].ex.length&&onlyThree[4].ex.length,'Respecter les trois seuls jours disponibles');
assert(onlyThree[1].ex.length===0,'Ne pas programmer un jour indisponible');
const home=ctx.NolsEngine.buildProgram({...allDays,equipment:'none'});
assert(home.filter(x=>x.ex.length).every(x=>x.ex.every(e=>!/machine|haltère|barre EZ|presse à cuisses/i.test(e.name))),'Le programme sans matériel ne doit pas exiger de machines');
assert.throws(()=>ctx.NolsEngine.buildProgram({...allDays,days:[0,2]}),/jours disponibles/,'Refuser les calendriers incompatibles');
console.log('Personnalisation vérifiée : disponibilité, répartition, variété A/B/C et matériel.');

for(const [method,count] of [['fullbody',3],['upperlower',4],['ppl',6],['split',5],['hybrid',5]]){
 const profile={...ctx.NolsEngine.defaults,method,daysCount:String(count),days:[0,1,2,3,4,5,6],equipment:'gym',level:'advanced',currentSessions:'5',duration:'75'};
 const week=ctx.NolsEngine.buildProgram(profile).filter(d=>d.ex.length);
 assert(week.length===count,method+': nombre de séances incorrect');
 assert(week.every(s=>new Set(s.ex.map(e=>e.name)).size===s.ex.length),method+': exercices dupliqués dans une séance');
 assert(week.every(s=>s.ex.length>=4),method+': séance incomplète');
 assert(new Set(week.map(s=>s.ex.map(e=>e.name).join('|'))).size===count,method+': séances identiques');
 const short=ctx.NolsEngine.buildProgram({...profile,duration:'30'}).filter(d=>d.ex.length);
 assert(short.every(s=>s.ex.length<=(method==='fullbody'?5:3)),method+': durée courte non respectée');
 const strength=ctx.NolsEngine.buildProgram({...profile,goal:'strength'}).filter(d=>d.ex.length);
 assert(strength.some((s,i)=>s.ex.some((e,j)=>e.reps!==week[i].ex[j]?.reps)),method+': objectif sans effet sur répétitions');
}
for(const equipment of ['gym','dumbbells','none']){
 const profile={...ctx.NolsEngine.defaults,method:'auto',daysCount:'4',days:[0,1,2,3,4,5,6],equipment};
 const sessions=ctx.NolsEngine.buildProgram(profile).filter(s=>s.ex.length);
 assert(sessions.length===4,'Quatre séances doivent rester possibles avec '+equipment);
 assert(sessions.every(s=>s.ex.length>=3),'Séance incomplète avec '+equipment);
 if(equipment==='none')assert(sessions.every(s=>s.ex.every(e=>!/machine|haltère|presse|barre EZ/i.test(e.name))),'Matériel absent');
}
const beginnerProfile={...ctx.NolsEngine.defaults,days:[0,1,2,3,4,5,6],daysCount:'3',level:'beginner',currentSessions:'0'};
const advancedProfile={...beginnerProfile,level:'advanced',currentSessions:'5'};
const beginnerSets=ctx.NolsEngine.buildProgram(beginnerProfile).flatMap(s=>s.ex).reduce((sum,e)=>sum+e.sets,0);
const advancedSets=ctx.NolsEngine.buildProgram(advancedProfile).flatMap(s=>s.ex).reduce((sum,e)=>sum+e.sets,0);
assert(beginnerSets<advancedSets,'Le volume doit être inférieur pour les débutants');
console.log('Tests avancés : 5 méthodes, 3 équipements, volume, objectif et durée OK');
