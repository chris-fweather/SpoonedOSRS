import type {Pet} from './model';
import {petSkill,selectedMethod} from './estimates';
export function acquisitionUnits(pet:Pet):string[]{
 return [...new Set([...(petSkill[pet.name]?['XP','level']:[]),...pet.methods.map(m=>m.unit).filter(u=>u&&u!=='XP'),...(pet.obtainedUnit?[pet.obtainedUnit]:[])])];
}
export function acquisitionUnit(pet:Pet):string{return pet.name==='Tiny tempor'&&pet.obtainedUnit==='permits'?'rolls':pet.obtainedUnit??(petSkill[pet.name]?'XP':selectedMethod(pet)?.unit??'kills');}
export function acquisitionMethod(pet:Pet):string{return pet.obtainedMethod??selectedMethod(pet)?.name??'';}
export function validAcquisition(pet:Pet):boolean {
 return (!['XP','level'].includes(acquisitionUnit(pet))||!!petSkill[pet.name])&&(pet.obtainedUnit==null||(typeof pet.obtainedUnit==='string'&&pet.obtainedUnit.length>0&&pet.obtainedUnit.length<50))
  &&(pet.obtainedMethod==null||(typeof pet.obtainedMethod==='string'&&pet.obtainedMethod.length<=200))
  &&(pet.obtainedCount==null||(acquisitionUnit(pet)==='XP'?pet.obtainedCount<=200_000_000:acquisitionUnit(pet)==='level'?Number.isInteger(pet.obtainedCount)&&pet.obtainedCount>=1&&pet.obtainedCount<=99:Number.isInteger(pet.obtainedCount)));
}

/** A recalled level is not an exact XP observation. */
export function xpAtLevel(level:number):number {let points=0;for(let n=1;n<level;n++)points+=Math.floor(n+300*2**(n/7));return Math.floor(points/4);}
export function petUnitLabel(pet:Pet,unit:string){return pet.name==='Abyssal protector'&&unit==='rewards'?'searches':unit;}
export function acquisitionLabel(pet:Pet):string {
 if(pet.obtainedCount==null)return 'not recorded';
 const n=pet.obtainedCount.toLocaleString('en-US',{maximumFractionDigits:0});
 return acquisitionUnit(pet)==='level'?`${petSkill[pet.name]} level ${n} (exact XP unknown)`:`${pet.obtainedApproximate?'~':''}${n} ${pet.name==='Tiny tempor'&&acquisitionUnit(pet)==='rolls'?'permits spent':petUnitLabel(pet,acquisitionUnit(pet))}${pet.obtainedApproximate?' (estimated)':''}`;
}
