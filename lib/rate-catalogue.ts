import {applyPlanning} from './planning-catalogue';
import {contributionBased} from './drop-rates';
import raw from './drops-index.json' with {type:'json'};
import seed from './catalogue.json' with {type:'json'};
import type {DropSource} from './ui';
import type {Journal} from './model';
export type RateTarget={key:string;source:string;table:string;item:string;rarity:string;probability:number|null;url:string};
const index=raw as unknown as {pages:Record<string,DropSource[]>};
export const rateKey=(source:string,table:string,item:string)=>JSON.stringify([source,table,item]);
// Built only from bundled immutable metadata; no user or database state is cached here.
let catalogue:RateTarget[]|undefined;
export function rateCatalogue():RateTarget[] {
 if(catalogue)return catalogue;
 const targets=new Map<string,RateTarget>();
 const conflicts=new Set<string>();
 const petTables=new Map<string,Set<string>>();
 for(const sources of Object.values(index.pages)) for(const s of sources) for(const t of s.tabs) for(const r of t.r) {
  const key=rateKey(s.t,t.h,r[0]);
  if(conflicts.has(key))continue;
  // Exclude non-probability rows and context-dependent formulas from a fixed-rate editor.
  if(r[3]===null || !(r[3]>0) || r[3]>1)continue;
  // Pet corrections must map unambiguously to a flat, kill-based method before publication.
  const pet=seed.pets.find(p=>p.name.toLowerCase()===r[0].toLowerCase());
  if(pet){
   if(contributionBased(s.t)) continue;
   const group=JSON.stringify([s.t,pet.name]);
   const tables=petTables.get(group)??new Set<string>();tables.add(key);petTables.set(group,tables);
   if(!pet.methods.some(m=>m.unit==='kills'&&(m.activity??m.name).toLowerCase()===s.t.toLowerCase())) continue;
  }
  const old=targets.get(key);
  if(old&&(old.rarity!==r[2]||old.probability!==r[3])) {targets.delete(key); conflicts.add(key); continue;}
  targets.set(key,{key,source:s.t,table:t.h,item:r[0],rarity:r[2],probability:r[3],url:s.u});
 }
 for(const keys of petTables.values())if(keys.size>1)for(const key of keys)targets.delete(key);
 return catalogue=[...targets.values()];
}
export type RateOverride={kind:'rate';target:string;payload:string;source:string;revision:number};
export function applyTableRates(sources:DropSource[],overrides:RateOverride[]):DropSource[] {
 if(!overrides.length)return sources;
 const map=new Map(overrides.map(r=>[r.target,r]));
 return sources.map(s=>({...s,tabs:s.tabs.map(t=>({...t,r:t.r.map(r=>{
  const found=map.get(rateKey(s.t,t.h,r[0]));if(!found)return r;
  const {denominator}=JSON.parse(found.payload) as {denominator:number};
  return [r[0],r[1],`1/${denominator.toLocaleString('en-US')}`,1/denominator,r[4]];
 })}))}));
}
export function applyPetRates(j:Journal,overrides:RateOverride[]):Journal {
 if(!overrides.length)return j;
 const targets=rateCatalogue();
 for(const o of overrides){if(o.target.startsWith('planning:')){applyPlanning(j,o.target,JSON.parse(o.payload),o.source,o.revision);continue;}const target=targets.find(t=>t.key===o.target);if(!target)continue;
  const pet=j.pets.find(p=>p.name.toLowerCase()===target.item.toLowerCase());if(!pet)continue;
  const {denominator}=JSON.parse(o.payload) as {denominator:number};
  for(const method of pet.methods) if(!method.rateOverride&&method.unit==='kills'&&(method.activity??method.name).toLowerCase()===target.source.toLowerCase()) {method.rate=denominator;method.rateConfirmed=true;method.source=`Reviewed OSRS Wiki rate: ${o.source} (review ${o.revision})`;}
 }
 return j;
}
