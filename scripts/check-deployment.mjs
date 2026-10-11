import {createHmac,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReleaseInfo} from './release-info.mjs';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Signs a GET the way lib/signed-request.ts verifies it. */
export function signedGet(origin,route,secret,now=Date.now()){
 const url=new URL(route,origin),timestamp=String(Math.floor(now/1000));
 const signature=createHmac('sha256',secret).update(`${timestamp}\nGET\n${url.pathname}${url.search}`).digest('hex');
 return {url,headers:{'x-spooned-timestamp':timestamp,'x-spooned-signature':signature}};
}

/** Fetches every provider through the deployed sync code. A runtime fault fails immediately; providers
 * that are busy or not tracking the player are retried, and at least one must return data. */
export async function checkSync(origin,secret,{player='Lynx Titan',attempts=3,delay=15_000,fetch=globalThis.fetch}={}){
 if(!secret||secret.length<32)throw Error('Set DEPLOY_CHECK_SECRET (the same value as the Worker secret) to verify sync after deploying.');
 let last;
 for(let attempt=1;attempt<=attempts;attempt++){
  const {url,headers}=signedGet(origin,'/api/health/sync?'+new URLSearchParams({player}),secret);
  const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(60_000)});
  const body=await response.json().catch(()=>null);
  if(response.status!==200||!Array.isArray(body?.results))throw Error(`Sync check: HTTP ${response.status} ${body?.error??''}`.trim());
  const faults=body.results.filter(r=>r.status==='error');
  if(faults.length)throw Error('Sync is broken in this deployment: '+faults.map(r=>`${r.source}: ${r.message}`).join('; '));
  last=body.results;
  if(last.some(r=>r.status==='ok'))return last;
  if(attempt<attempts)await wait(delay);
 }
 throw Error('No provider returned data for the sync check: '+last.map(r=>`${r.source}: ${r.message}`).join('; '));
}

