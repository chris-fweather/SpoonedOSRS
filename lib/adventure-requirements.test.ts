import assert from 'node:assert/strict';
import test from 'node:test';
import {diaryRequirementGroups,requirementCompletion} from './adventure-requirements.ts';
const quests=["The Knight's Sword","Doric's Quest"];
const skills=['Agility','Strength','Ranged'];
test('diary requirements use the same skill, quest and item groups without losing item conditions',()=>{
 const itemLine='Mith grapple and any crossbow';
 const items={[itemLine]:[{id:9419,name:'Mith grapple'},{id:837,name:'crossbow'}]};
 const groups=diaryRequirementGroups(['*Agility 11, Strength 37, and Ranged 19',"*Quest Completion of The Knight's Sword",'*'+itemLine,'None'],quests,skills,items);
 assert.deepEqual(groups.skills.map(r=>[r.skill,r.level]),[['Agility',11],['Strength',37],['Ranged',19]]);
 assert.deepEqual(groups.quests,[{label:"The Knight's Sword",quest:"The Knight's Sword"}]);
 assert.deepEqual(groups.items,[{label:itemLine,items:items[itemLine]}]);assert.deepEqual(groups.other,[]);
});
test('conditional and partial requirements stay intact and do not claim completion',()=>{
 const lines=["Quest Completion of The Knight's Sword or Doric's Quest","Quest Partial completion of The Knight's Sword",'Agility 11 (Ironman only)'];
 const groups=diaryRequirementGroups(lines,quests,skills,{});
 assert.equal(groups.quests.length,2);assert.equal(groups.skills.length,1);
 for(const requirement of [...groups.quests,...groups.skills])assert.equal(requirementCompletion(requirement,[{name:'Agility',level:99}],[{name:"The Knight's Sword",state:'finished',points:1}]),null);
});
test('known quest and skill completion is green; missing or private data remains unknown',()=>{
 const skill={label:'11 Agility',skill:'Agility',level:11};
 assert.equal(requirementCompletion(skill,[{name:'Agility',level:15}],undefined),true);
 assert.equal(requirementCompletion(skill,[{name:'Agility',level:5}],undefined),false);
 assert.equal(requirementCompletion(skill,[],undefined),null);
 const quest={label:"The Knight's Sword",quest:"The Knight’s Sword"};
 assert.equal(requirementCompletion(quest,[],[{name:"The Knight's Sword",state:'finished',points:1}]),true);
 assert.equal(requirementCompletion(quest,[],undefined),null);
 const qp=diaryRequirementGroups(['Quest 32'],quests,skills,{}).quests[0];
 assert.equal(qp.points,32);assert.equal(requirementCompletion(qp,[],undefined),null);
 assert.equal(requirementCompletion(qp,[],[{name:'Known',state:'finished',points:33}]),true);
});
