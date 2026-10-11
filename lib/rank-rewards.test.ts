import assert from 'node:assert/strict';
import test from 'node:test';
import {initial} from './model.ts';
import {rankTier,rankTitles} from './rank-rewards.ts';
import {selectedTitle,parsePresentation} from './presentation.ts';
test('rank glows use inclusive thresholds and exclude unknown ranks',()=>{
 for(const [rank,tier] of [[1,'champion'],[10,'gold'],[11,'silver'],[100,'silver'],[101,'bronze'],[1000,'bronze'],[1001,null],[0,null],[-1,null],[1.5,null]] as const)assert.equal(rankTier(rank),tier);
});
test('rank titles follow synced rank and cannot be forged by an owner',()=>{
 const j=structuredClone(initial);j.hiscores.activities=[{name:'Giant Mole',score:500,rank:1}];
 const titles=rankTitles(j);assert.equal(titles.length,2);assert.equal(selectedTitle(j,titles[0].id,null),titles[0].label);
 j.hiscores.activities[0].rank=1000;assert.equal(rankTitles(j).length,1);assert.equal(selectedTitle(j,titles[0].id,null,true),null);
 j.hiscores.activities[0].rank=1001;assert.equal(rankTitles(j).length,0);
 assert.throws(()=>parsePresentation({titleChoice:titles[0].id},{staffBadge:null,staffPrefix:null,titleChoice:'none',showDonation:true},j,{role:'owner',prefix:null}));
});
