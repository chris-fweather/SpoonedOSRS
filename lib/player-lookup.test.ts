import assert from 'node:assert/strict';
import test from 'node:test';
import {checkPlayer,discoverPlayer} from './player-lookup.ts';
const skills=[{name:'Overall',level:50,xp:12000,rank:1000},{name:'Attack',level:10,xp:1200,rank:-1}];
const profile={collectionLog:{obtained:0,total:1717,tabs:[]}};
const run=(hiscores:()=>Response|Promise<Response>,runeprofile:()=>Response|Promise<Response>)=>checkPlayer('Test player',(async url=>String(url).includes('runescape.com')?hiscores():runeprofile()) as typeof fetch);
test('only explicit missing responses from both sources produce not found',async()=>{
 const result=await run(()=>new Response('',{status:404}),()=>new Response('',{status:404}));
 assert.equal(result.state,'not_found');assert.deepEqual(result.skills,[]);
});
test('public skills confirm a player even if RuneProfile is missing, without disclosing other fields',async()=>{
 const result=await run(()=>Response.json({skills:skills.map(s=>({...s,extra:'ignored'})),activities:[{name:'Boss',score:123,rank:100}]}),()=>new Response('',{status:404}));
 assert.equal(result.state,'found');assert.equal(result.runeprofile,'not_found');assert.deepEqual(result.skills,skills);assert.equal('activities' in result,false);
});
test('RuneProfile can confirm an unranked player without inventing skills',async()=>{
 const result=await run(()=>new Response('',{status:404}),()=>Response.json(profile));
 assert.equal(result.state,'found');assert.equal(result.hiscores,'not_found');assert.deepEqual(result.skills,[]);
});
test('service failures and invalid responses never mean a player does not exist',async()=>{
 for(const response of [()=>new Response('',{status:403}),()=>new Response('',{status:429}),()=>new Response('',{status:500}),()=>Response.json({}),()=>new Response('<html>Oops</html>'),()=>{throw Error('Timeout');}]){
  assert.equal((await run(response,()=>new Response('',{status:404}))).state,'unavailable');
  assert.equal((await run(()=>new Response('',{status:404}),response)).state,'unavailable');
 }
});
test('one positive source still confirms the player while another is unavailable',async()=>{
 const result=await run(()=>Response.json({skills}),()=>new Response('',{status:503}));
 assert.equal(result.state,'found');assert.equal(result.runeprofile,'unavailable');
});
test('oversized and malformed successful payloads remain unavailable',async()=>{
 for(const payload of [{skills:[null]},{skills:[{...skills[0],xp:'123'}]},{skills:[]},{text:'x'.repeat(2_000_001)}]){
  assert.equal((await run(()=>Response.json(payload),()=>new Response('',{status:404}))).state,'unavailable');
 }
 assert.equal((await run(()=>new Response('',{status:404}),()=>Response.json({collectionLog:{tabs:[]}}))).state,'unavailable');
});


test('a repeat search refreshes only official stats, with no collection imports',async()=>{
 const {initial}=await import('./model.ts');
 const journal=structuredClone(initial);journal.username='Test player';journal.log=null;journal.profile=undefined;journal.hiscores={skills:[],activities:[]};journal.statsSyncedAt=null;journal.logSyncedAt=null;
 journal.pets=journal.pets.map(p=>({...p,obtained:false,methods:p.methods.map(m=>({...m,kc:null}))}));
 const calls:string[]=[];
 const fetcher=(async(url:unknown)=>{const key=String(url);calls.push(key);return key.includes('runescape.com')?Response.json({skills,activities:[]}):new Response('',{status:404});}) as typeof fetch;
 const {lookup,journal:saved}=await discoverPlayer(journal.username,journal,fetcher);
 assert.equal(lookup.state,'found');assert.deepEqual(saved?.hiscores.skills,skills);assert.ok(saved?.statsSyncedAt);assert.equal(saved?.log,null);
 assert.equal(calls.length,1);assert.equal(new Set(calls).size,1);assert.deepEqual(journal.hiscores.skills,[]);
});

