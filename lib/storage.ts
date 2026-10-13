import originalSeed from './seed.json';
import {discoveryData,hydratePublicJournal} from './public-journal';
import {upgradeEstimates} from './estimates';
import { env } from 'cloudflare:workers';
import {initial,Journal} from './model';
import {reviewedRates} from './staff-data';
import {applyPetRates} from './rate-catalogue';
import {RequestError} from './request-body';
import {DEV_PROFILE,IS_DEV_ENVIRONMENT,devAllowsProfile} from './environment';
/** The dev environment holds Obifloat only; any other name is refused before it is stored. */
function devOnly(rsn:string){if(!devAllowsProfile(rsn))throw new RequestError(403,'The dev environment only holds Obifloat.');}
export function db(){if(!env.DB)throw Error('Saved progress is temporarily unavailable. Please retry.');return env.DB;}
export function accountName(value:unknown){if(value===undefined||value===null)return 'Obifloat';if(typeof value!=='string'||! /^[A-Za-z0-9 _-]{1,12}$/.test(value.trim()))throw Error('Enter a RuneScape name of 1–12 letters, numbers, spaces, underscores or hyphens.');return value.trim();}
export function freshJournal(name:string):Journal{const j=structuredClone(initial);j.username=name;if(name.toLowerCase()==='obifloat')return upgradeEstimates(structuredClone(originalSeed) as Journal);j.revision=0;j.profile=undefined;j.log=null;j.logSyncedAt=null;j.statsSyncedAt=null;j.hiscores={skills:[],activities:[]};j.pets=j.pets.map(p=>({...p,recordedHours:null,historicalXph:null,obtainedCount:null,crateRolls:null,obtained:false,priority:false,date:'',notes:'',source:'New account',methods:p.methods.map(m=>({...m,kc:null,...(p.name==='TzRek-Jad'?{kph:60/45,source:m.source.replace('your stated 30','example 45')}:{})}))}));return j;}
/** Dev only: the first time Obifloat is opened, copy its public profile from the live site, so dev shows the same
 * collection log, quests, diaries and achievements. It reads the public API only and never writes to live. */
async function copyLiveProfile(name:string){
 if(!IS_DEV_ENVIRONMENT||name.toLowerCase()!==DEV_PROFILE)return null;
 try{
  const response=await fetch(`https://spoonedosrs.com/api/journal?username=${encodeURIComponent(name)}`,{headers:{accept:'application/json'}});
  if(!response.ok)return null;
  const live=await response.json() as Journal;
  if(!live||typeof live!=='object'||String(live.username).toLowerCase()!==DEV_PROFILE)return null;
  await db().prepare('INSERT OR IGNORE INTO journals (id,data,revision) VALUES (?,?,1)').bind(DEV_PROFILE,JSON.stringify({...live,revision:1})).run();
  return await db().prepare('SELECT data, revision FROM journals WHERE id = ?').bind(DEV_PROFILE).first<{data:string;revision:number}>();
 }catch{return null;}
}
export async function readJournal(username:unknown='Obifloat'):Promise<Journal>{const name=accountName(username);const row=await db().prepare('SELECT data, revision FROM journals WHERE id = ?').bind(name.toLowerCase()).first<{data:string;revision:number}>()??await copyLiveProfile(name);return applyPetRates(upgradeEstimates(row?hydratePublicJournal({...JSON.parse(row.data),revision:row.revision}):freshJournal(name)),await reviewedRates());}
export async function listAccounts(query=''){
 if(query.length>12)throw Error('Search is too long.');
 const result=await db().prepare(`SELECT COALESCE(c.display_name,j.name) AS username FROM journal_summaries j
 LEFT JOIN claimed_names c ON c.rsn=j.rsn LEFT JOIN profile_visibility v ON v.rsn=j.rsn
 WHERE COALESCE(v.visibility,'public')='public'
 AND (c.rsn IS NOT NULL OR NOT EXISTS(SELECT 1 FROM profile_link_owners r WHERE r.rsn=j.rsn))
 AND instr(replace(j.rsn,'_',' '),?)>0 ORDER BY j.rsn LIMIT 8`).bind(query.trim().toLowerCase().replaceAll('_',' ')).all<{username:string}>();
 return result.results.map(r=>r.username);
}
/** Discovery never overwrites a claimed, reserved or private journal, including races during upstream fetches. */
export async function saveDiscoveredJournal(j:Journal,revision:number,previous?:Journal|null,sourcesCheckedAt?:string){
 const rsn=accountName(j.username).toLowerCase();devOnly(rsn);
 const result=await db().prepare(`INSERT INTO journals(id,data,revision)
 SELECT ?,?,1 WHERE NOT EXISTS(SELECT 1 FROM claimed_names WHERE rsn=?)
 AND NOT EXISTS(SELECT 1 FROM profile_link_owners WHERE rsn=?)
 AND NOT EXISTS(SELECT 1 FROM profile_visibility WHERE rsn=? AND visibility='private')
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=journals.revision+1
 WHERE journals.revision=?
 AND NOT EXISTS(SELECT 1 FROM claimed_names WHERE rsn=excluded.id)
 AND NOT EXISTS(SELECT 1 FROM profile_link_owners WHERE rsn=excluded.id)
 AND NOT EXISTS(SELECT 1 FROM profile_visibility WHERE rsn=excluded.id AND visibility='private')`)
 .bind(rsn,JSON.stringify(discoveryData(j,previous,sourcesCheckedAt)),rsn,rsn,rsn,revision).run();
 return !!result.meta.changes;
}
export async function addAccount(username:unknown){const name=accountName(username);devOnly(name);const j=await readJournal(name);await db().prepare('INSERT OR IGNORE INTO journals (id,data,revision) VALUES (?,?,0)').bind(name.toLowerCase(),JSON.stringify(j)).run();return readJournal(name);}
export async function saveJournal(j:Journal,revision:number,writerId:string){
 devOnly(j.username);
 const result=await db().prepare(`INSERT INTO journals (id,data,revision)
 SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM claimed_names WHERE rsn=? AND discord_id=?)
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=journals.revision+1
 WHERE journals.revision=? AND EXISTS(SELECT 1 FROM claimed_names WHERE rsn=excluded.id AND discord_id=?)`)
 .bind(accountName(j.username).toLowerCase(),JSON.stringify(j),accountName(j.username).toLowerCase(),writerId,revision,writerId).run();
 if(!result.meta.changes)throw Error('Progress or account access changed. Refresh before saving again.');
 return applyPetRates({...j,revision:revision+1},await reviewedRates());
}
/** Cross-site writes are refused with 403 by every route that reports RequestError statuses. */
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new RequestError(403,'This request must come from your tracker.');}
