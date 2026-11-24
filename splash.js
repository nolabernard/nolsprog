/* STEROID — animation d'ouverture (kettlebell). Une fois par session d'onglet ; un tapotement la passe ;
 * « réduire les animations » : simple fondu. Script synchrone placé juste après #splash : retiré avant le premier
 * affichage quand elle a déjà été vue. */
// Thème appliqué avant le premier affichage (Réglages : auto / clair / sombre, enregistré sur l'appareil).
(function(){try{var t=localStorage.getItem('nolsprog-theme')||'auto',d=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('theme-dark',d)}catch(e){}})();
(function(){
 var el=document.getElementById('splash');if(!el)return;
 var seen=false;try{seen=sessionStorage.getItem('nolsprog-splash')==='1';sessionStorage.setItem('nolsprog-splash','1')}catch(e){}
 if(seen){el.remove();return}
 var reduce=false;try{reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
 var gone=false;
 function done(){if(gone)return;gone=true;el.classList.add('is-out');setTimeout(function(){el.remove()},400)}
 var t=setTimeout(done,reduce?600:1700);
 el.addEventListener('click',function(){clearTimeout(t);done()});
})();
