import {initial,type Journal} from './model';
export type PlanningTarget={key:string;pet:string;method:string;unit:string;pace:number|null};
export function planningCatalogue():PlanningTarget[]{return initial.pets.flatMap(p=>p.methods.map(m=>({key:'planning:'+JSON.stringify([p.id,m.name]),pet:p.name,method:m.name,unit:m.unit,pace:m.kph})));}
export function parsePlanning(target:unknown,pace:unknown,averageXp:unknown){
 const known=planningCatalogue().find(t=>t.key===target);if(!known)throw Error('Choose a supported pet method.');
 if(typeof pace!=='number'||!Number.isFinite(pace)||pace<=0||pace>1e9)throw Error('Enter a positive hourly pace up to 1 billion.');
 if(averageXp!==null&&(typeof averageXp!=='number'||!Number.isFinite(averageXp)||averageXp<=0||averageXp>1e12))throw Error('Average XP must be positive, or leave it blank.');
 return {planning:true as const,pace,averageXp,label:`${known.pet} · ${known.method}`,unit:known.unit};
}
export function applyPlanning(j:Journal,target:string,payload:{pace:number;averageXp?:number|null},source:string,revision:number){
 const known=planningCatalogue().find(t=>t.key===target);if(!known)return;
 const pet=j.pets.find(p=>p.name===known.pet),method=pet?.methods.find(m=>m.name===known.method);
 if(method)method.observedAverageXp=payload.averageXp??null;
 if(method&&(method.kph===null||method.kph===known.pace||Number(method.source.match(/; Reviewed planning pace: ([0-9.]+)/)?.[1])===method.kph)){
 method.kph=payload.pace;method.paceConfirmed=true;
 method.source=method.source.replace(/; Reviewed planning pace:.*$/,'')+`; Reviewed planning pace: ${payload.pace} ${known.unit}/hour; ${source} (review ${revision})`;
 }
}
