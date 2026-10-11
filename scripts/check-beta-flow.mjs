// Beta-critical path against the production build, inside the Workers runtime:
// Discord login (state + PKCE), claiming names, all-source sync and reading the journal.
// Discord and the OSRS providers are mocked at the network boundary, so nothing leaves this
// machine and no secrets are needed. Run after `npm run build`.
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {checkDeployment} from './check-deployment.mjs';
import {ORIGIN,startWorker} from './worker-harness.mjs';

const origin=ORIGIN,clientSecret='beta-check-client-secret',discordId='123456789012345678';
const hiscores={skills:[{name:'Overall',level:1500,xp:50000000,rank:12345},{name:'Attack',level:90,xp:5346332,rank:20000}],activities:[{name:'Zulrah',score:250,rank:30000}]};
const profile={accountType:'NORMAL',collectionLog:{obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Zulrah',obtained:1,total:2,items:[{id:12921,name:'Pet snakeling',quantity:1},{id:12936,name:'Jar of swamp',quantity:0}]}]}]},
 quests:[{id:1,name:'Cook\'s Assistant',points:1,type:'free',state:'finished'}],achievementDiaries:[{areaId:1,area:'Ardougne',tiers:[{tier:'easy',completed:10,total:10}]}],combatAchievements:[{id:1,name:'Easy',completed:5,total:33}]};
const code='beta-code-'+randomBytes(6).toString('hex'),deployCheckSecret=randomBytes(32).toString('hex');
let challenge='';
const upstream=[];

async function mock(request){
 const url=new URL(request.url);upstream.push(url.hostname+url.pathname);
 if(url.href==='https://discord.com/api/oauth2/token'){
  const body=new URLSearchParams(await request.text()),verifier=body.get('code_verifier')??'';
  const valid=body.get('code')===code&&body.get('client_secret')===clientSecret&&body.get('redirect_uri')===origin+'/api/auth/discord/callback'
   &&createHash('sha256').update(verifier).digest('base64url')===challenge;
  return valid?Response.json({access_token:'beta-token',token_type:'Bearer'}):Response.json({error:'invalid_grant'},{status:400});
 }
 if(url.href==='https://discord.com/api/users/@me')return request.headers.get('authorization')==='Bearer beta-token'?Response.json({id:discordId,username:'betatester',global_name:'Beta Tester',avatar:null}):new Response(null,{status:401});
 // No source knows the live check's random probe names.
 if((url.searchParams.get('player')??decodeURIComponent(url.pathname.split('/')[3]??'')).startsWith('Zq'))return new Response(null,{status:404});
 if(url.hostname==='secure.runescape.com')return url.searchParams.get('player')==='Moved Player'?new Response(null,{status:302,headers:{Location:'https://example.invalid/'}}):Response.json(hiscores);
 if(url.hostname==='api.runeprofile.com')return Response.json(profile);
 return new Response(null,{status:404}); // Temple and Wise Old Man: player not tracked.
}
const cookie=(response,name)=>response.headers.getSetCookie().map(c=>c.split(';')[0]).find(c=>c.startsWith(name+'='));

const {mf,database,dispose}=await startWorker({outbound:mock,bindings:{DISCORD_CLIENT_SECRET:clientSecret,DEPLOY_CHECK_SECRET:deployCheckSecret}});
try{
 const call=(p,init={})=>mf.dispatchFetch(origin+p,{redirect:'manual',...init});

 // Login starts on the apex with state and an S256 challenge, scoped to identify only.
 const start=await call('/api/auth/discord');assert.equal(start.status,200);
 const oauth=cookie(start,'spooned_oauth');assert.ok(oauth,'state cookie');
 const authorize=new URL(JSON.parse((await start.text()).match(/location\.replace\(("(?:[^"\\]|\\.)*")\)/)[1]));
 assert.equal(authorize.origin+authorize.pathname,'https://discord.com/oauth2/authorize');
 assert.equal(authorize.searchParams.get('scope'),'identify');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
 assert.equal(authorize.searchParams.get('redirect_uri'),origin+'/api/auth/discord/callback');
 challenge=authorize.searchParams.get('code_challenge');
 const www=await mf.dispatchFetch('https://www.spoonedosrs.com/api/auth/discord',{redirect:'manual'});
 assert.equal(www.headers.get('location'),origin+'/api/auth/discord');

 // A forged state or a missing state cookie never reaches Discord's token endpoint.
 for(const headers of [{Cookie:oauth},{}]){
  const failed=await call(`/api/auth/discord/callback?code=${code}&state=${headers.Cookie?'forged':authorize.searchParams.get('state')}`,{headers});
  assert.equal(failed.headers.get('location'),'/?login=failed');assert.equal(cookie(failed,'spooned_session'),undefined);
 }
 assert.ok(!upstream.includes('discord.com/api/oauth2/token'));
 const done=await call(`/api/auth/discord/callback?code=${code}&state=${authorize.searchParams.get('state')}`,{headers:{Cookie:oauth}});
 assert.equal(done.status,302);assert.equal(done.headers.get('location'),'/');
 const session=cookie(done,'spooned_session');assert.ok(session,'session cookie');
 assert.match(done.headers.getSetCookie().find(c=>c.startsWith('spooned_session='))??'',/HttpOnly.*SameSite=Lax.*Secure.*Domain=spoonedosrs\.com/);
 const me=await (await call('/api/auth/session',{headers:{Cookie:session}})).json();
 assert.equal(me.user.username,'betatester');assert.deepEqual(me.names,[]);

 const send=(p,body,method='POST')=>call(p,{method,headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const json=async response=>({status:response.status,body:await response.json()});

 // Claim a name, then refresh every source the way the Connections tab does.
 assert.equal((await send('/api/accounts',{username:'Beta Tester'})).status,200);
 const synced=await json(await send('/api/sync',{source:'all',username:'Beta Tester'}));
 assert.equal(synced.status,200,JSON.stringify(synced.body));
 assert.deepEqual(Object.fromEntries(synced.body.syncReport.map(r=>[r.source,r.status])),{hiscores:'updated',runeprofile:'updated',temple:'unavailable',wom:'unavailable'});
 const journal=await (await call('/api/journal?username=Beta%20Tester')).json();
 assert.equal(journal.hiscores.skills.find(s=>s.name==='Overall').xp,50000000);assert.equal(journal.log.obtained,1);
 assert.equal(journal.profile.quests[0].state,'finished');assert.ok(journal.statsSyncedAt);

 // An upstream redirect is reported as unavailable, never followed or leaked as a runtime error.
 assert.equal((await send('/api/accounts',{username:'Moved Player'})).status,200);
 await new Promise(resolve=>setTimeout(resolve,1200)); // Shared Hiscores pacing gap.
 const moved=await json(await send('/api/sync',{source:'hiscores',username:'Moved Player'}));
 assert.equal(moved.status,400);assert.equal(moved.body.error,'OSRS hiscores are unavailable. Try again shortly.');
 assert.ok(!upstream.some(u=>u.startsWith('example.invalid')));

 // The one-minute cooldown starts only after a saved refresh; a failed attempt can be retried at once.
 const again=await json(await send('/api/sync',{source:'all',username:'Beta Tester'}));
 assert.equal(again.status,429);assert.match(again.body.error,/refreshed recently/);
 const womFile={username:'moved player',latestSnapshot:{createdAt:new Date().toISOString(),data:{skills:{overall:{level:100,experience:2000000,rank:500000}},bosses:{}}}};
 const retried=await json(await send('/api/sync',{source:'import',data:womFile,username:'Moved Player'}));
 assert.equal(retried.status,200,JSON.stringify(retried.body));
 assert.equal((await send('/api/sync',{source:'import',data:womFile,username:'Moved Player'})).status,429);

 // The post-deploy check runs the same provider code without saving, and only for signed requests.
 assert.equal((await call('/api/health/sync?player=Beta%20Tester')).status,401);
 await new Promise(resolve=>setTimeout(resolve,2200)); // Hiscores and RuneProfile pacing gaps.
 // The full live-site check, exactly as Workers Builds and the Live site check workflow run it.
 const live=await checkDeployment(new URL(origin),{secret:deployCheckSecret,player:'Beta Tester',syncDelay:2500,probeGap:2200,log:()=>{},fetch:(url,init)=>mf.dispatchFetch(String(url),init)});
 assert.equal(live.workerHasSecret,true);
 assert.deepEqual(Object.fromEntries(live.sync.map(r=>[r.source,r.status])),{hiscores:'ok',runeprofile:'ok',temple:'unavailable',wom:'unavailable'});
 assert.equal((await (await call('/api/journal?username=Beta%20Tester')).json()).revision,journal.revision,'health check saved nothing');

 // Searching a new name pulls every public source once, before anyone claims it, and shows it straight away.
 await new Promise(resolve=>setTimeout(resolve,2200)); // Hiscores and RuneProfile pacing gaps after the deploy check.
 const before=upstream.length;
 const search=await json(await call('/api/player-status?username=New%20Search'));
 assert.equal(search.status,200,JSON.stringify(search.body));
 assert.deepEqual({state:search.body.state,hiscores:search.body.hiscores,runeprofile:search.body.runeprofile,persisted:search.body.persisted},{state:'found',hiscores:'found',runeprofile:'found',persisted:true});
 // TempleOSRS allows one request every 12.5 seconds site-wide and the deploy check just used it, so the search
 // reports it busy and saves what the other sources returned; with a free slot it is asked too (unit tests).
 const asked=[...new Set(upstream.slice(before).map(u=>u.split('/')[0]))];
 for(const host of ['api.runeprofile.com','api.wiseoldman.net','secure.runescape.com'])assert.ok(asked.includes(host),host);
 assert.equal(search.body.temple,asked.includes('templeosrs.com')?'not_found':'unavailable');assert.equal(search.body.wom,'not_found');
 const searched=await (await call('/api/journal?username=New%20Search')).json();
 assert.equal(searched.log.obtained,1);assert.equal(searched.profile.combat[0].completed,5);assert.equal(searched.pets.find(p=>p.id==='12921').obtained,true);
 const searchCalls=upstream.length;
 assert.equal((await call('/api/player-status?username=New%20Search')).status,200);
 assert.equal(upstream.length,searchCalls,'a repeat search within five minutes reuses the saved journal');
 const searchRow=await database.prepare("SELECT json_extract(j.data,'$.storageFormat') AS format,json_extract(j.data,'$.sourcesCheckedAt') AS checked,s.pets,s.log,s.combat FROM journals j JOIN journal_summaries s ON s.rsn=j.id WHERE j.id='new search'").first();
 assert.equal(searchRow.format,'public-sources-v2');assert.ok(searchRow.checked);assert.deepEqual([searchRow.pets,searchRow.log,searchRow.combat],[1,1,5]);
 // Claiming the searched name keeps what the search found until the owner refreshes.
 assert.equal((await send('/api/accounts',{username:'New Search'})).status,200);
 assert.equal((await (await call('/api/journal?username=New%20Search',{headers:{Cookie:session}})).json()).log.obtained,1);

 // An unclaimed journal saved in the older full format (for example after an unlink) gets the same full pull,
 // keeps its manual records and remembers when every source was checked.
 const legacy={...JSON.parse(readFileSync('lib/seed.json','utf8')),username:'Old Full',log:null,logSyncedAt:null,statsSyncedAt:'2026-10-01T00:00:00.000Z',revision:3};
 legacy.pets[0].notes='Kept manual note';
 await database.prepare('INSERT INTO journals(id,data,revision) VALUES(?,?,3)').bind('old full',JSON.stringify(legacy)).run();
 await new Promise(resolve=>setTimeout(resolve,2200)); // Hiscores and RuneProfile pacing gaps after the last search.
 const beforeLegacy=upstream.length;
 const legacySearch=await json(await call('/api/player-status?username=Old%20Full'));
 assert.equal(legacySearch.status,200,JSON.stringify(legacySearch.body));assert.equal(legacySearch.body.runeprofile,'found');assert.equal(legacySearch.body.persisted,true);
 // Every source is asked; Wise Old Man and Temple may still be inside their 3.1 s and 12.5 s pacing gaps here.
 for(const host of ['api.runeprofile.com','secure.runescape.com'])assert.ok(upstream.slice(beforeLegacy).some(u=>u.startsWith(host)),host);
 assert.ok(['not_found','unavailable'].includes(legacySearch.body.wom)&&['not_found','unavailable'].includes(legacySearch.body.temple),'all four sources reported');
 const upgraded=JSON.parse((await database.prepare("SELECT data FROM journals WHERE id='old full'").first()).data);
 assert.equal(upgraded.storageFormat,undefined);assert.ok(upgraded.sourcesCheckedAt);assert.equal(upgraded.log.obtained,1);assert.equal(upgraded.pets[0].notes,'Kept manual note');

 // One Discord account cannot reserve names in bulk; unlinking does not free a slot.
 for(let i=1;i<=7;i++)assert.equal((await send('/api/accounts',{username:'Beta Alt '+i})).status,200,'Beta Alt '+i);
 const capped=await json(await send('/api/accounts',{username:'Beta Alt 9'}));
 assert.equal(capped.status,409);assert.match(capped.body.error,/up to 10 RuneScape names/);
 assert.equal((await send('/api/accounts',{username:'Beta Alt 7'},'DELETE')).status,200);
 assert.equal((await send('/api/accounts',{username:'Beta Alt 9'})).status,409);
 assert.equal((await send('/api/accounts',{username:'Beta Alt 7'})).status,200,'re-link an owned reservation at the cap');

 // The scheduled background refresh gives two profiles that never had a full pull one pass over every source,
 // claimed names first, and records it so they are not picked again.
 await new Promise(resolve=>setTimeout(resolve,3200)); // Hiscores, RuneProfile and Wise Old Man pacing gaps.
 const unchecked=async()=>(await database.prepare("SELECT COUNT(*) AS n FROM journals WHERE json_extract(data,'$.sourcesCheckedAt') IS NULL").first()).n;
 const backlog=await unchecked();
 await (await mf.getWorker()).scheduled({cron:'*/10 * * * *'});
 for(let i=0;i<60&&await unchecked()>backlog-2;i++)await new Promise(resolve=>setTimeout(resolve,500));
 assert.equal(backlog-await unchecked(),2,'two profiles refreshed per run');
 const refreshed=(await database.prepare("SELECT j.id,json_extract(j.data,'$.log.obtained') AS log,c.rsn IS NOT NULL AS claimed FROM journals j LEFT JOIN claimed_names c ON c.rsn=j.id WHERE json_extract(j.data,'$.sourcesCheckedAt') >= ? ORDER BY j.id").bind(new Date(Date.now()-120_000).toISOString()).all()).results;
 assert.ok(refreshed.filter(r=>r.claimed===1&&r.log===1).length>=2,JSON.stringify(refreshed));

 // Writes need the session and a same-origin request; production headers are present.
 const foreign=await call('/api/accounts',{method:'POST',headers:{Cookie:session,Origin:'https://evil.example','Content-Type':'application/json'},body:'{"username":"Beta Alt 9"}'});
 assert.notEqual(foreign.status,200);
 const anonymous=await call('/api/sync',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"source":"all","username":"Beta Tester"}'});
 assert.equal(anonymous.status,401);
 assert.equal(anonymous.headers.get('Strict-Transport-Security'),'max-age=15552000');assert.equal(anonymous.headers.get('X-Content-Type-Options'),'nosniff');
 const logout=await call('/api/auth/logout',{method:'POST',headers:{Cookie:session,Origin:origin}});
 assert.match(logout.headers.getSetCookie().find(c=>c.startsWith('spooned_session='))??'',/^spooned_session=;.*Max-Age=0/);
 console.log('Beta flow passed: Discord login, all-source search and sync, background refresh, claim limits, cooldown release, redirect handling, post-deploy sync check and write guards.');
}finally{await dispose();}
