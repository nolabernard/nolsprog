// Plus aucune fenêtre native du navigateur : tout passe par ui-dialog.js.
const fs=require('fs'),assert=require('assert');
const skip=new Set(['ui-dialog.js','sport-rules.js','sw.js']);
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.js')&&!skip.has(f))){
 const code=fs.readFileSync(f,'utf8').replace(/(^|\s)\/\/[^\n]*/g,'$1');
 // Une fonction locale de même nom (ex. confirm injecté par app.js) n'est pas la fenêtre native.
 const local=n=>new RegExp('[{,(\\s]'+n+'\\s*(=|,|\\})').test(code);
 for(const n of ['prompt','confirm','alert'].filter(n=>!local(n)))assert(!new RegExp('(^|[^\\w.])'+n+'\\(').test(code),n+' natif interdit dans '+f);
 assert(!/window\.(prompt|confirm|alert)\(/.test(code),'window.prompt/confirm/alert interdits dans '+f);
}
console.log('Aucune fenêtre native');
