/* STÉROÏDE: lightweight update manager for GitHub Pages and iOS home-screen installs. */
(function(global){
  'use strict';
  const current=document.querySelector('meta[name="steroid-version"]')?.content||'dev';
  const endpoint=new URL('./version.json',document.baseURI);
  let available=null, checking=false, started=false, lastNotice=null, firstCheck=true;
  const state={current,get available(){return available}};
  let options={};
  function safe(){try{return options.isSafe?.()===true}catch{return false}}
  function status(text){let box=document.getElementById('steroid-update-banner');if(!box){
    box=document.createElement('aside');box.id='steroid-update-banner';box.className='steroid-update-banner';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
    const label=document.createElement('div');label.className='steroid-update-copy';
    const title=document.createElement('strong');title.textContent='STÉROÏDE évolue';
    const description=document.createElement('p');description.className='steroid-update-description';
    label.append(title,description);
    const button=document.createElement('button');button.type='button';button.className='steroid-update-button';button.textContent='Mettre à jour';
    button.addEventListener('click',()=>apply());
    box.append(label,button);document.body.append(box);
  }
  box.querySelector('.steroid-update-description').textContent=text;
  box.querySelector('button').disabled=!safe();
  box.querySelector('button').textContent=safe()?'Mettre à jour':'En attente';
  return box;
  }
  function apply(){
    if(!available||!safe()){if(available)status('Ta séance ou des données non synchronisées sont en cours. La mise à jour attendra.');return false}
    // Versioned navigation forces a fresh HTML response and matching versioned assets.
    const url=new URL(location.href);url.searchParams.set('v',available);url.hash='';
    location.replace(url.href);return true;
  }
  async function check(){
    if(checking||current==='dev')return;
    checking=true;
    try{
      const url=new URL(endpoint.href);url.searchParams.set('_',String(Date.now()));
      const response=await fetch(url.href,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)return;
      const info=await response.json(),version=info?.version;
      if(typeof version!=='string'||!/^[a-f0-9]{40}$/.test(version)||version===current)return;
      available=version;
      if(lastNotice!==version){lastNotice=version;options.onUpdate?.(version)}
      if(firstCheck&&options.autoOnLaunch&&safe())apply();
      else status(safe()?'Une nouvelle version est disponible.':'Nouvelle version disponible : termine ta séance et synchronise tes données.');
    }catch(err){console.warn('Vérification de version indisponible',err)}
    finally{checking=false;firstCheck=false}
  }
  function start(opts={}){
    if(started)return;started=true;options=opts;
    if(current==='dev')return;
    setTimeout(check,2500);
    setInterval(check,5*60*1000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
    global.addEventListener('online',check);
  }
  global.SteroidUpdates={start,check,apply,state,refresh(){if(available)status(safe()?'Une nouvelle version est disponible.':'Mise à jour en attente : termine la séance et synchronise tes données.')}};
})(window);
