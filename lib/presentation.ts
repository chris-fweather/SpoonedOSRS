import {rankTitles} from './rank-rewards';
import {hasGildedSupporter} from './staff-appearance';
import {achievementTitle, earnedMarks, badgeCatalogue} from './flair';
import type {Journal} from './model';
import type {PublicStaff, StaffRole} from './staff-policy';
export type Presentation = {staffBadge:StaffRole|'gilded'|null;staffPrefix:'Sir'|null;titleChoice:string;showDonation:boolean};
export type Donation = {amountMinor:number|null;currency:string;hidden:boolean;badge?:'gilded'|null;supporter?:boolean};
export function signatureTitle(name:string){return name.toLowerCase()==='spoonedosrs'?'the One and Only':null;}
export function titleChoices(j:Journal,supporter=false,role?:StaffRole|null) {
 const marks=new Set(earnedMarks(j).map(m=>m.id));
 return [
  ...(supporter?[{id:'supporter',label:'Supporter',unlocked:true,requirement:'Support Spooned OSRS'}]:[]),
  {id:'staff-helper',label:'the Helper',unlocked:!!role,requirement:'Become a community helper'},
  {id:'staff-moderator',label:'the Moderator',unlocked:!!role&&role!=='helper',requirement:'Become a community moderator'},
  {id:'staff-admin',label:'the Administrator',unlocked:role==='admin'||role==='owner',requirement:'Become a community admin'},
  ...rankTitles(j),
  ...(signatureTitle(j.username)?[{id:'one-and-only',label:'the One and Only',unlocked:true,requirement:'Exclusive to SpoonedOSRS'}]:[]),
  {id:'pet-hunter',label:'the Pet Hunter',unlocked:marks.has('pets-1'),requirement:'Collect your first pet'},
  {id:'pet-collector',label:'the Pet Collector',unlocked:j.pets.filter(p=>p.obtained).length>=10,requirement:'Collect 10 pets'},
  {id:'pet-tamer',label:'the Pet Tamer',unlocked:j.pets.filter(p=>p.obtained).length>=25,requirement:'Collect 25 pets'},
  {id:'log-collector',label:'the Log Collector',unlocked:(j.log?.obtained??0)>=100,requirement:'Unlock 100 collection log slots'},
  {id:'clogger',label:'the Clogger',unlocked:(j.log?.obtained??0)>=500,requirement:'Unlock 500 collection log slots'},
  {id:'menagerie',label:'the Zoo Keeper',unlocked:marks.has('pets-50'),requirement:'Collect 50 pets'},
  {id:'beastmaster',label:'the Beastmaster',unlocked:marks.has('pets-all'),requirement:'Collect every pet'},
  {id:'completionist',label:'the Completionist',unlocked:marks.has('clog-all'),requirement:'Unlock every collection log slot'},
  {id:'combatant',label:'the Combatant',unlocked:marks.has('combat-100'),requirement:'Complete 100 combat achievement tasks'},
  {id:'questmaster',label:'the Wise Old Man',unlocked:marks.has('quest-cape'),requirement:'Finish every synced quest'},
  {id:'achiever',label:'the Achiever',unlocked:marks.has('diary-cape'),requirement:'Complete every diary'},
  {id:'maxed',label:'the Maxed',unlocked:marks.has('max-cape'),requirement:'Reach 99 in every skill'},
 ].sort((a,b)=>['common','uncommon','rare','epic','legendary'].indexOf(titleRarity(a.label))-['common','uncommon','rare','epic','legendary'].indexOf(titleRarity(b.label)));
}
/** Use the same synced progress as achievement emblems. */
export function titleProgress(j:Journal,id:string){
 if(id==='log-collector')return {completed:j.log?.obtained??0,total:100,unit:'log slots'};
 if(id==='clogger')return {completed:j.log?.obtained??0,total:500,unit:'log slots'};
 const ids:Record<string,[string,string]>={'pet-hunter':['pets-1','pets'],'pet-collector':['pets-10','pets'],'pet-tamer':['pets-25','pets'],'menagerie':['pets-50','pets'],'beastmaster':['pets-all','pets'],'completionist':['clog-all','log slots'],'combatant':['combat-100','tasks'],'questmaster':['quest-cape','quests'],'achiever':['diary-cape','tasks'],'maxed':['max-cape','skills at 99']};
 const entry=ids[id];if(!entry)return null;
 const badge=badgeCatalogue(j).find(b=>b.id===entry[0]);
 return badge?{completed:badge.completed,total:badge.total,unit:entry[1]}:null;
}
/** Resolve legacy automatic preferences to an explicit choice when editing. */
export function editableTitleChoice(j:Journal,choice:string,mark:string|null,owner=false,supporter=false,role?:StaffRole|null){
 if(choice!=='auto')return choice;
 const label=selectedTitle(j,choice,mark,owner,supporter,role);
 return titleChoices(j,supporter,role??(owner?'owner':null)).find(t=>t.label===label)?.id??'none';
}
export function selectedTitle(j:Journal,choice:string,mark:string|null,owner=false,supporter=false,role?:StaffRole|null) {
 if(choice==='auto')return signatureTitle(j.username)??achievementTitle(j,mark)??(supporter?'Supporter':null);
 if(choice==='none')return null;
 return titleChoices(j,supporter,role??(owner?'owner':null)).find(t=>t.id===choice&&(t.unlocked||owner))?.label??(supporter?'Supporter':null);
}
export function parsePresentation(input:Partial<Presentation>,prior:Presentation,j:Journal,staff:PublicStaff|null,donation?:Donation,supporter=false):Presentation {
 const p={...prior,...input}, owner=staff?.role==='owner';
 if(![null,'helper','moderator','admin','owner','gilded'].includes(p.staffBadge))throw Error('Choose a valid staff badge.');
 if(![null,'Sir'].includes(p.staffPrefix))throw Error('Choose a valid staff prefix.');
 if(p.staffBadge==='gilded'&&!hasGildedSupporter(donation))throw Error('That supporter badge is not unlocked.');
 if(!owner&&p.staffBadge!==null&&p.staffBadge!=='gilded')throw Error('Only the site owner can choose alternate staff badges.');
 if(!staff&&p.staffPrefix!==null)throw Error('That name title is not unlocked.');
 if(typeof p.showDonation!=='boolean')throw Error('Choose whether to show your donation amount.');
 if(!['auto','none'].includes(p.titleChoice)&&!titleChoices(j,supporter,staff?.role).some(t=>t.id===p.titleChoice&&(t.unlocked||owner)))throw Error('That title is not unlocked.');
 return p;
}
export function donationLabel(d?:Donation):string {
 if(d?.hidden)return 'Supporter';
 return 'Supporter · '+(d?.amountMinor==null?'?':new Intl.NumberFormat('en-US',{style:'currency',currency:d.currency}).format(d.amountMinor/100));
}

