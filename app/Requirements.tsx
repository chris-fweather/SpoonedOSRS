import type {Journal} from '@/lib/model';
import quests from '@/lib/quest-reference.json';
import {requirementParts} from '@/lib/requirements';
import {decodeWiki} from '@/lib/wiki-text';
import {wiki} from '@/lib/ui';
export function Requirements({lines,journal}:{lines:string[];journal:Journal}) {
 const known=Object.keys(quests.quests);
 return <ul className="req-list requirement-cards">{lines.flatMap(line=>requirementParts(decodeWiki(line),known,journal.hiscores.skills.map(s=>s.name))).map((r,i)=>{
 const quest=r.quest?journal.profile?.quests.find(q=>q.name.toLowerCase()===r.quest!.toLowerCase()):null;
 const skill=r.skill?journal.hiscores.skills.find(s=>s.name===r.skill):null;
 const met=quest?quest.state==='finished':skill&&skill.level>=0?skill.level>=r.level!:null;
 return <li key={i} className={met===null?'':met?'req-met':'req-miss'}>{r.quest&&<img src="/icons/navigation/quest-point-icon.png" alt=""/>}{r.skill&&<img src={`/icons/skills/${r.skill.toLowerCase()}.png`} alt=""/>}{r.quest?<a href={wiki(r.quest)} target="_blank" rel="noreferrer">{r.label}</a>:<span>{r.label}</span>}{met===true&&<small aria-label="Complete">✓</small>}</li>;
 })}</ul>;
}
