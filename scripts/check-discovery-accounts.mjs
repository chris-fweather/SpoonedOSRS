// Local-only fixtures. No external player data or existing account is changed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {discoveryData} from '../lib/public-journal.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const name='DS '+Date.now().toString().slice(-8),rsn=name.toLowerCase(),owner='97000'+Date.now(),other='97001'+Date.now();
async function headers(id){return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id,username:'Private identity',globalName:'Secret Discord',avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
async function api(path,init={},status=200){const r=await fetch(base+path,init);assert.equal(r.status,status,await r.clone().text());return r.json();}
let budgetId=null;
const h=await headers(owner),h2=await headers(other),journal=JSON.parse(readFileSync('lib/seed.json','utf8'));
journal.username=name;journal.log=null;journal.logSyncedAt=null;journal.profile=undefined;journal.statsSyncedAt=new Date().toISOString();journal.hiscores={skills:[{name:'Overall',xp:300000000,level:2277,rank:5}],activities:[]};journal.pets=journal.pets.map(p=>({...p,obtained:false,notes:'Saved private note',methods:p.methods.map(m=>({...m,kc:null}))}));
await api('/api/auth/session'); // Ensure runtime tables exist.
try{
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[owner,'Secret Discord']);await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[other,'Other']);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,owner]);
 const noJournal=(await api('/api/leaderboard')).rows.find(r=>r.name===name);assert.ok(noJournal);assert.equal(noJournal.hasJournal,false);
 await sql("INSERT INTO profile_visibility(rsn,visibility) VALUES(?,'private')",[rsn]);
 assert.ok(!(await api('/api/leaderboard')).rows.some(r=>r.name===name));
 await sql('DELETE FROM profile_visibility WHERE rsn=?',[rsn]);await sql('DELETE FROM claimed_names WHERE rsn=?',[rsn]);await sql('DELETE FROM profile_link_owners WHERE rsn=?',[rsn]);
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[rsn,JSON.stringify(discoveryData(journal))]);
 const status=await api('/api/player-status?username='+encodeURIComponent(name));assert.equal(status.persisted,true);assert.deepEqual(status.skills,[]);
 const board=(await api('/api/leaderboard')).rows.find(r=>r.name===name);assert.ok(board);assert.equal(board.stats.xp,300000000);assert.equal(board.stats.petsKnown,false);
 assert.ok((await api('/api/accounts')).accounts.includes(name));
 await api('/api/accounts',{method:'POST',headers:h,body:JSON.stringify({username:name})});
 const hydrated=await api('/api/journal?username='+encodeURIComponent(name),{headers:h});assert.equal(hydrated.pets.length,journal.pets.length);assert.ok(hydrated.pets.every(p=>!p.obtained&&!p.notes));
 assert.ok((await api('/api/account-menu',{headers:h})).accounts.some(a=>a.name===name));
 await sql('UPDATE journals SET data=? WHERE id=?',[JSON.stringify(journal),rsn]); // Existing owner progress must survive unlink/relink.
 await api('/api/profile',{method:'POST',headers:h,body:JSON.stringify({username:name,visibility:'private',details:{skills:false}})});
 assert.ok(!(await api('/api/accounts')).accounts.includes(name));assert.ok(!(await api('/api/leaderboard')).rows.some(r=>r.name===name));
 const hidden=await api('/api/player-status?username='+encodeURIComponent(name));assert.deepEqual(hidden.skills,[]);assert.equal(hidden.persisted,false);
 assert.equal((await api('/api/journal?username='+encodeURIComponent(name))).restricted,true);
 await api('/api/accounts',{method:'DELETE',headers:h,body:JSON.stringify({username:name})});
 const conflict=await api('/api/accounts',{method:'POST',headers:h2,body:JSON.stringify({username:name})},409);assert.doesNotMatch(conflict.error,/Secret Discord|Private identity/);
 assert.equal((await api('/api/journal?username='+encodeURIComponent(name),{headers:h2})).restricted,true);
 await api('/api/accounts',{method:'POST',headers:h,body:JSON.stringify({username:name})});
 const retained=await api('/api/journal?username='+encodeURIComponent(name),{headers:h});assert.equal(retained.pets[0].notes,'Saved private note');assert.equal(retained.visibility,'private');
 // Exercise the exact guarded discovery statement against stale revisions and ownership races.
 const source=readFileSync('lib/storage.ts','utf8'),query=source.match(/db\(\)\.prepare\(`(INSERT INTO journals\(id,data,revision\)[\s\S]+?)`\)/)?.[1];assert.ok(query);
 const before=await sql('SELECT data,revision FROM journals WHERE id=?',[rsn]);
 await sql(query,[rsn,JSON.stringify({...journal,username:'Race winner'}),rsn,rsn,rsn,0]);
 assert.deepEqual(await sql('SELECT data,revision FROM journals WHERE id=?',[rsn]),before);
 console.log('PASS: compact discovered journals rank real XP, retain unknown pets, hydrate after claiming, and appear in account menus.');
 console.log('PASS: private status/suggestions/boards redact; unlink keeps progress private and only original Discord can relink; conflict reveals no identity.');
 console.log('PASS: discovery SQL refuses a claimed/private/reserved overwrite.');
 for(const table of ['claimed_names','profile_link_owners','profile_visibility'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[rsn]);
 await sql(query,[rsn,JSON.stringify(journal),rsn,rsn,rsn,0]);
 assert.equal((await sql('SELECT revision FROM journals WHERE id=?',[rsn]))[0][0],1);
 await sql(query,[rsn,JSON.stringify({...journal,username:'Stale change'}),rsn,rsn,rsn,0]);
 assert.equal(JSON.parse((await sql('SELECT data FROM journals WHERE id=?',[rsn]))[0][0]).username,name);
 console.log('PASS: an unclaimed public refresh saves, while a stale discovery revision cannot overwrite it.');
 const window=Math.floor(Date.now()/600000),ip='192.0.2.44';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(window+':'+ip));
 budgetId=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 await sql('INSERT OR REPLACE INTO public_lookup_limits(id,window,count) VALUES(?,?,20)',[budgetId,window]);
 const limited=await api('/api/player-status?username='+encodeURIComponent('LX'+Date.now().toString().slice(-9)),{headers:{'CF-Connecting-IP':ip}},429);assert.match(limited.error,/Too many/);
 console.log('PASS: exhausted anonymous discovery budgets stop before provider requests.');
}finally{
 if(budgetId)await sql('DELETE FROM public_lookup_limits WHERE id=?',[budgetId]);
 for(const table of ['profile_link_owners','profile_options','profile_presentation','profile_appearance','profile_visibility','profile_supporter_totals','claimed_names'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[rsn]);
 await sql('DELETE FROM journals WHERE id=?',[rsn]);await sql('DELETE FROM users WHERE discord_id IN (?,?)',[owner,other]);
}
await dispose();
