import {acquisitionEffort,receivedMethod} from './hunt-history';
import {atLevel, wikiMethod} from './skill-rates';
import type {Journal,Method,Pet} from './model';
import original from './catalogue.json' with {type: 'json'};
import audited from './audited-rates.json' with {type: 'json'};
export const petSkill:Record<string,string>={'Rocky':'Thieving','Giant Squirrel':'Agility','Heron':'Fishing','Baby chinchompa':'Hunter','Herbi':'Hunter','Quetzin':'Hunter','Rock golem':'Mining','Rift guardian':'Runecraft','Beaver':'Woodcutting','Tangleroot':'Farming','Soup':'Sailing'};

const PHOENIX_ROLLS='OSRS Wiki: 1/5,000 per reward roll. 500 points gives 2 rolls; every further 500 points adds one roll; points between those thresholds are a linear extra-roll chance. Supply crates became reward-cart searches on 9 October 2024, with the same per-roll rate. Hiscores Wintertodt score is subdues, not rolls.';

/** Entered crate rolls win. Subdues are only the fallback, and they are never turned into rolls. */
export function phoenixShownCount(rolls: number | null | undefined, subdues: number | null | undefined): {value: number; unit: 'rolls' | 'subdues'} | null {
  if (rolls != null) return {value: rolls, unit: 'rolls'};
  if (subdues != null) return {value: subdues, unit: 'subdues'};
  return null;
}

export function phoenixRollChance(rolls: number | null | undefined, rate: number | null | undefined): number | null {
  if (rolls == null || rate == null || rate < 1) return null;
  return -Math.expm1(rolls * Math.log1p(-1 / rate));
}
const PHOENIX_200M='OSRS Wiki: at 200 million Firemaking XP the phoenix is 15 times more common, so the roll rate is 1/5,000 divided by 15.';
const OLMLET='OSRS Wiki: 1/53 when a unique is received. Unique chance is 1% per 8,676 team points, capped at 65.7% at 570,000 points; further points roll another unique. A 26,025-point raid is about 1/1,765 from that formula, not this account\'s rate. Hiscores raid count is not a unique count.';

