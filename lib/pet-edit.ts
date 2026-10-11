import {validCollectionDate} from './collection-history';
import {acquisitionUnit,acquisitionMethod} from './pet-record';
import {validatePet,type Journal,type Pet} from './model';
export function applyPetEdit(j:Journal,pet:Pet){
  const i=j.pets.findIndex(p=>p.id===pet.id);if(i<0)throw Error('Unknown pet.');
  const canonical={...pet,name:j.pets[i].name,obtainedUnit:pet.obtainedUnit??acquisitionUnit(j.pets[i]),obtainedMethod:pet.obtainedMethod??acquisitionMethod(j.pets[i])};
  if(!validCollectionDate(pet.date))throw Error('Choose a real collection date that is not in the future, or leave it blank.');
  if(!validatePet(canonical))throw Error('Check the pet fields. Use a whole count for kills or rewards, or up to 200 million skill XP.');
  j.pets[i]={...j.pets[i],obtained:pet.obtained,priority:pet.priority,date:pet.date,notes:pet.notes,plannedMethod:pet.plannedMethod,huntHistory:pet.huntHistory?.map(({method,unit,count,pace,rate}:{method:string;unit:string;count:number|null;pace:number|null;rate:number|null})=>({method,unit,count,pace,rate})),obtainedStartCount:pet.obtainedStartCount,recordedHours:pet.recordedHours,historicalXph:pet.historicalXph,obtainedCount:pet.obtainedCount??null,obtainedApproximate:pet.obtainedApproximate??false,obtainedUnit:canonical.obtainedUnit,obtainedMethod:canonical.obtainedMethod,crateRolls:j.pets[i].name==='Phoenix'?pet.crateRolls??null:null,methods:pet.methods.map(({name,kc,rate,kph,activity,unit,source,farmingRunsPerDay,observedAverageXp,rateOverride,rateConfirmed,paceConfirmed}:import('./model').Method)=>({name,kc,rate,kph,activity,unit,source,farmingRunsPerDay,observedAverageXp,rateOverride,rateConfirmed,paceConfirmed})),source:'Manual update'};
}
