import {env} from 'cloudflare:workers';
import {HttpError,readSession} from './auth';
import {accountName,db,sameOrigin} from './storage';
import type {Reputation} from './reputation';
function target(request:Request){const value=new URL(request.url).searchParams.get('username');if(!value)throw new HttpError(400,'Choose a player.');try{return accountName(value).toLowerCase();}catch{throw new HttpError(400,'Enter a valid RuneScape name.');}}
async function identity(request:Request,rsn:string){
 const ip=request.headers.get('CF-Connecting-IP')?.trim().toLowerCase();
 if(!ip||!env.SESSION_SECRET)return null;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
 const window=Math.floor(Date.now()/600000);
 return {ipKey:await digest('commendation:profile:'+rsn+':'+ip),budgetKey:await digest('commendation:budget:'+window+':'+ip),window};
}
export async function readReputation(request:Request):Promise<Reputation>{
 const rsn=target(request),user=await readSession(request),network=await identity(request,rsn);
 const result=await db().prepare(`SELECT
 (SELECT COUNT(*) FROM profile_commendations WHERE rsn=?) AS count,
 EXISTS(SELECT 1 FROM profile_commendations WHERE rsn=? AND (voter_id=? OR (voter_id IS NULL AND ip_key=?))) AS given,
 EXISTS(SELECT 1 FROM profile_commendations WHERE rsn=? AND ip_key=?) AS networkUsed,
 EXISTS(SELECT 1 FROM claimed_names WHERE rsn=? AND discord_id=?) AS ownProfile,
 EXISTS(SELECT 1 FROM journals WHERE id=?) AS available`)
 .bind(rsn,rsn,user?.id??'',network?.ipKey??'',rsn,network?.ipKey??'',rsn,user?.id??'',rsn)
 .first<{count:number;given:number;networkUsed:number;ownProfile:number;available:number}>();
 if(!result)throw Error('Reputation unavailable.');
 return {count:result.count,given:!!result.given,signedIn:!!user,ownProfile:!!result.ownProfile,available:!!result.available,networkUsed:!!result.networkUsed,canVote:!!network};
}
export async function writeReputation(request:Request):Promise<Reputation>{
 try{sameOrigin(request);}catch{throw new HttpError(403,'Give respect from the player profile.');}
 const rsn=target(request),user=await readSession(request),network=await identity(request,rsn);
 if(!network)throw new HttpError(503,'Your connection could not be verified. Please retry.');
 const budget=await db().prepare(`INSERT INTO commendation_limits(id,window,count) VALUES(?,?,1)
 ON CONFLICT(id) DO UPDATE SET count=count+1 WHERE count<20 RETURNING count`).bind(network.budgetKey,network.window).first();
 if(!budget)throw new HttpError(429,'Too many commendation requests. Try again in ten minutes.');
 await db().prepare('DELETE FROM commendation_limits WHERE window<?').bind(network.window-1).run();
 const current=await readReputation(request);
 if(!current.available)throw new HttpError(404,'This player needs a saved journal before receiving respect.');
 if(request.method==='DELETE'){
  await db().prepare('DELETE FROM profile_commendations WHERE rsn=? AND (voter_id=? OR (voter_id IS NULL AND ip_key=?))').bind(rsn,user?.id??'',network.ipKey).run();
 }else{
  if(current.ownProfile)throw new HttpError(403,'You cannot give respect to your own linked profile.');
  // Unique constraints enforce both limits even when requests arrive together.
  const writes=[db().prepare(`INSERT INTO profile_commendations(rsn,voter_id,ip_key,created_at)
   SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM journals WHERE id=?)
   AND NOT EXISTS(SELECT 1 FROM claimed_names WHERE rsn=? AND discord_id=?)
   ON CONFLICT DO NOTHING`).bind(rsn,user?.id??null,network.ipKey,new Date().toISOString(),rsn,rsn,user?.id??'')];
  // Signing in after a guest vote preserves one endorsement instead of creating another.
  if(user)writes.push(db().prepare(`UPDATE profile_commendations SET voter_id=? WHERE rsn=? AND ip_key=? AND voter_id IS NULL
   AND NOT EXISTS(SELECT 1 FROM profile_commendations WHERE rsn=? AND voter_id=?)`).bind(user.id,rsn,network.ipKey,rsn,user.id));
  await db().batch(writes);
 }
 return readReputation(request);
}
