/* STEROID V2 — rappels (notifications web), côté app.
 * Abonnement de cet appareil + réglages (heure, jours) dans public.push_subscriptions ; l'envoi est fait par la fonction
 * Supabase « send-reminders ». Dépendances injectées (navigateur, API) : testé sous Node. Jours : 0 = lundi. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidReminders=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DEFAULT={enabled:false,hour:18,minute:0,days:[0,1,2,3,4,5,6]};
function b64(buf){return buf?btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):''}
function key(str){const s=(str+'='.repeat((4-str.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
const clean=s=>({hour:Math.min(23,Math.max(0,Math.round(Number(s.hour))||0)),minute:[0,15,30,45].includes(Number(s.minute))?Number(s.minute):0,
 days:[...new Set((s.days||[]).map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6))].sort((a,b)=>a-b)});

function create({nav=globalThis.navigator,win=globalThis,api,storage,userId}){
 const K='nolsprog-v2-reminders:'+(userId||'guest');
 const read=()=>{try{return {...DEFAULT,...JSON.parse(storage.getItem(K)||'{}')}}catch{return {...DEFAULT}}};
 const write=v=>{try{storage.setItem(K,JSON.stringify(v))}catch{}};
 // Pourquoi les rappels ne sont pas possibles ici (null = possibles).
 function blocker(){
  if(!userId||!api)return 'account';
  if(!nav?.serviceWorker||!('PushManager' in win)||!('Notification' in win)){
   const ios=/iPad|iPhone|iPod/.test(nav?.userAgent||'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
   const installed=win.matchMedia?.('(display-mode: standalone)')?.matches||nav?.standalone===true;
   return ios&&!installed?'install':'unsupported';
  }
  if(win.Notification.permission==='denied')return 'denied';
  return null;
 }
 function state(){return {...read(),blocker:blocker()}}
 // Enregistré par la fonction : un appareil déjà abonné par un autre compte (ou sans stockage local) est rattaché au compte connecté.
 async function save(row){const r=await api.fn('send-reminders',{method:'POST',body:{action:'save',sub:row}});if(!r?.id)throw Error('Rappels non enregistrés. Réessaie dans un instant.');return r.id}
 function rowOf(s){return {endpoint:s.endpoint,p256dh:s.p256dh,auth:s.auth,enabled:s.enabled,hour:s.hour,minute:s.minute,days:s.days,
  timezone:(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Paris'}catch{return 'Europe/Paris'}})()}}
 async function enable(settings={}){
  const b=blocker();if(b)throw Error(MESSAGES[b]);
  const s={...read(),...clean({...read(),...settings})};
  if(!s.days.length)throw Error('Choisis au moins un jour.');
  const perm=await win.Notification.requestPermission();
  if(perm!=='granted')throw Error('Notifications refusées. Autorise-les dans les réglages du navigateur pour recevoir les rappels.');
  const reg=await nav.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){const {publicKey}=await api.fn('send-reminders?vapid=1',{method:'GET'});sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key(publicKey)})}
  const j=sub.toJSON?.()||{};
  const next={...s,enabled:true,endpoint:sub.endpoint,p256dh:j.keys?.p256dh||b64(sub.getKey?.('p256dh')),auth:j.keys?.auth||b64(sub.getKey?.('auth'))};
  next.id=await save(rowOf(next));write(next);return state();
 }
 async function update(settings={}){
  const s={...read(),...clean({...read(),...settings})};
  if(s.enabled&&!s.days.length)throw Error('Choisis au moins un jour, ou désactive les rappels.');
  if(s.enabled&&s.endpoint)s.id=await save(rowOf(s));
  write(s);return state();
 }
 async function disable(){
  const s=read();
  if(s.endpoint)await api.fn('send-reminders',{method:'POST',body:{action:'remove',endpoint:s.endpoint}});
  try{const reg=await nav.serviceWorker?.ready;const sub=await reg?.pushManager?.getSubscription();await sub?.unsubscribe()}catch{}
  const {id,endpoint,p256dh,auth,...rest}=s;write({...rest,enabled:false});return state();
 }
 async function test(){const r=await api.fn('send-reminders',{method:'POST',body:{test:true}});return r?.sent||0}
 return {state,enable,update,disable,test};
}
const MESSAGES={account:'Connecte-toi à ton compte pour recevoir des rappels.',
 install:'Sur iPhone, ajoute d’abord STEROID à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvre-la depuis l’icône.',
 unsupported:'Ce navigateur ne permet pas les notifications.',
 denied:'Notifications bloquées pour ce site. Autorise-les dans les réglages du navigateur.'};
return {create,MESSAGES,DEFAULT};
});
