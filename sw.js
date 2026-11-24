/* STEROID — mode hors ligne.
 * Réseau d'abord : en ligne, l'app se comporte exactement comme sans service worker.
 * Hors ligne (ou réseau trop lent), on sert la dernière version enregistrée.
 * Une seule copie par fichier (paramètres d'URL ignorés), pas d'accumulation.
 * Supabase et version.json ne passent jamais par le cache. */
'use strict';
const CACHE='steroide-v2';
const TIMEOUT_MS=4000;
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
    await self.clients.claim();
  })());
});

function cacheKey(request){
  const url=new URL(request.url);
  if(request.mode==='navigate')return new URL('./',self.registration.scope).href;
  url.search='';url.hash='';return url.href;
}

function cacheable(request){
  if(request.method!=='GET')return false;
  const url=new URL(request.url);
  if(url.origin===self.location.origin)return !url.pathname.endsWith('/version.json');
  return FONT_HOSTS.includes(url.hostname);
}

async function networkFirst(request){
  const cache=await caches.open(CACHE),key=cacheKey(request);
  try{
    const response=await Promise.race([
      fetch(request),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),TIMEOUT_MS))
    ]);
    if(response.ok||response.type==='opaque')await cache.put(key,response.clone());
    return response;
  }catch(err){
    const cached=await cache.match(key);
    if(cached)return cached;
    throw err;
  }
}

// Rappels (lot 7) : notification reçue de la fonction send-reminders.
self.addEventListener('push',event=>{
  let d={};try{d=event.data?event.data.json():{}}catch{d={body:event.data?.text()}}
  event.waitUntil(self.registration.showNotification(d.title||'STEROID',{body:d.body||'Ta prochaine séance t’attend.',icon:'./icon-192.png',badge:'./icon-192.png',tag:d.tag||'steroid-reminder',renotify:true,data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list)if(c.url.startsWith(self.registration.scope)&&'focus' in c)return c.focus();return clients.openWindow(url)}));
});
self.addEventListener('fetch',event=>{
  if(cacheable(event.request))event.respondWith(networkFirst(event.request));
});
