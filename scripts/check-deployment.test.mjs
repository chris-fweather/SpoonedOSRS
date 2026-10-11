import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSync,signedGet} from './check-deployment.mjs';
import {verifySignedGet} from '../lib/signed-request.ts';

const secret='test-only-deploy-check-secret-not-real';
const respond=(...rounds)=>{let calls=0;const fetch=async()=>Response.json({results:rounds[Math.min(calls++,rounds.length-1)]});return {fetch,calls:()=>calls};};
const row=(source,status,message='')=>({source,status,message});

test('the Worker accepts the deploy check signature for the exact path and query only',async()=>{
 const {url,headers}=signedGet('https://spoonedosrs.com','/api/health/sync?player=Lynx+Titan',secret);
 assert.equal(await verifySignedGet(new Request(url,{headers}),secret),true);
 assert.equal(await verifySignedGet(new Request(url.href.replace('Lynx','Zezima'),{headers}),secret),false);
 assert.equal(await verifySignedGet(new Request(url,{headers}),secret.replace('test','other')),false);
});
test('a runtime fault in any provider fails the deployment immediately',async()=>{
 const x=respond([row('hiscores','ok'),row('runeprofile','error','TypeError: Invalid redirect value')]);
 await assert.rejects(checkSync('https://spoonedosrs.com',secret,{fetch:x.fetch,delay:0}),/Sync is broken.*runeprofile: TypeError: Invalid redirect value/);
 assert.equal(x.calls(),1);
});
test('busy or untracked providers are retried and one returning data passes',async()=>{
 const busy=[row('hiscores','unavailable','OSRS Hiscores refreshes are busy.'),row('wom','unavailable','Not tracked.')];
 const x=respond(busy,[row('hiscores','ok'),row('wom','unavailable','Not tracked.')]);
 assert.equal((await checkSync('https://spoonedosrs.com',secret,{fetch:x.fetch,delay:0})).find(r=>r.source==='hiscores').status,'ok');
 assert.equal(x.calls(),2);
 const never=respond(busy);
 await assert.rejects(checkSync('https://spoonedosrs.com',secret,{fetch:never.fetch,delay:0}),/No provider returned data/);
 assert.equal(never.calls(),3);
});
test('a missing secret or rejected request is a failed check, not a skipped one',async()=>{
 await assert.rejects(checkSync('https://spoonedosrs.com',undefined,{fetch:respond([]).fetch}),/Set DEPLOY_CHECK_SECRET/);
 await assert.rejects(checkSync('https://spoonedosrs.com',secret,{fetch:async()=>Response.json({error:'Invalid signature.'},{status:401})}),/HTTP 401 Invalid signature/);
});
