import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const stamp=Date.now().toString(),name='GC '+stamp.slice(-8),rsn=name.toLowerCase(),user='967'+stamp,other='968'+stamp;
const ip='2001:db8:'+stamp.slice(-4)+'::1',ip2='2001:db8:'+stamp.slice(-4)+'::2';
async function call(method,identity=null,address=ip,origin=base){const h={Origin:origin,'CF-Connecting-IP':address};if(identity)h.Cookie=SESSION_COOKIE+'='+await seal(secret,{id:identity,username:'QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300});const r=await fetch(base+'/api/reputation?username='+encodeURIComponent(name),{method,headers:h});const text=await r.text();let body;try{body=JSON.parse(text);}catch{body={error:text};}return {status:r.status,body,retry:r.headers.get('retry-after')};}
try{
 for(const id of [user,other])await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Guest commend QA']);
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[rsn,JSON.stringify({username:name})]);
 assert.equal((await call('PUT',null,ip,'https://example.invalid')).status,403);
 const first=await call('PUT');assert.equal(first.status,200);assert.equal(first.body.count,1);assert.equal(first.body.given,true);assert.equal(first.body.signedIn,false);
 const attempts=await Promise.all(Array.from({length:4},()=>call('PUT')));assert.ok(attempts.every(r=>r.body.count===1));
 const attached=await call('PUT',user);assert.equal(attached.body.count,1);
 const shared=await call('PUT',other);assert.equal(shared.body.count,1);assert.equal(shared.body.networkUsed,true);assert.equal(shared.body.given,false);
 assert.equal((await call('DELETE',other)).body.count,1);
 assert.equal((await call('PUT',user,ip2)).body.count,1);
 assert.equal((await call('PUT',null,ip2)).body.count,2);
 assert.equal((await call('DELETE',null,ip2)).body.count,1);
 assert.equal((await call('DELETE',user)).body.count,0);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,user]);
 assert.equal((await call('PUT',user)).status,403);
 let limited;for(let i=0;i<22;i++){limited=await call('PUT');if(limited.status===429)break;}
 assert.equal(limited.status,429);assert.equal(limited.retry,'600');
 const stored=await sql('SELECT ip_key FROM profile_commendations WHERE rsn=?',[rsn]);assert.ok(stored.every(r=>/^[0-9a-f]{64}$/.test(r[0])));
 console.log('PASS guest vote, concurrent deduplication, login continuity, same-network limit, account limit, safe undo, own-profile rejection, cross-origin denial, hashed IP and rate limiting.');
}finally{await sql('DELETE FROM profile_commendations WHERE rsn=?',[rsn]);await sql('DELETE FROM claimed_names WHERE rsn=?',[rsn]);await sql('DELETE FROM journals WHERE id=?',[rsn]);for(const id of [user,other])await sql('DELETE FROM users WHERE discord_id=?',[id]);}
await dispose();
