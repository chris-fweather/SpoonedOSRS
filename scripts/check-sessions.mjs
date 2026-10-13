// Log out everywhere (issue #50), against a throwaway Worker (scripts/worker-harness.mjs). Never run this against production.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,rows,dispose}=await startWorker();
const id='967'+Date.now(),rsn='so'+String(Date.now()).slice(-8);
const cookie=async v=>`${SESSION_COOKIE}=${await seal(secret,{id,username:'Sessions QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300,...(v===undefined?{}:{v})})}`;
const user=async c=>(await (await fetch(base+'/api/auth/session',{headers:{Cookie:c}})).json()).user;
try{
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Sessions QA']);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,rsn,id]);
 const old=await cookie(undefined),other=await cookie(0);
 assert.equal((await user(old))?.id,id,'a cookie from before this change still works');
 const url=base+'/api/auth/logout-everywhere';
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:base}})).status,401,'anonymous');
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie:old,Origin:'https://invalid.example'}})).status,403,'cross-origin');
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie:old}})).status,403,'no origin');
 const r=await fetch(url,{method:'POST',headers:{Cookie:old,Origin:base}});assert.equal(r.status,200);
 assert.match(r.headers.get('set-cookie')??'',new RegExp(SESSION_COOKIE+'=;'));
 assert.equal(await user(old),null,'the cookie that asked is signed out');
 assert.equal(await user(other),null,'every other device is signed out');
 assert.equal((await user(await cookie(1)))?.id,id,'a new sign-in works');
 assert.equal((await rows("SELECT COUNT(*) AS n FROM account_actions WHERE rsn=? AND action='signed out everywhere'",[rsn]))[0].n,1,'recorded in account history');
 console.log('PASS: old cookies rejected after Log out everywhere on every device, a new sign-in works, anonymous, cross-origin and origin-less requests refused, account history entry.');
}finally{
 await sql('DELETE FROM account_actions WHERE rsn=?',[rsn]);await sql('DELETE FROM claimed_names WHERE rsn=?',[rsn]);await sql('DELETE FROM users WHERE discord_id=?',[id]);
}
await dispose();
