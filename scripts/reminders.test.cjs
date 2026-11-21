// Rappels côté app : abonnement, réglages, désactivation, cas impossibles expliqués.
const assert=require('assert');
const R=require('../reminders.js');
function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function browser({permission='default',grant='granted',ua='Mozilla/5.0 (Linux; Android 14)',push=true}={}){
 let sub=null;const calls=[];
 const pm={async getSubscription(){return sub},async subscribe(o){calls.push(['subscribe',o.applicationServerKey.length]);sub={endpoint:'https://push.example/abc',toJSON:()=>({keys:{p256dh:'P',auth:'A'}}),async unsubscribe(){calls.push(['unsubscribe']);sub=null}};return sub}};
 const win={Notification:{permission,async requestPermission(){return grant}},matchMedia:()=>({matches:false})};if(push)win.PushManager=function(){};
 return {nav:{userAgent:ua,serviceWorker:push?{ready:Promise.resolve({pushManager:pm})}:undefined},win,calls};
}
// Fausse fonction send-reminders : enregistrement par endpoint (le dernier compte gagne), retrait par endpoint.
function fakeApi(user='u1',shared){const rows=shared||new Map(),calls=[];return {rows,calls,async fn(name,o){calls.push([name,o.method,o.body?.action]);if(name.includes('vapid'))return {publicKey:'BGuq_252SEfLOdMt1rWxFUQfGUf0ZFbh8rcom-A0LYYV8olXnFF6Xl2aN6nvy4jio3Q8l5NOwYy4WjhPzT8n9UY'};
 if(o.body?.action==='save'){const old=rows.get(o.body.sub.endpoint);const id=old?.id||'id-'+rows.size;rows.set(o.body.sub.endpoint,{id,user_id:user,...o.body.sub});return {id}}
 if(o.body?.action==='remove'){if(rows.get(o.body.endpoint)?.user_id===user)rows.delete(o.body.endpoint);return {ok:true}}return {sent:1}}}}

(async()=>{
 let n=0;const uuid=()=>'id-'+(++n);
 // Invité : pas de rappels, message clair.
 assert.equal(R.create({...browser(),api:null,storage:memory(),userId:null}).state().blocker,'account');
 // iPhone dans Safari (pas installée) : il faut l'ajouter à l'écran d'accueil.
 const ios=browser({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',push:false});
 assert.equal(R.create({...ios,api:fakeApi(),storage:memory(),userId:'u'}).state().blocker,'install');
 assert.match(R.MESSAGES.install,/écran d’accueil/);
 assert.equal(R.create({...browser({permission:'denied'}),api:fakeApi(),storage:memory(),userId:'u'}).state().blocker,'denied');

 // Activation : permission, clé publique, abonnement, ligne enregistrée avec le fuseau.
 const b=browser(),api=fakeApi(),st=memory();
 let r=R.create({...b,api,storage:st,userId:'u1'});
 let s=await r.enable({hour:'7',minute:'30',days:[4,0,2,2]});
 assert.equal(s.enabled,true);assert.deepEqual(s.days,[0,2,4]);assert.equal(s.hour,7);assert.equal(s.minute,30);
 const row=[...api.rows.values()][0];
 assert.equal(row.endpoint,'https://push.example/abc');assert.equal(row.p256dh,'P');assert.equal(row.user_id,'u1');assert(row.timezone);assert.equal(s.id,row.id);
 assert.deepEqual(b.calls[0],['subscribe',65],'clé VAPID décodée (65 octets)');
 // Réglage modifié : même ligne mise à jour, pas de doublon.
 r=R.create({...b,api,storage:st,userId:'u1'});
 s=await r.update({hour:20,minute:7,days:[5]});assert.equal(api.rows.size,1);assert.equal([...api.rows.values()][0].hour,20);assert.equal(s.minute,0,'minutes au quart d’heure');
 await assert.rejects(r.update({days:[]}),/au moins un jour/);
 // Réactiver sur le même appareil : même identifiant.
 await r.enable({});assert.equal(api.rows.size,1);
 // Essai.
 assert.equal(await r.test(),1);assert.deepEqual(api.calls.at(-1).slice(0,2),['send-reminders','POST']);
 // Désactivation : ligne supprimée, abonnement retiré, réglages gardés.
 s=await r.disable();assert.equal(s.enabled,false);assert.equal(api.rows.size,0);assert.equal(s.hour,20);assert(b.calls.some(c=>c[0]==='unsubscribe'));
 // Permission refusée : rien d'enregistré.
 const api2=fakeApi('u2');await assert.rejects(R.create({...browser({grant:'denied'}),api:api2,storage:memory(),userId:'u2'}).enable({}),/refusées/);assert.equal(api2.rows.size,0);
 // Même téléphone, autre compte (ou stockage perdu) : l'appareil est rattaché au compte connecté, sans doublon.
 const shared=new Map(),phone=browser();
 await R.create({...phone,api:fakeApi('A',shared),storage:memory(),userId:'A'}).enable({});
 await R.create({...phone,api:fakeApi('B',shared),storage:memory(),userId:'B'}).enable({});
 assert.equal(shared.size,1);assert.equal([...shared.values()][0].user_id,'B');
 console.log('reminders : ok');
})().catch(e=>{console.error(e);process.exit(1)});
