// Local only. Synthetic journals, no upstream traffic; remove only our fixture records.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const tag='Q'+Date.now().toString().slice(-6),id='98000'+Date.now(),names=Array.from({length:25},(_,i)=>tag+String(i).padStart(2,'0'));
async function api(path,init){const r=await fetch(base+path,init);return {status:r.status,headers:r.headers,body:await r.json()};}
try{
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Synthetic test']);
 for(const [i,name] of names.entries()){
  const journal={username:name,revision:0,pets:[{id:'20663',name:'Rocky',obtained:true,methods:[]}],hiscores:{skills:[{name:'Overall',level:100,xp:1000+i,rank:100},{name:'Mining',level:10,xp:i,rank:100}],activities:[]},log:{obtained:i,total:100,tabs:[]},statsSyncedAt:new Date().toISOString(),logSyncedAt:new Date().toISOString()};
  await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[name.toLowerCase(),JSON.stringify(journal)]);
 }
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[names[0].toLowerCase(),names[0],id]);
 const first=await api('/api/leaderboard?metric=log&q='+tag);assert.equal(first.status,200);assert.equal(first.body.rows.length,10);assert.equal(first.body.total,25);assert.equal(first.body.rows[0].name,names[24]);
 const second=await api('/api/leaderboard?metric=log&q='+tag+'&page=1');assert.equal(second.body.rows.length,10);assert.ok(second.body.rows[0].boardRank>first.body.rows.at(-1).boardRank);
 const exact=await api('/api/leaderboard?metric=log&q='+names[24]);assert.equal(exact.body.rows[0].boardRank,first.body.rows[0].boardRank);
 await sql("INSERT INTO profile_options(rsn,details,skin) VALUES(?,?,'default')",[names[24].toLowerCase(),JSON.stringify({log:false})]);
 const hidden=await api('/api/leaderboard?metric=log&q='+names[24]);assert.equal(hidden.body.rows[0].boardRank,null);assert.ok(hidden.body.rows[0].stats.hidden.includes('log'));
 const search=await api('/api/accounts?q='+tag);assert.equal(search.body.accounts.length,8);
 assert.equal((await api('/api/leaderboard?metric=bogus')).status,400);
 console.log('PASS: paged ranking, global ranks after filtering, hidden metrics and bounded search.');
 const cookie=await seal(secret,{id,username:'Synthetic test',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300});
 const headers={'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${cookie}`};
 const payload=JSON.stringify({username:names[0],source:'import',data:{obtained:0,total:0,tabs:[],email:'never-store@example.invalid'}});
 const results=await Promise.all(Array.from({length:5},()=>api('/api/sync',{method:'POST',headers,body:payload})));
 assert.equal(results.filter(r=>r.status===200).length,1,JSON.stringify(results.map(r=>[r.status,r.body.error])));
 assert.equal(results.filter(r=>r.status===429).length,4);assert.ok(results.find(r=>r.status===429).headers.get('Retry-After'));
 assert.ok(!(await sql('SELECT data FROM journals WHERE id=?',[names[0].toLowerCase()]))[0][0].includes('never-store'));
 assert.equal((await api('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})).status,401);
 console.log('PASS: concurrent imports produce one write and four retry responses; upload extras discarded; unauthenticated sync rejected.');
}finally{
 for(const name of names)for(const table of ['profile_options','claimed_names','sync_locks'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[name.toLowerCase()]);
 for(const name of names)await sql('DELETE FROM journals WHERE id=?',[name.toLowerCase()]);
 await sql('DELETE FROM users WHERE discord_id=?',[id]);
}
await dispose();
