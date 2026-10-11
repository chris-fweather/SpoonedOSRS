import test from 'node:test';
import assert from 'node:assert/strict';

import {initial} from './model.ts';
import {collectedDate,companionDescription} from './pet-presentation.ts';
test('companion hover distinguishes acquisition rewards and current completions without unrelated skill XP',()=>{
 const j=structuredClone(initial),p=j.pets.find(p=>p.name==='Tiny tempor')!;
 p.obtained=true;p.obtainedCount=1024;p.obtainedUnit='rolls';p.obtainedMethod='Reward pool';
 p.methods=[{name:'Tempoross rewards',unit:'rolls',kc:2345,activity:null,rate:8000,kph:100,source:'Recorded'}];
 j.hiscores.skills=[{name:'Fishing',level:99,xp:14000000,rank:1}];
 j.hiscores.activities=[{name:'Tempoross',score:400,rank:1}];
 const tip=companionDescription(j,p.id,p.name);
 for(const text of ['Obtained: 1,024 permits spent','Received from: Reward pool','Current Tempoross rewards: 2,345 rolls','Current Tempoross: 400 completions'])assert.ok(tip.includes(text),text);
 assert.ok(!tip.includes('Current Fishing:'));
 assert.equal(companionDescription({...j,restricted:true},p.id,p.name),p.name);
 delete p.obtainedCount;assert.ok(companionDescription(j,p.id,p.name).split('\n').includes('Obtained'));
});
test('skill pets and boss pets retain distinct units and unknown counts stay unknown',()=>{
 const j=structuredClone(initial),skill=j.pets.find(p=>p.name==='Beaver')!,boss=j.pets.find(p=>p.name==='Baby Mole')!;
 skill.obtained=true;skill.obtainedCount=8500000;skill.obtainedUnit='XP';
 j.hiscores.skills=[{name:'Woodcutting',level:99,xp:13034431,rank:2}];
 assert.ok(companionDescription(j,skill.id,skill.name).includes('Obtained: 8,500,000 XP'));
 boss.obtained=true;boss.obtainedCount=125;boss.obtainedUnit='kills';boss.methods=[{name:'Giant Mole',unit:'kills',activity:'Giant Mole',kc:400,rate:3000,kph:50,source:'Wiki'}];
 j.hiscores.activities=[{name:'Giant Mole',score:500,rank:2}];
 const tip=companionDescription(j,boss.id,boss.name);assert.ok(tip.includes('Obtained: 125 kills'));assert.ok(tip.includes('Current Giant Mole: 500 KC'));assert.ok(!tip.includes('400 kills'));
});

test('reward pets omit lifetime skill XP while true skilling pets retain it',()=>{
 const j=structuredClone(initial);
 j.hiscores.skills=[{name:'Fishing',level:99,xp:14000000,rank:1},{name:'Runecraft',level:99,xp:14000000,rank:1},{name:'Firemaking',level:99,xp:14000000,rank:1},{name:'Woodcutting',level:99,xp:14000000,rank:1}];
 for(const name of ['Tiny tempor','Abyssal protector','Phoenix']){
  const p=j.pets.find(p=>p.name===name)!;
  assert.ok(!companionDescription(j,p.id,p.name).includes(' XP'),name);
 }
 const beaver=j.pets.find(p=>p.name==='Beaver')!;
 assert.ok(companionDescription(j,beaver.id,beaver.name).includes('Current Woodcutting: 14,000,000 XP'));
});

test('pet collection dates retain their recorded day and never appear on private hovers',()=>{
 const j=structuredClone(initial),p=j.pets.find(p=>p.name==='Tiny tempor')!;p.obtained=true;p.date='2025-08-22';
 assert.equal(collectedDate(p.date),'22/08/2025');
 assert.ok(companionDescription(j,p.id,p.name).includes('Collected: 22/08/2025'));
 assert.equal(companionDescription({...j,restricted:true},p.id,p.name),p.name);
});
