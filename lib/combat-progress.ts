import type {Profile} from './model';
/** Tier totals only identify individual tasks when the matching catalogue tier is all or none. */
export function combatGroupProgress(tiers:string[],combat:Profile['combat'],catalogueTotals:Record<string,number>){
 let done=0;
 for(const name of tiers){
  const tier=combat.find(t=>t.name===name);
  if(!tier||tier.total!==catalogueTotals[name]||tier.total<=0)return null;
  if(tier.completed===tier.total)done++;
  else if(tier.completed!==0)return null;
 }
 return done;
}