/** Checks a live deployment without signing in or writing player data. Each passing check prints one line. */
export async function checkDeployment(origin,{
 secret=process.env.DEPLOY_CHECK_SECRET,player=process.env.DEPLOY_CHECK_PLAYER,syncOptional=false,syncDelay,probeGap=13_000,waitSeconds=60,
 fetch=globalThis.fetch,expected={version:JSON.parse(readFileSync('release.json','utf8')).version,buildId:buildReleaseInfo().buildId},log=console.log,
}={}){
 const local=['localhost','127.0.0.1'].includes(origin.hostname);
 if(origin.protocol!=='https:' && !local)throw Error('Use HTTPS outside localhost.');
 const get=(route,init={})=>fetch(new URL(route,origin),{redirect:'manual',signal:AbortSignal.timeout(15_000),...init});

 // A new Worker version can take a few seconds to reach every location; after a push the build
 // itself is still running, so the caller can wait longer for this revision to go live.
 let actual;
 const attempts=Math.max(1,Math.ceil(waitSeconds/10));
 for(let attempt=1;attempt<=attempts;attempt++){
  const response=await get('/api/version',{cache:'no-store'});
  if(!response.ok)throw Error(`Version check failed: HTTP ${response.status}`);
  actual=await response.json();
  if(actual.version===expected.version && actual.buildId===expected.buildId)break;
  if(attempt===attempts)throw Error(`Live version ${actual.version} (${actual.buildId}) does not match this source revision ${expected.version} (${expected.buildId}).`);
  await wait(10_000);
 }
 log(`✔ Live version ${actual.version} (${actual.buildId}) matches this revision.`);

 for(const route of ['/','/leaderboard','/privacy','/terms']){
  const result=await get(route);
  await result.body?.cancel();if(result.status!==200)throw Error(`${route}: HTTP ${result.status}`);
  if(route==='/'&&!local)for(const [name,pattern] of [['Strict-Transport-Security',/max-age=\d+/],['X-Content-Type-Options',/nosniff/],['X-Frame-Options',/SAMEORIGIN|DENY/],['Content-Security-Policy',/frame-ancestors/]])
   if(!pattern.test(result.headers.get(name)??''))throw Error(`/ is missing the ${name} security header.`);
 }
 log('✔ Pages load with security headers.');

 for(const route of ['/api/staff/cases','/api/account-discord','/api/account-settings']){
  const result=await get(route);
  await result.body?.cancel();if(result.status!==401)throw Error(`${route}: expected unauthenticated 401, got ${result.status}`);
 }
 const session=await (await get('/api/auth/session')).json();
 if(session.user!==null)throw Error('An anonymous request was given a session.');
 log('✔ Private APIs reject signed-out requests.');

 if(!local){
  // Login only runs on the registered apex origin, so localhost dry runs skip it.
  const start=await get('/api/auth/discord'),page=await start.text();
  const href=page.match(/location\.replace\(("(?:[^"\\]|\\.)*")\)/)?.[1];
  if(start.status!==200||!href)throw Error(`Discord login start: HTTP ${start.status}. ${page.replace(/<[^>]+>/g,' ').trim().slice(0,120)}`);
  const authorize=new URL(JSON.parse(href)),query=authorize.searchParams;
  if(authorize.origin!=='https://discord.com'||!/^\d{17,20}$/.test(query.get('client_id')??'')||query.get('redirect_uri')!==new URL('/api/auth/discord/callback',origin).href
   ||query.get('scope')!=='identify'||query.get('code_challenge_method')!=='S256'||!query.get('state'))throw Error('Discord login start returned an unexpected authorize URL.');
  if(!start.headers.getSetCookie().some(c=>/^spooned_oauth=[^;]+;.*HttpOnly.*Secure/.test(c)))throw Error('Discord login start did not set a secure state cookie.');
  // A forged callback must be refused before Discord is contacted. A 503 here means a login secret is missing.
  const callback=await get('/api/auth/discord/callback?code=deploy-check&state=deploy-check');
  await callback.body?.cancel();
  if(callback.status===503)throw Error('Discord login is not configured: set DISCORD_CLIENT_SECRET and SESSION_SECRET as Worker secrets.');
  if(callback.status!==302||callback.headers.get('location')!=='/?login=failed'||callback.headers.getSetCookie().some(c=>c.startsWith('spooned_session=')&&!/Max-Age=0/.test(c)))
   throw Error(`Discord callback accepted a forged login (HTTP ${callback.status}).`);
  if(origin.hostname==='spoonedosrs.com'){
   const www=await fetch(new URL('/api/auth/discord','https://www.spoonedosrs.com'),{redirect:'manual',signal:AbortSignal.timeout(15_000)});
   await www.body?.cancel();
   if(www.headers.get('location')!==new URL('/api/auth/discord',origin).href)throw Error(`www login should redirect to ${origin.origin}, got HTTP ${www.status}.`);
  }
  log('✔ Discord login starts with PKCE and a secure state cookie; forged callbacks are refused; login secrets are configured.');
 }

 // A public search for a name no player has goes through the live provider code to all four sources without
 // signing in, and a not-found result saves no journal. "unavailable" means the Worker got no answer,
 // which is how every lookup looked while redirect:'error' broke provider requests.
 let probe={};
 for(let attempt=1;attempt<=3;attempt++){
  const response=await get('/api/player-status?'+new URLSearchParams({username:'Zq'+randomBytes(5).toString('hex')}));
  probe=await response.json().catch(()=>({}));
  if(response.status===200&&['found','not_found'].includes(probe.hiscores))break;
  if(attempt<3)await wait(syncDelay??2_500);
 }
 if(!['found','not_found'].includes(probe.hiscores))throw Error('The live Worker cannot reach OSRS Hiscores for public lookups: '+JSON.stringify(probe).slice(0,200));
 const others=[['runeprofile','RuneProfile'],['temple','TempleOSRS'],['wom','Wise Old Man']].filter(([key])=>probe[key]).map(([key,name])=>`${name} ${probe[key].replace('_',' ')}`);
 log(`✔ The live Worker reaches OSRS Hiscores (an unknown player is reported ${probe.hiscores==='not_found'?'not found':'found'}${others.length?'; '+others.join(', '):''}).`);

 // Unsigned requests are refused; 503 means the Worker has no DEPLOY_CHECK_SECRET yet.
 const unsigned=await get('/api/health/sync?player=check');
 await unsigned.body?.cancel();
 const workerHasSecret=unsigned.status===401;
 if(!workerHasSecret&&unsigned.status!==503)throw Error(`/api/health/sync answered an unsigned request with HTTP ${unsigned.status}.`);
 let sync=null;
 if(!secret&&syncOptional){
  // Only the automatic deploy and scheduled checks may skip this, so a missing secret cannot fail an uploaded release.
  console.warn(`WARNING: sync was NOT verified. ${workerHasSecret?'The Worker has DEPLOY_CHECK_SECRET; add the same value where this check runs':'Add DEPLOY_CHECK_SECRET as a Worker secret and where this check runs'} (Workers Builds secret or GitHub Actions secret).`);
 }else{
  if(!workerHasSecret)throw Error('The Worker has no DEPLOY_CHECK_SECRET secret, so sync cannot be verified.');
  // The probe above just used every provider's shared pacing slot; TempleOSRS's is the longest at 12.5 seconds.
  await wait(probeGap);
  sync=await checkSync(origin,secret,{...(player?{player}:{}),...(syncDelay!==undefined?{delay:syncDelay}:{}),fetch});
  // "unavailable" means the provider answered without data for this player (not tracked there) or was busy.
  log('✔ Sync works against the real providers: '+sync.map(r=>`${r.source} ${r.status}${r.status==='ok'?'':` (${r.message})`}`).join(', ')+'.');
 }
 log(`Deployment verified: ${actual.version} (${actual.buildId}).`);
 return {version:actual.version,buildId:actual.buildId,workerHasSecret,sync};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),origin=args.find(a=>!a.startsWith('--')),wait=args.find(a=>a.startsWith('--wait='));
 await checkDeployment(new URL(origin??'https://spoonedosrs.com'),{syncOptional:args.includes('--sync-optional'),...(wait?{waitSeconds:Number(wait.slice(7))}:{})});
}