function wikiDrop(name:string,rate:number,unit:string,source:string):Method{
 return {name,rate,kph:null,unit,activity:null,kc:null,source,rateConfirmed:true,paceConfirmed:false};
}
function blankRates(p:Pet){return p.methods.every(m=>m.rate==null&&!m.rateOverride);}
function stampWikiPets(j:Journal){
 for(const p of j.pets){
  if(p.name==='Phoenix'){
   if(blankRates(p)){
    p.methods=[wikiDrop('Wintertodt reward cart',5000,'rolls',PHOENIX_ROLLS),wikiDrop('200 million Firemaking',5000/15,'rolls',PHOENIX_200M)];
    p.plannedMethod=0;
   }
   for(const m of p.methods) if(m.unit==='rolls'&&m.rate!=null&&(m.rate===5000||Math.abs(m.rate-5000/15)<1e-6)) m.rateConfirmed=true;
  }else if(p.name==='Olmlet'){
   if(blankRates(p)){
    p.methods=[wikiDrop('Chambers of Xeric unique',53,'uniques',OLMLET),wikiDrop('Challenge Mode unique',53,'uniques',OLMLET+' Challenge Mode changes how often a unique is rolled, not the 1/53 pet chance.')];
    p.plannedMethod=0;
   }
   for(const m of p.methods) if(m.unit==='uniques'&&m.rate===53) m.rateConfirmed=true;
  }
 }
}
type Listed={match:string;rate:number;unit:string;activity?:string|null;source:string};
const WIKI='https://oldschool.runescape.wiki/w/';
const listed:Record<string,Listed[]>={
 'Jal-Nib-Rek':[{match:'TzKal-Zuk',rate:100,unit:'kills',source:`OSRS Wiki: 1/100 from TzKal-Zuk. ${WIKI}Jal-Nib-Rek`}],
 "Lil' Zik":[{match:'Theatre of Blood',rate:650,unit:'raids',source:`OSRS Wiki: 1/650 from the monumental chest. ${WIKI}Lil%27_zik`}],
 'Tiny tempor':[{match:'Tempoross',rate:8000,unit:'rolls',source:`OSRS Wiki: 1/8,000 from the reward pool. ${WIKI}Tiny_tempor`}],
 'Abyssal protector':[{match:'Abyssal protector',rate:4000,unit:'rewards',source:`OSRS Wiki: 1/4,000 from the Rewards Guardian. ${WIKI}Abyssal_protector`}],
 Yami:[{match:'Yama',rate:2500,unit:'kills',source:`OSRS Wiki: 1/2,500 from Yama. ${WIKI}Yami`},{match:'Yami (Contract)',rate:100,unit:'kills',source:`OSRS Wiki: 1/100 from a Yama contract. ${WIKI}Yami`}],
 'Little Nightmare':[{match:'The Nightmare',rate:800,unit:'kills',activity:'Nightmare',source:`OSRS Wiki: 1/800 from the Nightmare. ${WIKI}Little_nightmare`},{match:"Phosani's Nightmare",rate:1400,unit:'kills',activity:"Phosani's Nightmare",source:`OSRS Wiki: 1/1,400 from Phosani's Nightmare. ${WIKI}Little_nightmare`}],
 Dom:[{match:'Doom of Mokhaiotl',rate:1000,unit:'kills',activity:'Doom of Mokhaiotl',source:`OSRS Wiki: 1/1,000 from Doom of Mokhaiotl. ${WIKI}Dom`}],
 'Maggot marquess':[{match:'Maggot King',rate:3500,unit:'kills',activity:'Maggot King',source:`OSRS Wiki: 1/3,500 from the Maggot King. ${WIKI}Maggot_marquess`}],
 'Mr McGroot':[{match:'Goat hunting',rate:40000,unit:'catches',source:`OSRS Wiki: base chance 1/40,000. At level 99 the table lists 1/37,525. ${WIKI}Mr_McGroot`}],
 Soup:[
  ['Trimming sails',120000],['Sea charting',30000],['The Tempor Tantrum Swordfish',16000],['The Tempor Tantrum Shark',8000],['The Tempor Tantrum Marlin',5334],
  ['The Jubbly Jive Swordfish',11500],['The Jubbly Jive Shark',5750],['The Jubbly Jive Marlin',3834],['The Gwenith Glide Swordfish',9000],['The Gwenith Glide Shark',4500],['The Gwenith Glide Marlin',3000],
  ['Small shipwreck',800000],["Fisherman's shipwreck",500000],['Barracuda shipwreck',300000],['Large shipwreck',280000],['Pirate shipwreck',275000],['Mercenary shipwreck',260000],['Fremennik shipwreck',230000],['Merchant shipwreck',160000],['Deep sea trawling',360000],['Salvage sorting',800000],
 ].map(([match,rate])=>({match:String(match),rate:Number(rate),unit:'actions',source:`OSRS Wiki drop-rate table for Soup. ${WIKI}Soup`})),
};
function blankMethod(row:Listed):Method{return {name:row.match,rate:row.rate,kph:null,unit:row.unit,activity:row.activity??null,kc:null,source:row.source,rateConfirmed:true,paceConfirmed:false};}
function applyListedRates(p:Pet):Pet{
 const rows=listed[p.name];
 if(rows){
  if(!p.methods.length)p={...p,methods:rows.map(blankMethod)};
  else{
   const methods=p.methods.map(m=>{const row=rows.find(r=>r.match===m.name);if(!row||m.rate!=null||m.rateOverride)return m;return {...m,rate:row.rate,unit:row.unit||m.unit,source:row.source,rateConfirmed:true};});
   for(const row of rows)if(!methods.some(m=>m.name===row.match))methods.push(blankMethod(row));
   p={...p,methods};
  }
 }
 if(p.name==='Rift guardian'){
  const selected=p.methods[p.plannedMethod??0];
  if(selected&&selected.rate==null&&selected.kph==null){
   const mind=p.methods.findIndex(m=>m.name==='Mind rune'&&m.kph);
   if(mind>=0)p={...p,plannedMethod:mind};
  }
 }
 return p;
}
export function upgradeEstimates(j:Journal):Journal{
 if((j.calculationVersion??0)>=4)return normalizeRates(j);
 if((j.calculationVersion??0)<2){
  const defaults=original.pets as Pet[];
  j.pets=j.pets.map(p=>{
   const old=defaults.find(x=>x.id===p.id);
   p={...p,plannedMethod:0,methods:p.methods.map(m=>{const om=old?.methods.find(o=>o.name===m.name);const custom=!om||(m.rate!==om.rate||m.kph!==om.kph);const a=(audited as Record<string,{rate:number;url:string;date:string}>)[p.id+'|'+m.name];return {...m,...(!custom&&a?{rate:a.rate,source:`OSRS Wiki rate checked ${a.date}; old spreadsheet pace needs review.`}:{}),rateConfirmed:custom||!!a,paceConfirmed:custom};})};
   const method=(name:string,rate:number,kph:number,unit:string,activity:string|null,source:string):Method=>({name,rate,kph,unit,activity,kc:null,source,rateConfirmed:true,paceConfirmed:true});
   if(p.name==='TzRek-Jad'&&!p.methods.some(m=>m.paceConfirmed)){
    const kc=p.methods.find(m=>m.activity==='TzTok-Jad')?.kc??null;
    const historical=p.methods.filter(m=>m.activity!=='TzTok-Jad'&&m.kc!==null);
    p.methods=[{...method('Fight Caves · off task, keep cape',200,j.username.toLowerCase()==='obifloat'?2:60/45,'runs','TzTok-Jad','OSRS Wiki: 1/200 per off-task completion. Pace: '+(j.username.toLowerCase()==='obifloat'?'your stated 30':'example 45')+' minutes per successful full run.'),kc},method('Fight Caves · off task, sacrifice cape',1/(1-(199/200)**2),j.username.toLowerCase()==='obifloat'?2:60/45,'runs',null,'OSRS Wiki: completion 1/200 plus independent cape exchange 1/200. Historical KC is not copied into this mode.'),method('Fight Caves · on task, sacrifice cape',1/(1-(99/100)*(199/200)),j.username.toLowerCase()==='obifloat'?2:60/45,'runs',null,'OSRS Wiki: on-task completion 1/100 plus cape exchange 1/200. Task acquisition time must be included in your pace.')];
    p.methods.push(...historical);
   }
   if(p.name==="Lil' Creator"&&!p.methods.some(m=>m.paceConfirmed))p.methods=[method('Spoils of war · 150 Zeal/hour example',400,5,'crates',null,'OSRS Wiki: one 1/400 pet roll per crate; each crate costs 30 Zeal. Example pace 150 Zeal/hour = 5 crates/hour. Adjust to your measured pace.'),...p.methods.filter(m=>m.kc!==null)];
   if(p.name==='Rocky'){
    const level=j.hiscores.skills.find(s=>s.name==='Thieving')?.level||99;
    p.methods=[method('Ardougne knights',257211-25*level,2000,'pickpockets',null,`OSRS Wiki: 1 / (257,211 − 25 × level). Level ${level}; example 2,000 successful pickpockets/hour. One roll per successful pickpocket.`),method('Seed stall',36490-25*level,1200,'thefts',null,`OSRS Wiki: 1 / (36,490 − 25 × level). Level ${level}; example 1,200 successful thefts/hour. Setup and guards affect pace.`),...p.methods.map(m=>({...m,rateConfirmed:false,paceConfirmed:false}))];
   }
   return p;
  });
 }
 stampWikiPets(j);
 j.pets=j.pets.map(applyListedRates);
 for(const p of j.pets) if(p.name==='Phoenix') for(const m of p.methods) {
  if(m.unit==='rolls' && m.kph==null && m.source.startsWith('OSRS Wiki:')) {
   m.kph=50;m.paceConfirmed=false;
   m.source+=' Planning pace: Temple/Petcord reference 50 reward rolls/hour; replace with your measured rolls/hour. https://templeosrs.com/pets/hours.php';
  }
 }
 // The Wiki's Nex denominator is a base roll before contribution, not a personal kill rate.
 for(const p of j.pets) if(p.name==='Nexling') for(const m of p.methods) {
  if(m.name==='Nex' && m.rate===500 && /spreadsheet pace|OSRS Wiki rate checked/.test(m.source)) {
   m.rate=4100;m.rateConfirmed=false;
   m.source='Temple/Petcord planning benchmark: 1/4,100 at 23.5 kills/hour (about 174 h). Nex has a base 1/500 roll adjusted by contribution and MVP. This is not a verified personal rate. https://oldschool.runescape.wiki/w/Nex';
  }
 }
 j.calculationVersion=4;
 return normalizeRates(j);
}
export function selectedMethod(p:Pet){return p.methods[p.plannedMethod??0];}
export function lifetimeSkill(p:Pet,j:Journal){return j.hiscores.skills.find(s=>s.name===petSkill[p.name]);}
/** One live activity count cannot be assigned to several alternative methods at once. */
export function countedMethods(p:Pet):Method[]{
 const planned=selectedMethod(p),seen=new Set<string>();
 return [planned,...p.methods.filter(m=>m!==planned)].filter((m):m is Method=>{
  if(!m||m.kc==null)return false;
  if(m.activity){const key=m.activity.toLowerCase();if(seen.has(key))return false;seen.add(key);}
  return true;
 });
}
export function effortTime(p:Pet,_j?:Journal):number|null{
 if(p.obtained||p.huntHistory?.length||p.recordedHours!=null)return acquisitionEffort(p).hours;
 // Lifetime skill XP includes lamps, quests and unrelated methods. Never treat it as hunt time.
 const counted=countedMethods(p);
 if(!counted.length||counted.some(m=>!m.kph))return null;
 return counted.reduce((s,m)=>s+m.kc!/m.kph!,0);
}
export function totalEffort(j:Journal){return j.pets.reduce((hours,p)=>hours+(effortTime(p,j)??0),0);}

