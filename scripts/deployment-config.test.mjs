import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {deploymentConfig} from './deployment-config.mjs';

const values={D1_DATABASE_ID:'00000000-0000-4000-8000-000000000001',DISCORD_CLIENT_ID:'100000000000000001',DISCORD_GUILD_ID:'100000000000000002',DISCORD_PUBLIC_KEY:'ab'.repeat(32),OWNER_DISCORD_IDS:'100000000000000003,100000000000000004'};
const file=values=>{const dir=mkdtempSync(path.join(tmpdir(),'deployment-'));const f=path.join(dir,'deployment.private.json');writeFileSync(f,JSON.stringify(values));return pathToFileURL(f);};
const missing=pathToFileURL(path.join(tmpdir(),'no-such-deployment.json'));

test('Cloudflare build variables override the private fallback file',()=>{
 const config=deploymentConfig({env:{DISCORD_GUILD_ID:'100000000000000009'},file:file(values)});
 assert.equal(config.discord.guildId,'100000000000000009');
 assert.equal(config.d1DatabaseId,values.D1_DATABASE_ID);
 assert.deepEqual(config.ownerDiscordIds,['100000000000000003','100000000000000004']);
});
test('a public build without configuration fails instead of guessing a database',()=>{
 assert.throws(()=>deploymentConfig({env:{},file:missing}),/Set D1_DATABASE_ID/);
 assert.deepEqual(deploymentConfig({env:{},file:missing,required:false}).ownerDiscordIds,[]);
});
test('malformed identifiers are rejected',()=>{
 for(const [name,value] of [['D1_DATABASE_ID','not-a-uuid'],['OWNER_DISCORD_IDS','123,abc'],['DISCORD_PUBLIC_KEY','xyz']])
  assert.throws(()=>deploymentConfig({env:{...values,[name]:value},file:missing}),new RegExp(name));
});

test('environments: production by default, dev only by name, nothing else',async()=>{
 const {deployEnvironment}=await import('./deployment-config.mjs');
 assert.equal(deployEnvironment({}).worker,'spoonedosrs');
 const dev=deployEnvironment({SPOONED_ENV:'dev'});
 assert.deepEqual([dev.worker,dev.database,dev.branch],['spoonedosrs-dev','spoonedosrs-dev-db','dev']);
 assert.throws(()=>deployEnvironment({SPOONED_ENV:'preview'}));
});
