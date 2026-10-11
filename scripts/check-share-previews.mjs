import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const name='QA '+Date.now().toString().slice(-8),rsn=name.toLowerCase(),id='98000'+Date.now();
async function png(path,headers){const r=await fetch(base+path,{headers});assert.equal(r.status,200,path);assert.match(r.headers.get('content-type'),/image\/png/);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),630);assert.ok(b.length>10000);return {b,cache:r.headers.get('cache-control')};}
for(const path of ['/','/player/Obifloat']){const r=await fetch(base+path,{headers:{'User-Agent':'Discordbot/2.0'}});assert.equal(r.status,200);const html=await r.text();assert.match(html,/property="og:image" content="https:\/\/spoonedosrs.com\/api\/share/);assert.match(html,/name="twitter:card" content="summary_large_image"/);if(path.includes('player'))assert.match(html,/username=Obifloat/);}
await png('/api/share');await png('/api/share?username=Obifloat');
assert.equal((await fetch(base+'/api/share?username=%3Cbad%3E')).status,400);
const journal=JSON.parse(readFileSync('lib/seed.json','utf8'));journal.username=name;
await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,name]);
try{
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,id]);
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[rsn,JSON.stringify(journal)]);
 await sql("INSERT INTO profile_visibility(rsn,visibility) VALUES(?,'private')",[rsn]);
  const token=await seal(secret,{id,username:'QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300});
 const path='/api/share?username='+encodeURIComponent(name);
 const anonymous=await png(path),owner=await png(path,{Cookie:`${SESSION_COOKIE}=${token}`});
 assert.equal(anonymous.cache,'no-store');assert.deepEqual(owner.b,anonymous.b,'Owner cookies must not disclose extra information in share images');
 console.log('PASS: Discord metadata, valid 1200x630 PNGs, invalid-name validation, private profile rendering and owner-cookie isolation.');
}finally{for(const table of ['profile_visibility','claimed_names'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[rsn]);await sql('DELETE FROM journals WHERE id=?',[rsn]);await sql('DELETE FROM users WHERE discord_id=?',[id]);}
await dispose();
