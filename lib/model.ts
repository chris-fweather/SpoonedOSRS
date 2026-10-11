import {validCollectionDate} from './collection-history';
import {validFarmingSchedule} from './farming-timing';
import {validHuntHistory,historicalChance} from './hunt-history';
import {validAcquisition} from './pet-record';
import seed from './catalogue.json';
import {upgradeEstimates,selectedMethod,effortTime,countedMethods,usesAcquisition,oddsMethod} from './estimates';
export type Method={farmingRunsPerDay?:number|null;observedAverageXp?:number|null;rateOverride?:boolean;rateConfirmed?:boolean;paceConfirmed?:boolean;name:string;kc:number|null;rate:number|null;kph:number|null;activity:string|null;unit:string;source:string};
export type Pet={huntHistory?:import('./hunt-history').HuntSegment[];obtainedStartCount?:number|null;obtainedApproximate?:boolean;obtainedUnit?:string;obtainedMethod?:string;plannedMethod?:number;recordedHours?:number|null;historicalXph?:number|null;obtainedCount?:number|null;crateRolls?:number|null;id:string;name:string;category:string;obtained:boolean;methods:Method[];notes:string;priority:boolean;date:string;source:string;sourceRow:string;referenceHours?:number|null};
export type LogItem={id:number;name:string;quantity:number};
export type LogPage={name:string;obtained:number;total:number;items:LogItem[]};
export type CollectionLog={obtained:number;total:number;tabs:{name:string;pages:LogPage[]}[]};
export type Profile={quests:{id:number;name:string;points:number;type:string;state:string}[];diaries:{areaId:number;area:string;tiers:{tier:string;completed:number;total:number}[]}[];combat:{id:number;name:string;completed:number;total:number}[];syncedAt:string};
export type Journal={collectionDates?:Record<string,string>;accountMode?:import('./account-mode').AccountMode|null;details?:import('./profile-privacy').ProfileDetails;restricted?:boolean;visibility?:'public'|'private';calculationVersion?:number;profile?:Profile;username:string;pets:Pet[];hiscores:{skills:{name:string;level:number;xp:number;rank:number}[];activities:{name:string;score:number;rank:number}[]};log:CollectionLog|null;statsSyncedAt:string|null;logSyncedAt:string|null;revision:number};
export const initial=upgradeEstimates(structuredClone(seed) as Journal);
export function likelihood(p:Pet){if(p.huntHistory?.length)return historicalChance(p);const ms=(p.obtained?[oddsMethod(p)!].filter(Boolean):countedMethods(p)).filter(m=>m.rate&&m.kc!==null);return ms.length?1-Math.exp(ms.reduce((s,m)=>s+(!m.kc?0:m.unit==='XP'?-m.kc/m.rate!:m.kc*Math.log1p(-1/m.rate!)),0)):null;}
export function expectedHours(p:Pet){const m=oddsMethod(p);return m?.rate&&m.kph?m.rate/m.kph:null;}
export function estimateReviewed(p:Pet){const m=oddsMethod(p);return !!(m?.rateConfirmed&&m.paceConfirmed);}
export function kcFor(p:Pet){const m=selectedMethod(p);return m?.kc??p.methods.find(x=>x.kc!=null)?.kc??null;}
export function remainingHours(p:Pet){if(p.obtained)return 0;return expectedHours(p);}
export function budgetHours(p:Pet,chance=.95){const m=selectedMethod(p);if(expectedHours(p)===null||!m?.rate||!m.kph)return null;const count=m.unit==='XP'?-Math.log1p(-chance)*m.rate:m.rate===1?1:Math.ceil(Math.log1p(-chance)/Math.log1p(-1/m.rate));return count/m.kph;}
export function hoursSpent(p:Pet,j?:Journal){return effortTime(p,j);}
export function validatePet(p:Pet){return validHuntHistory(p.huntHistory)&&(p.obtainedStartCount==null||(Number.isFinite(p.obtainedStartCount)&&p.obtainedStartCount>=0&&p.obtainedStartCount<=1e12))&&validAcquisition(p)&&(p.obtainedApproximate===undefined||typeof p.obtainedApproximate==='boolean')&&(p.plannedMethod===undefined||(Number.isInteger(p.plannedMethod)&&p.plannedMethod>=0&&p.plannedMethod<p.methods.length))&&[p.recordedHours,p.historicalXph].every(n=>n==null||(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9))&&(p.obtainedCount==null||(typeof p.obtainedCount==='number'&&Number.isFinite(p.obtainedCount)&&p.obtainedCount>=0&&p.obtainedCount<=1e12))&&(p.crateRolls==null||(typeof p.crateRolls==='number'&&Number.isInteger(p.crateRolls)&&p.crateRolls>=0&&p.crateRolls<=1e12))&&typeof p.obtained==='boolean'&&typeof p.priority==='boolean'&&typeof p.notes==='string'&&p.notes.length<=10000&&validCollectionDate(p.date)&&Array.isArray(p.methods)&&p.methods.length<=100&&p.methods.every(m=>validFarmingSchedule(m.farmingRunsPerDay)&&(m.observedAverageXp==null||(typeof m.observedAverageXp==='number'&&Number.isFinite(m.observedAverageXp)&&m.observedAverageXp>0&&m.observedAverageXp<=1e12))&&typeof m.source==='string'&&m.source.length<=4000&&(m.activity===null||typeof m.activity==='string'&&m.activity.length<=200)&&[m.rateOverride,m.rateConfirmed,m.paceConfirmed].every(v=>v===undefined||typeof v==='boolean')&&typeof m.name==='string'&&m.name.length<=200&&typeof m.unit==='string'&&m.unit.length<50&&[m.kc,m.rate,m.kph].every(n=>n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12))&&(m.rate===null||m.rate>=1));}
export function parseLog(raw:unknown):CollectionLog {
 const obj=raw as Record<string,unknown>,log=(obj?.collectionLog??obj?.collection_log??obj) as CollectionLog;
 const count=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=1e9;
 const name=(s:unknown)=>typeof s==='string'&&s.length>0&&s.length<=200;
 if(!log||!Array.isArray(log.tabs)||log.tabs.length>50||!count(log.obtained)||!count(log.total))throw Error('Use a RuneProfile collection-log JSON export.');
 let items=0;
 const tabs=log.tabs.map(t=>{
  if(!t||!name(t.name)||!Array.isArray(t.pages)||t.pages.length>1000)throw Error('Invalid collection log tab.');
  return {name:t.name,pages:t.pages.map(p=>{
   if(!p||!name(p.name)||!Array.isArray(p.items)||!count(p.obtained)||!count(p.total))throw Error('Invalid collection log page.');
   return {name:p.name,obtained:p.obtained,total:p.total,items:p.items.map(i=>{
    if(!i||!Number.isSafeInteger(i.id)||i.id<1||!name(i.name)||!count(i.quantity)||++items>30000)throw Error('Invalid or oversized collection log.');
    return {id:i.id,name:i.name,quantity:i.quantity};
   })};
  })};
 });
 // Return a fresh allowlisted object: never persist provider metadata or uploaded settings.
 return {obtained:log.obtained,total:log.total,tabs};
}
export function mergeLog(j:Journal,log:CollectionLog){const owned=new Set(log.tabs.flatMap(t=>t.pages.flatMap(p=>p.items.filter(i=>i.quantity>0).map(i=>String(i.id)))));j.pets=j.pets.map(p=>owned.has(p.id)?{...p,obtained:true,source:'RuneProfile collection log'}:p);j.log=log;j.logSyncedAt=new Date().toISOString();return j;}
