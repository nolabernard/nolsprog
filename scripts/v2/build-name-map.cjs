// Migration V2 : associe chaque nom d'exercice saisi à une clé du catalogue.
// Usage : node scripts/v2/build-name-map.cjs < noms.json > correspondances.json
// Entrée : [{user_id, raw_name}] ; sortie : [{user_id, raw_name, exercise_key, method, score}]
const crypto=require('crypto');
const C=require('../../exercise-catalogue.js');
const NAMESPACE='6f3c1b2e-5a4d-4c8b-9e1f-2d7a8b9c0e11'; // fixe : ne jamais changer

function uuidV5(name){
 const ns=Buffer.from(NAMESPACE.replace(/-/g,''),'hex');
 const h=crypto.createHash('sha1').update(Buffer.concat([ns,Buffer.from(name,'utf8')])).digest();
 h[6]=(h[6]&0x0f)|0x50;h[8]=(h[8]&0x3f)|0x80;
 const x=h.subarray(0,16).toString('hex');
 return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
}

function buildNameMap(rows,{overrides={}}={}){
 const forced=new Map(Object.entries(overrides).map(([k,v])=>[C.normalize(k),v]));
 return rows.map(({user_id,raw_name})=>{
  const n=C.normalize(raw_name);
  if(forced.has(n))return {user_id,raw_name,exercise_key:forced.get(n),method:'manual',score:1,role:C.byKey(forced.get(n))?.role||'finition'};
  const hit=C.resolveName(raw_name);
  if(hit)return {user_id,raw_name,exercise_key:hit.key,method:hit.method,score:hit.score,role:C.byKey(hit.key).role};
  return {user_id,raw_name,exercise_key:'u-'+uuidV5(user_id+'|'+n),method:'custom',score:0,role:'finition'};
 });
}

if(require.main===module){
 const fs=require('fs'),path=require('path');
 const overridesFile=path.join(__dirname,'name-overrides.json');
 const overrides=fs.existsSync(overridesFile)?JSON.parse(fs.readFileSync(overridesFile,'utf8')):{};
 const rows=JSON.parse(fs.readFileSync(0,'utf8'));
 process.stdout.write(JSON.stringify(buildNameMap(rows,{overrides}),null,1)+'\n');
}
module.exports={buildNameMap,uuidV5};
