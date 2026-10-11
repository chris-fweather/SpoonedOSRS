import assert from 'node:assert/strict';
import test from 'node:test';
import {syncJournal} from './sync-journal.ts';
import seed from './seed.json' with {type:'json'};
import type {Journal} from './model.ts';
const hs={skills:[{name:'Thieving',level:99,xp:15000000,rank:1}],activities:[{name:'Wintertodt',score:2425,rank:1}]};
const profile={collectionLog:{obtained:0,total:0,tabs:[]},quests:[{id:1,name:'Test quest',points:1,type:'free',state:'finished'}],achievementDiaries:[{areaId:1,area:'Test',tiers:[{tier:'easy',completed:5,total:5}]}],combatAchievements:[]};
function wom(username:string,createdAt='2099-01-01T00:00:00Z') {return {username,latestSnapshot:{createdAt,data:{skills:{thieving:{level:90,experience:6000000,rank:4}},bosses:{wintertodt:{kills:99,rank:5}}}}};}
test('combined sync starts all four sources concurrently, applies official stats last and keeps manual pet entries',async()=>{
 const before=structuredClone(seed) as Journal;before.pets.find(p=>p.name==='Phoenix')!.crateRolls=5504;
 const snapshot=structuredClone(before), calls:string[]=[];
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 const work=syncJournal('all',before,null,(async url=>{
  const u=String(url);calls.push(u);await gate;
  if(u.includes('runescape.com'))return Response.json(hs);
  if(u.includes('runeprofile.com'))return Response.json(profile);
  if(u.includes('wiseoldman.net'))return Response.json(wom(before.username));
  return Response.json({data:{player:before.username,total_collections_finished:0,items:[]}});
 }) as typeof fetch);
 assert.equal(calls.length,4,'all requests start before any response resolves');release();
 const result=await work;
 assert.equal(result.hiscores.skills[0].xp,15000000);assert.equal(result.hiscores.activities[0].score,2425);
 assert.equal(result.profile?.diaries[0].tiers[0].completed,5);assert.equal(result.pets.find(p=>p.name==='Phoenix')?.crateRolls,5504);
 assert.ok(result.statsSyncedAt);assert.ok(result.logSyncedAt);assert.equal(result.syncReport?.filter(r=>r.status==='updated').length,4);
 assert.match(result.syncReport!.find(r=>r.source==='wom')!.message,/current OSRS/);assert.deepEqual(before,snapshot);
});
test('partial sync retains successful sources and identifies each unavailable source',async()=>{
 const before=structuredClone(seed) as Journal, snapshot=structuredClone(before);
 const result=await syncJournal('all',before,null,(async url=>String(url).includes('runescape.com')?Response.json(hs):new Response('',{status:503})) as typeof fetch);
 assert.deepEqual(result.hiscores,hs);assert.deepEqual(result.profile,before.profile);assert.deepEqual(result.log,before.log);
 assert.equal(result.syncReport?.filter(r=>r.status==='unavailable').length,3);assert.deepEqual(before,snapshot);
});
test('all failed sources leave the journal unchanged and do not claim success',async()=>{
 const before=structuredClone(seed) as Journal, snapshot=structuredClone(before);
 await assert.rejects(syncJournal('all',before,null,(async()=>new Response('',{status:503})) as typeof fetch),/No sources could be refreshed/);
 assert.deepEqual(before,snapshot);
});
test('WOM fallback cannot overwrite a newer saved stats snapshot',async()=>{
 const before=structuredClone(seed) as Journal;before.statsSyncedAt='2026-01-01T00:00:00Z';
 const result=await syncJournal('all',before,null,(async url=>String(url).includes('wiseoldman.net')?Response.json(wom(before.username,'2025-01-01T00:00:00Z')):String(url).includes('runeprofile.com')?Response.json(profile):new Response('',{status:503})) as typeof fetch);
 assert.deepEqual(result.hiscores,before.hiscores);assert.equal(result.statsSyncedAt,before.statsSyncedAt);
 assert.match(result.syncReport!.find(r=>r.source==='wom')!.message,/older/);
});
test('Temple merges additional unlocks after RuneProfile refreshes the item catalogue',async()=>{
 const before=structuredClone(seed) as Journal;
 const log={obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Test',obtained:1,total:2,items:[{id:1,name:'First',quantity:1},{id:2,name:'Second',quantity:0}]}]}]};
 const result=await syncJournal('all',before,null,(async url=>String(url).includes('runeprofile.com')?Response.json({...profile,collectionLog:log}):String(url).includes('templeosrs.com')?Response.json({data:{player:before.username,total_collections_finished:1,items:[{id:2,count:1}]}}):new Response('',{status:503})) as typeof fetch);
 assert.equal(result.log?.obtained,2);assert.deepEqual(result.log?.tabs[0].pages[0].items.map(i=>i.quantity),[1,1]);
});
