import {emptyEquipped,type Equipped} from './flair';
import {emptyGuide} from './guides';
import type {Guide,GuideBlock,GuideSetupProfile} from './guides';

/** Layouts a new guide can start from: the sections a bossing, quest or diary guide needs, with a line in each saying what goes there.
 * The author picks the title and topic first; the layout fills in around them. Every layout must pass parseGuide like any draft. */
export type GuideLayoutId='blank'|'pvm'|'quest'|'diary';
export type GuideLayout={id:GuideLayoutId;label:string;text:string;icon:string;build:(title:string,activity:string)=>Guide};

const gear=(items:Partial<Equipped>):Equipped=>({...emptyEquipped(),...items});
const bag=(...stacks:[string,number][])=>{const slots:(string|null)[]=stacks.flatMap(([id,n])=>Array<string>(n).fill(id));return [...slots,...Array<null>(28-slots.length).fill(null)];};
const text=(id:string,body:string,style:Extract<GuideBlock,{kind:'text'}>['style']='body',tone:Extract<GuideBlock,{kind:'text'}>['tone']='default'):GuideBlock=>({id,kind:'text',text:body,style,tone});

const empty=bag();
const tier=(id:string,name:string):GuideSetupProfile=>({id,name,inventory:empty,equipment:gear({})});
const base=(title:string,activity:string,summary:string,strategy:string):Guide=>({...emptyGuide(),title,activity,summary,strategy,requirements:'',requiredItems:[],requiredQuests:[],requiredDiaries:[],requiredSkills:[],requiredOther:[]});

/** Bossing: why it is worth doing, getting there, the fight, gear for every budget, drops and tips (the Kraken guide's shape). */
function pvm(title:string,activity:string):Guide{
 const setups=[tier('early','Early game'),tier('mid','Mid game'),tier('late','Late game'),tier('max','Max')];
 return {...base(title,activity,`What ${activity} is, who this guide is for and what you will get out of it.`,`The fight in a sentence or two: what kills you, and what makes ${activity} easy once you know it.`),
  setups,equipment:setups[0].equipment,inventory:empty,blocks:[
  text('why',`Why ${activity}?`,'heading'),
  text('why-body','What makes this boss worth doing: the drops, the pet, the XP, or how relaxed it is.'),
  {id:'requirements',kind:'requirements'},
  text('travel','Getting there','heading'),
  text('travel-steps','The fastest teleport or route.\nAnything to unlock or pay on the way in.','list'),
  text('fight','The fight','heading'),
  text('fight-steps','How the fight starts.\nEach attack or phase, and what to do about it.\nWhen to eat, drink or leave.','numbered'),
  {id:'gear-divider',kind:'divider'},
  text('gear','Gear for every budget','heading'),
  text('gear-intro','Which combat style to use, and the one upgrade that matters most. Fill each budget in the gear editor.'),
  {id:'gear-tiers',kind:'loadouts',setupIds:setups.map(s=>s.id),inventoryId:'mid'},
  text('inventory-body','What to bring for a trip, and how many kills it lasts.'),
  text('drops','Drops worth knowing','heading'),
  text('drops-intro','The drops worth chasing, and what they are used for.'),
  {id:'drops-table',kind:'drops',page:activity},
  text('tips','Tips','heading'),
  text('tips-list','A tip that saves time or supplies.\nA common mistake to avoid.','list'),
 ]};
}
/** Quest: overview, requirements, what to bring, the walkthrough in steps, and rewards. */
function quest(title:string,activity:string):Guide{
 const setups=[{id:'items',name:'Quest items',inventory:empty,equipment:gear({})}];
 return {...base(title,activity,`A quick walkthrough of ${activity}: what to bring, every step in order, and the rewards.`,`Where ${activity} starts and the main steps, in a sentence or two.`),
  setups,equipment:setups[0].equipment,inventory:empty,blocks:[
  text('overview','Overview','heading'),
  text('overview-body','Where the quest starts, how long it takes, and why it is worth doing.'),
  {id:'requirements',kind:'requirements'},
  text('items','What to bring','heading'),
  {id:'bag-items',kind:'inventory',setupId:'items'},
  text('items-body','Every item you need, and anything worth bringing for safety.'),
  text('walkthrough','Walkthrough','heading'),
  text('step-1','Step 1','subheading'),
  text('step-1-body','Who to talk to and where.\nWhat to do next.','numbered'),
  text('step-2','Step 2','subheading'),
  text('step-2-body','The next part of the quest, in order.','numbered'),
  text('step-3','Step 3','subheading'),
  text('step-3-body','How the quest finishes.','numbered'),
  {id:'rewards-divider',kind:'divider'},
  text('rewards','Rewards','heading'),
  text('rewards-list','Quest points\nExperience rewards\nItems and unlocks','list','gold'),
 ]};
}
/** Achievement diary: overview, requirements, then the tasks and rewards for each tier. */
function diary(title:string,activity:string):Guide{
 const tiers=['Easy','Medium','Hard','Elite'];
 return {...base(title,activity,`Every ${activity} task, tier by tier, with what you need and the rewards worth unlocking.`,`The fastest order to finish the ${activity} tasks, and what to prepare first.`),
  setups:[tier('main','Diary items')],equipment:gear({}),inventory:empty,blocks:[
  text('overview','Overview','heading'),
  text('overview-body','Which rewards make this diary worth finishing, and the order to do the tiers in.'),
  {id:'requirements',kind:'requirements'},
  ...tiers.flatMap(t=>[text(t.toLowerCase(),`${t} tasks`,'subheading'),text(t.toLowerCase()+'-body','A task and how to do it quickly.\nAnother task, grouped by area.','list')]),
  {id:'rewards-divider',kind:'divider'},
  text('rewards','Rewards','heading'),
  text('rewards-list','Easy: the reward\nMedium: the reward\nHard: the reward\nElite: the reward','list','gold'),
 ]};
}
export const GUIDE_LAYOUTS:GuideLayout[]=[
 {id:'blank',label:'Blank',text:'An empty page',icon:'/icons/navigation/collection-log-icon.png',build:(title,activity)=>({...emptyGuide(),title,activity,blocks:[text('intro','','body')]})},
 {id:'pvm',label:'Bossing',text:'Fight, gear tiers, drops',icon:'/icons/navigation/combat-achievements-icon.png',build:pvm},
 {id:'quest',label:'Quest',text:'Items, steps, rewards',icon:'/icons/navigation/quest-point-icon.png',build:quest},
 {id:'diary',label:'Diary',text:'Tasks by tier, rewards',icon:'/icons/navigation/achievement-diaries-icon.png',build:diary},
];
