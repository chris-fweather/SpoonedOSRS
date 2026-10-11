import {rollProbability} from './wiki-drops';
/** Display only: conditional reference chances must never become personal KC odds. */
export function highestListedRate(rates:string[]):string {
 const candidates=rates.flatMap(rate=>rate.split(/\s*;\s*/)).map(text=>({text:text.trim(),p:rollProbability(text)})).filter((v):v is {text:string;p:number}=>v.p!==null);
 if(candidates.length)return candidates.sort((a,b)=>b.p-a.p)[0].text;
 const unique=[...new Set(rates)];
 return unique.length===1&&unique[0].length<=20 ? unique[0] : 'Conditional';
}
