export type Requirement={label:string;quest?:string;skill?:string;level?:number};
const normalized=(s:string)=>s.toLowerCase().replaceAll('’', "'");
/** Split only fully recognised AND lists. Leave partial, optional and OR conditions intact. */
export function requirementParts(text:string,quests:string[],skills:string[]):Requirement[] {
 const clean=text.replace(/^\*+\s*/, '').replace(/^Quest\s+/, '').trim();
 const completion=clean.match(/^Completion of (.+?)[.]?$/i);
 if(completion){
  let remaining=completion[1];const result:Requirement[]=[];
  const sorted=[...quests].sort((a,b)=>b.length-a.length);
  while(remaining){
   const quest=sorted.find(q=>normalized(remaining)===normalized(q)||normalized(remaining).startsWith(normalized(q)+' and '));
   if(!quest)return [{label:clean}];
   result.push({label:quest,quest});remaining=remaining.slice(quest.length).replace(/^ and /i,'');
  }
  return result;
 }
 const parts=clean.split(/\s+and\s+/i).map(part=>{const skill=skills.find(s=>new RegExp('^'+s+' \\d+$','i').test(part));return skill?{label:part.slice(skill.length).trim()+' '+skill,skill,level:Number(part.slice(skill.length))}:null;});
 return parts.every(Boolean)?parts as Requirement[]:[{label:clean}];
}
