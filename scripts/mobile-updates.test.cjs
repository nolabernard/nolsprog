const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app-updates.js','utf8'),html=fs.readFileSync('index.html','utf8'),deploy=fs.readFileSync('.github/workflows/deploy.yml','utf8'),app=fs.readFileSync('app.js','utf8');
assert(html.includes('app-updates.js'));assert(html.includes('name="steroid-version" content="dev"'));
assert(deploy.includes("version.json"));assert(deploy.includes("path: dist"));assert(deploy.includes("GITHUB_SHA"));assert(app.includes('hasPendingChanges(A.session?.user?.id)'));
const old='a'.repeat(40),fresh='b'.repeat(40);
let isSafe=false,latest=old,redirect='',checks=0,updateCount=0,timeout=null,interval=null;
const elements=new Map();
function node(){return {children:[],className:'',textContent:'',disabled:false,append(...xs){this.children.push(...xs)},setAttribute(){},addEventListener(name,cb){this[name]=cb},querySelector(selector){if(selector==='button')return this.children[1];if(selector==='.steroid-update-description')return this.children[0].children[1]}}}
const document={baseURI:'https://example.org/nolsprog/',visibilityState:'visible',body:{append(el){elements.set(el.id,el)}},querySelector:sel=>sel.includes('steroid-version')?{content:old}:null,getElementById:id=>elements.get(id)||null,createElement:()=>node(),addEventListener(){}};
const location={href:'https://example.org/nolsprog/',replace(url){redirect=url}};
const context={window:{addEventListener(){}},document,location,URL,Date,console,setTimeout:fn=>timeout=fn,setInterval:fn=>interval=fn,fetch:async(url,opts)=>{checks++;assert.equal(opts.cache,'no-store');return {ok:true,json:async()=>({version:latest})}}};
vm.runInNewContext(source,context);
const manager=context.window.SteroidUpdates;
(async()=>{
 manager.start({isSafe:()=>isSafe,autoOnLaunch:true,onUpdate:()=>updateCount++});
 await timeout();assert.equal(redirect,'');assert.equal(manager.state.available,null);
 latest=fresh;await manager.check();assert.equal(updateCount,1);assert.equal(redirect,'');
 assert(elements.get('steroid-update-banner'),'New version should show non-blocking banner');
 assert.equal(manager.apply(),false,'Cannot reload during active workout or unsynced data');
 isSafe=true;manager.refresh();assert.equal(elements.get('steroid-update-banner').querySelector('button').disabled,false);
 assert.equal(manager.apply(),true,'Safe user can apply update');
 assert(redirect.includes('v='+fresh),'Reload should bypass old HTML cache');
 assert.equal(manager.state.current,old);
 console.log('PASS: version detection, no-cache polling, unsafe blocking, banner, safe cache-busted reload');
})().catch(e=>{console.error(e);process.exitCode=1});