/** Keep all views on the current-level method denominator; never turn game KC into reward rolls. */
export function normalizeRates(j:Journal):Journal {
 for(const p of j.pets) {
  for(const m of p.methods) {
   if(p.name==='Tangleroot'&&m.name==='Farming runs'&&m.unit==='XP'&&m.kph==null&&!m.paceConfirmed&&m.source.startsWith('Mixed tree-run estimate:')){m.kph=mixedFarmingMethod(99).kph;m.source+=' Example active pace: 6 magic and 6 palm trees in 15 minutes, excluding growth time; edit to your route.';}
   if(p.name==='Tiny tempor' && m.name==='Tempoross' && m.rate===8000 && (m.unit==='games'||m.activity==='Tempoross')) {
    m.unit='rolls'; m.kc=null; m.kph=null; m.activity=null;
    m.source='OSRS Wiki: 1/8,000 per reward-pool roll. Hiscores games do not count as reward rolls. https://oldschool.runescape.wiki/w/Tiny_tempor';
   }
   if(p.name==='Phoenix' && m.unit==='rolls') {
    const xp=j.hiscores.skills.find(s=>s.name==='Firemaking')?.xp;
    // Selecting a future boosted method must not retroactively boost earlier rolls.
    m.kc=m.rate===5000 && xp!=null && xp<200_000_000 ? p.crateRolls??null : null;
   }
   const wm=wikiMethod(p.name,m.name), skill=j.hiscores.skills.find(s=>s.name===petSkill[p.name]);
   if(!wm||!skill||m.rateOverride) continue;
   const calc=atLevel(wm,skill.level);
   if(!calc) continue;
   const rate=m.unit==='XP'?calc.expectedXp:calc.actions;
   if(rate!=null && rate>0) {m.rate=rate;m.rateConfirmed=true;}
  }
 }
 return j;
}

