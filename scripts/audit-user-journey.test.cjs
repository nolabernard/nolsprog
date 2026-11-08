const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners={},store={},requests=[],user={id:'audit-test-user',email:'audit@example.invalid',user_metadata:{first_name:'Camille'}};
let signupMode='verify',networkDown=false,program=null,profile=null,sets=[],fetchCount=0;
const root={innerHTML:'',addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={document:{getElementById:id=>id==='app'?root:null,addEventListener:()=>{},visibilityState:'visible',scrollingElement:{scrollTop:0}},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},window:{addEventListener:()=>{},scrollTo:()=>{}},clearTimeout:()=>{},clearInterval:()=>{},setInterval:()=>0,crypto:require('node:crypto').webcrypto,Date,console,Math,Number,String,Array,JSON,Intl,Map,Set,setTimeout:()=>0,URL,URLSearchParams,location:{hash:'',pathname:'/nolsprog/',search:'',origin:'https://nolabernard.github.io'},history:{replaceState:()=>{}},Blob,structuredClone,globalThis:null,FormData:class{constructor(form){this.data=form.fields}}};
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
for(const file of ['sport-rules.js','sport-guide.js','program-engine.js','sport-session.js','sport-import.js','sport-progression.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
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
 await click('tab',{tab:'edit'});assert(state('S.draft!==null'),'Editor should have draft');
 const before=state('S.draft[0].ex.map(e=>e.id)');assert(before.length>1);
 await click('move-exercise',{day:'0',index:'0',step:'1'});assert.equal(state('S.draft[0].ex[1].id'),before[0],'Exercise should move down');
 await click('save-plan');await tick();assert.equal(state('S.plan[0].ex[1].id'),before[0],'Saved plan should preserve exercise ID and new order');
 assert.equal(program.plan[0].ex[1].id,before[0],'Edited plan should sync to Supabase');
 await click('day',{day:'0'});await click('workout-classic');assert.equal(state('activeWorkout().status'),'active');await click('workout-request-finish');await click('workout-cancel-finish');assert.equal(state('activeWorkout().status'),'active');await click('workout-request-finish');await click('workout-confirm-finish');assert.equal(state('activeWorkout().status'),'finished');
 await click('logout');assert.equal(state('A.session'),null);assert.equal(state('A.view'),'welcome');assert.equal(state('S.logs.length'),0);
 await click('auth-login');await submit({email:'audit@example.invalid',password:'strong-test-123'});assert.equal(state('A.view'),'app');assert.equal(state('S.plan[0].ex[1].id'),before[0],'Program should restore from cloud after login');
 console.log('PASS: signup validation, duplicate account, confirmation flow, login, onboarding, generator, reorder, save/sync, workout finish, logout, cloud reload');
})().catch(err=>{console.error(err);process.exitCode=1});