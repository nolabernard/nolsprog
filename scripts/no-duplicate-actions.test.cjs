// Une action ne doit être gérée qu'une fois : un `case` en double capte l'action et rend l'autre bouton inopérant.
const assert=require('assert'),fs=require('fs'),path=require('path');
for(const f of ['app-v2.js','app.js']){
 const src=fs.readFileSync(path.join(__dirname,'..',f),'utf8'),seen=new Map();
 for(const m of src.matchAll(/case '([a-z0-9-]+)':/g))seen.set(m[1],(seen.get(m[1])||0)+1);
 const dup=[...seen].filter(([,n])=>n>1).map(([k])=>k);
 assert.deepStrictEqual(dup,[],f+' : actions en double '+dup.join(', '));
}
console.log('Actions uniques : ok');