test('missing or unavailable players never create a discovered journal',async()=>{
 const {initial}=await import('./model.ts');
 for(const status of [404,503]){
  let calls=0;
  const result=await discoverPlayer('Nobody',{...structuredClone(initial),username:'Nobody'},(async()=>{calls++;return new Response('',{status});}) as typeof fetch);
  assert.equal(result.journal,null);assert.equal(calls,1);
 }
});


test('official placeholder rows mean no public record, while partial ranked records retain known skills',async()=>{
 const placeholder=[{name:'Overall',level:0,xp:0,rank:-1},{name:'Attack',level:1,xp:-1,rank:-1},{name:'Sailing',level:1,xp:0,rank:-1}];
 assert.equal((await run(()=>Response.json({skills:placeholder,activities:[]}),()=>new Response('',{status:404}))).state,'not_found');
 const found=await run(()=>Response.json({skills:[...skills,...placeholder.slice(1)],activities:[]}),()=>new Response('',{status:404}));
 assert.equal(found.state,'found');assert.equal(found.skills.some(s=>s.xp<0),false);
});

test('a repeat search does not query collection or third-party sources even when Hiscores fails',async()=>{
 const {initial}=await import('./model.ts');
 const calls:string[]=[];
 const result=await discoverPlayer('Test player',{...structuredClone(initial),username:'Test player'},(async url=>{
  calls.push(String(url));return String(url).includes('runescape.com')?new Response('',{status:503}):Response.json(profile);
 }) as typeof fetch);
 assert.equal(result.journal,null);assert.equal(result.lookup.state,'unavailable');assert.equal(calls.length,1);assert.match(calls[0],/secure.runescape.com/);
});

test('activity-only Hiscores records are discoverable without inventing unknown skill XP',async()=>{
 const {initial}=await import('./model.ts');
 const journal={...structuredClone(initial),username:'Dwagos',statsSyncedAt:null,hiscores:{skills:[],activities:[]}};
 const payload={skills:[{name:'Overall',level:0,xp:0,rank:-1},{name:'Attack',level:1,xp:-1,rank:-1},{name:'Sailing',level:1,xp:0,rank:-1}],activities:[{name:'Clue Scrolls (all)',score:14,rank:1330347}]};
 const {lookup,journal:saved}=await discoverPlayer('Dwagos',journal,(async url=>String(url).includes('runescape.com')?Response.json(payload):new Response('',{status:404})) as typeof fetch);
 assert.equal(lookup.state,'found');assert.ok(saved?.statsSyncedAt);
 assert.deepEqual(saved?.hiscores.activities,payload.activities);
 assert.deepEqual(saved?.hiscores.skills,[payload.skills[2]]);
});

