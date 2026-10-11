import {env} from 'cloudflare:workers';
import {db} from './storage';
import {RequestError} from './request-body';
import {createProviderClient} from './provider-client';

export async function budgetKey(value:string){
 if(!env.SESSION_SECRET)throw new RequestError(503,'Request controls are unavailable.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Atomic, shared across isolates. Counters expire logically; cleanup bounds stored digests. */
export async function takeBudget(scope:string,maximum:number,seconds:number){
 const now=Math.floor(Date.now()/1000),window=Math.floor(now/seconds),id=await budgetKey(`${scope}:${window}`);
 const result=await db().prepare(`INSERT INTO request_budgets(id,window,count) VALUES(?,?,1)
 ON CONFLICT(id) DO UPDATE SET count=count+1 WHERE count<? RETURNING count`).bind(id,now+seconds,maximum).first();
 // One cleanup per minute/isolate, never record request bodies, names or raw IPs here.
 if(now-lastCleanup>60){lastCleanup=now;await db().batch([db().prepare('DELETE FROM request_budgets WHERE window<?').bind(now),db().prepare('DELETE FROM sync_locks WHERE expires<? AND next_allowed<?').bind(now-86400,now-86400)]);}
 if(!result)throw new RequestError(429,'Refresh limit reached. Your saved progress is safe; please retry shortly.',seconds-now%seconds);
}
let lastCleanup=0;
/** One refresh per journal at a time. The 60-second cooldown starts only once a refresh is saved;
 * a failed or rejected attempt releases it so the player can retry straight away. Abuse stays
 * bounded by the hourly per-user budget and the shared provider pacing. */
export async function acquireSync(username:string){
 const rsn=username.toLowerCase(),now=Math.floor(Date.now()/1000),token=crypto.randomUUID();
 const result=await db().prepare(`INSERT INTO sync_locks(rsn,token,expires,next_allowed) VALUES(?,?,?,?)
 ON CONFLICT(rsn) DO UPDATE SET token=excluded.token,expires=excluded.expires,next_allowed=excluded.next_allowed
 WHERE sync_locks.expires<=? AND sync_locks.next_allowed<=? RETURNING token`).bind(rsn,token,now+60,now+60,now,now).first();
 if(!result)throw new RequestError(429,'This journal is syncing or was refreshed recently. Please wait a minute.',60);
 return async(saved=false)=>{await db().prepare(`UPDATE sync_locks SET expires=0${saved?'':',next_allowed=0'} WHERE rsn=? AND token=?`).bind(rsn,token).run();};
}
/** Per-provider pacing and public response cache shared across regions. */
export const providerFetch:typeof fetch=async(input,init)=>{
 return createProviderClient({database:db(),key:value=>budgetKey('provider-cache:'+value),dailyBudget:()=>takeBudget('provider-daily',10_000,86_400),paused:env.SYNC_PAUSED==='true'})(input,init);
};
