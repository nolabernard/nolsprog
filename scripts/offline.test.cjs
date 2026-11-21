// Mode hors ligne : le service worker existe, est enregistré en production et ne met jamais Supabase en cache.
const fs=require('fs');const assert=require('assert');
const sw=fs.readFileSync('sw.js','utf8'),updates=fs.readFileSync('app-updates.js','utf8');
assert(updates.includes("serviceWorker.register('./sw.js')"),'Le service worker doit être enregistré');
assert(/if\(current==='dev'\)return;\s*if\(global\.navigator\?\.serviceWorker\)/.test(updates),'Pas de service worker en développement');
const listeners={};const self={addEventListener:(t,f)=>listeners[t]=f,location:{origin:'https://nolabernard.github.io'},registration:{scope:'https://nolabernard.github.io/nolsprog/'}};
new Function('self','caches','fetch',sw)(self,{open:()=>new Promise(()=>{})},()=>{});
const calls=[];const ev=url=>({request:{url,method:'GET',mode:'cors'},respondWith:()=>calls.push(url)});
for(const u of ['https://nolabernard.github.io/nolsprog/app.js?v=1','https://fonts.gstatic.com/x.woff2'])listeners.fetch(ev(u));
for(const u of ['https://femtfigampvaeetcuoxe.supabase.co/rest/v1/x','https://nolabernard.github.io/nolsprog/version.json?_=1'])listeners.fetch(ev(u));
listeners.fetch({request:{url:'https://nolabernard.github.io/nolsprog/app.js',method:'POST'},respondWith:()=>calls.push('post')});
assert.deepEqual(calls,['https://nolabernard.github.io/nolsprog/app.js?v=1','https://fonts.gstatic.com/x.woff2']);
console.log('Offline service worker checks passed');
