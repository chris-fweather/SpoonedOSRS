import questReference from './quest-reference.json' with {type:'json'};
import diaryReference from './diary-tasks.json' with {type:'json'};
import names from './guide-item-catalogue.json' with {type:'json'};
import itemImages from './guide-item-images.json' with {type:'json'};
import {GUIDE_EMOJIS} from './guide-emojis';
import {EQUIP_SLOTS,emptyEquipped,wearables,type EquipSlot,type Equipped} from './flair';
import type {StaffRole} from './staff-policy';
export type GuideSetupProfile={id:string;name:string;equipment:Equipped;inventory:(string|null)[]};
export type GuideDiary={area:string;tier:string};
export const GUIDE_TONES=['default','gold','orange','green'] as const;
export type GuideTone=(typeof GUIDE_TONES)[number];
export const GUIDE_TEXT_STYLES=['body','heading','subheading','list','numbered'] as const;
export type GuideTextStyle=(typeof GUIDE_TEXT_STYLES)[number];
export type GuideBlock={id:string;kind:'text';text:string;style:GuideTextStyle;tone:GuideTone}|{id:string;kind:'gear'|'inventory';setupId:string}|{id:string;kind:'requirements'|'divider'}|{id:string;kind:'odds';name:string;rate:number;count:number;unit:string};
export type Guide={blocks?:GuideBlock[];title:string;activity:string;summary:string;requirements:string;strategy:string;equipment:Equipped;inventory:(string|null)[];setups?:GuideSetupProfile[];requiredItems?:{id:string;quantity:number}[];requiredQuests?:string[];requiredDiaries?:GuideDiary[]};
export const guideItems:Record<string,string>={...names,...Object.fromEntries(Object.entries(wearables.items).map(([id,item])=>[id,item.name]))};
const images=itemImages as Record<string,string|null>;
/** Official inventory icon for a guide item: /items/{id}.png unless the image map points elsewhere (null when the game has no icon we can use). */
export function guideItemImage(id:string):string|null{return Object.hasOwn(images,id)?images[id]:Object.hasOwn(guideItems,id)?`/items/${id}.png`:null;}
/** Items a guide author can pick: one per name (the variant with its own icon), every one with an icon. */
export const guideItemChoices:[string,string][]=(()=>{const seen=new Map<string,[string,string]>();for(const [id,name] of Object.entries(guideItems)){const image=guideItemImage(id);if(!image)continue;const key=name.toLowerCase()+'|'+(wearables.items[id]?.slot??''),prior=seen.get(key);if(!prior||(image===`/items/${id}.png`&&guideItemImage(prior[0])!==`/items/${prior[0]}.png`))seen.set(key,[id,name]);}return [...seen.values()].sort((a,b)=>a[1].localeCompare(b[1]));})();
export const guideSlotChoices=(slot:EquipSlot)=>guideItemChoices.filter(([id])=>wearables.items[id]?.slot===slot);
/** Best matches first: exact name, then names starting with the query, then any word match. */
export function searchGuideItems(query:string,choices=guideItemChoices,limit=80):[string,string][]{
 const q=query.trim().toLowerCase();if(!q)return choices.slice(0,limit);
 const words=q.split(/\s+/),rank=(name:string)=>{const n=name.toLowerCase();return n===q?0:n.startsWith(q)?1:n.includes(q)?2:words.every(w=>n.includes(w))?3:9;};
 return choices.map(c=>[c,rank(c[1])] as const).filter(([,r])=>r<9).sort((a,b)=>a[1]-b[1]).slice(0,limit).map(([c])=>c);
}
export const guideQuests=Object.keys(questReference.quests).sort();
export const guideDiaryAreas=Object.keys(diaryReference.areas).sort();
export const guideDiaryTiers=['Easy','Medium','Hard','Elite'];
export function newGuideSetup(name='Recommended',id='recommended'):GuideSetupProfile{return {id,name,equipment:emptyEquipped(),inventory:Array(28).fill(null)};}
export function guideSetups(g:Guide):GuideSetupProfile[]{return g.setups?.length?g.setups:[{id:'recommended',name:'Recommended',equipment:g.equipment,inventory:g.inventory}];}
export function emptyGuide():Guide{return {title:'',activity:'',summary:'',requirements:'',strategy:'',equipment:emptyEquipped(),inventory:Array(28).fill(null),requiredQuests:[],requiredDiaries:[]};}
export function mayPublishGuide(role:StaffRole){return role==='owner'||role==='admin'||role==='moderator';}
export function mayEditGuide(role:StaffRole,actor:string,author:string){return actor===author||role==='owner'||role==='admin';}
function parseSetup(v:Record<string,unknown>):GuideSetupProfile{
 if(typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>60)throw Error('Name every setup using 1 to 60 characters.');
 const g=newGuideSetup(v.name.trim(),v.id);
 if(!v.equipment||typeof v.equipment!=='object'||Array.isArray(v.equipment))throw Error('Choose an equipment setup.');
 const gear=v.equipment as Record<string,unknown>;
 for(const slot of EQUIP_SLOTS){const id=gear[slot];if(id!==null&&(typeof id!=='string'||wearables.items[id]?.slot!==slot))throw Error('Unsupported equipment or slot.');g.equipment[slot]=id as string|null;}
 for(const slot of EQUIP_SLOTS){const id=g.equipment[slot];if(id&&wearables.items[id].blocks.some(block=>g.equipment[block]))throw Error('Equipment slots conflict.');}
 if(!Array.isArray(v.inventory)||v.inventory.length!==28||v.inventory.some(id=>id!==null&&(typeof id!=='string'||!Object.hasOwn(guideItems,id))))throw Error('Use 28 inventory slots with recognised items.');
 g.inventory=[...v.inventory] as (string|null)[];return g;
}
export function parseGuide(value:unknown):Guide {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Enter a guide.');
 const v=value as Record<string,unknown>,g=emptyGuide();
 for(const [field,min,max] of [['title',3,100],['activity',2,100],['summary',10,500],['requirements',0,4000],['strategy',20,16000]] as const){if(typeof v[field]!=='string'||v[field].trim().length<min||v[field].length>max)throw Error(`${field}: use ${min} to ${max} characters.`);g[field]=v[field].trim();}
 const legacy=parseSetup({id:'recommended',name:'Recommended',equipment:v.equipment,inventory:v.inventory});
 if(v.setups!==undefined){if(!Array.isArray(v.setups)||!v.setups.length||v.setups.length>8)throw Error('Use 1 to 8 equipment setups.');g.setups=v.setups.map(s=>{if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Invalid setup.');return parseSetup(s);});if(new Set(g.setups.map(s=>s.id)).size!==g.setups.length)throw Error('Setup IDs must be unique.');if(new Set(g.setups.map(s=>s.name.toLowerCase())).size!==g.setups.length)throw Error('Give every setup a different name.');}
 else g.setups=[legacy];
 g.equipment=g.setups[0].equipment;g.inventory=g.setups[0].inventory;
 const items=v.requiredItems??[];if(!Array.isArray(items)||items.length>40||items.some(i=>!i||typeof i!=='object'||typeof i.id!=='string'||!Object.hasOwn(guideItems,i.id)||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>1000000)||new Set(items.map(i=>i.id)).size!==items.length)throw Error('Choose up to 40 known required items with valid quantities.');g.requiredItems=items.map(i=>({id:i.id,quantity:i.quantity}));
 const quests=v.requiredQuests??[];if(!Array.isArray(quests)||quests.length>40||quests.some(q=>typeof q!=='string'||!guideQuests.includes(q))||new Set(quests).size!==quests.length)throw Error('Choose up to 40 distinct quests from the catalogue.');g.requiredQuests=quests;
 const diaries=v.requiredDiaries??[];if(!Array.isArray(diaries)||diaries.length>48||diaries.some(d=>!d||typeof d!=='object'||!guideDiaryAreas.includes(d.area)||!guideDiaryTiers.includes(d.tier))||new Set(diaries.map(d=>d.area+'|'+d.tier)).size!==diaries.length)throw Error('Choose distinct diary areas and tiers from the catalogue.');g.requiredDiaries=diaries.map(d=>({area:d.area,tier:d.tier}));
 if(v.blocks!==undefined){
  if(!Array.isArray(v.blocks)||!v.blocks.length||v.blocks.length>100)throw Error('Use 1 to 100 document sections.');
  const ids=new Set<string>();let length=0;
  g.blocks=v.blocks.map((b:Record<string,unknown>):GuideBlock=>{
   if(!b||typeof b!=='object'||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(b.id)||ids.has(b.id))throw Error('Invalid document section.');ids.add(b.id);
   const id=b.id;
   if(b.kind==='text'){if(typeof b.text!=='string'||(length+=b.text.length)>16000||!(GUIDE_TEXT_STYLES as readonly string[]).includes(String(b.style))||!(GUIDE_TONES as readonly string[]).includes(String(b.tone)))throw Error('Use the supported document styles and up to 16,000 text characters.');return {id,kind:'text',text:b.text,style:b.style as GuideTextStyle,tone:b.tone as GuideTone};}
   if(b.kind==='gear'||b.kind==='inventory'){if(typeof b.setupId!=='string'||!g.setups?.some(s=>s.id===b.setupId))throw Error('Choose a saved loadout for this section.');return {id,kind:b.kind,setupId:b.setupId};}
   if(b.kind==='requirements'||b.kind==='divider')return {id,kind:b.kind};
   if(b.kind==='odds'){if(typeof b.name!=='string'||b.name.length<1||b.name.length>100||typeof b.rate!=='number'||!Number.isFinite(b.rate)||b.rate<1||b.rate>1e12||!Number.isSafeInteger(b.count)||Number(b.count)<0||Number(b.count)>1e12||!['kills','searches','rolls','runs','catches','actions'].includes(String(b.unit)))throw Error('Use a valid per-action rate and whole attempt count.');return {id,kind:'odds',name:b.name,rate:b.rate,count:Number(b.count),unit:String(b.unit)};}
   throw Error('Unsupported document section.');
  });
 }
 return g;
}
export function guideBlocks(g:Guide):GuideBlock[]{return g.blocks??[
 ...(g.requirements||g.requiredItems?.length||g.requiredQuests?.length||g.requiredDiaries?.length?[{id:'requirements',kind:'requirements' as const}]:[]),
 ...guideSetups(g).flatMap(s=>s.inventory.some(Boolean)||Object.values(s.equipment).some(Boolean)?[{id:'gear-'+s.id,kind:'gear' as const,setupId:s.id},{id:'bag-'+s.id,kind:'inventory' as const,setupId:s.id}]:[]),
 {id:'strategy',kind:'text',text:g.strategy,style:'body',tone:'default'},
 ];}
export type GuideTextBlock={kind:'paragraph'|'heading'|'list';text:string;items?:string[]};
/** Limited formatting vocabulary. Text is rendered as React nodes, never interpreted as HTML. */
export function guideTextBlocks(text:string):GuideTextBlock[]{
 const blocks:GuideTextBlock[]=[];
 for(const line of text.split(/\r?\n/)){if(!line.trim())continue;const heading=line.match(/^#{1,3}\s+(.+)/),bullet=line.match(/^[-*]\s+(.+)/);if(heading)blocks.push({kind:'heading',text:heading[1]});else if(bullet){const last=blocks.at(-1);if(last?.kind==='list')last.items!.push(bullet[1]);else blocks.push({kind:'list',text:'',items:[bullet[1]]});}else blocks.push({kind:'paragraph',text:line});}return blocks;
}
export type GuideInline=string|{kind:'bold';children:GuideInline[]}|{kind:'tone';tone:GuideTone;children:GuideInline[]}|{kind:'emoji';name:string};
const INLINE=/\*\*([^*]+)\*\*|\{(default|gold|orange|green)\}|:([a-z_]+):/;
/** Inline formatting inside one line: **bold**, {gold}coloured{/gold} and :emoji: names from the site set. Anything else stays text. */
export function guideInline(text:string):GuideInline[]{
 const out:GuideInline[]=[],re=new RegExp(INLINE.source,'g');let at=0;const push=(t:string)=>{if(!t)return;if(typeof out.at(-1)==='string')out[out.length-1]+=t;else out.push(t);};
 for(;;){
  const m=re.exec(text);if(!m)break;
  if(m[1]!==undefined){push(text.slice(at,m.index));out.push({kind:'bold',children:guideInline(m[1])});at=re.lastIndex;continue;}
  if(m[3]!==undefined){if(!Object.hasOwn(GUIDE_EMOJIS,m[3])){re.lastIndex=m.index+1;continue;}push(text.slice(at,m.index));out.push({kind:'emoji',name:m[3]});at=re.lastIndex;continue;}
  // A colour runs to its matching close tag; an unmatched tag is ordinary text.
  const tone=m[2] as GuideTone,open=`{${tone}}`,close=`{/${tone}}`;let depth=1,i=re.lastIndex;
  while(depth){const o=text.indexOf(open,i),c=text.indexOf(close,i);if(c<0)break;if(o>=0&&o<c){depth++;i=o+open.length;}else{depth--;i=c+close.length;}}
  if(depth){continue;}
  push(text.slice(at,m.index));out.push({kind:'tone',tone,children:guideInline(text.slice(re.lastIndex,i-close.length))});at=re.lastIndex=i;
 }
 push(text.slice(at));return out;
}
/** Plain words of a line, without formatting marks (for outlines and labels). */
export function guidePlainText(text:string):string{const walk=(n:GuideInline[]):string=>n.map(x=>typeof x==='string'?x:x.kind==='emoji'?'':walk(x.children)).join('');return walk(guideInline(text));}
