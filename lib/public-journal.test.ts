import assert from 'node:assert/strict';
import test from 'node:test';
import seed from './seed.json' with {type:'json'};
import {initial} from './model.ts';
import {discoveryData,hydratePublicJournal,isPublicJournal,sourcesCheckedAt} from './public-journal.ts';
import {journalStats,metricValue} from './community.ts';
import {journalForViewer} from './profile-privacy.ts';

test('stats-only public snapshots store only basic facts and hydrate the standard empty collection UI',()=>{
 const full=structuredClone(initial);full.username='Public Test';full.statsSyncedAt='2026-10-06T00:00:00.000Z';full.revision=8;
 full.hiscores={skills:[{name:'Overall',level:2000,xp:90000000,rank:123}],activities:[{name:'Wintertodt',score:100,rank:200},{name:'TzTok-Jad',score:7,rank:300}]};
 const snapshot=discoveryData(full);assert.ok(isPublicJournal(snapshot));assert.deepEqual(snapshot.pets,[]);assert.equal(snapshot.log,null);assert.equal(snapshot.profile,undefined);assert.equal(snapshot.logSyncedAt,null);
 assert.deepEqual(snapshot.hiscores,full.hiscores);assert.equal(snapshot.revision,8);assert.equal(snapshot.storageFormat,'public-sources-v2');
 const hydrated=hydratePublicJournal(JSON.parse(JSON.stringify(snapshot)));
 assert.equal(hydrated.pets.length,initial.pets.length);assert.ok(hydrated.pets.every(p=>!p.obtained&&!p.priority&&!p.notes&&!p.date&&p.obtainedCount===null));
 assert.equal(hydrated.pets.find(p=>p.name==='TzRek-Jad')?.methods.find(m=>m.activity==='TzTok-Jad')?.kc,7);
 assert.ok(hydrated.pets.find(p=>p.name==='Phoenix')?.methods.filter(m=>m.unit==='rolls').every(m=>m.kc===null));
 assert.equal(hydrated.statsSyncedAt,full.statsSyncedAt);assert.equal(hydrated.revision,8);assert.equal(isPublicJournal(hydrated),false);
 const stats=journalStats(journalForViewer(snapshot,'public',false));assert.equal(stats.xp,90000000);assert.equal(stats.petsKnown,false);assert.equal(stats.logTotal,null);
 assert.equal(metricValue({name:'Public Test',pets:0,log:0,hasJournal:true,stats} as never,'pets'),null);
 assert.equal(journalForViewer(hydrated,'private',false).restricted,true);
});

test('previous full journals keep their manual records and collection imports',()=>{
 const previous=structuredClone(initial);previous.pets[0].notes='Keep my record';
 const next=structuredClone(previous);next.statsSyncedAt=new Date().toISOString();
 assert.equal(discoveryData(next,previous),next);assert.equal(hydratePublicJournal(previous),previous);
 const snapshot=discoveryData(next);assert.ok(isPublicJournal(discoveryData(next,snapshot)));
});

test('compact snapshot saves catalogue bytes without losing Hiscores',()=>{
 const full=structuredClone(initial);full.username='Public Test';full.log=null;full.logSyncedAt=null;full.profile=undefined;
 full.pets=full.pets.map(p=>({...p,obtained:false,notes:'',date:'',priority:false,methods:p.methods.map(m=>({...m,kc:null}))}));
 full.hiscores=structuredClone(seed.hiscores);full.statsSyncedAt='2026-10-06T00:00:00.000Z';
 const snapshot=discoveryData(full),bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v));
 assert.ok(bytes(snapshot)<bytes(full)*0.2);assert.deepEqual(snapshot.hiscores,full.hiscores);
 console.log(`Public snapshot fixture: ${bytes(full)} bytes full catalogue vs ${bytes(snapshot)} bytes compact (${(100*(1-bytes(snapshot)/bytes(full))).toFixed(1)}% smaller)`);
});

test('older full-format unclaimed journals keep their records and remember the full pull',()=>{
 const previous=structuredClone(initial);previous.pets[0].notes='Keep my record';
 const next=structuredClone(previous);next.statsSyncedAt=new Date().toISOString();
 const saved=discoveryData(next,previous,'2026-10-07T00:00:00.000Z') as typeof next & {sourcesCheckedAt:string};
 assert.equal(isPublicJournal(saved),false);assert.equal(saved.pets[0].notes,'Keep my record');assert.equal(saved.sourcesCheckedAt,'2026-10-07T00:00:00.000Z');
 assert.equal(sourcesCheckedAt(saved),'2026-10-07T00:00:00.000Z');
 assert.equal((discoveryData(next,saved) as {sourcesCheckedAt?:string}).sourcesCheckedAt,'2026-10-07T00:00:00.000Z','a stats-only refresh keeps the time');
 assert.equal(sourcesCheckedAt(previous),null);
});

test('older stats-only snapshots still hydrate and gain the source check time on their next save',()=>{
 const v1={storageFormat:'public-hiscores-v1',username:'Old Search',revision:3,hiscores:{skills:[{name:'Overall',level:100,xp:1000,rank:5}],activities:[]},statsSyncedAt:'2026-10-01T00:00:00.000Z',logSyncedAt:null,log:null,pets:[]} as never;
 assert.ok(isPublicJournal(v1));
 const hydrated=hydratePublicJournal(v1);assert.equal(hydrated.pets.length,initial.pets.length);assert.equal(hydrated.log,null);assert.ok(hydrated.pets.every(p=>!p.obtained));
 const next=discoveryData(hydrated,v1,'2026-10-07T00:00:00.000Z') as {storageFormat:string;sourcesCheckedAt:string};
 assert.equal(next.storageFormat,'public-sources-v2');assert.equal(next.sourcesCheckedAt,'2026-10-07T00:00:00.000Z');
 assert.equal((discoveryData(hydrated,next as never) as {sourcesCheckedAt:string}).sourcesCheckedAt,'2026-10-07T00:00:00.000Z');
});