/** Acquisition is a separate observation, never copied into live KC or another unit. */
export function usesAcquisition(p:Pet):boolean {
 const m=receivedMethod(p);return !!(p.obtained&&!p.huntHistory?.length&&p.obtainedCount!=null&&(p.obtainedStartCount??0)<=p.obtainedCount&&m?.rate&&(p.name==='Tiny tempor'&&p.obtainedUnit==='permits'?'rolls':p.obtainedUnit??(petSkill[p.name]?'XP':m.unit))===m.unit);
}
export function oddsMethod(p:Pet):Method|undefined {
 const received=receivedMethod(p),m=p.obtained?(received??selectedMethod(p)):selectedMethod(p);
 return m&&p.obtained?{...m,...(received&&m.unit==='XP'&&p.historicalXph!=null?{kph:p.historicalXph,paceConfirmed:true}:{}),kc:usesAcquisition(p)?Math.max(0,p.obtainedCount!-(p.obtainedStartCount??0)):null}:m;
}
/** Optional approximation, not a reconstruction of the player's actual crop history. */
export function mixedFarmingMethod(level:number,kind:'mixed'|'fruit'='mixed'):Method {
 const l=Math.max(1,Math.min(99,level));
 // Wiki: planting + health check XP. Equal numbers of magic and palm trees.
 const xpPerPair=kind==='fruit'?10260.6:13913.8+10260.6;
 const rate=-xpPerPair/((kind==='fruit'?0:Math.log1p(-1/(9368-25*l)))+Math.log1p(-1/(9000-25*l)));
 const minutes=kind==='fruit'?10:15,kph=Math.round(xpPerPair*6*60/minutes);
 return {name:kind==='fruit'?'Fruit-tree runs':'Farming runs',unit:'XP',kc:null,kph,rate,rateOverride:true,rateConfirmed:false,paceConfirmed:false,activity:null,source:`${kind==='fruit'?'Fruit-tree estimate: six palm trees in 10 active minutes.':'Mixed tree-run estimate: six magic and six palm trees in 15 active minutes.'} Example active pace ${kph.toLocaleString()} XP/hour, excluding growth/wait time; edit to your actual route. Planting plus health-check XP, no fruit-harvest XP. Fixed level ${l}. Assumes the entered XP came from this mix; earlier levels, other crops, quests and lamps are not reconstructed. https://oldschool.runescape.wiki/w/Tree_farming_guide https://oldschool.runescape.wiki/w/Tangleroot`};
}
