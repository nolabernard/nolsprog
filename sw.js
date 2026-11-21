/* STÉROÏDE — mode hors ligne.
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

self.addEventListener('fetch',event=>{
  if(cacheable(event.request))event.respondWith(networkFirst(event.request));
});
