import {GUIDE_SKILLS,guideItemChoices,guideItemImage,guideQuests} from './guides';
import {wiki} from './ui';

/** Game terms a guide can link inline as [[Name]]: each shows its icon and opens its OSRS Wiki page. */
export type GuideReferenceKind='skill'|'prayer'|'spell'|'quest'|'item'|'term';
export type GuideReference={name:string;kind:GuideReferenceKind;icon:string|null;href:string};

export const GUIDE_PRAYERS=['Thick Skin','Burst of Strength','Clarity of Thought','Sharp Eye','Mystic Will','Rock Skin','Superhuman Strength','Improved Reflexes','Rapid Restore','Rapid Heal','Protect Item','Hawk Eye','Mystic Lore','Steel Skin','Ultimate Strength','Incredible Reflexes','Protect from Magic','Protect from Missiles','Protect from Melee','Eagle Eye','Mystic Might','Retribution','Redemption','Smite','Preserve','Chivalry','Piety','Rigour','Augury'];
/** Spells guides often name: combat, ancient, lunar, arceuus and the common teleports. Shown with the Magic icon. */
export const GUIDE_SPELLS=['Wind Strike','Water Strike','Earth Strike','Fire Strike','Wind Bolt','Water Bolt','Earth Bolt','Fire Bolt','Wind Blast','Water Blast','Earth Blast','Fire Blast','Wind Wave','Water Wave','Earth Wave','Fire Wave','Wind Surge','Water Surge','Earth Surge','Fire Surge','Crumble Undead','Iban Blast','Magic Dart','Saradomin Strike','Claws of Guthix','Flames of Zamorak','Confuse','Weaken','Curse','Bind','Snare','Entangle','Vulnerability','Enfeeble','Stun','Tele Block','High Level Alchemy','Low Level Alchemy','Superheat Item','Charge','Smoke Rush','Shadow Rush','Blood Rush','Ice Rush','Smoke Burst','Shadow Burst','Blood Burst','Ice Burst','Smoke Blitz','Shadow Blitz','Blood Blitz','Ice Blitz','Smoke Barrage','Shadow Barrage','Blood Barrage','Ice Barrage','Vengeance','Vengeance Other','Heal Other','Spellbook Swap','Humidify','Plank Make','NPC Contact','Death Charge','Thrall','Resurrect Greater Ghost','Resurrect Greater Skeleton','Resurrect Greater Zombie','Mark of Darkness','Shadow Veil','Ward of Arceuus','Varrock Teleport','Lumbridge Teleport','Falador Teleport','Camelot Teleport','Ardougne Teleport','Teleport to House','Kourend Castle Teleport','Ape Atoll Teleport','Paddewwa Teleport','Lassar Teleport','Dareeyak Teleport','Carrallangar Teleport','Annakarl Teleport','Ghorrock Teleport','Moonclan Teleport','Waterbirth Teleport','Catherby Teleport','Fishing Guild Teleport','Ourania Teleport','Barbarian Teleport'];
/** Each prayer's prayer-book icon (public/icons/prayers). */
const PRAYER_ICONS:Record<string,string>=Object.fromEntries(GUIDE_PRAYERS.map(n=>[n,`/icons/prayers/${n.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`]));

let items:Map<string,string>|undefined;
/** Lower-case item name to the item with its own icon. */
function itemByName(name:string){items??=new Map(guideItemChoices.map(([id,label])=>[label.toLowerCase(),id]));return items.get(name.toLowerCase());}
const find=(list:readonly string[],name:string)=>list.find(x=>x.toLowerCase()===name.toLowerCase());

export function guideReference(raw:string):GuideReference{
 const name=raw.trim();
 // Experience gets the skills icon and the Wiki's Experience page: [[XP]] or [[Experience]].
 if(/^(xp|experience)$/i.test(name))return {name,kind:'term',icon:'/icons/navigation/skills-icon.png',href:wiki('Experience')};
 const skill=find(GUIDE_SKILLS,name);if(skill)return {name:skill,kind:'skill',icon:`/icons/skills/${skill.toLowerCase()}.png`,href:wiki(skill)};
 const prayer=find(GUIDE_PRAYERS,name);if(prayer)return {name:prayer,kind:'prayer',icon:PRAYER_ICONS[prayer]??'/icons/skills/prayer.png',href:wiki(prayer)};
 const spell=find(GUIDE_SPELLS,name);if(spell)return {name:spell,kind:'spell',icon:'/icons/skills/magic.png',href:wiki(spell)};
 const quest=find(guideQuests,name);if(quest)return {name:quest,kind:'quest',icon:'/icons/navigation/quest-point-icon.png',href:wiki(quest)};
 const item=itemByName(name);if(item)return {name,kind:'item',icon:guideItemImage(item),href:wiki(name)};
 return {name,kind:'term',icon:null,href:wiki(name)};
}

/** Picker results for the editor: skills, prayers, quests, then items, best matches first. */
export function searchGuideReferences(query:string,limit=40):GuideReference[]{
 const q=query.trim().toLowerCase();if(!q)return [];
 const rank=(n:string)=>{const l=n.toLowerCase();return l===q?0:l.startsWith(q)?1:l.includes(q)?2:9;};
 const named=[...GUIDE_SKILLS,...GUIDE_PRAYERS,...GUIDE_SPELLS,...guideQuests].filter(n=>rank(n)<9).sort((a,b)=>rank(a)-rank(b)).slice(0,limit).map(guideReference);
 const found=guideItemChoices.filter(([,n])=>rank(n)<9).sort((a,b)=>rank(a[1])-rank(b[1])).slice(0,Math.max(0,limit-named.length)).map(([,n])=>guideReference(n));
 return [...named,...found].sort((a,b)=>rank(a.name)-rank(b.name));
}
