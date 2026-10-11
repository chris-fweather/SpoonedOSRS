import test from 'node:test';
import assert from 'node:assert/strict';
import {discordInteraction,verifyDiscordSignature} from './discord-interactions.ts';
const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const publicKey=Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('hex');
const config={applicationId:'123',guildId:'456',publicKey};
async function signed(payload:unknown,timestamp=String(Math.floor(Date.now()/1000))){const body=typeof payload==='string'?payload:JSON.stringify(payload);const signature=Buffer.from(await crypto.subtle.sign('Ed25519',pair.privateKey,new TextEncoder().encode(timestamp+body))).toString('hex');return new Request('https://example.com/api/discord/interactions',{method:'POST',body,headers:{'x-signature-ed25519':signature,'x-signature-timestamp':timestamp}});}
const command=(name:string,options:unknown[]=[])=>({type:2,application_id:'123',guild_id:'456',data:{name,options}});
test('signed Discord ping succeeds, unsigned and altered bodies fail',async()=>{
 assert.deepEqual(await (await discordInteraction(await signed({type:1}),config)).json(),{type:1});
 assert.equal((await discordInteraction(new Request('https://example.com',{method:'POST',body:'{}'}),config)).status,401);
 const req=await signed({type:1});assert.equal((await discordInteraction(new Request(req.url,{method:'POST',headers:req.headers,body:'{"type":2}'}),config)).status,401);
});
test('old timestamps, wrong keys and malformed signatures fail',async()=>{
 assert.equal((await discordInteraction(await signed({type:1},String(Math.floor(Date.now()/1000)-600)),config)).status,401);
 const req=await signed({type:1});assert.equal((await discordInteraction(req,{...config,publicKey:'00'.repeat(32)})).status,401);
 assert.equal(await verifyDiscordSignature('{}','invalid','bad',publicKey),false);
});
test('bot rejects other applications, servers and direct messages privately',async()=>{
 for(const fields of [{application_id:'999'},{guild_id:'999'},{guild_id:undefined}]){const r=await discordInteraction(await signed({...command('profile'),...fields}),config);const body=await r.json();assert.equal(body.data.flags,64);assert.equal(body.data.embeds,undefined);}
});
test('public profile card uses anonymous share endpoint and suppresses mentions',async()=>{
 const r=await discordInteraction(await signed(command('profile',[{name:'name',value:'Obifloat'}])),config),body=await r.json();
 assert.equal(body.type,4);assert.deepEqual(body.data.allowed_mentions,{parse:[]});assert.equal(body.data.embeds[0].image.url,'https://spoonedosrs.com/api/share?username=Obifloat&v=2');assert.equal(body.data.components[0].components[0].style,5);assert.equal(body.data.flags,undefined);
});
test('invalid names and malformed options never become public messages',async()=>{
 for(const value of ['@everyone','<script>', 'x'.repeat(13),null]){const body=await (await discordInteraction(await signed(command('profile',[{name:'name',value}])),config)).json();assert.equal(body.data.flags,64);}
 const payload={...command('profile'),data:{name:'profile',options:{name:'name'}}};assert.equal((await (await discordInteraction(await signed(payload),config)).json()).data.flags,64);
});
test('leaderboard links and help do not read private user data',async()=>{
 const board=await (await discordInteraction(await signed(command('leaderboard')),config)).json();assert.equal(board.data.embeds[0].url,'https://spoonedosrs.com/leaderboard');
 const help=await (await discordInteraction(await signed(command('spooned')),config)).json();assert.equal(help.data.flags,64);assert.ok(help.data.content.includes('/profile'));
});
test('signed malformed and excessive request bodies are bounded',async()=>{
 assert.equal((await discordInteraction(await signed('{oops'),config)).status,400);
 assert.equal((await discordInteraction(await signed('x'.repeat(33000)),config)).status,413);
});
