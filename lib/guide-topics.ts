import activities from './activity-catalogue.json' with {type:'json'};
import {bossArtwork} from './artwork';
/** Hiscore entries that are scores rather than something to write a guide about, or that read better under a topic name. */
const RENAME:Record<string,string|null>={'Grid Points':null,'League Points':null,'Deadman Points':null,'Bounty Hunter (Legacy) - Hunter':null,'Bounty Hunter (Legacy) - Rogue':null,'Bounty Hunter - Rogue':null,
 'Bounty Hunter - Hunter':'Bounty Hunter','Clue Scrolls (all)':'Clue scrolls','LMS - Rank':'Last Man Standing','PvP Arena - Rank':'PvP Arena','Soul Wars Zeal':'Soul Wars','Rifts closed':'Guardians of the Rift','Colosseum Glory':'Fortis Colosseum','Collections Logged':'Collection log'};
const SKILLS=['Attack','Strength','Defence','Ranged','Prayer','Magic','Runecraft','Construction','Hitpoints','Agility','Herblore','Thieving','Crafting','Fletching','Slayer','Hunter','Mining','Smithing','Fishing','Cooking','Firemaking','Woodcutting','Farming','Sailing'];
export type GuideTopic={name:string;image:string};
/** What a guide can be about: every boss, raid and activity on the Hiscores (A to Z), then every skill, each with its official icon. */
export const guideTopics:GuideTopic[]=[
 ...(activities as string[]).flatMap(source=>{const name=Object.hasOwn(RENAME,source)?RENAME[source]:source,image=bossArtwork(source);return name&&image?[{name,image}]:[];}).sort((a,b)=>a.name.localeCompare(b.name)),
 ...SKILLS.flatMap(name=>{const image=bossArtwork(name);return image?[{name,image}]:[];}),
];
export function guideTopicImage(activity:string):string|undefined{const a=activity.trim().toLowerCase();return guideTopics.find(t=>t.name.toLowerCase()===a)?.image??bossArtwork(a);}
