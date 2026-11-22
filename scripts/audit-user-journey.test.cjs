const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const appSource=fs.readFileSync('app.js','utf8');
const listeners={},store={},requests=[],user={id:'audit-test-user',email:'audit@example.invalid',user_metadata:{first_name:'Camille'}};
let signupMode='verify',networkDown=false,program=null,profile=null,sets=[],fetchCount=0;
const root={innerHTML:'',addEventListener:(type,fn)=>listeners[type]=fn,appendChild:()=>{},querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={navigator:{onLine:true,vibrate:()=>{}},confirm:()=>true,SteroidDialog:{confirm:async()=>true,yesNo:async()=>true,ask:async()=>null,open:async()=>null,range:(a,b,s=1)=>{const o=[];for(let n=a;n<=b;n+=s)o.push(n);return o}},prompt:()=>null,document:{getElementById:id=>id==='app'?root:null,createElement:tag=>({tagName:tag,className:'',style:{},setAttribute:()=>{},remove:()=>{},textContent:''}),addEventListener:()=>{},visibilityState:'visible',scrollingElement:{scrollTop:0}},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},window:{addEventListener:()=>{},scrollTo:()=>{}},clearTimeout:()=>{},clearInterval:()=>{},setInterval:()=>0,crypto:require('node:crypto').webcrypto,Date,console,Math,Number,String,Array,JSON,Intl,Map,Set,setTimeout:()=>0,URL,URLSearchParams,location:{hash:'',pathname:'/nolsprog/',search:'',origin:'https://nolabernard.github.io'},history:{replaceState:()=>{}},Blob,structuredClone,globalThis:null,FormData:class{constructor(form){this.data=form.fields}get(key){return this.data[key]??null}}};
ctx.globalThis=ctx;
ctx.fetch=async(url,opts={})=>{fetchCount++;if(networkDown)throw Error('Offline');const path=url.replace('https://femtfigampvaeetcuoxe.supabase.co',''),body=opts.body?JSON.parse(opts.body):null;requests.push({path,method:opts.method,body});let data=null,status=200;
if(path.startsWith('/auth/v1/signup')){if(signupMode==='error'){status=400;data={message:'Email already registered'}}else data=signupMode==='verify'?{user:{...user}}:{access_token:'fake-token',refresh_token:'fake-refresh',expires_in:3600,user:{...user}}}
else if(path==='/auth/v1/user'){data={...user}}
else if(path.includes('token?grant_type=password')){data={access_token:'fake-token',refresh_token:'fake-refresh',expires_in:3600,user:{...user}}}
else if(path.includes('token?grant_type=refresh_token')){data={access_token:'fake-token',refresh_token:'fake-refresh',expires_in:3600,user:{...user}}}
else if(path.startsWith('/rest/v1/user_profiles')){if(opts.method==='POST'){profile={answers:body.answers,method:body.method};data=null}else data=profile?[profile]:[]}
else if(path.startsWith('/rest/v1/user_programs')){if(opts.method==='POST'){program={plan:body.plan,start_date:body.start_date};data=null}else data=program?[program]:[]}
else if(path.startsWith('/rest/v1/workout_sets')){if(opts.method==='POST'){sets.push(...body);data=null}else data=sets}
else if(path.startsWith('/auth/v1/logout'))data=null;
else if(path.startsWith('/auth/v1/recover'))data={};
else if(path.startsWith('/auth/v1/resend'))data={};
return {ok:status<400,status,text:async()=>data===null?'':JSON.stringify(data)}};
vm.createContext(ctx);
for(const file of ['sport-rules.js','sport-guide.js','program-engine.js','sport-session.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const state=expr=>vm.runInContext(expr,ctx);
const click=async(action,fields={})=>{await listeners.click({target:{closest:()=>({dataset:{action,...fields}})}})};
const submit=async(fields)=>{await listeners.submit({target:{id:'auth-form',fields},preventDefault:()=>{}})};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 assert(root.innerHTML.includes('Créer')||root.innerHTML.includes('Commencer'));
 await click('auth-signup');assert(root.innerHTML.includes('name="first_name"'),'Signup should require first name');
 let count=fetchCount;await submit({email:'audit@example.invalid',password:'short',first_name:'Camille'});assert.equal(fetchCount,count,'Weak password must not hit server');
 count=fetchCount;await submit({email:'audit@example.invalid',password:'strong-test-123',first_name:''});assert.equal(fetchCount,count,'Missing first name must not hit server');
 signupMode='error';await submit({email:'audit@example.invalid',password:'strong-test-123',first_name:'Camille'});assert(root.innerHTML.includes('Créer mon compte'),'Duplicate signup should remain in signup screen');
 signupMode='verify';await submit({email:'audit@example.invalid',password:'strong-test-123',first_name:'Camille'});assert.equal(state('A.mode'),'verify','Unconfirmed account should request email confirmation');
 const signupReq=requests.find(r=>r.path.startsWith('/auth/v1/signup')&&r.body?.data?.first_name==='Camille');assert(signupReq,'Signup must pass first name to Supabase');
 await click('auth-login');await submit({email:'audit@example.invalid',password:'strong-test-123'});assert.equal(state('A.view'),'onboard','First login without profile should open onboarding');
 const p={...ctx.NolsEngine.defaults,method:'upperlower',daysCount:'4',days:[0,1,3,5],equipment:'gym',level:'advanced',currentSessions:'4',duration:'75'};
 ctx.auditProfile=p;state('A.answers=auditProfile');await state('finishOnboarding()');await tick();
 assert.equal(state('A.view'),'app','Onboarding should finish');assert(profile&&program,'Profile and plan must be saved to Supabase');assert.equal(program.plan.length,7);assert.equal(program.plan.filter(d=>d.ex.length).length,4);
 // Compatibilité : séries V1 restées en attente sur l'appareil (saisies avant la V2).
 const uid='audit-test-user',pending=[{user_id:uid,week_number:1,day_index:0,exercise_id:'ex-legacy',set_number:1,weight:60,reps:8,completed:true}];
 store['steroid-pending-sets-v1:'+uid]=JSON.stringify(pending);
 state('restorePending("audit-test-user")');assert.equal(state('pendingFor("audit-test-user").length'),1,'Les séries V1 en attente doivent être relues après rechargement');
 state('setSession({...A.session,user:{id:"other-test-user",email:"other@example.invalid"}})');assert.equal(state('pendingSets.size'),0,'Un autre compte ne doit pas voir les séries en attente');
 state('setSession({...A.session,user:{id:"audit-test-user",email:"audit@example.invalid"}})');assert.equal(state('pendingFor("audit-test-user").length'),1,'Le compte retrouve ses séries en attente');
 networkDown=true;await state('flushSets()');assert(store['steroid-pending-sets-v1:'+uid],'Hors ligne : les séries en attente sont conservées');
 await click('logout');assert(state('A.session!==null'),'Déconnexion bloquée tant que des séries ne sont pas envoyées');
 networkDown=false;const before=sets.length;await state('flushSets()');
 assert.equal(sets.length,before+1,'Au retour du réseau, la série V1 en attente est envoyée');assert(!store['steroid-pending-sets-v1:'+uid],'File vidée après confirmation du serveur');
 // V1 supprimée : plus d'éditeur ni de séance V1 ; le compte se déconnecte et se reconnecte proprement.
 await click('logout');assert.equal(state('A.session'),null);assert.equal(state('A.view'),'welcome');
 assert(!store['nolsprog-account-audit-test-user'],'Logout must clear account data cache');
 await click('auth-login');await submit({email:'audit@example.invalid',password:'strong-test-123'});assert.equal(state('A.view'),'app');
 assert(!/guidedWorkoutUI|todayUI|statsUI|editUI/.test(appSource),'Ancien écran V1 supprimé');
 console.log('PASS: signup validation, duplicate account, confirmation flow, login, onboarding, logout, reload');
})().catch(err=>{console.error(err);process.exitCode=1});