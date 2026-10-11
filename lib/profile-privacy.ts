import type {Journal,Pet,Method} from './model';
import {validCollectionDate} from './collection-history';
export type Visibility = 'public' | 'private';
export function journalForViewer(j:Journal, visibility:Visibility, owner:boolean,details:ProfileDetails=DEFAULT_DETAILS):Journal {
  if (owner) return {...j,visibility,restricted:false};
  // Historical imports may contain extra fields. Redaction must start from an
  // explicit public schema, never from a spread of stored provider objects.
  if (visibility === 'private') return {
    username:j.username,accountMode:j.accountMode,visibility,restricted:true,revision:0,pets:[],log:null,
    hiscores:{skills:details.skills?j.hiscores.skills.map(({name,level,xp,rank})=>({name,level,xp,rank})):[],activities:[]},statsSyncedAt:null,logSyncedAt:null,
  };
  j=publicProgress(j);
  // A public collection does not publish personal notes, planning preferences or time logs.
  const profile=j.profile?{...j.profile,quests:details.quests?j.profile.quests:[],diaries:details.diaries?j.profile.diaries:[],combat:details.combat?j.profile.combat:[]}:undefined;
  return {...j,visibility,restricted:false,details,profile,log:details.log?j.log:null,collectionDates:details.log?j.collectionDates:undefined,
   hiscores:{skills:details.skills?j.hiscores.skills:[],activities:details.petRecords?j.hiscores.activities:[]},
   pets:details.pets?j.pets.map(p=>({...p,notes:'',priority:false,recordedHours:null,historicalXph:null,plannedMethod:undefined,...(!details.petRecords?{huntHistory:undefined,obtainedStartCount:null,obtainedCount:null,obtainedMethod:'',date:'',crateRolls:null,methods:p.methods.map(m=>({...m,kc:null}))}:{})})):[]};
}
export function validVisibility(value:unknown): value is Visibility {return value==='public'||value==='private';}

export const DEFAULT_DETAILS={pets:true,log:true,quests:true,diaries:true,combat:true,skills:true,petRecords:true};
export type ProfileDetails=typeof DEFAULT_DETAILS;
export const DETAIL_LABELS:Record<keyof ProfileDetails,string>={pets:'Pets collected',log:'Collection log',quests:'Quests',diaries:'Achievement diaries',combat:'Combat achievements',skills:'Skill levels & XP',petRecords:'Pet acquisition records & current counts'};
export function parseDetails(value:unknown):ProfileDetails {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose which profile details to share.');
 const input=value as Record<string,unknown>,result={...DEFAULT_DETAILS};
 for(const key of Object.keys(result) as (keyof ProfileDetails)[]){if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('Invalid profile visibility choice.');result[key]=input[key];}}
 return result;
}

function publicMethod(m:Method):Method {
 return {name:m.name,kc:m.kc,rate:m.rate,kph:m.kph,activity:m.activity,unit:m.unit,source:m.source,
  farmingRunsPerDay:m.farmingRunsPerDay,observedAverageXp:m.observedAverageXp,
  rateOverride:m.rateOverride,rateConfirmed:m.rateConfirmed,paceConfirmed:m.paceConfirmed};
}
function publicPet(p:Pet):Pet {
 return {id:p.id,name:p.name,category:p.category,obtained:p.obtained,date:p.date,
  source:p.source,sourceRow:p.sourceRow,referenceHours:p.referenceHours,
  obtainedCount:p.obtainedCount,obtainedUnit:p.obtainedUnit,obtainedMethod:p.obtainedMethod,
  obtainedApproximate:p.obtainedApproximate,obtainedStartCount:p.obtainedStartCount,crateRolls:p.crateRolls,
  methods:p.methods.map(publicMethod),
  huntHistory:p.huntHistory?.map(({method,unit,count,pace,rate})=>({method,unit,count,pace,rate})),
  notes:'',priority:false,recordedHours:null,historicalXph:null};
}
function publicProgress(j:Journal):Journal {
 return {username:j.username,accountMode:j.accountMode,revision:j.revision,calculationVersion:j.calculationVersion,
  statsSyncedAt:j.statsSyncedAt,logSyncedAt:j.logSyncedAt,pets:j.pets.map(publicPet),
  hiscores:{skills:j.hiscores.skills.map(({name,level,xp,rank})=>({name,level,xp,rank})),
   activities:j.hiscores.activities.map(({name,score,rank})=>({name,score,rank}))},
  collectionDates:j.collectionDates?Object.fromEntries(Object.entries(j.collectionDates).filter(([id,date])=>/^\d+$/.test(id)&&validCollectionDate(date))):undefined,
  log:j.log?{obtained:j.log.obtained,total:j.log.total,tabs:j.log.tabs.map(t=>({name:t.name,pages:t.pages.map(p=>({
   name:p.name,obtained:p.obtained,total:p.total,items:p.items.map(({id,name,quantity})=>({id,name,quantity}))
  }))}))}:null,
  profile:j.profile?{syncedAt:j.profile.syncedAt,
   quests:j.profile.quests.map(({id,name,points,type,state})=>({id,name,points,type,state})),
   diaries:j.profile.diaries.map(({areaId,area,tiers})=>({areaId,area,tiers:tiers.map(({tier,completed,total})=>({tier,completed,total}))})),
   combat:j.profile.combat.map(({id,name,completed,total})=>({id,name,completed,total}))}:undefined};
}
