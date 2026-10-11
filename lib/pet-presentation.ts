import type {Journal} from './model';
import {petSkill,selectedMethod} from './estimates';
import {acquisitionMethod,acquisitionLabel} from './pet-record';
/** Date-only records keep their calendar day in every viewer timezone. */
export function collectedDate(date:string){const m=date.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);return m?`${m[3]}/${m[2]}/${m[1]}`:date;}
/** Presentation proportions, independent of game drop data. */
export function petPresentation(name:string):{extent:number;hover:number} {
 const sizes:Record<string,number>={'Tiny tempor':.34,'Abyssal protector':.3,'Giant Squirrel':.25,'Herbi':.28,'Rift guardian':.34,'Tangleroot':.38,'Baby chinchompa':.22,"Tumeken's guardian":.52,'TzRek-Jad':.4,'Venenatis spiderling':.4,'Sraracha':.36,"Lil' Zik":.42};
 const floaters=new Set(['Pet Kraken',"Pet Kree'arra",'Pet dark core','Phoenix','Noon','Wisp','Gull']);
 return {extent:sizes[name]??.36,hover:name==='Rift guardian'?.025:name==="Tumeken's guardian"?.025:floaters.has(name)?.15:0};
}
/** Bounds must be measured before changing the parent scale. Local offset is not divided by scale. */
export function petPlacement(playerHeight:number,playerFloor:number,raw:{x:number;y:number;z:number;minY:number},name:string){
 const p=petPresentation(name),height=Math.max(1,playerHeight);
 return {scale:height*p.extent/Math.max(raw.x,raw.y,raw.z,1),localY:-raw.minY,groundY:playerFloor+height*p.hover};
}

/** A cosmetic showcase never grants access to private acquisition records. */
export function companionDescription(j:Journal,id:string,name:string):string {
 if(j.restricted)return name;
 const pet=j.pets.find(p=>p.id===id);if(!pet)return name;
 const n=(v:number)=>v.toLocaleString('en-US',{maximumFractionDigits:0});
 const lines=[name];
 if(pet.obtained){
  lines.push(pet.obtainedCount==null?'Obtained':`Obtained: ${acquisitionLabel(pet)}`);
  if(pet.date)lines.push(`Collected: ${collectedDate(pet.date)}`);
  if(pet.obtainedCount!=null&&acquisitionMethod(pet))lines.push(`Received from: ${acquisitionMethod(pet)}`);
 }else lines.push('Not collected');
 const related:Record<string,{skill:string;activity?:string}>={
  'Tiny tempor':{skill:'Fishing',activity:'Tempoross'},
  'Phoenix':{skill:'Firemaking',activity:'Wintertodt'},
  'Abyssal protector':{skill:'Runecraft',activity:'Guardians of the Rift'},
 };
 const extra=related[pet.name],skillName=petSkill[pet.name];
 const skill=j.hiscores.skills.find(s=>s.name===skillName&&s.xp>=0);
 if(skill)lines.push(`Current ${skill.name}: ${n(skill.xp)} XP`);
 const method=selectedMethod(pet);
 const activities=[...new Set([extra?.activity,...pet.methods.map(m=>m.activity)].filter((a):a is string=>!!a))];
 const synced=activities.flatMap(name=>{const a=j.hiscores.activities.find(a=>a.name===name&&a.score>=0);return a?[a]:[];});
 if(method?.kc!=null&&method.kc>=0&&method.unit!=='XP'&&!(method.activity&&synced.some(a=>a.name===method.activity)&&['kills','games','completions','subdues'].includes(method.unit)))lines.push(`Current ${method.name}: ${n(method.kc)} ${method.unit}`);
 for(const activity of synced){const unit=extra?.activity===activity.name?'completions':pet.methods.find(m=>m.activity===activity.name)?.unit;lines.push(`Current ${activity.name}: ${n(activity.score)} ${unit==='kills'?'KC':'completions'}`);}
 return lines.join('\n');
}
