import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_LAYOUTS} from './guide-templates.ts';
import {parseGuide} from './guides.ts';
import {suggestedLayout} from './guide-topics.ts';

test('every guide layout builds a valid draft for its topic',()=>{
 for(const [id,topic] of [['blank','Kraken'],['pvm','Kraken'],['quest','Waterfall Quest'],['diary','Ardougne Diary']] as const){
  const guide=GUIDE_LAYOUTS.find(l=>l.id===id)!.build('A test guide',topic);
  assert.equal(guide.activity,topic,id);
  if(id!=='blank')assert.deepEqual(parseGuide(structuredClone(guide)),guide,id);
 }
});
test('a topic suggests the layout that fits it',()=>{
 assert.equal(suggestedLayout('Kraken'),'pvm');
 assert.equal(suggestedLayout('Waterfall Quest'),'quest');
 assert.equal(suggestedLayout('Ardougne Diary'),'diary');
 assert.equal(suggestedLayout('Easy combat achievements'),'blank');
 assert.equal(suggestedLayout('Slayer'),'blank');
});
test('prayers, spells and images are valid guide sections; image links must be https',async()=>{
 const {GUIDE_LAYOUTS}=await import('./guide-templates.ts');
 const g=GUIDE_LAYOUTS.find(l=>l.id==='pvm')!.build('Test guide','Kraken');
 g.blocks=[...(g.blocks??[]),{id:'p',kind:'prayers',names:['Protect from Magic','Rigour']},{id:'s',kind:'spells',names:['Ice Barrage']},{id:'i',kind:'image',url:'https://example.com/a.gif',caption:'Tentacles'}];
 const parsed=parseGuide(structuredClone(g));assert.equal(parsed.blocks?.length,g.blocks.length);
 g.blocks=[{id:'i',kind:'image',url:'http://example.com/a.gif',caption:''}];assert.throws(()=>parseGuide(structuredClone(g)));
});
