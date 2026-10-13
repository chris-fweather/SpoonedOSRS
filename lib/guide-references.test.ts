import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyGuide,parseGuide,guideInline,guidePlainText,newGuideSetup} from './guides.ts';
import {guideReference,searchGuideReferences} from './guide-references.ts';
const valid=()=>({...emptyGuide(),title:'Kraken setup',activity:'Kraken',summary:'A sample inventory and equipment setup.',strategy:'Use this strategy with your preferred combat setup.'});

test('[[game terms]] become references; anything else stays text',()=>{
 assert.deepEqual(guideInline('Pray [[Protect from Magic]] now'),['Pray ',{kind:'ref',name:'Protect from Magic'},' now']);
 assert.deepEqual(guideInline('empty [[ ]] and [[unclosed'),['empty [[ ]] and [[unclosed']);
 assert.equal(guidePlainText('Use a [[Dramen staff]].'),'Use a Dramen staff.');
});
test('references resolve skills, prayers, quests and items to icons and Wiki pages',()=>{
 assert.equal(guideReference('slayer').icon,'/icons/skills/slayer.png');
 assert.equal(guideReference('Protect from Magic').icon,'/icons/prayers/protect-from-magic.png');
 assert.equal(guideReference('Dramen staff').kind,'item');
 const unknown=guideReference('Kraken Cove');assert.equal(unknown.kind,'term');assert.equal(unknown.icon,null);
 assert.equal(unknown.href,'https://oldschool.runescape.wiki/w/Kraken_Cove');
 assert.ok(searchGuideReferences('protect').some(r=>r.name==='Protect from Magic'));
});
test('skill and custom requirements are validated',()=>{
 const g=parseGuide({...valid(),requiredSkills:[{skill:'Slayer',level:87}],requiredOther:[{label:'Krack on unlocked',itemId:null},{label:'Fairy ring access',itemId:'772'}]});
 assert.deepEqual(g.requiredSkills,[{skill:'Slayer',level:87}]);assert.equal(g.requiredOther?.length,2);
 assert.throws(()=>parseGuide({...valid(),requiredSkills:[{skill:'Slayer',level:100}]}));
 assert.throws(()=>parseGuide({...valid(),requiredSkills:[{skill:'Slayer',level:80},{skill:'Slayer',level:90}]}));
 assert.throws(()=>parseGuide({...valid(),requiredSkills:[{skill:'Dancing',level:5}]}));
 assert.throws(()=>parseGuide({...valid(),requiredOther:[{label:'x',itemId:null}]}));
 assert.throws(()=>parseGuide({...valid(),requiredOther:[{label:'Bad icon',itemId:'javascript:1'}]}));
});
test('gear tiers name saved loadouts only, once each; setup notes are bounded',()=>{
 const setups=[{...newGuideSetup('Early','early'),note:'Cheap.'},newGuideSetup('Max','max')];
 const g=parseGuide({...valid(),setups,blocks:[{id:'t',kind:'loadouts',setupIds:['early','max']}]});
 assert.equal(g.setups?.[0].note,'Cheap.');
 assert.throws(()=>parseGuide({...valid(),setups,blocks:[{id:'t',kind:'loadouts',setupIds:['early','missing']}]}));
 assert.throws(()=>parseGuide({...valid(),setups,blocks:[{id:'t',kind:'loadouts',setupIds:['early','early']}]}));
 assert.throws(()=>parseGuide({...valid(),setups:[{...setups[0],note:'x'.repeat(401)}]}));
});

test('a plural after a game term stays inside its link',()=>{
 assert.deepEqual(guideInline('a few [[Shark]]s per trip'),['a few ',{kind:'ref',name:'Shark',suffix:'s'},' per trip']);
 assert.equal(guidePlainText('[[Fire rune]]s'),'Fire runes');
});
