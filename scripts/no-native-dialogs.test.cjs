// Plus aucune fenêtre native du navigateur : tout passe par ui-dialog.js.
const fs=require('fs');const assert=require('assert');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(!/(^|[^\w.])(prompt|confirm|alert)\(/.test(app),'prompt/confirm/alert natifs interdits dans app.js');
assert(html.indexOf('ui-dialog.js')>0&&html.indexOf('ui-dialog.js')<html.indexOf('app.js'),'ui-dialog.js doit être chargé avant app.js');
const d=require('../ui-dialog.js');for(const k of ['open','confirm','yesNo','ask','range'])assert.equal(typeof d[k],'function');
assert.deepEqual(d.range(0,30,15),[0,15,30]);
console.log('In-app dialog checks passed');
