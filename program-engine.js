// Moteur déterministe de programmation : pas d'appel à une IA, pas de diagnostic médical.
const ex=(name,sets,reps,rest)=>({id:crypto.randomUUID?.()||('ex-'+Math.random().toString(36).slice(2)),name,sets,reps,rest});
const moves={
push:[['Développé couché barre',3,'6–10',150],['Développé incliné haltères',3,'8–12',120],['Développé épaules machine',2,'8–12',120],['Élévations latérales haltères',3,'12–20',75],['Extension triceps corde',3,'10–15',75]],
pull:[['Tirage vertical prise neutre',3,'8–12',120],['Rowing machine appui poitrine',3,'8–12',120],['Rowing unilatéral haltère',2,'10–12',90],['Reverse pec deck',3,'12–20',75],['Curl barre EZ',3,'8–12',75]],
legs:[['Hack squat',3,'6–10',180],['Presse à cuisses',3,'10–12',120],['Soulevé de terre roumain',3,'8–10',150],['Leg curl assis',3,'10–15',90],['Mollets debout',3,'10–15',75],['Crunch machine',3,'12–20',60]],
upper:[['Développé incliné machine',3,'8–12',120],['Rowing machine appui poitrine',3,'8–12',120],['Tirage vertical prise large',3,'10–12',120],['Développé épaules haltères',2,'8–12',120],['Élévations latérales haltères',3,'12–20',75],['Curl incliné haltères',2,'10–15',75],['Extension triceps corde',2,'10–15',75]],
lower:[['Hack squat',3,'6–10',180],['Soulevé de terre roumain',3,'8–10',150],['Leg curl assis',3,'10–15',90],['Leg extension',2,'12–15',75],['Mollets assis',3,'12–20',75],['Crunch machine',3,'12–20',60]],
full:[['Presse à cuisses',3,'8–12',120],['Développé couché haltères',3,'8–12',120],['Tirage vertical prise neutre',3,'8–12',120],['Soulevé de terre roumain',2,'8–10',150],['Élévations latérales haltères',2,'12–20',75],['Crunch machine',2,'12–20',60]],
chest:[['Développé couché barre',3,'6–10',150],['Développé incliné haltères',3,'8–12',120],['Pec deck',3,'12–15',75],['Développé épaules machine',2,'8–12',120],['Extension triceps corde',3,'10–15',75]],
back:[['Tirage vertical prise neutre',3,'8–12',120],['Rowing machine appui poitrine',3,'8–12',120],['Rowing unilatéral haltère',3,'10–12',90],['Reverse pec deck',3,'12–20',75],['Curl barre EZ',3,'10–15',75]],
shoulders:[['Développé épaules haltères',3,'8–12',120],['Élévations latérales haltères',4,'12–20',75],['Reverse pec deck',3,'12–20',75],['Curl pupitre',3,'10–15',75],['Extension triceps corde',3,'10–15',75]],
home:[['Squat au poids du corps',3,'10–20',90],['Pompes inclinées',3,'8–15',90],['Fentes arrière',3,'8–12',90],['Rowing avec sac à dos',3,'10–15',90],['Gainage',3,'30–45 s',60]],
dumbbells:[['Goblet squat',3,'8–12',120],['Développé couché au sol haltères',3,'8–12',120],['Rowing unilatéral haltère',3,'8–12',120],['Soulevé de terre roumain haltères',3,'8–12',120],['Élévations latérales haltères',2,'12–20',75],['Crunch',2,'12–20',60]]
};
const titles={push:'Push — Pectoraux, épaules, triceps',pull:'Pull — Dos, biceps',legs:'Legs — Jambes',upper:'Upper — Haut du corps',lower:'Lower — Bas du corps',full:'Full body — Corps entier',chest:'Pectoraux & triceps',back:'Dos & biceps',shoulders:'Épaules & bras',home:'Corps entier à domicile',dumbbells:'Corps entier avec haltères'};
const definitions={
auto:{name:'Choix recommandé',description:'NolsProg choisit la répartition selon tes jours disponibles et ton expérience.'},
fullbody:{name:'Full body',description:'Chaque séance travaille l’ensemble du corps. Très efficace avec 2 à 3 séances hebdomadaires.'},
upperlower:{name:'Upper / Lower',description:'Alternance haut et bas du corps. Permet de travailler chaque groupe musculaire environ deux fois par semaine sur 4 jours.'},
ppl:{name:'Push / Pull / Legs',description:'Push = poussée, Pull = tirage, Legs = jambes. Adapté à 3 ou 6 séances par semaine.'},
split:{name:'Split musculaire',description:'Séances centrées sur certains groupes musculaires. Plus adapté aux pratiquants expérimentés et à 4 à 6 séances.'},
hybrid:{name:'Hybride',description:'Combine Push/Pull/Legs et haut du corps ou séances spécialisées. Utile sur 5 jours.'}
};
const methods=definitions;
function chooseMethod(p){
 const n=Number(p.daysCount||3);
 if(p.method&&p.method!=='auto'&&Object.hasOwn(definitions,p.method))return p.method;
 return n<=3?'fullbody':n===4?'upperlower':n===5?'hybrid':'ppl';
}

