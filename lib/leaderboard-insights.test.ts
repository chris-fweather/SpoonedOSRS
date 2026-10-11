import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,validatePet} from './model.ts';
import {journalStats,metricValue,rankedPlayers,rankedSupporters,communityPage} from './community.ts';
import {selectedTitle,parsePresentation,achievementDescription} from './presentation.ts';
import {acquisitionLabel,xpAtLevel} from './pet-record.ts';
import {DONATOR_TITLE} from './flair.ts';

test('skill rankings use each skill XP, keep unknowns unranked and preserve global ranks when searched',()=>{
 const row=(name:string,xp:number|null)=>{const j=structuredClone(initial);j.hiscores.skills=xp===null?[]:[{name:'Farming',xp,level:1,rank:1}];return {name,title:null,pets:0,log:0,stats:journalStats(j)};};
 const rows=[row('Lower',100),row('Higher',200),row('Unknown',null),row('Zero',0)];
 assert.equal(rankedPlayers(rows,'xp','','Farming')[0].row.name,'Higher');
 assert.equal(rankedPlayers(rows,'xp','Lower','Farming')[0].rank,2);
 assert.equal(rankedPlayers(rows,'xp','Unknown','Farming')[0].rank,null);
 assert.equal(metricValue(rows[3],'xp','Farming'),0);
 rows[0].stats.hidden=['xp'];assert.equal(metricValue(rows[0],'xp','Farming'),null);
});
test('full supporter rankings pass 25 while homepage pagination stops at 25',()=>{
 const rows=Array.from({length:53},(_,i)=>({name:'Player '+i,title:DONATOR_TITLE,pets:0,log:0,donation:{amountMinor:1000-i,currency:'USD',hidden:false}}));
 const ranked=rankedSupporters(rows);
 assert.equal(communityPage(ranked,5,10).total,53);assert.equal(communityPage(ranked,5,10).items.length,3);
 assert.equal(communityPage(ranked,5,5,25).total,25);assert.equal(communityPage(ranked,5,5,25).items.at(-1)?.rank,25);
});
test('the signature title is exclusive to SpoonedOSRS even for another site owner',()=>{
 const j={...structuredClone(initial),username:'SpoonedOSRS'},prior={staffBadge:null,staffPrefix:null,titleChoice:'auto',showDonation:true} as const;
 assert.equal(selectedTitle(j,'auto',null),'the One and Only');assert.equal(selectedTitle(j,'none',null),null);
 assert.equal(parsePresentation({titleChoice:'one-and-only'},prior,j,null).titleChoice,'one-and-only');
 assert.throws(()=>parsePresentation({titleChoice:'one-and-only'},prior,initial,{role:'owner',prefix:null}));
 assert.notEqual(achievementDescription('the One and Only'),'the One and Only');
});
test('estimated acquisition XP stays labelled and validates independently of current effort',()=>{
 const p=structuredClone(initial.pets.find(p=>p.name==='Tangleroot')!);Object.assign(p,{obtainedCount:9200000,obtainedUnit:'XP',obtainedMethod:'Farming runs',obtainedApproximate:true});
 assert.ok(validatePet(p));assert.ok(p.obtainedCount!>=xpAtLevel(95)&&p.obtainedCount!<xpAtLevel(96));assert.equal(acquisitionLabel(p),'~9,200,000 XP (estimated)');
 assert.equal(validatePet({...p,obtainedApproximate:'yes'} as never),false);
});
