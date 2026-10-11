import type {Pet,Method} from './model';
import {acquisitionUnit,xpAtLevel} from './pet-record';

export type HuntSegment={method:string;unit:string;count:number|null;pace:number|null;rate:number|null};
export function validHuntHistory(value:unknown):boolean {
 if(value===undefined)return true;
 return Array.isArray(value)&&value.length<=30&&value.every(s=>s&&typeof s==='object'&&typeof s.method==='string'&&s.method.trim().length>0&&s.method.length<=200&&typeof s.unit==='string'&&s.unit.length>0&&s.unit.length<50&&s.unit!=='level'&&['count','pace','rate'].every(k=>s[k]===null||(typeof s[k]==='number'&&Number.isFinite(s[k])&&s[k]>= (k==='count'?0:k==='rate'?1:0.001)&&s[k]<=1e12))&&(s.count===null||s.unit==='XP'||Number.isInteger(s.count)));
}
export function receivedMethod(p:Pet):Method|undefined {
 const label=p.obtainedMethod?.trim().toLowerCase();
 if(p.name==='Tiny tempor'&&['permits','permit','reward permits','reward pool','tempoross'].includes(label??''))return p.methods.find(m=>m.name==='Tempoross'&&['rolls','permits'].includes(m.unit));
 return p.methods.find(m=>m.name.trim().toLowerCase()===label);
}
export function historicalChance(p:Pet):number|null {
 if(!p.huntHistory?.length)return null;
 if(p.huntHistory.some(s=>s.count==null||!s.rate))return null;
 if(p.huntHistory.every(s=>s.count===0))return 0;
 return -Math.expm1(p.huntHistory.reduce((sum,s)=>sum+(s.count===0?0:s.unit==='XP'?-s.count!/s.rate!:s.count!*Math.log1p(-1/s.rate!)),0));
}
export function acquisitionEffort(p:Pet):{hours:number|null;range?:[number,number];basis:string} {
 if(p.recordedHours!=null)return {hours:p.recordedHours,basis:'Manually recorded hours'};
 if(p.huntHistory?.length){
  if(p.huntHistory.some(s=>s.count==null||!s.pace))return {hours:null,basis:'Add a count and hourly pace for every historical method.'};
  return {hours:p.huntHistory.reduce((sum,s)=>sum+s.count!/s.pace!,0),basis:'Sum of each historical method’s count ÷ its saved pace. Rate assumptions are snapshots.'};
 }
 if(p.obtainedCount==null)return {hours:null,basis:'Acquisition count is not recorded. Current Hiscores are not time to obtain this pet.'};
 const unit=acquisitionUnit(p),m=receivedMethod(p),start=p.obtainedStartCount??0;
 const pace=(unit==='XP'||unit==='level')?(p.historicalXph??(m?.unit==='XP'?m.kph:null)):(m?.unit===unit?m.kph:null);
 if(!pace)return {hours:null,basis:'Choose the received-from method and a matching hourly pace, or enter recorded hours.'};
 const assumption=p.obtainedStartCount==null?' Assumes the hunt started at 0; enter the starting count to exclude earlier progress.':'';
 if(unit==='level'){
  const low=xpAtLevel(p.obtainedCount),high=p.obtainedCount===99?200_000_000:xpAtLevel(p.obtainedCount+1)-1;
  if(start>high)return {hours:null,basis:'Starting XP exceeds the received-at level.'};
  return {hours:null,range:[Math.max(0,low-start)/pace,(high-start)/pace],basis:`Level ${p.obtainedCount} gives an XP range, not exact XP. Range ÷ ${pace.toLocaleString()} XP/hour.${assumption}`};
 }
 if(start>p.obtainedCount)return {hours:null,basis:'Starting count exceeds the received-at count.'};
 return {hours:(p.obtainedCount-start)/pace,basis:`(${p.obtainedCount.toLocaleString()} − ${start.toLocaleString()}) ${unit} ÷ ${pace.toLocaleString()} ${unit}/hour.${assumption}${unit==='XP'?' Only XP earned through the chosen pet-eligible method should count.':''}`};
}
