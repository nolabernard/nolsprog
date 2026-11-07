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
export const methods=definitions;
export function chooseMethod(p){const n=Number(p.daysCount||3);if(p.method&&p.method!=='auto'){if(p.method==='upperlower'&&n===4)return 'upperlower';if(p.method==='ppl'&&(n===3||n===6))return 'ppl';if(p.method==='split'&&n>=4)return 'split';if(p.method==='fullbody'&&n<=3)return 'fullbody';if(p.method==='hybrid'&&n>=4)return 'hybrid'}return n<=3?'fullbody':n===4?'upperlower':n===5?'hybrid':'ppl'}
export function buildProgram(p){const n=Math.max(2,Math.min(6,Number(p.daysCount)||3)),method=chooseMethod(p);const schedule={fullbody:['full','full','full','full','full','full'],upperlower:['upper','lower','upper','lower','upper','lower'],ppl:['push','pull','legs','push','pull','legs'],split:['chest','back','legs','shoulders','upper','lower'],hybrid:['push','pull','legs','upper','lower','full']}[method];const chosen=Array.isArray(p.days)?p.days.map(Number).filter(x=>x>=0&&x<=6):[];let days=[...new Set(chosen)].sort((a,b)=>a-b);if(days.length<n){for(let i=0;i<7&&days.length<n;i++)if(!days.includes(i))days.push(i);days.sort((a,b)=>a-b)}days=days.slice(0,n);const names=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];const beginner=p.level==='beginner';const highFatigue=p.job==='physical'||p.sleep==='under6';const short=Number(p.duration)<=45;const noEquipment=p.equipment==='none'||p.equipment==='dumbbells';const maxMoves=short?4:Number(p.duration)>=75?7:6;const avoid=String(p.avoid||'').toLowerCase().split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x.length>=3);const priority=Array.isArray(p.priority)?p.priority:[];const sessions=days.map((day,i)=>{const type=noEquipment?(p.equipment==='none'?'home':'dumbbells'):schedule[i];let base=moves[type].filter(x=>!avoid.some(a=>x[0].toLowerCase().includes(a)));if(priority.includes('Abdominaux')&&!base.some(x=>/crunch|gainage/i.test(x[0])))base=[...base,['Crunch machine',2,'12–20',60]];if(priority.includes('Épaules')&&!base.some(x=>/latérales/i.test(x[0]))&&type!=='legs'&&type!=='lower')base=[...base,['Élévations latérales haltères',2,'12–20',75]];const items=base.slice(0,maxMoves).map(x=>ex(x[0],Math.max(2,x[1]-(beginner||highFatigue?1:0)),p.goal==='strength'&&/Développé|Rowing|squat|Presse/i.test(x[0])?'5–8':x[2],x[3]));return {day:names[day],title:titles[type]+(i>0&&['upper','lower','full','push','pull','legs'].includes(type)?' '+(Math.floor(i/Math.max(1,schedule.indexOf(type)+1))+1):''),focus:definitions[method].name,ex:items}});return names.map((day,i)=>sessions.find(s=>s.day===day)||{day,title:'Récupération',focus:'Repos / marche douce',ex:[]})}
export const steps=[
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
export const defaults={sex:'',age:'',height:'',weight:'',job:'mixed',activity:'medium',sleep:'7-8',goal:'muscle',level:'intermediate',currentSessions:'2',daysCount:'3',duration:'60',equipment:'gym',priority:[],days:[0,1,2,3,4,5],method:'auto',avoid:'',limitations:'no'};
