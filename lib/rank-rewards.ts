import type {Journal} from './model';
export function rankTier(rank:number):'champion'|'gold'|'silver'|'bronze'|null {
 if(!Number.isInteger(rank)||rank<1)return null;
 return rank===1?'champion':rank<=10?'gold':rank<=100?'silver':rank<=1000?'bronze':null;
}
export function rankTitles(j:Journal){
 return j.hiscores.activities.filter(a=>rankTier(a.rank)).flatMap(a=>{
 const key=encodeURIComponent(a.name.toLowerCase());
 return [
  ...(a.rank===1?[{id:`hiscore:${key}:first`,label:`the ${a.name} Champion`,unlocked:true,requirement:`Rank #1 in ${a.name} on the latest synced hiscores`}]:[]),
  {id:`hiscore:${key}:elite`,label:`the ${a.name} Elite`,unlocked:true,requirement:`Top 1,000 in ${a.name} on the latest synced hiscores (currently #${a.rank.toLocaleString('en-US')})`},
 ];
 });
}
