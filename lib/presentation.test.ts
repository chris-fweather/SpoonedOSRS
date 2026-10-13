import assert from 'node:assert/strict';
import test from 'node:test';
import {parsePresentation,selectedTitle,donationLabel,titleEffect,achievementDescription,titleChoices,titleRarity,editableTitleChoice,titleProgress} from './presentation.ts';
import {initial} from './model.ts';
const prior={staffBadge:null,staffPrefix:null,titleChoice:'auto',showDonation:true} as const;
test('cosmetic staff choices require owner, without changing actual permissions',()=>{
 for(const role of ['helper','moderator','admin','owner'] as const){
  assert.equal(parsePresentation({staffBadge:role,staffPrefix:'Sir'},prior,initial,{role:'owner',prefix:null}).staffBadge,role);
  assert.throws(()=>parsePresentation({staffBadge:role},prior,initial,{role:'admin',prefix:null}));
 }
 assert.throws(()=>parsePresentation({staffBadge:'fake' as never},prior,initial,{role:'owner',prefix:null}));
});
test('earned title selection is independent of emblem and unknown titles cannot be published',()=>{
 assert.throws(()=>parsePresentation({titleChoice:'beastmaster'},prior,initial,null));
 assert.throws(()=>parsePresentation({titleChoice:'invented'},prior,initial,{role:'owner',prefix:null}));
 const j=structuredClone(initial);j.pets[0].obtained=true;
 assert.equal(selectedTitle(j,'pet-hunter',null),'the Pet Hunter');
 assert.equal(selectedTitle(j,'beastmaster',null),null);
 assert.equal(selectedTitle(j,'beastmaster',null,true),'the Beastmaster');
 assert.equal(selectedTitle(j,'none','pets-1'),null);
});
test('donation labels distinguish unknown, zero and hidden totals',()=>{
 assert.equal(donationLabel(),'Supporter · ?');
 assert.equal(donationLabel({amountMinor:0,currency:'USD',hidden:false}),'Supporter · $0.00');
 assert.equal(donationLabel({amountMinor:500,currency:'USD',hidden:false}),'Supporter · $5.00');
 assert.equal(donationLabel({amountMinor:500,currency:'USD',hidden:true}),'Supporter');
});

test('Sir is available to staff without granting badge overrides',()=>{
 for(const role of ['helper','moderator','admin','owner'] as const)assert.equal(parsePresentation({staffPrefix:'Sir'},prior,initial,{role,prefix:null}).staffPrefix,'Sir');
 assert.throws(()=>parsePresentation({staffPrefix:'Sir'},prior,initial,null));
 assert.throws(()=>parsePresentation({staffPrefix:'Sir'},prior,initial,null));
});
test('completion titles require complete data, while milestone and quest titles remain understated',()=>{
 const j=structuredClone(initial);
 assert.equal(selectedTitle(j,'completionist',null),null);
 j.log={obtained:2,total:3,tabs:[]};
 assert.equal(selectedTitle(j,'completionist',null),null);
 j.log.obtained=3;
 assert.equal(selectedTitle(j,'completionist',null),'the Completionist');
 assert.equal(titleEffect('the Completionist'),'title-log-master');
 assert.equal(titleEffect('the Beastmaster'),'title-pet-master');
 assert.equal(titleRarity('the Pet Hunter'),'common');assert.equal(titleRarity('the Clogger'),'rare');assert.equal(titleRarity('the One and Only'),'legendary');assert.equal(titleEffect('the Maxed'),'title-maxed');
});

test('achievement hover descriptions cover every selectable earned title',()=>{
 for(const t of titleChoices(initial))assert.notEqual(achievementDescription(t.label),t.label);
 assert.equal(achievementDescription('the Completionist'),'Unlock every collection log slot');
});

test('gilded scimitar is an eligible cosmetic selection, never a staff role grant',()=>{
 const gift={amountMinor:10000,currency:'USD',hidden:false};
 assert.equal(parsePresentation({staffBadge:'gilded'},prior,initial,null,gift).staffBadge,'gilded');
 assert.throws(()=>parsePresentation({staffBadge:'gilded'},prior,initial,{role:'owner',prefix:null}));
 assert.throws(()=>parsePresentation({staffBadge:'gilded'},prior,initial,null,{...gift,amountMinor:9999}));
 assert.throws(()=>parsePresentation({staffBadge:'owner'},prior,initial,null,gift));
});