/** Visual rarity is shared by the editor, profiles and community rows. */
export function titleRarity(label:string|null|undefined):'common'|'uncommon'|'rare'|'epic'|'legendary'{
 if(['the One and Only','the Beastmaster','the Completionist'].includes(label??'')||/^the .+ Champion$/.test(label??''))return 'legendary';
 if(['the Zoo Keeper','the Maxed','the Achiever','the Administrator'].includes(label??''))return 'epic';
 if(['the Pet Tamer','the Clogger','the Wise Old Man','the Moderator'].includes(label??'')||/^the .+ Elite$/.test(label??''))return 'rare';
 return ['Supporter','the Pet Collector','the Log Collector','the Helper'].includes(label??'')?'uncommon':'common';
}
export function titleEffect(label:string|null|undefined):string {
 if(/^the .+ Champion$/.test(label??''))return 'title-hiscore-champion';
 const effects:Record<string,string>={'the One and Only':'title-one-only','the Beastmaster':'title-pet-master','the Completionist':'title-log-master','the Maxed':'title-maxed','the Zoo Keeper':'title-epic','the Achiever':'title-epic','the Pet Collector':'title-uncommon','the Pet Tamer':'title-rare','the Log Collector':'title-uncommon','the Clogger':'title-rare','the Wise Old Man':'title-rare','the Combatant':'title-common','Supporter':'title-supporter','the Helper':'title-uncommon','the Moderator':'title-rare','the Administrator':'title-epic'};
 return effects[label??'']??(/^the .+ Elite$/.test(label??'')?'title-rare':'title-common');
}

/** Shared descriptions for earned titles in profiles, boards and the editor. */
export function achievementDescription(label:string):string {
 const champion=label.match(/^the (.+) Champion$/),elite=label.match(/^the (.+) Elite$/);
 if(champion)return `Rank #1 in ${champion[1]} on the latest synced hiscores`;
 if(elite)return `Top 1,000 in ${elite[1]} on the latest synced hiscores`;
 const descriptions:Record<string,string>={
  'Supporter':'Supports Spooned OSRS',
  'the Helper':'Become a community helper', 'the Moderator':'Become a community moderator', 'the Administrator':'Become a community admin',
  'the One and Only':'Exclusive to SpoonedOSRS',
  'the Pet Hunter':'Collect your first pet', 'the Pet Collector':'Collect 10 pets', 'the Pet Tamer':'Collect 25 pets', 'the Log Collector':'Unlock 100 collection log slots',
  'the Clogger':'Unlock 500 collection log slots', 'the Zoo Keeper':'Collect 50 pets',
  'the Beastmaster':'Collect every pet', 'the Completionist':'Unlock every collection log slot',
  'the Combatant':'Complete 100 combat achievement tasks', 'the Wise Old Man':'Finish every synced quest',
  'the Achiever':'Complete every diary task', 'the Maxed':'Reach 99 in every skill',
 };
 return descriptions[label]??label;
}
