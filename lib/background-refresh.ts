import {db,readJournal,saveJournal,saveDiscoveredJournal} from './storage';
import {acquireSync,providerFetch} from './request-controls';
import {discoverPlayer} from './player-lookup';
import {syncJournal} from './sync-journal';
import {hydratePublicJournal,sourcesCheckedAt} from './public-journal';
import type {Journal} from './model';

type Candidate={id:string;data:string;revision:number;owner:string|null};
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

/** Profiles that have never had every public source checked: claimed names first (their owners use the site),
 * then searched names. Private profiles and unlinked reservations are left alone. */
export async function refreshCandidates(limit:number):Promise<Candidate[]>{
 const result=await db().prepare(`SELECT j.id,j.data,j.revision,c.discord_id AS owner FROM journals j
  LEFT JOIN claimed_names c ON c.rsn=j.id LEFT JOIN profile_visibility v ON v.rsn=j.id
  WHERE json_valid(j.data) AND json_extract(j.data,'$.sourcesCheckedAt') IS NULL AND COALESCE(v.visibility,'public')='public'
  AND (c.rsn IS NOT NULL OR NOT EXISTS(SELECT 1 FROM profile_link_owners r WHERE r.rsn=j.id))
  ORDER BY c.rsn IS NULL, COALESCE(json_extract(j.data,'$.statsSyncedAt'),''), j.id LIMIT ?`).bind(limit).all<Candidate>();
 return result.results;
}

/** Records the attempt so a profile no source knows is not retried on every run. */
async function markChecked(id:string,revision:number,at:string){
 await db().prepare("UPDATE journals SET data=json_set(data,'$.sourcesCheckedAt',?),revision=revision+1 WHERE id=? AND revision=?").bind(at,id,revision).run();
}

/** One full four-source pull for one profile, saved the same way an owner refresh or a search saves it. */
export async function refreshProfile(candidate:Candidate):Promise<'updated'|'empty'|'skipped'>{
 let stored:Journal;try{stored=JSON.parse(candidate.data) as Journal;}catch{return 'skipped';}
 if(sourcesCheckedAt(stored))return 'skipped';
 let release:((saved?:boolean)=>Promise<void>)|undefined;
 try{release=await acquireSync(stored.username);}catch{return 'skipped';} // A refresh is already running for this name.
 const at=new Date().toISOString();
 try{
  if(candidate.owner){
   const prior=await readJournal(stored.username);
   let next;try{next=await syncJournal('all',prior,null,providerFetch);}catch{await markChecked(candidate.id,candidate.revision,at);return 'empty';}
   delete next.syncReport;
   await saveJournal({...next,sourcesCheckedAt:at} as Journal,prior.revision,candidate.owner);
   return 'updated';
  }
  const {journal}=await discoverPlayer(stored.username,hydratePublicJournal({...stored,revision:candidate.revision}),providerFetch,true);
  if(!journal){await markChecked(candidate.id,candidate.revision,at);return 'empty';}
  return await saveDiscoveredJournal(journal,candidate.revision,stored,at)?'updated':'skipped';
 }catch{await markChecked(candidate.id,candidate.revision,at).catch(()=>{});return 'skipped';}
 // Background work never starts the owner's one-minute cooldown.
 finally{await release?.();}
}

/** Scheduled backfill: a few profiles per run, spaced for TempleOSRS's 12.5-second site-wide gap. */
export async function backgroundRefresh({limit=2,gap=13_000}:{limit?:number;gap?:number}={}){
 const results:Record<string,string>={};
 const candidates=await refreshCandidates(limit);
 for(const [i,candidate] of candidates.entries()){
  if(i>0&&gap)await wait(gap);
  results[candidate.id]=await refreshProfile(candidate);
 }
 return results;
}