test('supporter default is consistent, respects opt-out and can be explicitly selected only when eligible',()=>{
 const j=structuredClone(initial);j.username='Sample';j.pets.forEach(p=>p.obtained=false);
 assert.equal(selectedTitle(j,'auto',null,false,true),'Supporter');
 assert.equal(selectedTitle(j,'auto',null,false,false),null);
 assert.equal(selectedTitle(j,'none',null,false,true),null);
 assert.equal(parsePresentation({titleChoice:'supporter'},prior,j,null,undefined,true).titleChoice,'supporter');
 assert.throws(()=>parsePresentation({titleChoice:'supporter'},prior,j,null,undefined,false));
 j.pets[0].obtained=true;assert.equal(selectedTitle(j,'pet-hunter',null,false,true),'the Pet Hunter');
});
test('higher title thresholds enforce both display and saving at the boundary',()=>{
 const j=structuredClone(initial);j.pets.forEach((p,i)=>p.obtained=i<9);
 assert.equal(selectedTitle(j,'pet-collector',null),null);
 assert.throws(()=>parsePresentation({titleChoice:'pet-collector'},prior,j,null));
 j.pets[9].obtained=true;assert.equal(selectedTitle(j,'pet-collector',null),'the Pet Collector');
 j.log={obtained:499,total:1717,tabs:[]};assert.equal(selectedTitle(j,'clogger',null),null);
 j.log.obtained=500;assert.equal(selectedTitle(j,'clogger',null),'the Clogger');
 assert.equal(selectedTitle(j,'clogger',null,false,true),'the Clogger');
});

test('legacy automatic choices become explicit without changing the displayed title',()=>{
 const j=structuredClone(initial);j.username='Tester';j.pets.forEach(p=>p.obtained=false);
 assert.equal(editableTitleChoice(j,'auto',null,false,true),'supporter');
 assert.equal(editableTitleChoice(j,'auto',null),'none');
 assert.equal(editableTitleChoice(j,'none',null,false,true),'none');
 j.pets.forEach((p,i)=>p.obtained=i<25);
 assert.equal(editableTitleChoice(j,'auto','pets-10'),'pet-collector');
 assert.equal(titleEffect('Supporter'),'title-supporter');
});

test('title progress uses the same goals as unlock eligibility',()=>{
 const j=structuredClone(initial);j.pets.forEach((p,i)=>p.obtained=i<24);
 assert.deepEqual(titleProgress(j,'pet-collector'),{completed:24,total:10,unit:'pets'});
 j.log={obtained:499,total:1717,tabs:[]};
 assert.deepEqual(titleProgress(j,'clogger'),{completed:499,total:500,unit:'log slots'});
 assert.equal(titleProgress(j,'completionist')?.total,1717);
 assert.equal(titleProgress(j,'supporter'),null);
 j.log=null;assert.equal(titleProgress(j,'completionist')?.total,0);
});


test('staff achievement titles follow the current Discord role and rarity order',()=>{
 const j=structuredClone(initial);
 assert.equal(selectedTitle(j,'staff-helper',null,false,false,'helper'),'the Helper');
 assert.equal(selectedTitle(j,'staff-moderator',null,false,false,'helper'),null);
 assert.equal(selectedTitle(j,'staff-moderator',null,false,false,'moderator'),'the Moderator');
 assert.equal(selectedTitle(j,'staff-admin',null,false,false,'moderator'),null);
 assert.equal(selectedTitle(j,'staff-admin',null,false,false,'admin'),'the Administrator');
 assert.equal(selectedTitle(j,'staff-admin',null,false,false,null),null);
 const rarity=['common','uncommon','rare','epic','legendary'];
 const choices=titleChoices(j,true,'owner');
 for(let i=1;i<choices.length;i++)assert.ok(rarity.indexOf(titleRarity(choices[i-1].label))<=rarity.indexOf(titleRarity(choices[i].label)));
});

test('pet and log title ladders unlock at their exact rarity milestones',()=>{
 const j=structuredClone(initial);
 for(const [count,id,label,rarity] of [[1,'pet-hunter','the Pet Hunter','common'],[10,'pet-collector','the Pet Collector','uncommon'],[25,'pet-tamer','the Pet Tamer','rare'],[50,'menagerie','the Zoo Keeper','epic']] as const){
  j.pets.forEach((p,i)=>p.obtained=i<count-1);assert.equal(selectedTitle(j,id,null),null);
  j.pets[count-1].obtained=true;assert.equal(selectedTitle(j,id,null),label);assert.equal(titleRarity(label),rarity);assert.equal(titleProgress(j,id)?.total,count);
 }
 j.log={obtained:99,total:1717,tabs:[]};assert.equal(selectedTitle(j,'log-collector',null),null);
 j.log.obtained=100;assert.equal(selectedTitle(j,'log-collector',null),'the Log Collector');assert.equal(titleRarity('the Log Collector'),'uncommon');
});

test('donor title thresholds are separate from supporter eligibility',async()=>{
 const {supporterTitle}=await import('./staff-appearance');
 assert.equal(supporterTitle(999,'USD'),null);assert.equal(supporterTitle(1000,'USD'),'the Generous');assert.equal(supporterTitle(1000,'AUD'),null);
 assert.equal(selectedTitle(initial,'supporter',null,false,true),'Supporter');
});
