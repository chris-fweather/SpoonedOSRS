import type {CollectionLog,Journal} from './model';
import template from './log-template.json' with {type:'json'};
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const normalized=(v:unknown)=>typeof v==='string'?v.toLowerCase().replaceAll('_',' ').trim():'';
/** Temple returns obtained IDs; merge onto the public catalogue without deleting known unlocks. */
export function templeLog(raw:unknown,j:Journal):CollectionLog {
 const d=record(record(raw).data);
 if(normalized(d.player)!==normalized(j.username))throw Error('Temple returned a different or untracked player.');
 const groups=record(d.items),entries=Array.isArray(d.items)?d.items:Object.values(groups).flatMap(v=>Array.isArray(v)?v:[]);
 if(!d.items||!Number.isInteger(d.total_collections_finished))throw Error('No Temple collection log is available. Sync it in Temple first.');
 const counts=new Map<number,number>();
 for(const item of entries){const i=record(item);if(!Number.isInteger(i.id)||!Number.isInteger(i.count)||Number(i.count)<0)throw Error('Invalid Temple collection item.');counts.set(Number(i.id),Math.max(counts.get(Number(i.id))??0,Number(i.count)));}
 const log=structuredClone(j.log??template) as CollectionLog;
 const known=new Set<number>(),owned=new Set<number>();
 for(const t of log.tabs)for(const p of t.pages){for(const i of p.items){known.add(i.id);i.quantity=Math.max(i.quantity,counts.get(i.id)??0);if(i.quantity>0)owned.add(i.id);}p.obtained=p.items.filter(i=>i.quantity>0).length;}
 if([...counts.keys()].some(id=>!known.has(id)))throw Error('Temple contains newer collection items. Import RuneProfile first to refresh the catalogue.');
 log.obtained=owned.size;log.total=known.size;return log;
}
/** WOM supplies XP and ranked boss KC, not collection or quest completion. */
export function womHiscores(raw:unknown,j:Journal):Journal['hiscores'] {
 const r=record(raw),snapshot=record(r.latestSnapshot),d=record(snapshot.data);
 if(normalized(r.username)!==normalized(j.username))throw Error('Wise Old Man returned a different or untracked player.');
 const stamp=Date.parse(String(snapshot.createdAt));
 if(!Number.isFinite(stamp))throw Error('No Wise Old Man snapshot is available.');
 if(j.statsSyncedAt&&stamp<Date.parse(j.statsSyncedAt))throw Error('Wise Old Man’s snapshot is older than your saved stats. Update it there first, or use OSRS Hiscores.');
 const skills=Object.entries(record(d.skills)).map(([key,value])=>{const v=record(value);return {name:key==='runecrafting'?'Runecraft':key.charAt(0).toUpperCase()+key.slice(1),level:Number(v.level),xp:Number(v.experience),rank:Number(v.rank)};});
 if(!skills.length||skills.some(s=>!Number.isInteger(s.level)||s.level<1||!Number.isFinite(s.xp)||s.xp<0||!Number.isFinite(s.rank)))throw Error('Invalid Wise Old Man skills.');
 const aliases:Record<string,string>={the_gauntlet:'The Gauntlet',the_corrupted_gauntlet:'The Corrupted Gauntlet',theatre_of_blood_hard_mode:'Theatre of Blood: Hard Mode',chambers_of_xeric_challenge_mode:'Chambers of Xeric: Challenge Mode',tombs_of_amascut_expert:'Tombs of Amascut: Expert Mode',tzkal_zuk:'TzKal-Zuk',tztok_jad:'TzTok-Jad'};
 const canonical=new Map(j.hiscores.activities.map(a=>[normalized(a.name),a.name]));
 for(const p of j.pets)for(const m of p.methods)if(m.activity)canonical.set(normalized(m.activity),m.activity);
 const activities=[...j.hiscores.activities];
 for(const [key,value] of Object.entries(record(d.bosses))){const v=record(value),score=Number(v.kills),rank=Number(v.rank);if(!Number.isInteger(score)||score<0||!Number.isFinite(rank))continue;const name=aliases[key]??canonical.get(normalized(key))??key.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),i=activities.findIndex(a=>a.name===name);const a={name,score,rank};if(i>=0)activities[i]=a;else activities.push(a);}
 return {skills,activities};
}
export async function sourceJson(response:Response):Promise<unknown>{
 if(!response.ok)throw Error('Import source is unavailable or the player is not tracked.');
 if(Number(response.headers.get('content-length'))>2_000_000)throw Error('Import response is too large.');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty import response.');let size=0;const decoder=new TextDecoder();let text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000){await reader.cancel();throw Error('Import response is too large.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{reader.releaseLock();}
}
