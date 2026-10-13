import type {Journal} from './model';
/** An admin correction outside pets: a collection log slot's count, a quest's state, or a diary tier's completed tasks. */
export type ProgressEdit={kind:'log';page:string;itemId:number;quantity:number}|{kind:'quest';name:string;state:'finished'|'started'|'not_started'}|{kind:'diary';area:string;tier:string;completed:number};
const QUEST_STATES=['finished','started','not_started'];
export function parseProgressEdit(v:unknown):ProgressEdit{
 const e=(v??{}) as Record<string,unknown>;
 if(e.kind==='log'&&typeof e.page==='string'&&Number.isSafeInteger(e.itemId)&&Number.isSafeInteger(e.quantity)&&(e.quantity as number)>=0&&(e.quantity as number)<=1e9)return {kind:'log',page:e.page,itemId:e.itemId as number,quantity:e.quantity as number};
 if(e.kind==='quest'&&typeof e.name==='string'&&QUEST_STATES.includes(String(e.state)))return {kind:'quest',name:e.name,state:e.state as 'finished'};
 if(e.kind==='diary'&&typeof e.area==='string'&&typeof e.tier==='string'&&Number.isSafeInteger(e.completed)&&(e.completed as number)>=0)return {kind:'diary',area:e.area,tier:e.tier,completed:e.completed as number};
 throw Error('Choose a collection log slot, quest or diary tier to correct.');
}
/** Applies the edit in place and returns what it was and what it is now, for the account history. Counts stay consistent:
 * a log page's and the log's obtained totals follow the slot, and a diary tier cannot exceed its task count. */
export function applyProgressEdit(j:Journal,e:ProgressEdit):{label:string;before:unknown;after:unknown}{
 if(e.kind==='log'){
  if(!j.log)throw Error('This journal has no collection log yet.');
  const page=j.log.tabs.flatMap(t=>t.pages).find(p=>p.name===e.page),item=page?.items.find(i=>i.id===e.itemId);
  if(!page||!item)throw Error('That collection log slot is not on this journal.');
  const before=item.quantity;item.quantity=e.quantity;
  page.obtained=page.items.filter(i=>i.quantity>0).length;
  j.log.obtained=j.log.tabs.reduce((n,t)=>n+t.pages.reduce((m,p)=>m+p.obtained,0),0);
  return {label:`${item.name} (${page.name})`,before,after:e.quantity};
 }
 if(e.kind==='quest'){
  const quest=j.profile?.quests.find(q=>q.name===e.name);if(!quest)throw Error('That quest is not on this journal.');
  const before=quest.state;quest.state=e.state;return {label:quest.name,before,after:e.state};
 }
 const tier=j.profile?.diaries.find(d=>d.area===e.area)?.tiers.find(t=>t.tier===e.tier);if(!tier)throw Error('That diary tier is not on this journal.');
 if(e.completed>tier.total)throw Error(`${e.area} ${e.tier} has ${tier.total} tasks.`);
 const before=tier.completed;tier.completed=e.completed;return {label:`${e.area} ${e.tier} diary`,before,after:e.completed};
}
