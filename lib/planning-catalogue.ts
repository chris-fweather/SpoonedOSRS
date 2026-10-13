import {initial,type Journal} from './model';
/** A pet method staff can plan: its default pace and, for kill or action methods, its default pet rate (1 in N). */
export type PlanningTarget={key:string;pet:string;method:string;unit:string;pace:number|null;rate:number|null};
export function planningCatalogue():PlanningTarget[]{return initial.pets.flatMap(p=>p.methods.map(m=>({key:'planning:'+JSON.stringify([p.id,m.name]),pet:p.name,method:m.name,unit:m.unit,pace:m.kph,rate:m.unit==='XP'?null:m.rate})));}
export function parsePlanning(target:unknown,pace:unknown,averageXp:unknown,rate:unknown=null){
 const known=planningCatalogue().find(t=>t.key===target);if(!known)throw Error('Choose a supported pet method.');
 if(rate!==null&&(known.unit==='XP'||typeof rate!=='number'||!Number.isFinite(rate)||rate<1||rate>1e9))throw Error(known.unit==='XP'?'XP methods use average XP, not a pet rate.':'Enter the pet rate as 1 in a number from 1 to 1 billion.');
 // A proposal may change only the pet rate (for example a clue pet with no default pace).
 if(!(pace===null&&rate!==null)&&(typeof pace!=='number'||!Number.isFinite(pace)||pace<=0||pace>1e9))throw Error('Enter a positive hourly pace up to 1 billion.');
 if(averageXp!==null&&(typeof averageXp!=='number'||!Number.isFinite(averageXp)||averageXp<=0||averageXp>1e12))throw Error('Average XP must be positive, or leave it blank.');
 return {planning:true as const,pace:pace as number|null,averageXp,...(rate!==null?{rate:rate as number}:{}),label:`${known.pet} · ${known.method}`,unit:known.unit};
}
export function applyPlanning(j:Journal,target:string,payload:{pace:number|null;averageXp?:number|null;rate?:number},source:string,revision:number){
 const known=planningCatalogue().find(t=>t.key===target);if(!known)return;
 const pet=j.pets.find(p=>p.name===known.pet),method=pet?.methods.find(m=>m.name===known.method);
 if(method)method.observedAverageXp=payload.averageXp??null;
 // A reviewed pet rate replaces the shipped default, never a rate the player set themselves.
 if(method&&payload.rate&&method.unit!=='XP'&&(method.rate===known.rate||method.rate===null))method.rate=payload.rate;
 if(method&&payload.pace!==null&&(method.kph===null||method.kph===known.pace||Number(method.source.match(/; Reviewed planning pace: ([0-9.]+)/)?.[1])===method.kph)){
 method.kph=payload.pace;method.paceConfirmed=true;
 method.source=method.source.replace(/; Reviewed planning pace:.*$/,'')+`; Reviewed planning pace: ${payload.pace} ${known.unit}/hour; ${source} (review ${revision})`;
 }
}
