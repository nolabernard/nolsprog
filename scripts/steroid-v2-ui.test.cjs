const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('steroid-v2.css','utf8');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('href="./steroid-v2.css"'),'V2 stylesheet must load after base stylesheet');
assert(html.includes('family=Archivo'),'Archivo must be loaded');
assert(html.includes('family=Inter'),'Inter must be loaded');
for(const color of ['#0B4D3B','#F5F0E5','#E6EFE5','#FFFCF7','#073528','#1A2923','#4F6158','#DCE8DD'])assert(css.includes(color),'Missing design token '+color);
// V1 supprimée : plus d'ancien écran de secours, Aujourd'hui / Progrès / Programme passent par la V2.
for(const name of ['function todayUI','function guidedWorkoutUI','function statsUI','function editUI','function archiveUI'])assert(!app.includes(name),'Ancien écran V1 encore présent : '+name);
assert(app.includes('v2Unavailable()'),'Écran de repli sans V1');
assert(css.includes('.tabbar button.active'),'Floating navigation active state missing');
assert(css.includes('prefers-reduced-motion:reduce'),'Reduced motion preference must be respected');
assert(css.includes('min-height:46px'),'Touch targets should remain comfortably tappable');
console.log('STÉROÏDE V2 design-system checks passed.');
// Lot 5 : module d'historique chargé avant le contrôleur, styles présents.
assert(html.indexOf('./v2-history.js')>0&&html.indexOf('./v2-history.js')<html.indexOf('./app-v2.js'),'v2-history.js doit être chargé avant app-v2.js');
assert(html.indexOf('./v2-review.js')>0&&html.indexOf('./v2-review.js')<html.indexOf('./app-v2.js'),'v2-review.js doit être chargé avant app-v2.js');
const sw=fs.readFileSync('sw.js','utf8');assert(sw.includes("addEventListener('push'")&&sw.includes('notificationclick'),'Service worker : rappels');
assert(html.indexOf('./reminders.js')>0&&html.indexOf('./reminders.js')<html.indexOf('./app-v2.js'),'reminders.js avant app-v2.js');
assert(!/service_role|vapid_private\s*[:=]/i.test(fs.readFileSync('reminders.js','utf8')+app),'aucun secret côté app');
assert(app.includes('function recapUI()')&&app.includes("a==='onboard-confirm'")&&app.includes('S.programIntro=true'),'Récapitulatif du questionnaire et présentation du programme');
// Animation d'ouverture : kettlebell au trait, une fois par session, désactivable (réduire les animations), sans script en ligne.
assert(html.includes('id="splash"')&&html.indexOf('./splash.js')<html.indexOf('id="app"'),'Animation d’ouverture avant l’app');
assert(css.includes('@keyframes splash-draw')&&/prefers-reduced-motion:reduce\)\{\.splash-handle/.test(css),'Animation d’ouverture et repli sans mouvement');
assert(fs.readFileSync('splash.js','utf8').includes("sessionStorage.getItem('nolsprog-splash')"),'Une seule fois par session');
assert(!/<script>/.test(html),'Pas de script en ligne (CSP)');
assert(app.includes("account-menu-trigger'+(A.session?' is-signed':'')")&&css.includes('.shell .topbar .header-actions .icon-btn.account-menu-trigger.is-signed{'),'Avatar du compte : rond, distinct connecté / invité');
assert(app.includes("'v2Next' in"),'Formulaire du cycle suivant branché');
for(const c of ['.v2-bullets','.v2-kicker--light','.v2-compare','.v2-diff','.v2-records','.v2-hist','.v2-advice','.v2-seg--2'])assert(css.includes(c),'Style manquant : '+c);
