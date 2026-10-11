import assert from 'node:assert/strict';
import test from 'node:test';
import {requirementParts} from './requirements.ts';
const quests=["The Knight's Sword","Doric's Quest"];
test('completed quest lists display individual canonical quest names',()=>{
 assert.deepEqual(requirementParts("Quest Completion of The Knight's Sword and Doric's Quest",quests,[]),quests.map(quest=>({quest,label:quest})));
});
test('grouped skill requirements retain each level',()=>{
 assert.deepEqual(requirementParts('Mining 10 and Smithing 13',[],['Mining','Smithing']),[{label:'10 Mining',skill:'Mining',level:10},{label:'13 Smithing',skill:'Smithing',level:13}]);
});
test('partial, optional and OR quest conditions are not rewritten as mandatory completion',()=>{
 for(const line of ["Partial completion of The Knight's Sword","Completion of The Knight's Sword or Doric's Quest","Completion of The Knight's Sword (optional)"]){assert.deepEqual(requirementParts(line,quests,[]),[{label:line}]);}
});
