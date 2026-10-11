// Local, disposable staff fixtures; never run against production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {deploymentConfig} from './deployment-config.mjs';
import {emptyGuide,newGuideSetup,guideQuests,guideDiaryAreas} from '../lib/guides.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const suffix=Date.now(), helper='981'+suffix, moderator='982'+suffix, stranger='983'+suffix;
async function auth(id){return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id,username:'Guide QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
const name='DQ'+String(suffix).slice(-8),rsn=name.toLowerCase();
async function post(body,h,status){const r=await fetch(base+'/api/account-discord',{method:'POST',headers:h,body:JSON.stringify(body)});assert.equal(r.status,status,await r.text());}
try{
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[helper,'Discord QA']);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,helper]);
 const h=await auth(helper),other=await auth(stranger);
 assert.equal((await fetch(base+'/api/account-discord')).status,401);
 await post({nickname:name,supporterRole:true},{'Content-Type':'application/json',Origin:base},401);
 await post({nickname:name,supporterRole:true},{...h,Origin:'https://other.invalid'},403);
 await post({nickname:name,supporterRole:true},other,403);
 await post({nickname:'@everyone',supporterRole:true},h,400);
 await post({nickname:name,supporterRole:false},h,200);
 const saved=await(await fetch(base+'/api/account-discord',{headers:h})).json();assert.equal(saved.nickname,rsn);assert.equal(saved.supporterRole,false);
 await post({nickname:null,supporterRole:true},h,200);
 assert.equal((await fetch(base+'/api/discord/roles?guild='+deploymentConfig().discord.guildId)).status,503);
 console.log('PASS: Discord preferences require owner and same origin; foreign names and mentions rejected; opt-in/out roundtrip; role API disabled without dedicated secret.');
}finally{await sql('DELETE FROM discord_sync_preferences WHERE discord_id=?',[helper]);await sql('DELETE FROM claimed_names WHERE rsn=?',[rsn]);await sql('DELETE FROM users WHERE discord_id=?',[helper]);}
await dispose();
