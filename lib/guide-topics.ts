import activities from './activity-catalogue.json' with {type:'json'};
import {bossArtwork} from './artwork';
import {guideQuests,guideDiaryAreas} from './guides';
import questReference from './quest-reference.json' with {type:'json'};
/** Hiscore entries that are scores rather than something to write a guide about, or that read better under a topic name. */
const RENAME:Record<string,string|null>={'Grid Points':null,'League Points':null,'Deadman Points':null,'Bounty Hunter (Legacy) - Hunter':null,'Bounty Hunter (Legacy) - Rogue':null,'Bounty Hunter - Rogue':null,
 'Bounty Hunter - Hunter':'Bounty Hunter','Clue Scrolls (all)':'Clue scrolls','LMS - Rank':'Last Man Standing','PvP Arena - Rank':'PvP Arena','Soul Wars Zeal':'Soul Wars','Rifts closed':'Guardians of the Rift','Colosseum Glory':'Fortis Colosseum','Collections Logged':'Collection log'};
const SKILLS=['Attack','Strength','Defence','Ranged','Prayer','Magic','Runecraft','Construction','Hitpoints','Agility','Herblore','Thieving','Crafting','Fletching','Slayer','Hunter','Mining','Smithing','Fishing','Cooking','Firemaking','Woodcutting','Farming','Sailing'];
/** A topic, its icon, and a short detail (a quest's difficulty). */
export type GuideTopic={name:string;image:string;detail?:string;badge?:string};
const QUESTS=(questReference as {quests:Record<string,{difficulty?:string}>}).quests;
const CA_TIERS=['Easy','Medium','Hard','Elite','Master','Grandmaster'];
/** What a guide can be about: every boss, raid and activity on the Hiscores (A to Z), every skill, every quest (with its difficulty),
 * every achievement diary and each combat achievement tier, each with its icon. */
export const guideTopics:GuideTopic[]=[
 ...(activities as string[]).flatMap(source=>{const name=Object.hasOwn(RENAME,source)?RENAME[source]:source,image=bossArtwork(source);return name&&image?[{name,image}]:[];}).sort((a,b)=>a.name.localeCompare(b.name)),
 ...SKILLS.flatMap(name=>{const image=bossArtwork(name);return image?[{name,image}]:[];}),
 // Every quest with the quest icon, and its difficulty beside it.
 ...guideQuests.map(name=>{const d=QUESTS[name]?.difficulty;return {name,image:'/icons/navigation/quest-point-icon.png',...(d?{detail:d,badge:`/icons/tiers/${d.toLowerCase()}.png`}:{})};}),
 ...guideDiaryAreas.map(area=>({name:`${area} Diary`,image:'/icons/navigation/achievement-diaries-icon.png',detail:'Achievement diary'})),
 ...CA_TIERS.map(tier=>({name:`${tier} combat achievements`,image:`/icons/tiers/ca-${tier.toLowerCase()}.png`,detail:'Combat achievements'})),
];
export function guideTopicImage(activity:string):string|undefined{const a=activity.trim().toLowerCase();return guideTopics.find(t=>t.name.toLowerCase()===a)?.image??bossArtwork(a);}
/** The layout a topic suits best: a quest guide, a diary guide, or a bossing guide for bosses, raids and activities. */
export function suggestedLayout(activity:string):'pvm'|'quest'|'diary'|'blank'{
 const t=guideTopics.find(x=>x.name===activity);if(!t)return 'blank';
 return t.detail==='Achievement diary'?'diary':t.detail==='Combat achievements'||SKILLS.includes(t.name)?'blank':t.image.endsWith('quest-point-icon.png')?'quest':'pvm';
}
