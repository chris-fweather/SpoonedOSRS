import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyGuide,parseGuide,mayEditGuide,mayPublishGuide,guideItems,guideSetups,newGuideSetup,guideQuests,guideDiaryAreas,guideTextBlocks} from './guides.ts';
import {wearables} from './flair.ts';
import {planningCatalogue,parsePlanning,applyPlanning} from './planning-catalogue.ts';
import {initial} from './model.ts';
const valid=()=>({...emptyGuide(),title:'Kraken setup',activity:'Kraken',summary:'A sample inventory and equipment setup.',strategy:'Use this strategy with your preferred combat setup.'});
test('guide permissions separate drafting from publication',()=>{assert.equal(mayPublishGuide('helper'),false);assert.equal(mayPublishGuide('moderator'),true);assert.equal(mayEditGuide('helper','a','a'),true);assert.equal(mayEditGuide('moderator','b','a'),false);assert.equal(mayEditGuide('admin','b','a'),true);});
test('guide payloads validate gear slots and inventory IDs, retain text as text',()=>{const g=valid();g.strategy='<script>alert(1)</script> is rendered as plain text.';g.inventory[0]=Object.keys(guideItems)[0];assert.equal(parseGuide(g).strategy,g.strategy);assert.throws(()=>parseGuide({...g,inventory:Array(29).fill(null)}));assert.throws(()=>parseGuide({...g,inventory:['javascript:bad',...Array(27).fill(null)]}));const item=Object.entries(wearables.items).find(([,i])=>i.slot!=='head')!;assert.throws(()=>parseGuide({...g,equipment:{...g.equipment,head:item[0]}}));});
test('planning edits never turn observed XP into odds or overwrite custom pace',()=>{const target=planningCatalogue().find(t=>t.pace!==null)!;assert.throws(()=>parsePlanning(target.key,NaN,null));assert.throws(()=>parsePlanning('unknown',20,null));const p=parsePlanning(target.key,37,2000000);const j=structuredClone(initial),pet=j.pets.find(x=>x.name===target.pet)!,m=pet.methods.find(x=>x.name===target.method)!,rate=m.rate;applyPlanning(j,target.key,p,'https://example.com',1);assert.equal(m.kph,37);assert.equal(m.rate,rate);m.kph=38;m.source='Personal pace';applyPlanning(j,target.key,p,'https://example.com',2);assert.equal(m.kph,38);});

test('legacy guide upgrades to one setup while named loadouts remain independent',()=>{
 const g=valid(),id=Object.keys(guideItems)[0];g.inventory[0]=id;
 const legacy=parseGuide(g);assert.equal(guideSetups(legacy).length,1);assert.equal(guideSetups(legacy)[0].inventory[0],id);
 const budget=newGuideSetup('Budget','budget'),endgame=newGuideSetup('Endgame','endgame');budget.inventory[1]=id;
 const current=parseGuide({...g,setups:[budget,endgame],requiredQuests:[guideQuests[0]],requiredDiaries:[{area:guideDiaryAreas[0],tier:'Hard'}]});
 assert.equal(current.setups?.length,2);assert.equal(current.setups?.[1].inventory[1],null);assert.equal(current.inventory[1],id);assert.equal(current.requiredQuests?.[0],guideQuests[0]);assert.equal(current.requiredDiaries?.[0].tier,'Hard');
 assert.throws(()=>parseGuide({...g,setups:[budget,{...endgame,id:'budget'}]}));assert.throws(()=>parseGuide({...g,setups:[budget,{...endgame,name:'BUDGET'}]}));assert.throws(()=>parseGuide({...g,setups:Array(9).fill(budget)}));
});
test('quest and diary attachments are catalogue validated, not arbitrary payloads',()=>{
 const g=valid();assert.throws(()=>parseGuide({...g,requiredQuests:['Invented quest']}));assert.throws(()=>parseGuide({...g,requiredQuests:[guideQuests[0],guideQuests[0]]}));assert.throws(()=>parseGuide({...g,requiredDiaries:[{area:guideDiaryAreas[0],tier:'Impossible'}]}));assert.throws(()=>parseGuide({...g,requiredDiaries:[null]}));
});
test('rich guide formatting is limited to safe text blocks',()=>{
 const blocks=guideTextBlocks('## Positioning\n- First step\n- **Protect** from attacks\n<script>alert(1)</script>');assert.deepEqual(blocks.map(b=>b.kind),['heading','list','paragraph']);assert.deepEqual(blocks[1].items,['First step','**Protect** from attacks']);assert.equal(blocks[2].text,'<script>alert(1)</script>');
});


test('document sections are allowlisted, bounded and reference validated loadouts',()=>{
 const input={...emptyGuide(),title:'Document guide',activity:'Kraken',summary:'A document test with safe structured sections.',strategy:'This document explains a safe and repeatable strategy.'};
 const blocks=[{id:'intro',kind:'text',text:'A paragraph',style:'heading',tone:'gold',html:'<script>bad()</script>'},{id:'gear',kind:'gear',setupId:'recommended'},{id:'chart',kind:'odds',name:'Pet odds',rate:3000,count:775,unit:'kills'}];
 const parsed=parseGuide({...input,blocks});assert.equal(parsed.blocks?.length,3);assert.equal('html' in parsed.blocks![0],false);
 for(const bad of [{...blocks[0],tone:'javascript:red'},{...blocks[0],style:'script'},{...blocks[1],setupId:'missing'},{...blocks[2],rate:0},{...blocks[2],count:1.5},{...blocks[2],unit:'HTML'},{...blocks[0],text:'x'.repeat(16001)}])assert.throws(()=>parseGuide({...input,blocks:[bad]}));
 assert.throws(()=>parseGuide({...input,blocks:[blocks[0],blocks[0]]}));
 assert.throws(()=>parseGuide({...input,blocks:Array.from({length:101},(_,i)=>({id:'section'+i,kind:'divider'}))}));
});