/* Catalogue de mouvements : équipement, patron moteur, priorité musculaire.
   Les choix restent reproductibles pour un profil donné, sans tirage aléatoire. */
const catalogue=[
 ['Développé couché barre','pushH','Pectoraux','gym',3],['Développé couché haltères','pushH','Pectoraux','gym',2],['Développé incliné machine','pushH','Pectoraux','gym',2],['Développé incliné haltères','pushH','Pectoraux','gym',2],['Développé convergent pectoraux','pushH','Pectoraux','gym',2],['Pec deck','chestIso','Pectoraux','gym',1],
 ['Tirage vertical prise neutre','pullV','Dos','gym',2],['Tirage vertical prise large','pullV','Dos','gym',2],['Tractions assistées','pullV','Dos','gym',2],['Rowing machine appui poitrine','pullH','Dos','gym',2],['Rowing T-bar appui poitrine','pullH','Dos','gym',2],['Rowing unilatéral haltère','pullH','Dos','gym',2],
 ['Hack squat','squat','Jambes','gym',2],['Presse à cuisses','squat','Jambes','gym',2],['Squat guidé','squat','Jambes','gym',2],['Fentes arrière','squat','Jambes','gym',2],['Soulevé de terre roumain','hinge','Jambes','gym',2],['Hip thrust','hinge','Jambes','gym',2],['Leg curl assis','hamIso','Jambes','gym',1],['Leg extension','quadIso','Jambes','gym',1],['Mollets debout','calves','Jambes','gym',1],['Mollets assis','calves','Jambes','gym',1],
 ['Développé épaules haltères','pushV','Épaules','gym',2],['Développé épaules machine','pushV','Épaules','gym',2],['Élévations latérales haltères','side','Épaules','gym',1],['Élévations latérales poulie','side','Épaules','gym',1],['Reverse pec deck','rear','Épaules','gym',1],['Oiseau haltères','rear','Épaules','gym',1],
 ['Curl barre EZ','biceps','Bras','gym',1],['Curl incliné haltères','biceps','Bras','gym',1],['Curl pupitre','biceps','Bras','gym',1],['Curl marteau haltères','biceps','Bras','gym',1],['Extension triceps corde','triceps','Bras','gym',1],['Extension triceps au-dessus de la tête haltère','triceps','Bras','gym',1],['Pushdown triceps barre','triceps','Bras','gym',1],
 ['Crunch machine','core','Abdominaux','gym',1],['Gainage','core','Abdominaux','any',1],['Crunch','core','Abdominaux','any',1],['Gainage latéral','core','Abdominaux','any',1],
 ['Goblet squat','squat','Jambes','dumbbells',2],['Fentes arrière haltères','squat','Jambes','dumbbells',2],['Soulevé de terre roumain haltères','hinge','Jambes','dumbbells',2],['Hip thrust haltère','hinge','Jambes','dumbbells',2],
 ['Développé couché au sol haltères','pushH','Pectoraux','dumbbells',2],['Développé épaules haltères','pushV','Épaules','dumbbells',2],['Rowing unilatéral haltère','pullH','Dos','dumbbells',2],['Rowing haltères buste penché','pullH','Dos','dumbbells',2],['Élévations latérales haltères','side','Épaules','dumbbells',1],['Curl haltères','biceps','Bras','dumbbells',1],['Extension triceps haltère','triceps','Bras','dumbbells',1],
 ['Squat au poids du corps','squat','Jambes','none',2],['Squat tempo','squat','Jambes','none',2],['Fentes arrière','squat','Jambes','none',2],['Fentes latérales','squat','Jambes','none',2],['Pont fessier','hinge','Jambes','none',2],['Soulevé de terre avec sac à dos','hinge','Jambes','none',2],['Pompes','pushH','Pectoraux','none',2],['Pompes inclinées','pushH','Pectoraux','none',2],['Rowing avec sac à dos','pullH','Dos','none',2]
].map(([name,pattern,muscle,equipment,compound])=>({name,pattern,muscle,equipment,compound}));
const plans={
 fullbody:[['squat','pushH','pullH','hinge','side','core'],['hinge','pullV','pushH','squat','biceps','core'],['squat','pushV','pullH','hinge','triceps','core']],
 upperlower:[['pushH','pullH','pullV','pushV','side','biceps','triceps'],['squat','hinge','hamIso','quadIso','calves','core'],['pullV','pushH','pullH','pushV','rear','triceps','biceps'],['hinge','squat','quadIso','hamIso','calves','core']],
 ppl:[['pushH','pushV','chestIso','side','triceps'],['pullV','pullH','rear','biceps','core'],['squat','hinge','hamIso','calves','core'],['pushH','pushV','side','chestIso','triceps'],['pullH','pullV','rear','biceps','core'],['hinge','squat','quadIso','calves','core']],
 split:[['pushH','chestIso','pushV','side','triceps'],['pullV','pullH','rear','biceps','core'],['squat','hinge','quadIso','hamIso','calves'],['pushV','side','rear','biceps','triceps'],['pullH','pushH','pullV','side','biceps'],['hinge','squat','hamIso','calves','core']],
 hybrid:[['pushH','pushV','side','triceps','chestIso'],['pullV','pullH','rear','biceps','core'],['squat','hinge','hamIso','calves','core'],['pushH','pullH','pullV','pushV','side','biceps'],['hinge','squat','quadIso','hamIso','calves','core'],['squat','pushH','pullH','hinge','side','core']]
};
function selectTrainingDays(available,n){
 const days=[...new Set(available.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort((a,b)=>a-b);
 if(days.length<n)return null;
 let best=null,score=-Infinity;
 function visit(from,picked){
  if(picked.length===n){
   const gaps=picked.map((d,i)=>(picked[(i+1)%n]-d+7)%7||7);
   const variance=gaps.reduce((s,g)=>s+(g-7/n)**2,0);
   const candidate=Math.min(...gaps)*100-gaps.filter(g=>g===1).length*35-variance*7-picked.reduce((s,d)=>s+d,0)*.01;
   if(candidate>score){score=candidate;best=[...picked]}return;
  }
  for(let i=from;i<=days.length-(n-picked.length);i++)visit(i+1,[...picked,days[i]]);
 }
 visit(0,[]);return best;
}
function stableHash(value){let h=2166136261;for(const ch of String(value)){h=Math.imul(h^ch.charCodeAt(0),16777619)}return h>>>0}
function selectExercise(pattern,p,used,sessionIndex,slotIndex,history,avoid){
 const equipment=p.equipment||'gym';
 let candidates=catalogue.filter(x=>x.pattern===pattern&&(x.equipment==='any'||x.equipment===equipment||(equipment==='dumbbells'&&x.equipment==='none'))&&!avoid.some(a=>x.name.toLowerCase().includes(a))&&!used.has(x.name));
 if(!candidates.length)return null;
 const profile=[p.goal,p.level,p.equipment,p.priority,p.age,p.job,p.sleep,p.activity].join('|');
 candidates.sort((a,b)=>{
  const score=x=>history.get(x.name)*25+(stableHash(profile+'|'+sessionIndex+'|'+slotIndex+'|'+x.name)%101)/101+(p.level==='beginner'&&/barre|tractions|soulevé de terre/i.test(x.name)?3:0);
  return score(a)-score(b);
 });
 return candidates[0];
}
function patternMap(pattern,equipment){
 if(equipment==='gym')return pattern;
 const fallback={
  pullV:'pullH',chestIso:'pushH',quadIso:'squat',hamIso:'hinge',calves:'squat',
  rear:'pullH',side:equipment==='none'?'pushH':'side',
  biceps:equipment==='none'?'pullH':'biceps',triceps:equipment==='none'?'pushH':'triceps',
  pushV:equipment==='none'?'pushH':'pushV'
 };
 return fallback[pattern]||pattern;
}
function parameters(x,p,index,sessionIndex){
 const beginner=p.level==='beginner'||Number(p.currentSessions)<=1;
 const fatigue=p.job==='physical'||p.sleep==='under6'||p.activity==='high';
 const experienced=p.level==='advanced'&&Number(p.currentSessions)>=3;
 const compound=x.compound===2;
 const focus=(p.priority||[]).includes(x.muscle);
 let sets=compound?(experienced?4:3):experienced?3:2;
 if(beginner||fatigue)sets=Math.max(2,sets-1);
 if(focus&&!beginner&&!fatigue)sets=Math.min(4,sets+1);
 if(Number(p.duration)<=30)sets=Math.min(sets,3);
 const ranges={
 strength:compound?['4–6','5–8','6–8']:['8–12','10–12','10–15'],
 muscle:compound?['6–10','8–12','10–12']:['10–15','12–15','12–20'],
 fatloss:compound?['8–12','10–12','10–15']:['12–15','12–20','10–15'],
 fitness:compound?['8–12','10–15','12–15']:['10–15','12–20','12–15'],
 restart:compound?['10–12','10–15','8–12']:['12–15','10–15','12–20']
 };
 const list=ranges[p.goal]||ranges.muscle;
 let reps=list[(sessionIndex+index)%list.length];
 if(x.pattern==='core')reps=/Gainage/i.test(x.name)?'25–45 s':'12–20';
 const rest=compound?(p.goal==='strength'?150:120):x.pattern==='core'?60:75;
 return ex(x.name,sets,reps,rest);
}
// Conservative time budget: warm-up, working sets, inter-set rest and transitions.
function estimatedMinutes(items){
 let minutes=6;
 for(const item of items){
  const compound=/squat|presse|soulevé|développé|rowing|tirage|traction|fente|hip thrust/i.test(item.name);
  minutes+=(item.sets*(compound?50:40)+Math.max(0,item.sets-1)*item.rest)/60+0.75;
 }
 return Math.ceil(minutes);
}
function fitDuration(items,p){
 const limit=Number(p.duration);
 if(!Number.isFinite(limit)||limit<=0)return items;
 const budget=limit*1.1;
 // Preserve at least two sets per movement; remove the least important accessory
 // before shortening the primary movement. Never silently change method.
 while(estimatedMinutes(items)>budget){
  let candidate=-1;
  for(let i=items.length-1;i>=0;i--){
   if(items[i].sets>2){candidate=i;break}
  }
  if(candidate>=0){items[candidate].sets--;continue}
  if(items.length>2){items.pop();continue}
  break;
 }
 return items;
}
function buildProgram(p,weekIndex=0){
 if(!Number.isInteger(weekIndex)||weekIndex<0||weekIndex>51)throw Error('Semaine de programmation invalide.');
 const n=Math.max(2,Math.min(6,Number(p.daysCount)||3));
 const days=selectTrainingDays(Array.isArray(p.days)?p.days:[],n);
 if(!days)throw Error('Choisis au moins '+n+' jours disponibles pour tes '+n+' séances.');
 const method=chooseMethod(p),equipment=p.equipment||'gym',names=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
 const short=Number(p.duration)<=45;
 const maxMoves=method==='fullbody'?Number(p.duration)<=30?5:short?6:Number(p.duration)>=75?8:7:Number(p.duration)<=30?3:short?4:Number(p.duration)>=75?7:6;
 const avoid=String(p.avoid||'').toLowerCase().split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x.length>=3);
 const history=new Map(catalogue.map(x=>[x.name,0]));
 const priorities=Array.isArray(p.priority)?p.priority:[];
 const adaptive={
  split:{
    2:[['pushH','pullH','squat','chestIso','biceps','core'],['hinge','pullV','pushV','hamIso','side','triceps']],
    3:[['pushH','pullH','chestIso','biceps','core'],['squat','hinge','quadIso','hamIso','calves'],['pushV','pullV','side','triceps','rear']]
  },
  ppl:{
    2:plans.ppl.slice(0,3),
    4:plans.ppl.slice(0,3),
    5:[...plans.ppl.slice(0,3),['pushH','pullH','pushV','biceps'],['squat','hinge','hamIso','core']]
  },
  upperlower:{2:plans.upperlower.slice(0,2),3:plans.upperlower.slice(0,2)},
  hybrid:{2:plans.fullbody.slice(0,2),3:[plans.upperlower[0],plans.upperlower[1],plans.fullbody[2]]}
 };
 const schedule=adaptive[method]?.[n]||plans[method]||plans.fullbody;
 const continuous=(method==='ppl'&&n<=5)||(method==='upperlower'&&n===3);
 const sessionOffset=continuous?(weekIndex*n)%schedule.length:0;
 const sessions=days.map((day,i)=>{
  const rotationIndex=(sessionOffset+i)%schedule.length;
  let patterns=[...schedule[rotationIndex]];
  if(equipment!=='gym'){
   // Preserve the training split where possible; use viable substitutions for limited equipment.
   patterns=patterns.map(pattern=>patternMap(pattern,equipment));
  }
  if(method==='fullbody'){
   patterns=[...([['squat','pushH','pullH','hinge','pushV','core','biceps','calves'],['hinge','pullV','pushH','squat','side','core','triceps','hamIso'],['squat','pullH','pushV','hinge','pushH','core','biceps','calves']][(weekIndex*n+i)%3])].map(pattern=>patternMap(pattern,equipment));
  }
  // Promote requested muscle groups within the relevant session, without removing primary movement coverage.
  const musclesFor={Pectoraux:['pushH','chestIso'],Dos:['pullH','pullV'],Épaules:['side','pushV'],Bras:['biceps','triceps'],Jambes:['squat','hinge'],Abdominaux:['core']};
  const extra=priorities.flatMap(m=>musclesFor[m]||[]).map(pattern=>patternMap(pattern,equipment));
  if(extra.length&&maxMoves>3){for(const pattern of extra){if(patterns.includes(pattern))continue;if(patterns.length<maxMoves+1)patterns.push(pattern)}}
  const used=new Set(),items=[];
  for(let slot=0;slot<patterns.length&&items.length<maxMoves;slot++){
   const pattern=patterns[slot];
   const x=selectExercise(pattern,p,used,i,slot,history,avoid);
   if(!x)continue;
   used.add(x.name);history.set(x.name,(history.get(x.name)||0)+1);
   items.push(parameters(x,p,items.length,i));
  }
  if(!items.length)throw Error('Aucun exercice compatible avec tes contraintes. Modifie les exercices à éviter ou ton équipement.');
  if(method==='fullbody'){
   // Full body = au moins une poussée, un tirage et une dominante jambes, même en 30 min.
   // Réduire les séries plutôt que supprimer des groupes musculaires.
   for(const item of items)item.sets=Math.min(item.sets,Number(p.duration)<=45?2:3);
  }else fitDuration(items,p);
  const types={fullbody:'Full body',upperlower:continuous?(rotationIndex%2?'Lower':'Upper'):(i%2?'Lower':'Upper'),ppl:continuous?['Push','Pull','Legs'][rotationIndex]:['Push','Pull','Legs'][i%3],split:n===2?['Pectoraux + dos','Jambes + épaules'][i]:n===3?['Pectoraux + dos','Jambes','Épaules + bras'][i]:['Pectoraux','Dos','Jambes','Épaules','Upper','Lower'][i%6],hybrid:n===2?['Full body dominante haut','Full body dominante bas'][i]:n===3?['Upper','Lower','Full body'][i]:['Push','Pull','Legs','Upper','Lower','Full body'][i%6]};
  const title=(types[method]||'Séance')+' '+String.fromCharCode(65+Math.floor((sessionOffset+i)/(method==='ppl'?3:method==='upperlower'?2:1))%6);
  return {day:names[day],title,focus:definitions[method].name,ex:items};
 });
 return names.map(day=>sessions.find(s=>s.day===day)||{day,title:'Récupération',focus:'Repos / marche douce',ex:[]});
}

const steps=[
{title:'Ton profil',subtitle:'Quelques repères pour adapter la charge de travail à ton quotidien.',fields:[
{key:'sex',label:'Sexe (facultatif)',type:'select',options:[['','Je préfère ne pas préciser'],['female','Femme'],['male','Homme'],['other','Autre']]},
{key:'age',label:'Âge',type:'number',min:18,max:100,placeholder:'28'},
{key:'height',label:'Taille (cm)',type:'number',min:100,max:240,placeholder:'175'},
{key:'weight',label:'Poids (kg)',type:'number',min:30,max:300,placeholder:'75'},
{key:'job',label:'Ton activité professionnelle',type:'select',options:[['desk','Principalement assis'],['mixed','Assis et debout'],['standing','Principalement debout / déplacements'],['physical','Travail physique']]},
{key:'activity',label:'Activité hors entraînement',type:'select',options:[['low','Faible'],['medium','Modérée'],['high','Élevée']]},
{key:'sleep',label:'Sommeil moyen',type:'select',options:[['under6','Moins de 6 h'],['6-7','6 à 7 h'],['7-8','7 à 8 h'],['over8','Plus de 8 h']]}]},
{title:'Tes objectifs',subtitle:'Nous adaptons le programme à tes priorités et à ton temps.',fields:[
{key:'goal',label:'Objectif principal',type:'select',options:[['muscle','Prendre du muscle'],['strength','Gagner en force'],['fatloss','Perdre de la masse grasse'],['fitness','Être en meilleure forme'],['restart','Reprendre régulièrement']]},
{key:'level',label:'Expérience',type:'select',options:[['beginner','Débutant'],['intermediate','Intermédiaire'],['advanced','Confirmé']]},
{key:'currentSessions',label:'Séances actuelles par semaine',type:'select',options:[['0','Aucune'],['1','1 séance'],['2','2 séances'],['3','3 séances'],['4','4 séances'],['5','5 séances ou plus']]},
{key:'daysCount',label:'Séances souhaitées par semaine',type:'select',options:[['2','2 séances'],['3','3 séances'],['4','4 séances'],['5','5 séances'],['6','6 séances']]},
{key:'duration',label:'Durée par séance',type:'select',options:[['30','30 min'],['45','45 min'],['60','60 min'],['75','75 min'],['90','90 min']]},
{key:'equipment',label:'Lieu / équipement',type:'select',options:[['gym','Salle équipée'],['dumbbells','Domicile avec haltères'],['none','Domicile sans matériel']]},
{key:'priority',label:'Muscles prioritaires (plusieurs choix)',type:'multi',options:['Pectoraux','Dos','Épaules','Bras','Jambes','Abdominaux']}]},
{title:'Ton organisation',subtitle:'Choisis tes disponibilités et la méthode qui te plaît.',fields:[
{key:'days',label:'Jours disponibles (sélection multiple)',type:'days',options:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']},
{key:'method',label:'Méthode d’entraînement',type:'methods',options:Object.entries(definitions)},
{key:'avoid',label:'Exercices à éviter (facultatif)',type:'text',placeholder:'Ex. tractions, dips, squat barre'},
{key:'limitations',label:'Douleur ou limitation à prendre en compte ?',type:'select',options:[['no','Non'],['yes','Oui, je vérifierai avec un professionnel les mouvements adaptés']]}]}
];
const defaults={sex:'',age:'',height:'',weight:'',job:'mixed',activity:'medium',sleep:'7-8',goal:'muscle',level:'intermediate',currentSessions:'2',daysCount:'3',duration:'60',equipment:'gym',priority:[],days:[0,1,2,3,4,5],method:'auto',avoid:'',limitations:'no'};

globalThis.NolsEngine={methods,chooseMethod,buildProgram,steps,defaults,estimatedMinutes,exerciseCatalogue:catalogue.map(x=>({name:x.name,pattern:x.pattern,muscle:x.muscle,compound:x.compound}))};