const runeprofile={accountType:'NORMAL',collectionLog:{obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Zulrah',obtained:1,total:2,items:[{id:12921,name:'Pet snakeling',quantity:1},{id:12936,name:'Jar of swamp',quantity:0}]}]}]},
 quests:[{id:1,name:"Cook's Assistant",points:1,type:'free',state:'finished'}],achievementDiaries:[{areaId:1,area:'Ardougne',tiers:[{tier:'easy',completed:10,total:10}]}],combatAchievements:[{id:1,name:'Easy',completed:5,total:33}]};
const sources=(answers:Partial<Record<'hiscores'|'runeprofile'|'temple'|'wom',()=>Response>>)=>{
 const calls:string[]=[];
 const fetcher=(async(url:unknown)=>{
  const host=new URL(String(url)).hostname;calls.push(host);
  const source=host==='secure.runescape.com'?'hiscores':host==='api.runeprofile.com'?'runeprofile':host==='templeosrs.com'?'temple':'wom';
  return answers[source]?.()??new Response('',{status:404});
 }) as typeof fetch;
 return {calls,fetcher};
};

test('a first search asks all four sources once and saves stats, the collection log, pets and progress',async()=>{
 const {initial}=await import('./model.ts');
 const {discoveryData,hydratePublicJournal,isPublicJournal}=await import('./public-journal.ts');
 const {journalStats}=await import('./community.ts');
 const {calls,fetcher}=sources({hiscores:()=>Response.json({skills,activities:[]}),runeprofile:()=>Response.json(runeprofile)});
 const {lookup,journal}=await discoverPlayer('Test player',{...structuredClone(initial),username:'Test player'},fetcher,true);
 assert.deepEqual([...calls].sort(),['api.runeprofile.com','api.wiseoldman.net','secure.runescape.com','templeosrs.com']);
 assert.deepEqual({state:lookup.state,hiscores:lookup.hiscores,runeprofile:lookup.runeprofile,temple:lookup.temple,wom:lookup.wom},{state:'found',hiscores:'found',runeprofile:'found',temple:'not_found',wom:'not_found'});
 assert.ok(journal);assert.equal('syncReport' in journal,false);
 assert.deepEqual(journal.hiscores.skills,skills);assert.equal(journal.log?.obtained,1);assert.equal(journal.profile?.combat[0].completed,5);
 assert.equal(journal.pets.find(p=>p.id==='12921')?.obtained,true);
 // Stored compactly: no catalogue text, only the IDs of pets the log shows, then rebuilt for the profile page.
 const stored=JSON.parse(JSON.stringify(discoveryData(journal,null,lookup.checkedAt)));
 assert.ok(isPublicJournal(stored));assert.equal(stored.sourcesCheckedAt,lookup.checkedAt);assert.deepEqual(stored.pets,[{id:'12921',obtained:true}]);
 const hydrated=hydratePublicJournal(stored);
 assert.equal(hydrated.pets.length,initial.pets.length);assert.equal(hydrated.pets.find(p=>p.id==='12921')?.obtained,true);assert.equal(hydrated.pets.filter(p=>p.obtained).length,1);
 assert.equal(hydrated.log?.obtained,1);assert.ok(hydrated.logSyncedAt);assert.equal(hydrated.profile?.quests[0].state,'finished');
 const stats=journalStats(hydrated);assert.equal(stats.petsKnown,true);assert.equal(stats.logTotal,2);assert.equal(stats.combat,5);assert.equal(stats.questPoints,1);
 // Leaderboard summaries keep only {id,obtained:1} for each stored pet.
 assert.equal(hydratePublicJournal({...stored,pets:[{id:'12921',name:null,obtained:1,methods:[]}]}).pets.filter(p=>p.obtained).length,1);
});

test('a first search confirms a player any source knows, and only Hiscores can say a name is missing',async()=>{
 const {initial}=await import('./model.ts');
 const fresh=()=>({...structuredClone(initial),username:'Test player'});
 const unranked=await discoverPlayer('Test player',fresh(),sources({runeprofile:()=>Response.json(runeprofile)}).fetcher,true);
 assert.equal(unranked.lookup.state,'found');assert.equal(unranked.lookup.hiscores,'not_found');assert.equal(unranked.journal?.log?.obtained,1);assert.deepEqual(unranked.lookup.skills,[]);
 const missing=await discoverPlayer('Nobody',fresh(),sources({}).fetcher,true);
 assert.equal(missing.lookup.state,'not_found');assert.equal(missing.journal,null);
 const busy=await discoverPlayer('Nobody',fresh(),sources({hiscores:()=>new Response('',{status:503})}).fetcher,true);
 assert.equal(busy.lookup.state,'unavailable');assert.equal(busy.journal,null);
 const thrown=await discoverPlayer('Nobody',fresh(),(async()=>{throw Error('Refreshes are busy');}) as typeof fetch,true);
 assert.equal(thrown.lookup.state,'unavailable');assert.equal(thrown.journal,null);
});

test('a source that is busy on a later full search keeps the saved collection log',async()=>{
 const {initial}=await import('./model.ts');
 const first=await discoverPlayer('Test player',{...structuredClone(initial),username:'Test player'},sources({hiscores:()=>Response.json({skills,activities:[]}),runeprofile:()=>Response.json(runeprofile)}).fetcher,true);
 const later=await discoverPlayer('Test player',first.journal!,sources({hiscores:()=>Response.json({skills,activities:[]}),runeprofile:()=>new Response('',{status:429})}).fetcher,true);
 assert.equal(later.lookup.runeprofile,'unavailable');assert.equal(later.journal?.log?.obtained,1);assert.equal(later.journal?.profile?.combat[0].completed,5);
});
