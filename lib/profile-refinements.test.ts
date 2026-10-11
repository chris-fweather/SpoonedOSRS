import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {templeLog,womHiscores} from './import-sources.ts';
import {initial,validatePet,type Journal} from './model.ts';
import {acquisitionLabel,xpAtLevel} from './pet-record.ts';
import {journalForViewer,DEFAULT_DETAILS,parseDetails} from './profile-privacy.ts';
import {journalStats,metricValue} from './community.ts';
import {BASE_SKIN_RGB,skinColor} from './skin-palette.ts';
import {parseAppearance} from './appearance.ts';
const journal=()=>({...structuredClone(initial),username:'Tester'});
test('remembered acquisition level stays distinct from exact XP',()=>{
 const pet=structuredClone(initial.pets.find(p=>p.name==='Tangleroot')!);Object.assign(pet,{obtained:true,obtainedUnit:'level',obtainedCount:95});
 assert.equal(validatePet(pet),true);assert.equal(xpAtLevel(95),8771558);assert.match(acquisitionLabel(pet),/Farming level 95.*XP unknown/);
 for(const level of [0,95.5,100]){pet.obtainedCount=level;assert.equal(validatePet(pet),false);}
 const boss={...initial.pets.find(p=>p.name==='Baby Mole')!,obtainedUnit:'level',obtainedCount:95};assert.equal(validatePet(boss),false);
});
test('Temple merges counts by item ID, keeps known unlocks, and rejects the wrong player',()=>{
 const j=journal();j.log={obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Example',obtained:1,total:2,items:[{id:4151,name:'Whip',quantity:2},{id:1,name:'Example',quantity:0}]}]}]};
 const raw={data:{player:'Tester',total_collections_finished:1,items:{boss:[{id:4151,count:1}]}}};
 assert.equal(templeLog(raw,j).tabs[0].pages[0].items[0].quantity,2);assert.equal(j.log.tabs[0].pages[0].items[0].quantity,2);
 assert.throws(()=>templeLog({...raw,data:{...raw.data,player:'Someone else'}},j),/different/);
 assert.throws(()=>templeLog({...raw,data:{...raw.data,items:[{id:999999,count:1}]}},j),/newer/);
});
test('Wise Old Man reads XP and boss kills without importing reward rolls; old data is rejected',()=>{
 const j=journal(),raw={username:'tester',latestSnapshot:{createdAt:'2026-10-06T00:00:00Z',data:{skills:{farming:{level:99,experience:15000000,rank:2}},bosses:{wintertodt:{kills:100,rank:2}}}}};
 const data=womHiscores(raw,j);assert.equal(data.skills[0].name,'Farming');assert.equal(data.activities[0].score,100);
 j.statsSyncedAt='2026-10-07T00:00:00Z';assert.throws(()=>womHiscores(raw,j),/older/);
});
test('section privacy removes payloads and acquisition records while the owner retains them',()=>{
 const j=journal();j.profile={quests:[{id:1,name:'Quest',points:1,type:'free',state:'finished'}],combat:[],diaries:[],syncedAt:''};j.pets[0].obtainedCount=42;j.pets[0].methods[0].kc=123;
 const details={...DEFAULT_DETAILS,quests:false,petRecords:false,skills:false};
 const guest=journalForViewer(j,'public',false,details);assert.deepEqual(guest.profile?.quests,[]);assert.deepEqual(guest.hiscores.skills,[]);assert.equal(guest.pets[0].obtainedCount,null);assert.equal(guest.pets[0].methods[0].kc,null);
 assert.equal(journalStats(guest).questPoints,null);assert.equal(journalForViewer(j,'public',true,details).pets[0].obtainedCount,42);
 assert.throws(()=>parseDetails({pets:'true'}));assert.equal(parseDetails({pets:false}).log,true);
});
test('skin recolour changes only the exact skin slot and retains other vertex colours',()=>{
 assert.equal(skinColor([0,0,0],'blue'),null);assert.equal(skinColor(BASE_SKIN_RGB,'default'),null);assert.notDeepEqual(skinColor(BASE_SKIN_RGB,'blue'),BASE_SKIN_RGB);
 assert.equal(parseAppearance({body:'female',hair:'brown',skin:'blue'}).skin,'blue');assert.throws(()=>parseAppearance({body:'male',hair:'brown',skin:'invalid'}));
 for(const body of ['male','female']){const g=JSON.parse(readFileSync(`public/models/look/appearance/${body}-brown.gltf`,'utf8'));let matches=0;for(const mesh of g.meshes)for(const p of mesh.primitives){const a=g.accessors[p.attributes.COLOR_0],v=g.bufferViews[a.bufferView],buf=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),offset=(v.byteOffset??0)+(a.byteOffset??0);for(let i=0;i<a.count;i++){const rgb=[0,1,2].map(k=>buf.readFloatLE(offset+(i*3+k)*4));if(skinColor(rgb,'tan'))matches++;}}assert.ok(matches>0,body+' contains the skin slot');}
});
