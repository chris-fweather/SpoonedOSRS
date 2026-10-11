import assert from 'node:assert/strict';
import test from 'node:test';
import {journalForViewer,validVisibility} from './profile-privacy.ts';
import {initial,type Journal} from './model.ts';
import seed from './seed.json' with {type:'json'};
import {petPresentation,petPlacement} from './pet-presentation.ts';

test('private visitors only receive skills, name and privacy state, with no hidden progress fields',()=>{
 const source=structuredClone(seed) as Journal;
 const j=journalForViewer(source,'private',false);
 assert.equal(j.restricted,true); assert.deepEqual(j.hiscores.skills,source.hiscores.skills.map(({name,level,xp,rank})=>({name,level,xp,rank})));
 assert.deepEqual(j.pets,[]);assert.deepEqual(j.hiscores.activities,[]);assert.equal(j.log,null);assert.equal(j.profile,undefined);
 assert.deepEqual(Object.keys(j).sort(),['accountMode','username','visibility','restricted','revision','pets','log','hiscores','statsSyncedAt','logSyncedAt'].sort());
 assert.ok(source.pets.length>0);
});
test('owners retain private collections, while public visitors do not get notes or planning',()=>{
 const source=structuredClone(seed) as Journal;source.pets[0].notes='Private session notes';source.pets[0].priority=true;
 assert.equal(journalForViewer(source,'private',true).pets[0].notes,'Private session notes');
 const guest=journalForViewer(source,'public',false);
 assert.equal(guest.pets[0].notes,'');assert.equal(guest.pets[0].priority,false);assert.equal(guest.pets[0].recordedHours,null);
 assert.equal(guest.restricted,false);
 assert.equal(validVisibility('friends'),false);assert.equal(validVisibility('private'),true);
});
test('client catalogue has no example-account progress embedded',()=>{
 assert.equal(initial.hiscores.skills.length,0);assert.equal(initial.hiscores.activities.length,0);assert.equal(initial.log,null);
 assert.ok(initial.pets.every(p=>!p.obtained&&!p.notes&&!p.priority&&p.methods.every(m=>m.kc==null)));
});
test('portrait companions have bounded proportions and Rift guardian floats near the ground',()=>{
 for(const name of ['Tiny tempor','Abyssal protector','Herbi','Giant Squirrel','Rocky']){
  const p=petPresentation(name);assert.ok(p.extent>=.2&&p.extent<=.4);assert.equal(p.hover,0);
 }
 assert.ok(petPresentation('Rift guardian').hover<.05);
});

test('scaled companions meet the player floor without multiplying the local ground offset',()=>{
 for(const name of ['TzRek-Jad','Venenatis spiderling',"Lil' Zik",'Sraracha']){
  for(const raw of [{x:50,y:100,z:60,minY:-40},{x:200,y:90,z:160,minY:25}]){
   const p=petPlacement(180,-8,raw,name);
   assert.equal((raw.minY+p.localY)*p.scale+p.groundY,-8);
  }
 }
 assert.ok(petPresentation("Tumeken's guardian").extent>petPresentation('Herbi').extent);
});


test('visitor output excludes legacy metadata at every stored object boundary',()=>{
 const source=structuredClone(seed) as Journal;
 const marker='legacy-private-metadata';
 source.profile={syncedAt:'2026-01-01',quests:[{id:1,name:'Quest',points:1,type:'free',state:'completed'}],diaries:[{areaId:1,area:'Area',tiers:[{tier:'easy',completed:1,total:1}]}],combat:[{id:1,name:'Easy',completed:1,total:1}]};
 source.pets[0].huntHistory=[{method:'Fixture',unit:'kills',count:10,pace:1,rate:100}];
 const annotate=(value:unknown):void=>{
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach(annotate);return;}
  for(const child of Object.values(value))annotate(child);
  Object.assign(value,{legacyPrivate:marker});
 };
 annotate(source);
 source.collectionDates={'1':'2026-01-01',legacyPrivate:marker};
 for(const visibility of ['public','private'] as const){
  const guest=journalForViewer(source,visibility,false);
  assert.ok(!JSON.stringify(guest).includes(marker),visibility+' leaked an unknown stored field');
 }
 assert.ok(JSON.stringify(journalForViewer(source,'private',true)).includes(marker),'owner data must not be rewritten');
});
