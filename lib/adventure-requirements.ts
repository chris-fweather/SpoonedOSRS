import {requirementParts,type Requirement} from './requirements';
export type AdventureRequirement=Requirement & {points?:number;note?:string};
export type ItemRequirement={label:string;items:{id:number;name:string}[]};
export type AdventureRequirements={skills:AdventureRequirement[];quests:AdventureRequirement[];items:ItemRequirement[];other:AdventureRequirement[]};
/** Classify reference lines without converting optional, partial or OR conditions into completion checks. */
export function diaryRequirementGroups(lines:string[],quests:string[],skills:string[],items:Record<string,{id:number;name:string}[]>):AdventureRequirements{
 const groups:AdventureRequirements={skills:[],quests:[],items:[],other:[]};
 for(const raw of lines){
  const line=raw.replace(/^\*+\s*/,'').trim();
  if(!line||/^none(?: listed)?[.]?$/i.test(line))continue;
  const clean=line.replace(/^Quest\s+/,'');
  if(items[clean]?.length){groups.items.push({label:clean,items:items[clean]});continue;}
  const points=line.match(/^Quest\s+(\d+)$/i);
  if(points){groups.quests.push({label:`${points[1]} Quest points`,points:Number(points[1])});continue;}
  // Commas in an otherwise fully recognised skill list also mean AND.
  const skillParts=requirementParts(clean.replace(/,\s*(?:and\s+)?/gi,' and '),quests,skills);
  if(skillParts.every(r=>r.skill)){groups.skills.push(...skillParts);continue;}
  const parts=requirementParts(clean,quests,skills);
  if(parts.every(r=>r.quest)){groups.quests.push(...parts);continue;}
  if(/^Quest\s+/i.test(line)||/^(?:Completion of|Partial completion of|Started)\s/i.test(clean)){groups.quests.push({label:clean});continue;}
  if(skills.some(skill=>clean.toLowerCase().startsWith(skill.toLowerCase()+' '))){groups.skills.push({label:clean});continue;}
  groups.other.push({label:clean});
 }
 return groups;
}
export function requirementCompletion(r:AdventureRequirement,skills:{name:string;level:number}[],quests:{name:string;state:string;points:number}[]|undefined):boolean|null{
 const key=(name:string)=>name.toLowerCase().replaceAll('’',"'");
 if(r.skill){const skill=skills.find(s=>key(s.name)===key(r.skill!));return skill&&skill.level>=0?skill.level>=r.level!:null;}
 if(r.quest){const quest=quests?.find(q=>key(q.name)===key(r.quest!));return quest?quest.state==='finished':null;}
 if(r.points!=null)return quests?.length?quests.filter(q=>q.state==='finished').reduce((n,q)=>n+q.points,0)>=r.points:null;
 return null;
}
